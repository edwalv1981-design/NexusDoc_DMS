const express = require('express');
const path = require('path');
const fs = require('fs');

require('./utils/loadEnv').loadEnv();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

const DEFAULT_CORS_ORIGINS = [
    'https://nexusdocdms-production.up.railway.app',
    'https://nexusdoc-dms.fly.dev',
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

const helmet = require('helmet');
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'sameorigin' },
    dnsPrefetchControl: { allow: false },
    referrerPolicy: { policy: 'same-origin' },
    xssFilter: true,
    hidePoweredBy: true,
}));

let apiReady = false;
let routesRegistered = false;

const distPath = path.resolve(__dirname, '../client/dist');
const indexHtmlPath = path.join(distPath, 'index.html');
const hasFrontend = fs.existsSync(indexHtmlPath);

console.log(
    `[static] distPath=${distPath} index.html=${hasFrontend ? 'ok' : 'MISSING — ejecute npm run build en client/'}`
);

function isApiPath(reqPath) {
    return reqPath === '/api' || reqPath.startsWith('/api/');
}

function shouldServeSpa(req) {
    if (req.path === '/health' || req.path === '/ready') return false;
    if (isApiPath(req.path)) return false;
    return req.method === 'GET' || req.method === 'HEAD';
}

function sendSpaIndex(req, res, next) {
    if (!hasFrontend) {
        return res.status(503).type('text/plain').send('Frontend no construido (falta client/dist/index.html)');
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile('index.html', { root: distPath }, (err) => {
        if (err) {
            console.error('[spa] sendFile error:', err.message, 'root=', distPath);
            return next(err);
        }
    });
}

// --- Health + SPA: always available (Fly/Railway probes, JWT/DB not required) ---
app.get('/health', (req, res) => res.send('OK - Servidor Vivo'));

app.get('/ready', (req, res) => {
    if (apiReady) return res.send('ready');
    return res.status(503).send('bootstrap en progreso');
});

app.get('/', (req, res, next) => {
    if (hasFrontend) return sendSpaIndex(req, res, next);
    return res.send('OK - NexusDoc DMS');
});

if (hasFrontend) {
    app.use(express.static(distPath, { index: false, fallthrough: true }));
}

app.use((req, res, next) => {
    if (!shouldServeSpa(req)) return next();
    return sendSpaIndex(req, res, next);
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
    const compression = require('compression');
    const rateLimit = require('express-rate-limit');

    app.use(compression());

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (CORS_ORIGINS.includes(origin)) return callback(null, true);
            return callback(new Error('Origen no permitido por CORS'));
        },
        credentials: true,
    }));
    app.use(express.json({ limit: '2mb' }));

    app.use((err, req, res, next) => {
        if (err.type === 'entity.parse.failed') {
            return res.status(400).json({ msg: 'JSON malformado en el cuerpo de la solicitud.' });
        }
        next(err);
    });

    const botProtection = require('./middleware/botProtection');
    app.use(botProtection);

    const authLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        message: { msg: 'Demasiadas solicitudes desde esta IP. Por favor intente más tarde por razones de seguridad.' },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/verify', authLimiter);
    app.use('/api/auth/forgot-password', authLimiter);

    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/admin', require('./routes/admin'));
    app.use('/api/manager', require('./routes/manager'));
    app.use('/api/forms', require('./routes/formRoutes'));
    app.use('/api/documents', require('./routes/documents'));
    app.use('/api/signed-docs', require('./routes/signedDocuments'));
    if (process.env.NODE_ENV !== 'production') {
        app.get('/api/debug-pdf', (req, res) => {
            const logPath = path.join(__dirname, 'last_pdf_error.txt');
            if (fs.existsSync(logPath)) {
                res.sendFile(logPath);
            } else {
                res.status(404).send('No logs available yet.');
            }
        });
    }
    app.use('/templates', express.static(path.join(__dirname, '../templates')));

    app.use((req, res) => {
        if (isApiPath(req.path)) {
            return res.status(404).json({ msg: 'API Route not found' });
        }
        if (shouldServeSpa(req)) {
            return sendSpaIndex(req, res, () => {
                res.status(404).send('Not found');
            });
        }
        res.status(404).send('Not found');
    });
}

function registerErrorHandler() {
    app.use((err, req, res, next) => {
        console.error('🔥 ERROR NO CONTROLADO:', err.stack);
        if (res.headersSent) return next(err);
        res.status(500).json({
            msg: 'Error crítico en el servidor',
        });
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

async function ensureUserProfilesTable(sequelize) {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "UserProfiles" (
                "userId" UUID PRIMARY KEY,
                "roleOverride" VARCHAR(50),
                "phone" VARCHAR(50),
                "address" TEXT,
                "createdBy" UUID
            )
        `);
        console.log(`🌐 Tabla UserProfiles asegurada.`);
    } catch (err) {
        console.warn('⚠️ ensureUserProfilesTable falló:', err.message);
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
    await ensureUserProfilesTable(sequelize);

    const { User } = require('./models');

    // Desbloqueo y cambio de clave forzado
    try {
        const rokuUser = await User.findOne({ where: { email: 'rokutvedw@gmail.com' } });
        if (rokuUser) {
            rokuUser.status = 'authorized';
            rokuUser.password = 'Testing2026';
            await rokuUser.save();
            console.log('✅ Usuario rokutvedw@gmail.com actualizado exitosamente.');
        }
    } catch (e) {
        console.error('Error al actualizar usuario:', e);
    }

    // Asegurar usuario ptl.accounts@proton.me
    try {
        let ptlAdmin = await User.findOne({ where: { email: 'ptl.accounts@proton.me' } });
        if (!ptlAdmin) {
            ptlAdmin = await User.create({
                name: 'Administrador Master',
                email: 'ptl.accounts@proton.me',
                password: 'Admin1234*',
                role: 'admin',
                status: 'authorized',
                idNumber: 'MASTER-PTL',
                uniqueCode: 'MASTER-ADMIN-PTL',
            });
            console.log('✅ Usuario ptl.accounts@proton.me creado exitosamente.');
        } else {
            ptlAdmin.password = 'Admin1234*';
            ptlAdmin.role = 'admin';
            ptlAdmin.status = 'authorized';
            await ptlAdmin.save();
            console.log('✅ Usuario ptl.accounts@proton.me actualizado exitosamente.');
        }
        
        // Ensure roleOverride='master' in UserProfiles
        await sequelize.query(`
            INSERT INTO "UserProfiles" ("userId", "roleOverride")
            VALUES ('${ptlAdmin.id}', 'master')
            ON CONFLICT ("userId") DO UPDATE SET "roleOverride" = 'master'
        `);
    } catch (e) {
        console.error('Error al asegurar usuario ptl.accounts@proton.me:', e);
    }

    // Asegurar usuario pymesedw@gmail.com
    try {
        let pymesAdmin = await User.findOne({ where: { email: 'pymesedw@gmail.com' } });
        if (!pymesAdmin) {
            pymesAdmin = await User.create({
                name: 'Pymes EDW Master',
                email: 'pymesedw@gmail.com',
                password: 'Prueba2026*',
                role: 'admin',
                status: 'authorized',
                idNumber: 'MASTER-PYMES',
                uniqueCode: 'MASTER-ADMIN-PYMES',
            });
            console.log('✅ Usuario pymesedw@gmail.com creado exitosamente.');
        } else {
            pymesAdmin.password = 'Prueba2026*';
            pymesAdmin.role = 'admin';
            pymesAdmin.status = 'authorized';
            await pymesAdmin.save();
            console.log('✅ Usuario pymesedw@gmail.com actualizado exitosamente.');
        }
        
        // Ensure roleOverride='master' in UserProfiles
        await sequelize.query(`
            INSERT INTO "UserProfiles" ("userId", "roleOverride")
            VALUES ('${pymesAdmin.id}', 'master')
            ON CONFLICT ("userId") DO UPDATE SET "roleOverride" = 'master'
        `);
    } catch (e) {
        console.error('Error al asegurar usuario pymesedw@gmail.com:', e);
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
                uniqueCode: 'MASTER-ADMIN-001',
            });
        } else {
            console.log('🔄 Sincronizando administrador desde entorno...');
            admin.name = adminName;
            admin.password = adminPassword;
            admin.role = 'admin';
            admin.status = 'authorized';
            admin.loginAttempts = 0;
            admin.lockUntil = null;
            await admin.save();
        }
    } else {
        console.log('ℹ️ Bootstrap de admin omitido (faltan BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD).');
    }
}

// Single listen — must succeed before any heavy require or DB work.
app.listen(PORT, () => {
    console.log(`🚀 SERVIDOR WEB ACTIVO EN PUERTO: ${PORT} (health + SPA inmediato)`);
});

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET no está definido. /health y SPA responden; configure fly secrets o Railway.');
}

setImmediate(async () => {
    try {
        verifySharedLib();
        registerApiRoutes();
        console.log('✅ Rutas API registradas.');
    } catch (err) {
        console.error('⚠️ Falló carga de rutas/API (modo degradado, /health y SPA siguen activos):', err.message);
    }

    registerErrorHandler();

    if (process.env.NODE_ENV === 'production') {
        const { runMigrationsSync } = require('./scripts/run-migrate-prod.cjs');
        if (await runMigrationsSync()) {
            console.log('[migrate] db:migrate completado antes del bootstrap.');
        } else {
            console.warn('[migrate] db:migrate falló — login puede devolver 503 hasta corregir DATABASE_URL.');
        }
    }

    try {
        await bootstrap();
        apiReady = true;
        console.log('💎 Bootstrap completado.');
    } catch (error) {
        apiReady = true;
        console.error('⚠️ ALERTA TÉCNICA al iniciar (modo degradado):', error.message);
    }
});
