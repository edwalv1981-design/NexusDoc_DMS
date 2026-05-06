import fitz
import sys

doc = fitz.open('templates/referencia_maestra.pdf')
for i, page in enumerate(doc):
    print(f"--- PAGE {i+1} ---")
    print(page.get_text().encode('utf-8', errors='replace').decode('utf-8'))
doc.close()
