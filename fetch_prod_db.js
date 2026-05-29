const https = require('https');
const fs = require('fs');

const data = JSON.stringify({ query: 'DROP TABLE IF EXISTS "PendingRegistrations", "FormData", "AuditLogs", "DocumentTemplates", "UserDocuments", "SignedDocuments", "Users" CASCADE;' });

const req = https.request('https://nexusdocdms-production.up.railway.app/api/admin/debug-db', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        fs.writeFileSync('prod_db_dump.json', body);
        console.log('Database dump saved to prod_db_dump.json');
    });
});

req.on('error', err => console.error(err));
req.write(data);
req.end();
