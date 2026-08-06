/**
 * Cumplimiento Individual (KYCI / PTL_KYC Individuals).
 * Campos y pasos: lib/kyciMasterSpec.cjs — 4 secciones del PDF maestro.
 * I Datos personales | II Contacto | III PEP y fondos | IV Declaración
 */
import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  ShieldCheck,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useT, useLang } from '../i18n';
import { extractRegisteredPeople } from '../utils/personExtractor';
import PersonSelector from '../components/common/PersonSelector';
import {
  KYC_PRIMARY,
  KycHintBox,
  KycPepQuestion,
  KycFundsSourceGroup,
  kycFormSharedStyles,
} from '../components/KycFormShared';
import { FUNDS_SOURCE_OPTIONS, MARITAL_STATUS_OPTIONS } from '../utils/kyciMasterSpec';
import { validateField } from '../utils/fieldValidators';

const FUNDS_OPTIONS = FUNDS_SOURCE_OPTIONS;

const emptyKyciState = () => ({
  fullName: '',
  birthDate: '',
  birthPlace: '',
  maritalStatus: '',
  nationality: '',
  passport: '',
  idCard: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: '',
  occupation: '',
  employer: '',
  pep: 'No',
  pepDetails: '',
  fundsSource: [],
  fundsOther: '',
  declarationName: '',
  declarationDate: new Date().toISOString().split('T')[0],
});

const CumplimientoIndividualForm = ({ initialData, onSave, saving }) => {
  const t = useT();
  const { lang } = useLang();
  const L = (key) => t(`kyci.fields.${key}`);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(emptyKyciState);
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
      const loaded = { ...initialData };
      if (!loaded.fullName && (loaded.firstName || loaded.secondName || loaded.lastName)) {
        loaded.fullName = [loaded.firstName, loaded.secondName, loaded.lastName].filter(Boolean).join(' ');
      }
      setFormData((prev) => ({
        ...prev,
        ...loaded,
        fundsSource: Array.isArray(loaded.fundsSource) ? loaded.fundsSource : prev.fundsSource,
        pep: loaded.pep || prev.pep,
      }));
    }
  }, [initialData]);

  const PRIMARY = KYC_PRIMARY;
  const SECONDARY = '#1e293b';
  const TOTAL_STEPS = 4;

  const validateStep = (s) => {
    const req = (v) => v !== undefined && v !== null && String(v).trim() !== '';
    if (s === 1) {
      return (
        req(formData.fullName) &&
        req(formData.birthDate) &&
        req(formData.birthPlace) &&
        req(formData.nationality) &&
        req(formData.passport)
      );
    }
    if (s === 2) {
      return (
        req(formData.phone) &&
        req(formData.email) &&
        req(formData.address) &&
        req(formData.city) &&
        req(formData.country) &&
        req(formData.occupation)
      );
    }
    if (s === 3) {
      const pepOk =
        formData.pep === 'No' ||
        (formData.pep === 'Sí' && req(formData.pepDetails));
      return req(formData.pep) && pepOk && formData.fundsSource.length > 0;
    }
    if (s === 4) {
      return req(formData.declarationName) && req(formData.declarationDate);
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      window.alert(t('kyci.validationIncomplete'));
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
        <User size={22} color={PRIMARY} /> {t('kyci.steps.personal')}
      </h2>
      <KycHintBox>{t('kyci.hints.personal')}</KycHintBox>
      <PersonSelector
        people={registeredPeople}
        onSelectPerson={(person) => {
          setFormData((prev) => ({
            ...prev,
            fullName: person.fullName || person.name || prev.fullName,
            birthDate: person.birthDate || prev.birthDate,
            birthPlace: person.birthPlace || prev.birthPlace,
            maritalStatus: person.maritalStatus || prev.maritalStatus,
            nationality: person.nationality || prev.nationality,
            passport: person.passport || person.idNumber || prev.passport,
            idCard: person.idCard || prev.idCard,
            phone: person.phone || prev.phone,
            email: person.email || prev.email,
            address: person.address || prev.address,
            city: person.city || prev.city,
            country: person.country || prev.country
          }));
        }}
        currentName={formData.fullName}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="expert-group" style={{ gridColumn: '1 / -1' }}><label>{L('fullName') || (lang === 'en' ? 'Full name' : 'Nombre completo')}</label><input className="expert-input" style={getErrorStyle('fullName')} value={formData.fullName} onChange={(e) => { setFormData({ ...formData, fullName: e.target.value }); clearErrorIfValid('fullName', e.target.value); }} onBlur={() => handleFieldBlur('fullName')} placeholder={lang === 'en' ? 'Full name as on Passport/ID' : 'Nombre completo como aparece en pasaporte/cédula'} required /><FieldError name="fullName" /></div>
        <div className="expert-group"><label>{L('birthDate')}</label><input type="date" className="expert-input" style={getErrorStyle('birthDate')} value={formData.birthDate} onChange={(e) => { setFormData({ ...formData, birthDate: e.target.value }); clearErrorIfValid('birthDate', e.target.value); }} onBlur={() => handleFieldBlur('birthDate')} required /><FieldError name="birthDate" /></div>
        <div className="expert-group"><label>{L('birthPlace')}</label><input className="expert-input" style={getErrorStyle('birthPlace')} value={formData.birthPlace} onChange={(e) => { setFormData({ ...formData, birthPlace: e.target.value }); clearErrorIfValid('birthPlace', e.target.value); }} onBlur={() => handleFieldBlur('birthPlace')} placeholder={lang === 'en' ? 'e.g. Madrid, Spain' : 'Ej: Madrid, España'} required /><FieldError name="birthPlace" /></div>
        <div className="expert-group"><label>{L('maritalStatus')}</label>
          <select className="expert-input" value={formData.maritalStatus} onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}>
            <option value="">—</option>
            {MARITAL_STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="expert-group"><label>{L('nationality')}</label><input className="expert-input" style={getErrorStyle('nationality')} value={formData.nationality} onChange={(e) => { setFormData({ ...formData, nationality: e.target.value }); clearErrorIfValid('nationality', e.target.value); }} onBlur={() => handleFieldBlur('nationality')} placeholder={lang === 'en' ? 'e.g. Spanish' : 'Ej: Española'} required /><FieldError name="nationality" /></div>
        <div className="expert-group"><label>{L('passport')}</label><input className="expert-input" style={getErrorStyle('passport')} value={formData.passport} onChange={(e) => { setFormData({ ...formData, passport: e.target.value }); clearErrorIfValid('passport', e.target.value); }} onBlur={() => handleFieldBlur('passport')} placeholder={lang === 'en' ? 'Passport number' : 'Número de pasaporte'} required /><FieldError name="passport" /></div>
        <div className="expert-group"><label>{L('idCard')}</label><input className="expert-input" style={getErrorStyle('idCard')} value={formData.idCard} onChange={(e) => { setFormData({ ...formData, idCard: e.target.value }); clearErrorIfValid('idCard', e.target.value); }} onBlur={() => handleFieldBlur('idCard')} placeholder={lang === 'en' ? 'National ID' : 'Cédula de identidad'} /><FieldError name="idCard" /></div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Phone size={22} color={PRIMARY} /> {t('kyci.steps.contact')}
      </h2>
      <KycHintBox>{t('kyci.hints.contact')}</KycHintBox>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="expert-group"><label>{L('phone')}</label><input className="expert-input" style={getErrorStyle('phone')} value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); clearErrorIfValid('phone', e.target.value); }} onBlur={() => handleFieldBlur('phone')} placeholder={lang === 'en' ? '+1 234 567 890' : '+34 600 000 000'} required /><FieldError name="phone" /></div>
        <div className="expert-group"><label>{L('email')}</label><input type="email" className="expert-input" style={getErrorStyle('email')} value={formData.email} onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearErrorIfValid('email', e.target.value); }} onBlur={() => handleFieldBlur('email')} placeholder="correo@ejemplo.com" required /><FieldError name="email" /></div>
        <div className="expert-group" style={{ gridColumn: '1 / -1' }}><label>{L('address')}</label><input className="expert-input" style={getErrorStyle('address')} value={formData.address} onChange={(e) => { setFormData({ ...formData, address: e.target.value }); clearErrorIfValid('address', e.target.value); }} onBlur={() => handleFieldBlur('address')} placeholder={lang === 'en' ? 'Complete residential address' : 'Dirección residencial completa'} required /><FieldError name="address" /></div>
        <div className="expert-group"><label>{L('city')}</label><input className="expert-input" style={getErrorStyle('city')} value={formData.city} onChange={(e) => { setFormData({ ...formData, city: e.target.value }); clearErrorIfValid('city', e.target.value); }} onBlur={() => handleFieldBlur('city')} placeholder={lang === 'en' ? 'City' : 'Ciudad'} required /><FieldError name="city" /></div>
        <div className="expert-group"><label>{L('country')}</label><input className="expert-input" style={getErrorStyle('country')} value={formData.country} onChange={(e) => { setFormData({ ...formData, country: e.target.value }); clearErrorIfValid('country', e.target.value); }} onBlur={() => handleFieldBlur('country')} placeholder={lang === 'en' ? 'Country' : 'País'} required /><FieldError name="country" /></div>
        <div className="expert-group"><label>{L('occupation')}</label><input className="expert-input" style={getErrorStyle('occupation')} value={formData.occupation} onChange={(e) => { setFormData({ ...formData, occupation: e.target.value }); clearErrorIfValid('occupation', e.target.value); }} onBlur={() => handleFieldBlur('occupation')} placeholder={lang === 'en' ? 'Profession / Occupation' : 'Profesión u oficio'} required /><FieldError name="occupation" /></div>
        <div className="expert-group"><label>{L('employer')}</label><input className="expert-input" style={getErrorStyle('employer')} value={formData.employer} onChange={(e) => { setFormData({ ...formData, employer: e.target.value }); clearErrorIfValid('employer', e.target.value); }} onBlur={() => handleFieldBlur('employer')} placeholder={lang === 'en' ? 'Company name' : 'Nombre de la empresa'} /><FieldError name="employer" /></div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={22} color={PRIMARY} /> {t('kyci.steps.compliance')}
      </h2>
      <KycHintBox>{t('kyci.hints.compliance')}</KycHintBox>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <KycPepQuestion
          label={L('pep')}
          hint={t('kyci.hints.pep')}
          pep={formData.pep}
          pepDetails={formData.pepDetails}
          onPepChange={setPep}
          onDetailsChange={(value) => setFormData({ ...formData, pepDetails: value })}
          detailsLabel={L('pepDetails')}
          pepNoLabel={t('kyci.pepNo')}
          pepYesLabel={t('kyci.pepYes')}
        />
        <KycFundsSourceGroup
          label={L('fundsSource')}
          instructions={t('kyci.hints.fundsSource')}
          options={FUNDS_OPTIONS}
          fundsSource={formData.fundsSource}
          onToggle={toggleFunds}
          getOptionLabel={(opt) => t(`kyci.sources.${opt.labelKey}`)}
          primary={PRIMARY}
        />
        <div className="expert-group"><label>{L('fundsOther')}</label><input className="expert-input" style={getErrorStyle('fundsOther')} value={formData.fundsOther} onChange={(e) => { setFormData({ ...formData, fundsOther: e.target.value }); clearErrorIfValid('fundsOther', e.target.value); }} onBlur={() => handleFieldBlur('fundsOther')} placeholder={lang === 'en' ? 'Required if applicable...' : 'Obligatorio si aplica...'} /><FieldError name="fundsOther" /></div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileCheck size={22} color={PRIMARY} /> {t('kyci.steps.declaration')}
      </h2>
      <KycHintBox>{t('kyci.hints.declaration')}</KycHintBox>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div className="expert-group"><label>{L('declarationName')}</label><input className="expert-input" style={getErrorStyle('declarationName')} value={formData.declarationName} onChange={(e) => { setFormData({ ...formData, declarationName: e.target.value }); clearErrorIfValid('declarationName', e.target.value); }} onBlur={() => handleFieldBlur('declarationName')} placeholder={lang === 'en' ? 'e.g. John Doe' : 'Ej: Juan Pérez'} required /><FieldError name="declarationName" /></div>
        <div className="expert-group"><label>{L('declarationDate')}</label><input type="date" className="expert-input" style={getErrorStyle('declarationDate')} value={formData.declarationDate} onChange={(e) => { setFormData({ ...formData, declarationDate: e.target.value }); clearErrorIfValid('declarationDate', e.target.value); }} onBlur={() => handleFieldBlur('declarationDate')} required /><FieldError name="declarationDate" /></div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', padding: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: SECONDARY }}>{t('formType.Cumplimiento Individual')}</h1>
        <button type="button" onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save">
          <Save size={18} /> {saving ? t('common.saving') : t('kyci.saveDraft')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: '20px' }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{ flex: 1, position: 'relative' }}>
            <div style={{ height: '3px', background: step >= s ? PRIMARY : '#e2e8f0', borderRadius: '3px', transition: 'all 0.3s' }} />
            <div style={{ position: 'absolute', top: '-18px', left: 0, fontSize: '9px', fontWeight: 700, color: step >= s ? PRIMARY : '#94a3b8' }}>
              {t('kyci.stepLabel', { step: s })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e8edf2' }}>
          <button type="button" onClick={() => setStep((prev) => prev - 1)} disabled={step === 1} className="expert-btn-nav" style={{ opacity: step === 1 ? 0.3 : 1 }}>
            <ChevronLeft size={18} /> {t('common.back')}
          </button>
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={nextStep} className="expert-btn-primary">
              {t('common.continue')} <ChevronRight size={18} />
            </button>
          ) : (
            <button type="button" onClick={() => validateStep(4) && onSave(formData, true)} disabled={saving} className="expert-btn-finish">
              <CheckCircle2 size={18} /> {saving ? t('common.saving') : t('common.finishSave')}
            </button>
          )}
        </div>
      </div>

      <style>{kycFormSharedStyles(PRIMARY)}</style>
    </div>
  );
};

export default CumplimientoIndividualForm;
