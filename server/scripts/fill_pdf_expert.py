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
    
    # === MODO CORPORACIÓN ===
    if template_name == "corporacion" or "corpNameSA" in data:
        def find_pos_advanced(page, keywords, min_x=0, max_x=1000, min_y=0, max_y=1000):
            p_words = page.get_text("words")
            for w in p_words:
                if min_x <= w[0] <= max_x and min_y <= w[1] <= max_y:
                    word_norm = normalize(w[4])
                    for kw in keywords:
                        if normalize(kw) in word_norm:
                            return w[0], w[3] # Left edge, Bottom edge
            return None, None

        # PÁGINA 1
        x_sa, y_sa = find_pos_advanced(page1, ["1st"], min_y=100, max_y=300)
        if y_sa and data.get("corpNameSA"): page1.insert_text((x_sa + 170, y_sa + 4), str(data["corpNameSA"]), fontsize=10, fontname="helv")
        x_corp, y_corp = find_pos_advanced(page1, ["2nd"], min_y=100, max_y=300)
        if y_corp and data.get("corpNameCorp"): page1.insert_text((x_corp + 170, y_corp + 4), str(data["corpNameCorp"]), fontsize=10, fontname="helv")
        x_inc, y_inc = find_pos_advanced(page1, ["3rd"], min_y=100, max_y=300)
        if y_inc and data.get("corpNameInc"): page1.insert_text((x_inc + 170, y_inc + 4), str(data["corpNameInc"]), fontsize=10, fontname="helv")
        
        x_cap, y_cap = find_pos_advanced(page1, ["authorized", "autorizado"], min_y=200, max_y=350)
        if y_cap and data.get("capitalSocial"): page1.insert_text((x_cap + 200, y_cap + 4), str(data["capitalSocial"]), fontsize=10, fontname="helv")

        directors = data.get("directors", [])
        
        def fill_dir_dynamic(d, page, min_x, max_x, min_y, max_y):
            mapping = [
                ("firstName", ["first"]), ("secondName", ["middle"]), ("lastName", ["surname"]),
                ("birthDate", ["birth"]), ("maritalStatus", ["marital"]), ("nationality", ["citizenship"]),
                ("passport", ["passport"]), ("phone", ["phone", "tel"]), ("email", ["email"]),
                ("address", ["address"]), ("city", ["city", "ciudad"]), ("country", ["country", "pais"])
            ]
            for key, kws in mapping:
                if d.get(key):
                    x, y = find_pos_advanced(page, kws, min_x, max_x, min_y, max_y)
                    if y: page.insert_text((x + 150, y + 4), str(d[key])[:25], fontsize=9, fontname="helv")

        # Director 1
        if len(directors) > 0: fill_dir_dynamic(directors[0], page1, 0, 250, 300, 650)
        # Director 2
        if len(directors) > 1: fill_dir_dynamic(directors[1], page1, 260, 550, 300, 650)
        # Director 3
        if len(directors) > 2: 
            d = directors[2]
            fill_dir_dynamic(d, page1, 0, 250, 650, 950)
            for k, kws in [("address", ["address"]), ("city", ["city", "ciudad"]), ("country", ["country", "pais"])]:
                if d.get(k):
                    x, y = find_pos_advanced(page1, kws, 260, 550, 650, 950)
                    if y: page1.insert_text((x + 150, y + 4), str(d[k])[:25], fontsize=9, fontname="helv")

        # PÁGINA 2
        if len(doc) > 1:
            page2 = doc[1]
            # Dignatarios
            dig = data.get("dignitaries", {})
            for rol in ["presidente", "secretario", "tesorero"]:
                if rol in dig:
                    x_rol, y_rol = find_pos_advanced(page2, [rol[:5]], min_y=100, max_y=300)
                    if y_rol:
                        if dig[rol].get("fullName"): page2.insert_text((x_rol + 100, y_rol + 4), str(dig[rol]["fullName"])[:30], fontsize=9, fontname="helv")
                        if dig[rol].get("birthDate"): page2.insert_text((x_rol + 280, y_rol + 4), str(dig[rol]["birthDate"])[:15], fontsize=9, fontname="helv")
                        if dig[rol].get("passport"): page2.insert_text((x_rol + 360, y_rol + 4), str(dig[rol]["passport"])[:15], fontsize=9, fontname="helv")
                        if dig[rol].get("registrationNumber"): page2.insert_text((x_rol + 450, y_rol + 4), str(dig[rol]["registrationNumber"])[:15], fontsize=9, fontname="helv")

            # Accionistas
            shareholders = data.get("shareholders", [])
            y_cert = find_y_advanced(page2, ["certificate", "certificado"], min_y=200, max_y=400)
            if y_cert:
                for i in range(min(4, len(shareholders))):
                    s = shareholders[i]
                    y_pos = y_cert + 18 + (i*18)
                    if s.get("certificate"): page2.insert_text((55, y_pos), str(s["certificate"])[:10], fontsize=9, fontname="helv")
                    if s.get("value"): page2.insert_text((140, y_pos), str(s["value"])[:10], fontsize=9, fontname="helv")
                    if s.get("shares"): page2.insert_text((220, y_pos), str(s["shares"])[:10], fontsize=9, fontname="helv")
                    if s.get("name"): page2.insert_text((300, y_pos), str(s["name"])[:30], fontsize=9, fontname="helv")
                    if s.get("address"): page2.insert_text((450, y_pos), str(s["address"])[:25], fontsize=9, fontname="helv")

            # Actividades y Declaración
            y_act = find_y_advanced(page2, ["activities", "actividades"], min_y=400, max_y=600)
            if y_act and data.get("companyActivities"): 
                page2.insert_text((55, y_act + 40), str(data["companyActivities"])[:150], fontsize=9, fontname="helv")
                
            y_sig = find_y_advanced(page2, ["signature", "firma"], min_y=600, max_y=850)
            if y_sig and data.get("declarationName"): 
                page2.insert_text((150, y_sig + 35), str(data["declarationName"]), fontsize=11, fontname="helv")
            if y_sig and data.get("declarationDate"): 
                page2.insert_text((150, y_sig + 70), str(data["declarationDate"]), fontsize=11, fontname="helv")

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

    # --- GENERADORES CORPORATIVOS NATIVOS ---
    def draw_corporate_director_block(page, x_start, y_start, d_data, d_num, color):
        width = 247.5
        row_height = 17
        labels = [
            "First name / Nombre", "Middle name / Segundo nombre", "Surname(s) / Apellidos",
            "Date of birth/ Fecha de nacimiento", "Marital Status / Estado civil", "Citizenship / Nacionalidad",
            "Passport / Pasaporte", "Phone / Teléfono", "Email", "Address / Dirección", "City / ciudad", "Country / País"
        ]
        keys = ["firstName", "secondName", "lastName", "birthDate", "maritalStatus", "nationality", "passport", "phone", "email", "address", "city", "country"]
        
        total_height = 20 + row_height * len(labels)
        page.draw_rect(fitz.Rect(x_start, y_start, x_start + width, y_start + total_height), color=color, width=1)
        page.draw_line((x_start, y_start + 20), (x_start + width, y_start + 20), color=color, width=1)
        page.insert_text((x_start + width/2 - 25, y_start + 14), f"Director {d_num}", fontsize=10, fontname="hebo", color=(0,0,0))
        
        y = y_start + 20
        mid_x = x_start + 140
        page.draw_line((mid_x, y), (mid_x, y + row_height * len(labels)), color=color, width=1)
        
        for i, label in enumerate(labels):
            if i > 0: page.draw_line((x_start, y), (x_start + width, y), color=color, width=1)
            page.insert_text((x_start + 5, y + 12), label, fontsize=7, fontname="helv", color=(0,0,0))
            if d_data.get(keys[i]): page.insert_text((mid_x + 5, y + 12), str(d_data[keys[i]])[:30], fontsize=8, fontname="helv", color=(0,0,0))
            y += row_height

    def draw_corporate_directors_annex(doc, directors_list, insert_idx, start_idx=4):
        if not directors_list: return 0
        has_data = any(bool(v) for d in directors_list for v in d.values() if isinstance(v, str))
        if not has_data: return 0
        
        blue_color = (0.29, 0.64, 0.77)
        idx = 0
        pages = 0
        while idx < len(directors_list):
            page = doc.new_page(pno=insert_idx + pages)
            pages += 1
            page.insert_text((50, 40), "ANEXO DOCUMENTAL: DIRECTORES ADICIONALES", fontsize=14, fontname="hebo", color=blue_color)
            y_start = 70
            for row in range(2):
                if idx >= len(directors_list): break
                page.draw_rect(fitz.Rect(50, y_start, 545, y_start + 20), color=blue_color, fill=blue_color)
                page.insert_text((55, y_start + 14), "Directors / directores:", fontsize=11, fontname="hebo", color=(1,1,1))
                y_base = y_start + 20
                draw_corporate_director_block(page, 50, y_base, directors_list[idx], start_idx + idx, blue_color)
                idx += 1
                if idx < len(directors_list):
                    draw_corporate_director_block(page, 297.5, y_base, directors_list[idx], start_idx + idx, blue_color)
                    idx += 1
                y_start += 250
        return pages

    def draw_corporate_shareholders_annex(doc, sh_list, insert_idx):
        if not sh_list: return 0
        has_data = any(bool(v) for d in sh_list for v in d.values() if isinstance(v, str))
        if not has_data: return 0
        
        blue_color = (0.29, 0.64, 0.77)
        pages = 0
        page = doc.new_page(pno=insert_idx + pages)
        pages += 1
        page.insert_text((50, 40), "ANEXO DOCUMENTAL: ACCIONISTAS ADICIONALES", fontsize=14, fontname="hebo", color=blue_color)
        y = 70
        page.draw_rect(fitz.Rect(50, y, 545, y + 20), color=blue_color, fill=blue_color)
        page.insert_text((55, y + 14), "Shareholders / Accionistas:", fontsize=11, fontname="hebo", color=(1,1,1))
        y += 20
        sub_h = 25
        page.draw_rect(fitz.Rect(50, y, 545, y + sub_h), color=blue_color, width=1)
        col_x = [50, 110, 180, 240, 380, 545]
        for x in col_x[1:-1]: page.draw_line((x, y), (x, y + sub_h), color=blue_color, width=1)
        page.insert_text((52, y + 15), "Cert.", fontsize=8, fontname="hebo")
        page.insert_text((112, y + 15), "Value/Valor", fontsize=8, fontname="hebo")
        page.insert_text((182, y + 15), "Shares", fontsize=8, fontname="hebo")
        page.insert_text((242, y + 15), "Shareholder / Accionista", fontsize=8, fontname="hebo")
        page.insert_text((382, y + 15), "Address / dirección", fontsize=8, fontname="hebo")
        y += sub_h
        row_height = 20
        for s in sh_list:
            if y > 750:
                page = doc.new_page(pno=insert_idx + pages)
                pages += 1
                y = 50
            page.draw_rect(fitz.Rect(50, y, 545, y + row_height), color=blue_color, width=1)
            for x in col_x[1:-1]: page.draw_line((x, y), (x, y + row_height), color=blue_color, width=1)
            if s.get("certificate"): page.insert_text((55, y + 13), str(s["certificate"])[:10], fontsize=8, fontname="helv")
            if s.get("value"): page.insert_text((115, y + 13), str(s["value"])[:10], fontsize=8, fontname="helv")
            if s.get("shares"): page.insert_text((185, y + 13), str(s["shares"])[:10], fontsize=8, fontname="helv")
            if s.get("name"): page.insert_text((245, y + 13), str(s["name"])[:30], fontsize=8, fontname="helv")
            if s.get("address"): page.insert_text((385, y + 13), str(s["address"])[:30], fontsize=8, fontname="helv")
            y += row_height
        return pages

    if template_name == "corporacion" or "corpNameSA" in data:
        directors = data.get("directors", [])
        pages_added = 0
        if len(directors) > 3: 
            pages_added = draw_corporate_directors_annex(doc, directors[3:], 1, 4)
        shareholders = data.get("shareholders", [])
        if len(shareholders) > 4: 
            draw_corporate_shareholders_annex(doc, shareholders[4:], 2 + pages_added)
    else:
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
