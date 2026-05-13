const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');


const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// RUTA DE SALUD
app.get('/health', (req, res) => res.send('OK - Servidor Vivo'));

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET no está definido. El servidor no puede iniciar de forma segura.');
}

// 1. MIDDLEWARES
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser clients and same-origin requests.
        if (!origin) return callback(null, true);
        if (CORS_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true
}));
app.use(express.json());

// Log de peticiones entrantes
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// 2. RUTAS DE LA API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/forms', require('./routes/formRoutes'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/signed-docs', require('./routes/signedDocuments'));
app.get('/api/debug-pdf', (req, res) => {
    const logPath = path.join(__dirname, 'last_pdf_error.txt');
    if (fs.existsSync(logPath)) {
        res.sendFile(logPath);
    } else {
        res.status(404).send('No logs available yet.');
    }
});
app.use('/templates', express.static(path.join(__dirname, '../templates')));


// 3. SERVIR FRONTEND
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ msg: 'API Route not found' });
    }
    res.sendFile(path.resolve(distPath, 'index.html'));
});

/**
 * Asegura columna users.language de forma idempotente y resiliente al casing del tableName.
 *
 * Sequelize con `define.underscored: true` puede crear tabla `users` (lowercase) o `Users`
 * dependiendo de la versión y de si se hizo sync inicial con `freezeTableName`. Esta función:
 *
 * 1. Detecta el nombre real vía `information_schema.tables`.
 * 2. Ejecuta `ADD COLUMN IF NOT EXISTS` sobre el nombre correcto.
 * 3. Normaliza valores existentes a 'es' por defecto.
 *
 * Cualquier fallo se loggea pero NO derriba el server (queries de Sequelize toleran
 * `language` faltante porque el modelo lo declara `allowNull: true`).
 */
async function ensureUserLanguageColumn() {
    try {
        const [rows] = await sequelize.query(
            `SELECT table_name FROM information_schema.tables
              WHERE table_schema = current_schema()
                AND lower(table_name) = 'users'
              ORDER BY table_name ASC
              LIMIT 1`
        );
        const tableName = rows && rows[0] && rows[0].table_name;
        if (!tableName) {
            console.warn('⚠️ ensureUserLanguageColumn: tabla users no encontrada en current_schema().');
            return;
        }
        const quoted = `"${tableName.replace(/"/g, '""')}"`;
        await sequelize.query(`ALTER TABLE ${quoted} ADD COLUMN IF NOT EXISTS "language" VARCHAR(2)`);
        await sequelize.query(`UPDATE ${quoted} SET "language" = 'es' WHERE "language" IS NULL OR "language" NOT IN ('es','en')`);
        console.log(`🌐 Columna ${tableName}.language asegurada (default es).`);
    } catch (langErr) {
        console.warn('⚠️ ensureUserLanguageColumn falló:', langErr.message);
    }
}

/**
 * Asegura columna users.active_token para evitar 500 en login/perfil.
 */
async function ensureUserActiveTokenColumn() {
    try {
        const [rows] = await sequelize.query(
            `SELECT table_name FROM information_schema.tables 
             WHERE table_schema = current_schema() AND lower(table_name) = 'users' LIMIT 1`
        );
        if (rows.length > 0) {
            const actualTableName = rows[0].table_name;
            console.log(`🛠️ Verificando columna active_token en tabla ${actualTableName}...`);
            await sequelize.query(`ALTER TABLE "${actualTableName}" ADD COLUMN IF NOT EXISTS "active_token" TEXT;`);
        }
    } catch (e) {
        console.warn('⚠️ No se pudo asegurar columna active_token:', e.message);
    }
}

async function bootstrap() {
    await connectDB();

    const allowSchemaAlter = process.env.DB_SYNC_ALTER === 'true';
    if (allowSchemaAlter) {
        await sequelize.sync({ alter: true });
        console.log('⚠️ DB_SYNC_ALTER=true: sincronización con alter aplicada.');
    } else {
        console.log('✅ Modo migraciones activo: sequelize.sync deshabilitado (DB_SYNC_ALTER=false).');
    }

    // CRÍTICO: aplicar antes de aceptar tráfico para que los SELECT incluyan la columna sin romper.
    await ensureUserLanguageColumn();
    await ensureUserActiveTokenColumn();

    const { User } = require('./models');

    // DESBLOQUEO MAESTRO PARA EL USUARIO ESPECÍFICO
    const debugUserEmail = 'edwinalvarezvivero@yahoo.com';
    const debugUser = await User.findOne({ where: { email: debugUserEmail } });
    if (debugUser) {
        console.log(`🔓 RECOVERY: Desbloqueando usuario ${debugUserEmail}...`);
        debugUser.status = 'authorized';
        debugUser.loginAttempts = 0;
        debugUser.lockUntil = null;
        await debugUser.save();
    }

    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    const adminName = process.env.BOOTSTRAP_ADMIN_NAME || 'Administrador Maestro';

    if (adminEmail && adminPassword) {
        let admin = await User.findOne({ where: { email: adminEmail } });

        if (!admin) {
            console.log('🌱 Creando administrador inicial desde entorno...');
            await User.create({
                name: adminName,
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                status: 'authorized',
                idNumber: 'ADMIN-BOOTSTRAP',
                uniqueCode: 'MASTER-ADMIN-001'
            });
        } else {
            console.log('🔄 Sincronizando rol/estado de administrador...');
            admin.status = 'authorized';
            admin.role = 'admin';
            await admin.save();
        }
    } else {
        console.log('ℹ️ Bootstrap de admin omitido (faltan BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD).');
    }
}

// 5. ARRANQUE NORMAL DE PRODUCCIÓN
// Bootstrap SÍNCRONO antes de aceptar tráfico: garantiza que el schema esté listo
// (columna language en su lugar) antes de procesar logins. Evita 500s silenciosos.
bootstrap()
    .then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 SERVIDOR WEB ACTIVO EN PUERTO: ${PORT}`);
            console.log('💎 SISTEMA OPERATIVO Y PERSISTENTE.');
        });
    })
    .catch((error) => {
        console.error('⚠️ ALERTA TÉCNICA al iniciar:', error.message);
        // Arrancamos igualmente para no caer en bucle de reinicio en Railway; el `/health`
        // sigue respondiendo y los endpoints toleran la ausencia de la columna por allowNull.
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 SERVIDOR WEB ACTIVO (modo degradado) EN PUERTO: ${PORT}`);
        });
    });
// 6. MANEJADOR GLOBAL DE ERRORES (Telemetría final)
app.use((err, req, res, next) => {
    console.error('🔥 ERROR NO CONTROLADO:', err.stack);
    res.status(500).json({ 
        msg: 'Error crítico en el servidor', 
        error: err.message 
    });
});
