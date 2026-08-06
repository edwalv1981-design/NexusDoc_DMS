import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useT } from '../i18n';
import { extractRegisteredPeople } from '../utils/personExtractor';
import PersonSelector from '../components/common/PersonSelector';
import {
  KYC_PRIMARY,
  KycHintBox,
  KycPepQuestion,
  KycFundsSourceGroup,
  kycFormSharedStyles,
} from '../components/KycFormShared';
import { validateField } from '../utils/fieldValidators';

const ENTITY_TYPE_OPTIONS = ['S.A.', 'S. de R.L.', 'LLC', 'Fundación', 'Trust', 'Otra'];

const FUNDS_OPTIONS = [
  { key: 'Bienes de la entidad', labelKey: 'bienes' },
  { key: 'Inversiones Financieras', labelKey: 'inversiones' },
  { key: 'Ingresos por negocios', labelKey: 'negocios' },
  { key: 'Préstamos / créditos', labelKey: 'prestamos' },
  { key: 'Aportes de socios / capital', labelKey: 'capital' },
];

const emptyKyceState = () => ({
  legalName: '',
  tradeName: '',
  entityType: '',
  incorporationDate: '',
  jurisdiction: '',
  taxId: '',
  registrationNumber: '',
  registeredAddress: '',
  phone: '',
  email: '',
  city: '',
  country: '',
  businessActivity: '',
  website: '',
  legalRepName: '',
  legalRepId: '',
  legalRepNationality: '',
  beneficialOwners: '',
  pep: 'No',
  pepDetails: '',
  fundsSource: [],
  fundsOther: '',
  declarationName: '',
  declarationDate: new Date().toISOString().split('T')[0],
});

const CumplimientoEntidadesForm = ({ initialData, onSave, saving }) => {
  const t = useT();
  const L = (key) => t(`kyce.fields.${key}`);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(emptyKyceState);
  const [fieldErrors, setFieldErrors] = useState({});
  const registeredPeople = extractRegisteredPeople(formData);

  const handleFieldBlur = (fieldName) => {
    const error = validateField(fieldName, formData[fieldName]);
    setFieldErrors(prev => {
      const next = { ...prev };
      if (error) next[fieldName] = error;
      else delete next[fieldName];
      return next;
    });
  };
  const clearErrorIfValid = (fieldName, newValue) => {
    if (fieldErrors[fieldName]) {
      const err = validateField(fieldName, newValue);
      if (!err) setFieldErrors(prev => { const n = { ...prev }; delete n[fieldName]; return n; });
    }
  };
  const getErrorStyle = (name) => fieldErrors[name] ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #fecaca' } : {};
  const FieldError = ({ name }) => fieldErrors[name] ? <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '1px' }}>{fieldErrors[name]}</span> : null;

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        fundsSource: Array.isArray(initialData.fundsSource) ? initialData.fundsSource : prev.fundsSource,
        pep: initialData.pep || prev.pep,
      }));
    }
  }, [initialData]);

  const PRIMARY = KYC_PRIMARY;
  const SECONDARY = '#1e293b';
  const TOTAL_STEPS = 3;

  const validateStep = (s) => {
    const req = (v) => v !== undefined && v !== null && String(v).trim() !== '';
    if (s === 1) {
      return (
        req(formData.legalName) &&
        req(formData.entityType) &&
        req(formData.incorporationDate) &&
        req(formData.jurisdiction) &&
        req(formData.taxId) &&
        req(formData.registeredAddress)
      );
    }
    if (s === 2) {
      return (
        req(formData.phone) &&
        req(formData.email) &&
        req(formData.city) &&
        req(formData.country) &&
        req(formData.businessActivity)
      );
    }
    if (s === 3) {
      const pepOk =
        formData.pep === 'No' ||
        (formData.pep === 'Sí' && req(formData.pepDetails));
      return (
        req(formData.legalRepName) &&
        req(formData.legalRepId) &&
        req(formData.beneficialOwners) &&
        req(formData.pep) &&
        pepOk &&
        formData.fundsSource.length > 0 &&
        req(formData.declarationName) &&
        req(formData.declarationDate)
      );
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      window.alert(t('kyce.validationIncomplete'));
      return;
    }
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const toggleFunds = (key) => {
    setFormData((prev) => {
      const has = prev.fundsSource.includes(key);
      return {
        ...prev,
        fundsSource: has
          ? prev.fundsSource.filter((x) => x !== key)
          : [...prev.fundsSource, key],
      };
    });
  };

  const setPep = (value) => {
    setFormData((prev) => ({
      ...prev,
      pep: value,
      pepDetails: value === 'No' ? '' : prev.pepDetails,
    }));
  };

  const renderStep1 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Building2 size={22} color={PRIMARY} /> {t('kyce.steps.entity')}
      </h2>
      <KycHintBox>{t('kyce.hints.entity')}</KycHintBox>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="expert-group" style={{ gridColumn: '1 / -1' }}><label>{L('legalName')}</label><input className="expert-input" style={getErrorStyle('legalName')} value={formData.legalName} onChange={(e) => { setFormData({ ...formData, legalName: e.target.value }); clearErrorIfValid('legalName', e.target.value); }} onBlur={() => handleFieldBlur('legalName')} placeholder="Ej: NexusDoc Corp S.A." required /><FieldError name="legalName" /></div>
        <div className="expert-group"><label>{L('tradeName')}</label><input className="expert-input" style={getErrorStyle('tradeName')} value={formData.tradeName} onChange={(e) => { setFormData({ ...formData, tradeName: e.target.value }); clearErrorIfValid('tradeName', e.target.value); }} onBlur={() => handleFieldBlur('tradeName')} placeholder="Ej: NexusDoc" /><FieldError name="tradeName" /></div>
        <div className="expert-group"><label>{L('entityType')}</label>
          <select className="expert-input" value={formData.entityType} onChange={(e) => setFormData({ ...formData, entityType: e.target.value })} required>
            <option value="">—</option>
            {ENTITY_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="expert-group"><label>{L('incorporationDate')}</label><input type="date" className="expert-input" style={getErrorStyle('incorporationDate')} value={formData.incorporationDate} onChange={(e) => { setFormData({ ...formData, incorporationDate: e.target.value }); clearErrorIfValid('incorporationDate', e.target.value); }} onBlur={() => handleFieldBlur('incorporationDate')} required /><FieldError name="incorporationDate" /></div>
        <div className="expert-group"><label>{L('jurisdiction')}</label><input className="expert-input" style={getErrorStyle('jurisdiction')} value={formData.jurisdiction} onChange={(e) => { setFormData({ ...formData, jurisdiction: e.target.value }); clearErrorIfValid('jurisdiction', e.target.value); }} onBlur={() => handleFieldBlur('jurisdiction')} placeholder="Ej: Delaware, USA" required /><FieldError name="jurisdiction" /></div>
        <div className="expert-group"><label>{L('taxId')}</label><input className="expert-input" style={getErrorStyle('taxId')} value={formData.taxId} onChange={(e) => { setFormData({ ...formData, taxId: e.target.value }); clearErrorIfValid('taxId', e.target.value); }} onBlur={() => handleFieldBlur('taxId')} placeholder="RUC / NIT" required /><FieldError name="taxId" /></div>
        <div className="expert-group"><label>{L('registrationNumber')}</label><input className="expert-input" style={getErrorStyle('registrationNumber')} value={formData.registrationNumber} onChange={(e) => { setFormData({ ...formData, registrationNumber: e.target.value }); clearErrorIfValid('registrationNumber', e.target.value); }} onBlur={() => handleFieldBlur('registrationNumber')} placeholder="No. de Registro" /><FieldError name="registrationNumber" /></div>
        <div className="expert-group" style={{ gridColumn: '1 / -1' }}><label>{L('registeredAddress')}</label><input className="expert-input" style={getErrorStyle('registeredAddress')} value={formData.registeredAddress} onChange={(e) => { setFormData({ ...formData, registeredAddress: e.target.value }); clearErrorIfValid('registeredAddress', e.target.value); }} onBlur={() => handleFieldBlur('registeredAddress')} placeholder="Dirección registrada..." required /><FieldError name="registeredAddress" /></div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Phone size={22} color={PRIMARY} /> {t('kyce.steps.contact')}
      </h2>
      <KycHintBox>{t('kyce.hints.contact')}</KycHintBox>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="expert-group"><label>{L('phone')}</label><input className="expert-input" style={getErrorStyle('phone')} value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); clearErrorIfValid('phone', e.target.value); }} onBlur={() => handleFieldBlur('phone')} placeholder="+1 234 567 890" required /><FieldError name="phone" /></div>
        <div className="expert-group"><label>{L('email')}</label><input type="email" className="expert-input" style={getErrorStyle('email')} value={formData.email} onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearErrorIfValid('email', e.target.value); }} onBlur={() => handleFieldBlur('email')} placeholder="correo@ejemplo.com" required /><FieldError name="email" /></div>
        <div className="expert-group"><label>{L('city')}</label><input className="expert-input" style={getErrorStyle('city')} value={formData.city} onChange={(e) => { setFormData({ ...formData, city: e.target.value }); clearErrorIfValid('city', e.target.value); }} onBlur={() => handleFieldBlur('city')} placeholder="Ciudad" required /><FieldError name="city" /></div>
        <div className="expert-group"><label>{L('country')}</label><input className="expert-input" style={getErrorStyle('country')} value={formData.country} onChange={(e) => { setFormData({ ...formData, country: e.target.value }); clearErrorIfValid('country', e.target.value); }} onBlur={() => handleFieldBlur('country')} placeholder="País" required /><FieldError name="country" /></div>
        <div className="expert-group" style={{ gridColumn: '1 / -1' }}><label>{L('businessActivity')}</label><textarea className="expert-input" style={getErrorStyle('businessActivity')} rows={2} value={formData.businessActivity} onChange={(e) => { setFormData({ ...formData, businessActivity: e.target.value }); clearErrorIfValid('businessActivity', e.target.value); }} onBlur={() => handleFieldBlur('businessActivity')} placeholder="Descripción de la actividad..." required /><FieldError name="businessActivity" /></div>
        <div className="expert-group"><label>{L('website')}</label><input className="expert-input" style={getErrorStyle('website')} value={formData.website} onChange={(e) => { setFormData({ ...formData, website: e.target.value }); clearErrorIfValid('website', e.target.value); }} onBlur={() => handleFieldBlur('website')} placeholder="www.ejemplo.com" /><FieldError name="website" /></div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={22} color={PRIMARY} /> {t('kyce.steps.compliance')}
      </h2>
      <KycHintBox>{t('kyce.hints.compliance')}</KycHintBox>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <PersonSelector
          people={registeredPeople}
          onSelectPerson={(person) => {
            setFormData((prev) => ({
              ...prev,
              legalRepName: person.fullName || person.name || prev.legalRepName,
              legalRepId: person.passport || person.idNumber || prev.legalRepId,
              legalRepNationality: person.nationality || prev.legalRepNationality
            }));
          }}
          currentName={formData.legalRepName}
          label="¿Reutilizar datos para el Representante Legal?"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div className="expert-group"><label>{L('legalRepName')}</label><input className="expert-input" style={getErrorStyle('legalRepName')} value={formData.legalRepName} onChange={(e) => { setFormData({ ...formData, legalRepName: e.target.value }); clearErrorIfValid('legalRepName', e.target.value); }} onBlur={() => handleFieldBlur('legalRepName')} placeholder="Nombre del representante" required /><FieldError name="legalRepName" /></div>
          <div className="expert-group"><label>{L('legalRepId')}</label><input className="expert-input" style={getErrorStyle('legalRepId')} value={formData.legalRepId} onChange={(e) => { setFormData({ ...formData, legalRepId: e.target.value }); clearErrorIfValid('legalRepId', e.target.value); }} onBlur={() => handleFieldBlur('legalRepId')} placeholder="Documento / Pasaporte" required /><FieldError name="legalRepId" /></div>
          <div className="expert-group"><label>{L('legalRepNationality')}</label><input className="expert-input" style={getErrorStyle('legalRepNationality')} value={formData.legalRepNationality} onChange={(e) => { setFormData({ ...formData, legalRepNationality: e.target.value }); clearErrorIfValid('legalRepNationality', e.target.value); }} onBlur={() => handleFieldBlur('legalRepNationality')} placeholder="Nacionalidad" /><FieldError name="legalRepNationality" /></div>
        </div>
        <div className="expert-group"><label>{L('beneficialOwners')}</label><textarea className="expert-input" style={getErrorStyle('beneficialOwners')} rows={3} value={formData.beneficialOwners} onChange={(e) => { setFormData({ ...formData, beneficialOwners: e.target.value }); clearErrorIfValid('beneficialOwners', e.target.value); }} onBlur={() => handleFieldBlur('beneficialOwners')} required placeholder={t('kyce.hints.beneficialOwners')} /><FieldError name="beneficialOwners" /></div>
                <KycPepQuestion
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
          getOptionLabel={(opt) => t(`kyce.sources.${opt.labelKey}`)}
          primary={PRIMARY}
        />
<div className="expert-group"><label>{L('fundsOther')}</label><input className="expert-input" style={getErrorStyle('fundsOther')} value={formData.fundsOther} onChange={(e) => { setFormData({ ...formData, fundsOther: e.target.value }); clearErrorIfValid('fundsOther', e.target.value); }} onBlur={() => handleFieldBlur('fundsOther')} placeholder="Obligatorio si aplica..." /><FieldError name="fundsOther" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="expert-group"><label>{L('declarationName')}</label><input className="expert-input" style={getErrorStyle('declarationName')} value={formData.declarationName} onChange={(e) => { setFormData({ ...formData, declarationName: e.target.value }); clearErrorIfValid('declarationName', e.target.value); }} onBlur={() => handleFieldBlur('declarationName')} placeholder="Nombre de quien declara" required /><FieldError name="declarationName" /></div>
          <div className="expert-group"><label>{L('declarationDate')}</label><input type="date" className="expert-input" style={getErrorStyle('declarationDate')} value={formData.declarationDate} onChange={(e) => { setFormData({ ...formData, declarationDate: e.target.value }); clearErrorIfValid('declarationDate', e.target.value); }} onBlur={() => handleFieldBlur('declarationDate')} required /><FieldError name="declarationDate" /></div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', padding: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: SECONDARY }}>{t('formType.Cumplimiento Entidades')}</h1>
        <button type="button" onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save">
          <Save size={18} /> {saving ? t('common.saving') : t('kyce.saveDraft')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: '20px' }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ flex: 1, position: 'relative' }}>
            <div style={{ height: '3px', background: step >= s ? PRIMARY : '#e2e8f0', borderRadius: '3px', transition: 'all 0.3s' }} />
            <div style={{ position: 'absolute', top: '-18px', left: 0, fontSize: '9px', fontWeight: 700, color: step >= s ? PRIMARY : '#94a3b8' }}>
              {t('kyce.stepLabel', { step: s })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e8edf2' }}>
          <button type="button" onClick={() => setStep((prev) => prev - 1)} disabled={step === 1} className="expert-btn-nav" style={{ opacity: step === 1 ? 0.3 : 1 }}>
            <ChevronLeft size={18} /> {t('common.back')}
          </button>
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={nextStep} className="expert-btn-primary">
              {t('common.continue')} <ChevronRight size={18} />
            </button>
          ) : (
            <button type="button" onClick={() => validateStep(3) && onSave(formData, true)} disabled={saving} className="expert-btn-finish">
              <CheckCircle2 size={18} /> {saving ? t('common.saving') : t('common.finishSave')}
            </button>
          )}
        </div>
      </div>

      <style>{kycFormSharedStyles(PRIMARY)}</style>
    </div>
  );
};

export default CumplimientoEntidadesForm;
