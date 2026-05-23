const express = require('express');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

const DEFAULT_CORS_ORIGINS = [
    'https://nexusdocdms-production.up.railway.app',
    'http://localhost:5173',
    'http://localhost:3000',
];
const CORS_ORIGINS = [
    ...new Set([
        ...DEFAULT_CORS_ORIGINS,
        ...(process.env.CORS_ORIGINS || '')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    ]),
];

console.log(
    `[start] NexusDoc API NODE_ENV=${process.env.NODE_ENV || 'development'} PORT=${PORT} DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'missing'} JWT_SECRET=${JWT_SECRET ? 'set' : 'MISSING'}`
);

let apiReady = false;
let routesRegistered = false;

const distPath = path.join(__dirname, '../client/dist');

// --- Health + SPA: always available (Railway probes, JWT/DB not required) ---
app.get('/', (req, res) => res.send('OK - NexusDoc DMS'));
app.get('/health', (req, res) => res.send('OK - Servidor Vivo'));

app.get('/ready', (req, res) => {
    if (apiReady) return res.send('ready');
    return res.status(503).send('bootstrap en progreso');
});

app.use(express.static(distPath, { index: false }));

app.get(/^\/(?!health$|ready$).+/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const indexHtml = path.resolve(distPath, 'index.html');
    if (!fs.existsSync(indexHtml)) {
        return res.status(503).send('Frontend no construido (falta client/dist)');
    }
    res.sendFile(indexHtml);
});

app.use((err, req, res, next) => {
    console.error('🔥 ERROR NO CONTROLADO:', err.stack);
    res.status(500).json({
        msg: 'Error crítico en el servidor',
        error: err.message,
    });
});

function verifySharedLib() {
    const libSpec = path.join(__dirname, '../lib/kyciMasterSpec.cjs');
    if (!fs.existsSync(libSpec)) {
        console.warn(`⚠️ MODULE_NOT_FOUND: falta ${libSpec} — API KYCI degradada, /health y SPA activos.`);
        return false;
    }
    return true;
}

function registerApiRoutes() {
    if (routesRegistered) return;
    routesRegistered = true;

    const cors = require('cors');

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (CORS_ORIGINS.includes(origin)) return callback(null, true);
            return callback(new Error('Origen no permitido por CORS'));
        },
        credentials: true,
    }));
    app.use(express.json());

    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });

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

    app.use((req, res) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ msg: 'API Route not found' });
        }
        res.status(404).send('Not found');
    });
}

async function ensureUserLanguageColumn(sequelize) {
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

async function bootstrap() {
    const { connectDB, sequelize } = require('./config/db');
    await connectDB();

    const allowSchemaAlter = process.env.DB_SYNC_ALTER === 'true';
    if (allowSchemaAlter) {
        await sequelize.sync({ alter: true });
        console.log('⚠️ DB_SYNC_ALTER=true: sincronización con alter aplicada.');
    } else {
        console.log('✅ Modo migraciones activo: sequelize.sync deshabilitado (DB_SYNC_ALTER=false).');
    }

    await ensureUserLanguageColumn(sequelize);

    const { User } = require('./models');
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
                uniqueCode: 'MASTER-ADMIN-001',
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

// Single listen — must succeed before any heavy require or DB work.
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR WEB ACTIVO EN PUERTO: ${PORT} (health + SPA inmediato)`);
});

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET no está definido. /health y SPA responden; configure la variable en Railway.');
}

setImmediate(() => {
    try {
        verifySharedLib();
        registerApiRoutes();
        console.log('✅ Rutas API registradas.');
    } catch (err) {
        console.error('⚠️ Falló carga de rutas/API (modo degradado, /health y SPA siguen activos):', err.message);
    }

    bootstrap()
        .then(() => {
            apiReady = true;
            console.log('💎 Bootstrap completado.');
        })
        .catch((error) => {
            apiReady = true;
            console.error('⚠️ ALERTA TÉCNICA al iniciar (modo degradado):', error.message);
        });
});
