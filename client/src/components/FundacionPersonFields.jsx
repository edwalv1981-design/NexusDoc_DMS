import React from 'react';

export const FUNDACION_MARITAL_OPTIONS = [
  { value: 'Soltero', en: 'Single', es: 'Soltero(a)' },
  { value: 'Casado', en: 'Married', es: 'Casado(a)' },
  { value: 'Divorciado', en: 'Divorced', es: 'Divorciado(a)' },
  { value: 'Viudo', en: 'Widowed', es: 'Viudo(a)' },
];

const FundacionPersonFields = ({ person, onChange, lang, t }) => {
  const L = (key) => (t?.(`fundacion.person.${key}`) ?? key);
  const set = (field, value) => onChange(field, value);
  const selectPlaceholder =
    t?.('fundacion.poa.selectPlaceholder') || (lang === 'en' ? 'Select...' : 'Seleccione...');

  return (
    <div className="expert-grid person-fields-grid">
      <div className="expert-field">
        <label>{L('firstName')}</label>
        <input className="expert-input" value={person.firstName || ''} onChange={(e) => set('firstName', e.target.value)} autoComplete="off" />
      </div>
      <div className="expert-field">
        <label>{L('secondName')}</label>
        <input className="expert-input" value={person.secondName || ''} onChange={(e) => set('secondName', e.target.value)} autoComplete="off" />
      </div>
      <div className="expert-field">
        <label>{L('lastName')}</label>
        <input className="expert-input" value={person.lastName || ''} onChange={(e) => set('lastName', e.target.value)} autoComplete="off" />
      </div>
      <div className="expert-field">
        <label>{L('birthDate')}</label>
        <input type="date" className="expert-input" value={person.birthDate || ''} onChange={(e) => set('birthDate', e.target.value)} />
      </div>
      <div className="expert-field">
        <label>{L('maritalStatus')}</label>
        <select className="expert-input" value={person.maritalStatus || ''} onChange={(e) => set('maritalStatus', e.target.value)}>
          <option value="">{selectPlaceholder}</option>
          {FUNDACION_MARITAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{lang === 'en' ? o.en : o.es}</option>
          ))}
        </select>
      </div>
      <div className="expert-field">
        <label>{L('nationality')}</label>
        <input className="expert-input" value={person.nationality || ''} onChange={(e) => set('nationality', e.target.value)} />
      </div>
      <div className="expert-field">
        <label>{L('passport')}</label>
        <input className="expert-input" value={person.passport || ''} onChange={(e) => set('passport', e.target.value)} />
      </div>
      <div className="expert-field">
        <label>{L('idCard')}</label>
        <input className="expert-input" value={person.idCard || ''} onChange={(e) => set('idCard', e.target.value)} />
      </div>
      <div className="expert-field">
        <label>{L('phone')}</label>
        <input className="expert-input" value={person.phone || ''} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <div className="expert-field">
        <label>{L('email')}</label>
        <input type="email" className="expert-input" value={person.email || ''} onChange={(e) => set('email', e.target.value)} />
      </div>
      <div className="expert-field full-width">
        <label>{L('address')}</label>
        <input className="expert-input" value={person.address || ''} onChange={(e) => set('address', e.target.value)} />
      </div>
      <div className="expert-field">
        <label>{L('city')}</label>
        <input className="expert-input" value={person.city || ''} onChange={(e) => set('city', e.target.value)} />
      </div>
      <div className="expert-field">
        <label>{L('country')}</label>
        <input className="expert-input" value={person.country || ''} onChange={(e) => set('country', e.target.value)} />
      </div>
    </div>
  );
};

export default FundacionPersonFields;
