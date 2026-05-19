'use strict';

/**
 * Comando Python para scripts de relleno/extracción.
 * En Railway u otros PaaS, definir PYTHON_PATH (p. ej. /opt/venv/bin/python3).
 */
function resolvePythonCommand() {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  return process.platform === 'win32' ? 'python' : 'python3';
}

module.exports = { resolvePythonCommand };
