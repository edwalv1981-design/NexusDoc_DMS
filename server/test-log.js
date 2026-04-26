const { AuditLog, User } = require('./models');
const { sequelize } = require('./config/db');

async function testLog() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');
        
        const user = await User.findOne();
        if (!user) {
            console.log('❌ No user found to test log');
            return;
        }

        console.log('Creating log for user:', user.id);
        const log = await AuditLog.create({
            userId: user.id,
            action: 'TEST',
            description: 'Test log entry'
        });
        console.log('✅ Log created:', log.id);
    } catch (err) {
        console.error('❌ Error creating log:', err);
    } finally {
        process.exit();
    }
}

testLog();
