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
        # --- MOTOR DE ANCLAJE EXPERTO ---
        def get_anchor(page, keywords, min_y=0, max_y=1000):
            p_words = page.get_text("words")
            for w in p_words:
                if min_y <= w[1] <= max_y:
                    word_norm = normalize(w[4])
                    for kw in keywords:
                        if normalize(kw) in word_norm:
                            return w[3] # Retorna el límite inferior como anclaje
            return None

        directors = data.get("directors", [])
        shareholders = data.get("shareholders", [])

        def fill_director_block(page, d, anchor_y, col_idx):
            x_val = 150 if col_idx == 0 else 430
            offsets = {
                "firstName": 14, "secondName": 31, "lastName": 48,
                "birthDate": 65, "maritalStatus": 82, "nationality": 99,
                "passport": 116, "phone": 133, "email": 150,
                "address": 167, "city": 201, "country": 218
            }
            for key, off in offsets.items():
                if d.get(key):
                    page.insert_text((x_val, anchor_y + off), str(d[key])[:35], fontsize=8, fontname="helv")

        def process_directors_page(page, d_chunk, p_idx, is_annex=False):
            y_banner = get_anchor(page, ["directores", "directors"], 100, 600)
            if not y_banner: y_banner = 270 

            if is_annex:
                page.insert_text((50, y_banner - 40), f"CONTINUACION DIRECTORES (PAG {p_idx})", fontsize=12, fontname="hebo", color=(0.29, 0.64, 0.77))
                # Solo blanqueamos las cajas de texto de los directores, NO toda la página
                # Esto preserva el pie de página y otros elementos de diseño
                page.draw_rect(fitz.Rect(45, y_banner + 30, 550, y_banner + 550), color=(1,1,1), fill=(1,1,1))
                # Redibujamos contornos ligeros para las cajas de anexo
                page.draw_rect(fitz.Rect(50, y_banner + 30, 290, y_banner + 280), color=(0.29, 0.64, 0.77), width=0.5)
                page.draw_rect(fitz.Rect(300, y_banner + 30, 545, y_banner + 280), color=(0.29, 0.64, 0.77), width=0.5)

            y_dir_top = y_banner + 25 
            y_dir_bot = y_banner + 285

            if len(d_chunk) > 0:
                page.insert_text((140, y_dir_top + 5), f"Director {(p_idx-1)*3 + 1}", fontsize=9, fontname="hebo")
                fill_director_block(page, d_chunk[0], y_dir_top + 10, 0)
            if len(d_chunk) > 1:
                page.insert_text((420, y_dir_top + 5), f"Director {(p_idx-1)*3 + 2}", fontsize=9, fontname="hebo")
                fill_director_block(page, d_chunk[1], y_dir_top + 10, 1)
            if len(d_chunk) > 2:
                page.insert_text((275, y_dir_bot + 5), f"Director {(p_idx-1)*3 + 3}", fontsize=9, fontname="hebo")
                fill_director_block(page, d_chunk[2], y_dir_bot + 10, 0)
                d3 = d_chunk[2]
                for key, off in [("address", 10), ("city", 44), ("country", 61)]:
                    if d3.get(key):
                        page.insert_text((430, y_dir_bot + 10 + off), str(d3[key])[:35], fontsize=8, fontname="helv")

        page1 = doc[0]
        y_choice = get_anchor(page1, ["choice", "incorp", "form"], 100, 400)
        if y_choice:
            # Ajuste de cabecera más preciso
            if data.get("corpNameSA"): page1.insert_text((230, y_choice - 5), str(data["corpNameSA"]), fontsize=9, fontname="helv")
            if data.get("corpNameCorp"): page1.insert_text((230, y_choice + 24), str(data["corpNameCorp"]), fontsize=9, fontname="helv")
            if data.get("corpNameInc"): page1.insert_text((230, y_choice + 54), str(data["corpNameInc"]), fontsize=9, fontname="helv")
        
        y_cap = get_anchor(page1, ["capital", "authorized"], 150, 500)
        if y_cap and data.get("capitalSocial"):
            page1.insert_text((280, y_cap - 3), str(data["capitalSocial"]), fontsize=9, fontname="helv")

        process_directors_page(page1, directors[:3], 1)

        pages_added = 0
        src_doc = None
        if len(directors) > 3 or len(shareholders) > 3:
            src_doc = fitz.open(custom_template_path if custom_template_path else "templates/referencia_maestra.pdf")

        for i in range(3, len(directors), 3):
            pages_added += 1
            doc.insert_pdf(src_doc, from_page=0, to_page=0, start_at=pages_added)
            process_directors_page(doc[pages_added], directors[i:i+3], pages_added + 1, is_annex=True)

        orig_p2_idx = 1 + pages_added
        if len(doc) > orig_p2_idx:
            page2 = doc[orig_p2_idx]
            
            y_dig_banner = get_anchor(page2, ["dignatarios", "officers"], 100, 600)
            if not y_dig_banner: y_dig_banner = 118 
            
            dig = data.get("dignitaries", {})
            role_offsets = {"presidente": 38, "secretario": 58, "tesorero": 78}
            for rol, off in role_offsets.items():
                if rol in dig:
                    y_row = y_dig_banner + off
                    d = dig[rol]
                    if d.get("fullName"): page2.insert_text((170, y_row), str(d["fullName"])[:30], fontsize=8, fontname="helv")
                    if d.get("birthDate"): page2.insert_text((330, y_row), str(d["birthDate"])[:15], fontsize=8, fontname="helv")
                    if d.get("passport"): page2.insert_text((400, y_row), str(d["passport"])[:15], fontsize=8, fontname="helv")
                    if d.get("registrationNumber"): page2.insert_text((480, y_row), str(d["registrationNumber"])[:15], fontsize=8, fontname="helv")

            y_sh_banner = get_anchor(page2, ["accionistas", "shareholders"], 200, 800)
            if not y_sh_banner: y_sh_banner = 270 

            def fill_shareholders(page, sh_chunk, anchor_y, is_annex=False):
                if is_annex:
                    page.insert_text((50, anchor_y - 40), "CONTINUACION ACCIONISTAS", fontsize=12, fontname="hebo", color=(0.29, 0.64, 0.77))
                    # Blanqueamos solo el área de la tabla de accionistas
                    page.draw_rect(fitz.Rect(45, anchor_y + 30, 550, anchor_y + 150), color=(1,1,1), fill=(1,1,1))
                
                y_start = anchor_y + 45
                for i, s in enumerate(sh_chunk[:3]):
                    y_pos = y_start + (i * 22)
                    if s.get("certificate"): page.insert_text((60, y_pos), str(s["certificate"])[:15], fontsize=8, fontname="helv")
                    if s.get("value"): page.insert_text((130, y_pos), str(s["value"])[:15], fontsize=8, fontname="helv")
                    if s.get("shares"): page.insert_text((210, y_pos), str(s["shares"])[:15], fontsize=8, fontname="helv")
                    if s.get("name"): page.insert_text((270, y_pos), str(s["name"])[:30], fontsize=8, fontname="helv")
                    if s.get("address"): page.insert_text((400, y_pos), str(s["address"])[:35], fontsize=8, fontname="helv")

            fill_shareholders(page2, shareholders[:3], y_sh_banner)

            y_act_banner = get_anchor(page2, ["actividades", "activities"], 400, 900)
            if y_act_banner and data.get("companyActivities"):
                page2.insert_text((55, y_act_banner + 40), str(data["companyActivities"])[:150], fontsize=8, fontname="helv")
            
            y_sig_anchor = get_anchor(page2, ["declaration", "signature", "firma"], 600, 1000)
            if not y_sig_anchor: y_sig_anchor = 750
            if data.get("declarationName"): page2.insert_text((150, y_sig_anchor + 65), str(data["declarationName"]), fontsize=9, fontname="helv")
            if data.get("declarationDate"): page2.insert_text((150, y_sig_anchor + 95), str(data["declarationDate"]), fontsize=9, fontname="helv")

            for i in range(3, len(shareholders), 3):
                insert_idx = orig_p2_idx + (i//3)
                doc.insert_pdf(src_doc, from_page=1, to_page=1, start_at=insert_idx)
                fill_shareholders(doc[insert_idx], shareholders[i:i+3], y_sh_banner, is_annex=True)
                
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
