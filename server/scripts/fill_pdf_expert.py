import fitz
import sys
import json
import io
import unicodedata
import os

# Forzamos a Python a usar UTF-8
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf8')

def fill_pdf_universal_engine(data, output_path, template_name, custom_template_path=None):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    config_path = os.path.join(base_dir, "templates", "templates_config.json")
    
    if not os.path.exists(config_path):
        raise Exception(f"Config file not found at {config_path}")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        master_config = json.load(f)
    
    if template_name not in master_config:
        template_name = "referencia_maestra"
    
    config = master_config[template_name]
    
    if custom_template_path and os.path.exists(custom_template_path):
        pdf_path = custom_template_path
    else:
        pdf_path = os.path.join(base_dir, "templates", os.path.basename(config["file_path"]))
    
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

    # INYECTAR TEXTO PARA FONDOS (Ó GENÉRICO)
    for entry in config.get("anchors", []):
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

    # Página 2 (Firmas)
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
        
        page = doc.new_page()
        page.insert_text((50, 50), f"ANEXO DOCUMENTAL: {title}", fontsize=14, fontname="hebo", color=(0, 0.47, 0.83))
        y = 90
        
        for index, item in enumerate(dict_list):
            if y > 750:
                page = doc.new_page()
                y = 50
            page.draw_rect(fitz.Rect(50, y-10, 550, y+5), color=(0.9, 0.9, 0.9), fill=(0.95, 0.95, 0.95))
            page.insert_text((55, y), f"REGISTRO {index+1}", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.2))
            y += 15
            
            col = 0
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
            if col == 1: y += 15 
            y += 10 



    doc.save(output_path, incremental=False, encryption=0)
    doc.close()

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input)
        fill_pdf_universal_engine(input_data.get("data", {}), input_data.get("output_path", "filled_temp.pdf"), input_data.get("template_name", "referencia_maestra"), input_data.get("custom_template_path"))
        print(input_data.get("output_path", "filled_temp.pdf"))
    except Exception as e:
        import traceback
        print(f"ERROR_PY: {str(e)} | Details: {traceback.format_exc()}", file=sys.stderr)
        sys.exit(1)
