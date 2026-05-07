/**
 * Agente interno de maquetación para PDF Corporación (HTML).
 * Objetivo: reducir saltos de página "feos" (huérfanos, bloques imposibles de mantener juntos).
 * No afecta SFAR ni otros formularios.
 *
 * PDF / logo (evitar errores recurrentes):
 * - Logo solo vía `headerTemplate` de Puppeteer (`getCorporacionPuppeteerPdfChromeOptions`), no `position:fixed` en el HTML.
 * - `getPdfBodyTopMarginPx` = altura cabecera + buffer; debe coincidir con el cálculo de altura útil en `refineAfterRender`.
 * - Márgenes: definidos en **@page** (mm) para que se repitan en **cada** hoja al imprimir; `page.pdf({ margin:0 })`.
 * - `preferCSSPageSize: true` para que Chromium respete @page (si margin>0 en API + @page 0, el contenido iba a borde).
 * - Asset `templates/logo_empresa.png`: preferir PNG con transparencia; si el fondo es blanco “quemado”, seguirá tapando el teal.
 */

const A4_HEIGHT_PX = 1123; // ~297mm @ 96dpi
const DEFAULT_BOTTOM_PX = 48;

function pxToMmString(px, decimals = 2) {
  const mm = (px * 25.4) / 96;
  return `${mm.toFixed(decimals)}mm`;
}

function insetMmToPx(mmStr) {
  const n = parseFloat(String(mmStr).replace(/mm\s*$/i, ''));
  if (Number.isNaN(n)) return DEFAULT_BOTTOM_PX;
  return (n * 96) / 25.4;
}

/** Altura total (px) de la franja fija del logo (padding + imagen + reserva inferior). */
function getHeaderBandPx(layout) {
  return (
    layout.RUNNING_HEADER_PADDING_TOP +
    layout.HEADER_LOGO_H +
    layout.RUNNING_HEADER_PADDING_BOTTOM
  );
}

/** Desde el borde superior del papel hasta donde debe empezar el flujo del documento (igual en todas las páginas). */
function getContentStartPx(layout) {
  return getHeaderBandPx(layout) + layout.DOC_BODY_GAP_BELOW_HEADER;
}

/**
 * Margen superior del **cuerpo** del PDF (px): reserva cabecera + hueco; incluye buffer anti-solape Chrome.
 * Debe usarse igual en `page.pdf({ margin.top })` y en `refineAfterRender` (altura útil).
 */
function getPdfBodyTopMarginPx(layout = LAYOUT) {
  return getContentStartPx(layout) + layout.PDF_TOP_MARGIN_BUFFER_PX;
}

/**
 * Márgenes del `page.pdf()` de Puppeteer (área del cuerpo). Misma geometría en **cada** hoja.
 */
function getPuppeteerPdfMargins(layout = LAYOUT) {
  return {
    top: pxToMmString(getPdfBodyTopMarginPx(layout)),
    left: layout.H_INSET,
    right: layout.H_INSET,
    bottom: layout.BOTTOM_INSET,
  };
}

/**
 * Cadena `margin` para regla `@page` (orden CSS: top right bottom left).
 */
function getPrintPageMarginCss(layout = LAYOUT) {
  const m = getPuppeteerPdfMargins(layout);
  return `${m.top} ${m.right} ${m.bottom} ${m.left}`;
}

function escAttrHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * Logo en **todas** las páginas sin `position:fixed` en el HTML (Chromium lo trata mal en PDF).
 * Usa `displayHeaderFooter` + `headerTemplate`: es el mecanismo nativo de impresión de Chrome.
 *
 * @param {object} layout
 * @param {string} logoDataUri data URI o cadena vacía
 */
function buildPuppeteerHeaderFooterTemplates(layout, logoDataUri) {
  const inset = layout.H_INSET;
  const padTop = layout.RUNNING_HEADER_PADDING_TOP;
  const padBot = layout.RUNNING_HEADER_PADDING_BOTTOM;
  const h = layout.HEADER_LOGO_H;
  const img = logoDataUri
    ? `<img src="${escAttrHtml(logoDataUri)}" alt="" style="height:${h}px;width:auto;max-width:200px;display:block;object-fit:contain;" />`
    : `<span style="font-size:9px;font-weight:bold;color:#94a3b8;line-height:${h}px;display:inline-block;">PANAMA TAX LAWYERS</span>`;
  /* font-size:0 evita que Chrome infle la franja por line-height del contenedor (causa solapes “mediocres”). */
  const headerTemplate = `<div style="font-size:0;line-height:0;width:100%;box-sizing:border-box;margin:0;padding:${padTop}px ${inset} ${padBot}px ${inset};text-align:left;font-family:Arial,Helvetica,sans-serif;">${img}</div>`;
  const footerTemplate =
    '<div style="height:1px;margin:0;padding:0;font-size:1px;">&nbsp;</div>';
  return {
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
  };
}

/**
 * Opciones listas para `page.pdf({ ... })`: márgenes + cabecera repetible (logo).
 * El HTML del formulario ya **no** debe incluir `<header class="running-header">`.
 */
function getCorporacionPuppeteerPdfChromeOptions(layout = LAYOUT, logoDataUri = '') {
  return {
    margin: getPuppeteerPdfMargins(layout),
    ...buildPuppeteerHeaderFooterTemplates(layout, logoDataUri),
  };
}

/**
 * Falla rápido en CI o al arrancar checks si alguien rompe la geometría PDF/logo.
 * @param {object} [layout]
 */
function assertCorporacionPdfLayoutInvariants(layout = LAYOUT) {
  const band = getHeaderBandPx(layout);
  const start = getContentStartPx(layout);
  const bodyTop = getPdfBodyTopMarginPx(layout);
  if (!(band > 0 && layout.HEADER_LOGO_H > 0)) {
    throw new Error('corporacionLayoutGuard: HEADER_LOGO_H / band inválidos');
  }
  if (!(bodyTop >= start)) {
    throw new Error('corporacionLayoutGuard: getPdfBodyTopMarginPx debe ser >= getContentStartPx');
  }
  if (!(layout.DOC_BODY_GAP_BELOW_HEADER >= 0 && layout.PDF_TOP_MARGIN_BUFFER_PX >= 0)) {
    throw new Error('corporacionLayoutGuard: gaps/buffer no pueden ser negativos');
  }
  const opts = getCorporacionPuppeteerPdfChromeOptions(layout, 'data:image/png;base64,AA==');
  const m = opts.margin;
  if (!m || typeof m.top !== 'string' || !m.top.endsWith('mm')) {
    throw new Error('corporacionLayoutGuard: margin.top debe ser string en mm');
  }
  if (!opts.displayHeaderFooter || typeof opts.headerTemplate !== 'string') {
    throw new Error('corporacionLayoutGuard: falta headerTemplate / displayHeaderFooter');
  }
  if (!/src="data:image\/png;base64,/.test(opts.headerTemplate)) {
    throw new Error('corporacionLayoutGuard: headerTemplate debe incluir img con data URI');
  }
}

/**
 * @param {object} data - Mismo payload que CorporacionForm guarda
 */
function analyzeFormData(data = {}) {
  const directors = Array.isArray(data.directors) ? data.directors.length : 0;
  const shareholders = Array.isArray(data.shareholders) ? data.shareholders.length : 0;
  const actLen = String(data.companyActivities || '').length;

  let density = 'normal';
  if (directors > 6 || shareholders > 12 || actLen > 2200) density = 'high';
  if (directors > 10 || shareholders > 22 || actLen > 5000) density = 'very_high';

  /** Si el bloque final es enorme, forzar política de ruptura permisiva (evita cortar mal el PDF). */
  const tailKeepTogether = actLen < 3200 && directors <= 8 && shareholders <= 16;

  return {
    density,
    tailKeepTogether,
    directors,
    shareholders,
    activitiesChars: actLen,
  };
}

/**
 * CSS adicional según análisis (inyectado en <head>).
 */
function getAdaptiveCss(plan) {
  const rules = [];

  if (plan.density === 'high' || plan.density === 'very_high') {
    rules.push(`
      body.layout-guard--compact { font-size: 9px; }
      .layout-guard--compact .card h2 { font-size: 11px; padding: 4px 6px; }
      .layout-guard--compact .hint { padding: 3px 6px; line-height: 1.15; }
      .layout-guard--compact .first-page-title h1 { font-size: 18px; }
      .layout-guard--compact .first-page-title h2 { font-size: 14px; }
      .layout-guard--compact th, .layout-guard--compact td { padding: 1px 2px; font-size: 8px; }
      .layout-guard--compact th { font-size: 8px; }
    `);
  }

  if (!plan.tailKeepTogether) {
    rules.push(`
      body.layout-guard--split-tail .tail-block {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      body.layout-guard--split-tail .tail-block > .card:first-child {
        page-break-inside: auto;
        break-inside: auto;
      }
      /* Que no se pierdan título + ayuda de actividades en otra página sin el cuerpo. */
      body.layout-guard--split-tail .tail-block > .card.card--activities h2 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      body.layout-guard--split-tail .tail-block > .card.card--activities .hint {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      body.layout-guard--split-tail .tail-block > .card.card--activities .longtext {
        page-break-before: avoid !important;
        break-before: avoid !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      body.layout-guard--split-tail .tail-block > .card:last-child {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-before: avoid !important;
      }
    `);
  }

  return rules.join('\n');
}

function bodyClassForPlan(plan) {
  const c = ['layout-guard'];
  if (plan.density === 'high' || plan.density === 'very_high') c.push('layout-guard--compact');
  if (!plan.tailKeepTogether) c.push('layout-guard--split-tail');
  return c.join(' ');
}

/**
 * Tras pintar el DOM: si el bloque final no cabe razonablemente en una página,
 * aplicar reglas de ruptura (evita que el motor imprima recortes absurdos).
 * @param {import('puppeteer').Page} page
 */
async function refineAfterRender(page) {
  const bodyTopPx = getPdfBodyTopMarginPx(LAYOUT);
  const bottomPx = insetMmToPx(LAYOUT.BOTTOM_INSET);
  /** Altura útil por página A4 (px @96dpi), sin depender de innerHeight del headless. */
  const usablePerPage = A4_HEIGHT_PX - bodyTopPx - Math.max(bottomPx, DEFAULT_BOTTOM_PX);

  await page.evaluate((usable) => {
    const tail = document.querySelector('.tail-block');
    if (!tail) return;

    const old = document.getElementById('layout-guard-runtime');
    if (old) old.remove();

    const h = tail.offsetHeight;

    if (h > usable * 0.92) {
      const s = document.createElement('style');
      s.id = 'layout-guard-runtime';
      s.textContent = `
        .tail-block {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        .tail-block > .card.card--activities h2 {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .tail-block > .card.card--activities .hint {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .tail-block > .card.card--activities .longtext {
          page-break-before: avoid !important;
          break-before: avoid !important;
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        .tail-block > .card:last-child {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: avoid !important;
        }
      `;
      document.head.appendChild(s);
    }
  }, usablePerPage);
}

/**
 * Estimación grosera de si el documento probablemente supera una página A4 (solo logging / futuro).
 */
function estimateMinPages(plan, data = {}) {
  let units = 12;
  units += (plan.directors || 0) * 2.2;
  units += (plan.shareholders || 0) * 1.1;
  units += Math.min(8, String(data.companyActivities || '').length / 400);
  const pages = Math.max(1, Math.ceil(units / 28));
  return { estimatePages: pages, units: Math.round(units * 10) / 10 };
}

/** Constantes de maquetación PDF (una sola fuente de verdad) */
const LAYOUT = Object.freeze({
  /** Gutter izquierdo/derecho (impresión); subir si la impresora come mucho borde. */
  H_INSET: '18mm',
  BOTTOM_INSET: '12mm',
  HEADER_LOGO_H: 40,
  /** Espacio interno sobre la imagen dentro de la franja fija. */
  RUNNING_HEADER_PADDING_TOP: 16,
  RUNNING_HEADER_PADDING_BOTTOM: 18,
  /** Hueco entre la franja del logo y el inicio del contenido (como antes: 4px). */
  DOC_BODY_GAP_BELOW_HEADER: 4,
  /**
   * Colchón extra bajo el logo → `margin-top` del PDF. Evita solapes por redondeo mm/px o escala del headerTemplate.
   * Si el logo “besa” el primer bloque, subir un poco (p. ej. 16–24).
   */
  PDF_TOP_MARGIN_BUFFER_PX: 22,
});

module.exports = {
  LAYOUT,
  getHeaderBandPx,
  getContentStartPx,
  getPdfBodyTopMarginPx,
  getPuppeteerPdfMargins,
  getPrintPageMarginCss,
  buildPuppeteerHeaderFooterTemplates,
  getCorporacionPuppeteerPdfChromeOptions,
  assertCorporacionPdfLayoutInvariants,
  pxToMmString,
  insetMmToPx,
  analyzeFormData,
  getAdaptiveCss,
  bodyClassForPlan,
  refineAfterRender,
  estimateMinPages,
  /** Referencia para pruebas */
  _constants: { A4_HEIGHT_PX, LAYOUT, getContentStartPx, getPdfBodyTopMarginPx, getPrintPageMarginCss },
};
