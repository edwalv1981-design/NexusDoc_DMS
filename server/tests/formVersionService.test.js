'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fv = require('../services/formVersionService');

describe('formVersionService (funciones puras)', () => {
  it('stripServerKeys quita metadatos controlados por el servidor', () => {
    const out = fv.stripServerKeys({ a: 1, __metadata: { version: 9 }, __adminEditLog: [1], __progress: { step: 2 } });
    assert.deepEqual(out, { a: 1 });
    assert.deepEqual(fv.stripServerKeys(null), {});
    assert.deepEqual(fv.stripServerKeys([1, 2]), {});
  });

  it('getMeta / getRootId', () => {
    assert.equal(fv.getRootId({ id: 'root', data: {} }), 'root');
    assert.equal(fv.getRootId({ id: 'v3', data: { __metadata: { parentId: 'root', version: 3 } } }), 'root');
    assert.equal(fv.getMeta({ data: {} }).version, 1);
  });

  it('sanitizeProgress acota valores y conserva "finalizado"', () => {
    const p = fv.sanitizeProgress({ step: 99, totalSteps: 5, finished: false }, { finished: true });
    assert.equal(p.step, 5);
    assert.equal(p.totalSteps, 5);
    assert.equal(p.finished, true);
    assert.ok(p.savedAt);
    assert.equal(fv.sanitizeProgress(undefined, null), undefined);
    assert.deepEqual(fv.sanitizeProgress(undefined, { step: 2, totalSteps: 4 }), { step: 2, totalSteps: 4 });
  });

  it('computeChanges detecta cambios campo a campo, incluidos arreglos', () => {
    const before = {
      corpNameSA: 'ALFA',
      directors: [{ _id: 'x', fullName: 'Ana', passport: 'A1' }, { fullName: 'Luis', passport: 'B2' }],
      __metadata: { version: 2 },
    };
    const after = {
      corpNameSA: 'ALFA',
      directors: [{ _id: 'y', fullName: 'Ana', passport: 'A9' }],
      capitalSocial: '20000',
    };
    const changes = fv.computeChanges(before, after);
    const paths = changes.map((c) => c.path).sort();
    assert.deepEqual(paths, ['capitalSocial', 'directors#1.passport', 'directors#2']);
    const pass = changes.find((c) => c.path === 'directors#1.passport');
    assert.equal(pass.before, 'A1');
    assert.equal(pass.after, 'A9');
    assert.equal(changes.find((c) => c.path === 'directors#2').after, '(eliminado)');
  });

  it('computeChanges ignora metadatos y _id; sin cambios -> lista vacía', () => {
    assert.deepEqual(fv.computeChanges({ a: '1', __progress: { step: 1 } }, { a: '1', __progress: { step: 3 } }), []);
  });

  it('describeChanges resume y limita la cantidad', () => {
    const many = Array.from({ length: 45 }, (_, i) => ({ path: `f${i}`, before: '1', after: '2' }));
    const text = fv.describeChanges(many, 40);
    assert.match(text, /f0: 1 → 2/);
    assert.match(text, /y 5 cambio\(s\) más/);
    assert.equal(fv.describeChanges([]), 'Sin cambios');
  });

  it('nombre del trámite: el cliente no lo puede inyectar al guardar y se limpia', () => {
    assert.deepEqual(fv.stripServerKeys({ a: 1, __label: 'x' }), { a: 1 });
    assert.equal(fv.sanitizeLabel('  Apertura <b>cuenta</b>\n Banco X  '), 'Apertura bcuenta/b Banco X');
    assert.equal(fv.sanitizeLabel('x'.repeat(200)).length, fv.MAX_LABEL);
    assert.equal(fv.sanitizeLabel(null), '');
    assert.equal(fv.getLabel({ data: { __label: 'Mi trámite' } }), 'Mi trámite');
    assert.equal(fv.getLabel({ data: {} }), '');
  });
});
