const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const { SignedDocument, AuditLog } = require('../models');
const { isPdfBuffer, sanitizeDownloadFilename } = require('../utils/pdfMagic');

const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit for signed docs
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF.'));
        }
    }
});

// Verificación real de firmas (pyHanko) + huella SHA-256: services/signatureService.js
const signatureService = require('../services/signatureService');
const { accessibleUserIds } = require('../utils/formAccess');

function describeUpload(verb, filename, v) {
    const s = v.verification.signatures && v.verification.signatures[0];
    const signer = s && s.signer ? ` Firmante: ${s.signer.commonName || '-'}${s.signer.serialNumber ? ` (${s.signer.serialNumber})` : ''}; emisor: ${(s.issuer && s.issuer.commonName) || '-'}.` : '';
    return `Usuario ${verb} documento firmado: ${filename}. Estado: ${v.signatureStatus}.${signer} SHA-256: ${v.fileHash}`;
}

/** Datos de la verificación que se muestran al usuario (sin trazas internas). */
function publicVerification(ver) {
    if (!ver) return null;
    const s = (ver.signatures || [])[0] || {};
    return {
        result: ver.result,
        signer: s.signer || null,
        issuer: s.issuer || null,
        trusted: s.trusted ?? null,
        identityMatch: ver.identity ? ver.identity.match : 'unknown',
        review: ver.review ? { status: ver.review.status, note: ver.review.note || null, at: ver.review.at || null } : null,
        checkedAt: ver.checkedAt,
    };
}

// @route   GET api/signed-docs
// @desc    Get all signed documents for the user
router.get('/', auth, async (req, res) => {
    try {
        const documents = await SignedDocument.findAll({
            where: { userId: req.user.id },
            attributes: ['id', 'filename', 'signatureStatus', 'updatedAt', 'verification', 'fileHash'],
            order: [['updatedAt', 'DESC']]
        });
        res.json(documents.map((d) => {
            const { verification, ...rest } = d.toJSON();
            return { ...rest, verification: publicVerification(verification) };
        }));
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al obtener documentos firmados' });
    }
});

// @route   POST api/signed-docs/upload
// @desc    Upload and validate a signed document
router.post('/upload', [auth, upload.single('document')], async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ msg: 'Seleccione un archivo PDF.' });
        if (!isPdfBuffer(req.file.buffer)) return res.status(400).json({ msg: 'El archivo no es un PDF válido.' });

        // 1. Verificación (firma digital real o pendiente de revisión) + huella
        const v = await signatureService.verifyDocument(req.file.buffer, req.dbUser);
        const filename = sanitizeDownloadFilename(req.file.originalname);

        // 2. Save to DB
        const newDoc = await SignedDocument.create({
            userId: req.user.id,
            filename,
            fileData: req.file.buffer,
            signatureStatus: v.signatureStatus,
            verification: v.verification,
            fileHash: v.fileHash
        });

        await AuditLog.create({
            userId: req.user.id,
            action: 'SIGNED_DOC_UPLOAD',
            description: describeUpload('subió', filename, v)
        });

        res.json({ msg: 'Documento procesado', status: v.signatureStatus, docId: newDoc.id, verification: publicVerification(v.verification) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al subir el documento firmado' });
    }
});

// @route   PUT api/signed-docs/update/:id
// @desc    Replace a signed document and re-validate
router.put('/update/:id', [auth, upload.single('document')], async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ msg: 'Seleccione un archivo PDF válido.' });
        if (!isPdfBuffer(req.file.buffer)) return res.status(400).json({ msg: 'El archivo no es un PDF válido.' });

        const doc = await SignedDocument.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!doc) return res.status(404).json({ msg: 'Documento no encontrado o no autorizado.' });

        // 1. Verificar de nuevo (el documento nuevo reinicia la revisión)
        const v = await signatureService.verifyDocument(req.file.buffer, req.dbUser);
        const filename = sanitizeDownloadFilename(req.file.originalname);

        // 2. Update DB
        doc.filename = filename;
        doc.fileData = req.file.buffer;
        doc.signatureStatus = v.signatureStatus;
        doc.verification = v.verification;
        doc.fileHash = v.fileHash;
        await doc.save();

        await AuditLog.create({
            userId: req.user.id,
            action: 'SIGNED_DOC_UPDATE',
            description: describeUpload('reemplazó', filename, v)
        });

        res.json({ msg: 'Documento actualizado', status: v.signatureStatus, verification: publicVerification(v.verification) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al actualizar el documento' });
    }
});

// @route   DELETE api/signed-docs/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const doc = await SignedDocument.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!doc) return res.status(404).json({ msg: 'Documento no encontrado.' });

        const filename = doc.filename;
        await doc.destroy();

        await AuditLog.create({
            userId: req.user.id,
            action: 'SIGNED_DOC_DELETE',
            description: `Usuario eliminó documento firmado: ${filename}`
        });

        res.json({ msg: 'Documento firmado eliminado.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al eliminar el documento' });
    }
});


// @route   GET api/signed-docs/download/:id
router.get('/download/:id', auth, async (req, res) => {
    try {
        // Alcance (Opción A): administrador todo; Administrador Usuarios: él y sus
        // subusuarios; usuario: solo los suyos. Antes cualquier "staff" veía todo.
        const doc = await SignedDocument.findByPk(req.params.id);
        const scope = doc ? await accessibleUserIds(req) : null;
        if (doc && scope !== null && !scope.includes(doc.userId)) {
            return res.status(404).json({ msg: 'Documento no encontrado o acceso denegado.' });
        }
        if (!doc || !doc.fileData) return res.status(404).json({ msg: 'Documento no encontrado o acceso denegado.' });

        await AuditLog.create({
            userId: req.user.id,
            action: 'SIGNED_DOC_DOWNLOAD',
            description: `El usuario (${req.user.email}) descargó/visualizó documento firmado: ${doc.filename}`
        }).catch(e => console.error('AuditLog error:', e.message));

        // Solo se aceptan PDF (validado al subir): el tipo no depende del nombre.
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', `inline; filename="${sanitizeDownloadFilename(doc.filename)}"`);
        res.send(doc.fileData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al descargar el documento' });
    }
});

module.exports = router;
