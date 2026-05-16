const { DocumentTemplate } = require('../models');
const { connectDB, sequelize } = require('../config/db');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function extract() {
    try {
        await connectDB();
        console.log('✅ Conectado a la DB');

        // Buscar plantilla de fundaciones (probar diferentes nombres comunes)
        const templateNames = ['fundaciones', 'Fundaciones', 'Fundación', 'PTLF'];
        let template = null;
        
        for (const name of templateNames) {
            template = await DocumentTemplate.findOne({ where: { name } });
            if (template) {
                console.log(`🔍 Encontrada plantilla: ${name}`);
                break;
            }
        }

        if (!template) {
            console.error('❌ No se encontró la plantilla de fundaciones en la BD');
            process.exit(1);
        }

        const buffer = template.fileData;
        const data = await pdf(buffer);

        console.log('\n--- CONTENIDO LITERAL DEL PDF ---\n');
        console.log(data.text);
        console.log('\n---------------------------------\n');

        // También guardar a archivo para inspección manual si es necesario
        const outputPath = path.join(__dirname, 'foundation_extracted.txt');
        fs.writeFileSync(outputPath, data.text);
        console.log(`💾 Texto extraído guardado en: ${outputPath}`);

        process.exit(0);
    } catch (err) {
        console.error('🔥 Error:', err);
        process.exit(1);
    }
}

extract();
