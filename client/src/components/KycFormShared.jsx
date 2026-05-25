import React from 'react';
import { Info } from 'lucide-react';

export const KYC_PRIMARY = '#0078d4';

export function KycHintBox({ children }) {
  return (
    <div className="expert-hint-box" style={{ marginBottom: 10 }}>
      <Info size={16} color="#0369a1" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 12, lineHeight: 1.4, color: '#334155' }}>{children}</div>
    </div>
  );
}

export function KycPepQuestion({
  label,
  hint,
  pep,
  pepDetails,
  onPepChange,
  onDetailsChange,
  detailsLabel,
  pepNoLabel,
  pepYesLabel,
}) {
  return (
    <>
      <div className="poa-question-box">
        <div className="poa-question-text">
          <strong>{label}</strong>
          {hint ? <p className="expert-hint" style={{ marginTop: 4, marginBottom: 0 }}>{hint}</p> : null}
        </div>
        <div className="poa-check-row">
          <label className="poa-check-label">
            <input
              type="radio"
              name="pep"
              checked={pep === 'No'}
              onChange={() => onPepChange('No')}
              className="poa-radio"
            />
            <span>{pepNoLabel}</span>
          </label>
          <label className="poa-check-label">
            <input
              type="radio"
              name="pep"
              checked={pep === 'Sí'}
              onChange={() => onPepChange('Sí')}
              className="poa-radio"
            />
            <span>{pepYesLabel}</span>
          </label>
        </div>
      </div>
      {pep === 'Sí' && (
        <div className="expert-group">
          <label>{detailsLabel}</label>
          <textarea
            className="expert-input"
            rows={3}
            value={pepDetails}
            onChange={(e) => onDetailsChange(e.target.value)}
            required
          />
        </div>
      )}
    </>
  );
}

export function KycFundsSourceGroup({
  label,
  instructions,
  options,
  fundsSource,
  onToggle,
  getOptionLabel,
  primary = KYC_PRIMARY,
}) {
  return (
    <div
      style={{
        background: '#f8fafc',
        padding: 14,
        borderRadius: 6,
        border: '1px solid #e2e8f0',
        marginBottom: 6,
      }}
    >
      <label
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#475569',
          letterSpacing: '0.3px',
          display: 'block',
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {instructions ? (
        <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>{instructions}</p>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {options.map((opt) => {
          const selected = fundsSource.includes(opt.key);
          return (
            <label
              key={opt.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '5px 10px',
                borderRadius: 4,
                border: selected ? `1px solid ${primary}` : '1px solid transparent',
                background: selected ? `${primary}06` : 'transparent',
                transition: '0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(opt.key)}
                style={{ width: 15, height: 15, accentColor: primary }}
              />
              <span style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: '#1e293b' }}>
                {getOptionLabel(opt)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export const kycFormSharedStyles = (primary = KYC_PRIMARY) => `
  .expert-input { width: 100%; padding: 7px 10px; border: 1.5px solid #e2e8f0; border-radius: 4px; outline: none; font-size: 13px; font-weight: 500; }
  .expert-input:focus { border-color: ${primary}; box-shadow: 0 0 0 2px ${primary}12; }
  .expert-group { display: flex; flex-direction: column; gap: 3px; }
  .expert-group label { font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 0.3px; }
  .expert-hint-box { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; display: flex; align-items: flex-start; gap: 8px; line-height: 1.4; }
  .expert-hint { font-size: 11px; color: #64748b; font-style: italic; font-weight: 500; }
  .poa-question-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px 12px; }
  .poa-question-text { font-size: 12px; color: #0c4a6e; margin-bottom: 8px; }
  .poa-check-row { display: flex; gap: 16px; flex-wrap: wrap; }
  .poa-check-label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; }
  .poa-radio { width: 15px; height: 15px; accent-color: #0e7490; cursor: pointer; }
  .expert-btn-primary { padding: 8px 18px; background: ${primary}; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .expert-btn-nav { padding: 8px 18px; background: #f1f5f9; color: #475569; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .expert-btn-save { padding: 7px 16px; background: white; color: ${primary}; border: 1.5px solid ${primary}; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px; }
  .expert-btn-finish { padding: 8px 18px; background: #16a34a; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px; }
`;
