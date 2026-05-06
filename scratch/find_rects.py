import fitz
import os

pdf_path = "templates/referencia_maestra.pdf"
doc = fitz.open(pdf_path)
page = doc[0]
drawings = page.get_drawings()

with open("scratch/drawings_debug.txt", "w", encoding="utf-8") as f:
    for d in drawings:
        for item in d["items"]:
            if item[0] == "re": # Rectangle
                rect = item[1]
                # Filtrar solo los que parecen checkboxes (pequeños cuadrados cerca de x=70-80)
                if 8 < rect.width < 12 and 8 < rect.height < 12 and 70 < rect.x0 < 80:
                    f.write(f"CHECKBOX RECT: {rect} | CENTER: ({rect.x0 + rect.width/2}, {rect.y0 + rect.height/2})\n")
doc.close()
