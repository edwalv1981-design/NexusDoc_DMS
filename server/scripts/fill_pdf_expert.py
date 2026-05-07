import fitz
import sys
import json
import io
import unicodedata
import os

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

def find_anchor_y(page, text, min_y=0):
    insts = page.search_for(text)
    for inst in insts:
        if inst.y1 > min_y: return inst.y1
    return None

def fill_pdf_universal_engine(data, output_path, template_name, master_config, custom_template_path=None):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    pdf_path = custom_template_path if (custom_template_path and os.path.exists(custom_template_path)) else os.path.join(base_dir, "templates", "referencia_maestra.pdf")
    if not os.path.exists(pdf_path): raise Exception(f"No PDF at {pdf_path}")
    
    doc = fitz.open(pdf_path)

    # ══════════════════════════════════════════════════════════════════════════════
    # ██████  MOTOR CORPORACIÓN (RÉPLICA 100%) █████████████████████████████████████
    # ══════════════════════════════════════════════════════════════════════════════
    if template_name == "corporacion" or "corpNameSA" in data:
        directors = data.get("directors", [])
        shareholders = data.get("shareholders", [])
        dignitaries = data.get("dignitaries", {})

        page1 = doc[0]
        y_anchor = find_anchor_y(page1, "1st choice") or 173
        for i, key in enumerate(["corpNameSA", "corpNameCorp", "corpNameInc"]):
            val = data.get(key)
            if val:
                y_pos = y_anchor + (i * 27.5)
                rect = fitz.Rect(135, y_pos - 12, 410, y_pos + 2)
                insert_text_scaled(page1, rect, str(val), fontname="Helvetica-Bold", max_fontsize=10)

        y_cap = find_anchor_y(page1, "Authorized Capital") or 310
        cap_val = data.get("capitalSocial", "10,000.00")
        page1.insert_text((585, y_cap + 2), f"{cap_val} USD", fontsize=10, fontname="Helvetica-Bold")

        ROW_H = 19.45
        fields = ["firstName", "secondName", "lastName", "birthDate", "maritalStatus", "nationality", "passport", "phone", "email", "address", "city", "country"]
        
        def fill_director_block(page, d_idx, x_start, y_base, is_split=False):
            if d_idx >= len(directors): return
            d = directors[d_idx]
            if not is_split:
                for idx, f in enumerate(fields):
                    val = d.get(f)
                    if val:
                        rect = fitz.Rect(x_start, y_base + (idx * ROW_H) - 12, x_start + 125, y_base + (idx * ROW_H) + 2)
                        insert_text_scaled(page, rect, str(val))
            else:
                for idx, f in enumerate(fields[:9]):
                    val = d.get(f)
                    if val:
                        rect = fitz.Rect(185, y_base + (idx * ROW_H) - 12, 300, y_base + (idx * ROW_H) + 2)
                        insert_text_scaled(page, rect, str(val))
                for idx, f in enumerate(fields[9:]):
                    val = d.get(f)
                    if val:
                        y_off = 0 if idx == 0 else (27.5 if idx == 1 else 46.5)
                        rect = fitz.Rect(465, y_base + y_off - 12, 590, y_base + y_off + 10)
                        insert_text_scaled(page, rect, str(val))

        y_dir_start = find_anchor_y(page1, "Director 1") or 445
        fill_director_block(page1, 0, 185, y_dir_start)
        fill_director_block(page1, 1, 465, y_dir_start)
        y_dir3 = find_anchor_y(page1, "Director 3") or 775
        fill_director_block(page1, 2, 0, y_dir3, is_split=True)

        if len(directors) > 3:
            src_doc = fitz.open(pdf_path)
            for i in range(3, len(directors), 2):
                doc.insert_pdf(src_doc, from_page=0, to_page=0, start_at=len(doc)-1)
                new_p = doc[len(doc)-2]
                new_p.draw_rect(fitz.Rect(0, 0, 612, 430), color=(1,1,1), fill=(1,1,1))
                new_p.insert_text((50, 50), "ANEXO DE DIRECTORES (CONTINUACIÓN)", fontsize=14, fontname="Helvetica-Bold", color=(0.1, 0.4, 0.5))
                fill_director_block(new_p, i, 185, y_dir_start)
                if i+1 < len(directors): fill_director_block(new_p, i+1, 465, y_dir_start)
            if 'src_doc' in locals(): src_doc.close()

        pageF = doc[len(doc)-1]
        y_off = find_anchor_y(pageF, "President") or 118
        for i, role in enumerate(["presidente", "secretario", "tesorero"]):
            d = dignitaries.get(role, {})
            y_curr = y_off + (i * 24.5)
            if d.get("fullName"): pageF.insert_text((215, y_curr), str(d["fullName"]), fontsize=9)
            if d.get("birthDate"): pageF.insert_text((495, y_curr), str(d["birthDate"]), fontsize=8)
            if d.get("passport"): pageF.insert_text((620, y_curr), str(d["passport"]), fontsize=8)

        y_sh = find_anchor_y(pageF, "Shareholders") or 298
        for i, s in enumerate(shareholders[:4]):
            cy = y_sh + 35 + (i * 24.1)
            if s.get("certificate"): pageF.insert_text((45, cy), str(s["certificate"]), fontsize=8)
            if s.get("value"): pageF.insert_text((95, cy), str(s["value"]), fontsize=8)
            if s.get("shares"): pageF.insert_text((165, cy), str(s["shares"]), fontsize=8)
            if s.get("name"): pageF.insert_text((215, cy), str(s["name"]), fontsize=9)
            if s.get("address"): pageF.insert_text((415, cy), str(s["address"]), fontsize=7)

        y_decl = find_anchor_y(pageF, "Name // Nombre") or 850
        if data.get("declarationName"): pageF.insert_text((150, y_decl), str(data["declarationName"]), fontsize=11, fontname="Helvetica-Bold")
        y_date = find_anchor_y(pageF, "Date // Fecha") or 885
        if data.get("declarationDate"): pageF.insert_text((220, y_date), str(data["declarationDate"]), fontsize=11)

    # ══════════════════════════════════════════════════════════════════════════════
    # ██████  MOTOR FONDOS (SFAR) - RECTIFICACIÓN DINÁMICA █████████████████████████
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
        
        # Checkboxes SFAR
        f_d = normalize(str(data.get("fundsSource", [])))
        checks = {"bienes": (74.5, 376.3), "inversiones": (74.5, 387.8), "negocios": (74.5, 399.3), "prestamos": (74.5, 410.8), "herencia": (74.5, 422.3)}
        for k, pos in checks.items():
            if k in f_d: page1.insert_text(pos, "X", fontsize=8, fontname="Helvetica-Bold")
        
        # Dirección de Custodia (Radar Dinámico)
        if data.get("custodyAddress"):
            for w in page1.get_text("words"):
                if "Address:" in w[4] and w[1] > 700:
                    page1.insert_text((w[2] + 25, (w[1] + w[3]) / 2 + 4), str(data["custodyAddress"]), fontsize=10, fontname="Helvetica")
                    break

        # FIRMA SFAR - RECTIFICACIÓN RADAR (PÁGINA 2)
        if len(doc) > 1:
            page2 = doc[1]
            # Usamos búsqueda dinámica para el nombre y la fecha en SFAR
            y_name_sfar = find_anchor_y(page2, "Name // Nombre")
            if y_name_sfar and data.get("signerName"):
                page2.insert_text((150, y_name_sfar), str(data["signerName"]), fontsize=11, fontname="Helvetica")
            elif data.get("signerName"): # Fallback
                page2.insert_text((153, 735), str(data["signerName"]), fontsize=11, fontname="Helvetica")

            y_date_sfar = find_anchor_y(page2, "Date // Fecha")
            if y_date_sfar and data.get("date"):
                page2.insert_text((150, y_date_sfar), str(data["date"]), fontsize=11, fontname="Helvetica")
            elif data.get("date"): # Fallback
                page2.insert_text((139, 765), str(data["date"]), fontsize=11, fontname="Helvetica")

    doc.save(output_path, incremental=False, encryption=0)
    doc.close()

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        config_path = os.path.join(base_dir, "templates", "templates_config.json")
        master_conf = {}
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f: master_conf = json.load(f)
        fill_pdf_universal_engine(input_data.get("data", {}), input_data.get("output_path", "filled_temp.pdf"), input_data.get("template_name", "referencia_maestra"), master_conf, input_data.get("custom_template_path"))
        print(input_data.get("output_path", "filled_temp.pdf"))
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"ERROR_PY: {str(e)}", file=sys.stderr)
        sys.exit(1)
