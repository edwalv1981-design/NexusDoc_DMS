"""
Verificación de firmas de un PDF (NexusDoc DMS).

Uso:  python3 signature_verifier.py <archivo.pdf>
Salida (stdout): un JSON con el resultado. Nunca lanza excepción sin JSON.

Firma digital (estándar PDF / PAdES), validación con pyHanko:
  - intact:   el contenido firmado no cambió (hash del documento correcto).
  - valid:    la firma criptográfica corresponde al certificado.
  - trusted:  la cadena del certificado llega a una autoridad de confianza.
              Raíces: almacén mundial de Mozilla (certifi) + las que se agreguen
              en server/trust/roots (o la carpeta SIGNATURE_TRUST_DIR).
  - cambios posteriores a la firma (ModificationLevel).
  - revocación (OCSP/CRL) cuando SIGNATURE_ALLOW_FETCHING=1 (por defecto sí).

status:
  DIGITAL_VALID      firma íntegra, válida y de una autoridad reconocida
  DIGITAL_UNTRUSTED  firma íntegra y válida, autoridad no reconocida (revisión)
  DIGITAL_INVALID    documento alterado o firma inválida/falsa
  NO_DIGITAL         sin firma digital (p. ej. firma manuscrita escaneada)
  ERROR              no se pudo verificar
"""
import glob
import json
import os
import sys

RESULT = {"status": "ERROR", "signatures": [], "engine": "pyhanko"}


def emit(result):
    sys.stdout.write(json.dumps(result, ensure_ascii=False, default=str))
    sys.stdout.flush()


def load_trust_roots():
    from asn1crypto import pem, x509 as asn1_x509

    roots = []
    sources = []
    try:
        import certifi

        sources.append(certifi.where())
    except Exception:
        pass
    here = os.path.dirname(os.path.abspath(__file__))
    extra_dirs = [os.path.join(here, "..", "trust", "roots")]
    if os.environ.get("SIGNATURE_TRUST_DIR"):
        extra_dirs.append(os.environ["SIGNATURE_TRUST_DIR"])
    for d in extra_dirs:
        for ext in ("*.pem", "*.crt", "*.cer", "*.der"):
            sources.extend(glob.glob(os.path.join(d, ext)))

    for path in sources:
        try:
            with open(path, "rb") as fh:
                data = fh.read()
            if pem.detect(data):
                for _, _, der in pem.unarmor(data, multiple=True):
                    roots.append(asn1_x509.Certificate.load(der))
            else:
                roots.append(asn1_x509.Certificate.load(data))
        except Exception:
            continue
    return roots


def name_attrs(name):
    out = {}
    try:
        native = name.native
        for key, label in (
            ("common_name", "commonName"),
            ("serial_number", "serialNumber"),
            ("organization_name", "organization"),
            ("country_name", "country"),
            ("email_address", "email"),
            ("given_name", "givenName"),
            ("surname", "surname"),
        ):
            if native.get(key):
                val = native.get(key)
                out[label] = ", ".join(val) if isinstance(val, list) else str(val)
    except Exception:
        pass
    return out


def main(path):
    try:
        from pyhanko.pdf_utils.reader import PdfFileReader
        from pyhanko.sign.validation import validate_pdf_signature
        from pyhanko_certvalidator import ValidationContext
    except Exception as exc:  # librería no instalada en el servidor
        RESULT.update(status="ERROR", error=f"Verificador no disponible: {exc}")
        return emit(RESULT)

    try:
        with open(path, "rb") as fh:
            reader = PdfFileReader(fh, strict=False)
            sigs = list(reader.embedded_signatures)
            if not sigs:
                RESULT.update(status="NO_DIGITAL")
                return emit(RESULT)

            allow_fetching = os.environ.get("SIGNATURE_ALLOW_FETCHING", "1") == "1"
            vc = ValidationContext(
                trust_roots=load_trust_roots(),
                allow_fetching=allow_fetching,
                # Sin red o sin OCSP/CRL publicados no se rechaza la firma por eso.
                revocation_mode="soft-fail",
            )

            any_invalid = False
            all_trusted = True
            for emb in sigs:
                info = {"field": emb.field_name}
                try:
                    st = validate_pdf_signature(emb, vc)
                    cert = st.signing_cert
                    mod_level = getattr(st, "modification_level", None)
                    mod_name = getattr(mod_level, "name", None)
                    coverage = getattr(getattr(st, "coverage", None), "name", None)
                    # Cambios después de firmar distintos de los permitidos
                    # (firmas adicionales, sellos de tiempo, llenado de formulario).
                    altered_after = mod_name == "OTHER" or (getattr(st, "docmdp_ok", True) is False)
                    info.update(
                        intact=bool(st.intact),
                        valid=bool(st.valid),
                        trusted=bool(st.trusted),
                        coverage=coverage,
                        modificationLevel=mod_name,
                        alteredAfterSigning=bool(altered_after),
                        signingTime=str(getattr(st, "signer_reported_dt", "") or ""),
                    )
                    if cert is not None:
                        info["signer"] = name_attrs(cert.subject)
                        info["issuer"] = name_attrs(cert.issuer)
                        info["certSerial"] = format(cert.serial_number, "x")
                        try:
                            info["certValidFrom"] = str(cert["tbs_certificate"]["validity"]["not_before"].native)
                            info["certValidTo"] = str(cert["tbs_certificate"]["validity"]["not_after"].native)
                        except Exception:
                            pass
                    if not st.intact or not st.valid or altered_after:
                        any_invalid = True
                    if not st.trusted:
                        all_trusted = False
                except Exception as exc:
                    info.update(intact=False, valid=False, trusted=False, error=str(exc)[:300])
                    any_invalid = True
                RESULT["signatures"].append(info)

            if any_invalid:
                RESULT["status"] = "DIGITAL_INVALID"
            elif all_trusted:
                RESULT["status"] = "DIGITAL_VALID"
            else:
                RESULT["status"] = "DIGITAL_UNTRUSTED"
            return emit(RESULT)
    except Exception as exc:
        # Si el PDF declara una firma digital pero no se puede leer, la firma es
        # inválida (corrupta o falsificada), no un error del verificador.
        try:
            with open(path, "rb") as fh:
                raw = fh.read()
            declares_sig = b"/ByteRange" in raw and (b"/Type /Sig" in raw or b"/Type/Sig" in raw or b"/FT /Sig" in raw or b"/FT/Sig" in raw)
        except Exception:
            declares_sig = False
        if declares_sig:
            RESULT.update(status="DIGITAL_INVALID", error="Firma digital ilegible o falsificada: " + str(exc)[:200])
            RESULT["signatures"].append({"intact": False, "valid": False, "trusted": False, "error": "Firma ilegible"})
        else:
            RESULT.update(status="ERROR", error=str(exc)[:300])
        return emit(RESULT)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        RESULT.update(status="ERROR", error="Falta la ruta del PDF")
        emit(RESULT)
    else:
        main(sys.argv[1])
