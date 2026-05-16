const { Sequelize } = require('sequelize');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createSecureUser() {
    // 1. Generar contraseña robusta
    const securePassword = crypto.randomBytes(16).toString('hex');
    const masterConn = `postgres://postgres:postgres123@localhost:5432/nexusdoc`;
    const sequelize = new Sequelize(masterConn, { logging: false });

    try {
        console.log('🛠️ Iniciando creación de usuario de privilegios mínimos...');

        // 2. Crear el usuario si no existe
        await sequelize.query(`DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'nexus_app') THEN
                    CREATE USER nexus_app WITH PASSWORD '${securePassword}';
                END IF;
            END $$;`);
        
        // 3. Asignar permisos específicos (Principio de Menor Privilegio)
        await sequelize.query(`GRANT CONNECT ON DATABASE nexusdoc TO nexus_app;`);
        await sequelize.query(`GRANT USAGE ON SCHEMA public TO nexus_app;`);
        await sequelize.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexus_app;`);
        await sequelize.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexus_app;`);
        await sequelize.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nexus_app;`);
        await sequelize.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO nexus_app;`);

        console.log('✅ Usuario nexus_app creado y permisos asignados.');

        // 4. Actualizar .env
        const envPath = path.join(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            
            // Reemplazar DB_USER y DB_PASS
            envContent = envContent.replace(/DB_USER=.*/, `DB_USER=nexus_app`);
            envContent = envContent.replace(/DB_PASS=.*/, `DB_PASS=${securePassword}`);
            
            // También actualizar DATABASE_URL si existe
            const newDbUrl = `postgres://nexus_app:${securePassword}@localhost:5432/nexusdoc`;
            if (envContent.includes('DATABASE_URL=')) {
                envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${newDbUrl}`);
            }

            fs.writeFileSync(envPath, envContent);
            console.log('📝 Archivo .env actualizado con las nuevas credenciales seguras.');
        }

    } catch (err) {
        console.error('❌ Error al crear usuario seguro:', err.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

createSecureUser();
