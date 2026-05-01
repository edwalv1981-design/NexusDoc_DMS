import sys
import json
import fitz  # PyMuPDF

def check_pdf_signature(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        is_signed = False
        
        # Iterar sobre las páginas y buscar campos de tipo Firma (Signature)
        for page in doc:
            for widget in page.widgets():
                if widget.field_type == fitz.PDF_WIDGET_TYPE_SIGNATURE:
                    # widget.is_signed está disponible en versiones recientes de PyMuPDF
                    # Para seguridad, comprobamos si tiene valor o está firmado
                    try:
                        if widget.is_signed:
                            is_signed = True
                            break
                    except AttributeError:
                        # Fallback por si la versión de PyMuPDF no tiene is_signed
                        if widget.field_value:
                            is_signed = True
                            break
            if is_signed:
                break
                
        doc.close()
        
        # Output as JSON for Node.js to read
        print(json.dumps({"isSigned": is_signed}))
        
    except Exception as e:
        print(json.dumps({"isSigned": False, "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_pdf_signature(sys.argv[1])
    else:
        print(json.dumps({"error": "No file path provided"}))
