/**
 * Cumplimiento Individual (KYCI) — plantilla oficial
 * "PTL_KYC – Compliance Form – Individuals".
 * Campos, obligatorios y orden: lib/kyciMasterSpec.cjs (misma fuente que el PDF).
 *
 *  Paso 1  Solicitante (entidad panameña, calidad del solicitante, identidad, contacto)
 *  Paso 2  Residencia fiscal y FATCA
 *  Paso 3  Origen del patrimonio, PEP y sanciones
 *  Paso 4  Documentos de identidad, autorización de datos, nombre y fecha
 */
import React, { useState, useEffect } from 'react';
import {
  User,
  Landmark,
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
import { KYC_PRIMARY, KycHintBox, kycFormSharedStyles, describeMissingFields, scrollToFirstMissing } from '../components/KycFormShared';
import {
  YES,
  NO,
  MARITAL_STATUS_OPTIONS,
  APPLICANT_ROLE_OPTIONS,
  CERTIFIED_DOC_OPTIONS,
  DATA_CONSENT_TEXT,
  YES_NO_DETAILS,
  FIELDS,
  FORM_LABELS,
  FORM_GUIDES,
  missingFieldsForStep,
  missingFields,
  computeFullName,
  splitLegacyFullName,
  legacySourceOfWealth,
} from '../utils/kyciMasterSpec';
import { validateField } from '../utils/fieldValidators';
import ReadOnlyFieldset from '../components/common/ReadOnlyFieldset';
import { withProgress } from '../utils/formProgress';

const TOTAL_STEPS = 4;

const emptyKyciState = () => ({
  panamaEntityName: '',
  applicantRoles: [],
  firstName: '',
  secondName: '',
  lastName: '',
  birthDate: '',
  nationality: '',
  birthPlace: '',
  passport: '',
  address: '',
  maritalStatus: '',
  phone: '',
  email: '',
  idCard: '',
  taxResidenceCountries: '',
  otherTaxResidence: '',
  otherTaxResidenceDetails: '',
  usPerson: '',
  usTin: '',
  usDetails: '',
  sourceOfWealth: '',
  pep: '',
  pepDetails: '',
  offenceConvicted: '',
  offenceConvictedDetails: '',
  offenceBankrupt: '',
  offenceBankruptDetails: '',
  offenceInvestigation: '',
  offenceInvestigationDetails: '',
  certifiedDocs: [],
  dataConsent: '',
  declarationName: '',
  declarationDate: new Date().toISOString().split('T')[0],
});

/** Trámites guardados con el formato anterior: se adaptan sin borrar sus datos. */
function adaptLoadedData(initialData) {
  const loaded = { ...initialData };
  if (!loaded.firstName && !loaded.lastName && loaded.fullName) {
    Object.assign(loaded, splitLegacyFullName(loaded.fullName));
  }
  if (!String(loaded.sourceOfWealth || '').trim()) {
    const legacy = legacySourceOfWealth(loaded);
    if (legacy) loaded.sourceOfWealth = legacy;
  }
  if (!Array.isArray(loaded.applicantRoles)) loaded.applicantRoles = [];
  if (!Array.isArray(loaded.certifiedDocs)) loaded.certifiedDocs = [];
  return loaded;
}

const STEP_META = [
  { icon: User, es: 'I. Solicitante', en: 'I. Applicant' },
  { icon: Landmark, es: 'II. Residencia fiscal y FATCA', en: 'II. Tax residency and FATCA' },
  { icon: ShieldCheck, es: 'III. Origen del patrimonio, PEP y sanciones', en: 'III. Source of wealth, PEP and offences' },
  { icon: FileCheck, es: 'IV. Documentos, autorización y firma', en: 'IV. Documents, authorization and signature' },
];

const STEP_HINTS = {
  es: [
    'Este formulario lo completa cada persona (el “Solicitante”) que sea accionista con 10% o más del capital, beneficiario final, director, socio general, firmante autorizado, apoderado, fundador/fideicomitente, ejecutor o protector. Los campos marcados con * son obligatorios.',
    'Indique su residencia fiscal. Si es persona o residente fiscal de EE. UU., indique su número de identificación tributaria (TIN).',
    'Detalle el origen de su patrimonio y responda todas las preguntas de Sí/No. Si alguna respuesta es “Sí”, el detalle es obligatorio.',
    'Marque los documentos que adjunta (copias escaneadas, vigentes y originales). Todos son obligatorios excepto la referencia profesional. Luego lea y acepte la autorización de uso de datos, y escriba su nombre. El PDF incluye el recuadro “Signature of Applicant” para la firma.',
  ],
  en: [
    'This form is completed by each individual (the “Applicant”) who is a 10%+ shareholder, beneficial owner, director, general partner, authorised signatory, power of attorney holder, founder/settlor, enforcer or protector. Fields marked * are required.',
    'State your tax residency. If you are a U.S. Person or U.S. tax resident, please provide your tax identification number (TIN).',
    'Describe your source of wealth and answer every Yes/No question. If any answer is “Yes”, details are required.',
    'Tick the documents you are attaching (scanned copies, valid and original). All are required except the professional reference. Then read and accept the data authorization, and type your name. The PDF includes the “Signature of Applicant” box.',
  ],
};

const CumplimientoIndividualForm = ({ initialData, onSave, saving, readOnly = false, startStep }) => {
  const t = useT();
  const { lang } = useLang();
  const labels = FORM_LABELS[lang === 'en' ? 'en' : 'es'];
  const guides = FORM_GUIDES[lang === 'en' ? 'en' : 'es'];
  const [step, setStep] = useState(() => (startStep >= 1 && startStep <= TOTAL_STEPS ? startStep : 1));
  const [formData, setFormData] = useState(emptyKyciState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [missing, setMissing] = useState([]);
  const registeredPeople = extractRegisteredPeople(formData);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...adaptLoadedData(initialData) }));
    }
  }, [initialData]);

  const PRIMARY = KYC_PRIMARY;
  const SECONDARY = '#1e293b';
  const yesLabel = lang === 'en' ? 'Yes' : 'Sí';
  const noLabel = 'No';

  const isMissing = (key) => missing.includes(key);
  const errorStyle = (key) =>
    fieldErrors[key] || isMissing(key) ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #fecaca' } : {};
  const FieldError = ({ name }) =>
    fieldErrors[name] ? (
      <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600, display: 'block', marginTop: '2px' }}>{fieldErrors[name]}</span>
    ) : null;

  const setValue = (key, value) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      // Al responder "No", el detalle asociado se limpia.
      if (YES_NO_DETAILS[key] && value === NO) next[YES_NO_DETAILS[key]] = '';
      if (key === 'usPerson' && value === NO) { next.usTin = ''; next.usDetails = ''; }
      return next;
    });
    if (missing.includes(key)) setMissing((m) => m.filter((k) => k !== key));
    if (fieldErrors[key] && !validateField(key, value)) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  const handleBlur = (key) => {
    const error = validateField(key, formData[key]);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[key] = error;
      else delete next[key];
      return next;
    });
  };

  const toggleInList = (key, optionKey) => {
    const list = Array.isArray(formData[key]) ? formData[key] : [];
    const next = list.includes(optionKey) ? list.filter((x) => x !== optionKey) : [...list, optionKey];
    setValue(key, next);
    setMissing((m) => m.filter((k) => k !== key && k !== `${key}.${optionKey}`));
  };

  const shown = (key) => {
    const cond = FIELDS[key]?.showIf;
    return !cond || formData[cond.field] === cond.value;
  };
  const isRequired = (key) => {
    const def = FIELDS[key];
    return Boolean(def?.required || (def?.requiredIf && formData[def.requiredIf.field] === def.requiredIf.value));
  };
  // Texto guía de la plantilla, debajo de la etiqueta de cada campo.
  const Label = ({ k }) => (
    <>
      <label>
        {labels[k]}
        {isRequired(k) ? <span style={{ color: '#ef4444' }}> *</span> : null}
      </label>
      {guides[k] ? <span className="kyci-guide">{guides[k]}</span> : null}
    </>
  );

  const textInput = (key, { type = 'text', placeholder, full } = {}) =>
    shown(key) ? (
      <div className="expert-group" style={full ? { gridColumn: '1 / -1' } : undefined} key={key}>
        <Label k={key} />
        <input
          type={type}
          className="expert-input"
          style={errorStyle(key)}
          value={formData[key] || ''}
          onChange={(e) => setValue(key, e.target.value)}
          onBlur={() => handleBlur(key)}
          placeholder={placeholder}
        />
        <FieldError name={key} />
      </div>
    ) : null;

  const textArea = (key, { placeholder } = {}) =>
    shown(key) ? (
      <div className="expert-group" style={{ gridColumn: '1 / -1' }} key={key}>
        <Label k={key} />
        <textarea
          className="expert-input"
          rows={3}
          style={{ ...errorStyle(key), resize: 'vertical' }}
          value={formData[key] || ''}
          onChange={(e) => setValue(key, e.target.value)}
          placeholder={placeholder}
        />
      </div>
    ) : null;

  const yesNo = (key) => (
    <div className="expert-group kyci-yesno" style={{ gridColumn: '1 / -1' }} key={key}>
      <Label k={key} />
      <div className={`nx-choices nx-inline${isMissing(key) ? ' nx-missing' : ''}`} style={{ marginTop: 4 }}>
        {[[YES, yesLabel], [NO, noLabel]].map(([value, text]) => (
          <label key={value} className="nx-choice">
            <input
              type="radio"
              name={`kyci-${key}`}
              checked={formData[key] === value}
              onChange={() => setValue(key, value)}
            />
            {text}
          </label>
        ))}
      </div>
    </div>
  );

  const checkboxGroup = (key, options, columns) => (
    <div className="expert-group" style={{ gridColumn: '1 / -1' }} key={key}>
      <Label k={key} />
      <div className={`nx-choices${isMissing(key) ? ' nx-missing' : ''}`} style={{ gridTemplateColumns: columns, marginTop: 4 }}>
        {options.map((opt) => {
          const selected = (formData[key] || []).includes(opt.key);
          const optRequired = opt.required || (opt.requiredIf && formData[opt.requiredIf.field] === opt.requiredIf.value);
          const optMissing = isMissing(`${key}.${opt.key}`);
          return (
            <label key={opt.key} className="nx-choice" style={optMissing ? { borderColor: '#f87171', color: '#b91c1c' } : undefined}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleInList(key, opt.key)}
              />
              <span>
                {lang === 'en' ? opt.en : opt.es}
                {optRequired ? <span style={{ color: '#ef4444' }}> *</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const grid = (children) => (
    <div className="expert-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>{children}</div>
  );

  const header = (s) => {
    const meta = STEP_META[s - 1];
    const Icon = meta.icon;
    return (
      <>
        <h2 className="nx-section-title">
          <Icon size={22} color={PRIMARY} /> {lang === 'en' ? meta.en : meta.es}
        </h2>
        <KycHintBox>{STEP_HINTS[lang === 'en' ? 'en' : 'es'][s - 1]}</KycHintBox>
      </>
    );
  };

  const renderStep1 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {header(1)}
      <PersonSelector
        people={registeredPeople}
        onSelectPerson={(person) => {
          const names = person.firstName || person.lastName
            ? { firstName: person.firstName || '', secondName: person.secondName || '', lastName: person.lastName || '' }
            : splitLegacyFullName(person.fullName || person.name || '');
          setFormData((prev) => ({
            ...prev,
            firstName: names.firstName || prev.firstName,
            secondName: names.secondName || prev.secondName,
            lastName: names.lastName || prev.lastName,
            birthDate: person.birthDate || prev.birthDate,
            birthPlace: person.birthPlace || prev.birthPlace,
            maritalStatus: person.maritalStatus || prev.maritalStatus,
            nationality: person.nationality || prev.nationality,
            passport: person.passport || person.idNumber || prev.passport,
            idCard: person.idCard || person.idNumber || prev.idCard,
            phone: person.phone || prev.phone,
            email: person.email || prev.email,
            address: person.address || prev.address,
          }));
        }}
        currentName={computeFullName(formData)}
      />
      {grid(
        <>
          {textInput('panamaEntityName', { full: true, placeholder: lang === 'en' ? 'e.g. Atlantic Investments S.A.' : 'Ej: Inversiones Atlántico S.A.' })}
          {checkboxGroup('applicantRoles', APPLICANT_ROLE_OPTIONS, 'repeat(auto-fit, minmax(150px, 1fr))')}
          {textInput('firstName')}
          {textInput('secondName')}
          {textInput('lastName')}
          {textInput('birthDate', { type: 'date' })}
          {textInput('nationality', { placeholder: lang === 'en' ? 'e.g. Panamanian' : 'Ej: Panameña' })}
          {textInput('birthPlace', { placeholder: lang === 'en' ? 'e.g. Panama City, Panama' : 'Ej: Ciudad de Panamá, Panamá' })}
          {textInput('passport')}
          {textInput('address', { full: true })}
          <div className="expert-group" key="maritalStatus">
            <Label k="maritalStatus" />
            <select className="expert-input" style={errorStyle('maritalStatus')} value={formData.maritalStatus} onChange={(e) => setValue('maritalStatus', e.target.value)}>
              <option value="">—</option>
              {MARITAL_STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          {textInput('phone', { placeholder: '+507 6000-0000' })}
          {textInput('email', { type: 'email', placeholder: 'correo@ejemplo.com' })}
          {textInput('idCard', { placeholder: lang === 'en' ? 'e.g. 8-888-8888' : 'Ej: 8-888-8888' })}
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {header(2)}
      {grid(
        <>
          {textInput('taxResidenceCountries', { full: true, placeholder: lang === 'en' ? 'e.g. Panama' : 'Ej: Panamá' })}
          {yesNo('otherTaxResidence')}
          {textArea('otherTaxResidenceDetails')}
          {yesNo('usPerson')}
          {textInput('usTin')}
          {textArea('usDetails')}
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {header(3)}
      {grid(
        <>
          {textArea('sourceOfWealth')}
          {yesNo('pep')}
          {textArea('pepDetails')}
          {yesNo('offenceConvicted')}
          {textArea('offenceConvictedDetails')}
          {yesNo('offenceBankrupt')}
          {textArea('offenceBankruptDetails')}
          {yesNo('offenceInvestigation')}
          {textArea('offenceInvestigationDetails')}
        </>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {header(4)}
      {grid(
        <>
          {checkboxGroup('certifiedDocs', CERTIFIED_DOC_OPTIONS, '1fr')}
          <div className="expert-group" style={{ gridColumn: '1 / -1' }} key="dataConsent">
            <Label k="dataConsent" />
            <div
              className={isMissing('dataConsent') ? 'nx-missing' : undefined}
              style={{ marginTop: 4, background: '#f8fafc', border: `1.5px solid ${isMissing('dataConsent') ? '#f87171' : '#cbd5e1'}`, borderRadius: 8, padding: '14px 16px' }}
            >
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#0f172a', textAlign: 'justify' }}>
                {DATA_CONSENT_TEXT[lang === 'en' ? 'en' : 'es']}
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontSize: 15, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 20, height: 20, accentColor: PRIMARY, cursor: 'pointer' }}
                  checked={formData.dataConsent === YES}
                  onChange={(e) => setValue('dataConsent', e.target.checked ? YES : '')}
                />
                {lang === 'en' ? 'I accept and authorize' : 'Acepto y autorizo'}
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
            </div>
          </div>
          {textInput('declarationName', { placeholder: computeFullName(formData) || undefined })}
          {textInput('declarationDate', { type: 'date' })}
        </>
      )}
    </div>
  );

  const withCompat = (data) => ({ ...data, fullName: computeFullName(data) });

  const nextStep = () => {
    // En modo lectura (vista del administrador) se navega sin validar.
    if (!readOnly) {
      const miss = missingFieldsForStep(step, formData);
      if (miss.length) {
        setMissing(miss);
        window.alert([t('kyci.validationIncomplete'), describeMissingFields(miss, { labels, fields: FIELDS, lang })].filter(Boolean).join('\n\n'));
        scrollToFirstMissing();
        return;
      }
    }
    setMissing([]);
    // Al llegar a la firma se propone el nombre del solicitante (editable).
    if (!readOnly && step + 1 === TOTAL_STEPS && !String(formData.declarationName || '').trim()) {
      const name = computeFullName(formData);
      if (name) setFormData((prev) => ({ ...prev, declarationName: name }));
    }
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const finish = () => {
    const miss = missingFields(formData);
    if (miss.length) {
      setMissing(miss);
      const firstStep = [1, 2, 3, 4].find((s) => missingFieldsForStep(s, formData).length > 0) || step;
      setStep(firstStep);
      window.alert([t('kyci.validationIncomplete'), describeMissingFields(missingFieldsForStep(firstStep, formData), { labels, fields: FIELDS, lang })].filter(Boolean).join('\n\n'));
      scrollToFirstMissing();
      return;
    }
    onSave(withProgress(withCompat(formData), step, TOTAL_STEPS, true), true);
  };

  return (
    <div className="nx-form">
      <div className="nx-header">
        <div>
          <h1 className="nx-title">{t('formType.Cumplimiento Individual')}</h1>
          <p className="nx-subtitle">
            {lang === 'en'
              ? 'Compliance form — Individuals · Customer due diligence procedure'
              : 'Formulario de cumplimiento — Personas naturales · Procedimiento de debida diligencia'}
          </p>
        </div>
        {!readOnly && (
          <button type="button" onClick={() => onSave(withProgress(withCompat(formData), step, TOTAL_STEPS))} disabled={saving} className="expert-btn-save">
            <Save size={18} /> {saving ? t('common.saving') : t('kyci.saveDraft')}
          </button>
        )}
      </div>

      <div className="standard-step-header">
        <span className="standard-step-title">{lang === 'en' ? STEP_META[step - 1].en : STEP_META[step - 1].es}</span>
        <span className="standard-step-badge">{t('dashboard.stepOf', { step, total: TOTAL_STEPS })}</span>
      </div>
      <div className="standard-progress-stepper">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`standard-progress-bar ${step >= s ? 'active' : ''}`} />
        ))}
      </div>

      <div className="nx-panel">
        <ReadOnlyFieldset readOnly={readOnly}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ReadOnlyFieldset>

        <div className="nx-footer">
          <button type="button" onClick={() => { setMissing([]); setStep((prev) => prev - 1); }} disabled={step === 1} className="expert-btn-nav" style={{ opacity: step === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={18} /> {t('common.back')}
          </button>
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={nextStep} className="expert-btn-primary">
              {t('common.continue')} <ChevronRight size={18} />
            </button>
          ) : readOnly ? <span /> : (
            <button type="button" onClick={finish} disabled={saving} className="expert-btn-finish">
              <CheckCircle2 size={18} /> {saving ? t('common.saving') : t('common.finishSave')}
            </button>
          )}
        </div>
      </div>

      <style>{kycFormSharedStyles(PRIMARY) + ' .kyci-guide { display: block; font-size: 13px; color: #475569; line-height: 1.5; margin-top: 2px; }'}</style>
    </div>
  );
};

export default CumplimientoIndividualForm;
