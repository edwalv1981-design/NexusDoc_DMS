const { Sequelize } = require('sequelize');
require('dotenv').config();

async function scan() {
    console.log('Connecting to sistema_formularios...');
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/sistema_formularios', { logging: false });
    try {
        const [tables] = await s.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('TABLES FOUND:', tables.map(t => t.table_name));
        for (const t of tables) {
            const name = t.table_name;
            const [rows] = await s.query(`SELECT count(*) FROM "${name}"`);
            console.log(`${name}: ${rows[0].count} rows`);
            
            if (name === 'formularios') {
                 const [data] = await s.query(`SELECT nombre, descripcion FROM "${name}"`);
                 console.log('CONTENT OF formularios:', data);
            }
        }
    } catch (e) { console.error('FAIL:', e.message); }
    process.exit(0);
}
scan();
