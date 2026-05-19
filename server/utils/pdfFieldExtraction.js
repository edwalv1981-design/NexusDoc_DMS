'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { resolvePythonCommand } = require('./pythonCommand');

const EXTRACT_SCRIPT = path.join(__dirname, '../scripts/extract_pdf_fields.py');

/**
 * @param {string} pdfPath
 * @returns {Promise<{ fields: Array<{ name: string, type?: string|null, page?: number }>, count: number }>}
 */
function extractAcroFieldsFromPath(pdfPath) {
  return new Promise((resolve, reject) => {
    const pythonCommand = resolvePythonCommand();
    const proc = spawn(pythonCommand, [EXTRACT_SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `extract_pdf_fields exit ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve({
          fields: Array.isArray(parsed.fields) ? parsed.fields : [],
          count: typeof parsed.count === 'number' ? parsed.count : (parsed.fields || []).length,
        });
      } catch (e) {
        reject(new Error(`Respuesta inválida del extractor: ${e.message}`));
      }
    });

    proc.stdin.write(JSON.stringify({ pdf_path: pdfPath }));
    proc.stdin.end();
  });
}

/**
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ fields: Array<{ name: string, type?: string|null, page?: number }>, count: number }>}
 */
async function extractAcroFieldsFromBuffer(pdfBuffer) {
  const tmpDir = path.join(os.tmpdir(), 'nexusdoc-pdf-extract');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `extract_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
  fs.writeFileSync(tmpPath, pdfBuffer);
  try {
    return await extractAcroFieldsFromPath(tmpPath);
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  extractAcroFieldsFromPath,
  extractAcroFieldsFromBuffer,
};
