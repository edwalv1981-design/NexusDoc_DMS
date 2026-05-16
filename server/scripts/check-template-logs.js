const { AuditLog } = require('../models');
require('dotenv').config();

async function checkAudit() {
    const logs = await AuditLog.findAll({ 
        where: { action: 'TEMPLATE_UPLOAD' },
        order: [['createdAt', 'DESC']] 
    });
    logs.forEach(l => console.log(`[${l.createdAt}] ${l.action}: ${l.description}`));
    process.exit(0);
}
checkAudit();
