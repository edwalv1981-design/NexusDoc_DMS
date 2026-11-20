/**
 * Panel del administrador: qué formulario usa cada tipo (los 5 del sistema).
 * Subir y listo: al cargar una plantilla queda en uso para los trámites nuevos. Aquí solo se ve el
 * formulario actual (el historial queda guardado pero oculto) y se puede volver al anterior.
 */
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Layers, Eye, Download, RotateCcw, X, CheckCircle } from 'lucide-react';
import API_BASE_URL from '../config';
import { useLang } from '../i18n';
import { useToast } from './Toast';

const FORM_TYPES = [
  { id: 'Cumplimiento Individual', es: 'Cumplimiento Individual (KYC)', en: 'Individual Compliance (KYC)' },
  { id: 'Cumplimiento Entidades', es: 'Cumplimiento Entidades (KYC)', en: 'Entity Compliance (KYC)' },
  { id: 'Fondos Registros contables', es: 'Declaración de Fondos', en: 'Source of Funds' },
  { id: 'Corporación', es: 'Incorporación / Corporación', en: 'Incorporation / Corporation' },
  { id: 'Fundaciones', es: 'Fundaciones', en: 'Foundations' },
];

const TX = {
  es: {
    title: 'Formularios en uso',
    intro: 'Ninguna plantilla cambia el formulario de los clientes sin su autorización: después de subirla revise la vista preliminar y pulse «Confirmar y usar». Los trámites ya registrados conservan su formulario y sus datos.',
    pending: 'Plantilla subida esperando su confirmación',
    reviewConfirm: 'Ver y confirmar',
    confirm: 'Confirmar y usar',
    discard: 'Descartar',
    confirmUse: '¿Poner en uso esta plantilla para los trámites NUEVOS de "{t}"? Los trámites ya registrados no cambian.',
    confirmDiscard: '¿Descartar esta plantilla? El formulario actual sigue igual. La plantilla queda guardada en el historial.',
    useDone: 'Listo: "{t}" ya usa la plantilla nueva para los trámites nuevos.',
    discardDone: 'Plantilla descartada. "{t}" sigue con el formulario actual.',
    close: 'Cerrar',
    standard: 'Formulario estándar del sistema',
    inUse: 'Plantilla subida en uso',
    fields: '{n} campos',
    uploaded: 'subida el {d}',
    preview: 'Vista previa',
    original: 'PDF original',
    back: 'Volver al formulario anterior',
    confirmBack: '¿Volver al formulario anterior en "{t}"? Los trámites nuevos usarán el formulario que estaba antes. No se borra nada.',
    backDone: 'Listo: "{t}" volvió al formulario anterior.',
    loadError: 'No se pudo cargar el estado de los formularios.',
    pvTitle: 'Vista preliminar · {t}',
    pvHelp: 'Así queda el formulario: cada campo detectado muestra su nombre y cada casilla una X.',
    pvHelpPending: 'Todavía NO está en uso. Si está conforme pulse «Confirmar y usar»; si no, «Descartar».',
    pvLoading: 'Generando vista preliminar…',
    pvOpenTab: 'Abrir en otra pestaña',
  },
  en: {
    title: 'Forms in use',
    intro: 'No template changes the clients\' form without your authorization: after uploading, review the preview and press «Confirm and use». Existing submissions keep their form and data.',
    pending: 'Uploaded template awaiting your confirmation',
    reviewConfirm: 'Review and confirm',
    confirm: 'Confirm and use',
    discard: 'Discard',
    confirmUse: 'Use this template for NEW submissions of "{t}"? Existing submissions do not change.',
    confirmDiscard: 'Discard this template? The current form stays the same. The template is kept in the history.',
    useDone: 'Done: "{t}" now uses the new template for new submissions.',
    discardDone: 'Template discarded. "{t}" keeps the current form.',
    close: 'Close',
    standard: 'Standard system form',
    inUse: 'Uploaded template in use',
    fields: '{n} fields',
    uploaded: 'uploaded {d}',
    preview: 'Preview',
    original: 'Original PDF',
    back: 'Back to previous form',
    confirmBack: 'Go back to the previous form for "{t}"? New submissions will use the form that was in use before. Nothing is deleted.',
    backDone: 'Done: "{t}" is back to the previous form.',
    loadError: 'Could not load the forms status.',
    pvTitle: 'Preview · {t}',
    pvHelp: 'This is how the form looks: each detected field shows its name and each checkbox an X.',
    pvHelpPending: 'It is NOT in use yet. If it looks right press «Confirm and use»; otherwise «Discard».',
    pvLoading: 'Generating preview…',
    pvOpenTab: 'Open in a new tab',
  },
};

const fmt = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

const btn = {
  border: '1px solid #cbd5e1', background: 'white', borderRadius: 4, padding: '4px 9px', fontSize: 11,
  fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0f172a',
};

const TemplateVersionsPanel = ({ refreshKey = 0, autoPreview = null }) => {
  const { lang } = useLang();
  const tx = TX[lang === 'en' ? 'en' : 'es'];
  const toast = useToast();
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { id, formType, label, url, loading }

  const headers = () => ({ 'x-auth-token': localStorage.getItem('token') });

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/template-versions`, { headers: headers() });
      setVersions(Array.isArray(res.data?.versions) ? res.data.versions : []);
      setError('');
    } catch (e) {
      setError(tx.loadError);
    }
  }, [tx.loadError]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const labelOf = (formType) => {
    const ft = FORM_TYPES.find((x) => x.id === formType);
    return ft ? (lang === 'en' ? ft.en : ft.es) : formType;
  };

  const closePreview = () => {
    setPreview((p) => { if (p?.url) URL.revokeObjectURL(p.url); return null; });
  };

  const showPreview = useCallback(async (id, formType, pending = false) => {
    setPreview((p) => { if (p?.url) URL.revokeObjectURL(p.url); return { id, formType, pending, loading: true }; });
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/template-versions/${id}/preview`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }, responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      setPreview((p) => (p && p.id === id ? { ...p, url, loading: false } : p));
    } catch (e) {
      setPreview(null);
      toast?.error?.(e.response?.data?.msg || 'Error');
    }
  }, [toast]);

  useEffect(() => {
    if (autoPreview?.id) showPreview(autoPreview.id, autoPreview.formType, Boolean(autoPreview.pending));
  }, [autoPreview, showPreview]);

  const openPdf = async (id, kind) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/template-versions/${id}/${kind}`, {
        headers: headers(), responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast?.error?.(e.response?.data?.msg || 'Error');
    }
  };

  const confirmUse = async (id, label) => {
    if (!window.confirm(fmt(tx.confirmUse, { t: label }))) return;
    setBusy(true);
    try {
      await axios.post(`${API_BASE_URL}/api/admin/template-versions/${id}/activate`, {}, { headers: headers() });
      closePreview();
      toast?.success?.(fmt(tx.useDone, { t: label }));
      await load();
    } catch (e) {
      toast?.error?.(e.response?.data?.msg || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const discard = async (id, label) => {
    if (!window.confirm(tx.confirmDiscard)) return;
    setBusy(true);
    try {
      await axios.post(`${API_BASE_URL}/api/admin/template-versions/${id}/discard`, {}, { headers: headers() });
      closePreview();
      toast?.success?.(fmt(tx.discardDone, { t: label }));
      await load();
    } catch (e) {
      toast?.error?.(e.response?.data?.msg || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const goBack = async (formType, label) => {
    if (!window.confirm(fmt(tx.confirmBack, { t: label }))) return;
    setBusy(true);
    try {
      await axios.post(`${API_BASE_URL}/api/admin/template-versions/rollback`, { formType }, { headers: headers() });
      closePreview();
      toast?.success?.(fmt(tx.backDone, { t: label }));
      await load();
    } catch (e) {
      toast?.error?.(e.response?.data?.msg || 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 30, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Layers size={18} color="#0f766e" />
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{tx.title}</h3>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>{tx.intro}</p>
        </div>
      </div>
      {error ? <p style={{ color: '#b91c1c', fontSize: 12, padding: '10px 18px' }}>{error}</p> : null}
      {FORM_TYPES.map((ft) => {
        const label = lang === 'en' ? ft.en : ft.es;
        const active = versions.find((v) => v.formType === ft.id && v.isActive);
        const pending = versions
          .filter((v) => v.formType === ft.id && !v.isActive && Number(v.fieldCount) > 0
            && v.review && v.review.pending && !v.review.retired
            && (!active || Number(v.version) > Number(active.version)))
          .sort((a, b) => Number(b.version) - Number(a.version))[0];
        return (
          <div key={ft.id} style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <strong style={{ fontSize: 12, color: '#1e293b' }}>{label}</strong>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {active ? (
                  <>
                    <span style={{ color: '#15803d', fontWeight: 700 }}>{tx.inUse}</span>
                    {' · '}{active.fileName || ''}
                    {' · '}{fmt(tx.fields, { n: active.fieldCount })}
                    {active.createdAt ? ` · ${fmt(tx.uploaded, { d: new Date(active.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-EC') })}` : ''}
                  </>
                ) : tx.standard}
              </div>
            </div>
            {active ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" style={btn} onClick={() => showPreview(active.id, ft.id)}><Eye size={12} /> {tx.preview}</button>
                <button type="button" style={btn} onClick={() => openPdf(active.id, 'file')}><Download size={12} /> {tx.original}</button>
                <button type="button" style={btn} disabled={busy} onClick={() => goBack(ft.id, label)}><RotateCcw size={12} /> {tx.back}</button>
              </div>
            ) : null}
            {pending ? (
              <div style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '6px 10px' }}>
                <span style={{ fontSize: 11, color: '#92400e', fontWeight: 700, flex: 1 }}>
                  {tx.pending} · {pending.fileName || ''} · {fmt(tx.fields, { n: pending.fieldCount })}
                </span>
                <button type="button" style={btn} onClick={() => showPreview(pending.id, ft.id, true)}><Eye size={12} /> {tx.reviewConfirm}</button>
              </div>
            ) : null}
          </div>
        );
      })}
      {preview ? (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 8, width: 'min(980px, 100%)', height: 'min(92vh, 1100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{fmt(tx.pvTitle, { t: labelOf(preview.formType) })}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>{tx.pvHelp}</p>
                {preview.pending ? <p style={{ margin: '4px 0 0', fontSize: 11, color: '#92400e', fontWeight: 700 }}>{tx.pvHelpPending}</p> : null}
              </div>
              <button type="button" aria-label="Cerrar" onClick={closePreview} style={{ ...btn, border: 'none' }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, background: '#f1f5f9' }}>
              {preview.loading || !preview.url ? (
                <p style={{ padding: 24, fontSize: 13, color: '#475569' }}>{tx.pvLoading}</p>
              ) : (
                <iframe title="preview" src={preview.url} style={{ width: '100%', height: '100%', border: 'none' }} />
              )}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {preview.url ? (
                <button type="button" style={btn} onClick={() => window.open(preview.url, '_blank', 'noopener')}><Eye size={12} /> {tx.pvOpenTab}</button>
              ) : null}
              {preview.pending ? (
                <>
                  <button type="button" style={btn} disabled={busy} onClick={() => discard(preview.id, labelOf(preview.formType))}><X size={12} /> {tx.discard}</button>
                  <button type="button" style={{ ...btn, background: '#0f766e', color: 'white', border: '1px solid #0f766e' }} disabled={busy || !preview.url} onClick={() => confirmUse(preview.id, labelOf(preview.formType))}><CheckCircle size={12} /> {tx.confirm}</button>
                </>
              ) : (
                <>
                  <button type="button" style={btn} disabled={busy} onClick={() => goBack(preview.formType, labelOf(preview.formType))}><RotateCcw size={12} /> {tx.back}</button>
                  <button type="button" style={btn} onClick={closePreview}>{tx.close}</button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TemplateVersionsPanel;
