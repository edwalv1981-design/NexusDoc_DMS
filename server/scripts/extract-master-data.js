const { Sequelize } = require('sequelize');
require('dotenv').config();

async function extractMaster() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/sistema_formularios`, { logging: false });
    try {
        await sequelize.authenticate();
        const [rows] = await sequelize.query('SELECT * FROM formularios');
        console.log(`--- FORMULARIOS MAESTROS (${rows.length}) ---`);
        
        for (const r of rows) {
            console.log(`\n========================================`);
            console.log(`TIPO: ${r.tipo} | PREFIJO: ${r.prefijo}`);
            console.log(`NOMBRE ARCHIVO: ${r.nombre_archivo}`);
            console.log(`CAMPOS CONFIGURADOS: ${JSON.stringify(r.campos_configurados, null, 2)}`);
            
            if (r.html_content) {
                console.log(`HTML CONTENT (Snippet): ${r.html_content.substring(0, 500)}...`);
            }
            
            // Si el archivo_base64 existe, intentar extraer texto si es PDF
            if (r.archivo_base64 && (r.tipo.toLowerCase().includes('fundacion') || r.prefijo === 'PTLF')) {
                console.log(`🎯 DETECTADA PLANTILLA DE FUNDACIÓN (PTLF)`);
                const pdf = require('pdf-parse');
                const buffer = Buffer.from(r.archivo_base64, 'base64');
                const data = await pdf(buffer);
                console.log('\n--- TEXTO EXTRAÍDO DEL PDF MASTER ---\n');
                console.log(data.text);
                console.log('\n--------------------------------------\n');
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
extractMaster();
