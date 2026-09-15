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

    // 2. BLINDAJE: Verificar usuario y sesión
    let user = null;
    try {
      user = await User.findByPk(req.user.id);
    } catch (dbErr) {
      console.warn('[AUTH DB WARNING]', dbErr.message);
    }
    if (user) req.dbUser = user;

    const isUserAdmin = req.user?.role === 'admin' || req.user?.role === 'manager' || (user && user.role === 'admin');

    if (!user && !isUserAdmin) {
      return res.status(401).json({ msg: 'Usuario inexistente' });
    }

    if (!isUserAdmin && user && user.status !== 'authorized') {
      return res.status(401).json({ msg: 'Cuenta no autorizada' });
    }

    // Si el token enviado no es el que está en la DB, validar sesión única solo para clientes
    if (!isUserAdmin && user && user.activeToken && user.activeToken !== token) {
      console.warn(`[SECURITY] Intento de acceso con sesión invalidada para el usuario: ${req.user.id}`);
      return res.status(401).json({ msg: 'Tu sesión ha sido cerrada porque se inició sesión en otro dispositivo.' });
    }

    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    res.status(401).json({ msg: 'Sesión inválida o expirada' });
  }
};
