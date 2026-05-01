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

    # INYECTAR TEXTO ÚNICAMENTE (Versión Estable Original)
    for entry in config["anchors"]:
        key = entry["data_key"]
        if key in data and data[key]:
            x_val = config.get(entry["x_key"], 300) if isinstance(entry["x_key"], str) else entry["x_key"]
            y = find_y_by_keywords(entry["keywords"], min_y=entry["min_y"], max_y=entry["max_y"])
            if not y and key == "address":
                y = config.get("y_address_fallback", 328)
            if y:
                page1.insert_text((x_val, y), str(data[key]), fontsize=10, fontname="helv")

    # Dirección Final
    y_final_label = find_y_by_keywords(["direccion", "address"], min_y=700)
    if y_final_label and data.get("custodyAddress"):
        page1.insert_text((142, y_final_label), str(data["custodyAddress"]), fontsize=10, fontname="helv")

    # Página 2
    if len(doc) > 1:
        if data.get("signerName"):
            doc[1].insert_text((153, 352), str(data["signerName"]), fontsize=11, fontname="helv")
        if data.get("date"):
            doc[1].insert_text((139, 378), str(data["date"]), fontsize=11, fontname="helv")

    # Checkboxes
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

    # --- INICIO MOTOR DE ANEXOS DINÁMICOS (OPCIÓN 1) ---
    def append_dynamic_annex(doc, title, dict_list):
        if not dict_list or not isinstance(dict_list, list): return
        # Validar si al menos hay un dato real en el primer elemento
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
            
            # Dibujar campos en dos columnas
            col = 0
            start_y = y
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
                    
            if col == 1: y += 15 # Alinear si quedó impar
            y += 10 # Espaciado entre bloques

    # Extraer arrays dinámicos para la Corporación (Directores, Accionistas, etc)
    if "directors" in data:
        append_dynamic_annex(doc, "LISTADO DE DIRECTORES", data["directors"])
    if "shareholders" in data:
        append_dynamic_annex(doc, "LISTADO DE ACCIONISTAS", data["shareholders"])
    if "dignitaries" in data and isinstance(data["dignitaries"], dict):
        # Convertir el objeto dignitaries a lista para el anexo
        dig_list = [{"CARGO": k.upper(), **v} for k, v in data["dignitaries"].items()]
        append_dynamic_annex(doc, "DIGNATARIOS REGISTRADOS", dig_list)
    # --- FIN MOTOR DE ANEXOS DINÁMICOS ---

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
        print(f"ERROR_PY: {str(e)}", file=sys.stderr)
        sys.exit(1)
