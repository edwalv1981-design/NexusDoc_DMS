/**
 * Decide qué formulario mostrar para los 5 formularios del sistema:
 *
 * 1. Trámite llenado con una plantilla subida (data.__templateVersion) -> formulario de ESA versión.
 * 2. Trámite NUEVO y el administrador tiene una plantilla activa      -> formulario de la plantilla activa.
 * 3. Cualquier otro caso (trámites anteriores, sin plantilla activa, o error) -> formulario estándar
 *    de siempre (renderLegacy), sin ningún cambio.
 */
import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../config';
import TemplateVersionForm from './TemplateVersionForm';

const cache = new Map();

async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url);
  const token = localStorage.getItem('token');
  const p = fetch(url, { headers: { 'x-auth-token': token } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((res) => {
      if (!res) cache.delete(url); // los errores no se guardan: se reintenta al volver a abrir
      return res;
    });
  cache.set(url, p);
  // La plantilla activa puede cambiar: no se guarda en caché más de un minuto.
  setTimeout(() => cache.delete(url), 60000);
  return p;
}

export function templateVersionOf(data) {
  const ref = data && typeof data === 'object' ? data.__templateVersion : null;
  return ref && typeof ref === 'object' && ref.id ? ref : null;
}

const TemplateFormRouter = ({
  formType,
  initialData,
  isNew,
  renderLegacy,
  onSave,
  saving,
  readOnly,
  startStep,
  title,
  allowUpgrade = false,
}) => {
  const ref = templateVersionOf(initialData);
  const refId = ref ? ref.id : null;
  const finished = Boolean(initialData && initialData.__progress && initialData.__progress.finished);
  const [state, setState] = useState({ loading: Boolean(refId || isNew), version: null, key: '', upgradedFrom: null });

  useEffect(() => {
    let alive = true;
    const url = refId
      ? `${API_BASE_URL}/api/forms/template-version/${encodeURIComponent(refId)}`
      : isNew && formType
        ? `${API_BASE_URL}/api/forms/template-version/active/${encodeURIComponent(formType)}`
        : null;
    if (!url) {
      setState({ loading: false, version: null, key: '' });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      const res = await fetchJson(url);
      let version = res && res.version && res.version.schema ? res.version : null;
      let upgradedFrom = null;
      // Borrador (no enviado) llenado con una versión anterior: se abre con la versión activa.
      // Los campos que ya existían conservan su clave, así que los datos aparecen igual;
      // los campos nuevos quedan vacíos. Los trámites ENVIADOS se quedan con su versión.
      if (version && refId && allowUpgrade && !finished) {
        const act = await fetchJson(`${API_BASE_URL}/api/forms/template-version/active/${encodeURIComponent(version.formType || formType)}`);
        const active = act && act.version && act.version.schema ? act.version : null;
        if (active && active.id !== version.id && Number(active.version) > Number(version.version)) {
          upgradedFrom = version.version;
          version = active;
        }
      }
      if (!alive) return;
      setState({ loading: false, version, key: url, upgradedFrom });
    })();
    return () => { alive = false; };
  }, [refId, isNew, formType, allowUpgrade, finished]);

  if (state.loading) {
    return <div style={{ textAlign: 'center', padding: 50, color: '#64748b' }} aria-busy="true">…</div>;
  }
  if (state.version) {
    return (
      <TemplateVersionForm
        key={state.version.id}
        versionInfo={state.version}
        initialData={initialData}
        onSave={onSave}
        saving={saving}
        readOnly={readOnly}
        startStep={startStep}
        title={title}
        upgradedFrom={state.upgradedFrom}
      />
    );
  }
  if (refId) {
    // Trámite de una plantilla subida: nunca se abre con el formulario estándar (no coincidirían los datos).
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#b91c1c', fontSize: 13 }}>
        No se pudo cargar la plantilla de este trámite. Recargue la página e intente de nuevo.
        <br />
        Could not load this form&apos;s template. Please reload the page and try again.
      </div>
    );
  }
  return renderLegacy();
};

export default TemplateFormRouter;
