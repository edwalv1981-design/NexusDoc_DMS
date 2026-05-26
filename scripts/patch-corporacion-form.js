const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../client/src/pages/CorporacionForm.jsx');
let s = fs.readFileSync(filePath, 'utf8');
s = s.replace(/\r\n/g, '\n');

if (!s.includes('normalizeLoadedCorporacionData')) {
  const importBlock = `import React, { useState, useEffect, useCallback } from 'react';
import { 
    Building, Users, UserCheck, Briefcase, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    CheckCircle2, Info, Award
} from 'lucide-react';
import { useLang } from '../i18n';
import FundacionRegistryNameInput from '../components/FundacionRegistryNameInput';
import {
    buildCorporacionPersonRegistry,
    findPersonInRegistry,
    pickCorporacionDirectorFields,
    pickCorporacionDignitaryFields,
    pickCorporacionShareholderPersonFields,
    pickCorporacionSignerFields,
    normalizeLoadedCorporacionData,
} from '../utils/corporacionPersonRegistry';

`;

  s = s.replace(/import React[\s\S]*?from '\.\.\/i18n';\n\n/, importBlock);

  const start = s.indexOf('    useEffect(() => {');
  const end = s.indexOf('    const addDignitary = () => {');
  if (start < 0 || end < 0) throw new Error('block boundaries not found');

  const newBlock = `    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            const cleanData = normalizeLoadedCorporacionData(initialData, formData);
            setFormData(prev => ({ ...prev, ...cleanData }));
        }
    }, [initialData]);

    const registryForRow = useCallback(
        (arrayName, index) => buildCorporacionPersonRegistry(formData, { arrayName, index }),
        [formData]
    );

    const applyDirectorAt = useCallback((index, source) => {
        if (!source) return;
        const patch = pickCorporacionDirectorFields(source);
        setFormData(prev => {
            const directors = [...prev.directors];
            directors[index] = { ...directors[index], ...patch };
            return { ...prev, directors };
        });
    }, []);

    const applyDignitaryAt = useCallback((index, source) => {
        if (!source) return;
        const patch = pickCorporacionDignitaryFields(source);
        setFormData(prev => {
            const dignitaries = [...prev.dignitaries];
            dignitaries[index] = { ...dignitaries[index], ...patch };
            return { ...prev, dignitaries };
        });
    }, []);

    const applyShareholderAt = useCallback((index, source) => {
        if (!source) return;
        const patch = pickCorporacionShareholderPersonFields(source);
        setFormData(prev => {
            const shareholders = [...prev.shareholders];
            shareholders[index] = { ...shareholders[index], ...patch };
            return { ...prev, shareholders };
        });
    }, []);

    const applySignerAt = useCallback((index, source) => {
        if (!source) return;
        const patch = pickCorporacionSignerFields(source);
        setFormData(prev => {
            const signers = [...prev.signers];
            signers[index] = { ...signers[index], ...patch };
            return { ...prev, signers };
        });
    }, []);

    const tryApplyDirectorFromDraft = useCallback(
        (index, draft) => {
            const reg = registryForRow('directors', index);
            const hit = findPersonInRegistry(reg, draft);
            if (hit) applyDirectorAt(index, hit);
        },
        [registryForRow, applyDirectorAt]
    );

`;

  s = s.slice(0, start) + newBlock + s.slice(end);

  s = s.replace(
    /    const updateDignitary = \(index, field, value\) => \{[\s\S]*?setFormData\(prev => \(\{ \.\.\.prev, dignitaries: newDigs \}\)\);\n    \};/,
    `    const updateDignitary = (index, field, value) => {
        const newDigs = [...formData.dignitaries];
        newDigs[index][field] = value;
        setFormData(prev => ({ ...prev, dignitaries: newDigs }));
    };`
  );

  s = s.replace(
    /    const updateShareholder = \(index, field, value\) => \{[\s\S]*?setFormData\(prev => \(\{ \.\.\.prev, shareholders: newShareholders \}\)\);\n    \};/,
    `    const updateShareholder = (index, field, value) => {
        const newShareholders = [...formData.shareholders];
        newShareholders[index][field] = value;
        setFormData(prev => ({ ...prev, shareholders: newShareholders }));
    };`
  );
}

if (s.includes('list="corp-global-names" value={d.firstName}')) {
  s = s.replace(
    '<motion className="expert-field"><label>{lang === \'en\' ? \'First Name\' : \'Primer nombre\'}</label><input className="expert-input" list="corp-global-names" value={d.firstName} onChange={e => updateDirector(i, \'firstName\', e.target.value)} /></motion>',
    ''
  );
  s = s.replace(
    '<motion className="expert-field"><label>{lang === \'en\' ? \'First Name\' : \'Primer nombre\'}</label><input className="expert-input" list="corp-global-names" value={d.firstName} onChange={e => updateDirector(i, \'firstName\', e.target.value)} /></div>',
    ''
  );
  s = s.replace(
    '<div className="expert-field"><label>{lang === \'en\' ? \'First Name\' : \'Primer nombre\'}</label><input className="expert-input" list="corp-global-names" value={d.firstName} onChange={e => updateDirector(i, \'firstName\', e.target.value)} /></div>',
    `<motion className="expert-field"><label>{lang === 'en' ? 'First Name' : 'Primer nombre'}</label><input className="expert-input" value={d.firstName} onChange={e => { updateDirector(i, 'firstName', e.target.value); if (e.target.value.includes(' ')) tryApplyDirectorFromDraft(i, { ...d, firstName: e.target.value }); }} onBlur={() => tryApplyDirectorFromDraft(i, d)} autoComplete="off" /></motion>`
  );
}

// fix accidental motion tags
s = s.replace(/<motion className=/g, '<div className=').replace(/<\/motion>/g, '</div>');

if (s.includes('list="corp-global-names" value={d.firstName}')) {
  s = s.replace(
    `<div className="expert-field"><label>{lang === 'en' ? 'First Name' : 'Primer nombre'}</label><input className="expert-input" list="corp-global-names" value={d.firstName} onChange={e => updateDirector(i, 'firstName', e.target.value)} /></div>`,
    `<div className="expert-field"><label>{lang === 'en' ? 'First Name' : 'Primer nombre'}</label><input className="expert-input" value={d.firstName} onChange={e => { updateDirector(i, 'firstName', e.target.value); if (e.target.value.includes(' ')) tryApplyDirectorFromDraft(i, { ...d, firstName: e.target.value }); }} onBlur={() => tryApplyDirectorFromDraft(i, d)} autoComplete="off" /></div>`
  );
}

if (!s.includes('tryApplyDirectorFromDraft(i, d)} autoComplete="off" /></motion>') && s.includes("updateDirector(i, 'lastName'")) {
  s = s.replace(
    `<div className="expert-field"><label>{lang === 'en' ? 'Surname(s)' : 'Apellidos'}</label><input className="expert-input" value={d.lastName} onChange={e => updateDirector(i, 'lastName', e.target.value)} /></div>`,
    `<div className="expert-field"><label>{lang === 'en' ? 'Surname(s)' : 'Apellidos'}</label><input className="expert-input" value={d.lastName} onChange={e => updateDirector(i, 'lastName', e.target.value)} onBlur={() => tryApplyDirectorFromDraft(i, d)} autoComplete="off" /></motion>`
  );
  s = s.replace(/<\/motion>/g, '</motion>').replace(/<\/motion>/g, '</div>');
}

if (s.includes('list="corp-global-names" value={dig.fullName}')) {
  s = s.replace(
    `<div className="expert-field full-width"><label>{lang === 'en' ? 'Full name' : 'Nombre completo'}</label><input className="expert-input" list="corp-global-names" value={dig.fullName} onChange={e => updateDignitary(i, 'fullName', e.target.value)} /></div>`,
    `<div className="expert-field full-width"><label>{lang === 'en' ? 'Full name' : 'Nombre completo'}</label><FundacionRegistryNameInput value={dig.fullName} onChange={(v) => updateDignitary(i, 'fullName', v)} registry={registryForRow('dignitaries', i)} onMatch={(hit) => applyDignitaryAt(i, hit)} className="expert-input" /></div>`
  );
}

if (s.includes('list="corp-global-names" value={s.name}') && s.includes('Shareholder')) {
  s = s.replace(
    `<div className="expert-field full-width"><label>{lang === 'en' ? 'Shareholder (Full name)' : 'Accionista (Nombre completo)'}</label><input className="expert-input" list="corp-global-names" value={s.name} onChange={e => updateShareholder(i, 'name', e.target.value)} /></div>`,
    `<div className="expert-field full-width"><label>{lang === 'en' ? 'Shareholder (Full name)' : 'Accionista (Nombre completo)'}</label><FundacionRegistryNameInput value={s.name} onChange={(v) => updateShareholder(i, 'name', v)} registry={registryForRow('shareholders', i)} onMatch={(hit) => applyShareholderAt(i, hit)} className="expert-input" /></div>`
  );
}

if (s.includes('list="corp-global-names" value={s.name}') && s.includes('expert-input-legal')) {
  s = s.replace(
    `<input className="expert-input-legal" list="corp-global-names" value={s.name} onChange={e => updateSigner(i, 'name', e.target.value)} placeholder={lang === 'en' ? 'e.g. John Doe' : 'Ej: Pedro Roman Romano'} />`,
    `<FundacionRegistryNameInput value={s.name} onChange={(v) => updateSigner(i, 'name', v)} registry={registryForRow('signers', i)} onMatch={(hit) => applySignerAt(i, hit)} className="expert-input-legal" placeholder={lang === 'en' ? 'e.g. John Doe' : 'Ej: Pedro Roman Romano'} />`
  );
}

s = s.replace(/\n            <datalist id="corp-global-names">[\s\S]*?<\/datalist>\n/, '\n');

s = s.replace(
  `<h1 className="expert-title">{lang === 'en' ? 'INCORPORATION' : 'INCORPORACIÓN'}</h1>
                    <p className="expert-subtitle">{lang === 'en' ? 'High-Precision Corporate DMS System' : 'Sistema de Alta Precisión Corporativa'}</p>`,
  `<h1 className="expert-title">{t('corporacion.title')}</h1>
                    <p className="expert-subtitle">{t('corporacion.subtitle')}</p>`
);

s = s.replace(
  `{saving ? (lang === 'en' ? 'Synchronizing...' : 'Sincronizando...') : (lang === 'en' ? 'SAVE PROGRESS' : 'GUARDAR AVANCE')}`,
  `{saving ? t('corporacion.syncing') : t('corporacion.saveProgress')}`
);
s = s.replace(`<ChevronLeft size={18} /> {lang === 'en' ? 'PREVIOUS' : 'ANTERIOR'}`, `<ChevronLeft size={18} /> {t('corporacion.previous')}`);
s = s.replace(`{lang === 'en' ? 'NEXT STEP' : 'SIGUIENTE PASO'}`, `{t('corporacion.nextStep')}`);
s = s.replace(
  `{saving ? (lang === 'en' ? 'FINALIZING...' : 'FINALIZANDO...') : (lang === 'en' ? 'REGISTER CORPORATION' : 'REGISTRAR SOCIEDAD')}`,
  `{saving ? t('corporacion.finalizing') : t('corporacion.registerCorp')}`
);

const fixes = [
  ['InformaciÃ³n', 'Información'],
  ['DeclaraciÃ³n', 'Declaración'],
  ['compaÃ±Ã­a', 'compañía'],
  ['CompaÃ±Ã­a', 'Compañía'],
  ['PanamÃ¡', 'Panamá'],
  ['mÃ­nimo', 'mínimo'],
  ['MÃ\x8DN', 'MÍN'],
  ['CÃ©dula', 'Cédula'],
  ['DirecciÃ³n', 'Dirección'],
  ['distribuciÃ³n', 'distribución'],
  ['acciÃ³n', 'acción'],
  ['explicaciÃ³n', 'explicación'],
  ['legÃ­timas', 'legítimas'],
  ['identificaciÃ³n', 'identificación'],
  ['PrecisiÃ³n', 'Precisión'],
  ['INCORPORACIÃ"N', 'INCORPORACIÓN'],
  ['SociÃ©tÃ©', 'Société'],
  ['AnÃ³nima', 'Anónima'],
  ['OpciÃ³n', 'Opción'],
];
for (const [bad, good] of fixes) s = s.split(bad).join(good);

s = s.replace(/<\/motion>/g, '</div>');

fs.writeFileSync(filePath, s, 'utf8');

if (!s.includes('normalizeLoadedCorporacionData')) throw new Error('import failed');
if (!s.includes('FundacionRegistryNameInput')) throw new Error('registry input failed');
console.log('OK', {
  tryApply: s.includes('tryApplyDirectorFromDraft'),
  noGlobalList: !s.includes('corp-global-names'),
});
