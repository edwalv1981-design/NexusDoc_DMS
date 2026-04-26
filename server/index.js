const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');

const app = express();

// Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Servir plantillas PDF
app.use('/templates', express.static(path.join(__dirname, '../templates')));

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/forms', require('./routes/formRoutes'));

// --- CONFIGURACIÓN DE PRODUCCIÓN (Servir React) ---
if (process.env.NODE_ENV === 'production' || true) { // Forzamos para Railway
    // Servir archivos estáticos desde la carpeta 'client/dist' (generada por Vite)
    app.use(express.static(path.join(__dirname, '../client/dist')));

    // Cualquier ruta que no sea de la API, entrega el index.html de React
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
        }
    });
}

const startServer = async () => {
    try {
        // Conexión a Base de Datos
        await connectDB();

        // Sincronización (alter: true para no borrar datos existentes)
        await sequelize.sync({ alter: true });
        console.log('✅ Database Synced');

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
    }
};

startServer();
