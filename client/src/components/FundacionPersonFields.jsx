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

  const isCompany = person?.entityType === 'company';

  return (
    <div className="expert-grid person-fields-grid" ref={dropdownRef}>
      {/* Entity Type Toggle Bar */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
          {lang === 'en' ? 'Type of Entity:' : 'Tipo de Integrante:'}
        </span>
        <button
          type="button"
          onClick={() => set('entityType', 'individual')}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: '11px',
            fontWeight: 700,
            border: !isCompany ? '2px solid #0f766e' : '1px solid #cbd5e1',
            background: !isCompany ? '#f0fdfa' : '#ffffff',
            color: !isCompany ? '#0f766e' : '#64748b',
            cursor: 'pointer'
          }}
        >
          👤 {lang === 'en' ? 'Individual' : 'Persona Natural'}
        </button>
        <button
          type="button"
          onClick={() => set('entityType', 'company')}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: '11px',
            fontWeight: 700,
            border: isCompany ? '2px solid #0284c7' : '1px solid #cbd5e1',
            background: isCompany ? '#f0f9ff' : '#ffffff',
            color: isCompany ? '#0284c7' : '#64748b',
            cursor: 'pointer'
          }}
        >
          🏢 {lang === 'en' ? 'Company / Legal Entity' : 'Empresa / Persona Jurídica'}
        </button>
      </div>

      {registeredPeople && registeredPeople.length > 0 && onSelectRegisteredPerson && (
        <div style={{ gridColumn: '1 / -1' }}>
          <PersonSelector
            people={registeredPeople}
            onSelectPerson={onSelectRegisteredPerson}
            currentName={person?.companyName || person?.fullName || person?.name}
          />
        </div>
      )}

      {isCompany ? (
        /* EMPRESA / PERSONA JURÍDICA FIELDS */
        <>
          <div className="expert-field full-width" style={{ position: 'relative' }}>
            <label>{lang === 'en' ? 'Company Name / Business Name' : 'Razón Social / Nombre de la Empresa'}</label>
            <input 
              className="expert-input" 
              style={errStyle('companyName')} 
              value={person.companyName || person.fullName || ''} 
              onChange={(e) => { handleFieldChange('companyName', e.target.value); set('fullName', e.target.value); }} 
              onFocus={(e) => { if (e.target.value && e.target.value.length >= 2 && onSearch) onSearch(e.target.value); }}
              onBlur={() => handleBlur('companyName')} 
              autoComplete="off" 
              placeholder={lang === 'en' ? 'e.g. CASITA S.A.' : 'Ej: CASITA S.A.'} 
            />
            <ErrMsg field="companyName" />
            {renderDropdown()}
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Country of Reg. / Incorporation' : 'País de Registro / Incorporación'}</label>
            <input className="expert-input" style={errStyle('country')} value={person.country || person.incorporationCountry || ''} onChange={(e) => { set('country', e.target.value); set('incorporationCountry', e.target.value); }} onBlur={() => handleBlur('country')} placeholder={lang === 'en' ? 'e.g. Panama' : 'Ej: Panamá'} />
            <ErrMsg field="country" />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Mercantile Registration No.' : 'No. de Registro Mercantil / Estatutos'}</label>
            <input className="expert-input" style={errStyle('registrationNumber')} value={person.registrationNumber || person.passport || ''} onChange={(e) => { set('registrationNumber', e.target.value); set('passport', e.target.value); }} onBlur={() => handleBlur('registrationNumber')} placeholder="Ej: 15548962-1-2023" />
            <ErrMsg field="registrationNumber" />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'RUC / Tax ID (TIN)' : 'RUC / No. de Identificación Fiscal'}</label>
            <input className="expert-input" style={errStyle('ruc')} value={person.ruc || person.taxId || ''} onChange={(e) => { set('ruc', e.target.value); set('taxId', e.target.value); }} onBlur={() => handleBlur('ruc')} placeholder="Ej: 15548962-2-2023 DV 45" />
            <ErrMsg field="ruc" />
          </div>
          <div className="expert-field full-width">
            <label>{lang === 'en' ? 'Registered Address' : 'Dirección Registrada / Domicilio Social'}</label>
            <input className="expert-input" style={errStyle('address')} value={person.address || ''} onChange={(e) => set('address', e.target.value)} onBlur={() => handleBlur('address')} placeholder={lang === 'en' ? 'Full registered address' : 'Dirección física u oficina registrada'} />
            <ErrMsg field="address" />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Legal Rep. Full Name' : 'Nombre Completo del Representante Legal'}</label>
            <input className="expert-input" style={errStyle('legalRepName')} value={person.legalRepName || ''} onChange={(e) => set('legalRepName', e.target.value)} onBlur={() => handleBlur('legalRepName')} placeholder={lang === 'en' ? 'Full name of Legal Representative' : 'Nombre y apellidos del rep. legal'} />
            <ErrMsg field="legalRepName" />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Legal Rep. Passport / ID' : 'Pasaporte / Cédula del Representante Legal'}</label>
            <input className="expert-input" style={errStyle('legalRepPassport')} value={person.legalRepPassport || ''} onChange={(e) => set('legalRepPassport', e.target.value)} onBlur={() => handleBlur('legalRepPassport')} placeholder="Ej: E-8-142536 / PA-985472" />
            <ErrMsg field="legalRepPassport" />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Phone' : 'Teléfono de Contacto'}</label>
            <input className="expert-input" style={errStyle('phone')} value={person.phone || ''} onChange={(e) => set('phone', e.target.value)} onBlur={() => handleBlur('phone')} />
            <ErrMsg field="phone" />
          </div>
          <div className="expert-field">
            <label>{lang === 'en' ? 'Email' : 'Correo electrónico'}</label>
            <input type="email" className="expert-input" style={errStyle('email')} value={person.email || ''} onChange={(e) => set('email', e.target.value)} onBlur={() => handleBlur('email')} placeholder="company@example.com" />
            <ErrMsg field="email" />
          </div>
        </>
      ) : (
        /* PERSONA NATURAL FIELDS */
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
