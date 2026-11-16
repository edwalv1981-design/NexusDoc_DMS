# Autoridades de certificación de confianza adicionales

El verificador de firmas (`server/scripts/signature_verifier.py`) reconoce
automáticamente las autoridades del almacén **mundial de Mozilla** (paquete
`certifi`). Muchas entidades que emiten firmas electrónicas para documentos
(por ejemplo, las acreditadas en Ecuador, Panamá o la Unión Europea) **no**
están en ese almacén. Sus firmas se verifican igual (integridad y validez
criptográfica), pero quedan como **"Firma Digital – Pendiente de Revisión"**
hasta que el administrador las apruebe.

Para que una entidad quede reconocida automáticamente, copie aquí el
certificado **raíz** de esa entidad (`.pem`, `.crt`, `.cer` o `.der`), haga
commit y push (Railway redespliega). También se puede indicar otra carpeta con
la variable de entorno `SIGNATURE_TRUST_DIR`.

Obtenga los certificados raíz **solo de la página oficial** de cada entidad.
