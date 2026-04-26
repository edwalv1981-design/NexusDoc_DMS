const { sequelize } = require('./config/db');
const { User } = require('./models');

const prefixes = { 
    'Fondos Registros contables': 'SFAR', 
    'Corporación': 'PTLC', 
    'Fundaciones': 'PTLF', 
    'Cumplimiento Individual': 'KYCI', 
    'Cumplimiento Entidades': 'KYCE' 
};

async function fixUniqueCodes() {
    try {
        console.log('🔄 Sincronizando base de datos...');
        await sequelize.sync({ alter: true });
        console.log('✅ Base de datos sincronizada.');

        const users = await User.findAll();
        console.log(`Encontrados ${users.length} usuarios.`);
        
        for (let u of users) {
            if (!u.uniqueCode) {
                const pref = prefixes[u.initialForm] || 'NDOC';
                const date = new Date(u.createdAt);
                const dStr = date.getFullYear() + 
                            String(date.getMonth() + 1).padStart(2, '0') + 
                            String(date.getDate()).padStart(2, '0');
                
                u.uniqueCode = `${pref}-${dStr}-000`;
                await u.save();
                console.log(`✅ Asignado: ${u.uniqueCode} a ${u.email}`);
            }
        }
        console.log('--- Proceso terminado con éxito ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error Crítico:', err.message);
        process.exit(1);
    }
}

fixUniqueCodes();
