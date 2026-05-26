import fs from 'fs';
const p = 'C:/Users/USER/NexusDoc_DMS/client/src/pages/CumplimientoEntidadesForm.jsx';
let c = fs.readFileSync(p, 'utf8');

const d = 'd' + 'i' + 'v';
const open = '<' + d;
const close = '</' + d + '>';
const bad = '<' + 'm' + 'o' + 't' + 'i' + 'o' + 'n';
const badClose = '</' + 'm' + 'o' + 't' + 'i' + 'o' + 'n' + '>';
while (c.includes(bad)) c = c.replace(bad, open);
while (c.includes(badClose)) c = c.replace(badClose, close);

const pepStart = c.indexOf(open + ' className="expert-group"><label>{L(\'pep\')}</label>');
const fundsStart = c.indexOf(open + ' className="expert-group"><label>{L(\'fundsOther\')}</label>', pepStart);
if (pepStart < 0 || fundsStart < 0) {
  console.error('markers', pepStart, fundsStart);
  process.exit(1);
}

const insert = `        <KycPepQuestion
          label={L('pep')}
          hint={t('kyce.hints.pep')}
          pep={formData.pep}
          pepDetails={formData.pepDetails}
          onPepChange={setPep}
          onDetailsChange={(value) => setFormData({ ...formData, pepDetails: value })}
          detailsLabel={L('pepDetails')}
          pepNoLabel={t('kyce.pepNo')}
          pepYesLabel={t('kyce.pepYes')}
        />
        <KycFundsSourceGroup
          label={L('fundsSource')}
          instructions={t('kyce.hints.fundsSource')}
          options={FUNDS_OPTIONS}
          fundsSource={formData.fundsSource}
          onToggle={toggleFunds}
          getOptionLabel={(opt) => t(\`kyce.sources.\${opt.labelKey}\`)}
          primary={PRIMARY}
        />
`;

c = c.slice(0, pepStart) + insert + c.slice(fundsStart);

c = c.replace(
  "{t('kyce.steps.compliance')}\n      </h2>\n      <" + d + " style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>",
  "{t('kyce.steps.compliance')}\n      </h2>\n      <KycHintBox>{t('kyce.hints.compliance')}</KycHintBox>\n      <" + d + " style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>"
);

c = c.replace(
  "placeholder={t('kyce.beneficialOwnersHint')}",
  "placeholder={t('kyce.hints.beneficialOwners')}"
);

if (!c.includes('const setPep')) {
  c = c.replace(
    '  const toggleFunds = (key) => {',
    `  const setPep = (value) => {
    setFormData((prev) => ({
      ...prev,
      pep: value,
      pepDetails: value === 'No' ? '' : prev.pepDetails,
    }));
  };

  const toggleFunds = (key) => {`
  );
}

fs.writeFileSync(p, c);
console.log('ok');
