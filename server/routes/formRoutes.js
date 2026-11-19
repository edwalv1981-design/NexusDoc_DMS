const express = require('express');
const router = express.Router();
const formVersions = require('../services/formVersionService');
const { FormData, User, DocumentTemplate, AuditLog, TemplateFieldSchema } = require('../models');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const corporacionHtmlPdfService = require('../services/corporacionHtmlPdfService');
const fundacionHtmlPdfService = require('../services/fundacionHtmlPdfService');
const kyciHtmlPdfService = require('../services/kyciHtmlPdfService');
const kyceHtmlPdfService = require('../services/kyceHtmlPdfService');
const fondosHtmlPdfService = require('../services/fondosHtmlPdfService');
const userLanguageStore = require('../services/userLanguageStore');
const stablePdfForms = require('../config/stablePdfForms');
const pdfFormSchemas = require('../config/pdfFormSchemas');
const templateFieldSchemaService = require('../services/templateFieldSchemaService');
const templateAvailability = require('../utils/templateAvailability');
const { resolvePythonCommand } = require('../utils/pythonCommand');
const personCatalogService = require('../services/personCatalogService');
const templateVersionService = require('../services/templateVersionService');

// Alcance por tipo de cuenta (admin: todo; Administrador Usuarios: él y sus
// subusuarios; usuario: solo lo suyo). La función anterior daba a los
// "Administrador Usuarios" acceso a los trámites de TODO el sistema.
const { accessibleUserIds, canAccessForm } = require('../utils/formAccess');

async function queryFormDataScoped(sequelize, sqlTemplate, replacements, req) {
    const uid = req.user && req.user.id;
    const scope = await accessibleUserIds(req);
    const ownerClauses = scope === null
        ? ['']
        : scope.length > 1
            ? [' AND user_id IN (:uids)', ' AND "userId" IN (:uids)']
            : [' AND user_id = :uid', ' AND "userId" = :uid'];
    const params = { ...replacements, uid, uids: scope && scope.length ? scope : [uid] };
    for (const owner of ownerClauses) {
        const sql = sqlTemplate.replace('/*OWNER*/', owner);
        try {
            const [rows] = await sequelize.query(sql, { replacements: params });
            return rows || [];
        } catch (e) {
            /* siguiente variante de columna */
        }
    }
    return [];
}

// Execute background backfill of historical forms on startup
personCatalogService.backfillHistoricalData().catch(err => console.error('Backfill error:', err));

// @route   GET api/forms/templates/status
// @desc    Disponibilidad de plantillas para el dashboard cliente
router.get('/templates/status', auth, async (req, res) => {
    try {
        const statuses = await templateAvailability.getClientTemplateStatusMap(DocumentTemplate);
        res.json(statuses);
    } catch (err) {
        console.error('Error forms templates/status:', err);
        res.status(500).json({ msg: 'Error al verificar plantillas.' });
    }
});

// @route   GET api/forms/template-version/active/:formType
// @desc    Plantilla activa (subida por el administrador) para trámites NUEVOS; null = formulario estándar
router.get('/template-version/active/:formType', auth, async (req, res) => {
    try {
        const { sequelize } = require('../config/db');
        const v = await templateVersionService.getActiveVersion(sequelize, req.params.formType);
        res.json({ version: templateVersionService.publicVersion(v) });
    } catch (err) {
        console.error('Error plantilla activa:', err);
        // Ante cualquier error el cliente usa el formulario estándar (comportamiento anterior).
        res.json({ version: null });
    }
});

// @route   GET api/forms/template-version/:id
// @desc    Esquema de la versión con la que se llenó un trámite
router.get('/template-version/:id', auth, async (req, res) => {
    try {
        const { sequelize } = require('../config/db');
        const v = await templateVersionService.getVersion(sequelize, req.params.id);
        if (!v) return res.status(404).json({ msg: 'Versión de plantilla no encontrada' });
        res.json({ version: templateVersionService.publicVersion(v) });
    } catch (err) {
        console.error('Error versión de plantilla:', err);
        res.status(500).json({ msg: 'Error al obtener la plantilla' });
    }
});

// @route   GET api/forms/schema/:templateName
// @desc    Obtiene el array de campos extraídos de una plantilla para el formulario dinámico
router.get('/schema/:templateName', auth, async (req, res) => {
    try {
        const { templateName } = req.params;
        const result = await templateFieldSchemaService.getEffectiveSchema(TemplateFieldSchema, templateName, true);
        
        // Si no hay esquema o está vacío, podría ser flatPdf o un error
        if (!result.schema || Object.keys(result.schema).length === 0) {
            return res.status(404).json({ msg: 'No se encontró un esquema de campos para esta plantilla', ...result });
        }
        res.json(result);
    } catch (err) {
        console.error('Error fetching template schema:', err);
        res.status(500).json({ msg: 'Error al obtener esquema' });
    }
});

// @route   GET api/forms/beneficiaries/search
router.get('/beneficiaries/search', auth, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json([]);

        const { sequelize } = require('../config/db');
        const rows = await queryFormDataScoped(
            sequelize,
            `SELECT data->>'beneficiaryName' AS "beneficiaryName",
                    data->>'birthDate'       AS "birthDate",
                    data->>'birthPlace'      AS "birthPlace",
                    data->>'address'         AS "address"
             FROM "FormData"
             WHERE data->>'beneficiaryName' ILIKE :pattern
             /*OWNER*/
             ORDER BY "updatedAt" DESC
             LIMIT 50`,
            { pattern: `%${q}%` },
            req
        );

        const resultsMap = new Map();
        rows.forEach(r => {
            const name = r.beneficiaryName;
            if (!name) return;
            if (!resultsMap.has(name)) {
                resultsMap.set(name, {
                    beneficiaryName: name,
                    birthDate: r.birthDate || '',
                    birthPlace: r.birthPlace || '',
                    address: r.address || '',
                });
            } else {
                const existing = resultsMap.get(name);
                if (!existing.birthDate && r.birthDate) existing.birthDate = r.birthDate;
                if (!existing.birthPlace && r.birthPlace) existing.birthPlace = r.birthPlace;
                if (!existing.address && r.address) existing.address = r.address;
            }
        });

        res.json(Array.from(resultsMap.values()).slice(0, 10));
    } catch (err) {
        console.error('Error searching beneficiaries:', err);
        res.status(500).json({ msg: 'Error al buscar beneficiarios' });
    }
});

// @route   GET api/forms/corporacion/search-person
router.get('/corporacion/search-person', auth, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json([]);

        const resultsMap = new Map();

        // 1. Primary: Master Person Catalog table (Fast, indexed, multi-tenant)
        try {
            const catalogPeople = await personCatalogService.searchPersonCatalog(req.user.id, q);
            catalogPeople.forEach(p => {
                const key = (p.passport || p.idNumber || p.fullName || '').trim();
                if (key) resultsMap.set(key, { ...p });
            });
        } catch (catErr) {
            console.error('Catalog search error:', catErr);
        }

        // 2. Secondary: Fallback to Users table (administrador: todos; Administrador
        // Usuarios: solo sus subusuarios; usuarios normales usan su catálogo)
        const usersScope = await accessibleUserIds(req);
        if (usersScope === null || usersScope.length > 1) {
        try {
            const { sequelize } = require('../config/db');
            const [userRows] = await sequelize.query(
                `SELECT name AS "fullName", "idNumber" AS "passport", email, nationality
                 FROM "Users"
                 WHERE (name ILIKE :pattern OR "idNumber" ILIKE :pattern OR email ILIKE :pattern)
                 ${usersScope ? 'AND id IN (:uids)' : ''}
                 LIMIT 20`,
                { replacements: { pattern: `%${q}%`, uids: usersScope || [] } }
            );
            userRows.forEach(u => {
                const key = (u.passport || u.fullName || u.email || '').trim();
                if (!key) return;
                if (!resultsMap.has(key)) {
                    resultsMap.set(key, {
                        fullName: u.fullName,
                        name: u.fullName,
                        passport: u.passport || '',
                        email: u.email || '',
                        nationality: u.nationality || ''
                    });
                }
            });
        } catch (userErr) {
            console.error('User search fallback error:', userErr);
        }
        }

        return res.json(Array.from(resultsMap.values()).slice(0, 10));
    } catch (err) {
        console.error('Error searching corporacion persons:', err);
        return res.json([]);
    }
});

// @route   GET api/forms/corporacion/search-shareholder
router.get('/corporacion/search-shareholder', auth, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json([]);

        const { sequelize } = require('../config/db');

        const rows = await queryFormDataScoped(
            sequelize,
            `SELECT DISTINCT ON (elem->>'name')
                    elem->>'name'        AS "name",
                    elem->>'address'     AS "address",
                    elem->>'certificate' AS "certificate",
                    elem->>'value'       AS "value",
                    elem->>'shares'      AS "shares"
             FROM "FormData",
                  jsonb_array_elements(data->'shareholders') AS elem
             WHERE elem->>'name' ILIKE :pattern
               AND elem->>'name' IS NOT NULL
               AND elem->>'name' != ''
             /*OWNER*/
             ORDER BY elem->>'name', "updatedAt" DESC
             LIMIT 50`,
            { pattern: `%${q}%` },
            req
        );

        const resultsMap = new Map();
        rows.forEach(r => {
            const name = (r.name || '').trim();
            if (!name) return;
            if (!resultsMap.has(name)) {
                resultsMap.set(name, { ...r });
            } else {
                const existing = resultsMap.get(name);
                Object.keys(r).forEach(k => {
                    if (!existing[k] && r[k]) existing[k] = r[k];
                });
            }
        });

        res.json(Array.from(resultsMap.values()).slice(0, 10));
    } catch (err) {
        console.error('Error searching corporacion shareholders:', err);
        res.status(500).json({ msg: 'Error al buscar accionistas' });
    }
});

// @route   GET api/forms/fundacion/search-person
router.get('/fundacion/search-person', auth, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json([]);

        const resultsMap = new Map();

        // 1. Primary: Master Person Catalog table (Fastest, indexed, multi-tenant)
        try {
            const catalogPeople = await personCatalogService.searchPersonCatalog(req.user.id, q);
            catalogPeople.forEach(p => {
                const key = (p.passport || p.idNumber || p.fullName || '').trim();
                if (key) resultsMap.set(key, { ...p });
            });
        } catch (catErr) {
            console.error('Catalog search error:', catErr);
        }

        // 2. Secondary: Fallback to Users table (administrador: todos; Administrador
        // Usuarios: solo sus subusuarios; usuarios normales usan su catálogo)
        const usersScope = await accessibleUserIds(req);
        if (usersScope === null || usersScope.length > 1) {
        try {
            const { sequelize } = require('../config/db');
            const [userRows] = await sequelize.query(
                `SELECT name AS "fullName", "idNumber" AS "passport", email, nationality
                 FROM "Users"
                 WHERE (name ILIKE :pattern OR "idNumber" ILIKE :pattern OR email ILIKE :pattern)
                 ${usersScope ? 'AND id IN (:uids)' : ''}
                 LIMIT 20`,
                { replacements: { pattern: `%${q}%`, uids: usersScope || [] } }
            );

            userRows.forEach(u => {
                const key = (u.passport || u.fullName || u.email || '').trim();
                if (!key) return;
                if (!resultsMap.has(key)) {
                    resultsMap.set(key, {
                        fullName: u.fullName,
                        name: u.fullName,
                        passport: u.passport || '',
                        email: u.email || '',
                        nationality: u.nationality || ''
                    });
                }
            });
        } catch (userErr) {
            console.error('User search fallback error:', userErr);
        }
        }

        return res.json(Array.from(resultsMap.values()).slice(0, 10));
    } catch (err) {
        console.error('Error searching fundacion persons:', err);
        return res.json([]);
    }
});

// @route   GET api/forms/fundacion/search-beneficiary
router.get('/fundacion/search-beneficiary', auth, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json([]);

        const { sequelize } = require('../config/db');

        const rows = await queryFormDataScoped(
            sequelize,
            `SELECT elem->>'shareholder' AS "shareholder",
                    elem->>'birthDate'   AS "birthDate",
                    elem->>'address'     AS "address"
             FROM "FormData",
                  jsonb_array_elements(CASE WHEN jsonb_typeof(data->'beneficiaries') = 'array' THEN data->'beneficiaries' ELSE '[]'::jsonb END) AS elem
             WHERE elem->>'shareholder' ILIKE :pattern
               AND elem->>'shareholder' IS NOT NULL
               AND elem->>'shareholder' != ''
             /*OWNER*/
             ORDER BY "updatedAt" DESC
             LIMIT 50`,
            { pattern: `%${q}%` },
            req
        );

        const resultsMap = new Map();
        rows.forEach(r => {
            const name = (r.shareholder || '').trim();
            if (!name) return;
            if (!resultsMap.has(name)) {
                resultsMap.set(name, { ...r });
            } else {
                const existing = resultsMap.get(name);
                Object.keys(r).forEach(k => {
                    if (!existing[k] && r[k]) existing[k] = r[k];
                });
            }
        });

        res.json(Array.from(resultsMap.values()).slice(0, 10));
    } catch (err) {
        console.error('Error searching fundacion beneficiaries:', err);
        res.status(500).json({ msg: 'Error al buscar beneficiarios' });
    }
});

// @route   GET api/forms/schema/:formType
router.get('/schema/:formType', auth, async (req, res) => {
    try {
        const formType = decodeURIComponent(req.params.formType);
        const merged = await templateFieldSchemaService.getMergedSchemaResponse(
            TemplateFieldSchema,
            formType,
            DocumentTemplate
        );
        if (!merged) {
            return res.status(404).json({ msg: 'Esquema no disponible para este trámite' });
        }
        res.setHeader('Cache-Control', 'no-store');
        return res.json(merged);
    } catch (err) {
        console.error('Error schema:', err);
        return res.status(500).json({ msg: 'Error al cargar esquema' });
    }
});

// @route   POST api/forms/schema/:formType/validate
router.post('/schema/:formType/validate', auth, async (req, res) => {
    try {
        const formType = decodeURIComponent(req.params.formType);
        const merged = await templateFieldSchemaService.getMergedSchemaResponse(
            TemplateFieldSchema,
            formType,
            DocumentTemplate
        );
        if (!merged?.schema) {
            return res.status(404).json({ msg: 'Esquema no disponible' });
        }
        if (merged.flatPdf) {
            return res.json({ ok: true, errors: [] });
        }
        const { step, data, all } = req.body || {};
        if (all) {
            return res.json(pdfFormSchemas.validateAll(merged.schema, data));
        }
        return res.json(pdfFormSchemas.validateStep(merged.schema, step, data));
    } catch (err) {
        console.error('Error validate schema:', err);
        return res.status(500).json({ msg: 'Error de validación' });
    }
});

// @route   POST api/forms/save
router.post('/save', auth, async (req, res) => {
  try {
    const { id, type, expectedLatestId } = req.body;
    // Claves que solo controla el servidor (__metadata, __adminEditLog, __progress):
    // nunca se aceptan tal cual desde el cliente.
    const rawData = req.body.data;
    // __templateVersion solo se acepta si la versión existe y es de este mismo formulario.
    const data = await templateVersionService.sanitizeVersionRef(
      require('../config/db').sequelize,
      formVersions.stripServerKeys(rawData),
      req.body.type
    );
    const clientProgress = rawData && typeof rawData === 'object' ? rawData.__progress : undefined;
    const formTypeLabel = type || 'Documento General';

    const userObj = await User.findByPk(req.user.id, { attributes: ['uniqueCode'] });
    const userCode = userObj ? userObj.uniqueCode : null;

    if (id) {
      const form = await FormData.findByPk(id);
      if (!form) return res.status(404).json({ msg: 'Formulario no encontrado' });
      if (form.userId !== req.user.id) return res.status(401).json({ msg: 'No autorizado' });

      // Versión más reciente del trámite. Si el cliente indica qué versión era la
      // más reciente cuando abrió el formulario y ya no lo es (p. ej. el
      // administrador lo editó), no se sobrescribe: se avisa con 409.
      // Sin expectedLatestId (restaurar desde el historial o clientes antiguos)
      // se mantiene el comportamiento anterior.
      const latest = await formVersions.getLatest(form);
      if (expectedLatestId && latest.id !== expectedLatestId) {
        const latestMeta = formVersions.getMeta(latest);
        return res.status(409).json({
          code: 'FORM_CONFLICT',
          msg: latestMeta.editedBy?.role === 'admin'
            ? 'El administrador modificó este trámite mientras lo editabas. Recarga para ver la versión actual; tus cambios no se guardaron.'
            : 'Este trámite se modificó en otra sesión mientras lo editabas. Recarga para ver la versión actual; tus cambios no se guardaron.',
          latestId: latest.id,
          latestVersion: latestMeta.version,
        });
      }

      // Calculate diff
      const oldData = form.data || {};
      const newData = data || {};
      const changedKeys = [];
      for (const k in newData) {
          if (JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])) changedKeys.push(k);
      }
      for (const k in oldData) {
          if (JSON.stringify(newData[k]) !== JSON.stringify(oldData[k]) && !changedKeys.includes(k)) changedKeys.push(k);
      }
      
      let changesText = changedKeys.length > 0 
          ? ` Campos modificados: ${changedKeys.join(', ')}` 
          : ' (Sin cambios detectados)';

      const parentId = (form.data && form.data.__metadata && form.data.__metadata.parentId) ? form.data.__metadata.parentId : form.id;
      // Siguiente número tras la versión MÁS RECIENTE (antes se calculaba sobre la
      // versión abierta y al restaurar una antigua se repetían números).
      const nextVersion = formVersions.getMeta(latest).version + 1;
      const adminEditLog = formVersions.getAdminEditLog(latest);
      const progress = formVersions.sanitizeProgress(clientProgress, latest.data && latest.data.__progress);

      // Add metadata to new data
      const dataWithMeta = {
          ...data,
          ...(progress ? { __progress: progress } : {}),
          // El rastro de ediciones del administrador se conserva siempre.
          ...(adminEditLog.length ? { __adminEditLog: adminEditLog } : {}),
          // El nombre personalizado del trámite pasa a la nueva versión.
          ...(formVersions.getLabel(latest) ? { __label: formVersions.getLabel(latest) } : {}),
          __metadata: { parentId, version: nextVersion }
      };

      // Instead of updating, we create a new version
      const newForm = await FormData.create({
        userId: req.user.id,
        formType: formTypeLabel,
        userUniqueCode: userCode,
        data: dataWithMeta
      });

      // Synchronize extracted persons with Master Person Catalog
      personCatalogService.syncPeopleFromFormData(req.user.id, dataWithMeta).catch(err => console.error('Catalog Sync Error:', err));
      
      AuditLog.create({
        userId: req.user.id,
        action: 'FORM_UPDATED',
        description: `Usuario actualizó el trámite a versión ${nextVersion}: ${formTypeLabel} (Padre: ${parentId}).${changesText}`
      }).catch(err => console.error('Error Bitácora:', err));

      return res.json({ msg: 'Actualizado con éxito', data: newForm });
    }

    // Add metadata for new form
    const newProgress = formVersions.sanitizeProgress(clientProgress, null);
    const dataWithMeta = {
        ...data,
        ...(newProgress ? { __progress: newProgress } : {}),
        __metadata: { parentId: null, version: 1 }
    };

    const newForm = await FormData.create({
      userId: req.user.id,
      formType: formTypeLabel,
      userUniqueCode: userCode,
      data: dataWithMeta
    });

    // Synchronize extracted persons with Master Person Catalog
    personCatalogService.syncPeopleFromFormData(req.user.id, dataWithMeta).catch(err => console.error('Catalog Sync Error:', err));

    // We must update the parentId to match its own ID since it's the first version!
    // But we don't know the ID until it's created. We can just leave it as null, 
    // and the frontend will use doc.id if parentId is null.

    AuditLog.create({
      userId: req.user.id,
      action: 'FORM_CREATED',
      description: `Usuario creó un nuevo trámite: ${formTypeLabel} (ID: ${newForm.id})`
    }).catch(err => console.error('Error Bitácora:', err));

    res.json({ msg: 'Guardado con éxito', data: newForm });
  } catch (err) {
    console.error('Error al guardar formulario:', err.message);
    res.status(500).json({ msg: 'Error de servidor: ' + err.message });
  }
});


// @route   GET api/forms/my-forms
router.get('/my-forms', auth, async (req, res) => {
  try {
    const forms = await FormData.findAll({
      where: { userId: req.user.id },
      order: [['updatedAt', 'DESC']]
    });
    const mapped = forms.map(f => {
        const meta = f.data && f.data.__metadata ? f.data.__metadata : { parentId: null, version: 1 };
        return {
            id: f.id,
            type: f.formType,
            date: f.updatedAt,
            data: f.data,
            parentId: meta.parentId,
            version: meta.version
        };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ msg: 'Error al recuperar documentos' });
  }
});

// @route   GET api/forms/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const form = await FormData.findByPk(req.params.id);
        if (!form || !(await canAccessForm(req, form))) return res.status(404).json({ msg: 'No encontrado' });
        // latestId / latestVersion: campos ADITIVOS para detectar ediciones simultáneas.
        const latest = await formVersions.getLatest(form).catch(() => form);
        res.json({
            id: form.id, type: form.formType, data: form.data, userId: form.userId,
            latestId: latest.id, latestVersion: formVersions.getMeta(latest).version
        });
    } catch (e) { res.status(500).json({ msg: 'Error' }); }
});

// @route   PATCH api/forms/:id/label
// @desc    Nombre personalizado del trámite (solo su dueño). Se guarda en la versión
//          más reciente sin crear una versión nueva; vacío = quitar el nombre.
router.patch('/:id/label', auth, async (req, res) => {
    try {
        const form = await FormData.findByPk(req.params.id);
        if (!form || form.userId !== req.user.id) return res.status(404).json({ msg: 'No encontrado' });
        const label = formVersions.sanitizeLabel(req.body && req.body.label);
        const latest = await formVersions.getLatest(form).catch(() => form);
        const data = { ...(latest.data || {}) };
        if (label) data.__label = label;
        else delete data.__label;
        latest.data = data;
        latest.changed('data', true);
        await latest.save();
        AuditLog.create({
            userId: req.user.id,
            action: 'FORM_LABEL',
            description: label
                ? `Usuario nombró el trámite ${latest.formType} (${formVersions.getRootId(latest)}) como "${label}"`
                : `Usuario quitó el nombre del trámite ${latest.formType} (${formVersions.getRootId(latest)})`,
        }).catch(() => {});
        res.json({ id: latest.id, label });
    } catch (e) {
        res.status(500).json({ msg: 'No se pudo guardar el nombre' });
    }
});

// @route   DELETE api/forms/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const form = await FormData.findByPk(req.params.id);
        if (!form || !(await canAccessForm(req, form))) return res.status(404).json({ msg: 'No encontrado' });
        await form.destroy();
        
        AuditLog.create({
            userId: req.user.id,
            action: 'FORM_DELETED',
            description: `Usuario eliminó el trámite: ${form.formType} (ID: ${form.id})`
        }).catch(err => console.error('Error Bitácora:', err));

        res.json({ msg: 'Eliminado' });
    } catch (e) { res.status(500).json({ msg: 'Error' }); }
});

// @route   GET api/forms/generate-pdf/:id
router.get('/generate-pdf/:id', auth, async (req, res) => {
    try {
        const form = await FormData.findByPk(req.params.id);
        if (!form || !(await canAccessForm(req, form))) return res.status(404).json({ msg: 'No encontrado' });

        // Idioma del PDF: el que indica quien lo solicita (?lang=es|en); si no, su idioma guardado.
        const requestedLang = String(req.query.lang || '').toLowerCase();
        const userLanguage = ['es', 'en'].includes(requestedLang)
            ? requestedLang
            : await userLanguageStore.getUserLanguage(req.user.id);

        const templateName = stablePdfForms.getPdfTemplateNameForForm(form.formType);

        const sendHtmlPdf = async (pdfBuffer, prefix) => {
            AuditLog.create({
                userId: req.user.id,
                action: 'DOCUMENT_DOWNLOAD',
                description: `Usuario descargó PDF HTML de trámite tipo: ${form.formType} (ID: ${form.id})`
            }).catch(err => console.error('Error registrando en bitácora:', err));
            const safeId = form.userUniqueCode ? form.userUniqueCode : form.id.toString().substring(0, 8);
            const fileName = `${prefix}_${safeId}.pdf`;
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', 'application/pdf');
            return res.send(pdfBuffer);
        };

        // Trámite llenado con una plantilla subida por el administrador: su PDF sigue ESA plantilla.
        // Trámites sin esa marca continúan exactamente con el motor de siempre (abajo).
        if (templateVersionService.versionRefOf(form.data)) {
            try {
                const { sequelize } = require('../config/db');
                const out = await templateVersionService.generatePdfForForm(sequelize, form.data);
                if (out) {
                    return sendHtmlPdf(out.buffer, stablePdfForms.getPdfDownloadFilenamePrefix(form.formType) || 'DOC');
                }
                console.warn(`Versión de plantilla no encontrada para trámite ${form.id}; se usa el motor estándar.`);
            } catch (tvErr) {
                console.error('Error generando PDF con plantilla versionada:', tvErr);
                return res.status(500).json({ msg: `ERROR PLANTILLA: ${tvErr.message}` });
            }
        }

        let dbTemplate = await DocumentTemplate.findOne({ where: { name: templateName } });

        // Corporación SIEMPRE usa el motor HTML dinámico (ignora plantilla subida)
        if (stablePdfForms.isCorporacionPdfForm(form.formType)) {
            try {
                const pdfBuffer = await corporacionHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                return sendHtmlPdf(pdfBuffer, 'PTLC');
            } catch (htmlErr) {
                console.error('Error generando PDF Corporación:', htmlErr);
                return res.status(500).json({ msg: `ERROR CORPORACION HTML: ${htmlErr.message}` });
            }
        }

        // Fundaciones SIEMPRE usa el motor HTML dinámico (ignora plantilla subida)
        if (stablePdfForms.isFundacionPdfForm(form.formType)) {
            try {
                const pdfBuffer = await fundacionHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                return sendHtmlPdf(pdfBuffer, 'PTLF');
            } catch (htmlErr) {
                console.error('Error generando PDF Fundaciones:', htmlErr);
                return res.status(500).json({ msg: `ERROR FUNDACION HTML: ${htmlErr.message}` });
            }
        }

        // KYCI SIEMPRE usa el motor HTML dinámico (ignora plantilla subida)
        if (stablePdfForms.isKyciHtmlForm(form.formType)) {
            try {
                const pdfBuffer = await kyciHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                return sendHtmlPdf(pdfBuffer, 'KYCI');
            } catch (htmlErr) {
                console.error('Error generando PDF KYCI:', htmlErr);
                return res.status(500).json({ msg: `ERROR KYCI HTML: ${htmlErr.message}` });
            }
        }

        // KYCE SIEMPRE usa el motor HTML dinámico (ignora plantilla subida)
        if (stablePdfForms.isKyceHtmlForm(form.formType)) {
            try {
                const pdfBuffer = await kyceHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                return sendHtmlPdf(pdfBuffer, 'KYCE');
            } catch (htmlErr) {
                console.error('Error generando PDF KYCE:', htmlErr);
                return res.status(500).json({ msg: `ERROR KYCE HTML: ${htmlErr.message}` });
            }
        }

        // Fondos SIEMPRE usa el motor HTML dinámico (ignora plantilla subida)
        if (stablePdfForms.isFondosHtmlForm(form.formType)) {
            try {
                const pdfBuffer = await fondosHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                return sendHtmlPdf(pdfBuffer, 'SFAR');
            } catch (htmlErr) {
                console.error('Error generando PDF Fondos:', htmlErr);
                return res.status(500).json({ msg: `ERROR FONDOS HTML: ${htmlErr.message}` });
            }
        }

        if (!dbTemplate || !dbTemplate.fileData) {
            const masterPath = path.join(__dirname, `../../templates/referencia_maestra.pdf`);
            const localSpecificPath = path.join(__dirname, `../../templates/${templateName}.pdf`);
            const pathToImport = fs.existsSync(localSpecificPath) ? localSpecificPath : (fs.existsSync(masterPath) ? masterPath : null);

            if (pathToImport) {
                console.log(`Cargando plantilla ${templateName} desde disco a la DB...`);
                const fileBuffer = fs.readFileSync(pathToImport);
                if (dbTemplate) {
                    await dbTemplate.update({ fileData: fileBuffer });
                } else {
                    dbTemplate = await DocumentTemplate.create({ name: templateName, fileData: fileBuffer });
                }
            } else {
                return res.status(400).json({ msg: `Error crítico: No existe plantilla (${templateName}) ni archivo base en el servidor.` });
            }
        }

        const customTemplatePath = path.join(__dirname, `../../temp_custom_template_${form.id}.pdf`);
        fs.writeFileSync(customTemplatePath, dbTemplate.fileData);

        const outputPath = path.join(__dirname, `../../temp_filled_${form.id}.pdf`);
        const pythonCommand = resolvePythonCommand();
        const scriptPath = path.join(__dirname, '../scripts/fill_pdf_expert.py');
        const fieldMapping = await templateFieldSchemaService.getFieldMappingForPdf(
            TemplateFieldSchema,
            form.formType
        );

        const { spawn } = require('child_process');
        const pythonProcess = spawn(pythonCommand, [scriptPath]);

        let stderrData = '';
        pythonProcess.stderr.on('data', (data) => { stderrData += data.toString(); });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error(`Error motor Python: ${stderrData}`);
                return res.status(500).json({ msg: `ERROR MOTOR: ${stderrData.substring(0, 150)}` });
            }
            if (!fs.existsSync(outputPath)) return res.status(500).json({ msg: 'No se generó el PDF' });

            
            AuditLog.create({
                userId: req.user.id,
                action: 'DOCUMENT_DOWNLOAD',
                description: `Usuario descargó PDF del trámite tipo: ${form.formType} (ID: ${form.id})`
            }).catch(err => console.error('Error registrando en bitácora:', err));

            const prefix = stablePdfForms.getPdfDownloadFilenamePrefix(form.formType);
            const safeId = form.userUniqueCode ? form.userUniqueCode : form.id.toString().substring(0, 8);
            const fileName = `${prefix}_${safeId}.pdf`;
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', 'application/pdf');
            
            const fileStream = fs.createReadStream(outputPath);
            fileStream.on('end', () => {
                if (fs.existsSync(outputPath)) try { fs.unlinkSync(outputPath); } catch(e) {}
                if (customTemplatePath && fs.existsSync(customTemplatePath)) try { fs.unlinkSync(customTemplatePath); } catch(e) {}
            });
            fileStream.pipe(res);
        });

        pythonProcess.stdin.write(JSON.stringify({ 
            data: form.data, 
            output_path: outputPath,
            template_name: templateName,
            custom_template_path: customTemplatePath,
            field_mapping: fieldMapping,
        }));
        pythonProcess.stdin.end();

    } catch (e) {
        console.error(e);
        res.status(500).json({ msg: 'Error de servidor' });
    }
});

module.exports = router;
