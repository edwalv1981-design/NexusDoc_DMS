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

// 5. ARRANQUE NORMAL DE PRODUCCIÓN
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 SERVIDOR WEB ACTIVO EN PUERTO: ${PORT}`);
    
    try {
        await connectDB();
        const allowSchemaAlter = process.env.DB_SYNC_ALTER === 'true';
        if (allowSchemaAlter) {
            await sequelize.sync({ alter: true });
            console.log('⚠️ DB_SYNC_ALTER=true: sincronización con alter aplicada.');
        } else {
            console.log('✅ Modo migraciones activo: sequelize.sync deshabilitado (DB_SYNC_ALTER=false).');
        }

        // Bootstrap de administrador opcional controlado por variables de entorno.
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
        console.log('💎 SISTEMA OPERATIVO Y PERSISTENTE.');

    } catch (error) {
        console.error('⚠️ ALERTA TÉCNICA:', error.message);
    }
});
// 6. MANEJADOR GLOBAL DE ERRORES (Telemetría final)
app.use((err, req, res, next) => {
    console.error('🔥 ERROR NO CONTROLADO:', err.stack);
    res.status(500).json({ 
        msg: 'Error crítico en el servidor', 
        error: err.message 
    });
});
