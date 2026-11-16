"""Pasa cada PDF por signature_agent.py (lo que usa el sistema) y por pyHanko (validación criptográfica)."""
import glob, json, os, subprocess, sys
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext

out = sys.argv[1]
agent = os.path.join(os.path.dirname(__file__), "..", "signature_agent.py")
rows = []
for f in sorted(glob.glob(f"{out}/*.pdf")):
    r = subprocess.run([sys.executable, agent, f], capture_output=True, text=True, timeout=60)
    try: agent_res = json.loads(r.stdout.strip())
    except Exception: agent_res = {"raw": r.stdout.strip(), "err": r.stderr.strip()[:200]}
    status = "Firma Detectada" if agent_res.get("isSigned") else "Firma Pendiente"
    crypto = "sin firma digital"
    try:
        with open(f, "rb") as fh:
            rd = PdfFileReader(fh, strict=False)
            if rd.embedded_signatures:
                st = validate_pdf_signature(rd.embedded_signatures[0], ValidationContext(allow_fetching=False))
                crypto = f"intacta={st.intact} criptografía_válida={st.valid} certificado_de_confianza={st.trusted} cubre_todo={st.coverage.name}"
    except Exception as e:
        crypto = f"error de validación: {str(e)[:120]}"
    rows.append(f"{os.path.basename(f)} | sistema: {status} | pyHanko: {crypto}")
print("\n".join(rows))
enc = "\n".join(rows).replace("%", "%25").replace("\n", "%0A")
print(f"::notice title=Prueba de firmas::{enc}")
