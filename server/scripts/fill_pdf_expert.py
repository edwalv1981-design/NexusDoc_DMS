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

    # === LÓGICA CORPORACIÓN (ARQUITECTO SE        # === SISTEMA DE ALINEACIÓN IA: Corporación Dynamic Engine (PRECISIÓN ABSOLUTA) ===
        registry_path = os.path.join(base_dir, "templates", "coordinate_registry.json")
        try:
            with open(registry_path, 'r', encoding='utf-8') as rf:
                reg = json.load(rf).get("corporacion_2025", {})
        except: reg = {}

        directors = data.get("directors", [])
        shareholders = data.get("shareholders", [])
        dignitaries = data.get("dignitaries", {})

        def fill_director_block(page, d, anchor_y, col_idx):
            cfg = reg.get("directors_section", {})
            x_base = cfg.get("col_0_x", 135) if col_idx == 0 else cfg.get("col_1_x", 425)
            w = cfg.get("width", 150)
            offsets = cfg.get("field_offsets", {})
            
            for field, off in offsets.items():
                val = d.get(field)
                if val:
                    # Alineación milimétrica con celdas pre-impresas
                    rect = fitz.Rect(x_base, anchor_y + off - 6, x_base + w, anchor_y + off + 6)
                    insert_text_scaled(page, rect, str(val), max_fontsize=9)

        def process_directors_page(page, d_chunk, p_idx, is_annex=False):
            y_banner = get_anchor(page, ["directores", "directors"], 300, 600)
            if not y_banner: y_banner = 485 # Fallback basado en imagen
            
            # SOLO inyectar "ANEXO" si no es la página principal
            if is_annex:
                page.insert_text((50, 40), f"ANEXO PÁG. {p_idx}", fontsize=12, fontname="hebo", color=(0.29, 0.64, 0.77))
            
            # Inyectar datos en celdas pre-existentes (Sin dibujar cajas nuevas)
            for i, d in enumerate(d_chunk):
                col = i % 2
                row = i // 2
                curr_y = y_banner + 10 if row == 0 else y_banner + 280
                fill_director_block(page, d, curr_y, col)

        # PÁGINA 1: Datos de la Compañía
        page1 = doc[0]
        y_names = get_anchor(page1, ["names", "incorp", "preference"], 100, 300)
        if not y_names: y_names = 150
        
        # Inyectar nombres (Alineados con 1st, 2nd, 3rd choice)
        choices = ["corpNameSA", "corpNameCorp", "corpNameInc"]
        for i, c in enumerate(choices):
            val = data.get(c)
            if val:
                page1.insert_text((240, y_names + 22 + (i * 35)), str(val), fontsize=10, fontname="hebo")
        
        # Capital Social
        y_cap = get_anchor(page1, ["capital", "authorized"], 300, 500)
        if not y_cap: y_cap = 395
        if data.get("capitalSocial"):
            try:
                cap_val = f"{float(str(data['capitalSocial']).replace(',','')):,.2f} USD"
                page1.insert_text((450, y_cap + 18), cap_val, fontsize=10, fontname="hebo")
            except: pass

        # Procesar directores en página 1 (Ya vienen pre-impresos los cuadros)
        process_directors_page(page1, directors[:2], 1)

        # ANEXOS (Si hay más de 2 directores)
        annex_count = 0
        src_doc = fitz.open(pdf_path)
        for i in range(2, len(directors), 2):
            annex_count += 1
            p_idx = annex_count
            doc.insert_pdf(src_doc, from_page=0, to_page=0, start_at=p_idx)
            process_directors_page(doc[p_idx], directors[i:i+2], p_idx + 1, is_annex=True)

        # PÁGINA FINAL (DIGNATARIOS Y ACCIONISTAS)
        orig_p2_idx = 1 + annex_count
        if len(doc) > orig_p2_idx:
            page2 = doc[orig_p2_idx]
            y_dig = get_anchor(page2, ["dignatarios", "officers"], 50, 200)
            if not y_dig: y_dig = 118
            
            # Dignatarios (Alineación con tabla pre-impresa)
            roles = {"presidente": 58, "secretario": 78, "tesorero": 98}
            for role, off in roles.items():
                if role in dignitaries:
                    d = dignitaries[role]
                    if not d: continue
                    if isinstance(d, str): d = {"fullName": d}
                    y_row = y_dig + off
                    if isinstance(d, dict):
                        if d.get("fullName"): page2.insert_text((185, y_row), str(d["fullName"]), fontsize=9)
                        if d.get("birthDate"): page2.insert_text((595, y_row), str(d["birthDate"]), fontsize=8) # Basado en imagen p3
                        if d.get("passport"): page2.insert_text((710, y_row), str(d["passport"]), fontsize=8)
                        if d.get("registrationNumber"): page2.insert_text((810, y_row), str(d["registrationNumber"]), fontsize=8)

            y_sh = get_anchor(page2, ["accionistas", "shareholders"], 200, 400)
            if not y_sh: y_sh = 270

            def fill_sh_block(page, sh_chunk, anchor_y, is_annex=False):
                y_start = anchor_y + 65
                for i, s in enumerate(sh_chunk[:3]):
                    if not s: continue
                    if isinstance(s, str): s = {"name": s}
                    y_pos = y_start + (i * 45)
                    if isinstance(s, dict):
                        if s.get("certificate"): page.insert_text((45, y_pos), str(s["certificate"]), fontsize=8)
                        if s.get("value"): page.insert_text((95, y_pos), str(s["value"]), fontsize=8)
                        if s.get("shares"): page.insert_text((165, y_pos), str(s["shares"]), fontsize=8)
                        if s.get("name"): page.insert_text((220, y_pos), str(s["name"]), fontsize=9)
                        if s.get("address"): page.insert_text((420, y_pos), str(s["address"]), fontsize=8)

            fill_sh_block(page2, shareholders[:3], y_sh)

            # Actividades y Firma
            y_act = get_anchor(page2, ["actividades", "activities"], 400, 600)
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


    # === LÓGICA FONDOS / GENÉRICO (RESTAURADA PARA MÁXIMA PRECISIÓN) ===

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
        # Log persistente para diagnóstico nivel experto
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../scratch/last_pdf_error.txt")
        try:
            with open(log_path, "w", encoding="utf-8") as lf:
                lf.write(err_msg)
        except: pass
        print(f"ERROR_PY: {str(e)}", file=sys.stderr)
        sys.exit(1)

