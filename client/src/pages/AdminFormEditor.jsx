import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Eye, Edit2, RefreshCw, ShieldCheck, History, AlertTriangle, CheckCircle2, Circle, CircleDot } from 'lucide-react';
import API_BASE_URL from '../config';
import { useLang } from '../i18n';
import { useToast } from '../components/Toast';
import { getFormTypeLabel } from '../formTypes';
import { getFormProgress } from '../utils/formProgress';
import CorporacionForm from './CorporacionForm';
import FundacionForm from './FundacionForm';
import CumplimientoIndividualForm from './CumplimientoIndividualForm';
import CumplimientoEntidadesForm from './CumplimientoEntidadesForm';
import FondosForm from './FondosForm';
import TemplateFormRouter, { templateVersionOf } from '../components/TemplateFormRouter';

const PRIMARY = '#0f766e';
const BORDER = '#e2e8f0';

const TX = {
  es: {
    back: 'Volver al panel', view: 'Ver', edit: 'Editar', viewMode: 'SOLO LECTURA', editMode: 'EDICIÓN DEL ADMINISTRADOR',
    owner: 'Usuario', version: 'Versión', lastSave: 'Último guardado', progress: 'Avance del usuario',
    savedStep: 'Se quedó en', of: 'de', finished: 'Finalizado por el usuario', draft: 'En borrador (no finalizado)',
    untracked: 'Estado no registrado (trámite guardado antes de esta función); paso estimado por los datos.',
    stepsComplete: 'pasos completos', complete: 'Completo', partial: 'Incompleto', empty: 'Sin datos',
    adminEdits: 'Ediciones del administrador', noAdminEdits: 'Sin ediciones del administrador.', changes: 'cambio(s)',
    versions: 'Versiones', byAdmin: 'administrador', byUser: 'usuario', olderOpened: 'Abriste la versión {v}; se muestra la versión más reciente.',
    editHint: 'Los cambios se guardan como una nueva versión a nombre del usuario y quedan registrados en la bitácora. El usuario verá que su trámite fue editado por el administrador.',
    viewHint: 'Vista de solo lectura: navega por los pasos con los botones Anterior/Siguiente. Esta consulta queda registrada en la bitácora.',
    saved: 'Trámite actualizado ({n} cambio(s)). Quedó registrado en la bitácora.', unchanged: 'No hay cambios que guardar.',
    conflictTitle: 'El trámite cambió mientras lo editabas',
    conflictBody: 'Otra persona guardó una versión más reciente. Tus cambios NO se guardaron para no sobrescribirla. Carga la versión más reciente y vuelve a aplicar tus cambios.',
    reload: 'Cargar versión más reciente', loading: 'Cargando trámite…', error: 'No se pudo cargar el trámite.', unsupported: 'Este tipo de trámite no tiene editor visual.',
  },
  en: {
    back: 'Back to panel', view: 'View', edit: 'Edit', viewMode: 'READ ONLY', editMode: 'ADMINISTRATOR EDIT',
    owner: 'User', version: 'Version', lastSave: 'Last saved', progress: 'User progress',
    savedStep: 'Stopped at', of: 'of', finished: 'Finished by the user', draft: 'Draft (not finished)',
    untracked: 'Status not recorded (saved before this feature); step estimated from the data.',
    stepsComplete: 'steps complete', complete: 'Complete', partial: 'Incomplete', empty: 'No data',
    adminEdits: 'Administrator edits', noAdminEdits: 'No administrator edits.', changes: 'change(s)',
    versions: 'Versions', byAdmin: 'administrator', byUser: 'user', olderOpened: 'You opened version {v}; the latest version is shown.',
    editHint: 'Changes are saved as a new version on behalf of the user and recorded in the audit log. The user will see that the administrator edited the form.',
    viewHint: 'Read-only view: use Previous/Next to move between steps. This view is recorded in the audit log.',
    saved: 'Form updated ({n} change(s)). Recorded in the audit log.', unchanged: 'No changes to save.',
    conflictTitle: 'The form changed while you were editing',
    conflictBody: 'Someone saved a newer version. Your changes were NOT saved so it is not overwritten. Load the latest version and re-apply your changes.',
    reload: 'Load latest version', loading: 'Loading form…', error: 'Could not load the form.', unsupported: 'This form type has no visual editor.',
  },
};

const STATUS_STYLE = {
  complete: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircle2 },
  partial: { color: '#b45309', bg: '#fffbeb', border: '#fde68a', Icon: CircleDot },
  empty: { color: '#64748b', bg: '#f8fafc', border: BORDER, Icon: Circle },
};

const AdminFormEditor = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'edit' ? 'edit' : 'view';
  const navigate = useNavigate();
  const toast = useToast();
  const { lang } = useLang();
  const tx = TX[lang === 'en' ? 'en' : 'es'];
  const locale = lang === 'en' ? 'en-US' : 'es-EC';

  const [state, setState] = useState({ loading: true, error: null, payload: null });
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Tras guardar ya tenemos la versión nueva: no volver a pedirla (evita un
  // registro extra de "abrió para editar" en la bitácora).
  const skipNextLoad = useRef(false);

  const load = useCallback(async (formId, currentMode) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setConflict(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/form-editor/${formId}`, {
        params: { mode: currentMode },
        headers: { 'x-auth-token': token },
      });
      setState({ loading: false, error: null, payload: res.data });
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/'); return; }
      setState({ loading: false, error: err.response?.data?.msg || tx.error, payload: null });
    }
  }, [navigate, tx.error]);

  useEffect(() => {
    if (skipNextLoad.current) { skipNextLoad.current = false; return; }
    load(id, mode);
  }, [id, mode, load]);

  const payload = state.payload;
  const form = payload?.form;
  const progress = useMemo(() => (form ? getFormProgress(form.type, form.data, lang) : null), [form, lang]);

  const switchMode = (next) => setSearchParams({ mode: next });

  const handleSave = async (dataToSave) => {
    if (!form) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/admin/form-editor/${form.id}/save`,
        { data: dataToSave, expectedLatestId: form.id },
        { headers: { 'x-auth-token': token } });
      if (res.data?.unchanged) {
        toast.info(tx.unchanged);
      } else {
        toast.success(tx.saved.replace('{n}', res.data?.changes ?? ''));
        // La versión nueva pasa a ser la base del siguiente guardado.
        setState({ loading: false, error: null, payload: res.data.payload });
        setReloadKey((k) => k + 1);
        skipNextLoad.current = true;
        navigate(`/admin/form/${res.data.form.id}?mode=edit`, { replace: true });
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setConflict(err.response.data);
      } else if (err.response?.status === 401) {
        localStorage.clear(); navigate('/');
      } else {
        toast.error(err.response?.data?.msg || 'Error');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderForm = () => {
    const k = `${form.id}-${mode}-${reloadKey}`;
    const common = {
      initialData: form.data,
      onSave: handleSave,
      saving,
      readOnly: mode === 'view',
      startStep: progress?.savedStep,
    };
    // Trámite llenado con una plantilla subida por el administrador: se edita con ESA plantilla.
    if (templateVersionOf(form.data)) {
      return (
        <TemplateFormRouter key={k} formType={form.type} initialData={form.data} isNew={false}
          title={getFormTypeLabel(form.type, lang)} renderLegacy={() => null} {...common} />
      );
    }
    switch (progress?.kind) {
      case 'corporacion': return <CorporacionForm key={k} {...common} />;
      case 'fundacion': return <FundacionForm key={k} {...common} />;
      case 'kyci': return <CumplimientoIndividualForm key={k} {...common} />;
      case 'kyce': return <CumplimientoEntidadesForm key={k} {...common} />;
      case 'fondos': return <FondosForm key={k} {...common} embedded />;
      default: return <div style={{ padding: 24, color: '#64748b' }}>{tx.unsupported}</div>;
    }
  };

  const goBack = () => {
    if (window.opener && !window.opener.closed) { window.close(); return; }
    navigate('/admin');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <style>{`
        .nx-readonly-fieldset input:disabled, .nx-readonly-fieldset select:disabled, .nx-readonly-fieldset textarea:disabled {
          color: #0f172a; -webkit-text-fill-color: #0f172a; opacity: 1; cursor: default;
        }
        .nx-readonly-fieldset .corporate-btn-primary, .nx-readonly-fieldset .corporate-btn-secondary, .nx-readonly-fieldset .corporate-btn-finish { display: none !important; }
        .nx-ro-nav { padding: 7px 16px; background: white; color: ${PRIMARY}; border: 1px solid ${PRIMARY}; border-radius: 6px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
        .nx-ro-nav:disabled { opacity: 0.35; cursor: default; }
        .nx-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; border: 1px solid ${BORDER}; background: white; color: #0f172a; }
        .nx-btn[aria-pressed="true"] { background: ${PRIMARY}; color: white; border-color: ${PRIMARY}; cursor: default; }
        @media (max-width: 900px) { .nx-editor-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <header style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f766e 100%)', color: 'white', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" onClick={goBack} className="nx-btn" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}>
            <ArrowLeft size={14} /> {tx.back}
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{form ? getFormTypeLabel(form.type, lang) : '…'}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{payload?.owner ? `${tx.owner}: ${payload.owner.name || payload.owner.email}${payload.owner.uniqueCode ? ` · ${payload.owner.uniqueCode}` : ''}` : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, padding: '4px 8px', borderRadius: 4, background: mode === 'edit' ? '#f59e0b' : 'rgba(255,255,255,0.15)' }}>
            {mode === 'edit' ? tx.editMode : tx.viewMode}
          </span>
          <button type="button" className="nx-btn" aria-pressed={mode === 'view'} onClick={() => mode !== 'view' && switchMode('view')}><Eye size={14} /> {tx.view}</button>
          <button type="button" className="nx-btn" aria-pressed={mode === 'edit'} onClick={() => mode !== 'edit' && switchMode('edit')}><Edit2 size={14} /> {tx.edit}</button>
        </div>
      </header>

      <main style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {state.loading && !payload && <p style={{ color: '#64748b' }}>{tx.loading}</p>}
        {state.error && <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 14, borderRadius: 8 }}>{state.error}</div>}

        {form && progress && (
          <div className="nx-editor-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 16 }}>
              <section style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
                <h2 style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{tx.progress}</h2>
                <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY }}>
                  {tx.savedStep} {progress.savedStep} {tx.of} {progress.totalSteps}
                </div>
                <div style={{ fontSize: 12, color: '#334155', fontWeight: 600, marginBottom: 8 }}>{progress.savedStepLabel}</div>
                {progress.finished === true && <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>✔ {tx.finished}</div>}
                {progress.finished === false && <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>● {tx.draft}</div>}
                {progress.finished === null && <div style={{ fontSize: 11, color: '#64748b' }}>{tx.untracked}</div>}
                <div style={{ fontSize: 11, color: '#64748b', margin: '8px 0' }}>{progress.completeCount}/{progress.totalSteps} {tx.stepsComplete}</div>
                <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {progress.steps.map((s) => {
                    const st = STATUS_STYLE[s.status];
                    const current = s.n === progress.savedStep;
                    return (
                      <li key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, padding: '5px 8px', borderRadius: 6, background: st.bg, border: `1px solid ${current ? PRIMARY : st.border}`, fontWeight: current ? 800 : 600, color: '#0f172a' }}>
                        <st.Icon size={14} color={st.color} aria-hidden="true" />
                        <span style={{ flex: 1 }}>{s.n}. {s.label}</span>
                        <span style={{ fontSize: 10, color: st.color }}>{tx[s.status]}</span>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, fontSize: 12, color: '#334155' }}>
                <div><strong>{tx.version}:</strong> v{form.version}</div>
                <div><strong>{tx.lastSave}:</strong> {new Date(form.createdAt).toLocaleString(locale)}</div>
                {payload.requestedVersion !== form.version && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#b45309' }}>{tx.olderOpened.replace('{v}', payload.requestedVersion)}</div>
                )}
                <h3 style={{ fontSize: 11, fontWeight: 800, margin: '12px 0 6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={13} /> {tx.adminEdits}</h3>
                {payload.adminEdits.length === 0 ? <div style={{ color: '#64748b' }}>{tx.noAdminEdits}</div> : (
                  <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {[...payload.adminEdits].reverse().slice(0, 8).map((e, i) => (
                      <li key={i}>v{e.version} · {new Date(e.at).toLocaleString(locale)} · {e.adminName || e.adminEmail} · {e.changesCount} {tx.changes}</li>
                    ))}
                  </ul>
                )}
                <h3 style={{ fontSize: 11, fontWeight: 800, margin: '12px 0 6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><History size={13} /> {tx.versions} ({payload.versions.length})</h3>
                <ul style={{ margin: 0, paddingLeft: 16, maxHeight: 140, overflowY: 'auto' }}>
                  {payload.versions.map((v) => (
                    <li key={v.id}>v{v.version} · {new Date(v.createdAt).toLocaleString(locale)} · {v.editedByAdmin ? tx.byAdmin : tx.byUser}</li>
                  ))}
                </ul>
              </section>
            </aside>

            <section>
              <div role="note" style={{ background: mode === 'edit' ? '#fffbeb' : '#f0f9ff', border: `1px solid ${mode === 'edit' ? '#fcd34d' : '#bae6fd'}`, color: mode === 'edit' ? '#92400e' : '#075985', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                {mode === 'edit' ? tx.editHint : tx.viewHint}
              </div>

              {conflict && (
                <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#7f1d1d', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, marginBottom: 6 }}><AlertTriangle size={16} /> {tx.conflictTitle}</div>
                  <div style={{ fontSize: 12.5, marginBottom: 10 }}>{tx.conflictBody} (v{conflict.latestVersion})</div>
                  <button type="button" className="nx-btn" onClick={() => navigate(`/admin/form/${conflict.latestId}?mode=edit`, { replace: true })}><RefreshCw size={14} /> {tx.reload}</button>
                </div>
              )}

              <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 18px 18px' }}>
                {renderForm()}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminFormEditor;
