"""Pasa cada PDF por el verificador nuevo (signature_verifier.py) y el antiguo (signature_agent.py)."""
import glob, json, os, subprocess, sys, time
out = sys.argv[1]
here = os.path.dirname(__file__)
new = os.path.join(here, "..", "signature_verifier.py")
old = os.path.join(here, "..", "signature_agent.py")
expected = {
    "1_sin_firma.pdf": "NO_DIGITAL",
    "2_firma_digital.pdf": "DIGITAL_UNTRUSTED",
    "3_alterado_despues_de_firmar.pdf": "DIGITAL_INVALID",
    "4_firma_falsa.pdf": "DIGITAL_INVALID",
    "5_firma_manuscrita_escaneada.pdf": "NO_DIGITAL",
    "6_firma_ca_confianza.pdf": "DIGITAL_VALID",
}
rows, failed = [], False
for f in sorted(glob.glob(f"{out}/*.pdf")):
    name = os.path.basename(f)
    t0 = time.time()
    r = subprocess.run([sys.executable, new, f], capture_output=True, text=True, timeout=90)
    dt = time.time() - t0
    try:
        res = json.loads(r.stdout)
    except Exception:
        res = {"status": "SALIDA_INVALIDA", "raw": r.stdout[:200], "err": r.stderr[-300:]}
    o = subprocess.run([sys.executable, old, f], capture_output=True, text=True, timeout=60)
    old_status = "Firma Detectada" if '"isSigned": true' in o.stdout else "Firma Pendiente"
    sig = (res.get("signatures") or [{}])[0]
    signer = (sig.get("signer") or {})
    ok = res.get("status") == expected.get(name)
    failed |= not ok
    rows.append(f"{'OK ' if ok else 'XX '}{name} | nuevo: {res.get('status')} (esperado {expected.get(name)}) | antiguo: {old_status} | firmante: {signer.get('commonName','-')} / {signer.get('serialNumber','-')} | {dt:.1f}s {res.get('error','') or sig.get('error','')}")
print("\n".join(rows))
print("::notice title=Prueba de firmas::" + "\n".join(rows).replace("%", "%25").replace("\n", "%0A"))
sys.exit(1 if failed else 0)
