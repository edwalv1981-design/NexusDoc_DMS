const { FormData } = require('../models');
require('dotenv').config();

async function listAll() {
    const forms = await FormData.findAll();
    console.log(`TOTAL FORMS: ${forms.length}`);
    forms.forEach(f => {
        console.log(`ID: ${f.id} | TYPE: ${f.formType} | CREATED: ${f.createdAt}`);
        // Log a bit of data to see if it's a "Master" one
        console.log(`DATA PREVIEW: ${JSON.stringify(f.data).substring(0, 100)}`);
        console.log('---');
    });
    process.exit(0);
}
listAll();
