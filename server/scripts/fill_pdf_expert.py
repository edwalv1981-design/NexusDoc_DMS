import fitz
import sys
import json
import io
import unicodedata
import os

# Forzamos a Python a usar UTF-8
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf8')

def fill_pdf_universal_engine(data, output_path, template_name, custom_template_path=None):
    # RUTAS RELATIVAS PARA PORTABILIDAD
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    config_path = os.path.join(base_dir, "templates", "templates_config.json")
    
    if not os.path.exists(config_path):
        raise Exception(f"Config file not found at {config_path}")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        master_config = json.load(f)
    
    if template_name not in master_config:
        template_name = "referencia_maestra"
    
    config = master_config[template_name]
    
    # Ruta del PDF base
    if custom_template_path and os.path.exists(custom_template_path):
        pdf_path = custom_template_path
    else:
        pdf_path = os.path.join(base_dir, "templates", os.path.basename(config["file_path"]))
    
    # Abrir PDF y cargar datos
    doc = fitz.open(pdf_path)
    page1 = doc[0]
    words = page1.get_text("words") 

    def normalize(text):
        return "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').lower()

    def find_y_by_keywords(keywords, min_y=0, max_y=1000):
        for w in words:
            word_norm = normalize(w[4])
            for kw in keywords:
                if normalize(kw) in word_norm:
                    y_center = (w[1] + w[3]) / 2 + 3
                    if min_y <= y_center <= max_y:
                        return y_center
        return None

    page1 = doc[0]
    
    # === MODO CORPORACIÓN ===    if template_name == "corporacion" or "corpNameSA" in data:
        def find_y_advanced(page, keywords, min_x=0, max_x=1000, min_y=0, max_y=1000):
            p_words = page.get_text("words")
            for w in p_words:
                if min_x <= w[0] <= max_x and min_y <= w[1] <= max_y:
                    word_norm = normalize(w[4])
                    for kw in keywords:
                        if normalize(kw) in word_norm:
                            return w[3] + 4
            return None

        directors = data.get("directors", [])
        
        def fill_dir_dynamic(d, page, x_val, min_x, max_x, min_y, max_y):
            mapping = [
                ("firstName", ["first"]), ("secondName", ["middle"]), ("lastName", ["surname"]),
                ("birthDate", ["birth"]), ("maritalStatus", ["marital"]), ("nationality", ["citizenship"]),
                ("passport", ["passport"]), ("phone", ["phone", "tel"]), ("email", ["email"]),
                ("address", ["address"]), ("city", ["city", "ciudad"]), ("country", ["country", "pais"])
            ]
            for key, kws in mapping:
                if d.get(key):
                    y = find_y_advanced(page, kws, min_x, max_x, min_y, max_y)
                    if y: page.insert_text((x_val, y), str(d[key])[:35], fontsize=8, fontname="helv")

        def process_directors_page(page, d_chunk, p_idx):
            if p_idx > 1:
                page.draw_rect(fitz.Rect(40, 40, 560, 250), color=(1,1,1), fill=(1,1,1))
                page.insert_text((50, 100), f"CONTINUACION DIRECTORES (PAG {p_idx})", fontsize=12, fontname="hebo", color=(0.29, 0.64, 0.77))
                def rename_dir(x, y, text):
                    page.draw_rect(fitz.Rect(x-20, y-10, x+60, y+5), color=(1,1,1), fill=(1,1,1))
                    page.insert_text((x, y), text, fontsize=9, fontname="hebo")
                if len(d_chunk) > 0: rename_dir(140, 276, f"Director {(p_idx-1)*3 + 1}")
                if len(d_chunk) > 1: rename_dir(420, 276, f"Director {(p_idx-1)*3 + 2}")
                if len(d_chunk) > 2: rename_dir(275, 608, f"Director {(p_idx-1)*3 + 3}")

            if len(d_chunk) > 0: fill_dir_dynamic(d_chunk[0], page, 150, 0, 250, 300, 650)
            if len(d_chunk) > 1: fill_dir_dynamic(d_chunk[1], page, 430, 260, 550, 300, 650)
            if len(d_chunk) > 2: 
                d = d_chunk[2]
                fill_dir_dynamic(d, page, 150, 0, 250, 650, 950)
                for k, kws in [("address", ["address"]), ("city", ["city", "ciudad"]), ("country", ["country", "pais"])]:
                    if d.get(k):
                        y = find_y_advanced(page, kws, 260, 550, 650, 950)
                        if y: page.insert_text((430, y), str(d[k])[:35], fontsize=8, fontname="helv")

        y_sa = find_y_advanced(page1, ["1st"], min_y=100, max_y=300)
        if y_sa and data.get("corpNameSA"): page1.insert_text((230, y_sa), str(data["corpNameSA"]), fontsize=9, fontname="helv")
        y_corp = find_y_advanced(page1, ["2nd"], min_y=100, max_y=300)
        if y_corp and data.get("corpNameCorp"): page1.insert_text((230, y_corp), str(data["corpNameCorp"]), fontsize=9, fontname="helv")
        y_inc = find_y_advanced(page1, ["3rd"], min_y=100, max_y=300)
        if y_inc and data.get("corpNameInc"): page1.insert_text((230, y_inc), str(data["corpNameInc"]), fontsize=9, fontname="helv")
        y_cap = find_y_advanced(page1, ["authorized", "autorizado"], min_y=200, max_y=350)
        if y_cap and data.get("capitalSocial"): page1.insert_text((280, y_cap), str(data["capitalSocial"]), fontsize=9, fontname="helv")

        process_directors_page(page1, directors[:3], 1)
        
        pages_added = 0
        src_doc = None
        shareholders = data.get("shareholders", [])
        if len(directors) > 3 or len(shareholders) > 3:
            src_doc = fitz.open(custom_template_path if custom_template_path else "templates/referencia_maestra.pdf")
        
        for i in range(3, len(directors), 3):
            pages_added += 1
            doc.insert_pdf(src_doc, from_page=0, to_page=0, start_at=pages_added)
            process_directors_page(doc[pages_added], directors[i:i+3], pages_added + 1)

        orig_p2_idx = 1 + pages_added
        if len(doc) > orig_p2_idx:
            page2 = doc[orig_p2_idx]
            
            def process_shareholders_page(page, sh_chunk, p_idx):
                if p_idx > 1:
                    page.draw_rect(fitz.Rect(40, 100, 560, 250), color=(1,1,1), fill=(1,1,1))
                    page.draw_rect(fitz.Rect(40, 420, 560, 900), color=(1,1,1), fill=(1,1,1))
                    page.insert_text((50, 150), f"CONTINUACION ACCIONISTAS (PAG {p_idx})", fontsize=12, fontname="hebo", color=(0.29, 0.64, 0.77))
                
                y_cert = find_y_advanced(page, ["certificate", "certificado"], min_y=200, max_y=400)
                if y_cert:
                    for i in range(min(3, len(sh_chunk))):
                        s = sh_chunk[i]
                        y_pos = y_cert + 35 + (i*20)
                        if s.get("certificate"): page.insert_text((60, y_pos), str(s["certificate"])[:15], fontsize=8, fontname="helv")
                        if s.get("value"): page.insert_text((130, y_pos), str(s["value"])[:15], fontsize=8, fontname="helv")
                        if s.get("shares"): page.insert_text((210, y_pos), str(s["shares"])[:15], fontsize=8, fontname="helv")
                        if s.get("name"): page.insert_text((270, y_pos), str(s["name"])[:30], fontsize=8, fontname="helv")
                        if s.get("address"): page.insert_text((400, y_pos), str(s["address"])[:35], fontsize=8, fontname="helv")

            dig = data.get("dignitaries", {})
            for rol in ["presidente", "secretario", "tesorero"]:
                if rol in dig:
                    y_rol = find_y_advanced(page2, [rol[:5]], min_y=100, max_y=300)
                    if y_rol:
                        if dig[rol].get("fullName"): page2.insert_text((210, y_rol), str(dig[rol]["fullName"])[:30], fontsize=8, fontname="helv")
                        if dig[rol].get("birthDate"): page2.insert_text((360, y_rol), str(dig[rol]["birthDate"])[:15], fontsize=8, fontname="helv")
                        if dig[rol].get("passport"): page2.insert_text((430, y_rol), str(dig[rol]["passport"])[:15], fontsize=8, fontname="helv")
                        if dig[rol].get("registrationNumber"): page2.insert_text((500, y_rol), str(dig[rol]["registrationNumber"])[:15], fontsize=8, fontname="helv")

            y_act = find_y_advanced(page2, ["activities", "actividades"], min_y=400, max_y=600)
            if y_act and data.get("companyActivities"): 
                page2.insert_text((55, y_act + 40), str(data["companyActivities"])[:150], fontsize=8, fontname="helv")
            y_sig = find_y_advanced(page2, ["signature", "firma"], min_y=600, max_y=850)
            if y_sig and data.get("declarationName"): 
                page2.insert_text((150, y_sig + 35), str(data["declarationName"]), fontsize=9, fontname="helv")
            if y_sig and data.get("declarationDate"): 
                page2.insert_text((150, y_sig + 70), str(data["declarationDate"]), fontsize=9, fontname="helv")

            process_shareholders_page(page2, shareholders[:3], 1)
            
            for i in range(3, len(shareholders), 3):
                insert_idx = orig_p2_idx + (i//3)
                doc.insert_pdf(src_doc, from_page=1, to_page=1, start_at=insert_idx)
                process_shareholders_page(doc[insert_idx], shareholders[i:i+3], (i//3) + 1)
                
        if src_doc: src_doc.close()

    # === MODO FONDOS REGISTROS CONTABLES ===
    else:
        # INYECTAR TEXTO ÚNICAMENTE PARA FONDOS
        for entry in config["anchors"]:
            key = entry["data_key"]
            if key in data and data[key]:
                fy = find_y_by_keywords(entry["keywords"], min_y=entry["min_y"], max_y=entry["max_y"])
                if fy:
                    x_val = config.get(entry["x_key"], 300) if isinstance(entry["x_key"], str) else entry["x_key"]
                    page1.insert_text((x_val, fy), str(data[key]), fontsize=10, fontname="helv")

        # Dirección Final
        y_final_label = find_y_by_keywords(["direccion", "address"], min_y=700)
        if y_final_label and data.get("custodyAddress"):
            page1.insert_text((142, y_final_label), str(data["custodyAddress"]), fontsize=10, fontname="helv")

        # Página 2 (Firmas Fondos)
        if len(doc) > 1:
            if data.get("signerName"):
                doc[1].insert_text((153, 352), str(data["signerName"]), fontsize=11, fontname="helv")
            if data.get("date"):
                doc[1].insert_text((139, 378), str(data["date"]), fontsize=11, fontname="helv")

        # Checkboxes (Fondos)
        checkbox_anchors = [
            (["personal", "bienes"], "Bienes personales"),
            (["financial", "inversiones"], "Inversiones Financieras"),
            (["business", "negocios"], "Negocios"),
            (["loans", "prestamos"], "Prestamos"),
            (["inheritance", "herencia"], "Herencia o Fondo Fiduciario")
        ]
        user_sources = data.get("fundsSource", [])
        if isinstance(user_sources, str): user_sources = [user_sources]
        for kws, ui_key in checkbox_anchors:
            if ui_key in user_sources:
                fy = find_y_by_keywords(kws, min_y=350, max_y=480)
                if fy: page1.insert_text((73, fy), "X", fontsize=10, fontname="hebo")

        if data.get("fundsOther"):
            fy = find_y_by_keywords(["specify", "especificar"])
            if fy: page1.insert_text((73, fy + 20), str(data["fundsOther"]), fontsize=10, fontname="helv")

    # --- MOTOR COMÚN DE ANEXOS DINÁMICOS ---
    def append_dynamic_annex(doc, title, dict_list):
        if not dict_list or not isinstance(dict_list, list) or len(dict_list) == 0: return
        if not isinstance(dict_list[0], dict): return
        has_data = any(bool(v) for v in dict_list[0].values() if isinstance(v, str))
        if not has_data: return
        
        page = doc.new_page()
        page.insert_text((50, 50), f"ANEXO DOCUMENTAL: {title}", fontsize=14, fontname="hebo", color=(0, 0.47, 0.83))
        page.insert_text((50, 65), "La información contenida en este anexo forma parte integral del trámite.", fontsize=9, fontname="helv", color=(0.5, 0.5, 0.5))
        y = 90
        
        for index, item in enumerate(dict_list):
            if y > 750:
                page = doc.new_page()
                y = 50
            page.draw_rect(fitz.Rect(50, y-10, 550, y+5), color=(0.9, 0.9, 0.9), fill=(0.95, 0.95, 0.95))
            page.insert_text((55, y), f"REGISTRO {index+1}", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.2))
            y += 15
            
            col = 0
            max_y_in_block = y
            for key, val in item.items():
                if val:
                    label = str(key).upper().replace('_', ' ')
                    x_pos = 60 if col == 0 else 300
                    page.insert_text((x_pos, y), f"{label}:", fontsize=8, fontname="hebo")
                    page.insert_text((x_pos + 80, y), str(val)[:45], fontsize=8, fontname="helv")
                    col += 1
                    if col == 2:
                        col = 0
                        y += 15
                    max_y_in_block = max(max_y_in_block, y)
            if col == 1: y += 15 
            y += 10 

    # === FALLBACK GENÉRICO PARA OTRAS PLANTILLAS ===
    if template_name != "corporacion" and "corpNameSA" not in data:
        # Fallback genérico para otros
        if "directors" in data: append_dynamic_annex(doc, "LISTADO DE DIRECTORES", data["directors"])
        if "shareholders" in data: append_dynamic_annex(doc, "LISTADO DE ACCIONISTAS", data["shareholders"])
        if "dignitaries" in data and isinstance(data["dignitaries"], dict):
            dig_list = [{"CARGO": k.upper(), **v} for k, v in data["dignitaries"].items()]
            append_dynamic_annex(doc, "DIGNATARIOS REGISTRADOS", dig_list)

    # Guardado limpio sin capas extra
    doc.save(output_path, incremental=False, encryption=0)
    doc.close()

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input)
        out_file = input_data.get("output_path", "filled_temp.pdf")
        t_name = input_data.get("template_name", "referencia_maestra")
        c_path = input_data.get("custom_template_path", None)
        fill_pdf_universal_engine(input_data.get("data", {}), out_file, t_name, c_path)
        print(out_file)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR_PY: {str(e)} | Details: {error_details}", file=sys.stderr)
        sys.exit(1)
