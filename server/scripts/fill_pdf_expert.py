import fitz
import sys
import json
import io
import unicodedata
import os

# Forzamos a Python a usar UTF-8 para evitar errores de codificación en Windows
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf8')

def normalize(text):
    if not text: return ""
    return "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').lower()

def insert_text_scaled(page, rect, text, fontname="Helvetica", max_fontsize=9, min_fontsize=6, color=(0,0,0)):
    """Inserta texto escalando la fuente automáticamente para que quepa en el recuadro."""
    if not text: return
    text = str(text)
    fontsize = max_fontsize
    try:
        while fontsize > min_fontsize:
            text_width = fitz.get_text_length(text, fontname=fontname, fontsize=fontsize)
            if text_width <= rect.width:
                break
            fontsize -= 0.5
    except:
        fontsize = min_fontsize
    
    # Punto de inserción (X inicial, Y base)
    page.insert_text((rect.x0, rect.y1 - 2), text, fontsize=fontsize, fontname=fontname, color=color)

def fill_pdf_universal_engine(data, output_path, template_name, master_config, custom_template_path=None):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    if custom_template_path and os.path.exists(custom_template_path):
        pdf_path = custom_template_path
    else:
        pdf_path = os.path.join(base_dir, "templates", "referencia_maestra.pdf")
    
    if not os.path.exists(pdf_path):
        raise Exception(f"No se encontró el archivo base PDF en: {pdf_path}")

    doc = fitz.open(pdf_path)

    # === LÓGICA CORPORACIÓN (MOTOR DE PRECISIÓN ABSOLUTA V4) ===
    if template_name == "corporacion" or "corpNameSA" in data:
        directors = data.get("directors", [])
        shareholders = data.get("shareholders", [])
        dignitaries = data.get("dignitaries", {})

        def find_label_rect(page, text_list, min_y=0, max_y=1000, x_range=(0, 600)):
            for txt in text_list:
                instances = page.search_for(txt)
                for inst in instances:
                    if min_y <= inst.y1 <= max_y and x_range[0] <= inst.x0 <= x_range[1]:
                        return inst
            return None

        page1 = doc[0]
        
        # 1. Nombres de Compañía (Choices) - Calibración X=140
        choice_labels = ["1st choice", "2nd choice", "3rd choice"]
        choice_keys = ["corpNameSA", "corpNameCorp", "corpNameInc"]
        for i, key in enumerate(choice_keys):
            val = data.get(key)
            if not val: continue
            label_inst = find_label_rect(page1, [choice_labels[i]], 100, 350)
            if label_inst:
                rect = fitz.Rect(140, label_inst.y0 - 2, 430, label_inst.y1 + 2)
                insert_text_scaled(page1, rect, str(val), max_fontsize=10)

        # 2. Capital Social - Calibración X=585
        y_cap_label = find_label_rect(page1, ["Authorized Capital", "Capital Social"], 300, 500)
        if y_cap_label and data.get("capitalSocial"):
            try:
                val_cap = f"{float(str(data['capitalSocial']).replace(',','')):,.2f} USD"
                # Escribir en el recuadro blanco al final de la línea
                page1.insert_text((580, y_cap_label.y1 + 1), val_cap, fontsize=10, fontname="Helvetica-Bold")
            except: pass

        # 3. Directores - Calibración de Grid
        dir_labels_map = {
            "firstName": ["First name", "Nombre"],
            "secondName": ["Middle name", "Segundo nombre"],
            "lastName": ["Surname", "Apellidos"],
            "birthDate": ["Date of birth", "Fecha de nacimiento"],
            "maritalStatus": ["Marital Status", "Estado civil"],
            "nationality": ["Citizenship", "Nacionalidad"],
            "passport": ["Passport", "Pasaporte"],
            "phone": ["Phone", "Teléfono"],
            "email": ["Email", "Correo"],
            "address": ["Address", "Dirección"],
            "city": ["City", "Ciudad"],
            "country": ["Country", "País"]
        }

        def fill_director_expert(p, d_data, x_min, x_max, val_x, search_y_start):
            curr_y = search_y_start
            for key, labels in dir_labels_map.items():
                val = d_data.get(key)
                # Búsqueda ultra-localizada
                inst = find_label_rect(p, labels, curr_y - 5, curr_y + 35, (x_min, x_max))
                if inst:
                    if val:
                        # Offset vertical de +2 para bajar el texto al centro de la celda
                        rect = fitz.Rect(val_x, inst.y0 + 2, x_max - 5, inst.y1 + 4)
                        insert_text_scaled(p, rect, str(val), max_fontsize=8)
                    curr_y = inst.y1
                else:
                    curr_y += 19 # Salto de línea estimado

        y_dir_label = find_label_rect(page1, ["Director 1"], 200, 600)
        y_dir_base = y_dir_label.y1 if y_dir_label else 300
        
        if len(directors) >= 1: fill_director_expert(page1, directors[0], 50, 298, 180, y_dir_base)
        if len(directors) >= 2: fill_director_expert(page1, directors[1], 300, 595, 460, y_dir_base)

        # Director 3 (Bottom Page 1)
        if len(directors) >= 3:
            d3 = directors[2]
            y_d3_label = find_label_rect(page1, ["Director 3"], 600, 950)
            if y_d3_label:
                y_d3 = y_d3_label.y1
                # Lado Izquierdo
                curr_y = y_d3
                for k in ["firstName", "secondName", "lastName", "birthDate", "maritalStatus", "nationality", "passport", "phone", "email"]:
                    inst = find_label_rect(page1, dir_labels_map[k], curr_y - 2, curr_y + 30, (50, 298))
                    if inst:
                        if d3.get(k):
                            rect = fitz.Rect(180, inst.y0 + 2, 298, inst.y1 + 4)
                            insert_text_scaled(page1, rect, str(d3[k]), max_fontsize=8)
                        curr_y = inst.y1
                # Lado Derecho
                curr_y = y_d3
                for k in ["address", "city", "country"]:
                    inst = find_label_rect(page1, dir_labels_map[k], curr_y - 2, curr_y + 40, (300, 595))
                    if inst:
                        if d3.get(k):
                            rect = fitz.Rect(460, inst.y0 + 2, 595, inst.y1 + 4)
                            insert_text_scaled(page1, rect, str(d3[k]), max_fontsize=8)
                        curr_y = inst.y1

        # --- ANEXOS Y PÁGINA FINAL ---
        src_doc = fitz.open(pdf_path)
        # Anexos para Directores 4+
        for i in range(3, len(directors)):
            doc.insert_pdf(src_doc, from_page=0, to_page=0, start_at=i-2)
            p = doc[i-2]
            p.draw_rect(fitz.Rect(0,0,600,1000), color=(1,1,1), fill=(1,1,1))
            p.insert_text((50, 50), f"ANEXO DIRECTORES - DIRECTOR #{i+1}", fontsize=12, fontname="Helvetica-Bold")
            cy = 100
            for k, labs in dir_labels_map.items():
                p.insert_text((60, cy), f"{labs[0]}:", fontsize=9, fontname="Helvetica-Bold")
                p.insert_text((200, cy), str(directors[i].get(k, "")), fontsize=9, fontname="Helvetica")
                cy += 20

        # Página Final (Dignatarios, Accionistas, Firma)
        pageF = doc[len(doc)-1]
        
        # Dignatarios
        for role, label in {"presidente": "President", "secretario": "Secretary", "tesorero": "Treasurer"}.items():
            d = dignitaries.get(role, {})
            inst = find_label_rect(pageF, [label], 50, 450)
            if inst:
                if d.get("fullName"): pageF.insert_text((215, inst.y1 + 2), str(d["fullName"]), fontsize=9)
                if d.get("birthDate"): pageF.insert_text((495, inst.y1 + 2), str(d["birthDate"]), fontsize=8)
                if d.get("passport"): pageF.insert_text((620, inst.y1 + 2), str(d["passport"]), fontsize=8)

        # Accionistas
        y_sh_label = find_label_rect(pageF, ["Shareholders", "Accionistas"], 200, 600)
        y_sh = y_sh_label.y1 if y_sh_label else 280
        for i, s in enumerate(shareholders[:4]):
            cy = y_sh + 45 + (i * 24)
            if s.get("certificate"): pageF.insert_text((45, cy), str(s["certificate"]), fontsize=8)
            if s.get("value"): pageF.insert_text((95, cy), str(s["value"]), fontsize=8)
            if s.get("shares"): pageF.insert_text((165, cy), str(s["shares"]), fontsize=8)
            if s.get("name"): pageF.insert_text((215, cy), str(s["name"]), fontsize=9)
            if s.get("address"): pageF.insert_text((415, cy), str(s["address"]), fontsize=7)

        # Firma
        sig_label = find_label_rect(pageF, ["Signature of applicant", "Firma"], 600, 1000)
        if sig_label:
            if data.get("declarationName"): pageF.insert_text((150, sig_label.y1 + 105), str(data["declarationName"]), fontsize=10, fontname="Helvetica-Bold")
            if data.get("declarationDate"): pageF.insert_text((220, sig_label.y1 + 138), str(data["declarationDate"]), fontsize=10)

        if 'src_doc' in locals(): src_doc.close()

    # --- ZONA PROTEGIDA: SFAR ---
    else:
        page1 = doc[0]
        def find_y_legacy(words, keywords, min_y=0, max_y=1000):
            for w in words:
                wn = normalize(w[4])
                if any(normalize(kw) in wn for kw in keywords):
                    yc = (w[1] + w[3]) / 2 + 3
                    if min_y <= yc <= max_y: return yc
            return None

        words = page1.get_text("words")
        config = master_config.get(template_name, master_config["referencia_maestra"])
        for entry in config.get("anchors", []):
            if entry["data_key"] in data and data[entry["data_key"]]:
                fy = find_y_legacy(words, entry["keywords"], entry["min_y"], entry["max_y"])
                if fy:
                    xv = config.get(entry["x_key"], 300) if isinstance(entry["x_key"], str) else entry["x_key"]
                    page1.insert_text((xv, fy), str(data[entry["data_key"]]), fontsize=10, fontname="Helvetica")

        if data.get("custodyAddress"):
            yfl = find_y_legacy(words, ["direccion", "address"], 700)
            if yfl: page1.insert_text((142, yfl), str(data["custodyAddress"]), fontsize=10, fontname="Helvetica")

        # Checkboxes SFAR
        f_d = str(data.get("fundsSource", [])).lower()
        checks = {"personal_assets": (74.5, 376.5), "financial_investments": (74.5, 388.0), "business": (74.5, 399.5), "loans": (74.5, 411.0), "inheritance": (74.5, 422.5)}
        for key, pos in checks.items():
            if key in f_d or (key == "personal_assets" and "personal" in f_d):
                page1.insert_text(pos, "X", fontsize=7, fontname="Helvetica")

        if len(doc) > 1:
            if data.get("signerName"): doc[1].insert_text((153, 352), str(data["signerName"]), fontsize=11, fontname="Helvetica")
            if data.get("date"): doc[1].insert_text((139, 378), str(data["date"]), fontsize=11, fontname="Helvetica")

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
            with open(config_path, 'r', encoding='utf-8') as f:
                master_conf = json.load(f)
        fill_pdf_universal_engine(input_data.get("data", {}), input_data.get("output_path", "filled_temp.pdf"), input_data.get("template_name", "referencia_maestra"), master_conf, input_data.get("custom_template_path"))
        print(input_data.get("output_path", "filled_temp.pdf"))
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        try:
            with open(os.path.join(log_dir, "last_pdf_error.txt"), "w", encoding="utf-8") as lf:
                lf.write(err_msg)
        except: pass
        print(f"ERROR_PY: {str(e)}", file=sys.stderr)
        sys.exit(1)
