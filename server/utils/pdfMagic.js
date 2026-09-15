'use strict';

function isPdfBuffer(buffer) {
    if (!buffer || buffer.length < 5) return false;
    return buffer.slice(0, 5).toString('utf8') === '%PDF-';
}

function sanitizeDownloadFilename(name) {
    const raw = String(name || 'documento').replace(/[\r\n"\\]/g, '_').trim();
    return raw.slice(0, 180) || 'documento';
}

module.exports = { isPdfBuffer, sanitizeDownloadFilename };
