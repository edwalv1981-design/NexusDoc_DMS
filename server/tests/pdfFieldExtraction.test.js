'use strict';

const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

describe('pdfFieldExtraction (mock spawn)', () => {
  it('parsea salida JSON del script Python', async () => {
    const childProcess = require('child_process');
    const mockProc = new EventEmitter();
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();
    mockProc.stdin = { write: () => {}, end: () => {} };

    const spawnMock = mock.fn(() => mockProc);
    mock.method(childProcess, 'spawn', spawnMock);

    const extraction = require('../utils/pdfFieldExtraction');

    const promise = extraction.extractAcroFieldsFromPath('C:\\fake\\template.pdf');

    mockProc.stdout.emit(
      'data',
      Buffer.from(
        JSON.stringify({
          fields: [{ name: 'firstName', type: 'Text' }],
          count: 1,
        })
      )
    );
    mockProc.emit('close', 0);

    const result = await promise;
    assert.equal(result.count, 1);
    assert.equal(result.fields[0].name, 'firstName');

    mock.restoreAll();
  });
});
