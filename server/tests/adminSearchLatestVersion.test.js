'use strict';

/** Consultas del administrador: solo la última versión de cada trámite. */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { latestPerChain } = require('../services/formVersionService');

const row = (id, userId, version, parentId, updatedAt) => ({
  id, userId, updatedAt, data: version > 1 || parentId ? { __metadata: { parentId, version } } : {},
});

describe('latestPerChain', () => {
  it('deja una sola fila por trámite: la de mayor versión', () => {
    const rows = [
      row('a3', 'u1', 3, 'a1', '2026-11-03'),
      row('b1', 'u1', 1, null, '2026-11-02'),
      row('a1', 'u1', 1, null, '2026-11-01'),
      row('a2', 'u1', 2, 'a1', '2026-11-02'),
    ];
    assert.deepEqual(latestPerChain(rows).map((r) => r.id), ['a3', 'b1']);
  });

  it('si la versión encontrada no es la última, usa la última de la misma cadena', () => {
    const matched = [row('a1', 'u1', 1, null, '2026-11-01')];
    const chain = [row('a1', 'u1', 1, null, '2026-11-01'), row('a2', 'u1', 2, 'a1', '2026-11-05')];
    assert.deepEqual(latestPerChain(matched, chain).map((r) => r.id), ['a2']);
  });

  it('no mezcla trámites de distintos usuarios ni agrega cadenas que no coincidieron', () => {
    const matched = [row('a1', 'u1', 1, null, '2026-11-01')];
    const extra = [row('x2', 'u2', 2, 'a1', '2026-11-09'), row('z1', 'u1', 1, null, '2026-11-09')];
    assert.deepEqual(latestPerChain(matched, extra).map((r) => r.id), ['a1']);
  });

  it('trámites sin versiones quedan igual', () => {
    const rows = [row('p', 'u1', 1, null, '2026-11-02'), row('q', 'u2', 1, null, '2026-11-01')];
    assert.deepEqual(latestPerChain(rows).map((r) => r.id), ['p', 'q']);
  });
});
