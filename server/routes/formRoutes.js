const express = require('express');
const router = express.Router();
const { FormData, User, DocumentTemplate, AuditLog, TemplateFieldSchema } = require('../models');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const corporacionHtmlPdfService = require('../services/corporacionHtmlPdfService');
const fundacionHtmlPdfService = require('../services/fundacionHtmlPdfService');
const kyciHtmlPdfService = require('../services/kyciHtmlPdfService');
const userLanguageStore = require('../services/userLanguageStore');
const stablePdfForms = require('../config/stablePdfForms');
const pdfFormSchemas = require('../config/pdfFormSchemas');
const templateFieldSchemaService = require('../services/templateFieldSchemaService');
const templateAvailability = require('../utils/templateAvailability');
const { resolvePythonCommand } = require('../utils/pythonCommand');

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

      await form.update({ formType: formTypeLabel, data: data });
      
      // BITÁCORA: Registro de actualización
      AuditLog.create({
        userId: req.user.id,
        action: 'FORM_UPDATED',
        description: `Usuario actualizó el trámite: ${formTypeLabel} (ID: ${form.id})`
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

    // BITÁCORA: Registro de creación
    AuditLog.create({
      userId: req.user.id,
      action: 'FORM_CREATED',
      description: `Usuario creó un nuevo trámite: ${formTypeLabel} (ID: ${newForm.id})`
    }).catch(err => console.error('Error Bitácora:', err));

    res.json({ msg: 'Guardado con éxito', data: newForm });
  } catch (err) {
    console.error('❌ ERROR AL GUARDAR:', err.message);
    res.status(500).json({ msg: 'Error de servidor: ' + err.message });
  }
});


// @route   GET api/forms/my-forms
router.get('/my-forms', auth, async (req, res) => {
  try {
    const forms = await FormData.findAll({
      where: { userId: req.user.id },
      order: [['updatedAt', 'DESC']] // ORDENAR POR ÚLTIMA EDICIÓN (INGENIERO PROTOCOL)
    });
    const mapped = forms.map(f => ({
        id: f.id,
        type: f.formType,
        date: f.updatedAt, // DEVOLVER ÚLTIMA FECHA DE MODIFICACIÓN
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
        
        // BITÁCORA: Registro de eliminación
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

        // Corporación / Fundaciones / KYCI: motor HTML (sin plantilla AcroForm obligatoria).
        if (stablePdfForms.isCorporacionPdfForm(form.formType)) {
            try {
                const pdfBuffer = await corporacionHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                return sendHtmlPdf(pdfBuffer, 'PTLC');
            } catch (htmlErr) {
                console.error('❌ Corporación HTML falló:', htmlErr);
                return res.status(500).json({ msg: `ERROR CORPORACION HTML: ${htmlErr.message}` });
            }
        }

        if (stablePdfForms.isFundacionPdfForm(form.formType)) {
            try {
                const pdfBuffer = await fundacionHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                return sendHtmlPdf(pdfBuffer, 'PTLF');
            } catch (htmlErr) {
                console.error('❌ Fundaciones HTML falló:', htmlErr);
                return res.status(500).json({ msg: `ERROR FUNDACION HTML: ${htmlErr.message}` });
            }
        }

        if (stablePdfForms.isKyciHtmlForm(form.formType)) {
            try {
                const pdfBuffer = await kyciHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                return sendHtmlPdf(pdfBuffer, 'KYCI');
            } catch (htmlErr) {
                console.error('❌ KYCI HTML falló:', htmlErr);
                return res.status(500).json({ msg: `ERROR KYCI HTML: ${htmlErr.message}` });
            }
        }

        let dbTemplate = await DocumentTemplate.findOne({ where: { name: templateName } });
        
        // AUTO-HEALING: Si no existe en DB, intentamos cargar desde el disco maestro
        if (!dbTemplate || !dbTemplate.fileData) {
            const masterPath = path.join(__dirname, `../../templates/referencia_maestra.pdf`);
            const localSpecificPath = path.join(__dirname, `../../templates/${templateName}.pdf`);
            const pathToImport = fs.existsSync(localSpecificPath) ? localSpecificPath : (fs.existsSync(masterPath) ? masterPath : null);

            if (pathToImport) {
                console.log(`🛠️ Auto-Healing: Cargando plantilla ${templateName} desde disco a la DB...`);
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
                console.error(`❌ Error motor Python: ${stderrData}`);
                return res.status(500).json({ msg: `ERROR MOTOR: ${stderrData.substring(0, 150)}` });
            }
            if (!fs.existsSync(outputPath)) return res.status(500).json({ msg: 'No se generó el PDF' });

            // LOG ACCTION IN BITACORA
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
