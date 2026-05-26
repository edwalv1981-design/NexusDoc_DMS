const fs = require('fs');
const path = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(path, 'utf8');

if (!s.includes('FundacionPersonFields')) {
  s = s.replace(
    "import { useLang } from '../i18n';",
    `import { useLang } from '../i18n';
import FundacionPersonFields from '../components/FundacionPersonFields';
import {
    emptyFundacionPerson,
    normalizeFundacionPerson,
    personDisplayName,
    personHasData,
    snapshotFromPerson,
} from '../utils/fundacionPersonSchema';`
  );
}

s = s.replace(
  /founders: \[\{[\s\S]*?\}\],\s*protectors: \[\{[\s\S]*?\}\],\s*councilMembers: \[[\s\S]*?\],/m,
  `founders: [emptyFundacionPerson()],
        protectors: [emptyFundacionPerson()],
        councilMembers: [emptyFundacionPerson(), emptyFundacionPerson(), emptyFundacionPerson()],`
);

if (!s.includes('cleanData.founders = (cleanData.founders')) {
  s = s.replace(
    "if (!cleanData.protectors) cleanData.protectors = formData.protectors;",
    `if (!cleanData.protectors) cleanData.protectors = formData.protectors;
            cleanData.founders = (cleanData.founders || []).map(normalizeFundacionPerson);
            cleanData.protectors = (cleanData.protectors || []).map(normalizeFundacionPerson);
            cleanData.councilMembers = (cleanData.councilMembers || []).map(normalizeFundacionPerson);`
  );
}

// Replace getAvailablePersons through handleImportPOA block if old version
if (s.includes("if (f?.fullName) push")) {
  const start = s.indexOf('    const getAvailablePersons = (excludeStep) => {');
  const end = s.indexOf('    const updateArrayField = (arrayName, index, field, value) => {');
  const replacement = `    const getAvailablePersons = (excludeStep) => {
        const list = [];
        const pushPerson = (roleLabel, person, extra = {}) => {
            const p = normalizeFundacionPerson({ ...person, ...extra });
            if (!personHasData(p) && !person.fullName) return;
            const name = personDisplayName(p) || person.fullName;
            if (!name) return;
            list.push({ label: \`\${roleLabel} — \${name}\`, data: snapshotFromPerson(p) });
        };
        if (excludeStep !== 'founder') pushPerson(lang === 'en' ? 'Founder' : 'Fundador', formData.founders[0] || {});
        if (excludeStep !== 'protector') {
            formData.protectors.forEach((p, idx) => pushPerson(\`\${lang === 'en' ? 'Protector' : 'Protector'} #\${idx + 1}\`, p));
        }
        if (excludeStep !== 'director') {
            formData.councilMembers.forEach((m, idx) => pushPerson(\`\${lang === 'en' ? 'Director' : 'Director'} #\${idx + 1}\`, m));
        }
        if (excludeStep !== 'dignitary') {
            formData.dignitaries.forEach((d, idx) => {
                if (d.fullName) list.push({ label: \`\${lang === 'en' ? 'Dignitary' : 'Dignatario'} #\${idx + 1} — \${d.fullName}\`, data: snapshotFromPerson(normalizeFundacionPerson(d)) });
            });
        }
        if (excludeStep !== 'beneficiary') {
            formData.beneficiaries.forEach((b, idx) => {
                if (b.fullName) list.push({ label: \`\${lang === 'en' ? 'Beneficiary' : 'Beneficiario'} #\${idx + 1} — \${b.fullName}\`, data: { ...snapshotFromPerson(normalizeFundacionPerson(b)), percentage: b.percentage } });
            });
        }
        const poaName = [formData.poaFirstName, formData.poaMiddleName, formData.poaLastName].filter(Boolean).join(' ');
        if (excludeStep !== 'poa' && poaName) {
            list.push({
                label: \`\${lang === 'en' ? 'Attorney-in-fact' : 'Apoderado'} — \${poaName}\`,
                data: snapshotFromPerson({
                    firstName: formData.poaFirstName, secondName: formData.poaMiddleName, lastName: formData.poaLastName,
                    birthDate: formData.poaBirthDate, maritalStatus: formData.poaMaritalStatus, nationality: formData.poaNationality,
                    passport: formData.poaPassport, idCard: formData.poaIdCard, phone: formData.poaPhone, email: formData.poaEmail,
                    address: formData.poaAddress, city: formData.poaCity, country: formData.poaCountry,
                }),
            });
        }
        return list;
    };

    const applyPersonSnapshot = (arrayName, index, snapshot) => {
        if (!snapshot?.data) return;
        const merged = { ...formData[arrayName][index], ...snapshotFromPerson(snapshot.data) };
        if (snapshot.data.percentage !== undefined) merged.percentage = snapshot.data.percentage;
        const next = [...formData[arrayName]];
        next[index] = merged;
        setFormData(prev => ({ ...prev, [arrayName]: next }));
    };

    const applyLegacyFullNameSnapshot = (arrayName, index, snapshot) => {
        if (!snapshot?.data) return;
        const p = snapshotFromPerson(snapshot.data);
        const next = [...formData[arrayName]];
        next[index] = {
            ...next[index],
            fullName: personDisplayName(p) || next[index].fullName,
            birthDate: p.birthDate,
            passport: p.passport || p.idCard,
            address: p.address,
            percentage: snapshot.data.percentage ?? next[index].percentage,
        };
        setFormData(prev => ({ ...prev, [arrayName]: next }));
    };

`;
  s = s.slice(0, start) + replacement + s.slice(end);
}

if (!s.includes('const renderPersonCard')) {
  const insertBefore = '    // Paso 3: Fundadores';
  const helper = `    const renderPersonCard = (arrayName, index, cardLabel, excludeStep, canRemove, minItems) => (
        <div key={index} className="expert-card-legal">
            <PersonCopySelect excludeStep={excludeStep} onSelect={(person) => applyPersonSnapshot(arrayName, index, person)} />
            <div className="expert-card-label">{cardLabel}</div>
            {canRemove && <button type="button" onClick={() => removeArrayItem(arrayName, index, minItems)} className="expert-btn-remove"><Trash2 size={16} /></button>}
            <FundacionPersonFields person={formData[arrayName][index]} lang={lang} t={t} onChange={(field, value) => updateArrayField(arrayName, index, field, value)} />
        </div>
    );

`;
  s = s.replace(insertBefore, helper + '    // Paso 3: Fundador');
}

// Step 3 body
s = s.replace(
  /\/\/ Paso 3: Fundador[\s\S]*?\/\/ Paso 4: Protectores/,
  `// Paso 3: Fundador
    const renderStep3 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><Users size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 3: Founder' : 'Paso 3: Fundador'}</h2>
            {formData.founders.map((_, i) => renderPersonCard('founders', i, lang === 'en' ? 'FOUNDER' : 'FUNDADOR', 'founder', false, 1))}
        </div>
    );

    // Paso 4: Protectores`
);

// Step 4 protectors list
s = s.replace(
  /\{formData\.protectors\.map\(\(p, i\) => \([\s\S]*?\)\)\}\s*\n\s*<\/motion.div>\s*\n\s*\);\s*\n\s*\/\/ Paso 5:/m,
  `{formData.protectors.map((_, i) => renderPersonCard('protectors', i, \`\${lang === 'en' ? 'PROTECTOR' : 'PROTECTOR'} #\${i + 1}\`, 'protector', formData.protectors.length > 1, 1))}
        </div>
    );

    // Paso 5:`
);

// Step 5 directors - careful pattern
const step5Start = s.indexOf('// Paso 5: Directores');
const step6Start = s.indexOf('// Paso 6: Dignatarios');
if (step5Start > 0 && step6Start > step5Start) {
  const before = s.slice(0, step5Start);
  const after = s.slice(step6Start);
  const step5 = `// Paso 5: Directores (Consejo de Fundación)
    const renderStep5 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Users size={22} color={PRIMARY} /> {lang === 'en' ? 'Step 5: Directors (Foundation Council)' : 'Paso 5: Directores (Consejo de Fundación)'}</h2>
                <button type="button" onClick={() => addArrayItem('councilMembers', emptyFundacionPerson())} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD COUNCIL MEMBER' : 'AÑADIR MIEMBRO'}
                </button>
            </div>
            {formData.councilMembers.map((_, i) => renderPersonCard('councilMembers', i, \`\${lang === 'en' ? 'DIRECTOR' : 'DIRECTOR'} #\${i + 1}\`, 'director', formData.councilMembers.length > 3, 3))}
        </div>
    );

    `;
  s = before + step5 + after;
}

s = s.replace(
  "onSelect={(person) => applyPersonSnapshot({ kind: 'fullNameRow', arrayName: 'dignitaries', index: i }, person)}",
  "onSelect={(person) => applyLegacyFullNameSnapshot('dignitaries', i, person)}"
);
s = s.replace(
  "onSelect={(person) => applyPersonSnapshot({ kind: 'fullNameRow', arrayName: 'beneficiaries', index: i }, person)}",
  "onSelect={(person) => applyLegacyFullNameSnapshot('beneficiaries', i, person)}"
);

s = s.replace(/addArrayItem\('protectors', \{ fullName:[^}]+\}\)/g, "addArrayItem('protectors', emptyFundacionPerson())");

// POA vertical + checkboxes
s = s.replace(/type="radio" name="poaIssue"/g, 'type="checkbox"');
s = s.replace(/type="radio" name="poaLegalized"/g, 'type="checkbox"');
s = s.replace(/className="poa-radio"/g, 'className="poa-checkbox"');
s = s.replace(
  /\.poa-original-grid \{ display: grid; grid-template-columns: 1\.2fr 0\.8fr; gap: 20px; margin-top: 20px; \}/,
  `.poa-original-grid { display: flex; flex-direction: column; gap: 24px; margin-top: 20px; }
                .person-fields-stack { display: flex; flex-direction: column; gap: 14px; }
                .poa-checkbox { width: 18px; height: 18px; accent-color: #0e7490; cursor: pointer; }`
);

s = s.replace(/motion\.div/g, 'motion.div'); // noop cleanup
s = s.replace(/<motion\.div/g, '<div').replace(/<\/motion\.motion.div>/g, '</div>');

// Fix handleImportPOA if old
if (s.includes('person.data.type ===')) {
  s = s.replace(/const handleImportPOA = \(person\) => \{[\s\S]*?setFormData\(update\);\s*\};/m, `const handleImportPOA = (person) => {
        if (!person?.data) return;
        const p = snapshotFromPerson(person.data);
        setFormData(prev => ({
            ...prev,
            poaFirstName: p.firstName, poaMiddleName: p.secondName, poaLastName: p.lastName,
            poaBirthDate: p.birthDate, poaMaritalStatus: p.maritalStatus, poaNationality: p.nationality,
            poaPassport: p.passport, poaIdCard: p.idCard, poaPhone: p.phone, poaEmail: p.email,
            poaAddress: p.address, poaCity: p.city, poaCountry: p.country,
        }));
    };`);
}

fs.writeFileSync(path, s);
console.log('Applied. Has FundacionPersonFields:', s.includes('FundacionPersonFields'));
console.log('Has renderPersonCard:', s.includes('renderPersonCard'));
