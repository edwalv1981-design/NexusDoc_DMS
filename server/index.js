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
    'https://nexusdoc.online',
    'http://nexusdoc.online',
    'https://www.nexusdoc.online',
    'http://www.nexusdoc.online',
    'https://nexusdoc.it.com',
    'http://nexusdoc.it.com',
    'https://www.nexusdoc.it.com',
    'http://www.nexusdoc.it.com',
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
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
        },
    },
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
    return reqPath === '/api' || reqPath.startsWith('/api/') || reqPath.startsWith('/admin/api/');
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
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile('index.html', { root: distPath }, (err) => {
        if (err) {
            console.error('[spa] sendFile error:', err.message, 'root=', distPath);
            return next(err);
        }
    });
}

// --- Middlewares globales ---
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

// Redirección forzada a HTTPS en producción
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});

// Reescritura defensiva para navegadores con código desfasado (/admin/api/* -> /api/*)
app.use((req, res, next) => {
    if (req.path.startsWith('/admin/api/')) {
        const queryIndex = req.url.indexOf('?');
        const queryString = queryIndex !== -1 ? req.url.substring(queryIndex) : '';
        const cleanPath = req.path.replace('/admin/api/', '/api/');
        req.url = cleanPath + queryString;
    }
    next();
});

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ msg: 'JSON malformado en el cuerpo de la solicitud.' });
    }
    next(err);
});

const botProtection = require('./middleware/botProtection');
app.use(botProtection);

// --- Health check endpoints ---
app.get('/health', (req, res) => res.send('OK - Servidor Vivo'));
app.get('/ready', (req, res) => {
    if (apiReady) return res.send('ready');
    return res.status(503).send('bootstrap en progreso');
});

// --- API Routes Registration ---
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { msg: 'Demasiadas solicitudes desde esta IP. Por favor intente más tarde por razones de seguridad.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(['/api/auth/login', '/admin/api/auth/login'], authLimiter);
app.use(['/api/auth/verify', '/admin/api/auth/verify'], authLimiter);
app.use(['/api/auth/forgot-password', '/admin/api/auth/forgot-password'], authLimiter);
app.use(['/api/auth/verify-forgot-password', '/admin/api/auth/verify-forgot-password'], authLimiter);
app.use(['/api/auth/verify-code', '/admin/api/auth/verify-code'], authLimiter);
app.use(['/api/auth/resend-code', '/admin/api/auth/resend-code'], authLimiter);
app.use(['/api/auth/register', '/admin/api/auth/register'], authLimiter);

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const managerRoutes = require('./routes/manager');
const formRoutes = require('./routes/formRoutes');
const documentRoutes = require('./routes/documents');
const signedDocRoutes = require('./routes/signedDocuments');

app.use(['/api/auth', '/admin/api/auth'], authRoutes);
app.use(['/api/admin', '/admin/api/admin', '/admin/api'], adminRoutes);
app.use(['/api/manager', '/admin/api/manager'], managerRoutes);
app.use(['/api/forms', '/admin/api/forms'], formRoutes);
app.use(['/api/documents', '/admin/api/documents'], documentRoutes);
app.use(['/api/signed-docs', '/admin/api/signed-docs'], signedDocRoutes);
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
// Plantillas PDF se leen en disco (Puppeteer). No se publican por HTTP.

// --- SPA Fallback & Static Files ---
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

async function ensurePeopleTable(sequelize) {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "People" (
                "id" UUID PRIMARY KEY,
                "userId" UUID NOT NULL,
                "fullName" VARCHAR(255) NOT NULL,
                "idNumber" VARCHAR(255),
                "passport" VARCHAR(255),
                "idCard" VARCHAR(255),
                "nationality" VARCHAR(255),
                "birthDate" VARCHAR(255),
                "birthPlace" VARCHAR(255),
                "maritalStatus" VARCHAR(255),
                "address" TEXT,
                "city" VARCHAR(255),
                "country" VARCHAR(255),
                "phone" VARCHAR(255),
                "email" VARCHAR(255),
                "entityType" VARCHAR(50) DEFAULT 'individual',
                "lastRoleLabel" VARCHAR(255),
                "associatedForms" JSONB DEFAULT '[]'::jsonb,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "associatedForms" JSONB DEFAULT '[]'::jsonb;
            CREATE INDEX IF NOT EXISTS "idx_people_user_name" ON "People" ("userId", "fullName");
            CREATE INDEX IF NOT EXISTS "idx_people_user_passport" ON "People" ("userId", "passport");
            CREATE INDEX IF NOT EXISTS "idx_people_user_idnumber" ON "People" ("userId", "idNumber");
        `);
        console.log(`🌐 Tabla People asegurada con índices.`);
    } catch (err) {
        console.warn('⚠️ ensurePeopleTable falló:', err.message);
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
    await ensurePeopleTable(sequelize);

    const { User } = require('./models');
    const { Op } = require('sequelize');

    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    const adminName = process.env.BOOTSTRAP_ADMIN_NAME || 'Administrador Maestro';

    if (adminEmail && adminPassword) {
        const admin = await User.findOne({ where: { email: adminEmail } });

        if (!admin) {
            console.log('🌱 Creando administrador inicial desde entorno (solo si no existe)...');
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
            console.log('ℹ️ Administrador de entorno ya existe; la clave NO se modifica en el arranque.');
        }
    } else {
        console.log('ℹ️ Bootstrap de admin omitido (faltan BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD).');
    }

    // Garantizar que las cuentas maestras tengan permisos de Administrador y no tengan bloqueo o cambio de clave forzado
    const MASTER_EMAILS = [
        'ptl.accounts@proton.me',
        'pymesedw@gmail.com',
        'rokutvedw@gmail.com',
        'edwinalvarezvivero@yahoo.com'
    ];

    for (const email of MASTER_EMAILS) {
        try {
            await User.update({
                role: 'admin',
                status: 'authorized',
                loginAttempts: 0,
                lockUntil: null,
                mustChangePassword: false
            }, {
                where: { email: { [Op.iLike]: email } }
            });
        } catch (mErr) {
            console.warn(`⚠️ Error en bootstrap User.update para ${email}:`, mErr.message);
        }

        try {
            await sequelize.query(`
                UPDATE "Users"
                SET "role" = 'admin',
                    "status" = 'authorized',
                    "loginAttempts" = 0,
                    "lockUntil" = NULL,
                    "mustChangePassword" = false
                WHERE LOWER("email") = LOWER(:email)
            `, { replacements: { email } }).catch(() => {});

            await sequelize.query(`
                UPDATE "users"
                SET "role" = 'admin',
                    "status" = 'authorized',
                    "login_attempts" = 0,
                    "lock_until" = NULL,
                    "must_change_password" = false
                WHERE LOWER("email") = LOWER(:email)
            `, { replacements: { email } }).catch(() => {});
        } catch (mSqlErr) {
            // Ignorado si la consulta raw falla
        }
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
