'use strict';

/**
 * Administrador: revisión de documentos firmados.
 *
 *   GET  /api/admin/signatures?filter=pending|all
 *   POST /api/admin/signatures/:id/review   { decision: 'approved'|'rejected', note }
 *
 * Firma manuscrita (escaneada), certificado no reconocido o error de verificación
 * quedan "pendientes"; el administrador abre el PDF y decide. Cada decisión queda
 * en la bitácora (SIGNED_DOC_REVIEW). Solo administrador (admin / master).
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireFullAdmin = require('../middleware/requireFullAdmin');
const { SignedDocument, User, AuditLog } = require('../models');
const signatureService = require('../services/signatureService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_PENDING = 'Firma Pendiente';

function isPending(doc) {
    const review = doc.verification && doc.verification.review;
    if (review) return review.status === 'pending';
    // Documentos subidos antes de esta versión sin firma detectada.
    return doc.signatureStatus === LEGACY_PENDING;
}

router.get('/', auth, requireFullAdmin, async (req, res) => {
    try {
        const docs = await SignedDocument.findAll({
            attributes: ['id', 'userId', 'filename', 'signatureStatus', 'verification', 'fileHash', 'createdAt', 'updatedAt'],
            order: [['updatedAt', 'DESC']],
            limit: 500,
        });
        const list = req.query.filter === 'all' ? docs : docs.filter(isPending);
        const userIds = [...new Set(list.map((d) => d.userId))];
        const users = userIds.length
            ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'email', 'uniqueCode', 'idNumber'] })
            : [];
        const byId = new Map(users.map((u) => [u.id, u]));
        res.json({
            pendingCount: docs.filter(isPending).length,
            documents: list.map((d) => {
                const u = byId.get(d.userId);
                return {
                    id: d.id,
                    filename: d.filename,
                    signatureStatus: d.signatureStatus,
                    pending: isPending(d),
                    fileHash: d.fileHash,
                    verification: d.verification,
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                    user: u ? { id: u.id, name: u.name, email: u.email, uniqueCode: u.uniqueCode, idNumber: u.idNumber } : null,
                };
            }),
        });
    } catch (err) {
        console.error('admin signatures list error:', err);
        res.status(500).json({ msg: 'Error al obtener los documentos firmados' });
    }
});

router.post('/:id/review', auth, requireFullAdmin, async (req, res) => {
    try {
        if (!UUID_RE.test(req.params.id)) return res.status(400).json({ msg: 'Identificador inválido' });
        const { decision } = req.body || {};
        const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ msg: 'Decisión inválida (approved | rejected)' });
        }
        if (decision === 'rejected' && !note) {
            return res.status(400).json({ msg: 'Indique el motivo del rechazo' });
        }
        const doc = await SignedDocument.findByPk(req.params.id, { attributes: { exclude: ['fileData'] } });
        if (!doc) return res.status(404).json({ msg: 'Documento no encontrado' });

        const admin = req.dbUser || {};
        const before = doc.signatureStatus;
        const { verification, signatureStatus } = signatureService.applyReview(doc, {
            decision, note, admin: { id: req.user.id, name: admin.name, email: admin.email },
        });
        doc.verification = verification;
        doc.signatureStatus = signatureStatus;
        doc.changed('verification', true);
        await doc.save();

        const owner = await User.findByPk(doc.userId, { attributes: ['email', 'name'] });
        await AuditLog.create({
            userId: req.user.id,
            action: 'SIGNED_DOC_REVIEW',
            description: `Administrador ${admin.email || req.user.id} ${decision === 'approved' ? 'APROBÓ' : 'RECHAZÓ'} la firma del documento "${doc.filename}" de ${owner ? (owner.name || owner.email) : doc.userId}: ${before} → ${signatureStatus}${note ? `. Motivo/nota: ${note}` : ''}. SHA-256: ${doc.fileHash || '-'}`,
        }).catch((e) => console.error('AuditLog error:', e.message));

        res.json({ msg: 'Revisión registrada', signatureStatus, review: verification.review });
    } catch (err) {
        console.error('admin signatures review error:', err);
        res.status(500).json({ msg: 'Error al registrar la revisión' });
    }
});

module.exports = router;
