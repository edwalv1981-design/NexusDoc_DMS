const fs = require('fs');
const p = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('const PersonCopySelect')) {
  const marker = '    const updateArrayField = (arrayName, index, field, value) => {';
  const block = `    const PersonCopySelect = ({ excludeStep, onSelect }) => {
        const persons = getAvailablePersons(excludeStep);
        if (!persons.length) return null;
        return (
            <div className="person-copy-box">
                <label>{t('fundacion.copyFrom')}</label>
                <select
                    className="expert-input"
                    defaultValue=""
                    onChange={(e) => {
                        const picked = persons[Number(e.target.value)];
                        if (picked) onSelect(picked);
                        e.target.value = '';
                    }}
                >
                    <option value="">{t('fundacion.copySelect')}</option>
                    {persons.map((p, idx) => (
                        <option key={idx} value={idx}>{p.label}</option>
                    ))}
                </select>
            </div>
        );
    };

    const handleImportPOA = (person) => {
        if (!person?.data) return;
        const p = snapshotFromPerson(person.data);
        setFormData(prev => ({
            ...prev,
            poaFirstName: p.firstName,
            poaMiddleName: p.secondName,
            poaLastName: p.lastName,
            poaBirthDate: p.birthDate,
            poaMaritalStatus: p.maritalStatus,
            poaNationality: p.nationality,
            poaPassport: p.passport,
            poaIdCard: p.idCard,
            poaPhone: p.phone,
            poaEmail: p.email,
            poaAddress: p.address,
            poaCity: p.city,
            poaCountry: p.country,
        }));
    };

`;
  if (!s.includes(marker)) {
    console.error('marker not found');
    process.exit(1);
  }
  s = s.replace(marker, block + marker);
  fs.writeFileSync(p, s);
  console.log('added PersonCopySelect + handleImportPOA');
} else {
  console.log('already present');
}
