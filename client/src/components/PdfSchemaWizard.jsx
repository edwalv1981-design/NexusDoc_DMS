import React, { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n';
import API_BASE_URL from '../config';

const PRIMARY = '#0078d4';
const BORDER = '#e2e8f0';
const RADIUS = '8px';
const RADIUS_LG = '16px';

function fieldVisible(field, data) {
  if (!field.showIf) return true;
  return data?.[field.showIf.field] === field.showIf.value;
}

const PdfSchemaWizard = ({ formType, initialData, onSave, saving, onValidationError }) => {
  const t = useT();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  const prefix = schema?.i18nPrefix || 'kyci';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE_URL}/api/forms/schema/${encodeURIComponent(formType)}`,
          { headers: { 'x-auth-token': token } }
        );
        if (!res.ok) throw new Error('schema');
        const payload = await res.json();
        if (cancelled) return;
        setSchema(payload.schema);
        const base = payload.emptyState || {};
        setFormData({ ...base, ...(initialData || {}) });
        setStep(1);
      } catch {
        if (!cancelled) setSchema(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formType]);

  useEffect(() => {
    if (!initialData || !Object.keys(initialData).length) return;
    setFormData((prev) => ({ ...prev, ...initialData }));
  }, [initialData]);

  const totalSteps = schema?.steps?.length || 0;

  const labelFor = (key) => {
    const path = `${prefix}.fields.${key}`;
    const translated = t(path);
    return translated === path ? key : translated;
  };

  const stepTitle = useMemo(() => {
    if (!schema) return '';
    const stepDef = schema.steps[step - 1];
    if (!stepDef?.titleKey) return '';
    const path = `${prefix}.${stepDef.titleKey}`;
    const translated = t(path);
    return translated === path ? stepDef.titleKey : translated;
  }, [schema, step, prefix, t]);

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCheckbox = (key, optionKey) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(optionKey)
        ? current.filter((x) => x !== optionKey)
        : [...current, optionKey];
      return { ...prev, [key]: next };
    });
  };

  const handleContinue = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/forms/schema/${encodeURIComponent(formType)}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ step, data: formData }),
        }
      );
      if (res.ok) {
        const { ok } = await res.json();
        if (!ok) {
          onValidationError?.(t('toast.completeStep1'));
          return;
        }
      }
    } catch {
      /* avanzar si el servidor no responde */
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/forms/schema/${encodeURIComponent(formType)}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ all: true, data: formData }),
        }
      );
      if (res.ok) {
        const { ok } = await res.json();
        if (!ok) {
          onValidationError?.(t('toast.completeStep3'));
          return;
        }
      }
    } catch {
      /* guardar si validación no disponible */
    }
    onSave(formData);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        {t('dashboard.syncing')}
      </div>
    );
  }

  if (!schema) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#b91c1c' }}>
        {t('toast.saveError')}
      </div>
    );
  }

  const currentStep = schema.steps[step - 1];

  const renderField = (field) => {
    if (!fieldVisible(field, formData)) return null;
    const label = labelFor(field.key);
    const colStyle = field.col === 'full' ? { gridColumn: '1 / -1' } : undefined;

    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="field-group" style={colStyle}>
          <label>{label}</label>
          <textarea
            className="input-expert"
            rows={3}
            value={formData[field.key] ?? ''}
            onChange={(e) => updateField(field.key, e.target.value)}
            required={field.required}
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.key} className="field-group" style={colStyle}>
          <label>{label}</label>
          <select
            className="input-expert"
            value={formData[field.key] ?? ''}
            onChange={(e) => updateField(field.key, e.target.value)}
            required={field.required}
          >
            <option value="">—</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'checkboxGroup') {
      return (
        <div key={field.key} className="field-group" style={{ gridColumn: '1 / -1' }}>
          <label>{label}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(field.options || []).map((opt) => {
              const optLabel = t(`${prefix}.sources.${opt.labelKey}`);
              return (
                <label
                  key={opt.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 12,
                    padding: 10,
                    border: `1px solid ${BORDER}`,
                    borderRadius: RADIUS,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={(formData[field.key] || []).includes(opt.key)}
                    onChange={() => toggleCheckbox(field.key, opt.key)}
                  />
                  {optLabel}
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="field-group" style={colStyle}>
        <label>{label}</label>
        <input
          type={field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
          className="input-expert"
          value={formData[field.key] ?? ''}
          onChange={(e) => updateField(field.key, e.target.value)}
          required={field.required}
        />
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'white',
        padding: 35,
        border: `1px solid ${BORDER}`,
        borderRadius: RADIUS_LG,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: PRIMARY, letterSpacing: 1 }}>{t('dashboard.recordState')}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{t('dashboard.stepOf', { step, total: totalSteps })}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {schema.steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, background: step >= i + 1 ? PRIMARY : '#f1f5f9', borderRadius: 10 }} />
        ))}
      </div>
      {stepTitle ? <h3 style={{ marginBottom: 18, fontSize: 14, color: '#334155' }}>{stepTitle}</h3> : null}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>{currentStep.fields.map(renderField)}</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            style={{
              flex: 1,
              padding: 12,
              background: '#f8fafc',
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {t('common.back')}
          </button>
        )}
        {step < totalSteps ? (
          <button
            type="button"
            onClick={handleContinue}
            style={{
              flex: 1,
              padding: 12,
              background: PRIMARY,
              color: 'white',
              border: 'none',
              borderRadius: RADIUS,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {t('common.continue')}
          </button>
        ) : (
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 1,
              padding: 12,
              background: PRIMARY,
              color: 'white',
              border: 'none',
              borderRadius: RADIUS,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? t('common.saving') : t('common.finishSave')}
          </button>
        )}
      </div>
    </form>
  );
};

export default PdfSchemaWizard;
