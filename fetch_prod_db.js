const https = require('https');
const fs = require('fs');

https.get('https://nexusdocdms-production.up.railway.app/api/admin/debug-db', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('prod_db_dump.json', data);
        console.log('Database dump saved to prod_db_dump.json');
    });
}).on('error', err => console.error(err));
