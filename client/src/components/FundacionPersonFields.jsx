import React, { useId, useCallback } from 'react';
import { personNameKey } from '../utils/fundacionPersonSchema';
import {
  findMatch,
  findPersonInRegistry,
  getPersonNameSuggestions,
  snapshotPersonFields,
} from '../utils/fundacionPersonRegistry';

export const FUNDACION_MARITAL_OPTIONS = [
  { value: 'Soltero', en: 'Single', es: 'Soltero(a)' },
  { value: 'Casado', en: 'Married', es: 'Casado(a)' },
  { value: 'Divorciado', en: 'Divorced', es: 'Divorciado(a)' },
  { value: 'Viudo', en: 'Widowed', es: 'Viudo(a)' },
];

const FundacionPersonFields = ({ person, onChange, lang, t, personRegistry = [], onApplyPerson }) => {
  const L = (key) => (t?.(`fundacion.person.${key}`) ?? key);
  const set = (field, value) => onChange(field, value);
  const listId = useId();
  const suggestions = getPersonNameSuggestions(personRegistry);
  const hasSuggestions = suggestions.length > 0;

  const tryApplyFromRegistry = useCallback(
    (draftPerson) => {
      if (!onApplyPerson || !personRegistry.length) return;
      const hit = findPersonInRegistry(personRegistry, draftPerson);
      if (hit) onApplyPerson(snapshotPersonFields(hit));
    },
    [onApplyPerson, personRegistry]
  );

  const tryApplyExactName = useCallback(
    (value) => {
      if (!onApplyPerson) return;
      const hit = findMatch(personRegistry, value);
      if (hit) onApplyPerson(snapshotPersonFields(hit));
    },
    [onApplyPerson, personRegistry]
  );

  return (
    <div className="expert-grid person-fields-grid">
      <div className="expert-field">
        <label>{L('firstName')}</label>
        <input
          className="expert-input"
          value={person.firstName || ''}
          onChange={(e) => {
            const v = e.target.value;
            set('firstName', v);
            if (v.includes(' ')) tryApplyExactName(v);
          }}
          onBlur={(e) => tryApplyFromRegistry({ ...person, firstName: e.target.value })}
          list={hasSuggestions ? listId : undefined}
          autoComplete="off"
        />
      </div>
      <div className="expert-field">
        <label>{L('secondName')}</label>
        <input
          className="expert-input"
          value={person.secondName || ''}
          onChange={(e) => set('secondName', e.target.value)}
          onBlur={(e) => tryApplyFromRegistry({ ...person, secondName: e.target.value })}
          autoComplete="off"
        />
      </div>
      <div className="expert-field">
        <label>{L('lastName')}</label>
        <input
          className="expert-input"
          value={person.lastName || ''}
          onChange={(e) => {
            const v = e.target.value;
            set('lastName', v);
            if (v.includes(' ')) tryApplyExactName(v);
          }}
          onBlur={(e) => tryApplyFromRegistry({ ...person, lastName: e.target.value })}
          list={hasSuggestions ? listId : undefined}
          autoComplete="off"
        />
      </div>
      {hasSuggestions && (
        <datalist id={listId}>
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
      <div className="expert-field">
        <label>{L('birthDate')}</label>
        <input type="date" className="expert-input" value={person.birthDate || ''} onChange={(e) => set('birthDate', e.target.value)} />
      </div>
      <div className="expert-field">
        <label>{L('maritalStatus')}</label>
        <select className="expert-input" value={person.maritalStatus || ''} onChange={(e) => set('maritalStatus', e.target.value)}>
          <option value="">{lang === 'en' ? 'Select...' : 'Seleccione...'}</option>
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
