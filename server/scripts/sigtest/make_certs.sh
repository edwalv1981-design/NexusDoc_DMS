#!/usr/bin/env bash
# Certificados de PRUEBA (solo CI). Uso: make_certs.sh <carpeta>
set -euo pipefail
D="$1"; mkdir -p "$D/trust"
# Autofirmado (cualquiera puede crearlo): debe quedar "no reconocido"
openssl req -x509 -newkey rsa:2048 -keyout "$D/key.pem" -out "$D/cert.pem" -days 30 -nodes -subj "/CN=Firma de Prueba NexusDoc" 2>/dev/null
# CA de prueba "de confianza" + firmante con cédula 0900000003 (cliente E2E)
openssl req -x509 -newkey rsa:2048 -keyout "$D/ca_key.pem" -out "$D/ca_cert.pem" -days 30 -nodes -subj "/CN=CA de Prueba/O=NexusDoc QA" -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
openssl req -newkey rsa:2048 -keyout "$D/trusted_key.pem" -out "$D/trusted.csr" -nodes -subj "/CN=Cliente E2E/serialNumber=0900000003/C=EC" 2>/dev/null
printf "basicConstraints=CA:FALSE\nkeyUsage=critical,digitalSignature,nonRepudiation\n" > "$D/ext.cnf"
openssl x509 -req -in "$D/trusted.csr" -CA "$D/ca_cert.pem" -CAkey "$D/ca_key.pem" -CAcreateserial -out "$D/trusted_cert.pem" -days 30 -extfile "$D/ext.cnf" 2>/dev/null
cp "$D/ca_cert.pem" "$D/trust/"
echo "certificados de prueba listos en $D"
