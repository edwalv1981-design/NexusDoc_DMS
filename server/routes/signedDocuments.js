const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const { SignedDocument, AuditLog } = require('../models');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

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

// Helper function to run the Python Signature Agent
const checkSignatureAgent = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        // We must write the buffer to a temp file because PyMuPDF needs a file path
        const tempPath = path.join(__dirname, `../../tmp/temp_sig_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
        
        try {
            if (!fs.existsSync(path.join(__dirname, '../../tmp'))) {
                fs.mkdirSync(path.join(__dirname, '../../tmp'), { recursive: true });
            }
            fs.writeFileSync(tempPath, fileBuffer);
            
            const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
            const scriptPath = path.join(__dirname, '../scripts/signature_agent.py');
            
            exec(`${pythonCommand} "${scriptPath}" "${tempPath}"`, (error, stdout, stderr) => {
                try { fs.unlinkSync(tempPath); } catch (e) {} // Clean up immediately
                
                if (error) {
                    console.error('Python Agent Error:', error);
                    return resolve('Firma Pendiente'); // Fallback on error
                }
                
                try {
                    const result = JSON.parse(stdout.trim());
                    if (result.isSigned) {
                        resolve('Firma Detectada');
                    } else {
                        resolve('Firma Pendiente');
                    }
                } catch (parseErr) {
                    console.error('Parse Error:', parseErr, stdout);
                    resolve('Firma Pendiente');
                }
            });
        } catch (e) {
            try { fs.unlinkSync(tempPath); } catch (err) {}
            resolve('Firma Pendiente');
        }
    });
};

// @route   GET api/signed-docs
// @desc    Get all signed documents for the user
router.get('/', auth, async (req, res) => {
    try {
        const documents = await SignedDocument.findAll({
            where: { userId: req.user.id },
            attributes: ['id', 'filename', 'signatureStatus', 'updatedAt'],
            order: [['updatedAt', 'DESC']]
        });
        res.json(documents);
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

        // 1. Run the Internal Agent to check for signatures
        const status = await checkSignatureAgent(req.file.buffer);

        // 2. Save to DB
        const newDoc = await SignedDocument.create({
            userId: req.user.id,
            filename: req.file.originalname,
            fileData: req.file.buffer,
            signatureStatus: status
        });

        await AuditLog.create({
            userId: req.user.id,
            action: 'SIGNED_DOC_UPLOAD',
            description: `Usuario subió un PDF para validación de firma: ${req.file.originalname}. Estado: ${status}`
        });

        res.json({ msg: 'Documento procesado', status: status, docId: newDoc.id });
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

        const doc = await SignedDocument.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!doc) return res.status(404).json({ msg: 'Documento no encontrado o no autorizado.' });

        // 1. Run Agent again
        const status = await checkSignatureAgent(req.file.buffer);

        // 2. Update DB
        doc.filename = req.file.originalname;
        doc.fileData = req.file.buffer;
        doc.signatureStatus = status;
        await doc.save();

        await AuditLog.create({
            userId: req.user.id,
            action: 'SIGNED_DOC_UPDATE',
            description: `Usuario actualizó documento firmado: ${req.file.originalname}. Nuevo estado: ${status}`
        });

        res.json({ msg: 'Documento actualizado', status: status });
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

// @route   GET api/signed-docs/download/:id/:filename
router.get('/download/:id/:filename', async (req, res) => {
    const token = req.header('x-auth-token') || req.query.token;
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        req.user = decoded.user;
    } catch (err) {
        return res.status(401).json({ msg: 'Token is not valid' });
    }
    try {
        const doc = await SignedDocument.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!doc) return res.status(404).json({ msg: 'Documento no encontrado o acceso denegado.' });

        await AuditLog.create({
            userId: req.user.id,
            action: 'SIGNED_DOC_DOWNLOAD',
            description: `Usuario descargó su documento firmado: ${doc.filename}`
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(doc.filename)}`);
        res.send(doc.fileData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al descargar el documento' });
    }
});

module.exports = router;
