/**
 * Revisión de una versión de plantilla antes de activarla: el administrador corrige lo que el
 * análisis automático (sobre todo el OCR de PDF escaneados) no leyó bien.
 * Se editan solo textos: etiquetas, textos de ayuda, títulos, opciones, obligatoriedad y tipo
 * (texto / área / fecha). Las claves de los datos y la posición en el PDF no cambian.
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Save, Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import API_BASE_URL from '../config';
import { useLang } from '../i18n';

const TX = {
  es: {
    title: 'Revisar plantilla v{v}',
    help: 'Corrija las etiquetas y los textos de ayuda tal como deben verlos los clientes. Lo que quite aquí solo deja de mostrarse; no se borra ningún dato.',
    section: 'Título de la sección',
    guide: 'Texto de ayuda',
    heading: 'Subtítulo',
    label: 'Etiqueta del campo',
    hint: 'Ayuda bajo el campo (opcional)',
    required: 'Obligatorio',
    kind: 'Tipo',
    kinds: { text: 'Texto', textarea: 'Texto largo', date: 'Fecha' },
    kindNames: { yesno: 'Sí / No', multi: 'Casillas', choice: 'Una opción', checkbox: 'Casilla', signature: 'Firma (a mano)', select: 'Lista' },
    options: 'Opciones',
    addGuide: 'Añadir texto de ayuda aquí',
    remove: 'Quitar',
    save: 'Guardar correcciones',
    saving: 'Guardando…',
    cancel: 'Cerrar',
    saved: 'Correcciones guardadas.',
    savedNew: 'La versión ya se usó: se guardaron las correcciones como v{v} (pendiente de activar).',
    loadError: 'No se pudo cargar la plantilla.',
    conditional: 'Se muestra solo si la respuesta anterior es Sí',
  },
  en: {
    title: 'Review template v{v}',
    help: 'Fix labels and help texts exactly as clients should see them. Anything removed here is only hidden; no data is deleted.',
    section: 'Section title',
    guide: 'Help text',
    heading: 'Subtitle',
    label: 'Field label',
    hint: 'Help under the field (optional)',
    required: 'Required',
    kind: 'Type',
    kinds: { text: 'Text', textarea: 'Long text', date: 'Date' },
    kindNames: { yesno: 'Yes / No', multi: 'Checkboxes', choice: 'One option', checkbox: 'Checkbox', signature: 'Signature (by hand)', select: 'List' },
    options: 'Options',
    addGuide: 'Add help text here',
    remove: 'Remove',
    save: 'Save corrections',
    saving: 'Saving…',
    cancel: 'Close',
    saved: 'Corrections saved.',
    savedNew: 'This version was already used: corrections were saved as v{v} (pending activation).',
    loadError: 'Could not load the template.',
    conditional: 'Shown only if the previous answer is Yes',
  },
};
const fmt = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

const box = { border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, marginBottom: 8, background: 'white' };
const input = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 4, padding: '5px 7px', fontSize: 12, boxSizing: 'border-box' };
const small = { border: '1px solid #cbd5e1', background: 'white', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 };

const TemplateSchemaEditor = ({ versionId, onClose, onSaved, toast }) => {
  const { lang } = useLang();
  const tx = TX[lang === 'en' ? 'en' : 'es'];
  const [info, setInfo] = useState(null);
  const [sections, setSections] = useState([]);
  const [fields, setFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const headers = () => ({ 'x-auth-token': localStorage.getItem('token') });

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/admin/template-versions/${versionId}/schema`, { headers: headers() })
      .then((res) => {
        const v = res.data.version;
        setInfo(v);
        setSections(JSON.parse(JSON.stringify(v.schema.sections || [])));
        setFields(JSON.parse(JSON.stringify(v.schema.fields || {})));
      })
      .catch(() => setError(tx.loadError));
  }, [versionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSec = (si, patch) => setSections((ss) => ss.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const setItem = (si, ii, patch) => setSections((ss) => ss.map((s, i) => (i !== si ? s : {
    ...s, items: s.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)),
  })));
  const removeItem = (si, ii) => {
    const it = sections[si].items[ii];
    setSections((ss) => ss.map((s, i) => (i !== si ? s : { ...s, items: s.items.filter((_, j) => j !== ii) })));
    if (it.type === 'field') setFields((fs) => { const n = { ...fs }; delete n[it.key]; return n; });
  };
  const addGuide = (si, ii) => setSections((ss) => ss.map((s, i) => (i !== si ? s : {
    ...s, items: [...s.items.slice(0, ii + 1), { type: 'guide', text: '' }, ...s.items.slice(ii + 1)],
  })));
  const move = (si, ii, d) => setSections((ss) => ss.map((s, i) => {
    if (i !== si) return s;
    const items = [...s.items];
    const j = ii + d;
    if (j < 0 || j >= items.length) return s;
    [items[ii], items[j]] = [items[j], items[ii]];
    return { ...s, items };
  }));
  const setField = (key, patch) => setFields((fs) => ({ ...fs, [key]: { ...fs[key], ...patch } }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/api/admin/template-versions/${versionId}/schema`,
        { schema: { sections, fields } }, { headers: headers() });
      toast?.success?.(res.data.inPlace ? tx.saved : fmt(tx.savedNew, { v: res.data.version }));
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast?.error?.(e.response?.data?.msg || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#f8fafc', width: 'min(980px, 100%)', borderRadius: 10, display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: '10px 10px 0 0' }}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>{fmt(tx.title, { v: info?.version ?? '' })}</strong>
            <div style={{ fontSize: 11, color: '#64748b' }}>{tx.help}</div>
          </div>
          <button type="button" style={small} onClick={onClose}><X size={12} /> {tx.cancel}</button>
          <button type="button" disabled={saving || !info} onClick={save}
            style={{ ...small, background: '#0f766e', color: 'white', borderColor: '#0f766e', padding: '5px 10px', fontSize: 11 }}>
            <Save size={12} /> {saving ? tx.saving : tx.save}
          </button>
        </div>
        <div style={{ overflow: 'auto', padding: 16 }}>
          {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
          {sections.map((s, si) => (
            <div key={si} style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>{tx.section}</label>
              <input style={{ ...input, fontWeight: 700, marginBottom: 8 }} value={s.title || ''} onChange={(e) => setSec(si, { title: e.target.value })} />
              {s.items.map((it, ii) => {
                const tools = (
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    <button type="button" style={small} onClick={() => move(si, ii, -1)}><ArrowUp size={11} /></button>
                    <button type="button" style={small} onClick={() => move(si, ii, 1)}><ArrowDown size={11} /></button>
                    <button type="button" style={small} onClick={() => addGuide(si, ii)}><Plus size={11} /> {tx.addGuide}</button>
                    <button type="button" style={{ ...small, color: '#b91c1c' }} onClick={() => removeItem(si, ii)}><Trash2 size={11} /> {tx.remove}</button>
                  </span>
                );
                if (it.type === 'guide') {
                  return (
                    <div key={ii} style={{ ...box, borderLeft: '3px solid #94a3b8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>
                          {tx.guide}{' '}
                          <label style={{ fontWeight: 400, marginLeft: 8 }}>
                            <input type="checkbox" checked={Boolean(it.heading)} onChange={(e) => setItem(si, ii, { heading: e.target.checked })} /> {tx.heading}
                          </label>
                        </span>
                        {tools}
                      </div>
                      <textarea style={{ ...input, minHeight: 44 }} value={it.text || ''} onChange={(e) => setItem(si, ii, { text: e.target.value })} />
                    </div>
                  );
                }
                const f = fields[it.key];
                if (!f) return null;
                const textGroup = ['text', 'textarea', 'date'].includes(f.kind);
                return (
                  <div key={ii} style={{ ...box, borderLeft: '3px solid #0f766e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e' }}>
                        {tx.label} · {textGroup ? tx.kinds[f.kind] : (tx.kindNames[f.kind] || f.kind)}
                        {f.requiredIf ? <span style={{ color: '#64748b', fontWeight: 400 }}> · {tx.conditional}</span> : null}
                      </span>
                      {tools}
                    </div>
                    <input style={input} value={f.label || ''} onChange={(e) => setField(it.key, { label: e.target.value })} />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                      {textGroup ? (
                        <label style={{ fontSize: 11 }}>{tx.kind}{' '}
                          <select value={f.kind} onChange={(e) => setField(it.key, { kind: e.target.value })} style={{ fontSize: 11 }}>
                            {Object.entries(tx.kinds).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                          </select>
                        </label>
                      ) : null}
                      {f.kind !== 'signature' && !f.requiredIf ? (
                        <label style={{ fontSize: 11 }}>
                          <input type="checkbox" checked={Boolean(f.required)} onChange={(e) => setField(it.key, { required: e.target.checked })} /> {tx.required}
                        </label>
                      ) : null}
                    </div>
                    {Array.isArray(f.options) && f.kind !== 'yesno' ? (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: '#475569' }}>{tx.options}</span>
                        {f.options.map((o, oi) => (
                          <input key={o.value} style={{ ...input, marginTop: 3 }} value={o.label || ''}
                            onChange={(e) => setField(it.key, { options: f.options.map((x, xi) => (xi === oi ? { ...x, label: e.target.value } : x)) })} />
                        ))}
                      </div>
                    ) : null}
                    <input style={{ ...input, marginTop: 6, fontSize: 11 }} placeholder={tx.hint} value={f.hint || ''}
                      onChange={(e) => setField(it.key, { hint: e.target.value })} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateSchemaEditor;
