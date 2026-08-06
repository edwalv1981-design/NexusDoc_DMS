const fs = require('fs');
const file = 'client/src/pages/CorporacionForm.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add generateId
content = content.replace(
  "const CorporacionForm = ({ initialData, onSave, saving }) => {",
  "const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);\n\nconst CorporacionForm = ({ initialData, onSave, saving }) => {"
);

// 2. Initial state
content = content.replace(
  /directors: \[\s*\{ fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' \},\s*\{ fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' \},\s*\{ fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' \}\s*\],/g,
  `directors: [
            { _id: generateId(), entityType: 'individual', fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' },
            { _id: generateId(), entityType: 'individual', fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' },
            { _id: generateId(), entityType: 'individual', fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' }
        ],`
);

content = content.replace(
  /dignitaries: \[\s*\{ role: 'PRESIDENTE', fullName: '', birthDate: '', passport: '', registrationNumber: '' \},\s*\{ role: 'SECRETARIO', fullName: '', birthDate: '', passport: '', registrationNumber: '' \},\s*\{ role: 'TESORERO', fullName: '', birthDate: '', passport: '', registrationNumber: '' \}\s*\],/g,
  `dignitaries: [
            { _id: generateId(), entityType: 'individual', role: 'PRESIDENTE', fullName: '', birthDate: '', passport: '', registrationNumber: '' },
            { _id: generateId(), entityType: 'individual', role: 'SECRETARIO', fullName: '', birthDate: '', passport: '', registrationNumber: '' },
            { _id: generateId(), entityType: 'individual', role: 'TESORERO', fullName: '', birthDate: '', passport: '', registrationNumber: '' }
        ],`
);

content = content.replace(
  /shareholders: \[\s*\{ certificate: '1', value: '100', shares: '100', name: '', address: '' \}\s*\],/g,
  `shareholders: [
            { _id: generateId(), entityType: 'individual', certificate: '1', value: '100', shares: '100', name: '', address: '' }
        ],`
);

// 3. useEffect cleanData mapping
content = content.replace(
  /const cleanData = normalizeLoadedCorporacionData\(initialData, formData\);\n            setFormData\(prev => \(\{ \.\.\.prev, \.\.\.cleanData \}\)\);/,
  `const cleanData = normalizeLoadedCorporacionData(initialData, formData);
            ['directors', 'dignitaries', 'shareholders'].forEach(arr => {
                if (cleanData[arr]) {
                    cleanData[arr] = cleanData[arr].map(item => ({ ...item, _id: item._id || generateId(), entityType: item.entityType || 'individual' }));
                }
            });
            setFormData(prev => ({ ...prev, ...cleanData }));`
);

// 4. addDignitary, addDirector, addShareholder
content = content.replace(
  /dignitaries: \[\.\.\.prev\.dignitaries, \{ role: '', fullName: '', birthDate: '', passport: '', registrationNumber: '' \}\]/,
  `dignitaries: [...prev.dignitaries, { _id: generateId(), entityType: 'individual', role: '', fullName: '', birthDate: '', passport: '', registrationNumber: '' }]`
);

content = content.replace(
  /directors: \[\.\.\.prev\.directors, \{ fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' \}\]/,
  `directors: [...prev.directors, { _id: generateId(), entityType: 'individual', fullName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' }]`
);

content = content.replace(
  /shareholders: \[\.\.\.prev\.shareholders, \{ certificate: '', value: '', shares: '', name: '', address: '' \}\]/,
  `shareholders: [...prev.shareholders, { _id: generateId(), entityType: 'individual', certificate: '', value: '', shares: '', name: '', address: '' }]`
);

// UI additions
// For Directors
content = content.replace(
  /<div key=\{i\} className=\"corp-card\">/g,
  '<div key={d._id || i} className="corp-card">'
);
content = content.replace(
  /<div className=\"corp-card-label\">DIRECTOR #\{i\+1\}<\/div>\n\s*\{formData\.directors\.length > 3 && <button onClick=\{[^>]+\><Trash2 size=\{14\} \/><\/button>\}/,
  `$&\n                    <div style={{ display: 'flex', gap: '10px', margin: '12px 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: d.entityType === 'individual' ? '#0f766e' : '#64748b' }}>
                            <input type="radio" checked={d.entityType !== 'company'} onChange={() => updateDirector(i, 'entityType', 'individual')} style={{ cursor: 'pointer' }} /> {lang === 'en' ? 'Individual' : 'Individuo'}
                        </label>
                        <label style={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: d.entityType === 'company' ? '#0f766e' : '#64748b' }}>
                            <input type="radio" checked={d.entityType === 'company'} onChange={() => updateDirector(i, 'entityType', 'company')} style={{ cursor: 'pointer' }} /> {lang === 'en' ? 'Company' : 'Empresa'}
                        </label>
                    </div>`
);
content = content.replace(
  /<label>\{lang === 'en' \? 'Full name' : 'Nombre completo'\}<\/label>/g,
  '<label>{d.entityType === "company" ? (lang === "en" ? "Company Name" : "Razón Social") : (lang === "en" ? "Full name" : "Nombre completo")}</label>'
);
content = content.replace(
  /placeholder=\{lang === 'en' \? 'Full name as on Passport\/ID' : 'Nombre completo como aparece en pasaporte\/cédula'\}/g,
  'placeholder={d.entityType === "company" ? "EJ: EMPRESA S.A." : (lang === "en" ? "Full name as on Passport/ID" : "Nombre completo como aparece en pasaporte/cédula")}'
);
// Conditionally hide director fields
content = content.replace(
  /<div className=\"corp-field\">\n\s*<label>\{lang === 'en' \? 'Marital Status' : 'Estado civil'\}<\/label>/,
  '{d.entityType !== "company" && <div className="corp-field">\n                            <label>{lang === \'en\' ? \'Marital Status\' : \'Estado civil\'}</label>'
);
content = content.replace(
  /<\/select>\n\s*<\/div>\n\s*<div className=\"corp-field\"><label>\{lang === 'en' \? 'Citizenship' : 'Nacionalidad'\}<\/label>/,
  '</select>\n                        </div>}\n                        {d.entityType !== "company" && <div className="corp-field"><label>{lang === \'en\' ? \'Citizenship\' : \'Nacionalidad\'}</label>'
);
content = content.replace(
  /field=\"nationality\" \/><\/div>\n\s*<div className=\"corp-field\" style=\{\{ position: 'relative' \}\} ref=\{el => autocompleteRefs.current\[`dir-pass-\$\{i\}`\] = el\}>/,
  'field="nationality" /></div>}\n                        <div className="corp-field" style={{ position: \'relative\' }} ref={el => autocompleteRefs.current[`dir-pass-${i}`] = el}>'
);
content = content.replace(
  /<label>\{lang === 'en' \? 'Passport \/ ID' : 'Pasaporte \/ Cédula'\}<\/label>/,
  '<label>{d.entityType === "company" ? (lang === "en" ? "Registration Number / RUC" : "RUC / No. de Registro") : (lang === "en" ? "Passport / ID" : "Pasaporte / Cédula")}</label>'
);
content = content.replace(
  /<span className=\"corp-ac-name\">\{p.fullName \|\| \[p.firstName, p.secondName, p.lastName\].filter\(Boolean\).join\(' '\) \|\| ''\}<\/span>\n\s*<\/div>\n\s*\)\)}\n\s*<\/div>\n\s*\)}\n\s*<\/div>\n\s*<div className=\"corp-field\"><label>\{lang === 'en' \? 'Date of birth' : 'Fecha de nacimiento'\}<\/label>/,
  '<span className="corp-ac-name">{p.fullName || [p.firstName, p.secondName, p.lastName].filter(Boolean).join(\' \') || \'\'}</span>\n                                        </div>\n                                    ))}\n                                </div>\n                            )}\n                        </div>\n                        <div className="corp-field"><label>{d.entityType === "company" ? (lang === "en" ? "Date of Incorporation" : "Fecha de constitución") : (lang === "en" ? "Date of birth" : "Fecha de nacimiento")}</label>'
);


// Diginitaries changes
content = content.replace(
  /<div key=\{i\} className=\"corp-card\">\n\s*<div className=\"corp-card-label\">\{lang === 'en' \? 'DIGNITARY' : 'DIGNATARIO'\} #\{i\+1\}<\/div>\n\s*\{formData\.dignitaries\.length > 3 && <button onClick=\{[^>]+\><Trash2 size=\{14\} \/><\/button>\}/g,
  `<div key={dig._id || i} className="corp-card">
                    <div className="corp-card-label">{lang === 'en' ? 'DIGNITARY' : 'DIGNATARIO'} #{i+1}</div>
                    {formData.dignitaries.length > 3 && <button onClick={() => removeDignitary(i)} className="corp-btn-remove"><Trash2 size={14} /></button>}
                    <div style={{ display: 'flex', gap: '10px', margin: '12px 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: dig.entityType !== 'company' ? '#0f766e' : '#64748b' }}>
                            <input type="radio" checked={dig.entityType !== 'company'} onChange={() => updateDignitary(i, 'entityType', 'individual')} style={{ cursor: 'pointer' }} /> {lang === 'en' ? 'Individual' : 'Individuo'}
                        </label>
                        <label style={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: dig.entityType === 'company' ? '#0f766e' : '#64748b' }}>
                            <input type="radio" checked={dig.entityType === 'company'} onChange={() => updateDignitary(i, 'entityType', 'company')} style={{ cursor: 'pointer' }} /> {lang === 'en' ? 'Company' : 'Empresa'}
                        </label>
                    </div>`
);
content = content.replace(
  /<label>\{lang === 'en' \? 'Full name' : 'Nombre completo'\}<\/label>\n\s*<input className=\"corp-input\" style=\{getArrayErrorStyle\('dignitaries', i, 'fullName'\)\} value=\{dig.fullName\}/g,
  '<label>{dig.entityType === "company" ? (lang === "en" ? "Company Name" : "Razón Social") : (lang === "en" ? "Full name" : "Nombre completo")}</label>\n                            <input className="corp-input" style={getArrayErrorStyle(\'dignitaries\', i, \'fullName\')} value={dig.fullName}'
);
content = content.replace(
  /<label>\{lang === 'en' \? 'Passport \/ ID' : 'Pasaporte \/ Cédula'\}<\/label>\n\s*<input className=\"corp-input\" style=\{getArrayErrorStyle\('dignitaries', i, 'passport'\)\} value=\{dig.passport\}/g,
  '<label>{dig.entityType === "company" ? (lang === "en" ? "Registration Number" : "RUC / No. Registro") : (lang === "en" ? "Passport / ID" : "Pasaporte / Cédula")}</label>\n                            <input className="corp-input" style={getArrayErrorStyle(\'dignitaries\', i, \'passport\')} value={dig.passport}'
);
content = content.replace(
  /<div className=\"corp-field\"><label>\{lang === 'en' \? 'Date of birth' : 'Fecha de nacimiento'\}<\/label><input type=\"date\" className=\"corp-input\" style=\{getArrayErrorStyle\('dignitaries', i, 'birthDate'\)\} value=\{dig.birthDate\}/g,
  '{dig.entityType !== "company" && <div className="corp-field"><label>{lang === \'en\' ? \'Date of birth\' : \'Fecha de nacimiento\'}</label><input type="date" className="corp-input" style={getArrayErrorStyle(\'dignitaries\', i, \'birthDate\')} value={dig.birthDate}'
);
content = content.replace(
  /field=\"birthDate\" \/><\/div>\n\s*<div className=\"corp-field\"><label>\{lang === 'en' \? 'Registration Number' : 'Número de Registro'\}<\/label>/g,
  'field="birthDate" /></div>}\n                        {dig.entityType === "company" && <div className="corp-field"><label>{lang === \'en\' ? \'Date of Incorporation\' : \'Fecha de constitución\'}</label><input type="date" className="corp-input" style={getArrayErrorStyle(\'dignitaries\', i, \'birthDate\')} value={dig.birthDate} onChange={e => updateDignitary(i, \'birthDate\', e.target.value)} onBlur={() => handleArrayFieldBlur(\'dignitaries\', i, \'birthDate\')} /><ArrayFieldError array="dignitaries" index={i} field="birthDate" /></div>}\n                        {dig.entityType !== "company" && <div className="corp-field"><label>{lang === \'en\' ? \'Registration Number\' : \'Número de Registro\'}</label>'
);
content = content.replace(
  /placeholder=\{lang === 'en' \? 'Reg. number' : 'No. Registro'\} \/><ArrayFieldError array=\"dignitaries\" index=\{i\} field=\"registrationNumber\" \/><\/div>/g,
  'placeholder={lang === \'en\' ? \'Reg. number\' : \'No. Registro\'} /><ArrayFieldError array="dignitaries" index={i} field="registrationNumber" /></div>}'
);

// Shareholders changes
content = content.replace(
  /<div key=\{i\} className=\"corp-card\">\n\s*<div className=\"corp-card-label\">\{lang === 'en' \? 'SHAREHOLDER' : 'ACCIONISTA'\} #\{i\+1\}<\/div>\n\s*\{formData\.shareholders\.length > 1 && <button onClick=\{[^>]+\><Trash2 size=\{14\} \/><\/button>\}/g,
  `<div key={s._id || i} className="corp-card">
                    <div className="corp-card-label">{lang === 'en' ? 'SHAREHOLDER' : 'ACCIONISTA'} #{i+1}</div>
                    {formData.shareholders.length > 1 && <button onClick={() => removeShareholder(i)} className="corp-btn-remove"><Trash2 size={14} /></button>}
                    <div style={{ display: 'flex', gap: '10px', margin: '12px 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: s.entityType !== 'company' ? '#0f766e' : '#64748b' }}>
                            <input type="radio" checked={s.entityType !== 'company'} onChange={() => updateShareholder(i, 'entityType', 'individual')} style={{ cursor: 'pointer' }} /> {lang === 'en' ? 'Individual' : 'Individuo'}
                        </label>
                        <label style={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: s.entityType === 'company' ? '#0f766e' : '#64748b' }}>
                            <input type="radio" checked={s.entityType === 'company'} onChange={() => updateShareholder(i, 'entityType', 'company')} style={{ cursor: 'pointer' }} /> {lang === 'en' ? 'Company' : 'Empresa'}
                        </label>
                    </div>`
);
content = content.replace(
  /<label>\{lang === 'en' \? 'Shareholder \(Full name\)' : 'Accionista \(Nombre completo\)'\}<\/label>/g,
  '<label>{s.entityType === "company" ? (lang === "en" ? "Company Name" : "Razón Social") : (lang === "en" ? "Shareholder (Full name)" : "Accionista (Nombre completo)")}</label>'
);
content = content.replace(
  /<label>\{lang === 'en' \? 'Residential Address' : 'Dirección residencial'\}<\/label>/g,
  '<label>{s.entityType === "company" ? (lang === "en" ? "Registered Address" : "Dirección Registrada") : (lang === "en" ? "Residential Address" : "Dirección residencial")}</label>'
);


fs.writeFileSync(file, content);
console.log('Patched CorporacionForm.jsx');
