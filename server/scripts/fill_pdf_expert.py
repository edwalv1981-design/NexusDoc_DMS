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
    while fontsize > min_fontsize:
        text_width = fitz.get_text_length(text, fontname=fontname, fontsize=fontsize)
        if text_width <= rect.width:
            break
        fontsize -= 0.5
    
    # Punto de inserción (X inicial, Y base)
    page.insert_text((rect.x0, rect.y1 - 2), text, fontsize=fontsize, fontname=fontname, color=color)

def fill_pdf_universal_engine(data, output_path, template_name, custom_template_path=None):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # 1. DETERMINAR PLANTILLA BASE
    if custom_template_path and os.path.exists(custom_template_path):
        pdf_path = custom_template_path
    else:
        # Fallback a la maestra si no hay específica
        pdf_path = os.path.join(base_dir, "templates", "referencia_maestra.pdf")
    
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

    # === LÓGICA CORPORACIÓN (ARQUITECTO SENIOR) ===
    if template_name == "corporacion" or "corpNameSA" in data:
        directors = data.get("directors", [])
        shareholders = data.get("shareholders", [])
        dignitaries = data.get("dignitaries", {})

        def fill_director_block(page, d, anchor_y, col_idx):
            # Col 0 = Izquierda (X:145), Col 1 = Derecha (X:430)
            x0 = 145 if col_idx == 0 else 430
            w = 140 # Ancho máximo de la celda
            
            # Offsets verticales fijos (Arquitectura 2025)
            field_offsets = {
                "firstName": 14, "secondName": 31, "lastName": 48,
                "birthDate": 65, "maritalStatus": 82, "nationality": 99,
                "passport": 116, "phone": 133, "email": 150,
                "address": 167, "city": 201, "country": 218
            }
            for field, off in field_offsets.items():
                val = d.get(field)
                if val:
                    rect = fitz.Rect(x0, anchor_y + off - 8, x0 + w, anchor_y + off)
                    insert_text_scaled(page, rect, val)

        def process_directors_page(page, d_chunk, p_idx, is_annex=False):
            y_banner = get_anchor(page, ["directores", "directors"], 100, 600)
            if not y_banner: y_banner = 270 

            if is_annex:
                # Marcador de Continuación
                page.insert_text((50, y_banner - 45), f"CONTINUACIÓN DIRECTORES - PÁGINA ANEXO {p_idx}", fontsize=11, fontname="hebo", color=(0.29, 0.64, 0.77))
                # Limpieza selectiva de celdas originales para preservar el diseño (Logo, bordes)
                page.draw_rect(fitz.Rect(45, y_banner + 10, 550, y_banner + 550), color=(1,1,1), fill=(1,1,1))
                # Redibujar bordes de bloques dinámicos
                page.draw_rect(fitz.Rect(50, y_banner + 30, 295, y_banner + 280), color=(0.29, 0.64, 0.77), width=0.5)
                page.draw_rect(fitz.Rect(300, y_banner + 30, 545, y_banner + 280), color=(0.29, 0.64, 0.77), width=0.5)

            y_top = y_banner + 25
            y_bot = y_banner + 285

            if len(d_chunk) > 0:
                page.insert_text((130, y_top + 5), f"Director {(p_idx-1)*3 + 1}", fontsize=8, fontname="hebo", color=(0.2, 0.2, 0.2))
                fill_director_block(page, d_chunk[0], y_top + 10, 0)
            if len(d_chunk) > 1:
                page.insert_text((420, y_top + 5), f"Director {(p_idx-1)*3 + 2}", fontsize=8, fontname="hebo", color=(0.2, 0.2, 0.2))
                fill_director_block(page, d_chunk[1], y_top + 10, 1)
            if len(d_chunk) > 2:
                page.insert_text((270, y_bot + 5), f"Director {(p_idx-1)*3 + 3}", fontsize=8, fontname="hebo", color=(0.2, 0.2, 0.2))
                fill_director_block(page, d_chunk[2], y_bot + 10, 0)
                # Datos extendidos para Director 3 (Dirección)
                d3 = d_chunk[2]
                if d3.get("address"): insert_text_scaled(page, fitz.Rect(430, y_bot + 12, 545, y_bot + 30), d3["address"])
                if d3.get("city"): insert_text_scaled(page, fitz.Rect(430, y_bot + 45, 545, y_bot + 63), d3["city"])
                if d3.get("country"): insert_text_scaled(page, fitz.Rect(430, y_bot + 62, 545, y_bot + 80), d3["country"])

        # PÁGINA 1
        page1 = doc[0]
        y_choice = get_anchor(page1, ["choice", "incorp", "form"], 100, 400)
        if y_choice:
            if data.get("corpNameSA"): insert_text_scaled(page1, fitz.Rect(230, y_choice - 12, 550, y_choice), data["corpNameSA"], max_fontsize=10)
            if data.get("corpNameCorp"): insert_text_scaled(page1, fitz.Rect(230, y_choice + 18, 550, y_choice + 30), data["corpNameCorp"], max_fontsize=10)
            if data.get("corpNameInc"): insert_text_scaled(page1, fitz.Rect(230, y_choice + 48, 550, y_choice + 60), data["corpNameInc"], max_fontsize=10)
        
        y_cap = get_anchor(page1, ["capital", "authorized"], 150, 500)
        if y_cap and data.get("capitalSocial"):
            page1.insert_text((280, y_cap - 2), f"{float(data['capitalSocial']):,.2f} USD", fontsize=9, fontname="helv", color=(0,0,0))

        process_directors_page(page1, directors[:3], 1)

        # ANEXOS DIRECTORES
        pages_added = 0
        src_doc = fitz.open(pdf_path) # Abrir de nuevo para clonar páginas
        for i in range(3, len(directors), 3):
            pages_added += 1
            doc.insert_pdf(src_doc, from_page=0, to_page=0, start_at=pages_added)
            process_directors_page(doc[pages_added], directors[i:i+3], pages_added + 1, is_annex=True)

        # PÁGINA 2 (DIGNATARIOS Y ACCIONISTAS)
        orig_p2_idx = 1 + pages_added
        if len(doc) > orig_p2_idx:
            page2 = doc[orig_p2_idx]
            y_dig = get_anchor(page2, ["dignatarios", "officers"], 100, 600)
            if not y_dig: y_dig = 118
            
            # Dignatarios (Presidente, Secretario, Tesorero)
            roles = {"presidente": 38, "secretario": 58, "tesorero": 78}
            for role, off in roles.items():
                if role in dignitaries:
                    d = dignitaries[role]
                    y_row = y_dig + off
                    if d.get("fullName"): insert_text_scaled(page2, fitz.Rect(170, y_row - 8, 320, y_row), d["fullName"])
                    if d.get("birthDate"): insert_text_scaled(page2, fitz.Rect(330, y_row - 8, 395, y_row), d["birthDate"])
                    if d.get("passport"): insert_text_scaled(page2, fitz.Rect(400, y_row - 8, 475, y_row), d["passport"])
                    if d.get("registrationNumber"): insert_text_scaled(page2, fitz.Rect(480, y_row - 8, 550, y_row), d["registrationNumber"])

            y_sh = get_anchor(page2, ["accionistas", "shareholders"], 200, 800)
            if not y_sh: y_sh = 270

            def fill_sh_block(page, sh_chunk, anchor_y, is_annex=False):
                if is_annex:
                    page.insert_text((50, anchor_y - 45), "CONTINUACIÓN ACCIONISTAS - PÁGINA ANEXO", fontsize=11, fontname="hebo", color=(0.29, 0.64, 0.77))
                    page.draw_rect(fitz.Rect(45, anchor_y + 30, 550, anchor_y + 150), color=(1,1,1), fill=(1,1,1))
                
                y_start = anchor_y + 45
                for i, s in enumerate(sh_chunk[:3]):
                    y_pos = y_start + (i * 22)
                    if s.get("certificate"): page.insert_text((60, y_pos), str(s["certificate"]), fontsize=8)
                    if s.get("value"): page.insert_text((130, y_pos), str(s["value"]), fontsize=8)
                    if s.get("shares"): page.insert_text((210, y_pos), str(s["shares"]), fontsize=8)
                    if s.get("name"): insert_text_scaled(page, fitz.Rect(270, y_pos - 8, 390, y_pos), s["name"])
                    if s.get("address"): insert_text_scaled(page, fitz.Rect(400, y_pos - 8, 550, y_pos), s["address"])

            fill_sh_block(page2, shareholders[:3], y_sh)

            # Actividades y Firma
            y_act = get_anchor(page2, ["actividades", "activities"], 400, 900)
            if y_act and data.get("companyActivities"):
                rect_act = fitz.Rect(55, y_act + 40, 550, y_act + 120)
                page.insert_textbox(rect_act, data["companyActivities"], fontsize=8, fontname="helv")

            y_sig = get_anchor(page2, ["declaration", "signature", "firma"], 600, 1000)
            if not y_sig: y_sig = 750
            if data.get("declarationName"): page.insert_text((150, y_sig + 65), str(data["declarationName"]), fontsize=9)
            if data.get("declarationDate"): page.insert_text((150, y_sig + 95), str(data["declarationDate"]), fontsize=9)

            # ANEXOS ACCIONISTAS
            for i in range(3, len(shareholders), 3):
                insert_idx = orig_p2_idx + (i//3)
                doc.insert_pdf(src_doc, from_page=1, to_page=1, start_at=insert_idx)
                fill_sh_block(doc[insert_idx], shareholders[i:i+3], y_sh, is_annex=True)

        src_doc.close()

    # === LÓGICA FONDOS / GENÉRICO ===
    else:
        config = master_config.get(template_name, master_config["referencia_maestra"])
        for entry in config.get("anchors", []):
            key = entry["data_key"]
            if key in data and data[key]:
                fy = get_anchor(page1, entry["keywords"], min_y=entry["min_y"], max_y=entry["max_y"])
                if fy:
                    x_val = config.get(entry["x_key"], 300) if isinstance(entry["x_key"], str) else entry["x_key"]
                    page1.insert_text((x_val, fy), str(data[key]), fontsize=10, fontname="helv")

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
        with open(config_path, 'r', encoding='utf-8') as f:
            master_config = json.load(f)
            
        fill_pdf_universal_engine(
            input_data.get("data", {}), 
            input_data.get("output_path", "filled_temp.pdf"), 
            input_data.get("template_name", "referencia_maestra"), 
            input_data.get("custom_template_path")
        )
        print(input_data.get("output_path", "filled_temp.pdf"))
    except Exception as e:
        import traceback
        print(f"ERROR_PY: {str(e)} | Details: {traceback.format_exc()}", file=sys.stderr)
        sys.exit(1)
