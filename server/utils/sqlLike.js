'use strict';

/**
 * Escapa los comodines de LIKE/ILIKE (% _ y la barra de escape) para que
 * `{ [Op.iLike]: escapeLike(valor) }` sea una comparación EXACTA sin distinguir
 * mayúsculas. Sin esto, un correo o cédula "%" coincide con cualquier registro.
 *
 * PostgreSQL usa "\" como carácter de escape por defecto en LIKE/ILIKE.
 */
function escapeLike(value) {
    return String(value ?? '').replace(/[\\%_]/g, (c) => `\\${c}`);
}

module.exports = { escapeLike };
