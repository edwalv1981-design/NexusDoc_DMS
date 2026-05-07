const { DocumentTemplate } = require('./server/models');
const { Sequelize } = require('sequelize');

async function check() {
  try {
    const templates = await DocumentTemplate.findAll();
    console.log('--- PLANTILLAS EN DB ---');
    templates.forEach(t => {
      console.log(`Nombre: ${t.name} | Archivo: ${t.filename} | Ruta: ${t.path}`);
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
