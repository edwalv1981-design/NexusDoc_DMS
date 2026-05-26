const fs = require('fs');
const p = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes("mergePersonIntoRow('dignitaries'")) {
  s = s.replace(
    `<div className="expert-field full-width">
                            <label>{t('fundacion.dignitary.fullName')}</label>
                            <input className="expert-input" value={d.fullName || ''} onChange={e => updateArrayField('dignitaries', i, 'fullName', e.target.value)} placeholder={t('fundacion.dignitary.fullNamePlaceholder')} />
                        </div>`,
    `<motion.div className="expert-field full-width">
                            <label>{t('fundacion.dignitary.fullName')}</label>
                            <FundacionRegistryNameInput
                                value={d.fullName || ''}
                                onChange={(v) => updateArrayField('dignitaries', i, 'fullName', v)}
                                registry={buildRegistry(formData, { arrayName: 'dignitaries', index: i })}
                                onMatch={(data) => mergePersonIntoRow('dignitaries', i, data, FUNDACION_DIGNITARY_FIELDS)}
                                placeholder={t('fundacion.dignitary.fullNamePlaceholder')}
                            />
                        </motion.div>`.replace(/<\/?motion\.div/g, (m) => m.replace('motion.', ''))
  );
}

if (!s.includes("registrationNumber', e.target.value)")) {
  s = s.replace(
    `<div className="expert-field full-width">
                            <label>{t('fundacion.dignitary.address')}</label>
                            <input className="expert-input" value={d.address || ''} onChange={e => updateArrayField('dignitaries', i, 'address', e.target.value)} placeholder={t('fundacion.dignitary.addressPlaceholder')} />
                        </div>
                    </div>`,
    `<div className="expert-field full-width">
                            <label>{t('fundacion.dignitary.address')}</label>
                            <input className="expert-input" value={d.address || ''} onChange={e => updateArrayField('dignitaries', i, 'address', e.target.value)} placeholder={t('fundacion.dignitary.addressPlaceholder')} />
                        </div>
                        <div className="expert-field full-width">
                            <label>{t('fundacion.person.registrationNumber')}</label>
                            <input className="expert-input" value={d.registrationNumber || ''} onChange={e => updateArrayField('dignitaries', i, 'registrationNumber', e.target.value)} />
                        </div>
                    </div>`
  );
}

s = s.replace(/\n                    <PersonNameAutocomplete[\s\S]*?\/>\n/, '\n');

s = s.replace(/buildPersonRegistry\(/g, 'buildRegistry(');

const shOld =
  `<input className="expert-input" value={b.shareholder || ''} onChange={e => updateArrayField('beneficiaries', i, 'shareholder', e.target.value)} placeholder={t('fundacion.beneficiary.shareholderPlaceholder')} />`;
const shNew = `<FundacionRegistryNameInput
                                value={b.shareholder || ''}
                                onChange={(v) => updateArrayField('beneficiaries', i, 'shareholder', v)}
                                registry={registry}
                                onMatch={(data) => {
                                    const fill = pickFields(data, BENEFICIARY_REGISTRY_FILL);
                                    if (Object.keys(fill).length) applyRegistryPerson('beneficiaries', i, fill);
                                }}
                                placeholder={t('fundacion.beneficiary.shareholderPlaceholder')}
                            />`;
if (s.includes(shOld)) s = s.replace(shOld, shNew);

const poaOld = `{availablePersons.length > 0 && (
                    <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '900', color: PRIMARY, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                            {lang === 'en' ? '⚡ AUTOFILL FROM ANOTHER COMPLETED PERSON' : '⚡ AUTOCOMPLETAR DESDE PERSONA REGISTRADA'}
                        </label>
                        <select 
                            className="expert-input" 
                            style={{ padding: '10px 14px', fontSize: '13px' }}
                            onChange={(e) => {
                                const selected = availablePersons[e.target.value];
                                if (selected) handleImportPOA(selected);
                            }}
                            defaultValue=""
                        >
                            <option value="">{lang === 'en' ? '-- Select a registered person to copy their data --' : '-- Seleccione una persona ya registrada para copiar sus datos --'}</option>
                            {availablePersons.map((p, idx) => (
                                <option key={idx} value={idx}>{p.label}</option>
                            ))}
                        </select>
                    </motion.div>
                )}`.replace(/<\/?motion\.motion\.div/g, (m) => m.replace(/motion\./g, ''));

const poaNew = `{getAvailablePersons('poa').length > 0 && (
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
                    </motion.div>
                )}`.replace(/<\/?motion\.div/g, (m) => m.replace('motion.', ''));

if (s.includes('AUTOCOMPLETAR DESDE PERSONA')) {
  const start = s.indexOf('{availablePersons.length > 0 && (');
  const end = s.indexOf('<div className="poa-original-grid">', start);
  if (start > 0 && end > start) {
    s = s.slice(0, start) + poaNew + '\n\n                ' + s.slice(end);
  }
}

if (!s.includes('tryApplyPoaFromTypedName')) {
  s = s.replace(
    'poaFirstName: e.target.value})} />',
    "poaFirstName: e.target.value})} onBlur={tryApplyPoaFromTypedName} list={getPersonNameSuggestions(buildRegistry(formData, { arrayName: 'poa' })).length ? 'poa-names' : undefined} autoComplete=\"off\" />"
  );
  s = s.replace(
    'poaLastName: e.target.value})} />',
    "poaLastName: e.target.value})} onBlur={tryApplyPoaFromTypedName} list={getPersonNameSuggestions(buildRegistry(formData, { arrayName: 'poa' })).length ? 'poa-names' : undefined} autoComplete=\"off\" />"
  );
}

if (!s.includes('id="poa-names"')) {
  s = s.replace(
    '<datalist id="names-global">',
    `<datalist id="poa-names">
                {getPersonNameSuggestions(buildRegistry(formData, { arrayName: 'poa' })).map((name) => (
                    <option key={\`poa-\${name}\`} value={name} />
                ))}
            </datalist>

            <datalist id="names-global">`
  );
}

fs.writeFileSync(p, s);
console.log({
  dignitary: s.includes("mergePersonIntoRow('dignitaries'"),
  regNum: s.includes('registrationNumber'),
  personAuto: s.includes('PersonNameAutocomplete'),
  autocompletar: /AUTOCOMPLETAR/i.test(s),
  poaBlur: s.includes('tryApplyPoaFromTypedName'),
  beneficiary: s.includes('BENEFICIARY_REGISTRY_FILL') && s.includes('FundacionRegistryNameInput'),
});
