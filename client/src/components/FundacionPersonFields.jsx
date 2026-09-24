import React, { useState } from 'react';
import { validateField } from '../utils/fieldValidators';
import PersonSelector from './common/PersonSelector';

export const FUNDACION_MARITAL_OPTIONS = [
  { value: 'Soltero', en: 'Single', es: 'Soltero(a)' },
  { value: 'Casado', en: 'Married', es: 'Casado(a)' },
  { value: 'Divorciado', en: 'Divorced', es: 'Divorciado(a)' },
  { value: 'Viudo', en: 'Widowed', es: 'Viudo(a)' },
];

const FundacionPersonFields = ({ person, onChange, lang, t, suggestions, showDropdown, onSearch, onSelect, dropdownRef, registeredPeople, onSelectRegisteredPerson }) => {
  const L = (key) => (t?.(`fundacion.person.${key}`) ?? key);
  const set = (field, value) => onChange(field, value);
  const selectPlaceholder =
    t?.('fundacion.poa.selectPlaceholder') || (lang === 'en' ? 'Select...' : 'Seleccione...');

  const [fieldErrors, setFieldErrors] = useState({});

  const handleBlur = (fieldName) => {
    const error = validateField(fieldName, person[fieldName]);
    setFieldErrors(prev => {
      const next = { ...prev };
      if (error) next[fieldName] = error;
      else delete next[fieldName];
      return next;
    });
  };

  const handleFieldChange = (field, value) => {
    set(field, value);
    if (fieldErrors[field]) {
      const error = validateField(field, value);
      if (!error) setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
    if (onSearch && (field === 'fullName' || field === 'passport')) {
      onSearch(value);
    }
  };

  const errStyle = (field) => fieldErrors[field] ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #fecaca' } : {};
  const ErrMsg = ({ field }) => fieldErrors[field] ? <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors[field]}</span> : null;

  const renderDropdown = () => {
    if (!showDropdown || !suggestions || suggestions.length === 0) return null;
    return (
      <div className="fund-autocomplete-dropdown">
        {suggestions.map((p, j) => (
          <div key={j} className="fund-autocomplete-item" onMouseDown={(e) => { e.preventDefault(); onSelect(p); }}>
            <span className="fund-ac-name">{p.fullName || ''}</span>
            <span className="fund-ac-detail">{p.passport || ''}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="expert-grid person-fields-grid" ref={dropdownRef}>
      {/* Selector Tipo Integrante: Empresa / Persona Jurídica */}
      <div className="expert-field full-width" style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
            {lang === 'en' ? 'Type of Entity:' : 'Tipo de Integrante:'}
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#0f766e' }}>
            <input type="radio" name={`entityType-${person?._id || Math.random()}`} checked={true} readOnly />
            🏢 {lang === 'en' ? 'Company / Corporation' : 'Empresa / Persona Jurídica'}
          </label>
        </div>
      </div>

      {registeredPeople && registeredPeople.length > 0 && onSelectRegisteredPerson && (
        <div style={{ gridColumn: '1 / -1' }}>
          <PersonSelector
            people={registeredPeople}
            onSelectPerson={onSelectRegisteredPerson}
            currentName={person?.fullName || person?.name}
          />
        </div>
      )}

      {person?.entityType === 'company' ? (
        <>
          <div className="expert-field full-width">
            <label>{lang === 'en' ? 'Company Name / Business Name' : 'Nombre de la Empresa / Razón Social'}</label>
            <input className="expert-input" value={person.companyName || person.fullName || ''} onChange={(e) => { handleFieldChange('companyName', e.target.value); handleFieldChange('fullName', e.target.value); }} placeholder="EJ: CASITA S.A." />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Country of Registration' : 'País de Registro / Constitución'}</label>
            <input className="expert-input" value={person.companyCountry || person.country || ''} onChange={(e) => { set('companyCountry', e.target.value); set('country', e.target.value); }} placeholder="EJ: Panamá" />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Registration Number' : 'Número de Registro'}</label>
            <input className="expert-input" value={person.registrationNumber || ''} onChange={(e) => set('registrationNumber', e.target.value)} placeholder="EJ: 15548923" />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'RUC / Tax ID' : 'Número de RUC / Tax Number'}</label>
            <input className="expert-input" value={person.companyTaxId || person.passport || ''} onChange={(e) => { handleFieldChange('companyTaxId', e.target.value); handleFieldChange('passport', e.target.value); }} placeholder="EJ: 15548923-2-2021" />
          </div>
          <div className="expert-field full-width">
            <label>{lang === 'en' ? 'Registered Address' : 'Dirección Registrada de la Empresa'}</label>
            <input className="expert-input" value={person.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="EJ: Calle 50, Edificio Global, Piso 12" />
          </div>
          <div className="expert-field full-width" style={{ marginTop: 6, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase' }}>
              👤 {lang === 'en' ? 'Legal Representative Information' : 'Información del Representante Legal de la Empresa'}
            </span>
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Legal Representative Full Name' : 'Nombre Completo del Representante Legal'}</label>
            <input className="expert-input" value={person.legalRepName || ''} onChange={(e) => set('legalRepName', e.target.value)} placeholder="EJ: Juan Pérez" />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Legal Representative Passport / ID' : 'Pasaporte / Cédula del Representante Legal'}</label>
            <input className="expert-input" value={person.legalRepPassport || ''} onChange={(e) => set('legalRepPassport', e.target.value)} placeholder="EJ: E-8-12345" />
          </div>
        </>
      ) : (
        <>
          <div className="expert-field full-width" style={{ position: 'relative' }}>
            <label>{L('fullName')}</label>
            <input 
              className="expert-input" 
              style={errStyle('fullName')} 
              value={person.fullName || ''} 
              onChange={(e) => handleFieldChange('fullName', e.target.value)} 
              onFocus={(e) => { if (e.target.value && e.target.value.length >= 2 && onSearch) onSearch(e.target.value); }}
              onBlur={() => handleBlur('fullName')} 
              autoComplete="off" 
              placeholder={lang === 'en' ? 'Full name as on Passport/ID' : 'Nombre completo como aparece en pasaporte/cédula'} 
            />
            <ErrMsg field="fullName" />
            {renderDropdown()}
          </div>
          <div className="expert-field">
            <label>{L('birthDate')}</label>
            <input type="date" className="expert-input" style={errStyle('birthDate')} value={person.birthDate || ''} onChange={(e) => { set('birthDate', e.target.value); if (fieldErrors.birthDate) { const er = validateField('birthDate', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.birthDate; return n; }); } }} onBlur={() => handleBlur('birthDate')} />
            <ErrMsg field="birthDate" />
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
            <input className="expert-input" style={errStyle('nationality')} value={person.nationality || ''} onChange={(e) => { set('nationality', e.target.value); if (fieldErrors.nationality) { const er = validateField('nationality', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.nationality; return n; }); } }} onBlur={() => handleBlur('nationality')} />
            <ErrMsg field="nationality" />
          </div>
          <div className="expert-field" style={{ position: 'relative' }}>
            <label>{L('passport')}</label>
            <input className="expert-input" style={errStyle('passport')} value={person.passport || ''} onChange={(e) => handleFieldChange('passport', e.target.value)} onBlur={() => handleBlur('passport')} autoComplete="off" />
            <ErrMsg field="passport" />
            {!showDropdown && null}
          </div>
          <div className="expert-field">
            <label>{L('idCard')}</label>
            <input className="expert-input" style={errStyle('idCard')} value={person.idCard || ''} onChange={(e) => { set('idCard', e.target.value); if (fieldErrors.idCard) { const er = validateField('idCard', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.idCard; return n; }); } }} onBlur={() => handleBlur('idCard')} />
            <ErrMsg field="idCard" />
          </div>
          <div className="expert-field">
            <label>{L('phone')}</label>
            <input className="expert-input" style={errStyle('phone')} value={person.phone || ''} onChange={(e) => { set('phone', e.target.value); if (fieldErrors.phone) { const er = validateField('phone', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); } }} onBlur={() => handleBlur('phone')} />
            <ErrMsg field="phone" />
          </div>
          <div className="expert-field">
            <label>{L('email')}</label>
            <input type="email" className="expert-input" style={errStyle('email')} value={person.email || ''} onChange={(e) => { set('email', e.target.value); if (fieldErrors.email) { const er = validateField('email', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.email; return n; }); } }} onBlur={() => handleBlur('email')} />
            <ErrMsg field="email" />
          </div>
          <div className="expert-field full-width">
            <label>{L('address')}</label>
            <input className="expert-input" style={errStyle('address')} value={person.address || ''} onChange={(e) => { set('address', e.target.value); if (fieldErrors.address) { const er = validateField('address', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.address; return n; }); } }} onBlur={() => handleBlur('address')} />
            <ErrMsg field="address" />
          </div>
          <div className="expert-field">
            <label>{L('city')}</label>
            <input className="expert-input" style={errStyle('city')} value={person.city || ''} onChange={(e) => { set('city', e.target.value); if (fieldErrors.city) { const er = validateField('city', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.city; return n; }); } }} onBlur={() => handleBlur('city')} />
            <ErrMsg field="city" />
          </div>
          <div className="expert-field">
            <label>{L('country')}</label>
            <input className="expert-input" style={errStyle('country')} value={person.country || ''} onChange={(e) => { set('country', e.target.value); if (fieldErrors.country) { const er = validateField('country', e.target.value); if (!er) setFieldErrors(prev => { const n = { ...prev }; delete n.country; return n; }); } }} onBlur={() => handleBlur('country')} />
            <ErrMsg field="country" />
          </div>
        </>
      )}
    </div>
  );
};

export default FundacionPersonFields;
