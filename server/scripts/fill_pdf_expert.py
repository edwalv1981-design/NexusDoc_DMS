import fitz
import sys
import json
import io
import unicodedata
import os
import statistics

# Configuración de codificación para Windows
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf8')

def normalize(text):
    if not text: return ""
    return "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').lower()

def insert_text_scaled(page, rect, text, fontname="Helvetica", max_fontsize=9, min_fontsize=6, color=(0,0,0)):
    if not text: return
    text = str(text)
    fontsize = max_fontsize
    try:
        while fontsize > min_fontsize:
            tw = fitz.get_text_length(text, fontname=fontname, fontsize=fontsize)
            if tw <= rect.width: break
            fontsize -= 0.5
    except: fontsize = min_fontsize
    page.insert_text((rect.x0, rect.y1 - 3), text, fontsize=fontsize, fontname=fontname, color=color)


def insert_textbox_clipped(page, rect, text, fontsize=7.5, fontname="helv"):
    """Escribe dentro de rect con ajuste; evita texto encima del siguiente campo."""
    if not text:
        return
    if rect is None or rect.width < 30 or rect.height < 8:
        return
    txt = str(text).strip()
    if not txt:
        return
    try:
        page.insert_textbox(
            rect,
            txt,
            fontsize=fontsize,
            fontname=fontname,
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_LEFT,
        )
    except Exception:
        ff = max(5.5, fontsize - 1.5)
        page.insert_text((rect.x0, rect.y1 - 3), txt[:520], fontsize=ff, fontname="Helvetica")


def director_title_variants(n):
    ns = str(n)
    return [
        f"Director {ns}",
        f"DIRECTOR {ns}",
        f"Director  {ns}",
        f"Director No. {ns}",
        f"Director No {ns}",
        f"Director #{ns}",
        f"DIRECTOR  {ns}",
        f"DIRECTORA {ns}",
    ]

def find_anchor_y(page, keywords, min_y=0):
    """Búsqueda de anclas blindada: prueba múltiples variantes de texto."""
    if isinstance(keywords, str): keywords = [keywords]
    for kw in keywords:
        insts = page.search_for(kw)
        for inst in insts:
            if inst.y1 > min_y: return inst.y1
    return None


def find_anchor_rect(page, keywords, min_y=0):
    if isinstance(keywords, str):
        keywords = [keywords]
    best = None
    for kw in keywords:
        insts = page.search_for(kw)
        for inst in insts:
            if inst.y1 > min_y:
                if best is None or inst.y1 < best.y1:
                    best = inst
    return best


def median_x_for_synonyms(page, synonyms, y_min, y_max):
    """Mediana de X para palabras del encabezado que coinciden con cualquiera de los sinónimos."""
    xs = []
    syns = [s.lower() for s in synonyms]
    for w in page.get_text("words"):
        cy = (w[1] + w[3]) / 2
        if not (y_min <= cy <= y_max):
            continue
        wt = w[4].lower()
        if any(sub in wt for sub in syns):
            xs.append((w[0] + w[2]) / 2)
    return statistics.median(xs) if xs else None


def find_row_center_y_near(page, title_options, ymin, ymax):
    for w in page.get_text("words"):
        cy = (w[1] + w[3]) / 2
        if not (ymin <= cy <= ymax):
            continue
        wt = (w[4] or "").strip()
        wu = wt.upper()
        for opt in title_options:
            ou = opt.upper()
            if ou in wu or wu.startswith(ou):
                return cy + 2
    return None


def corporacion_officer_title_map():
    return {
        "presidente": ["PRESIDENT", "Presidente"],
        "secretario": ["SECRETARY", "Secretaria", "Secretario"],
        "tesorero": ["TREASURER", "Treasurer", "Tesorero", "Tesorer"],
    }


def find_officer_row_baseline(page, title_options, y_min, y_max, x_title_edge=118):
    """Una sola fila por cargo: match en la primera columna (título)."""
    opts = [t.upper() for t in title_options]
    for w in page.get_text("words"):
        cy = (w[1] + w[3]) / 2
        if not (y_min <= cy <= y_max):
            continue
        if w[0] > x_title_edge:
            continue
        raw = (w[4] or "").strip()
        if not raw:
            continue
        segment = raw.upper().split("/")[0].strip()
        for ou in opts:
            if segment.startswith(ou) or segment == ou:
                return (w[1] + w[3]) / 2 + 6
            if ou.startswith(segment) and len(segment) >= 4:
                return (w[1] + w[3]) / 2 + 6
    return None


def section_anchor_below_y(page, phrases, min_y_absolute):
    """Primer titulo encontrado por debajo de min_y_absolute (titulo mas alto en la zona)."""
    chosen = None
    for ph in phrases:
        for r in page.search_for(ph):
            if r.y0 >= float(min_y_absolute):
                if chosen is None or r.y0 < chosen.y0:
                    chosen = r
    return chosen


def bottom_page_anchor_rect(page, phrases, min_y_ratio=0.66):
    """Ancla en la parte inferior del folio (declaración): evita 'Nombre' en tablas superiores."""
    h = float(page.rect.height)
    ycut = h * float(min_y_ratio)
    chosen = None
    for ph in phrases:
        for r in page.search_for(ph):
            if r.y0 >= ycut - 35:
                if chosen is None or r.y0 > chosen.y0:
                    chosen = r
    return chosen


def load_corporacion_coords(root_dir):
    path = os.path.join(root_dir, "templates", "coordinate_registry.json")
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("corporacion_2025") or {}
    except Exception:
        return {}


def find_page_with_keywords(doc, keywords):
    lowered = [k.lower() for k in keywords]
    for i in range(len(doc)):
        blob = doc[i].get_text().lower()
        if any(k in blob for k in lowered):
            return i
    return len(doc) - 1


def fill_corporacion_engine(doc, data, pdf_path, root_dir):
    directors = list(data.get("directors") or [])
    shareholders = list(data.get("shareholders") or [])
    dignitaries = dict(data.get("dignitaries") or {})
    corp_cfg = load_corporacion_coords(root_dir)
    dir_section = corp_cfg.get("directors_section") or {}
    dig_section = corp_cfg.get("dignatarios_section") or {}
    sh_section = corp_cfg.get("shareholders_section") or {}

    fields = ["firstName", "secondName", "lastName", "birthDate", "maritalStatus", "nationality", "passport", "phone", "email", "address", "city", "country"]
    ROW_H = float(dir_section.get("row_height") or 17.8)
    X_PAD = float(dir_section.get("value_x_pad") or 105)
    FIRST_DY = float(dir_section.get("first_line_dy") or 15)
    ROW_MULT = dir_section.get("field_row_multiplier") or {
        "phone": 1.1,
        "email": 1.25,
        "address": 2.05,
    }

    page1 = doc[0]
    dir_section_min_y = (find_anchor_y(page1, ["Directors /", "Directors", "Directores:", "Directores"]) or 320) - 20

    y_anchor = find_anchor_y(page1, ["1st choice", "1st Choice", "primera opcion", "primera opción"]) or 173
    for i, key in enumerate(["corpNameSA", "corpNameCorp", "corpNameInc"]):
        val = data.get(key)
        if val:
            y_pos = y_anchor + (i * 27.5)
            rect = fitz.Rect(135, y_pos - 12, 410, y_pos + 2)
            insert_text_scaled(page1, rect, str(val), fontname="Helvetica-Bold", max_fontsize=10)

    y_cap = find_anchor_y(page1, ["Authorized Capital", "Capital Social"]) or 310
    cap_val = data.get("capitalSocial", "10,000.00")
    page1.insert_text((585, y_cap + 2), f"{cap_val} USD", fontsize=10, fontname="Helvetica-Bold")

    def fill_director_label_block(page, d, label_num, min_y_floor=0):
        """Ancla por título Director N y apila filas con altura variable (textbox) para evitar solapes."""
        if not isinstance(d, dict):
            return False
        anchor = None
        for v in director_title_variants(label_num):
            r = find_anchor_rect(page, [v], min_y=min_y_floor)
            if r:
                anchor = r
                break
        if not anchor:
            return False
        if label_num == 1:
            w = float(dir_section.get("wide_row_width") or 400)
        else:
            w = float(dir_section.get("narrow_row_width") or 248)
        w = min(w, page.rect.width - anchor.x0 - X_PAD - 22)
        y_cur = anchor.y1 + FIRST_DY
        x_val = anchor.x0 + X_PAD
        for fk in fields:
            val = d.get(fk)
            mult = float(ROW_MULT.get(fk, 1.0)) if isinstance(ROW_MULT, dict) else 1.0
            row_h = max(12.0, ROW_H * mult)
            if val:
                rect = fitz.Rect(x_val, y_cur, x_val + w, y_cur + row_h - 1.2)
                fs = 7.2 if fk in ("address", "email") else 7.8
                insert_textbox_clipped(page, rect, val, fontsize=fs)
            y_cur += row_h

        return True

    y_dir_fallback_base = find_anchor_y(page1, ["Directors /", "Directors", "Director 1", "Directores"]) or 430
    dy_mid = float(dir_section.get("legacy_row2_y") or 236)
    dy_bot = float(dir_section.get("legacy_row4_y") or 472)

    def legacy_fill_director_slot(page, slot_index, d, y_base_block):
        """Rejilla 1 / (2|3) / 4 cuando no hay texto 'Director N' en el PDF."""
        if not isinstance(d, dict):
            return
        layouts = [
            (135, y_base_block, 83, 448),
            (42, y_base_block + dy_mid, 83, 272),
            (312, y_base_block + dy_mid, 83, 272),
            (135, y_base_block + dy_bot, 83, 448),
        ]
        if slot_index >= len(layouts):
            return
        x0, y0, xpad, width = layouts[slot_index]
        y_cur = y0
        for fk in fields:
            val = d.get(fk)
            mult = float(ROW_MULT.get(fk, 1.0)) if isinstance(ROW_MULT, dict) else 1.0
            row_h = max(12.0, ROW_H * mult)
            if val:
                rect = fitz.Rect(x0 + xpad, y_cur, x0 + width, y_cur + row_h - 1.2)
                insert_textbox_clipped(page, rect, val, fontsize=7.2 if fk in ("address", "email") else 7.8)
            y_cur += row_h

    for idx in range(min(4, len(directors))):
        if not fill_director_label_block(page1, directors[idx], idx + 1, min_y_floor=max(0, dir_section_min_y)):
            legacy_fill_director_slot(page1, idx, directors[idx], y_dir_fallback_base)

    if len(directors) > 4:
        src_pdf = fitz.open(pdf_path)
        cs = 4
        while cs < len(directors):
            insert_at = len(doc) - 1
            doc.insert_pdf(src_pdf, from_page=0, to_page=0, start_at=insert_at)
            annex = doc[insert_at]
            y_annex = find_anchor_y(annex, ["Director 1", "Directors /", "Directors", "Directores"]) or y_dir_fallback_base
            annex_floor = max(0, (find_anchor_y(annex, ["Directors", "Directores:", "Directores"]) or y_annex) - 30)
            for j in range(4):
                di = cs + j
                if di >= len(directors):
                    break
                if not fill_director_label_block(annex, directors[di], j + 1, min_y_floor=annex_floor):
                    legacy_fill_director_slot(annex, j, directors[di], y_annex)
            cs += 4
        src_pdf.close()

    officers_idx = find_page_with_keywords(doc, ["Officers", "dignatarios", "DIGNATARIOS"])
    page_f = doc[officers_idx]
    ay = find_anchor_y(page_f, ["Officers /", "Officers", "dignatarios"]) or 90
    y_shareholders_top = find_anchor_y(page_f, ["Shareholders", "Accionistas"]) or (page_f.rect.height - 40)
    head_y0 = ay + float(dig_section.get("y_start_off") or 38)
    head_y1 = min(head_y0 + float(dig_section.get("header_depth") or 52), float(y_shareholders_top) - 22)

    col_name = median_x_for_synonyms(page_f, ["full name"], head_y0, head_y1) or median_x_for_synonyms(
        page_f, ["nombre"], head_y0, head_y1
    )
    col_birth = median_x_for_synonyms(page_f, ["date of birth", "fecha de nacimiento", "fecha nacimiento"], head_y0, head_y1)
    col_pass = median_x_for_synonyms(page_f, ["passport", "pasporte", "pasaporte"], head_y0, head_y1)
    col_reg = median_x_for_synonyms(page_f, ["registration number", "registro"], head_y0, head_y1)

    x_name = col_name or float(dig_section.get("x_name") or 215)
    x_birth = col_birth or float(dig_section.get("x_birth") or 395)
    x_pass = col_pass or float(dig_section.get("x_pass") or 518)
    x_reg = col_reg or float(dig_section.get("x_reg") or 635)

    step = float(dig_section.get("step") or 21.5)
    title_map = corporacion_officer_title_map()
    y_scan_lo = ay + float(dig_section.get("scan_y_min_pad") or 55)
    y_scan_hi = float(y_shareholders_top) - 28

    fallback_y = None
    seen_y = []

    def cell_rect(x_mid, yt, width, height=11):
        return fitz.Rect(x_mid - width / 2, yt - height / 3, x_mid + width / 2, yt + height * 2 / 3)

    cw_name = float(dig_section.get("cell_w_name") or 148)
    cw_rest = float(dig_section.get("cell_w_rest") or 92)

    for i, role in enumerate(["presidente", "secretario", "tesorero"]):
        d_row = dignitaries.get(role) or {}
        if not any(d_row.get(k) for k in ("fullName", "birthDate", "passport", "registrationNumber")):
            continue

        yt = find_officer_row_baseline(page_f, title_map.get(role, []), y_scan_lo, y_scan_hi)
        if yt is None:
            if fallback_y is None:
                row0_guess = find_officer_row_baseline(page_f, title_map.get("presidente", ["PRESIDENT", "Presidente"]), y_scan_lo, y_scan_hi)
                row0_guess = row0_guess or (find_anchor_y(page_f, ["President"]) or (ay + 72))
                fallback_y = row0_guess
            yt = fallback_y + (i * step)
        if any(abs(yt - ly) < 2 for ly in seen_y):
            yt = yt + step * (i + 1) * 0.15 + 8
        seen_y.append(yt)

        baseline = yt
        if d_row.get("fullName"):
            insert_textbox_clipped(page_f, cell_rect(x_name, baseline + 5, cw_name, 13), str(d_row["fullName"]), fontsize=7.5)
        if d_row.get("birthDate"):
            insert_textbox_clipped(page_f, cell_rect(x_birth, baseline + 5, cw_rest + 35, 12), str(d_row["birthDate"]), fontsize=7.3)
        if d_row.get("passport"):
            insert_textbox_clipped(page_f, cell_rect(x_pass, baseline + 5, cw_rest + 10, 12), str(d_row["passport"]), fontsize=7.3)
        if d_row.get("registrationNumber"):
            insert_textbox_clipped(page_f, cell_rect(x_reg, baseline + 5, cw_rest + 12, 12), str(d_row["registrationNumber"]), fontsize=7.2)

    sh_row_h = float(sh_section.get("row_height") or 18.5)
    fb = sh_section.get("column_x_fallback") or {}

    xs_cert = fb.get("certificate", 48)
    xs_val = fb.get("value", 102)
    xs_shares = fb.get("shares", 168)
    xs_name = fb.get("name", 232)
    xs_addr = fb.get("address", 400)

    y_sh_anchor = find_anchor_y(page_f, ["Shareholders", "Accionistas"]) or 298
    hdr_y0 = y_sh_anchor + 8
    hdr_y1 = y_sh_anchor + float(sh_section.get("header_band") or 52)

    hcert = median_x_for_synonyms(page_f, ["certificate", "cert.", "titulo", "share certificate"], hdr_y0, hdr_y1)
    hval = median_x_for_synonyms(page_f, ["value", "valor", "par value"], hdr_y0, hdr_y1)
    hsh = median_x_for_synonyms(page_f, ["shares", "acciones", "number"], hdr_y0, hdr_y1)
    hnam = median_x_for_synonyms(page_f, ["shareholder", "accionista"], hdr_y0, hdr_y1)
    haddr = median_x_for_synonyms(page_f, ["address", "domicilio", "dirección", "direccion"], hdr_y0, hdr_y1)

    if hcert:
        xs_cert = hcert
    if hval:
        xs_val = hval
    if hsh:
        xs_shares = hsh
    if hnam:
        xs_name = hnam
    if haddr:
        xs_addr = haddr

    first_dy = float(sh_section.get("first_data_row_dy") or 38)
    max_rows = int(sh_section.get("max_rows_first_page") or 14)
    base_y = y_sh_anchor + first_dy

    page_block = shareholders[:max_rows]
    overflow_sh = shareholders[max_rows:]

    addr_h = float(sh_section.get("address_row_frac") or 1.85) * sh_row_h

    for ri, s in enumerate(page_block):
        row_top = base_y + ri * sh_row_h
        baseline = row_top + 2
        if s.get("certificate"):
            insert_textbox_clipped(page_f, fitz.Rect(xs_cert - 8, row_top, xs_cert + 44, baseline + sh_row_h - 2), str(s["certificate"]), fontsize=7)
        if s.get("value"):
            insert_textbox_clipped(page_f, fitz.Rect(xs_val - 6, row_top, xs_val + 48, baseline + sh_row_h - 2), str(s["value"]), fontsize=7)
        if s.get("shares"):
            insert_textbox_clipped(page_f, fitz.Rect(xs_shares - 5, row_top, xs_shares + 54, baseline + sh_row_h - 2), str(s["shares"]), fontsize=7)
        if s.get("name"):
            insert_textbox_clipped(page_f, fitz.Rect(xs_name - 6, row_top, min(xs_addr - 14, xs_name + 180), baseline + sh_row_h - 2), str(s["name"]), fontsize=7.6)
        if s.get("address"):
            insert_textbox_clipped(
                page_f,
                fitz.Rect(xs_addr - 8, row_top, page_f.rect.width - 32, row_top + max(addr_h, sh_row_h + 2)),
                str(s["address"]),
                fontsize=6.6,
            )

    if overflow_sh:
        src_pdf2 = fitz.open(pdf_path)
        annex_page_ix = min(max(officers_idx, 1), len(src_pdf2) - 1)
        max_annex_rows = int(sh_section.get("max_rows_annex_page") or 18)
        remaining = list(overflow_sh)
        while remaining:
            ins = len(doc) - 1
            doc.insert_pdf(src_pdf2, from_page=annex_page_ix, to_page=annex_page_ix, start_at=ins)
            annex_sh = doc[ins]
            y2 = find_anchor_y(annex_sh, ["Shareholders", "Accionistas"]) or 298
            b2 = y2 + first_dy
            chunk = remaining[:max_annex_rows]
            remaining = remaining[max_annex_rows:]
            for j, s in enumerate(chunk):
                row_top = b2 + j * sh_row_h
                baseline = row_top + 2
                if s.get("certificate"):
                    insert_textbox_clipped(annex_sh, fitz.Rect(xs_cert - 8, row_top, xs_cert + 44, baseline + sh_row_h - 2), str(s["certificate"]), fontsize=7)
                if s.get("value"):
                    insert_textbox_clipped(annex_sh, fitz.Rect(xs_val - 6, row_top, xs_val + 48, baseline + sh_row_h - 2), str(s["value"]), fontsize=7)
                if s.get("shares"):
                    insert_textbox_clipped(annex_sh, fitz.Rect(xs_shares - 5, row_top, xs_shares + 54, baseline + sh_row_h - 2), str(s["shares"]), fontsize=7)
                if s.get("name"):
                    insert_textbox_clipped(annex_sh, fitz.Rect(xs_name - 6, row_top, min(xs_addr - 14, xs_name + 180), baseline + sh_row_h - 2), str(s["name"]), fontsize=7.6)
                if s.get("address"):
                    insert_textbox_clipped(
                        annex_sh,
                        fitz.Rect(xs_addr - 8, row_top, annex_sh.rect.width - 32, row_top + max(addr_h, sh_row_h + 2)),
                        str(s["address"]),
                        fontsize=6.6,
                    )
        src_pdf2.close()

    act = data.get("companyActivities")
    if act:
        act_ymin = max(248.0, float(ay) + float(sh_section.get("activities_anchor_min_below_officers") or 120))
        r_title = section_anchor_below_y(
            page_f, ["Company Activities /", "Company Activities", "ACTIVITIES"], act_ymin
        )
        if not r_title:
            r_title = section_anchor_below_y(
                page_f, ["Actividades de la Compañía", "Actividades de la compañía"], act_ymin
            )
        y_please = find_anchor_y(page_f, ["Please provide", "provide an explanation", "favor proporcione"], min_y=act_ymin)
        box_y0 = float(r_title.y1) + 12 if r_title else (float(y_sh_anchor) - 130)
        if y_please and y_please > box_y0 - 52:
            box_y0 = max(box_y0, y_please + 9)
        box_h = float(sh_section.get("activities_box_height") or 100)
        if r_title or box_y0 > 400:
            box = fitz.Rect(46, box_y0, page_f.rect.width - 42, box_y0 + box_h)
            insert_textbox_clipped(page_f, box, str(act), fontsize=7.9, fontname="helv")

    r_nom = bottom_page_anchor_rect(page_f, ["Name // Nombre", "Name / Nombre"], min_y_ratio=0.62)
    r_fec = bottom_page_anchor_rect(page_f, ["Date // Fecha", "Date / Fecha"], min_y_ratio=0.62)
    nm = data.get("declarationName")
    dt = data.get("declarationDate")
    dig_f = corp_cfg.get("declaration_section") or {}

    def decl_rect_from_anchor(ac, widen=320, h=17):
        if not ac:
            return None
        x0 = max(42, float(ac.x0))
        x1 = min(page_f.rect.width - 42, x0 + widen)
        y0 = float(ac.y1) + float(dig_f.get("name_dy") or 2)
        return fitz.Rect(x0, y0, x1, y0 + h)

    if nm:
        bx = decl_rect_from_anchor(r_nom)
        if bx:
            insert_textbox_clipped(page_f, bx, str(nm), fontsize=11, fontname="helv")
        else:
            yd = float(dig_f.get("fallback_name_y") or (page_f.rect.height * 0.86))
            page_f.insert_text((float(dig_f.get("fallback_name_x") or 52), yd), str(nm), fontsize=11, fontname="Helvetica-Bold")
    if dt:
        bx_d = decl_rect_from_anchor(r_fec, widen=float(dig_f.get("date_w") or 190), h=16)
        if bx_d:
            insert_textbox_clipped(page_f, bx_d, str(dt), fontsize=10)
        else:
            y_dt = float(dig_f.get("fallback_date_y") or (page_f.rect.height * 0.893))
            page_f.insert_text((float(dig_f.get("fallback_date_x") or 180), y_dt), str(dt), fontsize=11)

def fill_pdf_universal_engine(data, output_path, template_name, master_config, custom_template_path=None):
    # RESOLUCIÓN DE RUTAS ROBUSTA (Blindaje contra entornos)
    current_dir = os.path.dirname(os.path.abspath(__file__)) # server/scripts
    server_dir = os.path.dirname(current_dir) # server
    root_dir = os.path.dirname(server_dir) # raíz
    
    # Prioridad de plantilla
    pdf_path = None
    if custom_template_path and os.path.exists(custom_template_path):
        pdf_path = custom_template_path
    else:
        # Intentar buscar en templates/ de la raíz
        path_options = [
            os.path.join(root_dir, "templates", "corporacion.pdf") if "corp" in template_name.lower() else None,
            os.path.join(root_dir, "templates", "referencia_maestra.pdf")
        ]
        for p in path_options:
            if p and os.path.exists(p):
                pdf_path = p
                break
    
    if not pdf_path or not os.path.exists(pdf_path):
        # Último recurso: intentar en la carpeta del script (por si acaso)
        fallback = os.path.join(current_dir, "referencia_maestra.pdf")
        if os.path.exists(fallback): pdf_path = fallback
        else: raise Exception(f"No se encontró plantilla PDF. Buscado en: {root_dir}/templates/")
    
    doc = fitz.open(pdf_path)

    # ══════════════════════════════════════════════════════════════════════════════
    # ██████  MOTOR CORPORACIÓN (anclas + columnas dinámicas) ██████████████████████
    # ══════════════════════════════════════════════════════════════════════════════
    if template_name == "corporacion" or "corpNameSA" in data:
        fill_corporacion_engine(doc, data, pdf_path, root_dir)

    # ══════════════════════════════════════════════════════════════════════════════
    # ██████  MOTOR FONDOS (SFAR) - BLINDADO ███████████████████████████████████████
    # ══════════════════════════════════════════════════════════════════════════════
    else:
        page1 = doc[0]
        words = page1.get_text("words")
        config = master_config.get(template_name, master_config["referencia_maestra"])
        for entry in config.get("anchors", []):
            if entry["data_key"] in data and data[entry["data_key"]]:
                for w in words:
                    if normalize(entry["keywords"][0]) in normalize(w[4]):
                        yc = (w[1] + w[3]) / 2 + 3
                        if entry["min_y"] <= yc <= entry["max_y"]:
                            xv = config.get(entry["x_key"], 300) if isinstance(entry["x_key"], str) else entry["x_key"]
                            page1.insert_text((xv, yc), str(data[entry["data_key"]]), fontsize=10, fontname="Helvetica")
                            break
        
        f_d = normalize(str(data.get("fundsSource", [])))
        checks = {"bienes": (74.5, 376.3), "inversiones": (74.5, 387.8), "negocios": (74.5, 399.3), "prestamos": (74.5, 410.8), "herencia": (74.5, 422.3)}
        for k, pos in checks.items():
            if k in f_d: page1.insert_text(pos, "X", fontsize=8, fontname="Helvetica-Bold")
        
        if data.get("custodyAddress"):
            for w in page1.get_text("words"):
                if "Address:" in w[4] and w[1] > 700:
                    page1.insert_text((w[2] + 25, (w[1] + w[3]) / 2 + 4), str(data["custodyAddress"]), fontsize=10, fontname="Helvetica")
                    break

        if len(doc) > 1:
            page2 = doc[1]
            y_name_sfar = find_anchor_y(page2, ["Name // Nombre", "Name / Nombre", "Name"])
            if y_name_sfar and data.get("signerName"):
                page2.insert_text((150, y_name_sfar - 3), str(data["signerName"]), fontsize=11, fontname="Helvetica")
            elif data.get("signerName"):
                page2.insert_text((153, 732), str(data["signerName"]), fontsize=11, fontname="Helvetica")

            y_date_sfar = find_anchor_y(page2, ["Date // Fecha", "Date / Fecha", "Date"])
            if y_date_sfar and data.get("date"):
                page2.insert_text((150, y_date_sfar - 3), str(data["date"]), fontsize=11, fontname="Helvetica")
            elif data.get("date"):
                page2.insert_text((139, 762), str(data["date"]), fontsize=11, fontname="Helvetica")

    doc.save(output_path, incremental=False, encryption=0)
    doc.close()

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print("ERROR_PY: No input data received", file=sys.stderr)
            sys.exit(1)

        input_data = json.loads(raw_input)
        data = input_data.get("data", {})
        output_path = input_data.get("output_path", "filled_temp.pdf")
        template_name = input_data.get("template_name", "referencia_maestra")
        custom_path = input_data.get("custom_template_path")

        # Cargar config de templates (Resolución de ruta blindada)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(os.path.dirname(current_dir))
        config_path = os.path.join(root_dir, "templates", "templates_config.json")
        
        master_conf = {}
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                master_conf = json.load(f)

        fill_pdf_universal_engine(data, output_path, template_name, master_conf, custom_path)
        print(output_path)
    except Exception as e:
        import traceback
        print(f"ERROR_PY: {str(e)}\n{traceback.format_exc()}", file=sys.stderr)
        sys.exit(1)
