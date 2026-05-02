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
        # PÁGINA 1
        if data.get("corpNameSA"): page1.insert_text((250, 155), str(data["corpNameSA"]), fontsize=10, fontname="helv")
        if data.get("corpNameCorp"): page1.insert_text((250, 195), str(data["corpNameCorp"]), fontsize=10, fontname="helv")
        if data.get("corpNameInc"): page1.insert_text((250, 235), str(data["corpNameInc"]), fontsize=10, fontname="helv")
        if data.get("capitalSocial"): page1.insert_text((320, 280), str(data["capitalSocial"]), fontsize=10, fontname="helv")

        directors = data.get("directors", [])
        
        def draw_dir(d, page, x_base, y_base):
            fields = ["firstName", "secondName", "lastName", "birthDate", "maritalStatus", "nationality", "passport", "phone", "email"]
            for i, k in enumerate(fields):
                if d.get(k): page.insert_text((x_base, y_base + (i*17)), str(d[k])[:25], fontsize=9, fontname="helv")

        # Director 1
        if len(directors) > 0:
            d = directors[0]
            draw_dir(d, page1, 180, 385)
            if d.get("address"): page1.insert_text((180, 537), str(d["address"])[:25], fontsize=9, fontname="helv")
            if d.get("city"): page1.insert_text((180, 595), str(d["city"])[:25], fontsize=9, fontname="helv")
            if d.get("country"): page1.insert_text((180, 615), str(d["country"])[:25], fontsize=9, fontname="helv")

        # Director 2
        if len(directors) > 1:
            d = directors[1]
            draw_dir(d, page1, 410, 385)
            if d.get("address"): page1.insert_text((410, 537), str(d["address"])[:25], fontsize=9, fontname="helv")
            if d.get("city"): page1.insert_text((410, 595), str(d["city"])[:25], fontsize=9, fontname="helv")
            if d.get("country"): page1.insert_text((410, 615), str(d["country"])[:25], fontsize=9, fontname="helv")

        # Director 3
        if len(directors) > 2:
            d = directors[2]
            draw_dir(d, page1, 180, 680)
            if d.get("address"): page1.insert_text((410, 680), str(d["address"])[:25], fontsize=9, fontname="helv")
            if d.get("city"): page1.insert_text((410, 725), str(d["city"])[:25], fontsize=9, fontname="helv")
            if d.get("country"): page1.insert_text((410, 755), str(d["country"])[:25], fontsize=9, fontname="helv")

        # PÁGINA 2
        if len(doc) > 1:
            page2 = doc[1]
            # Dignatarios
            dig = data.get("dignitaries", {})
            y_digs = {"presidente": 175, "secretario": 195, "tesorero": 215}
            for rol, y_pos in y_digs.items():
                if rol in dig:
                    if dig[rol].get("fullName"): page2.insert_text((160, y_pos), str(dig[rol]["fullName"])[:30], fontsize=9, fontname="helv")
                    if dig[rol].get("birthDate"): page2.insert_text((340, y_pos), str(dig[rol]["birthDate"])[:15], fontsize=9, fontname="helv")
                    if dig[rol].get("passport"): page2.insert_text((430, y_pos), str(dig[rol]["passport"])[:15], fontsize=9, fontname="helv")
                    if dig[rol].get("registrationNumber"): page2.insert_text((520, y_pos), str(dig[rol]["registrationNumber"])[:15], fontsize=9, fontname="helv")

            # Accionistas
            shareholders = data.get("shareholders", [])
            for i in range(min(4, len(shareholders))):
                s = shareholders[i]
                y_pos = 295 + (i*18)
                if s.get("certificate"): page2.insert_text((55, y_pos), str(s["certificate"])[:10], fontsize=9, fontname="helv")
                if s.get("value"): page2.insert_text((140, y_pos), str(s["value"])[:10], fontsize=9, fontname="helv")
                if s.get("shares"): page2.insert_text((220, y_pos), str(s["shares"])[:10], fontsize=9, fontname="helv")
                if s.get("name"): page2.insert_text((300, y_pos), str(s["name"])[:30], fontsize=9, fontname="helv")
                if s.get("address"): page2.insert_text((450, y_pos), str(s["address"])[:25], fontsize=9, fontname="helv")

            # Actividades y Declaración
            if data.get("companyActivities"): page2.insert_text((55, 430), str(data["companyActivities"])[:150], fontsize=9, fontname="helv")
            if data.get("declarationName"): page2.insert_text((150, 660), str(data["declarationName"]), fontsize=11, fontname="helv")
            if data.get("declarationDate"): page2.insert_text((150, 700), str(data["declarationDate"]), fontsize=11, fontname="helv")

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
            if y > 750: # Salto de página
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

    if template_name == "corporacion" or "corpNameSA" in data:
        directors = data.get("directors", [])
        if len(directors) > 3: append_dynamic_annex(doc, "LISTADO DE DIRECTORES ADICIONALES", directors[3:])
        shareholders = data.get("shareholders", [])
        if len(shareholders) > 4: append_dynamic_annex(doc, "LISTADO DE ACCIONISTAS ADICIONALES", shareholders[4:])
        # Officers are capped at 3 strictly in frontend, so no overflow needed.
    else:
        # Fallback para otros si tuvieran
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
