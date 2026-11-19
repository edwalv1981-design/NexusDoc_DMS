/**
 * Formulario generado a partir de una plantilla PDF subida por el administrador.
 *
 * - Secciones, etiquetas y textos guía salen de la plantilla (en el idioma de la plantilla).
 * - Cada trámite guarda data.__templateVersion: el PDF se genera siempre con ESA versión.
 * - Campos de detalle ("En caso afirmativo…") solo se muestran y exigen si la respuesta es Sí.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Save, ChevronLeft, ChevronRight, CheckCircle2, PenLine } from 'lucide-react';
import { useLang } from '../i18n';
import { KYC_PRIMARY, kycFormSharedStyles } from './KycFormShared';
import ReadOnlyFieldset from './common/ReadOnlyFieldset';
import { withProgress } from '../utils/formProgress';

const TX = {
  es: {
    saveDraft: 'Guardar borrador',
    saving: 'Guardando…',
    back: 'Atrás',
    next: 'Continuar',
    finish: 'Finalizar y guardar',
    step: 'Paso {step} de {total}',
    yes: 'Sí',
    no: 'No',
    required: 'Complete los campos obligatorios marcados en rojo.',
    signature: 'Este espacio se firma a mano sobre el PDF impreso.',
    templateBadge: 'Plantilla v{v}',
    section: 'Sección {n}',
    selectOne: 'Seleccione…',
    annexNote: 'Si la respuesta no cabe en la plantilla, el PDF la incluye en un anexo.',
    upgraded: 'Este formulario se actualizó (v{from} → v{to}). Sus datos se conservaron; complete los campos marcados como NUEVO.',
    newBadge: 'NUEVO',
  },
  en: {
    saveDraft: 'Save draft',
    saving: 'Saving…',
    back: 'Back',
    next: 'Continue',
    finish: 'Finish and save',
    step: 'Step {step} of {total}',
    yes: 'Yes',
    no: 'No',
    required: 'Please complete the required fields marked in red.',
    signature: 'This space is signed by hand on the printed PDF.',
    templateBadge: 'Template v{v}',
    section: 'Section {n}',
    selectOne: 'Select…',
    annexNote: 'If the answer does not fit in the template, the PDF adds it in an annex.',
    upgraded: 'This form was updated (v{from} → v{to}). Your data was kept; please complete the fields marked NEW.',
    newBadge: 'NEW',
  },
};

const fmt = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
const hasValue = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');

/** Agrupa secciones muy largas para que cada paso sea manejable. */
function buildSteps(schema) {
  const raw = Array.isArray(schema?.sections) ? schema.sections : [];
  // Secciones con muy pocos campos se unen a la siguiente (su título queda como encabezado).
  const sections = [];
  let carry = null;
  raw.forEach((s, i) => {
    const items = Array.isArray(s.items) ? s.items : [];
    let merged = { title: s.title || '', items };
    if (carry) {
      merged = {
        title: merged.title || carry.title,
        items: [...(carry.title ? [{ type: 'guide', text: carry.title, heading: true }] : []), ...carry.items, ...items],
      };
      carry = null;
    }
    const nFields = merged.items.filter((it) => it.type === 'field').length;
    if (nFields < 3 && i < raw.length - 1) {
      carry = merged;
      return;
    }
    sections.push(merged);
  });
  if (carry) sections.push(carry);
  const steps = [];
  sections.forEach((s, i) => {
    const items = Array.isArray(s.items) ? s.items : [];
    const fieldCount = items.filter((it) => it.type === 'field').length;
    if (fieldCount <= 14) {
      steps.push({ title: s.title || '', items, n: i + 1 });
      return;
    }
    let chunk = [];
    let count = 0;
    let part = 1;
    items.forEach((it) => {
      chunk.push(it);
      if (it.type === 'field') count += 1;
      if (count >= 12) {
        steps.push({ title: `${s.title || ''}${s.title ? ' ' : ''}(${part})`, items: chunk, n: i + 1 });
        chunk = [];
        count = 0;
        part += 1;
      }
    });
    if (chunk.length) steps.push({ title: `${s.title || ''}${s.title ? ' ' : ''}(${part})`, items: chunk, n: i + 1 });
  });
  if (!steps.length) steps.push({ title: '', items: [], n: 1 });
  return steps;
}

export function isFieldShown(field, data) {
  const cond = field?.requiredIf;
  if (!cond || !cond.key) return true;
  const v = data[cond.key];
  return Array.isArray(v) ? v.includes(cond.value) : v === cond.value;
}

export function isFieldRequired(field, data) {
  if (!field || field.kind === 'signature' || field.kind === 'checkbox') return false;
  if (field.requiredIf) return isFieldShown(field, data);
  return Boolean(field.required);
}

export function missingTemplateFields(schema, data, keys = null) {
  const fields = schema?.fields || {};
  const list = keys || Object.keys(fields);
  return list.filter((k) => fields[k] && isFieldRequired(fields[k], data) && !hasValue(data[k]));
}

const TemplateVersionForm = ({ versionInfo, initialData, onSave, saving, readOnly = false, startStep, title, upgradedFrom = null }) => {
  const { lang } = useLang();
  const tx = TX[lang === 'en' ? 'en' : 'es'];
  const schema = versionInfo?.schema || {};
  const fields = schema.fields || {};
  const steps = useMemo(() => buildSteps(schema), [schema]);
  const total = steps.length;
  const [step, setStep] = useState(() => (startStep >= 1 && startStep <= total ? startStep : 1));
  const [data, setData] = useState(() => ({ ...(initialData || {}) }));
  const [missing, setMissing] = useState([]);
  const newKeys = useMemo(
    () => new Set(upgradedFrom && Array.isArray(schema.changes?.added) ? schema.changes.added : []),
    [upgradedFrom, schema]
  );

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) setData((prev) => ({ ...prev, ...initialData }));
  }, [initialData]);

  const versionRef = {
    id: versionInfo?.id,
    version: versionInfo?.version,
    formType: versionInfo?.formType,
  };

  const setValue = (key, value) => {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      // Si la condición deja de cumplirse, se limpia el detalle asociado.
      Object.values(fields).forEach((f) => {
        if (f.requiredIf && f.requiredIf.key === key && !isFieldShown(f, next)) next[f.key] = '';
      });
      return next;
    });
    setMissing((m) => m.filter((k) => k !== key));
  };

  const toggle = (key, value) => {
    const list = Array.isArray(data[key]) ? data[key] : [];
    setValue(key, list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const stepKeys = (s) => steps[s - 1].items.filter((it) => it.type === 'field').map((it) => it.key);

  const payload = (finished) =>
    withProgress({ ...data, __templateVersion: versionRef }, step, total, finished);

  const goNext = () => {
    if (!readOnly) {
      const miss = missingTemplateFields(schema, data, stepKeys(step));
      if (miss.length) {
        setMissing(miss);
        window.alert(tx.required);
        return;
      }
    }
    setMissing([]);
    setStep((s) => Math.min(s + 1, total));
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const finish = () => {
    const miss = missingTemplateFields(schema, data);
    if (miss.length) {
      setMissing(miss);
      const first = steps.findIndex((s) => s.items.some((it) => it.type === 'field' && miss.includes(it.key)));
      if (first >= 0) setStep(first + 1);
      window.alert(tx.required);
      return;
    }
    onSave(payload(true), true);
  };

  const errStyle = (key) => (missing.includes(key) ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #fecaca' } : undefined);

  const Label = ({ f }) => (
    <label>
      {f.label}
      {isFieldRequired(f, data) ? <span style={{ color: '#ef4444' }}> *</span> : null}
      {newKeys.has(f.key) ? <span className="tv-new">{tx.newBadge}</span> : null}
    </label>
  );

  const renderField = (f) => {
    if (!isFieldShown(f, data)) return null;
    const key = f.key;
    const full = ['textarea', 'yesno', 'multi', 'choice', 'checkbox', 'signature'].includes(f.kind);
    const wrap = (children) => (
      <div className="expert-group" key={key} style={full ? { gridColumn: '1 / -1' } : undefined} data-field={key}>
        {children}
      </div>
    );
    switch (f.kind) {
      case 'textarea':
        return wrap(
          <>
            <Label f={f} />
            {f.hint ? <span className="tv-guide">{f.hint}</span> : null}
            <textarea className="expert-input" rows={3} style={{ ...errStyle(key), resize: 'vertical' }}
              value={data[key] || ''} onChange={(e) => setValue(key, e.target.value)} />
            {f.annex ? <span className="tv-guide">{tx.annexNote}</span> : null}
          </>
        );
      case 'date':
        return wrap(
          <>
            <Label f={f} />
            <input type="date" className="expert-input" style={errStyle(key)} value={data[key] || ''}
              onChange={(e) => setValue(key, e.target.value)} />
          </>
        );
      case 'yesno':
        return wrap(
          <>
            <Label f={f} />
            <div className={`nx-choices nx-inline${missing.includes(key) ? ' nx-missing' : ''}`} style={{ marginTop: 4 }}>
              {(f.options || []).map((o) => (
                <label key={o.value} className="nx-choice">
                  <input type="radio" name={`tv-${key}`} checked={data[key] === o.value}
                    onChange={() => setValue(key, o.value)} />
                  {o.value === 'yes' ? `${tx.yes}` : o.value === 'no' ? tx.no : o.label}
                </label>
              ))}
            </div>
          </>
        );
      case 'choice':
        return wrap(
          <>
            <Label f={f} />
            <div className={`nx-choices${missing.includes(key) ? ' nx-missing' : ''}`} style={{ marginTop: 4 }}>
              {(f.options || []).map((o) => (
                <label key={o.value} className="nx-choice">
                  <input type="radio" name={`tv-${key}`} checked={data[key] === o.value}
                    onChange={() => setValue(key, o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          </>
        );
      case 'multi':
        return wrap(
          <>
            <Label f={f} />
            <div className={`nx-choices${missing.includes(key) ? ' nx-missing' : ''}`} style={{ marginTop: 4 }}>
              {(f.options || []).map((o) => (
                <label key={o.value} className="nx-choice">
                  <input type="checkbox" checked={(Array.isArray(data[key]) ? data[key] : []).includes(o.value)}
                    onChange={() => toggle(key, o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          </>
        );
      case 'checkbox':
        return wrap(
          <label className="nx-choice" style={{ alignSelf: 'flex-start' }}>
            <input type="checkbox" checked={data[key] === true} onChange={(e) => setValue(key, e.target.checked)} />
            {f.label}
          </label>
        );
      case 'select':
        return wrap(
          <>
            <Label f={f} />
            <select className="expert-input" style={errStyle(key)} value={data[key] || ''}
              onChange={(e) => setValue(key, e.target.value)}>
              <option value="">{tx.selectOne}</option>
              {(f.choices || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        );
      case 'signature':
        return wrap(
          <div className="tv-signature">
            <PenLine size={14} />
            <div>
              <strong>{f.label}</strong>
              <span>{tx.signature}</span>
            </div>
          </div>
        );
      default:
        return wrap(
          <>
            <Label f={f} />
            <input type="text" className="expert-input" style={errStyle(key)} value={data[key] || ''}
              onChange={(e) => setValue(key, e.target.value)} />
          </>
        );
    }
  };

  const current = steps[step - 1];

  // Agrupa guías y campos consecutivos para que los campos se acomoden en la grilla
  const blocks = [];
  current.items.forEach((it, idx) => {
    if (it.type === 'guide') {
      blocks.push(
        <div key={`g${idx}`} className={it.heading ? 'tv-heading' : 'tv-guide-block'} style={{ gridColumn: '1 / -1' }}>
          {it.text}
        </div>
      );
    } else if (fields[it.key]) {
      blocks.push(renderField(fields[it.key]));
    }
  });

  return (
    <div className="nx-form">
      <div className="nx-header">
        <div>
          <h1 className="nx-title">{title}</h1>
          <p className="nx-subtitle">
            {fmt(tx.templateBadge, { v: versionInfo?.version ?? '' })}
          </p>
        </div>
        {!readOnly && (
          <button type="button" onClick={() => onSave(payload(false))} disabled={saving} className="expert-btn-save">
            <Save size={18} /> {saving ? tx.saving : tx.saveDraft}
          </button>
        )}
      </div>

      <div className="standard-step-header">
        <span className="standard-step-title">{current.title || fmt(tx.section, { n: step })}</span>
        <span className="standard-step-badge">{fmt(tx.step, { step, total })}</span>
      </div>
      <div className="standard-progress-stepper">
        {steps.map((_, i) => (
          <div key={i} className={`standard-progress-bar ${step >= i + 1 ? 'active' : ''}`} />
        ))}
      </div>

      <div className="nx-panel">
        {upgradedFrom ? (
          <div className="tv-upgraded">{fmt(tx.upgraded, { from: upgradedFrom, to: versionInfo?.version ?? '' })}</div>
        ) : null}
        <ReadOnlyFieldset readOnly={readOnly}>
          <div className="tv-grid">{blocks}</div>
        </ReadOnlyFieldset>

        <div className="nx-footer">
          <button type="button" onClick={() => { setMissing([]); setStep((s) => Math.max(s - 1, 1)); }}
            disabled={step === 1} className="expert-btn-nav" style={{ opacity: step === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={18} /> {tx.back}
          </button>
          {step < total ? (
            <button type="button" onClick={goNext} className="expert-btn-primary">
              {tx.next} <ChevronRight size={18} />
            </button>
          ) : readOnly ? <span /> : (
            <button type="button" onClick={finish} disabled={saving} className="expert-btn-finish">
              <CheckCircle2 size={18} /> {saving ? tx.saving : tx.finish}
            </button>
          )}
        </div>
      </div>

      <style>{kycFormSharedStyles(KYC_PRIMARY) + `
        .tv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px 16px; }
        .tv-guide-block { font-size: 12px; color: #334155; line-height: 1.5; background: #f8fafc; border-left: 3px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; white-space: pre-wrap; }
        .tv-heading { font-size: 12px; font-weight: 800; color: #0f172a; letter-spacing: 0.3px; margin-top: 4px; }
        .tv-guide { display: block; font-size: 11px; color: #64748b; line-height: 1.4; }
        .tv-signature { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border: 1px dashed #94a3b8; border-radius: 6px; color: #475569; font-size: 12px; }
        .tv-signature strong { display: block; font-size: 11px; color: #0f172a; }
        .tv-new { margin-left: 6px; font-size: 9px; font-weight: 800; color: #1d4ed8; background: #dbeafe; padding: 1px 5px; border-radius: 3px; }
        .tv-upgraded { margin-bottom: 14px; font-size: 12px; color: #1e3a8a; background: #eff6ff; border: 1px solid #bfdbfe; padding: 8px 12px; border-radius: 6px; }
      `}</style>
    </div>
  );
};

export default TemplateVersionForm;
