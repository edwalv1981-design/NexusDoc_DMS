const fs = require('fs');
let s = fs.readFileSync('client/src/pages/FundacionForm.jsx', 'utf8');

if (s.includes('handleImportPOA(selected)')) {
  console.log('POA copy already present');
  process.exit(0);
}

const marker = "Paso 8: Power Of Attorney / Poderes (Opcional)'}</h2>";
const idx = s.indexOf(marker);
if (idx === -1) {
  console.error('marker not found');
  process.exit(1);
}
const insertAt = idx + marker.length;
const block = `

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
                )}`;

s = s.slice(0, insertAt) + block + s.slice(insertAt);
fs.writeFileSync('client/src/pages/FundacionForm.jsx', s);
console.log('POA copy inserted');
