const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { FormData, User, DocumentTemplate, AuditLog } = require('../models');
const auth = require('../middleware/auth');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// @route   POST api/forms/save
router.post('/save', auth, async (req, res) => {
  try {
    const { id, type, data } = req.body;
    const formTypeLabel = type || 'Documento General';

    if (id) {
      const form = await FormData.findByPk(id);
      if (!form) return res.status(404).json({ msg: 'Formulario no encontrado' });
      if (form.userId !== req.user.id) return res.status(401).json({ msg: 'No autorizado' });

      // Sequelize actualiza updatedAt automáticamente
      await form.update({ formType: formTypeLabel, data: data });
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
        res.json({ msg: 'Eliminado' });
    } catch (e) { res.status(500).json({ msg: 'Error' }); }
});

// @route   GET api/forms/generate-pdf/:id/:filename
router.get('/generate-pdf/:id/:filename', async (req, res) => {
    // Custom auth logic to allow token in query param for direct downloads
    const token = req.header('x-auth-token') || req.query.token;
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        req.user = decoded.user;
    } catch (err) {
        return res.status(401).json({ msg: 'Token is not valid' });
    }
    try {
        const form = await FormData.findByPk(req.params.id);
        if (!form || form.userId !== req.user.id) return res.status(404).json({ msg: 'No encontrado' });

        // Strict Mapping: FormType (DB) -> TemplateName (Admin Dashboard)
        const templateMap = {
            'Fondos Registros contables': 'fondos',
            'Corporación': 'corporacion',
            'Fundaciones': 'fundaciones',
            'Cumplimiento Individual': 'cumplimiento_individual',
            'Cumplimiento Entidades': 'cumplimiento_entidades'
        };
        const templateName = templateMap[form.formType] || form.formType || "fondos"; 
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
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.join(__dirname, '../scripts/fill_pdf_expert.py');

        console.log(`📡 Iniciando motor PDF (${pythonCommand})...`);

        const pythonProcess = exec(`${pythonCommand} "${scriptPath}"`, async (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error en motor Python: ${error.message}`);
                console.error(`🔍 Detalle Stderr: ${stderr}`);
                let displayErr = stderr ? stderr.toString().substring(0, 150) : error.message;
                return res.status(500).json({ msg: `ERROR MOTOR: ${displayErr}` });
            }
            
            if (!fs.existsSync(outputPath)) {
                console.error('❌ El script de Python terminó pero no generó el archivo.');
                return res.status(500).json({ msg: 'El motor no generó el documento final' });
            }

            console.log('✅ PDF generado con éxito, iniciando descarga.');
            
            // LOG ACCTION IN BITACORA
            AuditLog.create({
                userId: req.user.id,
                action: 'DOCUMENT_DOWNLOAD',
                description: `Usuario descargó PDF del trámite tipo: ${form.formType} (ID: ${form.id})`
            }).catch(err => console.error('Error registrando en bitácora:', err));

            // Prefix Mapping based on Form Type
            const normType = form.formType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            let prefix = 'DOC';
            if (normType.includes('fondos')) prefix = 'SFAR';
            else if (normType.includes('corporacion') || normType.includes('corporativos')) prefix = 'PTLC';
            else if (normType.includes('fundacion')) prefix = 'PTLF';
            else if (normType.includes('cumplimiento individual')) prefix = 'KYCI';
            else if (normType.includes('cumplimiento entidades')) prefix = 'KYCE';

            const safeId = form.userUniqueCode ? form.userUniqueCode : form.id.substring(0, 8);
            res.download(outputPath, `${prefix}_${safeId}.pdf`, (err) => {
                if (err) console.error('❌ Error enviando archivo al navegador:', err);
                // Limpiar temporal después de enviar
                if (fs.existsSync(outputPath)) {
                    try { fs.unlinkSync(outputPath); } catch(e) {}
                }
                if (customTemplatePath && fs.existsSync(customTemplatePath)) {
                    try { fs.unlinkSync(customTemplatePath); } catch(e) {}
                }
            });
        });

        pythonProcess.stdin.write(JSON.stringify({ 
            data: form.data, 
            output_path: outputPath,
            template_name: templateName,
            custom_template_path: customTemplatePath
        }));
        pythonProcess.stdin.end();

    } catch (e) {
        console.error(e);
        res.status(500).json({ msg: 'Error de servidor' });
    }
});

// @route   GET api/forms/generate-pdf/:id (backward compatibility fallback)
router.get('/generate-pdf/:id', async (req, res) => {
    const token = req.header('x-auth-token') || req.query.token;
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        req.user = decoded.user;
    } catch (err) {
        return res.status(401).json({ msg: 'Token is not valid' });
    }
    // Redirect to the named route
    res.redirect(`/api/forms/generate-pdf/${req.params.id}/document.pdf?token=${token}`);
});

module.exports = router;
