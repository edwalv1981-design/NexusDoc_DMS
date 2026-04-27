const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');

const app = express();
const PORT = 5000;

// RUTA DE SALUD
app.get('/health', (req, res) => res.send('OK - Servidor Vivo'));

// 1. MIDDLEWARES
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// 2. RUTAS DE LA API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/forms', require('./routes/formRoutes'));
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

// 5. ARRANQUE RESILIENTE CON RESETEO DE RAÍZ
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 SERVIDOR WEB ACTIVO EN PUERTO: ${PORT}`);
    
    try {
        await connectDB();
        
        // SINCRO TOTAL (force: false para no borrar tablas, pero limpiaremos datos)
        await sequelize.sync({ alter: true });
        console.log('✅ Base de datos sincronizada.');

        // --- PROTOCOLO DE LIMPIEZA TOTAL (WIPE) ---
        const { User, AuditLog, FormData, PendingRegistration } = require('./models');
        
        console.log('☢️ Iniciando Limpieza de Raíz...');
        await AuditLog.destroy({ where: {} });
        await FormData.destroy({ where: {} });
        await PendingRegistration.destroy({ where: {} });
        await User.destroy({ where: {}, cascade: true });
        console.log('🧹 Base de datos purificada.');

        // --- CREACIÓN DE NUEVO MASTER ---
        console.log('🌱 Creando Nuevo Administrador Maestro...');
        await User.create({
            name: 'Administrador Maestro',
            email: 'rokutvedw@gmail.com',
            password: 'Master07*',
            role: 'admin',
            status: 'authorized'
        });
        console.log('💎 NUEVO MASTER CREADO: rokutvedw@gmail.com');

    } catch (error) {
        console.error('⚠️ ALERTA TÉCNICA:', error.message);
    }
});
