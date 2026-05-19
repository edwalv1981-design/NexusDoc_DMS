"""
Extrae nombres de campos AcroForm de un PDF (PyMuPDF / fitz).
Entrada stdin JSON: { "pdf_path": "..." }
Salida stdout JSON: { "fields": [{ "name", "type" }], "count": N }
"""
import fitz
import sys
import json
import io
import os

sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf8')


def extract_acroform_fields(pdf_path):
    if not pdf_path or not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF no encontrado: {pdf_path}")

    doc = fitz.open(pdf_path)
    by_name = {}

    try:
        for page_index in range(doc.page_count):
            page = doc[page_index]
            widgets = page.widgets()
            if not widgets:
                continue
            for widget in widgets:
                name = widget.field_name
                if not name:
                    continue
                field_type = None
                try:
                    field_type = widget.field_type_string
                except Exception:
                    field_type = None
                by_name[name] = {
                    "name": name,
                    "type": field_type,
                    "page": page_index + 1,
                }
    finally:
        doc.close()

    fields = sorted(by_name.values(), key=lambda x: x["name"].lower())
    return {"fields": fields, "count": len(fields)}


if __name__ == "__main__":
    try:
        raw = sys.stdin.read()
        if not raw:
            print("ERROR_PY: No input data received", file=sys.stderr)
            sys.exit(1)

        payload = json.loads(raw)
        pdf_path = payload.get("pdf_path")
        result = extract_acroform_fields(pdf_path)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        import traceback

        print(f"ERROR_PY: {str(e)}\n{traceback.format_exc()}", file=sys.stderr)
        sys.exit(1)
