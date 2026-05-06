import fitz

doc = fitz.open('templates/referencia_maestra.pdf')
with open('scratch/pdf_text_dump.txt', 'w', encoding='utf-8') as f:
    for i, page in enumerate(doc):
        f.write(f"--- PAGE {i+1} ---\n")
        f.write(page.get_text())
doc.close()
