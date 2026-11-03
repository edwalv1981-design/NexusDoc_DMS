import React from 'react';

const ACCENT = '#0f766e';

/**
 * Selector "Tipo de integrante": Persona natural / Empresa (persona jurídica).
 * Usado en Incorporación (directores, dignatarios, accionistas) y Fundación
 * (fundadores, protectores, consejo/directores).
 *
 * Cambia entityType del integrante ('individual' | 'company'). Los campos de
 * ambos tipos se conservan en los datos, así que cambiar de opción no borra
 * lo ya escrito.
 */
const EntityTypeSelector = ({ value, onChange, lang, style }) => {
    const isCompany = value === 'company';
    const options = [
        { key: 'individual', icon: '👤', label: lang === 'en' ? 'NATURAL PERSON' : 'PERSONA NATURAL' },
        { key: 'company', icon: '🏢', label: lang === 'en' ? 'COMPANY / LEGAL ENTITY' : 'EMPRESA / PERSONA JURÍDICA' },
    ];
    return (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14, background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', ...style }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
                {lang === 'en' ? 'Type of Entity:' : 'Tipo de Integrante:'}
            </span>
            <div role="radiogroup" aria-label={lang === 'en' ? 'Type of Entity' : 'Tipo de Integrante'} style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                {options.map(opt => {
                    const selected = opt.key === 'company' ? isCompany : !isCompany;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => { if (!selected) onChange(opt.key); }}
                            style={{
                                fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', cursor: selected ? 'default' : 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                color: selected ? 'white' : '#475569',
                                background: selected ? ACCENT : 'white',
                                border: `1px solid ${selected ? ACCENT : '#cbd5e1'}`,
                            }}
                        >
                            <span aria-hidden="true">{opt.icon}</span>{opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default EntityTypeSelector;
