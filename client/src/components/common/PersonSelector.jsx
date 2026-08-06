import React from 'react';
import { UserCheck, Copy, Sparkles } from 'lucide-react';

/**
 * PersonSelector Component
 * Permite seleccionar a una persona previamente ingresada en cualquier paso del formulario
 * para autocompletar automáticamente los campos del bloque actual.
 *
 * Props:
 * - people: Array de personas extraídas mediante extractRegisteredPeople(formData)
 * - onSelectPerson: Callback function (personData) => void
 * - label: Texto descriptivo opcional para el selector
 * - currentName: Nombre actualmente ingresado en el campo (para resaltar coincidencia)
 */
export const PersonSelector = ({
  people = [],
  onSelectPerson,
  label = '¿Reutilizar datos de una persona ya ingresada en este trámite?',
  currentName = ''
}) => {
  if (!people || people.length === 0) return null;

  const handleChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const selected = people.find((p) => p.id === selectedId);
    if (selected && onSelectPerson) {
      onSelectPerson(selected);
    }
  };

  return (
    <div
      style={{
        marginBottom: '14px',
        padding: '10px 14px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: '#166534',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
        <Sparkles size={16} color="#16a34a" />
        <span>{label}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <UserCheck size={18} color="#15803d" />
        <select
          defaultValue=""
          onChange={handleChange}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '0.85rem',
            borderRadius: '6px',
            border: '1px solid #86efac',
            backgroundColor: '#ffffff',
            color: '#14532d',
            outline: 'none',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          <option value="" disabled>
            -- Seleccione una persona registrada para autocompletar --
          </option>
          {people.map((p) => {
            const isSelectedMatch = currentName && p.name.toLowerCase() === currentName.toLowerCase();
            return (
              <option key={p.id} value={p.id}>
                {p.name} {p.idNumber ? `(${p.idNumber})` : ''} — {p.roleLabel} {isSelectedMatch ? '✓' : ''}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
};

export default PersonSelector;
