const express = require('express');
const router = express.Router();
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
        const [rows] = await sequelize.query(
            `SELECT data->>'beneficiaryName' AS "beneficiaryName",
                    data->>'birthDate'       AS "birthDate",
                    data->>'birthPlace'      AS "birthPlace",
                    data->>'address'         AS "address"
             FROM "FormData"
             WHERE data->>'beneficiaryName' ILIKE :pattern
             ORDER BY "updatedAt" DESC
             LIMIT 50`,
            { replacements: { pattern: `%${q}%` } }
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

        const { sequelize } = require('../config/db');

        const [directorRows] = await sequelize.query(
            `SELECT DISTINCT ON (COALESCE(NULLIF(elem->>'passport',''), elem->>'fullName'))
                    elem->>'fullName'      AS "fullName",
                    elem->>'firstName'     AS "firstName",
                    elem->>'secondName'    AS "secondName",
                    elem->>'lastName'      AS "lastName",
                    elem->>'birthDate'     AS "birthDate",
                    elem->>'maritalStatus' AS "maritalStatus",
                    elem->>'nationality'   AS "nationality",
                    elem->>'passport'      AS "passport",
                    elem->>'phone'         AS "phone",
                    elem->>'email'         AS "email",
                    elem->>'address'       AS "address",
                    elem->>'city'          AS "city",
                    elem->>'country'       AS "country"
             FROM "FormData",
                  jsonb_array_elements(data->'directors') AS elem
             WHERE (elem->>'passport' ILIKE :pattern
                    OR elem->>'fullName' ILIKE :pattern
                    OR elem->>'firstName' ILIKE :pattern
                    OR elem->>'lastName' ILIKE :pattern)
               AND (NULLIF(elem->>'passport','') IS NOT NULL
                    OR NULLIF(elem->>'fullName','') IS NOT NULL)
             ORDER BY COALESCE(NULLIF(elem->>'passport',''), elem->>'fullName'), "updatedAt" DESC
             LIMIT 50`,
            { replacements: { pattern: `%${q}%` } }
        );

        const [dignitaryRows] = await sequelize.query(
            `SELECT DISTINCT ON (COALESCE(NULLIF(elem->>'passport',''), elem->>'fullName'))
                    elem->>'fullName'           AS "fullName",
                    elem->>'birthDate'          AS "birthDate",
                    elem->>'passport'           AS "passport",
                    elem->>'registrationNumber' AS "registrationNumber"
             FROM "FormData",
                  jsonb_array_elements(data->'dignitaries') AS elem
             WHERE (elem->>'passport' ILIKE :pattern
                    OR elem->>'fullName' ILIKE :pattern)
               AND (NULLIF(elem->>'passport','') IS NOT NULL
                    OR NULLIF(elem->>'fullName','') IS NOT NULL)
             ORDER BY COALESCE(NULLIF(elem->>'passport',''), elem->>'fullName'), "updatedAt" DESC
             LIMIT 50`,
            { replacements: { pattern: `%${q}%` } }
        );

        const resultsMap = new Map();

        directorRows.forEach(r => {
            if (!r.fullName) {
                r.fullName = [r.firstName, r.secondName, r.lastName].filter(Boolean).join(' ');
            }
            const key = (r.passport || r.fullName || '').trim();
            if (!key) return;
            if (!resultsMap.has(key)) {
                resultsMap.set(key, { ...r });
            } else {
                const existing = resultsMap.get(key);
                Object.keys(r).forEach(k => {
                    if (!existing[k] && r[k]) existing[k] = r[k];
                });
            }
        });

        dignitaryRows.forEach(r => {
            const key = (r.passport || r.fullName || '').trim();
            if (!key) return;
            if (!resultsMap.has(key)) {
                resultsMap.set(key, { passport: r.passport, fullName: r.fullName, birthDate: r.birthDate, registrationNumber: r.registrationNumber });
            } else {
                const existing = resultsMap.get(key);
                if (!existing.fullName && r.fullName) existing.fullName = r.fullName;
                if (!existing.birthDate && r.birthDate) existing.birthDate = r.birthDate;
                if (!existing.registrationNumber && r.registrationNumber) existing.registrationNumber = r.registrationNumber;
            }
        });

        res.json(Array.from(resultsMap.values()).slice(0, 10));
    } catch (err) {
        console.error('Error searching corporacion persons:', err);
        res.status(500).json({ msg: 'Error al buscar personas' });
    }
});

// @route   GET api/forms/corporacion/search-shareholder
router.get('/corporacion/search-shareholder', auth, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json([]);

        const { sequelize } = require('../config/db');

        const [rows] = await sequelize.query(
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
             ORDER BY elem->>'name', "updatedAt" DESC
             LIMIT 50`,
            { replacements: { pattern: `%${q}%` } }
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

        const { sequelize } = require('../config/db');

        const personArrays = ['founders', 'protectors', 'councilMembers', 'directors'];
        const allRows = [];

        for (const arr of personArrays) {
            const [rows] = await sequelize.query(
                `SELECT elem->>'fullName'      AS "fullName",
                        elem->>'firstName'     AS "firstName",
                        elem->>'secondName'    AS "secondName",
                        elem->>'lastName'      AS "lastName",
                        elem->>'birthDate'     AS "birthDate",
                        elem->>'maritalStatus' AS "maritalStatus",
                        elem->>'nationality'   AS "nationality",
                        elem->>'passport'      AS "passport",
                        elem->>'idCard'        AS "idCard",
                        elem->>'phone'         AS "phone",
                        elem->>'email'         AS "email",
                        elem->>'address'       AS "address",
                        elem->>'city'          AS "city",
                        elem->>'country'       AS "country"
                 FROM "FormData",
                      jsonb_array_elements(CASE WHEN jsonb_typeof(data->:arrName) = 'array' THEN data->:arrName ELSE '[]'::jsonb END) AS elem
                 WHERE (elem->>'passport' ILIKE :pattern
                        OR elem->>'fullName' ILIKE :pattern
                        OR elem->>'firstName' ILIKE :pattern
                        OR elem->>'lastName' ILIKE :pattern)
                 ORDER BY "updatedAt" DESC
                 LIMIT 30`,
                { replacements: { pattern: `%${q}%`, arrName: arr } }
            );
            allRows.push(...rows);
        }

        const [dignitaryRows] = await sequelize.query(
            `SELECT elem->>'fullName'           AS "fullName",
                    elem->>'birthDate'          AS "birthDate",
                    elem->>'passport'           AS "passport",
                    elem->>'registrationNumber' AS "registrationNumber",
                    elem->>'address'            AS "address"
             FROM "FormData",
                  jsonb_array_elements(CASE WHEN jsonb_typeof(data->'dignitaries') = 'array' THEN data->'dignitaries' ELSE '[]'::jsonb END) AS elem
             WHERE (elem->>'passport' ILIKE :pattern
                    OR elem->>'fullName' ILIKE :pattern)
             ORDER BY "updatedAt" DESC
             LIMIT 30`,
            { replacements: { pattern: `%${q}%` } }
        );

        const resultsMap = new Map();

        allRows.forEach(r => {
            if (!r.fullName) {
                r.fullName = [r.firstName, r.secondName, r.lastName].filter(Boolean).join(' ');
            }
            const key = (r.passport || r.fullName || '').trim();
            if (!key) return;
            if (!resultsMap.has(key)) {
                resultsMap.set(key, { ...r });
            } else {
                const existing = resultsMap.get(key);
                Object.keys(r).forEach(k => {
                    if (!existing[k] && r[k]) existing[k] = r[k];
                });
            }
        });

        dignitaryRows.forEach(r => {
            const key = (r.passport || r.fullName || '').trim();
            if (!key) return;
            if (!resultsMap.has(key)) {
                resultsMap.set(key, { fullName: r.fullName, passport: r.passport, birthDate: r.birthDate, registrationNumber: r.registrationNumber, address: r.address });
            } else {
                const existing = resultsMap.get(key);
                if (!existing.fullName && r.fullName) existing.fullName = r.fullName;
                if (!existing.birthDate && r.birthDate) existing.birthDate = r.birthDate;
                if (!existing.registrationNumber && r.registrationNumber) existing.registrationNumber = r.registrationNumber;
            }
        });

        res.json(Array.from(resultsMap.values()).slice(0, 10));
    } catch (err) {
        console.error('Error searching fundacion persons:', err);
        res.status(500).json({ msg: 'Error al buscar personas' });
    }
});

// @route   GET api/forms/fundacion/search-beneficiary
router.get('/fundacion/search-beneficiary', auth, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json([]);

        const { sequelize } = require('../config/db');

        const [rows] = await sequelize.query(
            `SELECT elem->>'shareholder' AS "shareholder",
                    elem->>'birthDate'   AS "birthDate",
                    elem->>'address'     AS "address"
             FROM "FormData",
                  jsonb_array_elements(CASE WHEN jsonb_typeof(data->'beneficiaries') = 'array' THEN data->'beneficiaries' ELSE '[]'::jsonb END) AS elem
             WHERE elem->>'shareholder' ILIKE :pattern
               AND elem->>'shareholder' IS NOT NULL
               AND elem->>'shareholder' != ''
             ORDER BY "updatedAt" DESC
             LIMIT 50`,
            { replacements: { pattern: `%${q}%` } }
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
    const { id, type, data } = req.body;
    const formTypeLabel = type || 'Documento General';

    if (id) {
      const form = await FormData.findByPk(id);
      if (!form) return res.status(404).json({ msg: 'Formulario no encontrado' });
      if (form.userId !== req.user.id) return res.status(401).json({ msg: 'No autorizado' });

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

      await form.update({ formType: formTypeLabel, data: data });
      
      AuditLog.create({
        userId: req.user.id,
        action: 'FORM_UPDATED',
        description: `Usuario actualizó el trámite: ${formTypeLabel} (ID: ${form.id}).${changesText}`
      }).catch(err => console.error('Error Bitácora:', err));

      return res.json({ msg: 'Actualizado con éxito', data: form });
    }

    const userObj = await User.findByPk(req.user.id, { attributes: ['uniqueCode'] });
    const userCode = userObj ? userObj.uniqueCode : null;

    const newForm = await FormData.create({
      userId: req.user.id,
      formType: formTypeLabel,
      userUniqueCode: userCode,
      data: data
    });

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
    const mapped = forms.map(f => ({
        id: f.id,
        type: f.formType,
        date: f.updatedAt,
        data: f.data
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ msg: 'Error al recuperar documentos' });
  }
});

// @route   GET api/forms/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const form = await FormData.findByPk(req.params.id);
        if (!form || form.userId !== req.user.id) return res.status(404).json({ msg: 'No encontrado' });
        res.json({ id: form.id, type: form.formType, data: form.data });
    } catch (e) { res.status(500).json({ msg: 'Error' }); }
});

// @route   DELETE api/forms/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const form = await FormData.findByPk(req.params.id);
        if (!form || form.userId !== req.user.id) return res.status(404).json({ msg: 'No encontrado' });
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
        if (!form || form.userId !== req.user.id) return res.status(404).json({ msg: 'No encontrado' });

        const userLanguage = await userLanguageStore.getUserLanguage(req.user.id);

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
