const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');

const app = express();

// Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use('/templates', express.static(path.join(__dirname, '../templates')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/forms', require('./routes/formRoutes'));

app.get('/', (req, res) => {
    res.send('NexusDoc DMS API Running...');
});

const startServer = async () => {
    try {
        // Connect to Database
        await connectDB();

        // Sync Database
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
