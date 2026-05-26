const fs = require('fs');
const path = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(path, 'utf8');

s = s.replace(/\n            \{false && formData\.councilMembers\.map\([\s\S]*?\n            \)\)\}/, '');

const tag = 'div';
const o = (cls) => `<${tag} className="${cls}">`;
const c = `</${tag}>`;

if (!s.includes("mergePersonIntoRow('dignitaries'")) {
  const dignOld = [
    o('expert-field full-width'),
    "                            <label>{t('fundacion.dignitary.fullName')}</label>",
    "                            <input className=\"expert-input\" value={d.fullName || ''} onChange={e => updateArrayField('dignitaries', i, 'fullName', e.target.value)} placeholder={t('fundacion.dignitary.fullNamePlaceholder')} />",
    c,
  ].join('\n');

  const dignNew = [
    o('expert-field full-width'),
    "                            <label>{t('fundacion.dignitary.fullName')}</label>",
    '                            <FundacionRegistryNameInput',
    "                                value={d.fullName || ''}",
    "                                onChange={(v) => updateArrayField('dignitaries', i, 'fullName', v)}",
    "                                registry={buildRegistry(formData, { arrayName: 'dignitaries', index: i })}",
    "                                onMatch={(data) => mergePersonIntoRow('dignitaries', i, data, FUNDACION_DIGNITARY_FIELDS)}",
    "                                placeholder={t('fundacion.dignitary.fullNamePlaceholder')}",
    '                            />',
    c,
  ].join('\n');

  if (s.includes(dignOld)) s = s.replace(dignOld, dignNew);
  else console.warn('dignitary block missing');
}

if (!s.includes("registrationNumber', e.target.value)")) {
  const addrOld = [
    o('expert-field full-width'),
    "                            <label>{t('fundacion.dignitary.address')}</label>",
    "                            <input className=\"expert-input\" value={d.address || ''} onChange={e => updateArrayField('dignitaries', i, 'address', e.target.value)} placeholder={t('fundacion.dignitary.addressPlaceholder')} />",
    c,
    '                    </motion.div>',
  ].join('\n').replace('</motion.div>', c);

  const addrNew = [
    o('expert-field full-width'),
    "                            <label>{t('fundacion.dignitary.address')}</label>",
    "                            <input className=\"expert-input\" value={d.address || ''} onChange={e => updateArrayField('dignitaries', i, 'address', e.target.value)} placeholder={t('fundacion.dignitary.addressPlaceholder')} />",
    c,
    o('expert-field full-width'),
    "                            <label>{t('fundacion.person.registrationNumber')}</label>",
    "                            <input className=\"expert-input\" value={d.registrationNumber || ''} onChange={e => updateArrayField('dignitaries', i, 'registrationNumber', e.target.value)} />",
    c,
    '                    </motion.div>',
  ].join('\n').replace(/<\/motion\.div>/g, c).replace(/<motion\.div/g, `<${tag}`);

  if (s.includes(addrOld)) s = s.replace(addrOld, addrNew);
}

s = s.replace(/\n                    <PersonNameAutocomplete[\s\S]*?\/>\n/, '\n');

const shareholderOld =
  "                            <input className=\"expert-input\" value={b.shareholder || ''} onChange={e => updateArrayField('beneficiaries', i, 'shareholder', e.target.value)} placeholder={t('fundacion.beneficiary.shareholderPlaceholder')} />";
const shareholderNew = [
  '                            <FundacionRegistryNameInput',
  "                                value={b.shareholder || ''}",
  "                                onChange={(v) => updateArrayField('beneficiaries', i, 'shareholder', v)}",
  '                                registry={registry}',
  '                                onMatch={(data) => {',
  '                                    const fill = pickFields(data, BENEFICIARY_REGISTRY_FILL);',
  "                                    if (Object.keys(fill).length) applyRegistryPerson('beneficiaries', i, fill);",
  '                                }}',
  "                                placeholder={t('fundacion.beneficiary.shareholderPlaceholder')}",
  '                            />',
].join('\n');

s = s.replace(/buildPersonRegistry\(/g, 'buildRegistry(');
if (s.includes(shareholderOld)) s = s.replace(shareholderOld, shareholderNew);

const poaBad = `{availablePersons.length > 0 && (
                    <motion.div style={{ marginBottom: '20px'`;
if (s.includes('AUTOCOMPLETAR DESDE PERSONA')) {
  s = s.replace(
    /                \{availablePersons\.length > 0 && \([\s\S]*?                \)\}\n\n                <div className="poa-original-grid">/,
    `                {getAvailablePersons('poa').length > 0 && (
                    ${o('person-copy-box')} style={{ marginBottom: '20px' }}>
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
                    ${c}

                <div className="poa-original-grid">`
  );
}

if (!s.includes('tryApplyPoaFromTypedName')) {
  if (!s.includes('getPersonNameSuggestions')) {
    s = s.replace(
      '    snapshotPersonFields,\n} from',
      '    getPersonNameSuggestions,\n    snapshotPersonFields,\n} from'
    );
  }
  s = s.replace(
    'poaFirstName: e.target.value})} />',
    'poaFirstName: e.target.value})} onBlur={tryApplyPoaFromTypedName} list={getPersonNameSuggestions(buildRegistry(formData, { arrayName: \'poa\' })).length ? \'poa-names\' : undefined} autoComplete="off" />'
  );
  s = s.replace(
    'poaLastName: e.target.value})} />',
    'poaLastName: e.target.value})} onBlur={tryApplyPoaFromTypedName} list={getPersonNameSuggestions(buildRegistry(formData, { arrayName: \'poa\' })).length ? \'poa-names\' : undefined} autoComplete="off" />'
  );
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
}

// Fix accidental motion.div tags from earlier edits
s = s.replace(/<\/?motion\.div/g, (m) => m.replace('motion.', ''));

fs.writeFileSync(path, s);
console.log({
  falseBlock: s.includes('{false &&'),
  personAuto: s.includes('PersonNameAutocomplete'),
  autocompletar: /AUTOCOMPLETAR/i.test(s),
  dignitaryFill: s.includes("mergePersonIntoRow('dignitaries'"),
  beneficiaryFill: s.includes('BENEFICIARY_REGISTRY_FILL'),
  poaBlur: s.includes('tryApplyPoaFromTypedName'),
});
