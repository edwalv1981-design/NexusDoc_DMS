const { Sequelize } = require('sequelize');
require('dotenv').config();

async function cleanup() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/sistema_formularios', { logging: false });
    try {
        await s.query('DROP TABLE IF EXISTS bitacora CASCADE');
        console.log('✅ Tabla bitacora eliminada exitosamente de sistema_formularios.');
        
        // También limpiamos otras tablas vacías que confirmamos no tienen uso
        const emptyTables = [
            'permisos_menu', 'documentos_adjuntos', 'formularios_firmados', 
            'documentos_personales', 'usuario_permisos_formulario', 'notificaciones'
        ];
        
        for (const table of emptyTables) {
            await s.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
            console.log(`✅ Tabla obsoleta ${table} eliminada.`);
        }

    } catch (e) {
        console.error('Error durante la limpieza:', e.message);
    }
    process.exit(0);
}
cleanup();
