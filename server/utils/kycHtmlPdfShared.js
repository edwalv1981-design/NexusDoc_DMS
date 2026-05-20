'use strict';

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(v) {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
}

function kvRow(label, value) {
  return `<tr><td class="kv-label">${esc(label)}</td><td>${esc(value || '\u2014')}</td></tr>`;
}

/** Yes/No como casillas [X] / [ ] (mismo patron que fundacion / incorporacion). */
function formatYesNoChecks(yesSelected, noSelected, t) {
  const yesMark = yesSelected ? 'X' : ' ';
  const noMark = noSelected ? 'X' : ' ';
  return `<span class="chk">[${yesMark}] ${esc(t.yes)}</span> <span class="chk">[${noMark}] ${esc(t.no)}</span>`;
}

function buildFundsChecksHtml(fundsSourceKeys, data, t) {
  const selected = Array.isArray(data.fundsSource) ? data.fundsSource : [];
  const lines = fundsSourceKeys.map(({ key, labelKey }) => {
    const mark = selected.includes(key) ? 'X' : ' ';
    const label = esc(t[labelKey] || key);
    return '<div class="chk-line"><span class="chk">[' + mark + ']</span> ' + label + '</div>';
  });
  return lines.join('');
}

function isPepYes(pepValue) {
  return String(pepValue || '')
    .trim()
    .toLowerCase()
    .startsWith('s');
}

function sectionGuideHtml(guideText) {
  if (!guideText) return '';
  return '<p class="section-guide">' + esc(guideText) + '</p>';
}

module.exports = {
  esc,
  fmtDate,
  kvRow,
  formatYesNoChecks,
  buildFundsChecksHtml,
  isPepYes,
  sectionGuideHtml,
};
