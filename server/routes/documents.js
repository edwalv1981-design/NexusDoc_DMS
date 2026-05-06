const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const { UserDocument, AuditLog } = require('../models');
const path = require('path');

// Configure Multer for memory storage (PDF only)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF.'));
        }
    }
});

// @route   GET api/documents
// @desc    Get all documents for the authenticated user (metadata only)
router.get('/', auth, async (req, res) => {
    try {
        const documents = await UserDocument.findAll({
            where: { userId: req.user.id },
            attributes: ['id', 'filename', 'updatedAt'],
            order: [['updatedAt', 'DESC']]
        });
        res.json(documents);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al obtener documentos' });
    }
});

// @route   POST api/documents/upload
// @desc    Upload a new document
router.post('/upload', [auth, upload.single('document')], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Por favor seleccione un archivo PDF válido.' });
        }

        const newDoc = await UserDocument.create({
            userId: req.user.id,
            filename: req.file.originalname,
            fileData: req.file.buffer
        });

        // Audit Log
        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_DOC_UPLOAD',
            description: `El usuario adjuntó un nuevo documento: ${req.file.originalname}`
        });

        res.json({ msg: 'Documento subido con éxito', docId: newDoc.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Error al subir el documento' });
    }
});

// @route   PUT api/documents/update/:id
// @desc    Replace an existing document
router.put('/update/:id', [auth, upload.single('document')], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Por favor seleccione un archivo PDF válido.' });
        }

        const doc = await UserDocument.findOne({ where: { id: req.params.id, userId: req.user.id } });
        
        if (!doc) {
            return res.status(404).json({ msg: 'Documento no encontrado o no tiene permisos.' });
        }

        doc.filename = req.file.originalname;
        doc.fileData = req.file.buffer;
        await doc.save();

        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_DOC_UPDATE',
            description: `El usuario actualizó/reemplazó el documento: ${req.file.originalname}`
        });

        res.json({ msg: 'Documento actualizado con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Error al actualizar el documento' });
    }
});

// @route   DELETE api/documents/:id
// @desc    Delete a document
router.delete('/:id', auth, async (req, res) => {
    try {
        const doc = await UserDocument.findOne({ where: { id: req.params.id, userId: req.user.id } });
        
        if (!doc) {
            return res.status(404).json({ msg: 'Documento no encontrado o no tiene permisos.' });
        }

        const filename = doc.filename;
        await doc.destroy();

        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_DOC_DELETE',
            description: `El usuario eliminó su documento adjunto: ${filename}`
        });

        res.json({ msg: 'Documento eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al eliminar el documento' });
    }
});

// @route   GET api/documents/download/:id
// @desc    Download a document (Strict Security: only owner can download)
router.get('/download/:id', async (req, res) => {
    const token = req.header('x-auth-token') || req.query.token;
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        req.user = decoded.user;
    } catch (err) {
        return res.status(401).json({ msg: 'Token is not valid' });
    }
    try {
        const doc = await UserDocument.findOne({ where: { id: req.params.id, userId: req.user.id } });
        
        if (!doc) {
            return res.status(404).json({ msg: 'Documento no encontrado o acceso denegado.' });
        }

        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_DOC_DOWNLOAD',
            description: `El usuario descargó su documento adjunto: ${doc.filename}`
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
