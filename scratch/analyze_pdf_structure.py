import fitz
import os

pdf_path = "templates/referencia_maestra.pdf"
doc = fitz.open(pdf_path)
page = doc[0]
text_instances = page.get_text("dict")["blocks"]

with open("scratch/full_text_debug.txt", "w", encoding="utf-8") as f:
    for b in text_instances:
        if "lines" in b:
            for l in b["lines"]:
                for s in l["spans"]:
                    f.write(f"TEXT: '{s['text']}' | BOX: {s['bbox']} | FONT: {s['font']} | SIZE: {s['size']}\n")
doc.close()
