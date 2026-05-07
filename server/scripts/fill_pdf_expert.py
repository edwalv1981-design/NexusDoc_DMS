import fitz
import sys
import json
import io
import unicodedata
import os
import statistics
import re
import math

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


def _as_rect(page, spec):
    """Convierte [x0,y0,x1,y1] o dict con esas claves en fitz.Rect acotado a la página."""
    if not spec:
        return None
    if isinstance(spec, (list, tuple)) and len(spec) >= 4:
        r = fitz.Rect(float(spec[0]), float(spec[1]), float(spec[2]), float(spec[3]))
    elif isinstance(spec, dict):
        r = fitz.Rect(
            float(spec["x0"]),
            float(spec["y0"]),
            float(spec["x1"]),
            float(spec["y1"]),
        )
    else:
        return None
    pr = page.rect
    return fitz.Rect(max(pr.x0, r.x0), max(pr.y0, r.y0), min(pr.x1, r.x1), min(pr.y1, r.y1))


def _whiteout_rects(page, rects):
    """Tapa zonas de plantilla duplicada en páginas de continuación (evita texto ‘fantasma’)."""
    for r in rects or []:
        try:
            rr = fitz.Rect(r)
            if rr.width < 8 or rr.height < 8:
                continue
            page.draw_rect(rr, color=(1, 1, 1), fill=(1, 1, 1), width=0)
        except Exception:
            continue


def _zone_rect_between_anchors(page, top_keywords, bottom_keywords, x0, x1, pad_top, pad_bottom):
    """Rectángulo vertical entre un título superior y un ancla inferior (oficiales, actividades, etc.)."""
    top_r = find_anchor_rect(page, top_keywords, min_y=0)
    if not top_r:
        return None
    y0 = float(top_r.y1) + float(pad_top)
    y1 = page.rect.height - 40
    for ph in bottom_keywords or []:
        for r in page.search_for(ph):
            if r.y0 > y0 + 30:
                y1 = min(y1, float(r.y0) - float(pad_bottom))
    if y1 <= y0 + 40:
        return None
    return fitz.Rect(max(page.rect.x0 + 20, x0), y0, min(page.rect.x1 - 20, x1), y1)


def measure_director_stack_height(fields, ROW_H, ROW_MULT, extra_top=0, extra_bottom=0):
    h = float(extra_top) + float(extra_bottom)
    for fk in fields:
        mult = float(ROW_MULT.get(fk, 1.0)) if isinstance(ROW_MULT, dict) else 1.0
        h += max(12.0, float(ROW_H) * mult)
    return h


def render_director_stacked_block(
    page,
    d,
    fields,
    ROW_H,
    ROW_MULT,
    X_PAD,
    row_width,
    x_left,
    y_start,
    print_heading=False,
    heading_label=None,
    heading_fontsize=8.5,
):
    """
    Apila los mismos campos que el bloque anclado a 'Director N', pero en coordenadas absolutas.
    Devuelve la Y final (borde inferior del bloque usado).
    """
    if not isinstance(d, dict):
        return y_start
    y_cur = float(y_start)
    if print_heading and heading_label is not None:
        try:
            page.insert_text(
                (x_left + 1, y_cur + 9),
                str(heading_label),
                fontsize=heading_fontsize,
                fontname="Helvetica-Bold",
            )
        except Exception:
            pass
        y_cur += float(heading_fontsize) + 6
    x_val = x_left + float(X_PAD)
    w = min(float(row_width), page.rect.width - x_val - 18)
    for fk in fields:
        val = d.get(fk)
        mult = float(ROW_MULT.get(fk, 1.0)) if isinstance(ROW_MULT, dict) else 1.0
        row_h = max(12.0, float(ROW_H) * mult)
        if val:
            rect = fitz.Rect(x_val, y_cur, x_val + w, y_cur + row_h - 1.2)
            fs = 7.2 if fk in ("address", "email") else 7.8
            insert_textbox_clipped(page, rect, val, fontsize=fs)
        y_cur += row_h
    return y_cur


def fill_directors_tail_height_paginated(
    doc,
    directors_tail,
    global_start_index,
    pdf_path,
    dir_section,
    fields,
    ROW_H,
    ROW_MULT,
    X_PAD,
    flow_cfg,
):
    """
    Directores a partir del índice global_start_index (1-based en plantilla: 5, 6, …).
    Pagina por altura del bloque de campos dentro de continuation_rect / página anexa.
    """
    if not directors_tail:
        return
    src_pdf = fitz.open(pdf_path)
    try:
        annex_ix = int(flow_cfg.get("continuation_annex_page_ix", flow_cfg.get("annex_page_ix", 0)))
        annex_ix = min(max(annex_ix, 0), len(src_pdf) - 1)
        gap = float(flow_cfg.get("block_gap") or 8)
        head_extra = float(flow_cfg.get("continuation_heading_dy") or 14) if flow_cfg.get("print_director_heading", True) else 0
        foot_extra = float(flow_cfg.get("block_bottom_pad") or 2)

        rect_spec = flow_cfg.get("continuation_rect") or flow_cfg.get("page_rect") or [45, 152, 555, 748]
        mask = flow_cfg.get("continuation_whiteout_rects") or []

        wide_w = float(dir_section.get("wide_row_width") or 420)

        per_block_h_static = measure_director_stack_height(
            fields, ROW_H, ROW_MULT, extra_top=head_extra, extra_bottom=foot_extra
        )

        pending = list(directors_tail)
        gidx = int(global_start_index)
        tmpl = flow_cfg.get("heading_template") or "Director {n}"

        while pending:
            doc.insert_pdf(src_pdf, from_page=annex_ix, to_page=annex_ix, start_at=len(doc))
            page = doc[-1]

            rr = _as_rect(page, rect_spec)
            if rr is None or rr.height < min(per_block_h_static, 80):
                rr = fitz.Rect(45, 152, float(page.rect.width) - 40, float(page.rect.height) - 36)

            _whiteout_rects(page, mask)

            y_cur = rr.y0
            placed_any = False

            while pending:
                need = per_block_h_static + (gap if placed_any else 0)
                if y_cur + need > rr.y1 - foot_extra:
                    break
                if placed_any:
                    y_cur += gap
                d = pending.pop(0)
                label = tmpl.replace("{n}", str(gidx))
                y_cur = render_director_stacked_block(
                    page,
                    d,
                    fields,
                    ROW_H,
                    ROW_MULT,
                    X_PAD,
                    wide_w,
                    x_left=rr.x0,
                    y_start=y_cur,
                    print_heading=bool(flow_cfg.get("print_director_heading", True)),
                    heading_label=label,
                )
                y_cur += foot_extra
                gidx += 1
                placed_any = True

            if pending and not placed_any:
                d = pending.pop(0)
                label = tmpl.replace("{n}", str(gidx))
                render_director_stacked_block(
                    page,
                    d,
                    fields,
                    ROW_H,
                    ROW_MULT,
                    X_PAD,
                    wide_w,
                    x_left=rr.x0,
                    y_start=rr.y0,
                    print_heading=bool(flow_cfg.get("print_director_heading", True)),
                    heading_label=label,
                )
                gidx += 1
    finally:
        src_pdf.close()


def shareholder_dynamic_row_height(s, sh_row_h, xs_addr, page_w, addr_fontsize=6.6, cap_h=86.0, min_h_extra=2.5):
    base = float(sh_row_h)
    addr = (s or {}).get("address")
    rw = float(page_w) - float(xs_addr) - 34
    if addr and rw > 35:
        t = str(addr).strip().replace("\n", " ")
        cpl = max(24.0, rw / max(3.8, addr_fontsize * 0.48))
        lines = max(1.0, math.ceil(len(t) / cpl))
        need = lines * addr_fontsize * 1.12 + min_h_extra
        return min(float(cap_h), max(base, need))
    return base


def render_shareholder_data_row(page, s, row_top, row_height, xs_map, defaults, addr_fontsize=6.6):
    """Una fila de accionista; row_height permite filas más altas cuando el domicilio es largo."""
    xs_cert, xs_val, xs_shares, xs_name, xs_addr = xs_map
    sh_row_h = defaults["base_h"]

    baseline = row_top + 2
    if not isinstance(s, dict):
        return
    if s.get("certificate"):
        insert_textbox_clipped(
            page,
            fitz.Rect(xs_cert - 8, row_top, xs_cert + 44, baseline + row_height - 2),
            str(s["certificate"]),
            fontsize=7,
        )
    if s.get("value"):
        insert_textbox_clipped(
            page,
            fitz.Rect(xs_val - 6, row_top, xs_val + 48, baseline + row_height - 2),
            str(s["value"]),
            fontsize=7,
        )
    if s.get("shares"):
        insert_textbox_clipped(
            page,
            fitz.Rect(xs_shares - 5, row_top, xs_shares + 54, baseline + row_height - 2),
            str(s["shares"]),
            fontsize=7,
        )
    if s.get("name"):
        insert_textbox_clipped(
            page,
            fitz.Rect(xs_name - 6, row_top, min(xs_addr - 14, xs_name + 180), baseline + row_height - 2),
            str(s["name"]),
            fontsize=7.6,
        )
    if s.get("address"):
        insert_textbox_clipped(
            page,
            fitz.Rect(xs_addr - 8, row_top, page.rect.width - 32, row_top + max(row_height, sh_row_h + 2)),
            str(s["address"]),
            fontsize=addr_fontsize,
        )


def fill_shareholders_height_paginated(
    doc,
    shareholders,
    pdf_path,
    officers_idx,
    page_f,
    y_sh_anchor,
    sh_section,
    xs_tuple,
):
    """
    Tabla de accionistas paginando por altura útil entre anclas verticalmente,
    manteniendo columnas congeladas. Filas pueden ser más altas si el domicilio es largo.
    xs_tuple = (xs_cert, xs_val, xs_shares, xs_name, xs_addr).
    """
    if not shareholders:
        return

    sh_row_h = float(sh_section.get("row_height") or 18.5)
    addr_font = float(sh_section.get("address_fontsize") or 6.6)
    row_gap = float(sh_section.get("flow_row_gap") or 1)
    pad_top = float(sh_section.get("first_data_row_dy") or 38)
    pad_bottom = float(sh_section.get("bottom_clip_margin") or 28)

    tops = ["Shareholders", "Accionistas", "Shareholder"]
    bottoms = (
        sh_section.get("bottom_stop_phrases")
        or ["Company Activities", "ACTIVITIES", "Please provide", "Name // Nombre", "Name / Nombre"]
    )

    wf = {"base_h": sh_row_h}

    flow = sh_section.get("flow_layout") or {}
    respect_caps = bool(flow.get("respect_legacy_row_caps", False))
    mx_first = int(sh_section.get("max_rows_first_page") or 10_000)
    mx_annex = int(sh_section.get("max_rows_annex_page") or 10_000)
    if not respect_caps:
        mx_first = mx_annex = 10_000

    rx = flow.get("region_abs")
    if rx:
        region = _as_rect(page_f, rx)
    else:
        x_margin_l = float(flow.get("x_margin_left") or 36)
        x_margin_r = float(flow.get("x_margin_right") or 36)
        region = _zone_rect_between_anchors(
            page_f,
            tops,
            bottoms,
            x0=float(page_f.rect.x0) + x_margin_l,
            x1=float(page_f.rect.x1) - x_margin_r,
            pad_top=pad_top,
            pad_bottom=pad_bottom + 40,
        )
    cap_addr = float(flow.get("address_cell_max_height") or sh_section.get("address_cell_cap") or 86)

    _cert, _val, _sh, _nm, ys_addr = xs_tuple

    def table_bottom(pg, reg):
        if reg is not None and reg.height > 50:
            return reg.y1
        y2 = float(pg.rect.height) - pad_bottom - 52
        for ph in bottoms:
            for r in pg.search_for(ph):
                cy = float(r.y0)
                if cy > float(y_sh_anchor) + pad_top * 0.5:
                    y2 = min(y2, cy - 12)
        return y2

    def row_h_for(pg, row):
        return shareholder_dynamic_row_height(
            row, sh_row_h, ys_addr, pg.rect.width - 28, addr_fontsize=addr_font, cap_h=cap_addr
        ) + row_gap

    y_start_p = float(y_sh_anchor) + pad_top if region is None else float(region.y0)
    bottom1 = table_bottom(page_f, region)
    pend = list(shareholders)
    y_cur = y_start_p
    drew_first = 0

    while pend and drew_first < mx_first:
        srow = pend[0]
        rh = row_h_for(page_f, srow)
        if y_cur + rh > bottom1:
            break
        render_shareholder_data_row(page_f, srow, y_cur, rh - row_gap, xs_tuple, wf, addr_fontsize=addr_font)
        y_cur += rh
        pend.pop(0)
        drew_first += 1

    if not pend:
        return

    src_pdf = fitz.open(pdf_path)
    try:
        raw_ix = flow.get("annex_page_ix")
        if raw_ix is None:
            annex_page_ix = min(max(int(officers_idx), 1), len(src_pdf) - 1)
        else:
            annex_page_ix = min(max(int(raw_ix), 0), len(src_pdf) - 1)

        while pend:
            doc.insert_pdf(src_pdf, from_page=annex_page_ix, to_page=annex_page_ix, start_at=len(doc))
            page_a = doc[-1]

            pad2 = pad_top if flow.get("annex_keep_first_dy", True) else float(flow.get("annex_first_dy") or pad_top)
            if flow.get("annex_region_abs"):
                reg_a = _as_rect(page_a, flow["annex_region_abs"])
            else:
                marg_l = float(flow.get("annex_x_margin_left") or flow.get("x_margin_left") or 36)
                marg_r = float(flow.get("annex_x_margin_right") or flow.get("x_margin_right") or 36)
                reg_a = _zone_rect_between_anchors(
                    page_a,
                    tops,
                    bottoms,
                    x0=float(page_a.rect.x0) + marg_l,
                    x1=float(page_a.rect.x1) - marg_r,
                    pad_top=pad2,
                    pad_bottom=pad_bottom + 26,
                )

            ys2 = float(find_anchor_y(page_a, tops) or y_sh_anchor)
            yc = float(reg_a.y0) if reg_a else (ys2 + pad2)
            bottom_a = table_bottom(page_a, reg_a)
            drew_annex = 0

            while pend and drew_annex < mx_annex:
                srow = pend[0]
                rh = row_h_for(page_a, srow)
                if yc + rh > bottom_a:
                    break
                render_shareholder_data_row(page_a, srow, yc, rh - row_gap, xs_tuple, wf, addr_fontsize=addr_font)
                yc += rh
                pend.pop(0)
                drew_annex += 1

            if drew_annex == 0 and pend:
                srow = pend.pop(0)
                rh = row_h_for(page_a, srow)
                render_shareholder_data_row(page_a, srow, yc, rh - row_gap, xs_tuple, wf, addr_fontsize=addr_font)
    finally:
        src_pdf.close()


def find_page_with_keywords(doc, keywords):
    lowered = [k.lower() for k in keywords]
    for i in range(len(doc)):
        blob = doc[i].get_text().lower()
        if any(k in blob for k in lowered):
            return i
    return len(doc) - 1


def format_cap_usd_plain(num_str):
    raw = str(num_str or "").strip()
    digits = re.sub(r"[^\d]", "", raw)
    if not digits:
        return raw, None
    try:
        n = int(digits)
    except ValueError:
        return raw, None
    return f"{n:,}".replace(",", "."), n


def fill_corp_name_by_choice_labels(page, value, labels, cfg):
    """Alinea el nombre con la misma línea que el texto '1st/2nd/3rd choice'."""
    if not value:
        return False
    gap = float(cfg.get("label_to_value_gap") or 14)
    base_align = float(cfg.get("baseline_align_dy") or 1.8)
    fs = float(cfg.get("company_name_fontsize") or 9)
    fontname = cfg.get("company_name_font") or "Helvetica"
    amin = float(cfg.get("choice_search_min_y") or 110)

    lab_rect = None
    for lab in labels:
        r = find_anchor_rect(page, [lab], min_y=amin)
        if r:
            lab_rect = r
            break
    if not lab_rect:
        return False
    x_val = lab_rect.x1 + gap
    x_min = float(cfg.get("value_x_min") or 0)
    if x_min > 0:
        x_val = max(x_val, x_min)
    baseline = (lab_rect.y0 + lab_rect.y1) / 2 + base_align
    max_w = float(cfg.get("company_name_max_width") or 320)
    rect = fitz.Rect(x_val, baseline - fs, x_val + max_w, baseline + 3)
    insert_text_scaled(page, rect, str(value).strip(), fontname=fontname, max_fontsize=fs, min_fontsize=fs - 1.5)
    return True


def fill_capital_authorized_field(page, cap_raw, cfg):
    """
    Casilla de capital autorizado (ej. 25.000) junto al mínimo 10.000.
    Evita x fijo al borde derecho; ancla en la fila del bloque de capital.
    """
    fmt, _ = format_cap_usd_plain(cap_raw)
    if not fmt:
        return
    text = f"{fmt} USD"
    head_re = find_anchor_rect(
        page,
        ["Authorized Capital /", "Authorized Capital", "Capital Social Autorizado", "Capital Social"],
        min_y=50,
    )
    if not head_re:
        y = float(cfg.get("capital_fallback_y") or 322)
        x = float(cfg.get("capital_user_x_fallback") or 430)
        page.insert_text((x, y), text, fontsize=9, fontname="Helvetica")
        return

    y_lo = head_re.y1 + float(cfg.get("capital_row_below_header") or 10)
    y_hi = head_re.y1 + float(cfg.get("capital_row_below_header_max") or 52)
    x_max = float(cfg.get("capital_line_x_max") or (page.rect.width - 36))

    ref_x1 = None
    ref_y = None
    for w in page.get_text("words"):
        cy = (w[1] + w[3]) / 2
        if not (y_lo <= cy <= y_hi):
            continue
        wt = (w[4] or "").strip()
        if not wt:
            continue
        wt_clean = wt.replace(" ", "")
        if re.match(r"^10[.,]?000\b", wt_clean) or wt_clean in ("10.000", "10,000", "10.000USD"):
            ref_x1 = max(ref_x1 or 0, w[2])
            ref_y = cy + 3.5
            continue
        digits_only = re.sub(r"[^\d]", "", wt)
        if digits_only == "10000":
            ref_x1 = max(ref_x1 or 0, w[2])
            ref_y = cy + 3.5
        if wt.upper() == "USD" and ref_y is None:
            ref_y = cy + 3.5

    pad = float(cfg.get("capital_after_minimum_gap") or 18)
    x_user = float(cfg.get("capital_user_x") or 0)
    if ref_x1 is not None:
        x_user = min(ref_x1 + pad, x_max - 85)
    elif x_user <= 0:
        x_user = float(cfg.get("capital_user_x_fallback") or 430)

    y_write = ref_y if ref_y is not None else (y_lo + (y_hi - y_lo) / 2 + 4)
    tw = fitz.get_text_length(text, fontname="Helvetica", fontsize=9)
    if x_user + tw > x_max:
        x_user = max(40, x_max - tw - 6)

    page.insert_text((x_user, y_write), text, fontsize=9, fontname="Helvetica")


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

    co = corp_cfg.get("company_section") or {}

    choice_bindings = [
        (
            "corpNameSA",
            [
                "1st choice",
                "1st Choice",
                "First choice",
                "1st  choice",
                "Primera opción",
                "Primera opcion",
            ],
        ),
        (
            "corpNameCorp",
            [
                "2nd choice",
                "2nd Choice",
                "Second choice",
                "2nd  choice",
                "Segunda opción",
                "Segunda opcion",
            ],
        ),
        (
            "corpNameInc",
            [
                "3rd choice",
                "3rd Choice",
                "Third choice",
                "3rd  choice",
                "Tercera opción",
                "Tercera opcion",
            ],
        ),
    ]
    y_fallback = find_anchor_y(page1, ["1st choice", "1st Choice"]) or 173
    step_fb = float(co.get("name_row_step_fallback") or 27.2)
    x_fb = float(co.get("value_x_fallback") or 220)
    dy_bl = float(co.get("fallback_baseline_dy") or -7.5)

    for i, (key, lbls) in enumerate(choice_bindings):
        val = data.get(key)
        if not val:
            continue
        if not fill_corp_name_by_choice_labels(page1, val, lbls, co):
            baseline = y_fallback + (i * step_fb) + dy_bl
            rect = fitz.Rect(
                x_fb,
                baseline - 10,
                x_fb + float(co.get("company_name_max_width") or 320),
                baseline + 4,
            )
            insert_text_scaled(
                page1,
                rect,
                str(val).strip(),
                fontname=co.get("company_name_font") or "Helvetica",
                max_fontsize=float(co.get("company_name_fontsize") or 9),
                min_fontsize=float(co.get("company_name_fontsize_min") or 7.5),
            )

    fill_capital_authorized_field(page1, data.get("capitalSocial"), co)

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

    dir_cont = dir_section.get("continuation_flow") or {}
    if len(directors) > 4:
        if bool(dir_cont.get("height_pagination", True)):
            fill_directors_tail_height_paginated(
                doc,
                directors[4:],
                5,
                pdf_path,
                dir_section,
                fields,
                ROW_H,
                ROW_MULT,
                X_PAD,
                dir_cont,
            )
        else:
            src_pdf = fitz.open(pdf_path)
            try:
                cs = 4
                while cs < len(directors):
                    insert_at = len(doc)
                    doc.insert_pdf(src_pdf, from_page=0, to_page=0, start_at=insert_at)
                    annex = doc[-1]
                    y_annex = (
                        find_anchor_y(annex, ["Director 1", "Directors /", "Directors", "Directores"])
                        or y_dir_fallback_base
                    )
                    annex_floor = max(
                        0,
                        (find_anchor_y(annex, ["Directors", "Directores:", "Directores"]) or y_annex) - 30,
                    )
                    for j in range(4):
                        di = cs + j
                        if di >= len(directors):
                            break
                        if not fill_director_label_block(annex, directors[di], j + 1, min_y_floor=annex_floor):
                            legacy_fill_director_slot(annex, j, directors[di], y_annex)
                    cs += 4
            finally:
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

    fill_shareholders_height_paginated(
        doc,
        shareholders,
        pdf_path,
        officers_idx,
        page_f,
        y_sh_anchor,
        sh_section,
        (xs_cert, xs_val, xs_shares, xs_name, xs_addr),
    )

    # PyMuPDF invalida referencias Page tras insert_pdf; reacquirir la página base.
    page_f = doc[officers_idx]

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
