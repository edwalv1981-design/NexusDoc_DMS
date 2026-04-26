const express = require('express');
const router = express.Router();
const { FormData, User } = require('../models');
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

    const newForm = await FormData.create({
      userId: req.user.id,
      formType: formTypeLabel,
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

// @route   GET api/forms/generate-pdf/:id
router.get('/generate-pdf/:id', auth, async (req, res) => {
    try {
        const form = await FormData.findByPk(req.params.id);
        if (!form || form.userId !== req.user.id) return res.status(404).json({ msg: 'No encontrado' });

        const outputPath = path.join(__dirname, `../../temp_filled_${form.id}.pdf`);
        const scriptPath = path.join(__dirname, '../scripts/fill_pdf_expert.py');

        const pythonProcess = exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return res.status(500).json({ msg: 'Error al generar PDF' });
            }
            res.download(outputPath, `SFAR_Fiel_Copia_${form.id}.pdf`, (err) => {
                if (err) console.error('Error enviando archivo:', err);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            });
        });

        pythonProcess.stdin.write(JSON.stringify({ 
            data: form.data, 
            output_path: outputPath,
            template_name: "referencia_maestra" // Por ahora forzamos esta, pero ya está preparado para ser dinámico
        }));
        pythonProcess.stdin.end();

    } catch (e) {
        console.error(e);
        res.status(500).json({ msg: 'Error de servidor' });
    }
});

module.exports = router;
