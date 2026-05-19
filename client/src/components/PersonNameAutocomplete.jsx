import React, { useId, useMemo } from 'react';
import { personNameKey } from '../utils/fundacionPersonSchema';

/**
 * Combobox: user types or picks a name from the in-form person registry.
 * On exact match, onSelect receives merged person data.
 */
const PersonNameAutocomplete = ({ registry = [], t, onSelect, disabled }) => {
  const listId = useId();
  const names = useMemo(() => registry.map((r) => r.name).filter(Boolean), [registry]);

  const tryMatch = (value) => {
    const key = personNameKey(value);
    if (!key) return;
    const hit = registry.find((r) => r.key === key);
    if (hit?.data) onSelect(hit.data);
  };

  if (!names.length) return null;

  return (
    <div className="expert-field full-width person-name-autocomplete">
      <label>{t('fundacion.person.autocompleteByName')}</label>
      <input
        className="expert-input"
        list={listId}
        disabled={disabled}
        placeholder={t('fundacion.person.autocompletePlaceholder')}
        onChange={(e) => tryMatch(e.target.value)}
        onBlur={(e) => tryMatch(e.target.value)}
      />
      <datalist id={listId}>
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
};

export default PersonNameAutocomplete;
