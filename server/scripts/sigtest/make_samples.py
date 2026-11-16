"""Genera PDF de prueba para evaluar la validación de firmas (solo CI)."""
import os, random, sys
import fitz
from pyhanko.sign import signers
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter

def _report(exc_type, exc, tb):
    import traceback
    msg = "".join(traceback.format_exception(exc_type, exc, tb))[-900:]
    print("::error title=make_samples::" + msg.replace("%", "%25").replace("\n", "%0A"))
sys.excepthook = _report

out = sys.argv[1]
os.makedirs(out, exist_ok=True)

def base(path, extra=None):
    d = fitz.open(); p = d.new_page()
    p.insert_text((72, 100), "CONTRATO DE PRUEBA - MONTO 100 USD", fontsize=14)
    p.insert_text((72, 700), "Firma del cliente: ____________________", fontsize=11)
    if extra: extra(p)
    d.save(path, deflate=False); d.close()

# 1) sin firma
base(f"{out}/1_sin_firma.pdf")

# 2) firma digital (certificado de prueba autofirmado)
signer = signers.SimpleSigner.load(f"{out}/key.pem", f"{out}/cert.pem")
with open(f"{out}/1_sin_firma.pdf", "rb") as inf:
    w = IncrementalPdfFileWriter(inf)
    res = signers.sign_pdf(w, signers.PdfSignatureMetadata(field_name="Firma1"), signer=signer)
    open(f"{out}/2_firma_digital.pdf", "wb").write(res.getbuffer())

raw = open(f"{out}/2_firma_digital.pdf", "rb").read()

# 3) alterado después de firmar: cambia un dato DENTRO de lo firmado (tamaño de página)
assert b"595 842" in raw, "no se encontró MediaBox"
open(f"{out}/3_alterado_despues_de_firmar.pdf", "wb").write(raw.replace(b"595 842", b"595 843", 1))

# 4) firma falsa: /Contents reemplazado por bytes aleatorios
i = raw.index(b"/Contents <") + len(b"/Contents <"); j = raw.index(b">", i)
fake = raw[:i] + bytes("".join(random.choice("0123456789abcdef") for _ in range(j - i)), "ascii") + raw[j:]
open(f"{out}/4_firma_falsa.pdf", "wb").write(fake)

# 5) firma manuscrita escaneada (imagen de un trazo, sin campo de firma)
def scribble(page):
    pm_doc = fitz.open(); pg = pm_doc.new_page(width=300, height=90)
    sh = pg.new_shape()
    pts = [(10, 60), (40, 20), (70, 70), (100, 25), (130, 65), (160, 30), (200, 60), (240, 35), (285, 55)]
    for a, b in zip(pts, pts[1:]): sh.draw_bezier(a, (a[0] + 10, a[1] - 25), (b[0] - 10, b[1] + 25), b)
    sh.finish(color=(0, 0, 0.4), width=2.2); sh.commit()
    pix = pg.get_pixmap(dpi=150); pm_doc.close()
    page.insert_image(fitz.Rect(190, 640, 410, 706), stream=pix.tobytes("png"))
base(f"{out}/5_firma_manuscrita_escaneada.pdf", scribble)

# 6) firma de una autoridad de CONFIANZA (CA de prueba cuya raíz se agrega a la carpeta de confianza)
if os.path.exists(f"{out}/trusted_key.pem"):
    tsigner = signers.SimpleSigner.load(f"{out}/trusted_key.pem", f"{out}/trusted_cert.pem", ca_chain_files=(f"{out}/ca_cert.pem",))
    with open(f"{out}/1_sin_firma.pdf", "rb") as inf:
        w = IncrementalPdfFileWriter(inf)
        res = signers.sign_pdf(w, signers.PdfSignatureMetadata(field_name="Firma1"), signer=tsigner)
        open(f"{out}/6_firma_ca_confianza.pdf", "wb").write(res.getbuffer())
print("muestras ok")
