const { AuditLog } = require('../models');
require('dotenv').config();

async function checkAudit() {
    const logs = await AuditLog.findAll({ limit: 10, order: [['createdAt', 'DESC']] });
    logs.forEach(l => console.log(`[${l.createdAt}] ${l.action}: ${l.description}`));
    process.exit(0);
}
checkAudit();
