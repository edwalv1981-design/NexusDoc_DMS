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

// Log de peticiones entrantes
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

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

// 5. ARRANQUE NORMAL DE PRODUCCIÓN
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 SERVIDOR WEB ACTIVO EN PUERTO: ${PORT}`);
    
    try {
        await connectDB();
        await sequelize.sync({ alter: true });
        console.log('✅ Base de datos sincronizada.');

        // SINCRO DE ADMINISTRADOR (Sin borrar nada más)
        const { User } = require('./models');
        const adminEmail = 'rokutvedw@gmail.com';
        let admin = await User.findOne({ where: { email: adminEmail } });
        
        if (!admin) {
            console.log('🌱 Creando administrador inicial...');
            await User.create({
                name: 'Administrador Maestro',
                email: adminEmail,
                password: 'Master07*',
                role: 'admin',
                status: 'authorized',
                idNumber: '9999999999',
                uniqueCode: 'MASTER-ADMIN-001'
            });
        } else {
            console.log('🔄 Sincronizando administrador...');
            admin.status = 'authorized';
            admin.role = 'admin';
            await admin.save();
        }
        console.log('💎 SISTEMA OPERATIVO Y PERSISTENTE.');

    } catch (error) {
        console.error('⚠️ ALERTA TÉCNICA:', error.message);
    }
});
