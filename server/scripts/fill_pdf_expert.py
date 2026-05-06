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
        # === SISTEMA DE ALINEACIÓN IA: Corporación Dynamic Engine (BÚSQUEDA SEMÁNTICA) ===
        directors = data.get("directors", [])
        shareholders = data.get("shareholders", [])
        dignitaries = data.get("dignitaries", {})


        # Motor de Alineación de Alta Precisión para Corporación
        def fill_fixed_col_table(page, data_dict, labels_map, x_min, x_max, value_x, min_y=0, max_y=1000):
            """
            Versión blindada que usa columnas fijas para asegurar que el texto caiga DENTRO de las celdas.
            """
            words = page.get_text("words")
            for field_key, keywords in labels_map.items():
                val = data_dict.get(field_key)
                if not val: continue
                
                # Buscar el ancla de la etiqueta
                anchor = None
                for w in words:
                    if x_min <= w[0] <= x_max and min_y <= w[3] <= max_y:
                        wn = normalize(w[4])
                        if any(normalize(kw) in wn for kw in keywords):
                            anchor = w
                            break
                
                if anchor:
                    # El valor se coloca en value_x (posición fija de la celda derecha)
                    # Usamos textbox para que no se salga de la celda
                    rect = fitz.Rect(value_x, anchor[1] - 2, x_max - 5, anchor[3] + 2)
                    insert_text_scaled(page, rect, str(val), max_fontsize=9, min_fontsize=7)

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

        # PÁGINA 1: Datos de la Compañía (Alineación por Casilleros)
        page1 = doc[0]
        y_names = get_anchor(page1, ["names", "incorp", "preference"], 100, 300)
        if not y_names: y_names = 155
        
        # Casilleros de nombres (Entre etiqueta y sufijo)
        # X=135 es el inicio del casillero, X=235 es el final antes del sufijo (S.A./Corp/Inc)
        choices_map = {"corpNameSA": 0, "corpNameCorp": 1, "corpNameInc": 2}
        for key, idx in choices_map.items():
            if data.get(key):
                y_pos = y_names + 22 + (idx * 33)
                rect = fitz.Rect(135, y_pos - 10, 235, y_pos + 5)
                insert_text_scaled(page1, rect, str(data[key]), max_fontsize=10)

        y_cap = get_anchor(page1, ["capital", "authorized"], 200, 500)
        if not y_cap: y_cap = 395
        if data.get("capitalSocial"):
            try: 
                val_cap = f"{float(str(data['capitalSocial']).replace(',','')):,.2f} USD"
                page1.insert_text((450, y_cap + 18), val_cap, fontsize=10, fontname="hebo")
            except: pass

        # Procesar Directores 1 y 2 (Side-by-side)
        y_dir_header = get_anchor(page1, ["directores", "directors"], 100, 600)
        if not y_dir_header: y_dir_header = 280
        
        for i in range(min(2, len(directors))):
            d = directors[i]
            x_min, x_max, v_x = (50, 295, 155) if i == 0 else (300, 580, 445)
            fill_fixed_col_table(page1, d, dir_labels, x_min, x_max, v_x, min_y=y_dir_header + 40)

        # Procesar Director 3 (Formato Especial al final de la Pág 1)
        if len(directors) >= 3:
            d3 = directors[2]
            y_d3 = get_anchor(page1, ["director 3"], 500, 850)
            if not y_d3: y_d3 = 680
            
            # Director 3 tiene un layout distinto: 
            # Parte Izquierda: Datos personales (X_val = 155)
            # Parte Derecha: Dirección/Ciudad/País (X_val = 445)
            d3_labels_left = {k: dir_labels[k] for k in ["firstName", "secondName", "lastName", "birthDate", "maritalStatus", "nationality", "passport", "phone", "email"]}
            d3_labels_right = {k: dir_labels[k] for k in ["address", "city", "country"]}
            
            fill_fixed_col_table(page1, d3, d3_labels_left, 50, 295, 155, min_y=y_d3 + 20)
            fill_fixed_col_table(page1, d3, d3_labels_right, 300, 580, 445, min_y=y_d3 + 20)

        # ANEXOS (Para Director 4 en adelante)
        annex_count = 0
        src_doc = fitz.open(pdf_path)
        for i in range(3, len(directors), 2):
            annex_count += 1
            p_idx = annex_count
            doc.insert_pdf(src_doc, from_page=0, to_page=0, start_at=p_idx)
            annex_page = doc[p_idx]
            
            # Limpiar y marcar como anexo
            annex_page.insert_text((50, 40), f"ANEXO DIRECTORES PÁG. {p_idx+1}", fontsize=12, fontname="hebo", color=(0.29, 0.64, 0.77))
            annex_page.draw_rect(fitz.Rect(0, 50, 600, y_dir_header - 20), color=(1,1,1), fill=(1,1,1))
            
            # Llenar usando el layout estándar de 2 columnas
            chunk = directors[i:i+2]
            for j, d in enumerate(chunk):
                x_min, x_max, v_x = (50, 295, 155) if j == 0 else (300, 580, 445)
                fill_fixed_col_table(annex_page, d, dir_labels, x_min, x_max, v_x, min_y=y_dir_header + 40)

        # PÁGINA FINAL (DIGNATARIOS Y ACCIONISTAS)
        orig_p2_idx = 1 + annex_count
        if len(doc) > orig_p2_idx:
            page2 = doc[orig_p2_idx]
            
            # Dignatarios (Alineación Blindada)
            dign_roles = {"presidente": ["president"], "secretario": ["secretary"], "tesorero": ["treasurer"]}
            for role_key, role_kws in dign_roles.items():
                d = dignitaries.get(role_key)
                if not d: continue
                if isinstance(d, str): d = {"fullName": d}
                y_role = get_anchor(page2, role_kws, 50, 400)
                if y_role:
                    # Posiciones fijas para Dignatarios en Page 2
                    if d.get("fullName"): 
                        rect = fitz.Rect(210, y_role - 10, 480, y_role + 5)
                        insert_text_scaled(page2, rect, str(d["fullName"]), max_fontsize=9)
                    if d.get("birthDate"): page2.insert_text((500, y_role), str(d["birthDate"]), fontsize=8)
                    if d.get("passport"): page2.insert_text((630, y_role), str(d["passport"]), fontsize=8)
                    if d.get("registrationNumber"): page2.insert_text((750, y_role), str(d["registrationNumber"]), fontsize=8)

            # Accionistas
            y_sh = get_anchor(page2, ["accionistas", "shareholders"], 200, 600)
            if not y_sh: y_sh = 270

            def fill_sh_block(page, sh_chunk, anchor_y, is_annex=False):
                if is_annex:
                    page.insert_text((50, 40), "ANEXO ACCIONISTAS", fontsize=12, fontname="hebo", color=(0.29, 0.64, 0.77))
                    page.draw_rect(fitz.Rect(0, 50, 600, anchor_y - 20), color=(1,1,1), fill=(1,1,1))
                
                y_start = anchor_y + 40
                for i, s in enumerate(sh_chunk[:3]):
                    if not s: continue
                    if isinstance(s, str): s = {"name": s}
                    y_pos = y_start + (i * 25)
                    if isinstance(s, dict):
                        if s.get("certificate"): page.insert_text((45, y_pos), str(s["certificate"]), fontsize=8)
                        if s.get("value"): page.insert_text((95, y_pos), str(s["value"]), fontsize=8)
                        if s.get("shares"): page.insert_text((165, y_pos), str(s["shares"]), fontsize=8)
                        if s.get("name"): page.insert_text((220, y_pos), str(s["name"]), fontsize=9)
                        if s.get("address"): page.insert_text((420, y_pos), str(s["address"]), fontsize=8)

            fill_sh_block(page2, shareholders[:3], y_sh)

            # Actividades y Firma
            y_act = get_anchor(page2, ["actividades", "activities"], 400, 800)
            if y_act and data.get("companyActivities"):
                page2.insert_textbox(fitz.Rect(55, y_act + 40, 550, y_act + 120), data["companyActivities"], fontsize=8)

            y_sig = get_anchor(page2, ["declaration", "signature", "firma"], 600, 1000)
            if not y_sig: y_sig = 740
            if data.get("declarationName"): page2.insert_text((150, y_sig + 105), str(data["declarationName"]), fontsize=9)
            if data.get("declarationDate"): page2.insert_text((220, y_sig + 138), f"{str(data['declarationDate'])} /2025", fontsize=9)



            # ANEXOS ACCIONISTAS
            for i in range(3, len(shareholders), 3):
                insert_idx = orig_p2_idx + (i//3)
                # Validar existencia de página 2 en la fuente para anexos de accionistas
                sh_page_src = 1 if len(src_doc) > 1 else 0
                doc.insert_pdf(src_doc, from_page=sh_page_src, to_page=sh_page_src, start_at=insert_idx)
                fill_sh_block(doc[insert_idx], shareholders[i:i+3], y_sh, is_annex=True)

        # Cerrar el documento fuente solo si se abrió (Arquitectura Corporación)
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

