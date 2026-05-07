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

    page1 = doc[0]

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

    def fill_director_label_block(page, d, label_num):
        """Rellena un bloque buscando el título literal Director {label_num} en la página."""
        if not isinstance(d, dict):
            return False
        variants = [f"Director {label_num}", f"DIRECTOR {label_num}"]
        anchor = None
        for v in variants:
            r = find_anchor_rect(page, [v])
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
        y0 = anchor.y1 + FIRST_DY
        for idx, fk in enumerate(fields):
            val = d.get(fk)
            if not val:
                continue
            yt = y0 + (idx * ROW_H)
            rect = fitz.Rect(anchor.x0 + X_PAD, yt - 9, anchor.x0 + X_PAD + w, yt + 7)
            insert_text_scaled(page, rect, str(val), fontname="Helvetica", max_fontsize=8, min_fontsize=5.5)

        return True

    y_dir_fallback_base = find_anchor_y(page1, ["Directors /", "Directors", "Director 1"]) or 430

    def legacy_fill_director_slot(page, slot_index, d, y_base_block):
        """Layout fijo 1 / (2|3) / 4 si el PDF no trae texto 'Director N' localizable."""
        if not isinstance(d, dict):
            return
        layouts = [
            (135, y_base_block, 83, 448),
            (42, y_base_block + 228, 83, 272),
            (312, y_base_block + 228, 83, 272),
            (135, y_base_block + 458, 83, 448),
        ]
        if slot_index >= len(layouts):
            return
        x0, y0, xpad, width = layouts[slot_index]
        for idx, fk in enumerate(fields):
            val = d.get(fk)
            if not val:
                continue
            yt = y0 + idx * ROW_H
            rect = fitz.Rect(x0 + xpad, yt - 10, x0 + width, yt + 6)
            insert_text_scaled(page, rect, str(val), fontname="Helvetica", max_fontsize=8, min_fontsize=5.5)

    for idx in range(min(4, len(directors))):
        if not fill_director_label_block(page1, directors[idx], idx + 1):
            legacy_fill_director_slot(page1, idx, directors[idx], y_dir_fallback_base)

    if len(directors) > 4:
        src_pdf = fitz.open(pdf_path)
        cs = 4
        while cs < len(directors):
            insert_at = len(doc) - 1
            doc.insert_pdf(src_pdf, from_page=0, to_page=0, start_at=insert_at)
            annex = doc[insert_at]
            y_annex = find_anchor_y(annex, ["Director 1", "Directors /", "Directors"]) or y_dir_fallback_base
            for j in range(4):
                di = cs + j
                if di >= len(directors):
                    break
                if not fill_director_label_block(annex, directors[di], j + 1):
                    legacy_fill_director_slot(annex, j, directors[di], y_annex)
            cs += 4
        src_pdf.close()

    officers_idx = find_page_with_keywords(doc, ["Officers", "dignatarios", "DIGNATARIOS"])
    page_f = doc[officers_idx]
    ay = find_anchor_y(page_f, ["Officers /", "Officers", "dignatarios"]) or 90
    head_y0 = ay + float(dig_section.get("y_start_off") or 38)
    head_y1 = head_y0 + 55

    col_name = median_x_for_synonyms(page_f, ["full name", "nombre", "fullname"], head_y0, head_y1)
    col_birth = median_x_for_synonyms(page_f, ["date of birth", "birth", "nacimiento", "fecha de nacimiento"], head_y0, head_y1)
    col_pass = median_x_for_synonyms(page_f, ["passport", "pasaport", "pasaporte"], head_y0, head_y1)
    col_reg = median_x_for_synonyms(page_f, ["registration number", "registration", "registro"], head_y0, head_y1)

    x_name = col_name or float(dig_section.get("x_name") or 215)
    x_birth = col_birth or float(dig_section.get("x_birth") or 395)
    x_pass = col_pass or float(dig_section.get("x_pass") or 518)
    x_reg = col_reg or float(dig_section.get("x_reg") or 635)

    step = float(dig_section.get("step") or 21.5)
    title_map = corporacion_officer_title_map()
    y_scan_lo = ay + float(dig_section.get("scan_y_min_pad") or 55)
    y_scan_hi = ay + float(dig_section.get("scan_y_max_pad") or 220)

    fallback_y = None
    for i, role in enumerate(["presidente", "secretario", "tesorero"]):
        d_row = dignitaries.get(role) or {}
        if not any(d_row.get(k) for k in ("fullName", "birthDate", "passport", "registrationNumber")):
            continue

        yt = find_row_center_y_near(page_f, title_map.get(role, []), y_scan_lo, y_scan_hi)
        if yt is None:
            if fallback_y is None:
                row0 = find_anchor_y(page_f, ["President"]) or (ay + 70)
                fallback_y = row0
            yt = fallback_y + (i * step)

        baseline = yt + 2
        if d_row.get("fullName"):
            page_f.insert_text((x_name, baseline), str(d_row["fullName"]), fontsize=8)
        if d_row.get("birthDate"):
            page_f.insert_text((x_birth, baseline), str(d_row["birthDate"]), fontsize=8)
        if d_row.get("passport"):
            page_f.insert_text((x_pass, baseline), str(d_row["passport"]), fontsize=8)
        if d_row.get("registrationNumber"):
            page_f.insert_text((x_reg, baseline), str(d_row["registrationNumber"]), fontsize=8)

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

    for ri, s in enumerate(page_block):
        baseline = base_y + ri * sh_row_h + 2
        if s.get("certificate"):
            page_f.insert_text((xs_cert, baseline), str(s["certificate"]), fontsize=7)
        if s.get("value"):
            page_f.insert_text((xs_val, baseline), str(s["value"]), fontsize=7)
        if s.get("shares"):
            page_f.insert_text((xs_shares, baseline), str(s["shares"]), fontsize=7)
        if s.get("name"):
            page_f.insert_text((xs_name, baseline), str(s["name"]), fontsize=8)
        if s.get("address"):
            page_f.insert_text((xs_addr, baseline), str(s["address"]), fontsize=6.5)

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
                baseline = b2 + j * sh_row_h + 2
                if s.get("certificate"):
                    annex_sh.insert_text((xs_cert, baseline), str(s["certificate"]), fontsize=7)
                if s.get("value"):
                    annex_sh.insert_text((xs_val, baseline), str(s["value"]), fontsize=7)
                if s.get("shares"):
                    annex_sh.insert_text((xs_shares, baseline), str(s["shares"]), fontsize=7)
                if s.get("name"):
                    annex_sh.insert_text((xs_name, baseline), str(s["name"]), fontsize=8)
                if s.get("address"):
                    annex_sh.insert_text((xs_addr, baseline), str(s["address"]), fontsize=6.5)
        src_pdf2.close()

    act = data.get("companyActivities")
    if act:
        hits = page_f.search_for("Company Activities")
        if not hits:
            hits = page_f.search_for("Actividades de la Compañía")
        if not hits:
            hits = page_f.search_for("Actividades")
        if hits:
            r0 = hits[0]
            box = fitz.Rect(r0.x0 - 5, r0.y1 + 5, page_f.rect.width - 36, r0.y1 + 118)
            try:
                page_f.insert_textbox(box, str(act), fontsize=8, align=fitz.TEXT_ALIGN_LEFT, color=(0, 0, 0))
            except Exception:
                insert_text_scaled(page_f, fitz.Rect(box.x0, box.y0, box.x1, box.y0 + 12), str(act), max_fontsize=8)

    y_decl = find_anchor_y(page_f, ["Name // Nombre", "Name / Nombre"]) or (
        find_anchor_y(page_f, ["Name"]) or 785
    )
    if data.get("declarationName"):
        page_f.insert_text((150, max(y_decl, 740) + 2), str(data["declarationName"]), fontsize=11, fontname="Helvetica-Bold")
    y_date_anchor = find_anchor_y(page_f, ["Date // Fecha", "Date / Fecha"]) or (find_anchor_y(page_f, ["Date"]) or 815)
    if data.get("declarationDate"):
        page_f.insert_text((230, max(y_date_anchor, 775) + 2), str(data["declarationDate"]), fontsize=11)

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
