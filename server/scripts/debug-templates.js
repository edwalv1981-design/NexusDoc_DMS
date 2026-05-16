const { DocumentTemplate } = require('../models');
const { connectDB } = require('../config/db');

async function debug() {
    try {
        await connectDB();
        const templates = await DocumentTemplate.findAll();
        console.log(`Encontrados ${templates.length} registros.`);
        templates.forEach(t => {
            console.log(`ID: ${t.id} | NAME: "${t.name}" | SIZE: ${t.fileData ? t.fileData.length : 0} bytes`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
debug();
