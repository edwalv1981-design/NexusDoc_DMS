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
    page.insert_text((rect.x0, rect.y1 - 2), text, fontsize=fontsize, fontname=fontname, color=color)

def fill_pdf_universal_engine(data, output_path, template_name, master_config, custom_template_path=None):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    pdf_path = custom_template_path if (custom_template_path and os.path.exists(custom_template_path)) else os.path.join(base_dir, "templates", "referencia_maestra.pdf")
    if not os.path.exists(pdf_path): raise Exception(f"No PDF at {pdf_path}")
    
    doc = fitz.open(pdf_path)

    # ══════════════════════════════════════════════════════════════════════════════
    # ██████  LÓGICA CORPORACIÓN (MODO EXPERTO - ALINEACIÓN DE ALTA FIDELIDAD) █████
    # ══════════════════════════════════════════════════════════════════════════════
    if template_name == "corporacion" or "corpNameSA" in data:
        directors = data.get("directors", [])
        shareholders = data.get("shareholders", [])
        dignitaries = data.get("dignitaries", {})

        def get_y(page, keywords, min_y=0, max_y=1000, x_range=(0,600)):
            for kw in keywords:
                insts = page.search_for(kw)
                for inst in insts:
                    if min_y <= inst.y1 <= max_y and x_range[0] <= inst.x0 <= x_range[1]:
                        return inst.y1
            return None

        page1 = doc[0]
        
        # 1. NOMBRES DE COMPAÑÍA (CHOICES)
        # Ancla: "1st choice"
        y_c1 = get_y(page1, ["1st choice"], 100, 300) or 173
        for i, key in enumerate(["corpNameSA", "corpNameCorp", "corpNameInc"]):
            val = data.get(key)
            if val:
                # El espaciado entre líneas de choice es exactamente 27.5 puntos
                y_row = y_c1 + (i * 27.5)
                rect = fitz.Rect(138, y_row - 12, 420, y_row + 2)
                insert_text_scaled(page1, rect, str(val), max_fontsize=10)

        # 2. CAPITAL SOCIAL (CORRECCIÓN TOTAL)
        # Ancla: "Authorized Capital"
        y_cap = get_y(page1, ["Authorized Capital", "Capital Social"], 250, 450) or 310
        if data.get("capitalSocial"):
            try:
                val_cap = f"{float(str(data['capitalSocial']).replace(',','')):,.2f} USD"
                # El recuadro blanco está a la derecha del texto "10.000 USD"
                page1.insert_text((585, y_cap + 2), val_cap, fontsize=10, fontname="Helvetica-Bold")
            except: pass

        # 3. DIRECTORES (GRID REFORZADO)
        # Definimos los offsets verticales exactos para evitar colisiones
        # El grid tiene filas de 19.5 puntos cada una
        row_offsets = [
            ("firstName", 0), ("secondName", 19.5), ("lastName", 39),
            ("birthDate", 58.5), ("maritalStatus", 78), ("nationality", 97.5),
            ("passport", 117), ("phone", 136.5), ("email", 156),
            ("address", 175.5), ("city", 214), ("country", 233.5)
        ]

        def fill_dir_column(p, d_data, x_val, y_base):
            for key, off in row_offsets:
                val = d_data.get(key)
                if val:
                    # Centrado vertical mejorado
                    rect = fitz.Rect(x_val, y_base + off - 12, x_val + 130, y_base + off + 3)
                    insert_text_scaled(p, rect, str(val), max_fontsize=8)

        y_d1 = get_y(page1, ["Director 1"], 200, 600) or 445
        if len(directors) >= 1: fill_dir_column(page1, directors[0], 182, y_d1)
        if len(directors) >= 2: fill_dir_column(page1, directors[1], 462, y_d1)

        # 4. DIRECTOR 3 (CORRECCIÓN CITY)
        if len(directors) >= 3:
            d3 = directors[2]
            y_d3 = get_y(page1, ["Director 3"], 650, 950) or 775
            # Lado Izquierdo (Datos Personales)
            for key, off in row_offsets[:9]:
                val = d3.get(key)
                if val:
                    rect = fitz.Rect(182, y_d3 + off - 12, 300, y_d3 + off + 3)
                    insert_text_scaled(page1, rect, str(val), max_fontsize=8)
            # Lado Derecho (Ubicación)
            # El layout de D3 tiene la dirección a la derecha
            # "Address" está alineado con "Director 3"
            if d3.get("address"):
                rect = fitz.Rect(462, y_d3 - 12, 595, y_d3 + 12)
                insert_text_scaled(page1, rect, str(d3["address"]), max_fontsize=8)
            if d3.get("city"):
                rect = fitz.Rect(462, y_d3 + 27, 595, y_d3 + 42) # Fila City
                insert_text_scaled(page1, rect, str(d3["city"]), max_fontsize=8)
            if d3.get("country"):
                rect = fitz.Rect(462, y_d3 + 46, 595, y_d3 + 61) # Fila Country
                insert_text_scaled(page1, rect, str(d3["country"]), max_fontsize=8)

        # 5. ANEXOS Y PÁGINA FINAL
        src_doc = fitz.open(pdf_path)
        for i in range(3, len(directors)):
            doc.insert_pdf(src_doc, from_page=0, to_page=0, start_at=i-2)
            p = doc[i-2]
            p.draw_rect(fitz.Rect(0,0,600,1000), color=(1,1,1), fill=(1,1,1))
            p.insert_text((50, 50), f"ANEXO DIRECTORES - DIRECTOR #{i+1}", fontsize=12, fontname="Helvetica-Bold")
            cy = 100
            for k, _ in row_offsets:
                p.insert_text((60, cy), f"{k.upper()}:", fontsize=9, fontname="Helvetica-Bold")
                p.insert_text((200, cy), str(directors[i].get(k, "")), fontsize=9, fontname="Helvetica")
                cy += 20

        pageF = doc[len(doc)-1]
        # Dignatarios
        y_pres = get_y(pageF, ["President"], 50, 200) or 118
        for i, role in enumerate(["presidente", "secretario", "tesorero"]):
            d = dignitaries.get(role, {})
            y_row = y_pres + (i * 24.5)
            if d.get("fullName"): pageF.insert_text((215, y_row), str(d["fullName"]), fontsize=9)
            if d.get("birthDate"): pageF.insert_text((495, y_row), str(d["birthDate"]), fontsize=8)
            if d.get("passport"): pageF.insert_text((620, y_row), str(d["passport"]), fontsize=8)

        # Accionistas
        y_sh = get_y(pageF, ["Shareholders", "Accionistas"], 200, 600) or 298
        for i, s in enumerate(shareholders[:4]):
            cy = y_sh + 35 + (i * 24)
            if s.get("certificate"): pageF.insert_text((45, cy), str(s["certificate"]), fontsize=8)
            if s.get("value"): pageF.insert_text((95, cy), str(s["value"]), fontsize=8)
            if s.get("shares"): pageF.insert_text((165, cy), str(s["shares"]), fontsize=8)
            if s.get("name"): pageF.insert_text((215, cy), str(s["name"]), fontsize=9)
            if s.get("address"): pageF.insert_text((415, cy), str(s["address"]), fontsize=7)

        # Firma
        y_sig = get_y(pageF, ["Signature of applicant", "Firma"], 600, 1000) or 758
        if data.get("declarationName"): pageF.insert_text((150, y_sig + 92), str(data["declarationName"]), fontsize=10, fontname="Helvetica-Bold")
        if data.get("declarationDate"): pageF.insert_text((220, y_sig + 125), str(data["declarationDate"]), fontsize=10)

        if 'src_doc' in locals(): src_doc.close()

    # ══════════════════════════════════════════════════════════════════════════════
    # ██████  ZONA PROTEGIDA - FORMULARIO FONDOS (SFAR) ████████████████████████████
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
        
        # Checkboxes SFAR (Mapeo robusto por palabras clave en español)
        f_d = normalize(str(data.get("fundsSource", [])))
        checks = {
            "bienes": (74.5, 376.3), 
            "inversiones": (74.5, 387.8), 
            "negocios": (74.5, 399.3), 
            "prestamos": (74.5, 410.8), 
            "herencia": (74.5, 422.3)
        }
        for k, pos in checks.items():
            if k in f_d: 
                page1.insert_text(pos, "X", fontsize=8, fontname="Helvetica-Bold")
        
        # Dirección de Custodia (Búsqueda manual de coordenadas para evitar colisión con el Address de arriba)
        if data.get("custodyAddress"):
            # En el formulario SFAR, el segundo "Address:" está aproximadamente en y=750
            page1.insert_text((144, 755), str(data["custodyAddress"]), fontsize=10, fontname="Helvetica")

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
            with open(config_path, 'r', encoding='utf-8') as f: master_conf = json.load(f)
        fill_pdf_universal_engine(input_data.get("data", {}), input_data.get("output_path", "filled_temp.pdf"), input_data.get("template_name", "referencia_maestra"), master_conf, input_data.get("custom_template_path"))
        print(input_data.get("output_path", "filled_temp.pdf"))
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        try:
            with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "last_pdf_error.txt"), "w", encoding="utf-8") as lf: lf.write(err_msg)
        except: pass
        print(f"ERROR_PY: {str(e)}", file=sys.stderr)
        sys.exit(1)
