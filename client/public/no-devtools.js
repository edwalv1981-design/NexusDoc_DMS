// Bloqueo de clic derecho y atajos de herramientas de desarrollador (F12, Ctrl+Shift+I/J/C, Ctrl+U).
// Es solo disuasivo: la seguridad real está en el servidor. Archivo externo (antes era
// un <script> en línea) para que la CSP no necesite 'unsafe-inline' en script-src.
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'F12' || e.keyCode === 123) {
    e.preventDefault();
  }
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.keyCode === 73)) {
    e.preventDefault();
  }
  if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.keyCode === 74)) {
    e.preventDefault();
  }
  if (e.ctrlKey && (e.key === 'U' || e.keyCode === 85)) {
    e.preventDefault();
  }
  if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.keyCode === 67)) {
    e.preventDefault();
  }
});
