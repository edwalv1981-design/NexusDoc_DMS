import React from 'react';

/**
 * Campos de un integrante tipo Empresa / Entidad (Dignatarios y Beneficiarios de Fundación).
 * Mismos datos que en Incorporación. `nameKey` es el campo que el resto del sistema usa como
 * nombre (fullName en dignatarios, shareholder en beneficiarios): se llena junto a companyName.
 */
const FundacionEntityFields = ({ item, onChange, lang, nameKey = 'fullName' }) => {
  const en = lang === 'en';
  const v = item || {};
  return (
    <>
      <div className="expert-field full-width">
        <label>{en ? 'Company Name / Business Name' : 'Nombre de la Empresa / Razón Social'}</label>
        <input className="expert-input" value={v.companyName || v[nameKey] || ''}
          onChange={(e) => { onChange('companyName', e.target.value); onChange(nameKey, e.target.value); }}
          placeholder="EJ: CASITA S.A." />
      </div>
      <div className="expert-field">
        <label>{en ? 'Country of Registration' : 'País de Registro / Constitución'}</label>
        <input className="expert-input" value={v.companyCountry || ''} onChange={(e) => onChange('companyCountry', e.target.value)} placeholder="EJ: Panamá" />
      </div>
      <div className="expert-field">
        <label>{en ? 'Registration Number' : 'Número de Registro'}</label>
        <input className="expert-input" value={v.registrationNumber || ''} onChange={(e) => onChange('registrationNumber', e.target.value)} placeholder="EJ: 15548923" />
      </div>
      <div className="expert-field">
        <label>{en ? 'RUC / Tax ID' : 'Número de RUC / Tax Number'}</label>
        <input className="expert-input" value={v.companyTaxId || ''} onChange={(e) => onChange('companyTaxId', e.target.value)} placeholder="EJ: 15548923-2-2021" />
      </div>
      <div className="expert-field full-width">
        <label>{en ? 'Registered Address' : 'Dirección Registrada de la Empresa'}</label>
        <input className="expert-input" value={v.address || ''} onChange={(e) => onChange('address', e.target.value)} placeholder="EJ: Calle 50, Edificio Global, Piso 12" />
      </div>
      <div className="expert-field full-width" style={{ marginTop: 6, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase' }}>
          👤 {en ? 'Legal Representative Information' : 'Información del Representante Legal de la Empresa'}
        </span>
      </div>
      <div className="expert-field">
        <label>{en ? 'Legal Representative Full Name' : 'Nombre Completo del Representante Legal'}</label>
        <input className="expert-input" value={v.legalRepName || ''} onChange={(e) => onChange('legalRepName', e.target.value)} placeholder="EJ: Juan Pérez" />
      </div>
      <div className="expert-field">
        <label>{en ? 'Legal Representative Passport / ID' : 'Pasaporte / Cédula del Representante Legal'}</label>
        <input className="expert-input" value={v.legalRepPassport || ''} onChange={(e) => onChange('legalRepPassport', e.target.value)} placeholder="EJ: E-8-12345" />
      </div>
    </>
  );
};

export default FundacionEntityFields;
