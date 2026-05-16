const { FormData } = require('../models');
require('dotenv').config();

async function listData() {
    const rows = await FormData.findAll({ limit: 5, order: [['updatedAt', 'DESC']] });
    rows.forEach(r => {
        console.log(`TIPO: ${r.formType} | FECHA: ${r.updatedAt}`);
        console.log(JSON.stringify(r.data, (k,v) => (typeof v === 'string' && v.length > 50 ? v.substring(0,50)+'...' : v), 2));
        console.log('-----------------------------------');
    });
    process.exit(0);
}
listData();
