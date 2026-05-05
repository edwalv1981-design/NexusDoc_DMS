const { DocumentTemplate } = require('./server/models');

async function checkTemplates() {
    try {
        const templates = await DocumentTemplate.findAll({ attributes: ['name'] });
        console.log('TEMPLATES IN DB:');
        templates.forEach(t => console.log(`- ${t.name}`));
        process.exit(0);
    } catch (err) {
        console.error('ERROR CHECKING DB:', err.message);
        process.exit(1);
    }
}

checkTemplates();
