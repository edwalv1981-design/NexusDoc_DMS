'use strict';

/**
 * Validación de documentos firmados.
 *
 * - Firma digital: scripts/signature_verifier.py (pyHanko) comprueba integridad,
 *   validez criptográfica, cadena de confianza (raíces mundiales de Mozilla +
 *   server/trust/roots) y cambios posteriores a la firma.
 * - Firma manuscrita (escaneada): no se puede validar automáticamente; queda
 *   pendiente de revisión del administrador.
 * - Huella SHA-256 del archivo y datos del firmante como evidencia.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const VERIFY_TIMEOUT_MS = Number(process.env.SIGNATURE_VERIFY_TIMEOUT_MS) || 60000;

// Estados visibles (se guardan en signatureStatus).
const STATUS = {
    DIGITAL_VALID: 'Firma Digital Válida',
    DIGITAL_UNTRUSTED: 'Firma Digital – Pendiente de Revisión',
    DIGITAL_INVALID: 'Firma Inválida o Documento Alterado',
    NO_DIGITAL: 'Firma Manuscrita – Pendiente de Revisión',
    ERROR: 'Error de Verificación – Pendiente de Revisión',
    APPROVED: 'Firma Verificada por el Administrador',
    REJECTED: 'Firma Rechazada',
};

// Estados que requieren que el administrador revise el documento.
const NEEDS_REVIEW = new Set(['DIGITAL_UNTRUSTED', 'NO_DIGITAL', 'ERROR']);

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** Ejecuta el verificador en un archivo temporal privado, con tiempo límite. */
function runVerifier(buffer) {
    return new Promise((resolve) => {
        let dir;
        try {
            dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nxsig-'));
        } catch (e) {
            return resolve({ status: 'ERROR', error: `No se pudo crear el archivo temporal: ${e.message}` });
        }
        const file = path.join(dir, 'doc.pdf');
        const cleanup = () => fs.rm(dir, { recursive: true, force: true }, () => {});
        try {
            fs.writeFileSync(file, buffer, { mode: 0o600 });
        } catch (e) {
            cleanup();
            return resolve({ status: 'ERROR', error: e.message });
        }
        const python = process.platform === 'win32' ? 'python' : 'python3';
        const script = path.join(__dirname, '../scripts/signature_verifier.py');
        execFile(python, [script, file], { timeout: VERIFY_TIMEOUT_MS, maxBuffer: 1024 * 1024, killSignal: 'SIGKILL' }, (error, stdout, stderr) => {
            cleanup();
            if (error && !stdout) {
                const reason = error.killed ? `tiempo límite (${VERIFY_TIMEOUT_MS / 1000}s) superado` : (stderr || error.message || '').slice(0, 300);
                console.error('Verificador de firmas:', reason);
                return resolve({ status: 'ERROR', error: `Verificador no disponible: ${reason}` });
            }
            try {
                const parsed = JSON.parse(String(stdout).trim());
                if (!STATUS[parsed.status]) parsed.status = 'ERROR';
                resolve(parsed);
            } catch (e) {
                console.error('Verificador de firmas: salida inválida', String(stdout).slice(0, 200));
                resolve({ status: 'ERROR', error: 'Respuesta inválida del verificador' });
            }
        });
    });
}

const norm = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const digits = (s) => String(s || '').replace(/\D/g, '');

/**
 * ¿El firmante del certificado es el usuario? Compara la identificación
 * (cédula/pasaporte en serialNumber o CN) y, si no hay, el nombre.
 */
function identityMatch(user, signer) {
    if (!signer || !user) return 'unknown';
    const userId = digits(user.idNumber);
    const certText = `${signer.serialNumber || ''} ${signer.commonName || ''}`;
    const certDigits = digits(certText);
    if (userId.length >= 6 && certDigits) {
        if (certDigits.includes(userId)) return 'match';
    }
    const userTokens = norm(user.name).split(' ').filter((t) => t.length > 2);
    const certName = norm(`${signer.commonName || ''} ${signer.givenName || ''} ${signer.surname || ''}`);
    if (userTokens.length && certName) {
        const hits = userTokens.filter((t) => certName.includes(t)).length;
        if (hits >= Math.min(2, userTokens.length)) return 'match';
        return 'no_match';
    }
    return 'unknown';
}

/**
 * Valida un PDF y arma el registro a guardar.
 * @returns {{ signatureStatus, fileHash, verification }}
 */
async function verifyDocument(buffer, user) {
    const fileHash = sha256(buffer);
    const result = await runVerifier(buffer);
    const first = Array.isArray(result.signatures) && result.signatures[0] ? result.signatures[0] : null;
    const signer = first && first.signer ? first.signer : null;
    const verification = {
        engine: result.engine || 'pyhanko',
        result: result.status,
        checkedAt: new Date().toISOString(),
        signatures: Array.isArray(result.signatures) ? result.signatures.slice(0, 10) : [],
        error: result.error || null,
        identity: { match: identityMatch(user, signer), signer },
        review: { status: NEEDS_REVIEW.has(result.status) ? 'pending' : 'not_required' },
        fileHash,
    };
    return { signatureStatus: STATUS[result.status], fileHash, verification };
}

/** Aplica la decisión del administrador sobre un documento. */
function applyReview(doc, { decision, note, admin }) {
    const verification = { ...(doc.verification || {}) };
    verification.review = {
        status: decision,
        note: note || null,
        by: admin.id,
        byName: admin.name || null,
        byEmail: admin.email || null,
        at: new Date().toISOString(),
    };
    return {
        verification,
        signatureStatus: decision === 'approved' ? STATUS.APPROVED : STATUS.REJECTED,
    };
}

module.exports = { STATUS, NEEDS_REVIEW, sha256, runVerifier, identityMatch, verifyDocument, applyReview };
