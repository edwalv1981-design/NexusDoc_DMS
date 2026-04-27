const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');

const app = express();
const PORT = 5000; // Forzamos 5000 para coincidir con el Dominio de Railway

// RUTA DE SALUD (Para probar si el servidor responde)
app.get('/health', (req, res) => res.send('OK - Servidor Vivo'));

// 1. MIDDLEWARES INICIALES
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// 2. RUTAS DE LA API (Prioridad Alta)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/forms', require('./routes/formRoutes'));
app.use('/templates', express.static(path.join(__dirname, '../templates')));

// 3. SERVIR FRONTEND (Solo en Producción)
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// 4. RUTA MAESTRA (Catch-all para React)
app.get(/.*/, (req, res) => {
    // Si la ruta empieza por /api, no entregamos el HTML (evita bucles)
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ msg: 'API Route not found' });
    }
    res.sendFile(path.resolve(distPath, 'index.html'));
});

// 5. ARRANQUE DE SERVICIO (Modo Resiliente)
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 SERVIDOR WEB ACTIVO EN PUERTO: ${PORT}`);
    
    try {
        console.log('📡 Iniciando protocolo de base de datos...');
        await connectDB();
        await sequelize.sync({ alter: true });
        console.log('✅ Base de datos sincronizada y operativa.');

        // 6. SEMILLA DE USUARIO (Crear Admin inicial si no existe)
        const { User } = require('./models');
        const adminEmail = 'rokutvedw@gmail.com';
        const adminExists = await User.findOne({ where: { email: adminEmail } });
        
        if (!adminExists) {
            console.log('🌱 Creando usuario administrador inicial ( rokutvedw@gmail.com )...');
            await User.create({
                name: 'Administrador Maestro',
                email: adminEmail,
                password: 'Master07*',
                role: 'admin',
                status: 'authorized'
            });
            console.log('✅ Administrador creado con éxito en la nube.');
        } else {
            console.log('👥 El usuario administrador ya existe en el sistema.');
        }
    } catch (error) {
        console.error('⚠️ ALERTA: El servidor inició pero la DB falló:', error.message);
        // No matamos el proceso para permitir diagnóstico
    }
});
