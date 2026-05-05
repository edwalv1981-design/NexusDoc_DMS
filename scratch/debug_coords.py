import fitz
import os
import unicodedata

def normalize(text):
    if not text: return ""
    return "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').lower()

pdf_path = "templates/referencia_maestra.pdf"
if not os.path.exists(pdf_path):
    print("PDF NOT FOUND")
    exit(1)

doc = fitz.open(pdf_path)
page = doc[0]
words = page.get_text("words")

keywords = ["personal", "assets", "financial", "investments", "business", "loans", "inheritance"]
for w in words:
    for kw in keywords:
        if kw in normalize(w[4]):
            print(f"WORD: {w[4]} | COORDS: x0={w[0]}, y0={w[1]}, x1={w[2]}, y1={w[3]} | center_y={(w[1]+w[3])/2}")
doc.close()
