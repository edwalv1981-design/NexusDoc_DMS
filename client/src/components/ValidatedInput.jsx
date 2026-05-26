/**
 * ValidatedInput — Input con validación visual en tiempo real.
 * Muestra un mensaje de error debajo del campo si la validación falla.
 */
import React, { useState, useCallback } from 'react';
import { validateField } from '../utils/fieldValidators';

const errorStyle = {
  fontSize: '10px',
  color: '#ef4444',
  marginTop: '2px',
  fontWeight: 600,
  lineHeight: 1.2,
};

const ValidatedInput = ({
  fieldName,
  value,
  onChange,
  className = '',
  style = {},
  type = 'text',
  as: Component = 'input',
  showError = true,
  validateOnBlur = true,
  validateOnChange = false,
  ...rest
}) => {
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const runValidation = useCallback((val) => {
    const err = validateField(fieldName, val);
    setError(err);
    return err;
  }, [fieldName]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    runValidation(value);
  }, [value, runValidation]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    onChange(e);
    if (validateOnChange && touched) {
      runValidation(newValue);
    }
    if (error && !validateField(fieldName, newValue)) {
      setError(null);
    }
  }, [onChange, validateOnChange, touched, runValidation, error, fieldName]);

  const borderColor = touched && error ? '#ef4444' : undefined;
  const mergedStyle = borderColor
    ? { ...style, borderColor, boxShadow: '0 0 0 1px #fecaca' }
    : style;

  return (
    <>
      <Component
        type={Component === 'input' ? type : undefined}
        className={className}
        style={mergedStyle}
        value={value}
        onChange={handleChange}
        onBlur={validateOnBlur ? handleBlur : undefined}
        {...rest}
      />
      {showError && touched && error && (
        <span style={errorStyle}>{error}</span>
      )}
    </>
  );
};

export default ValidatedInput;
