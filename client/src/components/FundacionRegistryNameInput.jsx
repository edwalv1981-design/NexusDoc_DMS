import React, { useId, useCallback } from 'react';
import { findMatch, getPersonNameSuggestions } from '../utils/fundacionPersonRegistry';

/**
 * Input con datalist de nombres del formulario; sin etiqueta "autocompletar".
 * onMatch recibe datos del registro solo en coincidencia exacta.
 */
const FundacionRegistryNameInput = ({
  value,
  onChange,
  onBlur,
  registry = [],
  onMatch,
  className = 'expert-input',
  placeholder,
  type = 'text',
  listId: listIdProp,
}) => {
  const autoId = useId();
  const listId = listIdProp || autoId;
  const suggestions = getPersonNameSuggestions(registry);
  const hasSuggestions = suggestions.length > 0;

  const tryApply = useCallback(
    (text) => {
      if (!onMatch) return;
      const hit = findMatch(registry, text);
      if (hit) onMatch(hit);
    },
    [onMatch, registry]
  );

  return (
    <>
      <input
        type={type}
        className={className}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          onBlur?.(e);
          tryApply(e.target.value);
        }}
        onInput={(e) => {
          const v = e.target.value;
          if (v.includes(' ')) tryApply(v);
        }}
        list={hasSuggestions ? listId : undefined}
        autoComplete="off"
        placeholder={placeholder}
      />
      {hasSuggestions && (
        <datalist id={listId}>
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
    </>
  );
};

export default FundacionRegistryNameInput;
