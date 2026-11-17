/**
 * Cumplimiento Individual (KYCI) — plantilla oficial
 * "PTL_KYC – Compliance Form – Individuals".
 * Campos, obligatorios y orden: lib/kyciMasterSpec.cjs (misma fuente que el PDF).
 *
 *  Paso 1  Solicitante (entidad panameña, calidad del solicitante, identidad, contacto)
 *  Paso 2  Residencia fiscal y FATCA
 *  Paso 3  Origen del patrimonio, PEP y sanciones
 *  Paso 4  Documentos certificados, declaración y fecha
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
import { KYC_PRIMARY, KycHintBox, kycFormSharedStyles } from '../components/KycFormShared';
import {
  YES,
  NO,
  MARITAL_STATUS_OPTIONS,
  APPLICANT_ROLE_OPTIONS,
  CERTIFIED_DOC_OPTIONS,
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
  { icon: FileCheck, es: 'IV. Documentos certificados y declaración', en: 'IV. Certified documents and declaration' },
];

const STEP_HINTS = {
  es: [
    'Este formulario lo completa cada persona (el “Solicitante”) que sea accionista con 10% o más del capital, beneficiario final, director, socio general, firmante autorizado, apoderado, fundador/fideicomitente, ejecutor o protector. Los campos marcados con * son obligatorios.',
    'Indique su residencia fiscal. Si es persona o residente fiscal de EE. UU., debe completar un formulario W9 e indicar su número de identificación tributaria (TIN).',
    'Detalle el origen de su patrimonio y responda todas las preguntas de Sí/No. Si alguna respuesta es “Sí”, el detalle es obligatorio.',
    'Marque los documentos certificados que adjunta. Pasaporte, comprobante de domicilio y hoja de vida son obligatorios; el W9 también lo es si es persona de EE. UU. El PDF incluye el recuadro “Signature of Applicant” para la firma.',
  ],
  en: [
    'This form is completed by each individual (the “Applicant”) who is a 10%+ shareholder, beneficial owner, director, general partner, authorised signatory, power of attorney holder, founder/settlor, enforcer or protector. Fields marked * are required.',
    'State your tax residency. If you are a U.S. Person or U.S. tax resident, please complete a W9 and provide your tax identification number (TIN).',
    'Describe your source of wealth and answer every Yes/No question. If any answer is “Yes”, details are required.',
    'Tick the certified documents you are attaching. Passport, proof of address and CV are required; W9 is also required for U.S. Persons. The PDF includes the “Signature of Applicant” box.',
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
      <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '1px' }}>{fieldErrors[name]}</span>
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
    <div className="expert-group kyci-yesno" style={{ gridColumn: '1 / -1', ...(isMissing(key) ? { outline: '1px solid #ef4444', borderRadius: 4, padding: 4 } : {}) }} key={key}>
      <Label k={key} />
      <div style={{ display: 'flex', gap: 18, marginTop: 4 }}>
        {[[YES, yesLabel], [NO, noLabel]].map(([value, text]) => (
          <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: formData[key] === value ? 700 : 500, color: '#1e293b', cursor: 'pointer' }}>
            <input
              type="radio"
              name={`kyci-${key}`}
              checked={formData[key] === value}
              onChange={() => setValue(key, value)}
              style={{ width: 15, height: 15, accentColor: PRIMARY }}
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columns,
          gap: 6,
          marginTop: 4,
          padding: 8,
          borderRadius: 6,
          border: isMissing(key) ? '1px solid #ef4444' : '1px solid #e2e8f0',
          background: '#f8fafc',
        }}
      >
        {options.map((opt) => {
          const selected = (formData[key] || []).includes(opt.key);
          const optRequired = opt.required || (opt.requiredIf && formData[opt.requiredIf.field] === opt.requiredIf.value);
          const optMissing = isMissing(`${key}.${opt.key}`);
          return (
            <label
              key={opt.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                fontSize: 12,
                fontWeight: selected ? 700 : 500,
                color: optMissing ? '#b91c1c' : '#1e293b',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleInList(key, opt.key)}
                style={{ width: 15, height: 15, marginTop: 1, accentColor: PRIMARY, flexShrink: 0 }}
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>{children}</div>
  );

  const header = (s) => {
    const meta = STEP_META[s - 1];
    const Icon = meta.icon;
    return (
      <>
        <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#334155', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
            {lang === 'en'
              ? 'I hereby confirm that the above details are true and accurate and I undertake to advise you in the event that any of my circumstances change within 14 days of those changes occurring.'
              : 'Confirmo que los datos anteriores son verdaderos y exactos, y me comprometo a informarles si alguna de mis circunstancias cambia, dentro de los 14 días siguientes a dicho cambio.'}
          </div>
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
        window.alert(t('kyci.validationIncomplete'));
        return;
      }
    }
    setMissing([]);
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const finish = () => {
    const miss = missingFields(formData);
    if (miss.length) {
      setMissing(miss);
      const firstStep = [1, 2, 3, 4].find((s) => missingFieldsForStep(s, formData).length > 0) || step;
      setStep(firstStep);
      window.alert(t('kyci.validationIncomplete'));
      return;
    }
    onSave(withProgress(withCompat(formData), step, TOTAL_STEPS, true), true);
  };

  return (
    <div style={{ width: '100%', padding: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: SECONDARY }}>{t('formType.Cumplimiento Individual')}</h1>
        {!readOnly && (
          <button type="button" onClick={() => onSave(withProgress(withCompat(formData), step, TOTAL_STEPS))} disabled={saving} className="expert-btn-save">
            <Save size={18} /> {saving ? t('common.saving') : t('kyci.saveDraft')}
          </button>
        )}
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
        <ReadOnlyFieldset readOnly={readOnly}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ReadOnlyFieldset>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e8edf2' }}>
          <button type="button" onClick={() => { setMissing([]); setStep((prev) => prev - 1); }} disabled={step === 1} className="expert-btn-nav" style={{ opacity: step === 1 ? 0.3 : 1 }}>
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

      <style>{kycFormSharedStyles(PRIMARY) + ' .kyci-guide { display: block; font-size: 10.5px; font-weight: 500; color: #64748b; line-height: 1.35; margin: 1px 0 3px; }'}</style>
    </div>
  );
};

export default CumplimientoIndividualForm;
