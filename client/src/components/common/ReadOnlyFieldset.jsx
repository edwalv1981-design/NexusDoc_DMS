import React from 'react';

/**
 * Modo "solo lectura" de un formulario (vista del administrador).
 * Envuelve los campos en un <fieldset disabled>: el navegador bloquea todos los
 * inputs, selects, textareas y botones internos (agregar/eliminar, etc.).
 * Fuera del modo lectura no agrega ningún elemento (el formulario queda igual).
 */
const ReadOnlyFieldset = ({ readOnly, children }) => {
    if (!readOnly) return children;
    return (
        <fieldset disabled className="nx-readonly-fieldset" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            {children}
        </fieldset>
    );
};

export default ReadOnlyFieldset;
