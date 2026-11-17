'use strict';

/**
 * Administrador: VER y EDITAR trámites de los usuarios.
 *
 *   GET  /api/admin/form-editor/:id?mode=view|edit
 *        Devuelve la versión MÁS RECIENTE del trámite al que pertenece :id, el
 *        dueño, el historial de versiones y registra en bitácora
 *        ADMIN_FORM_VIEW (ver) o ADMIN_FORM_EDIT_OPEN (abrir para editar).
 *
 *   POST /api/admin/form-editor/:id/save   { data, expectedLatestId }
 *        Crea una NUEVA versión (nunca sobrescribe) a nombre del usuario dueño,
 *        marca la edición del administrador para que el usuario la vea y
 *        registra ADMIN_FORM_EDIT con los cambios campo a campo.
 *        Si el trámite cambió desde que se abrió (otra persona guardó),
 *        responde 409 y no guarda nada.
 *
 * Solo administradores reales (admin o master); los gerentes no tienen acceso.
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireFullAdmin = require('../middleware/requireFullAdmin');
const FormData = require('../models/FormData');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const personCatalogService = require('../services/personCatalogService');
const fv = require('../services/formVersionService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function adminLabel(req) {
    const u = req.dbUser || {};
    return u.email || req.user?.email || req.user?.id;
}

function ownerLabel(owner) {
    if (!owner) return 'usuario desconocido';
    return `${owner.name || owner.email}${owner.uniqueCode ? ` (${owner.uniqueCode})` : ''}`;
}

async function loadForm(req, res) {
    if (!UUID_RE.test(req.params.id)) {
        res.status(400).json({ msg: 'Identificador de trámite inválido' });
        return null;
    }
    const form = await FormData.findByPk(req.params.id);
    if (!form) {
        res.status(404).json({ msg: 'Trámite no encontrado' });
        return null;
    }
    return form;
}

/** Respuesta común (GET y tras guardar): versión más reciente, dueño, historial. */
async function buildPayload(requested, mode) {
    const chain = await fv.getChain(requested);
    const latest = fv.pickLatest(chain);
    const owner = await User.findByPk(latest.userId, { attributes: ['id', 'name', 'email', 'uniqueCode', 'status'] });
    const latestMeta = fv.getMeta(latest);
    return {
        latest,
        owner,
        body: {
            mode,
            requestedId: requested.id,
            requestedVersion: fv.getMeta(requested).version,
            form: {
                id: latest.id,
                type: latest.formType,
                data: latest.data,
                version: latestMeta.version,
                createdAt: latest.createdAt,
                updatedAt: latest.updatedAt,
            },
            owner: owner ? { id: owner.id, name: owner.name, email: owner.email, uniqueCode: owner.uniqueCode, status: owner.status } : null,
            adminEdits: fv.getAdminEditLog(latest).map(({ changes, ...rest }) => ({ ...rest, changesCount: Array.isArray(changes) ? changes.length : 0 })),
            versions: chain.map((r) => {
                const m = fv.getMeta(r);
                return { id: r.id, version: m.version, createdAt: r.createdAt, editedByAdmin: m.editedBy?.role === 'admin' };
            }).reverse(),
        },
    };
}

router.get('/:id', auth, requireFullAdmin, async (req, res) => {
    try {
        const requested = await loadForm(req, res);
        if (!requested) return;
        const mode = req.query.mode === 'edit' ? 'edit' : 'view';

        const { latest, owner, body } = await buildPayload(requested, mode);
        const latestMeta = fv.getMeta(latest);

        await AuditLog.create({
            userId: req.user.id,
            action: mode === 'edit' ? 'ADMIN_FORM_EDIT_OPEN' : 'ADMIN_FORM_VIEW',
            description: `Administrador ${adminLabel(req)} ${mode === 'edit' ? 'abrió para editar' : 'consultó'} el trámite ${latest.formType} v${latestMeta.version} de ${ownerLabel(owner)} (ID: ${latest.id})`,
        }).catch((e) => console.error('AuditLog error:', e.message));

        res.json(body);
    } catch (err) {
        console.error('admin form-editor GET error:', err);
        res.status(500).json({ msg: 'Error al cargar el trámite' });
    }
});

router.post('/:id/save', auth, requireFullAdmin, async (req, res) => {
    try {
        const requested = await loadForm(req, res);
        if (!requested) return;
        const { data, expectedLatestId } = req.body || {};
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return res.status(400).json({ msg: 'Datos del trámite inválidos' });
        }
        if (!expectedLatestId || !UUID_RE.test(expectedLatestId)) {
            return res.status(400).json({ msg: 'Falta la versión de referencia del trámite' });
        }

        const latest = await fv.getLatest(requested);
        const latestMeta = fv.getMeta(latest);
        if (latest.id !== expectedLatestId) {
            return res.status(409).json({
                code: 'FORM_CONFLICT',
                msg: 'El trámite fue modificado por otra persona mientras lo editabas. No se guardaron tus cambios.',
                latestId: latest.id,
                latestVersion: latestMeta.version,
                updatedAt: latest.updatedAt,
            });
        }

        const cleanData = fv.stripServerKeys(data);
        const changes = fv.computeChanges(latest.data, cleanData);
        if (changes.length === 0) {
            return res.json({ msg: 'No hay cambios que guardar', unchanged: true, form: { id: latest.id, version: latestMeta.version } });
        }

        const owner = await User.findByPk(latest.userId, { attributes: ['id', 'name', 'email', 'uniqueCode'] });
        const admin = req.dbUser || {};
        const nextVersion = latestMeta.version + 1;
        const now = new Date().toISOString();
        const editEntry = {
            at: now,
            version: nextVersion,
            adminId: req.user.id,
            adminName: admin.name || null,
            adminEmail: admin.email || null,
            changes: changes.slice(0, 100),
        };

        const newData = {
            ...cleanData,
            // El progreso del usuario no cambia porque el administrador edite.
            ...(latest.data?.__progress ? { __progress: latest.data.__progress } : {}),
            // El nombre personalizado que puso el usuario se conserva.
            ...(fv.getLabel(latest) ? { __label: fv.getLabel(latest) } : {}),
            __adminEditLog: [...fv.getAdminEditLog(latest), editEntry].slice(-fv.MAX_ADMIN_LOG),
            __metadata: {
                parentId: fv.getRootId(latest),
                version: nextVersion,
                editedBy: { role: 'admin', id: req.user.id, name: admin.name || null, email: admin.email || null, at: now },
            },
        };

        const newForm = await FormData.create({
            userId: latest.userId,
            formType: latest.formType,
            userUniqueCode: latest.userUniqueCode,
            data: newData,
        });

        personCatalogService.syncPeopleFromFormData(latest.userId, newData).catch((e) => console.error('Catalog Sync Error:', e.message));

        await AuditLog.create({
            userId: req.user.id,
            action: 'ADMIN_FORM_EDIT',
            description: `Administrador ${adminLabel(req)} editó el trámite ${latest.formType} de ${ownerLabel(owner)}: v${latestMeta.version} → v${nextVersion} (ID: ${newForm.id}). ${changes.length} cambio(s): ${fv.describeChanges(changes)}`,
        }).catch((e) => console.error('AuditLog error:', e.message));

        const { body } = await buildPayload(newForm, 'edit');
        res.json({ msg: 'Trámite actualizado por el administrador', form: { id: newForm.id, version: nextVersion }, changes: changes.length, payload: body });
    } catch (err) {
        console.error('admin form-editor SAVE error:', err);
        res.status(500).json({ msg: 'Error al guardar el trámite' });
    }
});

module.exports = router;
