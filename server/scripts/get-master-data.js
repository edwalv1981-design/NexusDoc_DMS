const { FormData, User } = require('../models');
require('dotenv').config();

async function checkMasterData() {
    const admin = await User.findOne({ where: { email: 'rokutvedw@gmail.com' } });
    if (!admin) {
        console.log('Admin not found');
        process.exit(1);
    }
    
    const forms = await FormData.findAll({ where: { userId: admin.id } });
    console.log(`FOUND ${forms.length} forms for Master User`);
    
    forms.forEach(f => {
        console.log(`TYPE: ${f.formType} | ID: ${f.id}`);
        // console.log('DATA:', JSON.stringify(f.data, null, 2));
        console.log('---');
    });
    process.exit(0);
}
checkMasterData();
