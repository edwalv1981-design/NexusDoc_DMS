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

def insert_text_scaled(page, rect, text, fontname="helv", max_fontsize=9, min_fontsize=6, color=(0,0,0)):
    """Inserta texto escalando la fuente automáticamente para que quepa en el recuadro."""
    if not text: return
    text = str(text)
    fontsize = max_fontsize
    # Estimar ancho (aprox 0.5 * fontsize por carácter en Helvetica)
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
    
    # 1. DETERMINAR PLANTILLA BASE
    if custom_template_path and os.path.exists(custom_template_path):
        pdf_path = custom_template_path
    else:
        # Fallback a la maestra si no hay específica
        pdf_path = os.path.join(base_dir, "templates", "referencia_maestra.pdf")
    
    if not os.path.exists(pdf_path):
        raise Exception(f"No se encontró el archivo base PDF en: {pdf_path}")

    doc = fitz.open(pdf_path)
    
    # --- MOTOR DE ANCLAJE SEMÁNTICO EXPERTO ---
    def get_anchor(page, keywords, min_y=0, max_y=1000):
        p_words = page.get_text("words")
        for w in p_words:
            if min_y <= w[1] <= max_y:
                word_norm = normalize(w[4])
                for kw in keywords:
                    if normalize(kw) in word_norm:
                        return w[3] # Retorna el límite inferior del banner
        return None

    # === LÓGICA CORPORACIÓN (ARQUITECTO SENIOR - PRECISIÓN ABSOLUTA) ===
    if template_name == "corporacion" or "corpNameSA" in data:
        directors = data.get("directors", [])
        shareholders = data.get("shareholders", [])
        dignitaries = data.get("dignitaries", {})

        # === MOTOR DE CELDAS INTELIGENTES (ALINEACIÓN PIXEL-PERFECT) ===
        def fill_smart_grid(page, data_dict, labels_map, x_min, x_max, val_x_offset, min_y=0, max_y=1000):
            """
            Localiza la etiqueta y escribe el valor en la celda de la derecha, 
            centrando verticalmente el texto en la fila.
            """
            words = page.get_text("words")
            for field_key, keywords in labels_map.items():
                val = data_dict.get(field_key)
                if not val: continue
                
                # 1. Buscar ancla de la etiqueta
                anchor = None
                for w in words:
                    if x_min <= w[0] <= x_max and min_y <= w[1] <= max_y:
                        wn = normalize(w[4])
                        if any(normalize(kw) in wn for kw in keywords):
                            anchor = w
                            break
                
                if anchor:
                    # 2. Definir Rectángulo de la Celda (Donde va el valor)
                    # El valor empieza en val_x_offset y termina en el borde de la columna
                    row_height = anchor[3] - anchor[1]
                    # Centrado vertical: y1 - 2 suele ser la línea base perfecta
                    rect = fitz.Rect(val_x_offset, anchor[1] - 1, x_max - 5, anchor[3] + 1)
                    insert_text_scaled(page, rect, str(val), max_fontsize=8, min_fontsize=6)

        dir_labels = {
            "firstName": ["first", "nombre"],
            "secondName": ["middle", "segundo"],
            "lastName": ["surname", "apellidos"],
            "birthDate": ["birth", "nacimiento"],
            "maritalStatus": ["marital", "estado"],
            "nationality": ["citizenship", "nacionalidad"],
            "passport": ["passport", "pasaporte"],
            "phone": ["phone", "teléfono", "telefono"],
            "email": ["email", "correo"],
            "address": ["address", "dirección", "direccion"],
            "city": ["city", "ciudad"],
            "country": ["country", "país", "pais"]
        }

        # --- PÁGINA 1: ESTRUCTURA PRINCIPAL ---
        page1 = doc[0]
        
        # 1. Nombres (Choices) - Alineación Estricta
        y_names = get_anchor(page1, ["names", "incorp", "preference"], 100, 300) or 155
        choices_cfg = {"corpNameSA": 0, "corpNameCorp": 1, "corpNameInc": 2}
        for key, idx in choices_cfg.items():
            if data.get(key):
                y_row = y_names + 23 + (idx * 33.5)
                # Box exacto entre etiqueta y S.A./Corp/Inc
                rect = fitz.Rect(132, y_row - 10, 230, y_row + 5)
                insert_text_scaled(page1, rect, str(data[key]), max_fontsize=10)

        # 2. Capital Social (Blindaje de Posición)
        y_cap = get_anchor(page1, ["capital", "authorized"], 200, 500) or 395
        if data.get("capitalSocial"):
            try:
                # Escribir en el casillero blanco a la derecha del label "10.000 USD"
                val_cap = f"{float(str(data['capitalSocial']).replace(',','')):,.2f} USD"
                # El casillero está aproximadamente en X=450
                page1.insert_text((450, y_cap + 18), val_cap, fontsize=10, fontname="helv")
            except: pass

        # 3. Directores 1 y 2 (Columnas Gemelas)
        y_dir = get_anchor(page1, ["directores", "directors"], 100, 600) or 280
        for i in range(min(2, len(directors))):
            d = directors[i]
            x_min, x_max, val_x = (50, 298, 155) if i == 0 else (300, 590, 445)
            fill_smart_grid(page1, d, dir_labels, x_min, x_max, val_x, min_y=y_dir + 30)

        # 4. Director 3 (Fondo de Pág 1 - Split Layout)
        if len(directors) >= 3:
            d3 = directors[2]
            y_d3 = get_anchor(page1, ["director 3"], 600, 850) or 685
            # Lado Izquierdo (Datos Personales)
            labels_p1 = ["firstName", "secondName", "lastName", "birthDate", "maritalStatus", "nationality", "passport", "phone", "email"]
            fill_smart_grid(page1, d3, {k:dir_labels[k] for k in labels_p1}, 50, 298, 155, min_y=y_d3 + 10)
            # Lado Derecho (Ubicación)
            labels_p2 = ["address", "city", "country"]
            fill_smart_grid(page1, d3, {k:dir_labels[k] for k in labels_p2}, 300, 590, 445, min_y=y_d3 + 10)

        # --- ANEXOS (DIRECTORES 4+) ---
        src_doc = fitz.open(pdf_path)
        annex_count = 0
        for i in range(3, len(directors), 2):
            annex_count += 1
            doc.insert_pdf(src_doc, from_page=0, to_page=0, start_at=annex_count)
            annex_page = doc[annex_count]
            # Limpiar contenido original de Pág 1 para convertirla en Anexo limpio
            annex_page.draw_rect(fitz.Rect(0, 0, 600, 1000), color=(1,1,1), fill=(1,1,1))
            annex_page.insert_text((50, 50), f"ANEXO DIRECTORES (PÁG {annex_count + 1})", fontsize=14, fontname="helv", color=(0.2, 0.4, 0.6))
            
            chunk = directors[i:i+2]
            for j, d in enumerate(chunk):
                x_off = 50 if j == 0 else 310
                y_off = 100
                annex_page.insert_text((x_off, y_off), f"DIRECTOR #{i + j + 1}", fontsize=10, fontname="helv-bold")
                for k, (label_key, kws) in enumerate(dir_labels.items()):
                    lab_txt = f"{label_key}:"
                    annex_page.insert_text((x_off, y_off + 20 + (k*18)), lab_txt, fontsize=8, fontname="helv")
                    annex_page.insert_text((x_off + 80, y_off + 20 + (k*18)), str(d.get(label_key, "")), fontsize=8, fontname="helv")

        # --- PÁGINA FINAL (DIGNATARIOS, ACCIONISTAS, FIRMA) ---
        p_final_idx = 1 + annex_count
        if len(doc) > p_final_idx:
            pageF = doc[p_final_idx]
            
            # 1. Dignatarios (Con Fecha y Pasaporte)
            dign_map = {"presidente": ["president"], "secretario": ["secretary"], "tesorero": ["treasurer"]}
            for role_key, kws in dign_map.items():
                d = dignitaries.get(role_key)
                if not d: continue
                y_row = get_anchor(pageF, kws, 50, 400)
                if y_row:
                    if d.get("fullName"): pageF.insert_text((215, y_row), str(d["fullName"]), fontsize=9)
                    if d.get("birthDate"): pageF.insert_text((495, y_row), str(d["birthDate"]), fontsize=8)
                    if d.get("passport"): pageF.insert_text((620, y_row), str(d["passport"]), fontsize=8)
                    if d.get("registrationNumber"): pageF.insert_text((740, y_row), str(d["registrationNumber"]), fontsize=8)

            # 2. Accionistas (Alineación Mejorada)
            y_sh = get_anchor(pageF, ["accionistas", "shareholders"], 200, 600) or 270
            def fill_sh_list(p, sh_chunk, start_y):
                for i, s in enumerate(sh_chunk):
                    if not s: continue
                    curr_y = start_y + 40 + (i * 24)
                    if s.get("certificate"): p.insert_text((45, curr_y), str(s["certificate"]), fontsize=8)
                    if s.get("value"): p.insert_text((95, curr_y), str(s["value"]), fontsize=8)
            # 2. Accionistas (Alineación Mejorada)
            y_sh = get_anchor(pageF, ["accionistas", "shareholders"], 200, 600) or 270
            
            def fill_sh_block_clean(p, sh_chunk, start_y, is_annex=False):
                if is_annex:
                    p.insert_text((50, 40), "ANEXO ACCIONISTAS", fontsize=12, fontname="helv", color=(0.29, 0.64, 0.77))
                    p.draw_rect(fitz.Rect(0, 50, 600, start_y - 20), color=(1,1,1), fill=(1,1,1))
                
                for i, s in enumerate(sh_chunk):
                    if not s: continue
                    curr_y = start_y + 40 + (i * 24)
                    if s.get("certificate"): p.insert_text((45, curr_y), str(s["certificate"]), fontsize=8)
                    if s.get("value"): p.insert_text((95, curr_y), str(s["value"]), fontsize=8)
                    if s.get("shares"): p.insert_text((165, curr_y), str(s["shares"]), fontsize=8)
                    if s.get("name"): p.insert_text((215, curr_y), str(s["name"]), fontsize=9)
                    if s.get("address"): p.insert_text((415, curr_y), str(s["address"]), fontsize=7)

            fill_sh_block_clean(pageF, shareholders[:4], y_sh)

            # 3. Actividades y Declaración (Blindaje)
            y_act = get_anchor(pageF, ["actividades", "activities"], 400, 800)
            if y_act and data.get("companyActivities"):
                pageF.insert_textbox(fitz.Rect(55, y_act + 40, 550, y_act + 120), data["companyActivities"], fontsize=8)

            y_sig = get_anchor(pageF, ["declaration", "firma"], 600, 1000) or 740
            if data.get("declarationName"): 
                pageF.insert_text((150, y_sig + 105), str(data["declarationName"]), fontsize=10, fontname="helv-bold")
            if data.get("declarationDate"): 
                pageF.insert_text((220, y_sig + 138), f"{str(data['declarationDate'])}", fontsize=10)

            # 4. ANEXOS ACCIONISTAS (4+)
            for i in range(4, len(shareholders), 4):
                sh_annex_idx = 1 + annex_count + ((i-4)//4 + 1)
                sh_page_src = 1 if len(src_doc) > 1 else 0
                doc.insert_pdf(src_doc, from_page=sh_page_src, to_page=sh_page_src, start_at=sh_annex_idx)
                fill_sh_block_clean(doc[sh_annex_idx], shareholders[i:i+4], y_sh, is_annex=True)

        # Cerrar el documento fuente
        if 'src_doc' in locals():
            src_doc.close()


    # ══════════════════════════════════════════════════════════════════════════════
    # ██████  ZONA PROTEGIDA — NO MODIFICAR ██████████████████████████████████████
    # ██  FORMULARIO: Fondos Registros Contables / Declaración (SFAR)           ██
    # ██  ESTADO: PRODUCCIÓN CERTIFICADA — ALINEACIÓN VALIDADA POR USUARIO      ██
    # ██  FECHA BLINDAJE: 2026-05-06                                             ██
    # ██  CUALQUIER CAMBIO EN ESTE BLOQUE REQUIERE APROBACIÓN EXPLÍCITA         ██
    # ══════════════════════════════════════════════════════════════════════════════
    else:
        page1 = doc[0]
        words = page1.get_text("words")
        config = master_config.get(template_name, master_config["referencia_maestra"])
        
        def find_y_legacy(keywords, min_y=0, max_y=1000):
            for w in words:
                word_norm = normalize(w[4])
                for kw in keywords:
                    if normalize(kw) in word_norm:
                        y_center = (w[1] + w[3]) / 2 + 3
                        if min_y <= y_center <= max_y:
                            return y_center
            return None

        for entry in config.get("anchors", []):
            key = entry["data_key"]
            if key in data and data[key]:
                fy = find_y_legacy(entry["keywords"], min_y=entry["min_y"], max_y=entry["max_y"])
                if fy:
                    x_val = config.get(entry["x_key"], 300) if isinstance(entry["x_key"], str) else entry["x_key"]
                    page1.insert_text((x_val, fy), str(data[key]), fontsize=10, fontname="helv")

        # Fallback para Dirección Final (Fondos)
        y_final_label = find_y_legacy(["direccion", "address"], min_y=700)
        if y_final_label and data.get("custodyAddress"):
            page1.insert_text((142, y_final_label), str(data["custodyAddress"]), fontsize=10, fontname="helv")

        # === BLINDAJE DE LÓGICA: Checkboxes Procedencia de Fondos (Máxima Alineación) ===
        f_d = str(data.get("fundsSource", [])).lower()
        # === SISTEMA DE ALINEACIÓN IA: Registro de Coordenadas Blindado ===
        registry_path = os.path.join(base_dir, "templates", "coordinate_registry.json")
        try:
            with open(registry_path, 'r', encoding='utf-8') as rf:
                ai_registry = json.load(rf)
                checks_cfg = ai_registry.get("fondos_sfar", {}).get("checkboxes", {})
        except:
            # Fallback de seguridad si el JSON falla
            checks_cfg = {
                "personal_assets": {"x": 74.5, "y": 376.5, "font_size": 7},
                "financial_investments": {"x": 74.5, "y": 388.0, "font_size": 7},
                "business": {"x": 74.5, "y": 399.5, "font_size": 7},
                "loans": {"x": 74.5, "y": 411.0, "font_size": 7},
                "inheritance": {"x": 74.5, "y": 422.5, "font_size": 7}
            }

        f_d = str(data.get("fundsSource", [])).lower()
        if "personal" in f_d: page1.insert_text((checks_cfg["personal_assets"]["x"], checks_cfg["personal_assets"]["y"]), "X", fontsize=checks_cfg["personal_assets"]["font_size"], fontname="helv")
        if "finan" in f_d: page1.insert_text((checks_cfg["financial_investments"]["x"], checks_cfg["financial_investments"]["y"]), "X", fontsize=checks_cfg["financial_investments"]["font_size"], fontname="helv")
        if "negocio" in f_d: page1.insert_text((checks_cfg["business"]["x"], checks_cfg["business"]["y"]), "X", fontsize=checks_cfg["business"]["font_size"], fontname="helv")
        if "prestamo" in f_d or "loan" in f_d: page1.insert_text((checks_cfg["loans"]["x"], checks_cfg["loans"]["y"]), "X", fontsize=checks_cfg["loans"]["font_size"], fontname="helv")
        if "herencia" in f_d or "inheritance" in f_d: page1.insert_text((checks_cfg["inheritance"]["x"], checks_cfg["inheritance"]["y"]), "X", fontsize=checks_cfg["inheritance"]["font_size"], fontname="helv")
        # ==============================================================================







        # ==============================================================================










        # Página 2 (Firmas - Fondos)
        if len(doc) > 1:
            if data.get("signerName"):
                doc[1].insert_text((153, 352), str(data["signerName"]), fontsize=11, fontname="helv")
            if data.get("date"):
                doc[1].insert_text((139, 378), str(data["date"]), fontsize=11, fontname="helv")

    # Guardado seguro y aplanado (non-editable)
    doc.save(output_path, incremental=False, encryption=0)
    doc.close()

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input)
        
        # Cargar configuración de templates
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        config_path = os.path.join(base_dir, "templates", "templates_config.json")
        master_conf = {}
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                master_conf = json.load(f)
            
        fill_pdf_universal_engine(
            input_data.get("data", {}), 
            input_data.get("output_path", "filled_temp.pdf"), 
            input_data.get("template_name", "referencia_maestra"), 
            master_conf,
            input_data.get("custom_template_path")
        )
        # Imprimir solo la ruta del archivo generado para que Node la reciba
        print(input_data.get("output_path", "filled_temp.pdf"))
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        # Log persistente para diagnóstico nivel experto (guardado en server/)
        log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        log_path = os.path.join(log_dir, "last_pdf_error.txt")
        try:
            with open(log_path, "w", encoding="utf-8") as lf:
                lf.write(err_msg)
        except: pass
        print(f"ERROR_PY: {str(e)}", file=sys.stderr)
        sys.exit(1)

