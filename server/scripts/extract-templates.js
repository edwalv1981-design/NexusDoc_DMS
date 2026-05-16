const { DocumentTemplate } = require('../models');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function extractTemplates() {
    const templates = await DocumentTemplate.findAll();
    for (const t of templates) {
        const filePath = path.join(__dirname, `../temp_extract_${t.name}.pdf`);
        fs.writeFileSync(filePath, t.fileData);
        console.log(`✅ Plantilla extraída a: ${filePath}`);
    }
    process.exit(0);
}
extractTemplates();
