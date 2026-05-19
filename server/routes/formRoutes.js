const express = require('express');
const router = express.Router();
const { FormData, User, DocumentTemplate, AuditLog } = require('../models');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const corporacionHtmlPdfService = require('../services/corporacionHtmlPdfService');
const fundacionHtmlPdfService = require('../services/fundacionHtmlPdfService');
const stablePdfForms = require('../config/stablePdfForms');
const userLanguageStore = require('../services/userLanguageStore');

const templateAvailability = require('../utils/templateAvailability');
const pdfFormSchemas = require('../config/pdfFormSchemas');

// @route   GET api/forms/schema/:formType
router.get('/schema/:formType', auth, (req, res) => {
    const schema = pdfFormSchemas.getSchemaByFormType(req.params.formType);
    if (!schema) {
        return res.status(404).json({ msg: 'Esquema no definido para este tramite.' });
    }
    return res.json({
        schema,
        emptyState: pdfFormSchemas.emptyStateForSchema(schema),
        templateId: schema.templateId,
    });
});

// @route   POST api/forms/schema/:formType/validate
router.post('/schema/:formType/validate', auth, (req, res) => {
    const schema = pdfFormSchemas.getSchemaByFormType(req.params.formType);
    if (!schema) {
        return res.status(404).json({ msg: 'Esquema no definido.' });
    }
    const step = Number(req.body?.step) || 1;
    const data = req.body?.data || {};
    if (req.body?.all) {
        return res.json(pdfFormSchemas.validateAll(schema, data));
    }
    return res.json(pdfFormSchemas.validateStep(schema, step, data));
});


// @route   GET api/forms/templates/status
router.get('/templates/status', auth, async (req, res) => {
    try {
        const statuses = await templateAvailability.getClientTemplateStatusMap(DocumentTemplate);
        res.json(statuses);
    } catch (err) {
        console.error('Error al verificar estado de plantillas:', err);
        res.status(500).json({ msg: 'Error al verificar plantillas en el servidor.' });
    }
});

// @route   POST api/forms/save
router.post('/save', auth, async (req, res) => {
  try {
    const { id, type, data } = req.body;
    const formTypeLabel = type || 'Documento General';

    // Validación estricta de consistencia de plantilla antes de guardar
    const hasTemplate = await templateAvailability.checkTemplateExists(formTypeLabel, DocumentTemplate);
    if (!hasTemplate) {
        return res.status(400).json({ 
            status: 'error',
            errorType: 'TEMPLATE_MISSING',
            msg: `No se puede procesar el trámite porque la plantilla base para "${formTypeLabel}" no ha sido cargada por el administrador. Por favor, cargue la plantilla base en el panel de administración antes de continuar.`
        });
    }

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

        // Validación estricta de plantilla para generación de PDF
        const hasTemplate = await templateAvailability.checkTemplateExists(form.formType, DocumentTemplate);
        if (!hasTemplate) {
            return res.status(400).json({ 
                status: 'error',
                errorType: 'TEMPLATE_MISSING',
                msg: `No se puede generar el archivo PDF porque la plantilla base para "${form.formType}" no ha sido cargada por el administrador. Por favor, cargue la plantilla antes de continuar.`
            });
        }

        console.log(`[PDF] Iniciando generación para trámite ID: ${req.params.id}, tipo: ${form.formType}`);
        
        const userLanguage = await userLanguageStore.getUserLanguage(req.user.id);

        const templateName = stablePdfForms.getPdfTemplateNameForForm(form.formType);

        // Corporación: solo motor HTML
        if (stablePdfForms.isCorporacionPdfForm(form.formType)) {
            try {
                const pdfBuffer = await corporacionHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                AuditLog.create({
                    userId: req.user.id,
                    action: 'DOCUMENT_DOWNLOAD',
                    description: `Usuario descargó PDF HTML de trámite tipo: ${form.formType} (ID: ${form.id})`
                }).catch(err => console.error('Error registrando en bitácora:', err));
                const safeId = form.userUniqueCode ? form.userUniqueCode : form.id.toString().substring(0, 8);
                const fileName = `PTLC_${safeId}.pdf`;
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.setHeader('Content-Type', 'application/pdf');
                return res.send(pdfBuffer);
            } catch (htmlErr) {
                console.error('❌ ERROR CORPORACIÓN HTML:', htmlErr);
                return res.status(500).json({ msg: `ERROR GENERACIÓN CORPORACIÓN: ${htmlErr.message}` });
            }
        }

        // Fundación: motor HTML (Nivel Experto)
        if (stablePdfForms.isFundacionPdfForm(form.formType)) {
            try {
                const pdfBuffer = await fundacionHtmlPdfService.generatePdf(form.data || {}, { language: userLanguage });
                AuditLog.create({
                    userId: req.user.id,
                    action: 'DOCUMENT_DOWNLOAD',
                    description: `Usuario descargó PDF HTML de Fundación (ID: ${form.id})`
                }).catch(err => console.error('Error registrando en bitácora:', err));
                const safeId = form.userUniqueCode ? form.userUniqueCode : form.id.toString().substring(0, 8);
                const fileName = `PTLF_${safeId}.pdf`;
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.setHeader('Content-Type', 'application/pdf');
                return res.send(pdfBuffer);
            } catch (htmlErr) {
                console.error('❌ ERROR FUNDACIÓN HTML:', htmlErr);
                return res.status(500).json({ msg: `ERROR GENERACIÓN FUNDACIÓN: ${htmlErr.message}` });
            }
        }

        // 1. DETERMINAR PREFIJO Y RUTA LOCAL (Siguiendo instrucción de Master: Buscar por Ruta)
        let prefix = 'SFAR';
        if (stablePdfForms.isCorporacionPdfForm(form.formType)) prefix = 'PTLC';
        if (stablePdfForms.isFundacionPdfForm(form.formType)) prefix = 'PTLF';

        const localPath = path.join(__dirname, `../templates/${prefix}.pdf`);
        const legacyPath = path.join(__dirname, `../../templates/referencia_maestra.pdf`); // Fallback original
        
        let customTemplatePath = path.join(__dirname, `../../temp_custom_template_${form.id}.pdf`);

        if (fs.existsSync(localPath)) {
            console.log(`📂 Usando plantilla local por ruta directa: ${localPath}`);
            fs.copyFileSync(localPath, customTemplatePath);
        } else {
            // Respaldos y auto-healing (Si no existe el archivo con prefijo, buscamos en DB)
            const { Op } = require('sequelize');
            const searchNames = (templateName === 'referencia_maestra' || templateName === 'fondos')
                ? ['referencia_maestra', 'fondos']
                : [templateName];

            let dbTemplate = await DocumentTemplate.findOne({
                where: {
                    name: {
                        [Op.in]: searchNames
                    }
                }
            });
            
            if (dbTemplate && dbTemplate.fileData) {
                console.log(`🗄️ Usando plantilla desde Base de Datos: ${dbTemplate.name}`);
                fs.writeFileSync(customTemplatePath, dbTemplate.fileData);
            } else {
                return res.status(404).json({ msg: `Error: No se encontró plantilla en ruta (${localPath}) ni en DB.` });
            }
        }

        const outputPath = path.join(__dirname, `../../temp_filled_${form.id}.pdf`);
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.join(__dirname, '../scripts/fill_pdf_expert.py');

        const { spawn } = require('child_process');
        const pythonProcess = spawn(pythonCommand, [scriptPath]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { stderrData += data.toString(); });

        pythonProcess.on('error', (spawnErr) => {
            console.error('❌ ERROR AL INICIAR MOTOR PYTHON:', spawnErr);
            if (!res.headersSent) {
                res.status(500).json({ msg: 'Error crítico: No se pudo iniciar el motor de generación.', error: spawnErr.message });
            }
        });

        pythonProcess.on('close', async (code) => {
            if (res.headersSent) return;
            
            if (code !== 0) {
                console.error(`❌ ERROR MOTOR PYTHON (Exit Code ${code}): ${stderrData}`);
                if (customTemplatePath && fs.existsSync(customTemplatePath)) try { fs.unlinkSync(customTemplatePath); } catch(e) {}
                return res.status(500).json({ msg: `ERROR MOTOR GENERACIÓN: ${stderrData.substring(0, 200)}` });
            }
            if (!fs.existsSync(outputPath)) {
                if (customTemplatePath && fs.existsSync(customTemplatePath)) try { fs.unlinkSync(customTemplatePath); } catch(e) {}
                return res.status(500).json({ msg: 'No se generó el PDF' });
            }

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
            custom_template_path: customTemplatePath
        }));
        pythonProcess.stdin.end();

    } catch (e) {
        const errorDetail = `[${new Date().toISOString()}] ERROR PDF: ${e.message}\nStack: ${e.stack}\n`;
        require('fs').appendFileSync(require('path').join(__dirname, '../last_pdf_error.txt'), errorDetail);
        console.error('❌ Error general en generate-pdf:', e);
        res.status(500).json({ msg: 'Error de servidor', error: e.message });
    }
});

module.exports = router;
