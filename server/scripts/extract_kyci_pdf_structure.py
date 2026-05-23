#!/usr/bin/env python3
"""Extrae títulos de sección y etiquetas de campo del PDF maestro KYCI (texto plano)."""
import json
import re
import sys

try:
    import fitz
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) no instalado"}), file=sys.stderr)
    sys.exit(1)


def normalize(s):
    return re.sub(r"\s+", " ", (s or "").strip())


def extract_structure(pdf_path):
    doc = fitz.open(pdf_path)
    lines = []
    for page in doc:
        blocks = page.get_text("dict").get("blocks", [])
        for block in blocks:
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                text = normalize("".join(s.get("text", "") for s in spans))
                if not text or len(text) < 2:
                    continue
                y = min(s.get("bbox", [0, 9999, 0, 0])[1] for s in spans)
                size = max(s.get("size", 0) for s in spans)
                lines.append({"text": text, "y": y, "size": size, "page": page.number})
    doc.close()

    lines.sort(key=lambda x: (x["page"], x["y"], -x["size"]))
    sections = []
    fields = []
    for item in lines:
        t = item["text"]
        if re.match(r"^[IVX]+\.\s", t) or re.match(r"^\d+\.\s", t):
            sections.append(t)
        elif item["size"] <= 11 and len(t) < 120 and not t.startswith("PTL"):
            if re.search(r"/|:", t) or t[0].isupper():
                fields.append(t)

    return {
        "pdf": pdf_path,
        "sectionTitles": sections,
        "fieldLabels": fields[:80],
        "lineCount": len(lines),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: extract_kyci_pdf_structure.py <KYCI.pdf>", file=sys.stderr)
        sys.exit(2)
    result = extract_structure(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False, indent=2))
