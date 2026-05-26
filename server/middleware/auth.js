const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async function (req, res, next) {
  // Obtener token del header
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ msg: 'No hay token, autorización denegada' });
  }

  try {
    // 1. Verificar integridad del JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded.user;

    // 2. BLINDAJE: Verificar sesión única (Concurrent Sessions)
    const user = await User.findByPk(req.user.id, { attributes: ['activeToken', 'status'] });

    if (!user) {
      return res.status(401).json({ msg: 'Usuario inexistente' });
    }

    if (user.status !== 'authorized') {
      return res.status(401).json({ msg: 'Cuenta no autorizada' });
    }

    // Si el token enviado no es el que está en la DB, es una sesión vieja/clonada
    if (user.activeToken !== token) {
      console.warn(`[SECURITY] Intento de acceso con sesión invalidada para el usuario: ${req.user.id}`);
      return res.status(401).json({ msg: 'Tu sesión ha sido cerrada porque se inició sesión en otro dispositivo.' });
    }

    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    res.status(401).json({ msg: 'Sesión inválida o expirada' });
  }
};
