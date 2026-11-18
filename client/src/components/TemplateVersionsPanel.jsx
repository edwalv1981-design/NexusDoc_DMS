/**
 * Panel del administrador: versiones de plantilla de los 5 formularios del sistema.
 * - Muestra qué plantilla usan los trámites NUEVOS de cada formulario (o el formulario estándar).
 * - Permite ver una vista previa (PDF con cada campo rotulado), activar una versión anterior
 *   o volver al formulario estándar. Nada se borra: los trámites existentes no cambian.
 */
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Layers, Eye, Download, RotateCcw, CheckCircle } from 'lucide-react';
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
    title: 'Versiones de plantilla (formulario y PDF de trámites nuevos)',
    intro: 'Al subir una plantilla para un formulario del sistema, los trámites NUEVOS usan sus campos, textos guía y diseño de PDF. Los trámites ya registrados conservan la versión con la que se llenaron.',
    standard: 'Formulario estándar del sistema',
    usingVersion: 'Usando plantilla v{v}',
    fields: '{n} campos',
    active: 'Activa',
    activate: 'Activar',
    preview: 'Vista previa',
    original: 'PDF original',
    backToStandard: 'Volver al formulario estándar',
    confirmStandard: '¿Volver al formulario estándar del sistema para "{t}"? Los trámites nuevos usarán el formulario de siempre. No se borra ninguna versión ni trámite.',
    confirmActivate: '¿Activar la versión {v} para los trámites nuevos de "{t}"?',
    noVersions: 'Sin plantillas subidas.',
    noFields: 'sin campos detectados (no se activó)',
    loadError: 'No se pudieron cargar las versiones de plantilla.',
    done: 'Cambio aplicado.',
  },
  en: {
    title: 'Template versions (form and PDF for new submissions)',
    intro: 'When a template is uploaded for a system form, NEW submissions use its fields, guide texts and PDF layout. Existing submissions keep the version they were filled with.',
    standard: 'Standard system form',
    usingVersion: 'Using template v{v}',
    fields: '{n} fields',
    active: 'Active',
    activate: 'Activate',
    preview: 'Preview',
    original: 'Original PDF',
    backToStandard: 'Back to standard form',
    confirmStandard: 'Go back to the standard system form for "{t}"? New submissions will use the usual form. No version or submission is deleted.',
    confirmActivate: 'Activate version {v} for new "{t}" submissions?',
    noVersions: 'No uploaded templates.',
    noFields: 'no fields detected (not activated)',
    loadError: 'Could not load template versions.',
    done: 'Change applied.',
  },
};

const fmt = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

const btn = {
  border: '1px solid #cbd5e1', background: 'white', borderRadius: 4, padding: '3px 8px', fontSize: 10,
  fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0f172a',
};

const TemplateVersionsPanel = ({ refreshKey = 0 }) => {
  const { lang } = useLang();
  const tx = TX[lang === 'en' ? 'en' : 'es'];
  const toast = useToast();
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
      toast?.success?.(tx.done);
      await load();
    } catch (e) {
      toast?.error?.(e.response?.data?.msg || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const activate = (v, label) => {
    if (!window.confirm(fmt(tx.confirmActivate, { v: v.version, t: label }))) return;
    act(() => axios.post(`${API_BASE_URL}/api/admin/template-versions/${v.id}/activate`, {}, { headers: headers() }));
  };

  const useStandard = (formType, label) => {
    if (!window.confirm(fmt(tx.confirmStandard, { t: label }))) return;
    act(() => axios.post(`${API_BASE_URL}/api/admin/template-versions/use-standard`, { formType }, { headers: headers() }));
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
      <div>
        {FORM_TYPES.map((ft) => {
          const label = lang === 'en' ? ft.en : ft.es;
          const list = versions.filter((v) => v.formType === ft.id);
          const active = list.find((v) => v.isActive);
          return (
            <div key={ft.id} style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 12, color: '#1e293b' }}>{label}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                    background: active ? '#dcfce7' : '#f1f5f9', color: active ? '#15803d' : '#475569',
                  }}>
                    {active ? fmt(tx.usingVersion, { v: active.version }) : tx.standard}
                  </span>
                  {active ? (
                    <button type="button" style={btn} disabled={busy} onClick={() => useStandard(ft.id, label)}>
                      <RotateCcw size={12} /> {tx.backToStandard}
                    </button>
                  ) : null}
                </div>
              </div>
              {list.length === 0 ? (
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>{tx.noVersions}</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
                  <tbody>
                    {list.map((v) => (
                      <tr key={v.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 4px', fontWeight: 700, width: 40 }}>v{v.version}</td>
                        <td style={{ padding: '6px 4px', color: '#334155' }}>{v.fileName || '—'}</td>
                        <td style={{ padding: '6px 4px', color: '#64748b' }}>
                          {v.createdAt ? new Date(v.createdAt).toLocaleString(lang === 'en' ? 'en-US' : 'es-EC') : ''}
                        </td>
                        <td style={{ padding: '6px 4px', color: v.fieldCount ? '#334155' : '#b91c1c' }}>
                          {v.fieldCount ? fmt(tx.fields, { n: v.fieldCount }) : tx.noFields}
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {v.isActive ? (
                            <span style={{ ...btn, border: 'none', color: '#15803d', cursor: 'default' }}>
                              <CheckCircle size={12} /> {tx.active}
                            </span>
                          ) : v.fieldCount ? (
                            <button type="button" style={btn} disabled={busy} onClick={() => activate(v, label)}>
                              {tx.activate}
                            </button>
                          ) : null}{' '}
                          <button type="button" style={btn} onClick={() => openPdf(v.id, 'preview')}>
                            <Eye size={12} /> {tx.preview}
                          </button>{' '}
                          <button type="button" style={btn} onClick={() => openPdf(v.id, 'file')}>
                            <Download size={12} /> {tx.original}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateVersionsPanel;
