import fitz
import sys
import json
import io
import unicodedata
import os

# Forzamos a Python a usar UTF-8
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf8')

def fill_pdf_universal_engine(data, output_path, template_name):
    # RUTAS RELATIVAS PARA PORTABILIDAD (Funcionan en Windows y Linux/Railway)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    config_path = os.path.join(base_dir, "templates", "templates_config.json")
    
    if not os.path.exists(config_path):
        raise Exception(f"Config file not found at {config_path}")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        master_config = json.load(f)
    
    if template_name not in master_config:
        template_name = "referencia_maestra"
    
    config = master_config[template_name]
    
    # Ruta absoluta del PDF basada en la ubicación del proyecto
    pdf_path = os.path.join(base_dir, "templates", os.path.basename(config["file_path"]))
    
    # 2. Abrir PDF
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

    # 3. Optimización de Nitidez de Imagen (Renderizado RGB de Alta Fidelidad)
    logo_path = os.path.join(base_dir, "templates", "logo_real.png")
    if os.path.exists(logo_path):
        # Cargamos la imagen como un Pixmap para procesar la nitidez
        pix = fitz.Pixmap(logo_path)
        # Si tiene transparencia, la convertimos a RGB puro para evitar cuadros negros
        if pix.alpha:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        
        # Rectángulo de precisión para el logo (Centro superior)
        logo_rect = fitz.Rect(200, 15, 400, 75) 
        page1.insert_image(logo_rect, pixmap=pix, overlay=True)

    # 4. Inyectar Página 1
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

    # 4. Página 2
    if len(doc) > 1:
        if data.get("signerName"):
            doc[1].insert_text((153, 352), str(data["signerName"]), fontsize=11, fontname="helv")
        if data.get("date"):
            doc[1].insert_text((139, 378), str(data["date"]), fontsize=11, fontname="helv")

    # 5. Checkboxes
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

    doc.save(output_path)
    doc.close()

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input)
        out_file = input_data.get("output_path", "filled_temp.pdf")
        t_name = input_data.get("template_name", "referencia_maestra")
        
        fill_pdf_universal_engine(input_data.get("data", {}), out_file, t_name)
        print(out_file)
    except Exception as e:
        print(f"ERROR_PY: {str(e)}", file=sys.stderr)
        sys.exit(1)
