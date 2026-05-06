import fitz
import os

pdf_path = "templates/referencia_maestra.pdf"
doc = fitz.open(pdf_path)
page = doc[0]
drawings = page.get_drawings()

with open("scratch/all_drawings.txt", "w", encoding="utf-8") as f:
    for d in drawings:
        f.write(f"DRAWING: {d}\n")
doc.close()
