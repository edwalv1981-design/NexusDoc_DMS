const jwt = require('jsonwebtoken');
const { User } = require('../models');

function pathAllowsMustChange(req) {
  const raw = String(req.originalUrl || req.path || '').split('?')[0];
  return (
    /\/auth\/me\/?$/.test(raw) ||
    /\/auth\/me\/language\/?$/.test(raw) ||
    /\/auth\/update-profile\/?$/.test(raw)
  );
}

module.exports = async function (req, res, next) {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ msg: 'No hay token, autorización denegada' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded.user;

    let user = null;
    try {
      user = await User.findByPk(req.user.id);
    } catch (dbErr) {
      console.warn('[AUTH DB WARNING]', dbErr.message);
    }
    if (user) req.dbUser = user;

    if (!user) {
      return res.status(401).json({ msg: 'Usuario inexistente' });
    }

    const isDbAdmin = user.role === 'admin';

    if (!isDbAdmin && user.status !== 'authorized') {
      return res.status(401).json({ msg: 'Cuenta no autorizada' });
    }

    if (user.activeToken && user.activeToken !== token) {
      console.warn(`[SECURITY] Intento de acceso con sesión invalidada para el usuario: ${req.user.id}`);
      return res.status(401).json({ msg: 'Tu sesión ha sido cerrada porque se inició sesión en otro dispositivo.' });
    }

    if (user.mustChangePassword && !pathAllowsMustChange(req)) {
      return res.status(403).json({
        msg: 'Debe cambiar su contraseña temporal antes de continuar.',
        mustChangePassword: true,
      });
    }

    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    res.status(401).json({ msg: 'Sesión inválida o expirada' });
  }
};
