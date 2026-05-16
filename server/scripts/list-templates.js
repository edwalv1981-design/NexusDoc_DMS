const { DocumentTemplate } = require('../models');
require('dotenv').config();

async function list() {
    const ts = await DocumentTemplate.findAll({ attributes: ['id', 'name', 'updatedAt'] });
    console.log('TEMPLATES:', ts.map(t => t.get({plain:true})));
    process.exit(0);
}
list();
