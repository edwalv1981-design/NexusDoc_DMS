#!/usr/bin/env python3
"""
Motor de plantillas PDF de NexusDoc (versiones de plantilla subidas por el administrador).

Comandos (JSON por stdin, JSON por stdout):
  {"cmd": "analyze", "pdf_path": "...", "known_labels": {"etiqueta normalizada": "clave"}}
      -> {"ok": true, "schema": {...}}
  {"cmd": "fill", "pdf_path": "...", "schema": {...}, "data": {...}, "output_path": "...", "preview": false}
      -> {"ok": true}

Soporta:
  - PDF con campos rellenables (AcroForm): usa los campos del PDF.
  - PDF plano (Word, impreso a PDF): detecta celdas vacías de tablas, líneas y guiones bajos
    para escribir, etiquetas con ":" seguidas de espacio, recuadros de check (dibujados o
    caracteres ☐), grupos Sí/No, títulos de sección y textos guía.

Coordenadas en el esquema: puntos PDF con origen arriba-izquierda (como pdfplumber):
  rect = [x0, top, x1, bottom], relativo a la página (mediabox).
"""
import io
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher

ENGINE_VERSION = 1

YES_TOKENS = {"si", "sí", "yes", "s"}
NO_TOKENS = {"no", "n"}
BOX_GLYPHS = set("☐☑☒□■▢▣❏❐❑❒⬜◻◼")
DINGBAT_BOX_CHARS = set("oqnp¨")  # Wingdings/ZapfDingbats usados como casillas en Word

# ----------------------------------------------------------------------------- utilidades


def norm(text):
    t = unicodedata.normalize("NFD", str(text or ""))
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def clean_label(text):
    t = re.sub(r"_{2,}", " ", str(text or ""))
    t = re.sub(r"[\s:·.\-–—➤►•*]+$", "", t.strip())
    t = re.sub(r"^[\s➤►•\-–—*‘’'\"`´]+", "", t)
    return re.sub(r"\s+", " ", t).strip()


def slug(text, fallback="campo"):
    s = norm(text).replace(" ", "_")[:48].strip("_")
    return s or fallback


def _yn_token(text):
    t = norm(text)
    # El OCR a veces lee el recuadro pegado a la palabra: "SiO", "No0", "SiD"
    if t not in YES_TOKENS and t not in NO_TOKENS and 2 <= len(t) <= 4:
        t2 = re.sub(r"[o0d]+$", "", t)
        if t2 in YES_TOKENS or t2 in NO_TOKENS:
            return t2
    return t


def is_yes(text):
    return _yn_token(text) in YES_TOKENS


def is_no(text):
    return _yn_token(text) in NO_TOKENS


def overlap(a0, a1, b0, b1):
    return max(0.0, min(a1, b1) - max(a0, b0))


def rect_contains(outer, x, y, tol=0.5):
    return outer[0] - tol <= x <= outer[2] + tol and outer[1] - tol <= y <= outer[3] + tol


# ----------------------------------------------------------------------------- tipos de campo

DATE_WORDS = ("fecha", "date", "dob", "nacimiento", "birth")
LONG_WORDS = ("direccion", "address", "detalle", "details", "descripcion", "description", "explique",
              "explain", "observacion", "comment", "comentario", "actividad", "activities", "origen", "source")
SIGN_WORDS = ("firma", "firmas", "signature", "signatures", "signed", "firmado")
OPTIONAL_WORDS = ("opcional", "optional", "si aplica", "if applicable", "en caso afirmativo", "if so", "if yes",
                  "de ser asi", "if any", "si los hubiere")
def is_detail_text(text):
    n = norm(text)
    return any(w in n for w in ("en caso afirmativo", "if so", "if yes", "de ser asi", "proporcione detalle",
                                 "provide detail", "please give details", "por favor detalle", "especifique",
                                 "please specify", "explique", "please explain"))


CONDITIONAL_WORDS = ("en caso afirmativo", "if so", "if yes", "de ser asi", "detalle", "details", "explique")


def has_word(n, words, prefix=True):
    tail = r"" if prefix else r"( |$)"
    return any(re.search(r"(^| )" + re.escape(w) + tail, n) for w in words)


DATE_HINT_RE = re.compile(r"^[\[\(]?\s*((dd|mm|aaaa|aa|yyyy|yy)\s*[/\-.]?\s*)+[\]\)]?\s*:?$|^[\s/\-.]+$", re.I)


def is_date_hint(text):
    t = str(text or "").strip()
    return bool(t) and bool(DATE_HINT_RE.match(t))


def infer_kind(label, rect):
    n = norm(label)
    if has_word(n, SIGN_WORDS, prefix=False):
        return "signature"
    if has_word(n, DATE_WORDS) and "lugar" not in n and "place" not in n:
        return "date"
    h = rect[3] - rect[1] if rect else 0
    if h >= 30 or has_word(n, LONG_WORDS):
        return "textarea"
    return "text"


# ----------------------------------------------------------------------------- análisis


class PageModel:
    """Texto, recuadros, líneas y tablas de una página (vía pdfplumber)."""

    def __init__(self, page, index):
        self.page = page
        self.index = index
        self.width = float(page.width)
        self.height = float(page.height)
        self.ox = float(page.bbox[0])
        self.oy = float(page.bbox[1])
        self.words = []
        self.lines = []  # líneas de texto -> segmentos
        self.boxes = []  # recuadros de check
        self.rules = []  # líneas horizontales para escribir
        self.cells = []  # celdas de tabla
        self.table_edges = []
        self._load()

    def _rel(self, x0, top, x1, bottom):
        return [x0 - self.ox, top - self.oy, x1 - self.ox, bottom - self.oy]

    def _load(self):
        p = self.page
        self.scanned = False
        if self._looks_scanned():
            try:
                self._load_scanned()
                self.scanned = True
                return
            except Exception as e:  # noqa: BLE001
                self.ocr_error = str(e)
        try:
            words = p.extract_words(x_tolerance=1.5, y_tolerance=2, keep_blank_chars=False,
                                    extra_attrs=["fontname", "size"])
        except Exception:
            words = p.extract_words(x_tolerance=1.5, y_tolerance=2)
        for w in words:
            text = w.get("text", "")
            font = str(w.get("fontname", ""))
            size = float(w.get("size", 9) or 9)
            r = self._rel(w["x0"], w["top"], w["x1"], w["bottom"])
            # Recuadros como caracteres (☐ o Wingdings)
            if len(text) == 1 and (text in BOX_GLYPHS or (text in DINGBAT_BOX_CHARS and re.search(
                    r"wingding|dingbat|symbol", font, re.I))):
                side = min(r[2] - r[0], r[3] - r[1]) or size * 0.7
                cx, cy = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2
                side = max(min(side, size * 0.9), 5)
                self.boxes.append({"rect": [cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2],
                                   "glyph": True, "char_rect": r})
                continue
            # Palabra con guiones bajos: separa texto y espacio para escribir
            m = re.search(r"_{3,}", text)
            if m:
                n = max(len(text), 1)
                cw = (r[2] - r[0]) / n
                pre = text[:m.start()]
                if pre.strip():
                    self.words.append(self._word(pre, r[0], r[1], r[0] + cw * len(pre), r[3], font, size))
                ux0, ux1 = r[0] + cw * m.start(), r[0] + cw * m.end()
                self.rules.append({"rect": [ux0, r[3] - 0.5, ux1, r[3]], "y": r[3], "underscore": True,
                                   "size": size})
                post = text[m.end():]
                if post.strip():
                    self.words.append(self._word(post, ux1, r[1], r[2], r[3], font, size))
                continue
            self.words.append(self._word(text, *r, font, size))

        # Tablas
        try:
            tables = p.find_tables()
        except Exception:
            tables = []
        for t in tables:
            for c in t.cells:
                if not c:
                    continue
                r = self._rel(*c)
                if r[2] - r[0] < 4 or r[3] - r[1] < 4:
                    continue
                self.cells.append({"rect": r, "table": id(t)})
                self.table_edges.append(r)

        # Recuadros dibujados y líneas horizontales
        shapes = list(p.rects)
        for r in shapes:
            w, h = float(r["width"]), float(r["height"])
            rr = self._rel(r["x0"], r["top"], r["x1"], r["bottom"])
            if 5 <= w <= 20 and 5 <= h <= 20 and abs(w - h) <= 2.5:
                if not any(abs(b["rect"][0] - rr[0]) < 1 and abs(b["rect"][1] - rr[1]) < 1 for b in self.boxes):
                    self.boxes.append({"rect": rr, "glyph": False})
            elif h <= 2 and w >= 40:
                self.rules.append({"rect": rr, "y": (rr[1] + rr[3]) / 2})
        for ln in list(p.lines):
            if abs(float(ln["top"]) - float(ln["bottom"])) <= 2 and float(ln["width"]) >= 40:
                rr = self._rel(ln["x0"], ln["top"], ln["x1"], ln["bottom"])
                self.rules.append({"rect": rr, "y": (rr[1] + rr[3]) / 2})
        # Casillas dibujadas con 4 líneas finas (rectángulos de borde)
        self._boxes_from_edges(shapes)
        self._measure_glyph_boxes()
        # Quitar líneas que son bordes de tabla
        self.rules = [r for r in self.rules if r.get("underscore") or not self._is_table_edge(r)]
        self._dedupe_rules()
        self._build_lines()

    # ------------------------------------------------------------------ páginas escaneadas
    def _looks_scanned(self):
        """Página que es solo imagen (escaneo): sin texto extraíble y con imágenes."""
        try:
            chars = len(self.page.chars)
            imgs = self.page.images
        except Exception:
            return False
        if chars > 20 or not imgs:
            return False
        area = sum(float(i.get("width", 0)) * float(i.get("height", 0)) for i in imgs)
        return area >= 0.4 * self.width * self.height

    def _load_scanned(self):
        """OCR (Tesseract) para el texto y OpenCV para recuadros, líneas y celdas de tabla."""
        import numpy as np
        import cv2
        import pytesseract

        dpi = 300
        scale = dpi / 72.0
        img = self.page.to_image(resolution=dpi).original.convert("L")
        arr = np.array(img)
        H, W = arr.shape
        binv = cv2.adaptiveThreshold(arr, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 15)
        pt = lambda v: v / scale  # noqa: E731

        # Líneas horizontales y verticales
        hk = cv2.getStructuringElement(cv2.MORPH_RECT, (max(int(28 * scale), 20), 1))
        vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(int(14 * scale), 12)))
        hmask = cv2.morphologyEx(binv, cv2.MORPH_OPEN, hk)
        vmask = cv2.morphologyEx(binv, cv2.MORPH_OPEN, vk)
        hsegs = []
        for c in cv2.findContours(hmask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]:
            x, y, w, h = cv2.boundingRect(c)
            if h <= 8 * scale / 2 and w >= 40 * scale:
                hsegs.append((x, y, w, h))

        # Celdas de tabla: regiones cerradas por la rejilla de líneas
        grid = cv2.dilate(cv2.bitwise_or(hmask, vmask), np.ones((3, 3), np.uint8), iterations=1)
        # En los escaneos suele faltar el borde izquierdo/derecho de una tabla: se cierra uniendo
        # los extremos de las líneas horizontales que terminan a la misma altura.
        tol = int(4 * scale)
        for side in ("left", "right"):
            ends = sorted(((x if side == "left" else x + w), y) for x, y, w, h in hsegs)
            cluster = []
            for xe, ye in ends + [(10 ** 9, 0)]:
                if cluster and abs(xe - cluster[-1][0]) > tol:
                    if len(cluster) >= 2:
                        xs = int(sum(c[0] for c in cluster) / len(cluster))
                        y0 = min(c[1] for c in cluster)
                        y1 = max(c[1] for c in cluster)
                        cv2.line(grid, (xs, y0), (xs, y1 + 2), 255, 3)
                    cluster = []
                cluster.append((xe, ye))
        # Huecos de la rejilla = celdas. Se usa el fondo (no las líneas) para encontrar
        # cada región cerrada, incluso en tablas anidadas.
        holes = cv2.bitwise_not(grid)
        n, labels, stats, _ = cv2.connectedComponentsWithStats(holes, connectivity=4)
        tables = []
        for x, y, w, h, _a in stats[1:] if n > 1 else []:
            pass
        cells_px = []
        for i in range(1, n):
            x, y, w, h, area = stats[i]
            if x <= 1 or y <= 1 or x + w >= W - 1 or y + h >= H - 1:
                continue  # el fondo exterior de la página
            if w < 18 * scale or h < 8 * scale or w >= W * 0.98:
                continue
            if area < 0.85 * w * h:
                continue  # región no rectangular (no es una celda)
            cells_px.append((int(x), int(y), int(w), int(h)))
        # Tabla = grupo de celdas que se tocan
        tid_of = {}
        for idx, (x, y, w, h) in enumerate(cells_px):
            tid_of[idx] = idx
        def root(i):
            while tid_of[i] != i:
                tid_of[i] = tid_of[tid_of[i]]
                i = tid_of[i]
            return i
        gap = int(6 * scale / 2)
        for i, a in enumerate(cells_px):
            for j in range(i + 1, len(cells_px)):
                b = cells_px[j]
                if a[0] - gap <= b[0] + b[2] and b[0] - gap <= a[0] + a[2] and a[1] - gap <= b[1] + b[3] and b[1] - gap <= a[1] + a[3]:
                    tid_of[root(i)] = root(j)
        for idx, (x, y, w, h) in enumerate(cells_px):
            r = [pt(x - 1), pt(y - 1), pt(x + w + 1), pt(y + h + 1)]
            self.cells.append({"rect": r, "table": int(root(idx)) + 1000})
            self.table_edges.append(r)

        # Recuadros de check: cuadrados huecos pequeños
        for c in cv2.findContours(binv, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)[0]:
            x, y, w, h = cv2.boundingRect(c)
            side_pt = pt(max(w, h))
            if not (5 <= pt(w) <= 20 and 5 <= pt(h) <= 20) or abs(w - h) > 0.25 * max(w, h):
                continue
            approx = cv2.approxPolyDP(c, 0.04 * cv2.arcLength(c, True), True)
            if len(approx) != 4 or not cv2.isContourConvex(approx):
                continue
            # Un cuadrado dibujado llena casi todo su rectángulo; una "O" o una "D" no.
            if cv2.contourArea(c) < 0.82 * w * h:
                continue
            inner = binv[y + max(2, h // 5): y + h - max(2, h // 5), x + max(2, w // 5): x + w - max(2, w // 5)]
            if inner.size and inner.mean() / 255.0 > 0.25:
                continue  # relleno (letra o casilla ya marcada), no es un recuadro vacío
            r = [pt(x), pt(y), pt(x + w), pt(y + h)]
            if side_pt and not any(abs(b["rect"][0] - r[0]) < 2 and abs(b["rect"][1] - r[1]) < 2 for b in self.boxes):
                self.boxes.append({"rect": r, "glyph": False})
        # Un recuadro no es una celda de tabla
        self.cells = [c for c in self.cells if not self._cell_is_box(c)]

        # Líneas para escribir (no bordes de tabla)
        for x, y, w, h in hsegs:
            r = [pt(x), pt(y), pt(x + w), pt(y + h)]
            self.rules.append({"rect": r, "y": (r[1] + r[3]) / 2})

        # Texto por OCR
        try:
            langs = pytesseract.get_languages(config="")
        except Exception:
            langs = ["eng"]
        lang = "+".join([l for l in ("spa", "eng") if l in langs]) or "eng"
        clean = cv2.bitwise_not(cv2.bitwise_and(binv, cv2.bitwise_not(cv2.bitwise_or(hmask, vmask))))
        data = pytesseract.image_to_data(clean, lang=lang, config="--psm 11", output_type=pytesseract.Output.DICT)
        heights = sorted(h for h, t in zip(data["height"], data["text"]) if str(t or "").strip())
        med_h = heights[len(heights) // 2] if heights else 30
        for i, txt in enumerate(data["text"]):
            t = str(txt or "").strip()
            try:
                conf = float(data["conf"][i])
            except Exception:
                conf = -1
            if not t or conf < 35:
                continue
            x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
            r = [pt(x), pt(y), pt(x + w), pt(y + h)]
            # Ruido del OCR sobre un recuadro ("O", "[]", "0"): se recorta la parte del recuadro
            skip = False
            for b in self.boxes:
                br = b["rect"]
                if overlap(r[1], r[3], br[1], br[3]) <= 0.4 * (r[3] - r[1]):
                    continue
                ov = overlap(r[0], r[2], br[0], br[2])
                if ov <= 0:
                    continue
                if ov > 0.5 * (r[2] - r[0]):
                    skip = True
                    break
                n = len(t)
                cw = (r[2] - r[0]) / max(n, 1)
                if br[0] > r[0]:  # recuadro a la derecha de la palabra
                    keep = max(0, int(round((br[0] - r[0]) / cw)))
                    t, r = t[:keep], [r[0], r[1], r[0] + cw * keep, r[3]]
                else:  # recuadro a la izquierda
                    drop = min(n, int(round((br[2] - r[0]) / cw)))
                    t, r = t[drop:], [r[0] + cw * drop, r[1], r[2], r[3]]
                t = re.sub(r"^[\[\]|()0OoD]+|[\[\]|()0OoD]+$", "", t) if len(t) > 1 and re.search(r"[\[\]|]", t) else t
            t = t.strip(" .,;|")
            if skip or not t:
                continue
            if re.fullmatch(r"[_\-—–=.|]{2,}", t):
                continue  # rayas: ya se detectaron como líneas
            # Tamaño estable: el alto de la caja del OCR varía con mayúsculas/acentos
            size = 12.0 if h > 1.55 * med_h else 9.0
            letters = re.sub(r"[^A-Za-zÁÉÍÓÚÑáéíóúñ]", "", t)
            bold = letters.isupper() if letters else False
            self.words.append(self._word(t, *r, "ocr", size))
            self.words[-1]["bold"] = bold

        self.rules = [r for r in self.rules if not self._is_table_edge(r)]
        self._dedupe_rules()
        self._build_lines()

    def _measure_glyph_boxes(self):
        """El cuadrado visible de '☐' no coincide con la caja del carácter: se mide en la imagen."""
        glyphs = [b for b in self.boxes if b.get("glyph")]
        if not glyphs:
            return
        try:
            scale = 6.0
            img = self.page.to_image(resolution=72 * scale).original.convert("L")
        except Exception:
            return
        for b in glyphs:
            r = b["char_rect"]
            x0, y0 = int((r[0] - 1) * scale), int((r[1] - 1) * scale)
            x1, y1 = int((r[2] + 1) * scale), int((r[3] + 1) * scale)
            x0, y0 = max(x0, 0), max(y0, 0)
            x1, y1 = min(x1, img.width), min(y1, img.height)
            if x1 - x0 < 4 or y1 - y0 < 4:
                continue
            crop = img.crop((x0, y0, x1, y1))
            bw = crop.point(lambda p: 255 if p < 140 else 0)
            bbox = bw.getbbox()
            if not bbox:
                continue
            bx0, by0, bx1, by1 = bbox
            w, h = (bx1 - bx0) / scale, (by1 - by0) / scale
            if w < 3 or h < 3 or abs(w - h) > max(2.0, 0.35 * max(w, h)):
                continue
            b["rect"] = [x0 / scale + bx0 / scale, y0 / scale + by0 / scale,
                         x0 / scale + bx1 / scale, y0 / scale + by1 / scale]

    def _boxes_from_edges(self, shapes):
        hs = []
        vs = []
        for r in shapes:
            w, h = float(r["width"]), float(r["height"])
            rr = self._rel(r["x0"], r["top"], r["x1"], r["bottom"])
            if h <= 1.6 and 4 <= w <= 20:
                hs.append(rr)
            elif w <= 1.6 and 4 <= h <= 20:
                vs.append(rr)
        for top in hs:
            for bot in hs:
                if bot is top:
                    continue
                d = bot[1] - top[1]
                if not (4 <= d <= 20):
                    continue
                if abs(bot[0] - top[0]) > 1 or abs(bot[2] - top[2]) > 1:
                    continue
                w = top[2] - top[0]
                if abs(w - d) > 2.5:
                    continue
                left = any(abs(v[0] - top[0]) <= 1.5 and v[1] <= top[1] + 1.5 and v[3] >= bot[3] - 1.5 for v in vs)
                right = any(abs(v[2] - top[2]) <= 1.5 and v[1] <= top[1] + 1.5 and v[3] >= bot[3] - 1.5 for v in vs)
                if left and right:
                    rr = [top[0], top[1], top[2], bot[3]]
                    if not any(abs(b["rect"][0] - rr[0]) < 1.5 and abs(b["rect"][1] - rr[1]) < 1.5 for b in self.boxes):
                        self.boxes.append({"rect": rr, "glyph": False})
        # Las celdas diminutas que en realidad son casillas no deben contar como celdas
        self.cells = [c for c in self.cells if not self._cell_is_box(c)]

    def _cell_is_box(self, cell):
        r = cell["rect"]
        return any(abs(b["rect"][0] - r[0]) < 2 and abs(b["rect"][1] - r[1]) < 2 and
                   abs(b["rect"][2] - r[2]) < 2 for b in self.boxes)

    def _is_table_edge(self, rule):
        r = rule["rect"]
        y = rule["y"]
        for c in self.table_edges:
            if overlap(r[0], r[2], c[0], c[2]) >= min(r[2] - r[0], c[2] - c[0]) * 0.8 and (
                    abs(y - c[1]) <= 2 or abs(y - c[3]) <= 2):
                return True
        return False

    def _dedupe_rules(self):
        out = []
        for r in sorted(self.rules, key=lambda r: (round(r["y"]), r["rect"][0])):
            if any(abs(o["y"] - r["y"]) <= 1.5 and overlap(o["rect"][0], o["rect"][2], r["rect"][0], r["rect"][2]) > 5
                   for o in out):
                continue
            out.append(r)
        self.rules = out

    @staticmethod
    def _word(text, x0, top, x1, bottom, font, size):
        return {"text": text, "rect": [x0, top, x1, bottom], "font": font, "size": size,
                "bold": bool(re.search(r"bold|black|heavy|semibold|demi", font, re.I))}

    def cell_of(self, x, y):
        best = None
        for c in self.cells:
            if rect_contains(c["rect"], x, y):
                area = (c["rect"][2] - c["rect"][0]) * (c["rect"][3] - c["rect"][1])
                if best is None or area < best[0]:
                    best = (area, c)
        return best[1] if best else None

    def _build_lines(self):
        words = sorted(self.words, key=lambda w: ((w["rect"][1] + w["rect"][3]) / 2, w["rect"][0]))
        rows = []
        for w in words:
            cy = (w["rect"][1] + w["rect"][3]) / 2
            for row in rows:
                if abs(row["cy"] - cy) <= max(2.5, w["size"] * 0.35):
                    row["words"].append(w)
                    break
            else:
                rows.append({"cy": cy, "words": [w]})
        lines = []
        for row in rows:
            ws = sorted(row["words"], key=lambda w: w["rect"][0])
            segs = []
            cur = None
            for w in ws:
                cell = self.cell_of((w["rect"][0] + w["rect"][2]) / 2, (w["rect"][1] + w["rect"][3]) / 2)
                if cur is not None:
                    gap = w["rect"][0] - cur["rect"][2]
                    box_between = any(cur["rect"][2] - 1 <= b["rect"][0] and b["rect"][2] <= w["rect"][0] + 1 and
                                      overlap(b["rect"][1], b["rect"][3], w["rect"][1], w["rect"][3]) > 1
                                      for b in self.boxes)
                    if gap > max(6.0, w["size"] * 0.9) or cell is not cur["cell"] or box_between:
                        segs.append(cur)
                        cur = None
                if cur is None:
                    cur = {"text": w["text"], "rect": list(w["rect"]), "words": [w], "cell": cell,
                           "size": w["size"], "page": self.index}
                else:
                    tight = w["rect"][0] - cur["rect"][2] < max(0.6, w["size"] * 0.12)
                    cur["text"] += ("" if tight else " ") + w["text"]
                    cur["rect"][2] = max(cur["rect"][2], w["rect"][2])
                    cur["rect"][1] = min(cur["rect"][1], w["rect"][1])
                    cur["rect"][3] = max(cur["rect"][3], w["rect"][3])
                    cur["words"].append(w)
            if cur is not None:
                segs.append(cur)
            for s in segs:
                s["bold"] = all(w["bold"] for w in s["words"])
                s["used"] = False
            lines.append({"cy": row["cy"], "segments": segs})
        self.lines = sorted(lines, key=lambda l: l["cy"])
        self._split_yes_no_tokens()
        self.segments = [s for l in self.lines for s in l["segments"]]
        for s in self.segments:
            s["hint"] = is_date_hint(s["text"])

    def _split_yes_no_tokens(self):
        """'¿Pregunta? Sí ☐' -> separa 'Sí' para que sea la etiqueta del recuadro."""
        for line in self.lines:
            new = []
            for s in line["segments"]:
                ws = s["words"]
                last = ws[-1]["text"].rstrip(":").strip() if ws else ""
                box_right = any(0 <= b["rect"][0] - s["rect"][2] <= 24 and
                                abs((b["rect"][1] + b["rect"][3]) / 2 - (s["rect"][1] + s["rect"][3]) / 2) <= 6
                                for b in self.boxes)
                if len(ws) > 1 and box_right and (is_yes(last) or is_no(last)):
                    head = ws[:-1]
                    tail = ws[-1]
                    s1 = dict(s, text=" ".join(w["text"] for w in head), words=head,
                              rect=[min(w["rect"][0] for w in head), min(w["rect"][1] for w in head),
                                    max(w["rect"][2] for w in head), max(w["rect"][3] for w in head)])
                    s1["bold"] = all(w["bold"] for w in head)
                    s2 = dict(s, text=tail["text"], words=[tail], rect=list(tail["rect"]), bold=tail["bold"])
                    new.extend([s1, s2])
                else:
                    new.append(s)
            line["segments"] = new


class Analyzer:
    def __init__(self, pdf_path, known_labels=None):
        self.pdf_path = pdf_path
        self.known = {norm(k): v for k, v in (known_labels or {}).items() if norm(k)}
        self.fields = {}
        self.order = []
        self.elements = []  # (page, top, x0, kind, payload)
        self.warnings = []
        self.pages = []
        self.models = []

    # --- claves de campo -----------------------------------------------------
    def _key_for(self, label, kind="text"):
        n = norm(label)
        key = None
        used = set(self.fields)
        if kind not in ("text", "textarea", "date"):
            pass  # Sí/No y casillas usan claves propias (valores distintos al formato estándar)
        elif n in self.known and self.known[n] not in used:
            key = self.known[n]
        elif n and self.known and len(n) >= 6:
            best = max(self.known.items(), key=lambda kv: SequenceMatcher(None, n, kv[0]).ratio())
            if SequenceMatcher(None, n, best[0]).ratio() >= 0.9 and best[1] not in used:
                key = best[1]
        key = key or slug(label)
        base, i = key, 2
        while key in self.fields:
            key = f"{base}_{i}"
            i += 1
        return key

    def _add_field(self, page, label, kind, rect=None, options=None, extra=None, extra_cover=None):
        label = clean_label(label) or "Campo"
        key = self._key_for(label, kind)
        f = {"key": key, "label": label, "kind": kind, "page": page}
        if extra_cover:
            f["cover"] = extra_cover
        if rect:
            f["rect"] = [round(v, 2) for v in rect]
        if options is not None:
            f["options"] = options
        if extra:
            f.update(extra)
        n = norm(label)
        f["required"] = kind not in ("signature", "checkbox") and not any(w in n for w in OPTIONAL_WORDS)
        self.fields[key] = f
        anchor = (extra or {}).pop("anchor", None) if extra else None
        f.pop("anchor", None)
        if anchor:
            top, x0 = anchor
        elif rect:
            top, x0 = rect[1], rect[0]
        else:
            top = min(o["rect"][1] for o in options)
            x0 = min(o["rect"][0] for o in options)
        self.elements.append((page, top, x0, "field", key))
        return f

    # --- AcroForm ------------------------------------------------------------
    def acro_fields(self):
        try:
            from pypdf import PdfReader
        except Exception:
            return []
        out = []
        reader = PdfReader(self.pdf_path)
        for pi, page in enumerate(reader.pages):
            annots = page.get("/Annots") or []
            mb = page.mediabox
            llx, lly, urx, ury = float(mb.left), float(mb.bottom), float(mb.right), float(mb.top)
            for a in annots:
                try:
                    obj = a.get_object()
                except Exception:
                    continue
                if obj.get("/Subtype") != "/Widget":
                    continue
                name_parts = []
                node = obj
                ft = None
                tu = None
                ff = 0
                opt = None
                while node is not None:
                    if node.get("/T") is not None:
                        name_parts.insert(0, str(node.get("/T")))
                    ft = ft or node.get("/FT")
                    tu = tu or node.get("/TU")
                    ff = ff or int(node.get("/Ff", 0) or 0)
                    opt = opt or node.get("/Opt")
                    parent = node.get("/Parent")
                    node = parent.get_object() if parent is not None else None
                rect = [float(v) for v in obj.get("/Rect", [0, 0, 0, 0])]
                x0, x1 = sorted([rect[0], rect[2]])
                y0, y1 = sorted([rect[1], rect[3]])
                r = [x0 - llx, ury - y1, x1 - llx, ury - y0]
                on_state = None
                ap = obj.get("/AP")
                if ap is not None:
                    try:
                        n = ap.get_object().get("/N")
                        if n is not None:
                            for k in n.get_object().keys():
                                if k != "/Off":
                                    on_state = k
                    except Exception:
                        pass
                out.append({"name": ".".join(name_parts), "ft": str(ft or ""), "rect": r, "page": pi,
                            "tooltip": str(tu) if tu else "", "ff": ff, "on": on_state,
                            "options": [str(o if not isinstance(o, list) else o[-1]) for o in (opt or [])]})
        return out

    # --- etiquetas cercanas --------------------------------------------------
    def _label_left(self, pm, rect, max_gap=140):
        cy = (rect[1] + rect[3]) / 2
        best = None
        for s in pm.segments:
            sr = s["rect"]
            if sr[2] <= rect[0] + 3 and abs((sr[1] + sr[3]) / 2 - cy) <= max(6, (rect[3] - rect[1]) / 2 + 3):
                gap = rect[0] - sr[2]
                if gap <= max_gap and (best is None or gap < best[0]):
                    best = (gap, s)
        return best[1] if best else None

    def _label_above(self, pm, rect, max_gap=26):
        best = None
        for s in pm.segments:
            sr = s["rect"]
            if sr[3] <= rect[1] + 2 and overlap(sr[0], sr[2], rect[0], rect[2]) > 0:
                gap = rect[1] - sr[3]
                if gap <= max_gap and (best is None or gap < best[0]):
                    best = (gap, s)
        return best[1] if best else None

    def _label_below(self, pm, rect, max_gap=14):
        best = None
        for s in pm.segments:
            sr = s["rect"]
            if sr[1] >= rect[3] - 2 and overlap(sr[0], sr[2], rect[0], rect[2]) > 0:
                gap = sr[1] - rect[3]
                if gap <= max_gap and (best is None or gap < best[0]):
                    best = (gap, s)
        return best[1] if best else None

    # --- casillas ------------------------------------------------------------
    def _box_label(self, pm, box):
        r = box["rect"]
        cy = (r[1] + r[3]) / 2
        right = left = None
        for s in pm.segments:
            sr = s["rect"]
            if abs((sr[1] + sr[3]) / 2 - cy) > max(5, (r[3] - r[1])):
                continue
            if sr[0] >= r[2] - 1 and sr[0] - r[2] <= 24:
                if right is None or sr[0] < right["rect"][0]:
                    right = s
            if sr[2] <= r[0] + 1 and r[0] - sr[2] <= (60 if s["text"].rstrip().endswith(":") else 24):
                if left is None or sr[2] > left["rect"][2]:
                    left = s
        # Patrón "Sí ☐ No ☐" o "Etiqueta: ☐": la etiqueta está a la izquierda
        if left is not None and (is_yes(left["text"].rstrip(":")) or is_no(left["text"].rstrip(":"))
                                 or left["text"].rstrip().endswith(":")):
            return left
        if right is not None and (is_yes(right["text"]) or is_no(right["text"])):
            return right
        if right is not None:
            return right
        return left

    def _group_boxes(self, pm):
        boxes = sorted(pm.boxes, key=lambda b: (round((b["rect"][1] + b["rect"][3]) / 2), b["rect"][0]))
        for b in boxes:
            seg = self._box_label(pm, b)
            b["label_seg"] = seg
            b["label_extra"] = []
            text = seg["text"] if seg else ""
            if seg is not None and seg["rect"][0] >= b["rect"][2] - 1:
                # etiqueta a la derecha que continúa en las líneas de abajo (misma columna)
                cur = seg
                for _ in range(3):
                    nxt = None
                    for o in pm.segments:
                        if o is cur or o["used"] or o["cell"] is not seg["cell"]:
                            continue
                        if b["rect"][0] - 4 <= o["rect"][0] <= seg["rect"][0] + 2.5 and 0 <= o["rect"][1] - cur["rect"][3] <= 3.5:
                            if any(abs(self._center(bb)[1] - (o["rect"][1] + o["rect"][3]) / 2) <= 5 and
                                   0 <= o["rect"][0] - bb["rect"][2] <= 24 for bb in pm.boxes):
                                continue
                            nxt = o
                            break
                    if nxt is None:
                        break
                    b["label_extra"].append(nxt)
                    text += " " + nxt["text"]
                    cur = nxt
            b["label"] = clean_label(text) if seg else ""
        groups = []
        # 1) misma fila
        rows = []
        for b in boxes:
            cy = (b["rect"][1] + b["rect"][3]) / 2
            for row in rows:
                if abs(row["cy"] - cy) <= 4:
                    row["boxes"].append(b)
                    break
            else:
                rows.append({"cy": cy, "boxes": [b]})
        for row in rows:
            row["boxes"].sort(key=lambda b: b["rect"][0])
            cur = []
            for b in row["boxes"]:
                # Varios pares Sí/No en la misma fila: un "Sí" después de un "No" inicia grupo nuevo
                if cur and is_yes(b["label"]) and any(is_no(x["label"]) for x in cur):
                    groups.append(cur)
                    cur = []
                cur.append(b)
            if cur:
                groups.append(cur)
        # 2) listas verticales / rejillas en tabla: une grupos no Sí/No contiguos
        merged = []
        for g in groups:
            yn = all(is_yes(b["label"]) or is_no(b["label"]) for b in g)
            if merged and not yn:
                prev = merged[-1]
                prev_yn = all(is_yes(b["label"]) or is_no(b["label"]) for b in prev)
                if not prev_yn:
                    gap = g[0]["rect"][1] - max(b["rect"][3] for b in prev)
                    same_table = (pm.cell_of(*self._center(g[0])) or {}).get("table") is not None and \
                        (pm.cell_of(*self._center(g[0])) or {}).get("table") == (pm.cell_of(*self._center(prev[0])) or {}).get("table")
                    aligned = abs(g[0]["rect"][0] - prev[0]["rect"][0]) <= 6
                    blocker = self._text_between(pm, prev, g)
                    if 0 <= gap <= 30 and (same_table or aligned) and not blocker:
                        prev.extend(g)
                        continue
            merged.append(g)
        return merged

    @staticmethod
    def _center(b):
        r = b["rect"]
        return (r[0] + r[2]) / 2, (r[1] + r[3]) / 2

    def _text_between(self, pm, g1, g2):
        y0 = max(b["rect"][3] for b in g1)
        y1 = min(b["rect"][1] for b in g2)
        labels = {id(b.get("label_seg")) for b in g1 + g2 if b.get("label_seg")}
        labels |= {id(o) for b in g1 + g2 for o in b.get("label_extra", [])}
        for s in pm.segments:
            if id(s) in labels:
                continue
            cy = (s["rect"][1] + s["rect"][3]) / 2
            if y0 + 1 < cy < y1 - 1:
                return True
        return False

    def _question_for(self, pm, group):
        first = min(group, key=lambda b: (b["rect"][1], b["rect"][0]))
        r = first["rect"]
        labels = {id(b.get("label_seg")) for b in group if b.get("label_seg")}
        labels |= {id(o) for b in group for o in b.get("label_extra", [])}
        # A la izquierda en la misma línea (antes del primer recuadro / etiqueta)
        x_left = min(min(b["rect"][0] for b in group),
                     min((b["label_seg"]["rect"][0] for b in group if b.get("label_seg")), default=10 ** 6))
        cy = (r[1] + r[3]) / 2
        cell = pm.cell_of(*self._center(first))

        def same_area(s):
            if cell is None or s["cell"] is None or s["cell"] is cell:
                return True
            # texto en una celda que contiene a la del recuadro (tabla anidada)
            return rect_contains(s["cell"]["rect"], *self._center(first)) and s["cell"]["table"] != cell["table"]

        left = [s for s in pm.segments if id(s) not in labels and not s["used"] and s["rect"][2] <= x_left + 1
                and abs((s["rect"][1] + s["rect"][3]) / 2 - cy) <= 6 and (cell is None or s["cell"] is cell)
                and not is_yes(s["text"].rstrip(":")) and not is_no(s["text"].rstrip(":"))]
        if left:
            left.sort(key=lambda s: s["rect"][0])
            return left
        # Líneas inmediatamente encima (hasta 4)
        top = min(b["rect"][1] for b in group)
        above = []
        cursor = top
        for line in reversed(pm.lines):
            segs = [s for s in line["segments"] if not s["used"] and id(s) not in labels
                    and s["rect"][3] <= cursor + 1 and same_area(s)]
            segs = [s for s in segs if s["rect"][3] <= top + 1]
            if not segs:
                continue
            bottom = max(s["rect"][3] for s in segs)
            if cursor - bottom > (22 if not above else 8):
                break
            if any(s["bold"] and len(s["text"]) < 70 and not s["text"].strip().endswith(("?", ":")) for s in segs) and above:
                break
            if any(is_detail_text(s["text"]) for s in segs):
                break  # "En caso afirmativo, detalles:" pertenece a la pregunta anterior
            if any(s["text"].rstrip().endswith(":") and len(s["text"].split()) <= 5 for s in segs):
                break  # etiqueta corta de otro campo ("No. EI:")
            above = segs + above
            cursor = min(s["rect"][1] for s in segs)
            if len(above) >= 4 or any(re.match(r"^\s*(\d+|[a-z])[\.\)]\s", s["text"], re.I) for s in segs):
                break
        if not above and cell is not None:
            # Etiqueta en la celda de la izquierda de la misma fila
            left_cells = [c for c in pm.cells if c["table"] == cell["table"] and c["rect"][2] <= cell["rect"][0] + 1
                          and overlap(c["rect"][1], c["rect"][3], cell["rect"][1], cell["rect"][3]) > 4]
            if left_cells:
                lc = max(left_cells, key=lambda c: c["rect"][2])
                above = [s for s in pm.segments if s["cell"] is lc and not s["used"]]
        return above

    def _boxes_to_fields(self, pm):
        for g in self._group_boxes(pm):
            for b in g:
                if b.get("label_seg"):
                    b["label_seg"]["used"] = True
                for o in b.get("label_extra", []):
                    o["used"] = True
            question = self._question_for(pm, g)
            qtext = clean_label(" ".join(s["text"] for s in question)) if question else ""
            for s in question:
                s["used"] = True
            yn = len(g) >= 2 and all(is_yes(b["label"]) or is_no(b["label"]) for b in g)
            if not yn and len(g) == 2 and any(is_yes(b["label"]) or is_no(b["label"]) for b in g) and \
                    all(is_yes(b["label"]) or is_no(b["label"]) or len(norm(b["label"])) <= 2 for b in g):
                yn = True  # par Sí/No donde el OCR no leyó una de las dos etiquetas
            if yn and len(g) == 2:
                ys = [is_yes(b["label"]) for b in g]
                ns = [is_no(b["label"]) for b in g]
                if not (ys[0] and ns[1]) and not (ns[0] and ys[1]):
                    g[0]["label"], g[1]["label"] = "Sí", "No"  # orden habitual: Sí primero
            anchor_top = min([b["rect"][1] for b in g] + [s["rect"][1] for s in question])
            anchor_x = min([b["rect"][0] for b in g] + [s["rect"][0] for s in question])
            options = []
            for i, b in enumerate(g):
                lab = b["label"] or f"Opción {i + 1}"
                val = "yes" if yn and is_yes(lab) else ("no" if yn and is_no(lab) else slug(lab, f"op{i + 1}"))
                # valores únicos
                base, k = val, 2
                while any(o["value"] == val for o in options):
                    val = f"{base}_{k}"
                    k += 1
                options.append({"value": val, "label": lab, "rect": [round(v, 2) for v in b["rect"]]})
            if yn:
                yf = self._add_field(pm.index, qtext or "Pregunta Sí/No", "yesno", options=options,
                                     extra={"anchor": (anchor_top, anchor_x)})
                self._detail_after_group(pm, g, yf["key"], self.right_margin)
            elif len(g) == 1:
                o = options[0]
                label = o["label"] if not o["label"].startswith("Opción") else (qtext or o["label"])
                f = self._add_field(pm.index, label or "Casilla", "checkbox", rect=o["rect"],
                                    extra={"anchor": (anchor_top, anchor_x)})
                f["required"] = False
            else:
                mf = self._add_field(pm.index, qtext or "Seleccione", "multi", options=options,
                                     extra={"anchor": (anchor_top, anchor_x)})
                for b, o in zip(g, options):
                    cy = self._center(b)[1]
                    lab = b.get("label_seg")
                    x_from = max(b["rect"][2], lab["rect"][2] if lab else 0)
                    det = [sg for sg in pm.segments if not sg["used"] and sg["rect"][0] >= x_from - 1 and
                           abs((sg["rect"][1] + sg["rect"][3]) / 2 - cy) <= 5 and is_detail_text(sg["text"])]
                    if not det:
                        continue
                    sg = min(det, key=lambda d: d["rect"][0])
                    sg["used"] = True
                    rect = self._space_for(pm, sg, self.right_margin, min_right=50)
                    df = self._add_field(pm.index, f"{o['label']}: {clean_label(sg['text'])}", "text", rect=rect,
                                         extra={"anchor": (sg["rect"][1], sg["rect"][0]),
                                                "requiredIf": {"key": mf["key"], "value": o["value"]},
                                                **({} if rect else {"annex": True})})
                    df["required"] = False

    # --- campos de texto en PDF plano ----------------------------------------
    def _cells_to_fields(self, pm):
        def content(c):
            segs = [s for s in pm.segments if s["cell"] is c and not s["hint"]]
            boxes = [b for b in pm.boxes if rect_contains(c["rect"], *self._center(b))]
            rules = [r for r in pm.rules if rect_contains(c["rect"], (r["rect"][0] + r["rect"][2]) / 2, r["y"])]
            return segs, boxes, rules

        info = {id(c): content(c) for c in pm.cells}
        for c in pm.cells:
            segs, boxes, rules = info[id(c)]
            r = c["rect"]
            if segs or boxes or rules or (r[2] - r[0]) < 25 or (r[3] - r[1]) < 9:
                continue
            row_left = [o for o in pm.cells if o["table"] == c["table"] and o["rect"][2] <= r[0] + 1.5
                        and overlap(o["rect"][1], o["rect"][3], r[1], r[3]) >= min(r[3] - r[1], o["rect"][3] - o["rect"][1]) * 0.5
                        and info[id(o)][0]]
            label_segs = []
            if row_left:
                lc = max(row_left, key=lambda o: o["rect"][2])
                label_segs = info[id(lc)][0]
            else:
                col_up = [o for o in pm.cells if o["table"] == c["table"] and o["rect"][3] <= r[1] + 1.5
                          and overlap(o["rect"][0], o["rect"][2], r[0], r[2]) >= (r[2] - r[0]) * 0.6 and info[id(o)][0]]
                if col_up:
                    uc = max(col_up, key=lambda o: o["rect"][3])
                    label_segs = info[id(uc)][0]
            if not label_segs or all(s["used"] for s in label_segs):
                continue
            ltxt = " ".join(s["text"] for s in label_segs)
            if len(ltxt.split()) > 15 or re.match(r"^(nota|note)\b", norm(ltxt)):
                continue
            label = " ".join(s["text"] for s in label_segs if not s["hint"])
            hints = [s for s in pm.segments if s["cell"] is c and s["hint"]]
            for s in label_segs + hints:
                s["used"] = True
            cover = [[round(v, 2) for v in s["rect"]] for s in hints]
            rect = [r[0] + 3, r[1] + 2, r[2] - 3, r[3] - 2]
            kind = infer_kind(label, rect)
            if hints or any(s["hint"] for s in label_segs) or re.search(r"dd.?mm.?(aaaa|yyyy)", label, re.I):
                kind = "date"
            label = re.sub(r"\(?\[?\s*dd\s*/\s*mm\s*/\s*(aaaa|yyyy)\s*\]?\)?", "", label, flags=re.I)
            if cover:
                rect = list(rect)
            self._add_field(pm.index, label, kind, rect=rect, extra_cover=cover,
                            extra={"anchor": (min(s["rect"][1] for s in label_segs), min(s["rect"][0] for s in label_segs))})

    def _rules_to_fields(self, pm):
        for rule in pm.rules:
            r = rule["rect"]
            y = rule["y"]
            h = max(11.0, (rule.get("size") or 9) * 1.3)
            rect = [r[0], y - h, r[2], y]
            lab = self._label_left(pm, rect, max_gap=60)
            if lab is None or lab["used"]:
                lab = self._label_below(pm, [r[0], y, r[2], y + 1])
                if lab is not None and lab["used"]:
                    lab = None
            if lab is None:
                lab = self._label_above(pm, rect, max_gap=10)
                if lab is not None and lab["used"]:
                    lab = None
            # Línea divisoria de ancho casi completo (bajo un título): no es una línea para escribir
            if (r[2] - r[0]) > 0.6 * pm.width and not (lab and lab["text"].rstrip().endswith(":")):
                continue
            if lab is None and not rule.get("underscore"):
                continue  # línea suelta sin etiqueta: no se puede saber qué pedir
            if lab is not None and lab["bold"] and not lab["text"].rstrip().endswith(":") and \
                    re.sub(r"[^A-Za-zÁÉÍÓÚÑ]", "", lab["text"]).isupper() and len(lab["text"].split()) >= 3:
                continue  # título en mayúsculas junto a un borde: no es un campo
            label = lab["text"] if lab else "Campo"
            if lab:
                lab["used"] = True
            self._add_field(pm.index, label, infer_kind(label, rect), rect=rect,
                            extra={"anchor": (min(rect[1], lab["rect"][1]) if lab else rect[1],
                                              min(rect[0], lab["rect"][0]) if lab else rect[0])})

    def _space_for(self, pm, s, right_margin, min_right=80, multiline=False):
        """Rectángulo libre para escribir junto a (o debajo de) un segmento de etiqueta.
        Si multiline, self._flow queda con el área de continuación debajo (o None)."""
        self._flow = None
        sr = s["rect"]
        cell = s["cell"]
        limit = cell["rect"][2] - 3 if cell else right_margin
        cy = (sr[1] + sr[3]) / 2
        nxt = [o for o in pm.segments if o is not s and o["rect"][0] >= sr[2] - 1 and
               abs((o["rect"][1] + o["rect"][3]) / 2 - cy) <= 5]
        nxt_boxes = [b for b in pm.boxes if b["rect"][0] >= sr[2] - 1 and abs(self._center(b)[1] - cy) <= 6]
        right_edge = min([o["rect"][0] for o in nxt] + [b["rect"][0] for b in nxt_boxes] + [limit])
        line_h = max(11.0, s["size"] * 1.35)
        if right_edge - sr[2] >= min_right:
            rect = [sr[2] + 4, sr[1] - 1, right_edge - 2, sr[1] - 1 + line_h]
            if multiline:
                below_limit = cell["rect"][3] - 2 if cell else pm.height - 30
                nxt_below = [o["rect"][1] for o in pm.segments if o is not s and o["rect"][1] >= sr[3] - 1 and
                             overlap(o["rect"][0], o["rect"][2], sr[0], limit) > 0]
                nxt_below += [b["rect"][1] for b in pm.boxes if b["rect"][1] >= sr[3] - 1 and
                              overlap(b["rect"][0], b["rect"][2], sr[0], limit) > 0]
                y_next = min(nxt_below + [below_limit])
                if y_next - sr[3] >= 12:
                    left = cell["rect"][0] + 3 if cell else sr[0]
                    self._flow = [left, sr[3] + 1, right_edge - 2, min(y_next - 2, sr[3] + 60)]
            return rect
        below_limit = cell["rect"][3] - 2 if cell else pm.height - 30
        below = [o for o in pm.segments if o is not s and o["rect"][1] >= sr[3] - 1 and
                 overlap(o["rect"][0], o["rect"][2], sr[0], limit) > 0]
        below_b = [b for b in pm.boxes if b["rect"][1] >= sr[3] - 1 and overlap(b["rect"][0], b["rect"][2], sr[0], limit) > 0]
        below_r = [r for r in pm.rules if r["rect"][1] >= sr[3] + 6 and overlap(r["rect"][0], r["rect"][2], sr[0], limit) > 0]
        y_next = min([o["rect"][1] for o in below] + [b["rect"][1] for b in below_b] +
                     [r["rect"][1] for r in below_r] + [below_limit])
        if y_next - sr[3] < 12:
            return None
        left = cell["rect"][0] + 3 if cell else sr[0]
        return [left, sr[3] + 1, limit, min(y_next - 1, sr[3] + 1 + max(line_h * 3, 34))]

    def _detail_after_group(self, pm, group, yes_key, right_margin):
        """'En caso afirmativo, proporcione detalles' después de un Sí/No."""
        gb = max(b["rect"][3] for b in group)
        gx1 = max(b["rect"][2] for b in group)
        gt = min(b["rect"][1] for b in group)
        cell = pm.cell_of(*self._center(group[0]))
        cands = []
        for s in pm.segments:
            if s["used"] or not is_detail_text(s["text"]):
                continue
            if cell is not None and s["cell"] is not cell:
                continue
            sr = s["rect"]
            same_line = sr[0] >= gx1 - 1 and abs((sr[1] + sr[3]) / 2 - (gt + gb) / 2) <= 6
            below = 0 <= sr[1] - gb <= 22
            if same_line or below:
                cands.append(s)
        if not cands:
            return
        s = min(cands, key=lambda o: (o["rect"][1], o["rect"][0]))
        s["used"] = True
        rect = self._space_for(pm, s, right_margin, multiline=True)
        flow = self._flow
        label = clean_label(s["text"])
        self._add_field(pm.index, label, "textarea", rect=rect,
                        extra={"anchor": (s["rect"][1], s["rect"][0]), "requiredIf": {"key": yes_key, "value": "yes"},
                               **({"flow": [round(v, 2) for v in flow]} if flow else {}),
                               **({} if rect else {"annex": True})})
        self.fields[list(self.fields)[-1]]["required"] = False

    def _colon_labels(self, pm, right_margin):
        for s in pm.segments:
            if s["used"] or s["hint"] or not s["text"].rstrip().endswith(":"):
                continue
            t = s["text"].strip()
            if len(t) < 3 or len(t) > 160:
                continue
            words = len(t.split())
            # Frase introductoria de una lista ("... los siguientes:", "... que:")
            if words > 12 and not is_detail_text(t):
                continue
            n = norm(t)
            if re.search(r"(siguientes|following|que|who|which|incluye|include|incluyendo)$", n):
                continue
            if re.match(r"^(nota|note|importante|important)\b", n):
                continue
            cell = s["cell"]
            if cell is not None and s["bold"]:
                row = [o for o in pm.cells if o["table"] == cell["table"] and o is not cell and
                       overlap(o["rect"][1], o["rect"][3], cell["rect"][1], cell["rect"][3]) > 3]
                if not row:
                    continue  # fila de título dentro de la tabla ("Si el Solicitante es:")
            # Etiqueta partida en dos líneas: une la línea de arriba (misma columna, sin usar)
            label_segs = [s]
            for o in pm.segments:
                if o is s or o["used"] or o["cell"] is not s["cell"]:
                    continue
                if abs(o["rect"][0] - s["rect"][0]) <= 2 and 0 <= s["rect"][1] - o["rect"][3] <= 4 and \
                        not o["text"].rstrip().endswith((":", ".", "?")):
                    label_segs.insert(0, o)
                    break
            rect = self._space_for(pm, s, right_margin,
                                   multiline=is_detail_text(t) or has_word(norm(t), LONG_WORDS))
            flow = self._flow
            if rect is None:
                if is_detail_text(t):
                    for o in label_segs:
                        o["used"] = True
                    self._add_field(pm.index, " ".join(o["text"] for o in label_segs), "textarea", rect=None,
                                    extra={"anchor": (s["rect"][1], s["rect"][0]), "annex": True})
                continue
            for o in label_segs:
                o["used"] = True
            label = " ".join(o["text"] for o in label_segs)
            kind = infer_kind(label, rect)
            if flow and kind == "text":
                kind = "textarea"
            self._add_field(pm.index, label, kind, rect=rect,
                            extra={"anchor": (label_segs[0]["rect"][1], label_segs[0]["rect"][0]),
                                   **({"flow": [round(v, 2) for v in flow]} if flow else {})})

    def _instruction_rows(self, pm):
        """Fila 'Etiqueta | Proporcione detalles sobre ...' sin campo: el valor va bajo la instrucción."""
        for c in pm.cells:
            segs = [s for s in pm.segments if s["cell"] is c]
            if not segs or any(s["used"] for s in segs):
                continue
            if any(rect_contains(c["rect"], *self._center(b)) for b in pm.boxes):
                continue
            if any(f.get("rect") and rect_contains(c["rect"], (f["rect"][0] + f["rect"][2]) / 2,
                                                    (f["rect"][1] + f["rect"][3]) / 2)
                   for f in self.fields.values() if f["page"] == pm.index):
                continue
            text = " ".join(s["text"] for s in segs)
            if not re.search(r"\b(proporcione|indique|describa|detalle|especifique|provide|state|describe|give|list|enumere)\b",
                             norm(text)):
                continue
            r = c["rect"]
            left = [o for o in pm.cells if o["table"] == c["table"] and o["rect"][2] <= r[0] + 1.5
                    and overlap(o["rect"][1], o["rect"][3], r[1], r[3]) > 4]
            label = text
            if left:
                lc = max(left, key=lambda o: o["rect"][2])
                lsegs = [s for s in pm.segments if s["cell"] is lc]
                if lsegs:
                    label = " ".join(s["text"] for s in lsegs)
                    for s in lsegs:
                        s["used"] = True
            bottom = max(s["rect"][3] for s in segs)
            rect = [r[0] + 3, bottom + 2, r[2] - 3, r[3] - 2] if r[3] - bottom >= 14 else None
            self._add_field(pm.index, label, "textarea", rect=rect,
                            extra={"anchor": (min(s["rect"][1] for s in segs), r[0]), "hint": text,
                                   **({} if rect else {"annex": True})})
            for s in segs:
                s["used"] = True

    def _inline_cell_fields(self, pm):
        """Celda con etiqueta corta y espacio libre a la derecha (p. ej. 'Primer nombre ______')."""
        for c in pm.cells:
            segs = [s for s in pm.segments if s["cell"] is c]
            if len(segs) != 1:
                continue
            s = segs[0]
            if s["used"] or s["bold"] or len(s["text"].split()) > 6 or s["text"].strip().endswith("?"):
                continue
            letters = re.sub(r"[^A-Za-zÁÉÍÓÚÑáéíóúñ]", "", s["text"])
            if letters.isupper() and len(s["text"].split()) >= 3:
                continue  # título en mayúsculas
            if any(rect_contains(c["rect"], *self._center(b)) for b in pm.boxes):
                continue
            r = c["rect"]
            row = [o for o in pm.cells if o["table"] == c["table"] and o is not c and
                   overlap(o["rect"][1], o["rect"][3], r[1], r[3]) > (r[3] - r[1]) * 0.5]
            if row and all(o["rect"][0] >= r[2] - 1 for o in row):
                continue  # celda más a la izquierda de la fila: es etiqueta de grupo
            if r[2] - s["rect"][2] < 100:
                continue
            rect = [s["rect"][2] + 4, s["rect"][1] - 1, r[2] - 3, s["rect"][3] + 2]
            s["used"] = True
            self._add_field(pm.index, s["text"], infer_kind(s["text"], rect), rect=rect,
                            extra={"anchor": (s["rect"][1], s["rect"][0])})

    # --- textos guía y títulos -------------------------------------------------
    def _repeated_margin_text(self):
        seen = {}
        for pm in self.models:
            for s in pm.segments:
                y = (s["rect"][1] + s["rect"][3]) / 2
                if y < pm.height * 0.08 or y > pm.height * 0.92:
                    seen.setdefault(norm(s["text"]), set()).add(pm.index)
        return {k for k, v in seen.items() if len(v) >= 2}

    def _text_elements(self, body_size):
        repeated = self._repeated_margin_text() if len(self.models) > 1 else set()
        for pm in self.models:
            for line in pm.lines:
                segs = [s for s in line["segments"] if not s["used"]]
                for s in segs:
                    t = s["text"].strip()
                    if not t or not norm(t) or norm(t) in repeated or s.get("hint"):
                        continue
                    if re.match(r"^(p[aá]gina|page)\s*\d+(\s*(de|of)\s*\d+)?$", t, re.I) or re.match(r"^\d+$", t):
                        continue
                    heading = ((s["bold"] and len(t) <= 90 and not t.endswith((".", ","))) or
                               s["size"] >= body_size + 1.5 or
                               bool(re.match(r"^([IVX]+|[0-9]+)[\.\)]\s+\S", t)) and len(t) <= 90)
                    self.elements.append((pm.index, s["rect"][1], s["rect"][0], "heading" if heading else "text",
                                          {"text": t, "size": s["size"], "bottom": s["rect"][3]}))

    # --- ejecución -------------------------------------------------------------
    def run(self):
        import pdfplumber
        acro = self.acro_fields()
        with pdfplumber.open(self.pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                pm = PageModel(page, i)
                self.models.append(pm)
                if pm.scanned:
                    self.warnings.append(f"page {i + 1}: scanned (OCR)")
                elif getattr(pm, "ocr_error", None):
                    self.warnings.append(f"page {i + 1}: scanned page, OCR unavailable: {pm.ocr_error}")
                self.pages.append({"w": round(pm.width, 2), "h": round(pm.height, 2)})
        sizes = [w["size"] for pm in self.models for w in pm.words]
        body = sorted(sizes)[len(sizes) // 2] if sizes else 9

        right_margin = max([s["rect"][2] for pm in self.models for s in pm.segments] + [500])
        self.right_margin = right_margin
        if acro:
            self._from_acro(acro)
        else:
            for pm in self.models:
                self._boxes_to_fields(pm)
                self._cells_to_fields(pm)
                self._rules_to_fields(pm)
                self._inline_cell_fields(pm)
                self._colon_labels(pm, min(right_margin, pm.width - 20))
                self._instruction_rows(pm)
        self._link_conditionals_pre()
        self._text_elements(body)
        schema = self._build_schema()
        return schema

    def _from_acro(self, acro):
        by_name = {}
        for w in acro:
            by_name.setdefault(w["name"], []).append(w)
        for name, widgets in by_name.items():
            w0 = widgets[0]
            pm = self.models[w0["page"]] if w0["page"] < len(self.models) else None
            ft = w0["ft"]
            radio = ft == "/Btn" and bool(w0["ff"] & (1 << 15))
            push = ft == "/Btn" and bool(w0["ff"] & (1 << 16))
            if push:
                continue
            if ft == "/Btn":
                options = []
                for i, w in enumerate(widgets):
                    lab = ""
                    if pm is not None:
                        seg = self._box_label(pm, {"rect": w["rect"]})
                        if seg:
                            seg["used"] = True
                            lab = clean_label(seg["text"])
                    on = (w["on"] or "/Yes").lstrip("/")
                    lab = lab or on
                    options.append({"value": on, "label": lab, "rect": [round(v, 2) for v in w["rect"]], "on": on})
                group = [{"rect": w["rect"], "label_seg": None} for w in widgets]
                question = self._question_for(pm, group) if pm is not None else []
                for s in question:
                    s["used"] = True
                qtext = w0["tooltip"] or clean_label(" ".join(s["text"] for s in question)) or name
                yn = len(options) >= 2 and all(is_yes(o["label"]) or is_no(o["label"]) for o in options)
                if yn:
                    for o in options:
                        o["acroValue"] = o["value"]
                        o["value"] = "yes" if is_yes(o["label"]) else "no"
                    self._add_field(w0["page"], qtext, "yesno", options=options, extra={"acroName": name})
                elif radio and len(options) > 1:
                    self._add_field(w0["page"], qtext, "choice", options=options, extra={"acroName": name})
                else:
                    label = w0["tooltip"] or options[0]["label"] or qtext
                    f = self._add_field(w0["page"], label, "checkbox", rect=options[0]["rect"],
                                        extra={"acroName": name, "on": options[0]["on"]})
                    f["required"] = False
            elif ft == "/Ch":
                lab = w0["tooltip"]
                if not lab and pm is not None:
                    seg = self._label_left(pm, w0["rect"]) or self._label_above(pm, w0["rect"])
                    if seg:
                        seg["used"] = True
                        lab = seg["text"]
                self._add_field(w0["page"], lab or name, "select", rect=w0["rect"],
                                extra={"acroName": name, "choices": w0["options"]})
            else:
                lab = w0["tooltip"]
                if not lab and pm is not None:
                    seg = self._label_left(pm, w0["rect"]) or self._label_above(pm, w0["rect"]) or \
                        self._label_below(pm, w0["rect"])
                    if seg and not seg["used"]:
                        seg["used"] = True
                        lab = seg["text"]
                lab = lab or re.sub(r"[_\.]+", " ", name)
                kind = infer_kind(lab, w0["rect"])
                if w0["ff"] & (1 << 12) and kind == "text":
                    kind = "textarea"
                extra = {"acroName": name}
                if len(widgets) > 1:
                    extra["copies"] = [{"page": w["page"], "rect": [round(v, 2) for v in w["rect"]]} for w in widgets[1:]]
                self._add_field(w0["page"], lab, kind, rect=w0["rect"], extra=extra)

    def _link_conditionals_pre(self):
        """Campo de detalle que sigue a un Sí/No: obligatorio solo si la respuesta es Sí."""
        ordered = sorted([e for e in self.elements if e[3] == "field"], key=lambda e: (e[0], e[1], e[2]))
        prev = None
        for e in ordered:
            f = self.fields[e[4]]
            if prev is not None and f["kind"] in ("text", "textarea") and \
                    any(w in norm(f["label"]) for w in CONDITIONAL_WORDS) and e[0] == prev[0][0] and e[1] - prev[0][1] < 60:
                f["requiredIf"] = {"key": prev[1]["key"], "value": "yes"}
                f["required"] = False
            prev = (e, f) if f["kind"] == "yesno" else None

    def _build_schema(self):
        els = sorted(self.elements, key=lambda e: (e[0], round(e[1] / 3), e[2]))
        sections = []
        cur = {"title": "", "items": []}

        def push_text(item_text, size, bottom, page):
            items = cur["items"]
            if items and items[-1]["type"] == "guide" and items[-1].get("_page") == page and \
                    0 <= (item_text["top"] - items[-1]["_bottom"]) <= max(size * 0.9, 6):
                bullet = re.match(r"^\s*([✓✔•\-–·▪◦●○➤►]|\d+[\.\)]|[a-z][\.\)])\s", item_text["text"], re.I)
                items[-1]["text"] += ("\n" if bullet else " ") + item_text["text"]
                items[-1]["_bottom"] = bottom
                return
            items.append({"type": "guide", "text": item_text["text"], "_bottom": bottom, "_page": page})

        for page, top, x0, kind, payload in els:
            if kind == "heading":
                if cur["items"] or cur["title"]:
                    if not cur["items"] and cur["title"]:
                        cur["title"] = (cur["title"] + " · " + payload["text"])[:160]
                        continue
                    sections.append(cur)
                cur = {"title": payload["text"], "items": []}
            elif kind == "text":
                push_text({"text": payload["text"], "top": top}, payload["size"], payload["bottom"], page)
            else:
                cur["items"].append({"type": "field", "key": payload})
        if cur["items"] or cur["title"]:
            sections.append(cur)
        # Secciones sin campos se funden con la siguiente (como guía)
        out = []
        carry = []
        for s in sections:
            has_field = any(i["type"] == "field" for i in s["items"])
            if not has_field:
                if s["title"]:
                    carry.append({"type": "guide", "text": s["title"], "heading": True})
                carry.extend(s["items"])
                continue
            s["items"] = carry + s["items"]
            carry = []
            out.append(s)
        if carry and out:
            out[-1]["items"].extend(carry)
        elif carry:
            out.append({"title": "", "items": carry})
        for i, s in enumerate(out):
            s["id"] = f"s{i + 1}"
            for it in s["items"]:
                it.pop("_bottom", None)
                it.pop("_page", None)
        order = [it["key"] for s in out for it in s["items"] if it["type"] == "field"]
        return {
            "engineVersion": ENGINE_VERSION,
            "source": "acroform" if any(f.get("acroName") for f in self.fields.values()) else
                      ("scanned" if any(m.scanned for m in self.models) else "flat"),
            "pages": self.pages,
            "sections": out,
            "fields": self.fields,
            "fieldOrder": order,
            "fieldCount": len(self.fields),
            "warnings": self.warnings,
        }


# ----------------------------------------------------------------------------- llenado

def _fmt_value(field, value):
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    s = str(value)
    if field.get("kind") == "date":
        m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
        if m:
            return f"{m.group(3)}/{m.group(2)}/{m.group(1)}"
    return s


def _wrap(text, font, size, width, stringWidth):
    out = []
    for para in str(text).split("\n"):
        words = para.split(" ")
        line = ""
        for w in words:
            while stringWidth(w, font, size) > width and len(w) > 1:
                # palabra más larga que el ancho: se corta
                cut = len(w)
                while cut > 1 and stringWidth(w[:cut], font, size) > width:
                    cut -= 1
                if line:
                    out.append(line)
                    line = ""
                out.append(w[:cut])
                w = w[cut:]
            cand = (line + " " + w).strip() if line else w
            if stringWidth(cand, font, size) <= width:
                line = cand
            else:
                if line:
                    out.append(line)
                line = w
        out.append(line)
    return out


def _draw_text(c, H, rect, text, stringWidth, multiline, min_size=6.5, max_size=9):
    """Escribe el texto dentro del rectángulo. Devuelve False si no cabe legible (va al anexo)."""
    font = "Helvetica"
    x0, top, x1, bottom = rect
    width = max(x1 - x0 - 2, 10)
    height = max(bottom - top, 8)
    text = str(text).strip()
    chosen = None
    for size in (9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5):
        if size > max_size:
            continue
        if size < min_size:
            break
        one = stringWidth(text, font, size) <= width and "\n" not in text
        lines = [text] if one else _wrap(text, font, size, width, stringWidth)
        lh = size * 1.15
        if len(lines) == 1 or len(lines) * lh <= height + 1.5:
            chosen = (size, lines)
            break
    if chosen is None:
        return False
    size, lines = chosen
    c.setFont(font, size)
    c.setFillColorRGB(0.06, 0.09, 0.16)
    if len(lines) == 1:
        if height > size * 2.2:
            base = H - (top + size + 1.5)  # celda alta: arriba a la izquierda
        else:
            base = H - (bottom - max(1.5, (height - size) / 2))  # sobre la raya / centrado
        c.drawString(x0 + 1, base, lines[0])
        return True
    y = H - (top + size + 0.5)
    for ln in lines:
        c.drawString(x0 + 1, y, ln)
        y -= size * 1.15
    return True


def _draw_flow(c, H, first, flow, text, stringWidth):
    """Primera línea junto a la etiqueta y el resto en el espacio de abajo."""
    font = "Helvetica"
    for size in (9, 8.5, 8, 7.5, 7, 6.5):
        lh = size * 1.15
        w1 = max(first[2] - first[0] - 2, 10)
        words = str(text).strip().split()
        line = ""
        rest = []
        for i, w in enumerate(words):
            cand = (line + " " + w).strip()
            if stringWidth(cand, font, size) <= w1:
                line = cand
            else:
                rest = words[i:]
                break
        lines = _wrap(" ".join(rest), font, size, max(flow[2] - flow[0] - 2, 10), stringWidth) if rest else []
        if len(lines) * lh <= (flow[3] - flow[1]) + 1:
            c.setFont(font, size)
            c.setFillColorRGB(0.06, 0.09, 0.16)
            if line:
                c.drawString(first[0] + 1, H - (first[3] - 2), line)
            y = H - (flow[1] + size + 0.5)
            for ln in lines:
                c.drawString(flow[0] + 1, y, ln)
                y -= lh
            return True
    return False


def _annex_pages(annex, page_size, stringWidth):
    """Páginas de anexo con los datos que no tienen espacio en la plantilla."""
    from reportlab.pdfgen import canvas
    W, H = page_size
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(W, H))
    margin = 50
    width = W - 2 * margin

    def header():
        c.setFont("Helvetica-Bold", 12)
        c.setFillColorRGB(0.06, 0.09, 0.16)
        c.drawString(margin, H - 60, "ANEXO / ANNEX")
        c.setFont("Helvetica", 8.5)
        c.drawString(margin, H - 74, "Información del formulario sin espacio en la plantilla / "
                                      "Form information with no space in the template")
        return H - 98

    y = header()
    for label, value in annex:
        lab_lines = _wrap(label, "Helvetica-Bold", 9, width, stringWidth)
        val_lines = _wrap(value, "Helvetica", 9, width - 10, stringWidth)
        need = (len(lab_lines) + len(val_lines)) * 11.5 + 10
        if y - need < 50:
            c.showPage()
            y = header()
        c.setFont("Helvetica-Bold", 9)
        for ln in lab_lines:
            c.drawString(margin, y, ln)
            y -= 11.5
        c.setFont("Helvetica", 9)
        for ln in val_lines:
            if y < 50:
                c.showPage()
                y = header()
                c.setFont("Helvetica", 9)
            c.drawString(margin + 10, y, ln)
            y -= 11.5
        y -= 8
    c.showPage()
    c.save()
    buf.seek(0)
    return buf


def _draw_x(c, H, rect):
    x0, top, x1, bottom = rect
    side = min(x1 - x0, bottom - top)
    cx, cy = (x0 + x1) / 2, (top + bottom) / 2
    inset = side * 0.2
    half = side / 2 - inset
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(max(0.8, side * 0.12))
    c.setLineCap(1)
    c.line(cx - half, H - (cy - half), cx + half, H - (cy + half))
    c.line(cx - half, H - (cy + half), cx + half, H - (cy - half))


def _is_checked(val, option_value):
    if isinstance(val, list):
        return option_value in val
    if isinstance(val, bool):
        return val and option_value in ("yes", "on", True)
    s = norm(val)
    if option_value == "yes":
        return s in ("yes", "si", "s", "true")
    if option_value == "no":
        return s in ("no", "n", "false")
    return s == norm(option_value) or str(val) == str(option_value)


def fill(pdf_path, schema, data, output_path, preview=False):
    from pypdf import PdfReader, PdfWriter, Transformation
    from pypdf.generic import NameObject, ArrayObject
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase.pdfmetrics import stringWidth

    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    fields = schema.get("fields", {})
    per_page = {}
    for key, f in fields.items():
        per_page.setdefault(int(f.get("page", 0)), []).append(f)
        for cp in f.get("copies", []) or []:
            per_page.setdefault(int(cp["page"]), []).append(dict(f, rect=cp["rect"], copies=None))

    annex = []
    first_size = None
    for pi, page in enumerate(reader.pages):
        mb = page.mediabox
        if first_size is None:
            first_size = (float(mb.width), float(mb.height))
        W, H = float(mb.width), float(mb.height)
        llx, lly = float(mb.left), float(mb.bottom)
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=(W, H))
        for f in per_page.get(pi, []):
            kind = f.get("kind")
            if f.get("acroName"):
                c.setStrokeColorRGB(0.35, 0.35, 0.4)
                c.setLineWidth(0.5)
                for o in f.get("options") or []:
                    r = o["rect"]
                    c.rect(r[0], H - r[3], r[2] - r[0], r[3] - r[1], stroke=1, fill=0)
                if f.get("rect") and kind == "checkbox":
                    r = f["rect"]
                    c.rect(r[0], H - r[3], r[2] - r[0], r[3] - r[1], stroke=1, fill=0)
                elif f.get("rect"):
                    r = f["rect"]
                    c.line(r[0], H - r[3], r[2], H - r[3])
            val = data.get(f["key"]) if isinstance(data, dict) else None
            if kind in ("yesno", "choice", "multi"):
                for o in f.get("options", []):
                    if preview or _is_checked(val, o["value"]):
                        _draw_x(c, H, o["rect"])
            elif kind == "checkbox":
                if preview or (val is True or norm(val) in ("yes", "si", "true", "on", "1", "x")):
                    _draw_x(c, H, f["rect"])
            elif kind == "signature":
                if f.get("rect") and (preview or val):
                    _draw_text(c, H, f["rect"], ("[" + f["label"][:40] + "]") if preview else _fmt_value(f, val),
                               stringWidth, False, min_size=6)
            else:
                text = f["label"] if preview else _fmt_value(f, val)
                if not text:
                    continue
                ri = f.get("requiredIf") or {}
                parent = fields.get(ri.get("key")) if ri else None
                annex_label = f"{parent['label']} — {f['label']}" if parent else f["label"]
                if not f.get("rect"):
                    if not preview:
                        annex.append((annex_label, text))
                    continue
                for cr in f.get("cover") or []:
                    c.setFillColorRGB(1, 1, 1)
                    c.rect(cr[0] - 1, H - cr[3] - 1, cr[2] - cr[0] + 2, cr[3] - cr[1] + 2, stroke=0, fill=1)
                if f.get("flow") and _draw_flow(c, H, f["rect"], f["flow"], text, stringWidth):
                    continue
                if not _draw_text(c, H, f["rect"], text, stringWidth, kind == "textarea"):
                    _draw_text(c, H, f["rect"], "(ver anexo / see annex)", stringWidth, False, min_size=5, max_size=7)
                    annex.append((annex_label, text))
        c.showPage()
        c.save()
        buf.seek(0)
        overlay = PdfReader(buf).pages[0]
        # Quitar los campos rellenables (el contenido queda dibujado)
        if "/Annots" in page:
            keep = ArrayObject()
            for a in page["/Annots"]:
                try:
                    if a.get_object().get("/Subtype") != "/Widget":
                        keep.append(a)
                except Exception:
                    keep.append(a)
            if len(keep):
                page[NameObject("/Annots")] = keep
            else:
                del page["/Annots"]
        page.merge_transformed_page(overlay, Transformation().translate(llx, lly))
        writer.add_page(page)
    if annex:
        for p in PdfReader(_annex_pages(annex, first_size or (595.28, 841.89), stringWidth)).pages:
            writer.add_page(p)
    if "/AcroForm" in writer._root_object:
        del writer._root_object["/AcroForm"]
    with open(output_path, "wb") as fh:
        writer.write(fh)


# ----------------------------------------------------------------------------- main

def main():
    raw = sys.stdin.buffer.read().decode("utf-8")
    req = json.loads(raw or "{}")
    cmd = req.get("cmd")
    try:
        if cmd == "analyze":
            schema = Analyzer(req["pdf_path"], req.get("known_labels")).run()
            out = {"ok": True, "schema": schema}
        elif cmd == "fill":
            fill(req["pdf_path"], req["schema"], req.get("data") or {}, req["output_path"], bool(req.get("preview")))
            out = {"ok": True}
        else:
            out = {"ok": False, "error": f"comando desconocido: {cmd}"}
    except Exception as e:  # noqa: BLE001
        import traceback
        out = {"ok": False, "error": str(e), "trace": traceback.format_exc()[-1500:]}
    sys.stdout.write(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
