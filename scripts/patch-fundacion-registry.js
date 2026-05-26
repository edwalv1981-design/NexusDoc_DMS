const fs = require('fs');
const p = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes("from '../utils/fundacionPersonRegistry'")) {
  s = s.replace(
    "} from '../utils/fundacionPersonSchema';",
    "} from '../utils/fundacionPersonSchema';\nimport { buildPersonRegistry } from '../utils/fundacionPersonRegistry';"
  );
}

if (!s.includes('const applyRegistryPerson')) {
  s = s.replace(
    `    const applyPersonSnapshot = (arrayName, index, snapshot) => {
        if (!snapshot?.data) return;
        const rows = formData[arrayName];
        if (!Array.isArray(rows) || index < 0 || index >= rows.length) return;
        const merged = { ...rows[index], ...snapshotFromPerson(snapshot.data) };
        if (snapshot.data.percentage !== undefined) merged.percentage = snapshot.data.percentage;
        const next = [...rows];
        next[index] = merged;
        setFormData((prev) => ({ ...prev, [arrayName]: next }));
    };

    const PersonCopySelect`,
    `    const applyPersonSnapshot = (arrayName, index, snapshot) => {
        if (!snapshot?.data) return;
        const rows = formData[arrayName];
        if (!Array.isArray(rows) || index < 0 || index >= rows.length) return;
        const merged = { ...rows[index], ...snapshotFromPerson(snapshot.data) };
        if (snapshot.data.percentage !== undefined) merged.percentage = snapshot.data.percentage;
        const next = [...rows];
        next[index] = merged;
        setFormData((prev) => ({ ...prev, [arrayName]: next }));
    };

    const applyRegistryPerson = (arrayName, index, fields) => {
        const rows = formData[arrayName];
        if (!Array.isArray(rows) || index < 0 || index >= rows.length) return;
        const next = [...rows];
        next[index] = { ...rows[index], ...fields };
        setFormData((prev) => ({ ...prev, [arrayName]: next }));
    };

    const handleImportPOA = (person) => {
        if (!person?.data) return;
        const p = snapshotFromPerson(person.data);
        setFormData((prev) => ({
            ...prev,
            poaFirstName: p.firstName || prev.poaFirstName,
            poaMiddleName: p.secondName || prev.poaMiddleName,
            poaLastName: p.lastName || prev.poaLastName,
            poaBirthDate: p.birthDate || prev.poaBirthDate,
            poaMaritalStatus: p.maritalStatus || prev.poaMaritalStatus,
            poaNationality: p.nationality || prev.poaNationality,
            poaPassport: p.passport || prev.poaPassport,
            poaIdCard: p.idCard || prev.poaIdCard,
            poaPhone: p.phone || prev.poaPhone,
            poaEmail: p.email || prev.poaEmail,
            poaAddress: p.address || prev.poaAddress,
            poaCity: p.city || prev.poaCity,
            poaCountry: p.country || prev.poaCountry,
        }));
    };

    const PersonCopySelect`
  );
}

const cardOld = `    const renderPersonCard = (arrayName, index, cardLabel, excludeStep, canRemove, minItems) => (
            <div key={index} className="expert-card-legal">
                <PersonCopySelect
                    excludeStep={excludeStep}
                    onSelect={(person) => applyPersonSnapshot(arrayName, index, person)}
                />
                <div className="expert-card-label">{cardLabel}</div>
                {canRemove && (
                    <button type="button" onClick={() => removeArrayItem(arrayName, index, minItems)} className="expert-btn-remove">
                        <Trash2 size={16} />
                    </button>
                )}
                
                <FundacionPersonFields
                    person={formData[arrayName][index]}
                    lang={lang}
                    t={t}
                    onChange={(field, value) => updateArrayField(arrayName, index, field, value)}
                />
            </div>
    );`;

const cardNew = `    const renderPersonCard = (arrayName, index, cardLabel, excludeStep, canRemove, minItems) => {
        const registry = buildPersonRegistry(formData, { arrayName, index });
        return (
            <div key={index} className="expert-card-legal">
                <PersonCopySelect
                    excludeStep={excludeStep}
                    onSelect={(person) => applyPersonSnapshot(arrayName, index, person)}
                />
                <div className="expert-card-label">{cardLabel}</div>
                {canRemove && (
                    <button type="button" onClick={() => removeArrayItem(arrayName, index, minItems)} className="expert-btn-remove">
                        <Trash2 size={16} />
                    </button>
                )}
                <FundacionPersonFields
                    person={formData[arrayName][index]}
                    lang={lang}
                    t={t}
                    personRegistry={registry}
                    onApplyPerson={(fields) => applyRegistryPerson(arrayName, index, fields)}
                    onChange={(field, value) => updateArrayField(arrayName, index, field, value)}
                />
            </div>
        );
    };`;

if (s.includes('personRegistry={registry}')) {
  console.log('renderPersonCard already patched');
} else {
  const start = s.indexOf('const renderPersonCard');
  const end = s.indexOf('// Paso 3: Fundador');
  if (start >= 0 && end > start) {
    s = s.slice(0, start) + cardNew + '\n\n    ' + s.slice(end);
  } else {
    console.error('renderPersonCard block not found');
  }
}

// Restore POA person copy (without AUTOCOMPLETAR text)
if (!s.includes('handleImportPOA(selected)')) {
  const poaAnchor = `                <h2 className="expert-step-title"><KeyRound size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 8: Power Of Attorney / Poderes (Optional)' : 'Paso 8: Power Of Attorney / Poderes (Opcional)'}</h2>
                
                <div className="poa-original-grid">`;
  const poaBlock = `                <h2 className="expert-step-title"><KeyRound size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 8: Power Of Attorney / Poderes (Optional)' : 'Paso 8: Power Of Attorney / Poderes (Opcional)'}</h2>

                {getAvailablePersons('poa').length > 0 && (
                    <div className="person-copy-box" style={{ marginBottom: '20px' }}>
                        <label>{t('fundacion.copyFrom')}</label>
                        <select
                            className="expert-input"
                            defaultValue=""
                            onChange={(e) => {
                                const list = getAvailablePersons('poa');
                                const selected = list[Number(e.target.value)];
                                if (selected) handleImportPOA(selected);
                                e.target.value = '';
                            }}
                        >
                            <option value="">{t('fundacion.copySelect')}</option>
                            {getAvailablePersons('poa').map((p, idx) => (
                                <option key={idx} value={idx}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="poa-original-grid">`;
  if (s.includes(poaAnchor)) {
    s = s.replace(poaAnchor, poaBlock);
  }
}

// renderStep8 must call getAvailablePersons - wrap in function body if needed
if (s.includes('const renderStep8 = () => (\n            <div') && !s.includes("const availablePersons = getAvailablePersons('poa')")) {
  s = s.replace(
    'const renderStep8 = () => (\n            <div',
    "const renderStep8 = () => {\n        const availablePersons = getAvailablePersons('poa');\n        return (\n            <div"
  );
  // close renderStep8 - find matching ); before renderStep9
  const r8 = s.indexOf('const renderStep8');
  const r9 = s.indexOf('const renderStep9');
  if (r8 >= 0 && r9 > r8) {
    const chunk = s.slice(r8, r9);
    if (!chunk.includes('};')) {
      s = s.slice(0, r9).replace(/\n    \);\n\n    const renderStep9/, '\n        );\n    };\n\n    const renderStep9') + s.slice(r9);
    }
  }
}

fs.writeFileSync(p, s);
console.log({
  registryImport: s.includes('fundacionPersonRegistry'),
  applyRegistry: s.includes('applyRegistryPerson'),
  personRegistryProp: s.includes('personRegistry={registry}'),
  poaImport: s.includes('handleImportPOA(selected)'),
});
