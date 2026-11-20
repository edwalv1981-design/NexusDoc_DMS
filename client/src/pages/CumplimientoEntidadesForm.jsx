/**
 * Cumplimiento Entidades (KYCE) — plantilla oficial
 * "PTL_KYC – Compliance Form – Companies/Trusts/Partnerships".
 * Campos, obligatorios, textos guía y orden: lib/kyceMasterSpec.cjs (misma fuente que el PDF).
 *
 *  Paso 1  Solicitante (datos registrales, delitos y sanciones)
 *  Paso 2  Tipo de solicitante y documentos
 *  Paso 3  Clasificación FATCA/CRS y residencia fiscal
 *  Paso 4  Autorización de datos y firmas
 */
import React, { useState, useEffect } from 'react';
import {
  Building2,
  Layers,
  Landmark,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useT, useLang } from '../i18n';
import { KYC_PRIMARY, KycHintBox, kycFormSharedStyles, describeMissingFields, scrollToFirstMissing } from '../components/KycFormShared';
import {
  YES,
  NO,
  APPLICANT_ROLE_OPTIONS,
  APPLICANT_TYPE_OPTIONS,
  LEGACY_APPLICANT_TYPE_OPTIONS,
  PRIVATE_DOC_OPTIONS,
  PRIVATE_BANK_DOC_OPTIONS,
  TRUST_DOC_OPTIONS,
  DATA_CONSENT_TEXT,
  PARTNERSHIP_DOC_OPTIONS,
  FATCA_OPTIONS,
  FIELDS,
  FORM_LABELS,
  FORM_GUIDES,
  YES_NO_DETAILS,
  isShown,
  missingFieldsForStep,
  missingFields,
  legacyApplicantType,
} from '../utils/kyceMasterSpec';
import { validateField } from '../utils/fieldValidators';
import ReadOnlyFieldset from '../components/common/ReadOnlyFieldset';
import { withProgress } from '../utils/formProgress';

const TOTAL_STEPS = 4;
const ARRAY_KEYS = ['applicantRoles', 'privateDocs', 'privateBankDocs', 'trustDocs', 'partnershipDocs'];

const emptyKyceState = () => {
  const state = {};
  for (const key of Object.keys(FIELDS)) state[key] = FIELDS[key].type === 'checkboxGroup' ? [] : '';
  state.declarationDate = new Date().toISOString().split('T')[0];
  return state;
};

/** Trámites guardados con el formato anterior: se adaptan sin borrar sus datos. */
function adaptLoadedData(initialData) {
  const loaded = { ...initialData };
  for (const key of ARRAY_KEYS) if (!Array.isArray(loaded[key])) loaded[key] = [];
  if (!loaded.applicantType && loaded.entityType) {
    const guess = legacyApplicantType(loaded.entityType);
    if (guess) loaded.applicantType = guess;
  }
  // Formato anterior con 4 beneficiarios: se muestran juntos en el campo único (uno por línea).
  // Las claves beneficiary2..4 se conservan tal cual en los datos.
  const extra = ['beneficiary2', 'beneficiary3', 'beneficiary4']
    .map((k) => String(loaded[k] || '').trim())
    .filter((v) => v && !String(loaded.beneficiary1 || '').includes(v));
  if (extra.length) loaded.beneficiary1 = [String(loaded.beneficiary1 || '').trim(), ...extra].filter(Boolean).join('\n');
  return loaded;
}

const STEP_META = [
  { icon: Building2, es: 'I. Solicitante', en: 'I. Applicant' },
  { icon: Layers, es: 'II. Tipo de solicitante y documentos', en: 'II. Applicant type and documents' },
  { icon: Landmark, es: 'III. Clasificación FATCA/CRS y residencia fiscal', en: 'III. FATCA/CRS classification and tax residency' },
  { icon: FileCheck, es: 'IV. Autorización y firmas', en: 'IV. Authorization and signatures' },
];

const STEP_HINTS = {
  es: [
    'Este formulario lo completa, respecto de la Sociedad, cada sociedad, fideicomiso o sociedad de personas que posea o proponga poseer, directa o indirectamente, el 10% o más del capital social; que sea Director Corporativo de la Sociedad o Miembro de la fundación, o titular de un Poder (el “Solicitante”). Se debe enviar una copia original del formulario firmado junto con los documentos de debida diligencia. Los campos con * son obligatorios.',
    'Indique qué tipo de Solicitante es y complete la sección correspondiente con los documentos que adjunta.',
    'Indique la clasificación FATCA/CRS de la entidad y su residencia fiscal.',
    'Lea y acepte la autorización de uso de datos y escriba el nombre del representante legal o persona autorizada. El PDF incluye dos recuadros de firma, cada uno con su fecha.',
  ],
  en: [
    'This form is completed, in respect of the Company, by each company, trust or partnership which owns or proposes owning, directly or indirectly, 10% or greater of the share capital; that is a Corporate Director of the Company or foundation Member, or is a holder of a Power of Attorney (the “Applicant”). An original copy of the executed form must be sent together with the due diligence documents. Fields marked * are required.',
    'State which type of Applicant it is and complete the matching section with the documents attached.',
    'State the entity’s FATCA/CRS classification and tax residency.',
    'Read and accept the data authorization and type the name of the legal representative or authorized person. The PDF includes two signature boxes, each with its date.',
  ],
};

const CumplimientoEntidadesForm = ({ initialData, onSave, saving, readOnly = false, startStep }) => {
  const t = useT();
  const { lang } = useLang();
  const L = lang === 'en' ? 'en' : 'es';
  const labels = FORM_LABELS[L];
  const guides = FORM_GUIDES[L];
  const [step, setStep] = useState(() => (startStep >= 1 && startStep <= TOTAL_STEPS ? startStep : 1));
  const [formData, setFormData] = useState(emptyKyceState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [missing, setMissing] = useState([]);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...adaptLoadedData(initialData) }));
    }
  }, [initialData]);

  const PRIMARY = KYC_PRIMARY;
  const SECONDARY = '#1e293b';
  const yesLabel = L === 'en' ? 'Yes' : 'Sí';

  const isMissing = (key) => missing.includes(key);
  const errorStyle = (key) =>
    fieldErrors[key] || isMissing(key) ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #fecaca' } : {};

  const setValue = (key, value) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (YES_NO_DETAILS[key] && value === NO) for (const k of YES_NO_DETAILS[key]) next[k] = '';
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
    setValue(key, list.includes(optionKey) ? list.filter((x) => x !== optionKey) : [...list, optionKey]);
    setMissing((m) => m.filter((k) => k !== key && k !== `${key}.${optionKey}`));
  };

  const shown = (key) => isShown(key, formData);
  const Label = ({ k }) => (
    <>
      <label>
        {labels[k]}
        {FIELDS[k]?.required ? <span style={{ color: '#ef4444' }}> *</span> : null}
      </label>
      {guides[k] ? <span className="kyc-guide">{guides[k]}</span> : null}
    </>
  );
  const FieldError = ({ name }) =>
    fieldErrors[name] ? (
      <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600, display: 'block', marginTop: '2px' }}>{fieldErrors[name]}</span>
    ) : null;

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

  const textArea = (key, { placeholder, rows = 3 } = {}) =>
    shown(key) ? (
      <div className="expert-group" style={{ gridColumn: '1 / -1' }} key={key}>
        <Label k={key} />
        <textarea
          className="expert-input"
          rows={rows}
          style={{ ...errorStyle(key), resize: 'vertical' }}
          value={formData[key] || ''}
          onChange={(e) => setValue(key, e.target.value)}
          placeholder={placeholder}
        />
      </div>
    ) : null;

  /** Radio con opciones Sí/No o con opciones {key, es, en}. */
  const radio = (key, options) =>
    shown(key) ? (
      <div className="expert-group" style={{ gridColumn: '1 / -1' }} key={key}>
        <Label k={key} />
        <div className={`nx-choices${options ? '' : ' nx-inline'}${isMissing(key) ? ' nx-missing' : ''}`} style={{ marginTop: 4, gridTemplateColumns: options ? 'repeat(auto-fill, minmax(260px, 1fr))' : undefined }}>
          {(options || [{ key: YES, es: 'Sí', en: yesLabel }, { key: NO, es: 'No', en: 'No' }]).map((opt) => (
            <label key={opt.key} className="nx-choice">
              <input
                type="radio"
                name={`kyce-${key}`}
                checked={formData[key] === opt.key}
                onChange={() => setValue(key, opt.key)}
              />
              {opt[L]}
            </label>
          ))}
        </div>
      </div>
    ) : null;

  const checkboxGroup = (key, options, columns = 'repeat(auto-fill, minmax(260px, 1fr))') =>
    shown(key) ? (
      <div className="expert-group" style={{ gridColumn: '1 / -1' }} key={key}>
        <Label k={key} />
        <div className={`nx-choices${isMissing(key) ? ' nx-missing' : ''}`} style={{ gridTemplateColumns: columns, marginTop: 4 }}>
          {options.map((opt) => {
            const selected = (formData[key] || []).includes(opt.key);
            const optMissing = isMissing(`${key}.${opt.key}`);
            return (
              <label key={opt.key} className="nx-choice" style={optMissing ? { borderColor: '#f87171', color: '#b91c1c' } : undefined}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleInList(key, opt.key)}
                />
                <span>
                  {opt[L]}
                  {opt.required ? <span style={{ color: '#ef4444' }}> *</span> : null}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    ) : null;

  const grid = (children) => (
    <div className="expert-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>{children}</div>
  );

  const header = (s) => {
    const meta = STEP_META[s - 1];
    const Icon = meta.icon;
    return (
      <>
        <h2 className="nx-section-title">
          <Icon size={22} color={PRIMARY} /> {meta[L]}
        </h2>
        <KycHintBox>{STEP_HINTS[L][s - 1]}</KycHintBox>
      </>
    );
  };

  // "Partnerships" ya no está en la plantilla: solo aparece si un trámite antiguo lo tenía elegido.
  const typeOptions = formData.applicantType === 'partnership'
    ? [...APPLICANT_TYPE_OPTIONS, ...LEGACY_APPLICANT_TYPE_OPTIONS]
    : APPLICANT_TYPE_OPTIONS;

  const typeTitle = (key) => {
    if (formData.applicantType !== key) return null;
    const opt = typeOptions.find((o) => o.key === key);
    return (
      <div className="nx-subsection" style={{ gridColumn: '1 / -1' }} key={`title-${key}`}>
        ➤ {opt[L]}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {header(1)}
      {grid(
        <>
          {textInput('panamaEntityName', { full: true, placeholder: L === 'en' ? 'e.g. Atlantic Investments S.A.' : 'Ej: Inversiones Atlántico S.A.' })}
          {checkboxGroup('applicantRoles', APPLICANT_ROLE_OPTIONS, 'repeat(auto-fill, minmax(170px, 1fr))')}
          {textInput('legalName', { full: true })}
          {textInput('incorporationDate', { type: 'date' })}
          {textInput('jurisdiction', { placeholder: L === 'en' ? 'e.g. British Virgin Islands' : 'Ej: Islas Vírgenes Británicas' })}
          {textInput('registrationNumber')}
          {textInput('registeredAddress', { full: true })}
          {textInput('mailingAddress', { full: true })}
          {textInput('phone', { placeholder: '+507 6000-0000' })}
          {textArea('businessActivity')}
          {radio('offenceConvicted')}
          {textArea('offenceConvictedDetails')}
          {radio('offenceInvestigation')}
          {textArea('offenceInvestigationDetails')}
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {header(2)}
      {grid(
        <>
          {radio('applicantType', typeOptions)}
          {typeTitle('publicCompany')}
          {textInput('stockExchange')}
          {textInput('tickerSymbol')}
          {typeTitle('regulatedEntity')}
          {radio('regulatedEntity')}
          {textInput('regulatedParentName', { full: true })}
          {textInput('regulatorName')}
          {textInput('regulatorCountry')}
          {typeTitle('governmentEntity')}
          {radio('governmentEntity')}
          {textInput('governmentCountry')}
          {textInput('governmentEntityType')}
          {typeTitle('privateCompany')}
          {checkboxGroup('privateDocs', PRIVATE_DOC_OPTIONS)}
          {checkboxGroup('privateBankDocs', PRIVATE_BANK_DOC_OPTIONS)}
          {typeTitle('trustFoundation')}
          {checkboxGroup('trustDocs', TRUST_DOC_OPTIONS)}
          {textInput('settlorNameAddress', { full: true })}
          {textInput('trusteesNameAddress', { full: true })}
          {textInput('enforcerNameAddress', { full: true })}
          {textInput('protectorNameAddress', { full: true })}
          {textArea('beneficiary1', { rows: 4 })}
          {formData.applicantType === 'partnership' ? typeTitle('partnership') : null}
          {formData.applicantType === 'partnership' ? checkboxGroup('partnershipDocs', PARTNERSHIP_DOC_OPTIONS) : null}
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {header(3)}
      {grid(
        <>
          {radio('fatcaClassification', FATCA_OPTIONS)}
          {textInput('fatcaGiin')}
          {textInput('fatcaSponsorGiin')}
          {textInput('fatcaExemptReason', { full: true })}
          {radio('usEntity')}
          {textInput('einNumber')}
          {radio('otherTaxResidence')}
          {textArea('otherTaxResidenceDetails')}
          {textInput('taxIdNumber')}
        </>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {header(4)}
      {grid(
        <>
          <div className="expert-group" style={{ gridColumn: '1 / -1' }} key="dataConsent">
            <Label k="dataConsent" />
            <div
              className={isMissing('dataConsent') ? 'nx-missing' : undefined}
              style={{ marginTop: 4, background: '#f8fafc', border: `1.5px solid ${isMissing('dataConsent') ? '#f87171' : '#cbd5e1'}`, borderRadius: 8, padding: '14px 16px' }}
            >
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#0f172a', textAlign: 'justify' }}>{DATA_CONSENT_TEXT[L]}</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontSize: 15, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 20, height: 20, accentColor: PRIMARY, cursor: 'pointer' }}
                  checked={formData.dataConsent === YES}
                  onChange={(e) => setValue('dataConsent', e.target.checked ? YES : '')}
                />
                {L === 'en' ? 'I accept and authorize' : 'Acepto y autorizo'}
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
            </div>
          </div>
          {textInput('declarationName')}
          {textInput('declarationDate', { type: 'date' })}
          {textInput('declarationName2')}
          {textInput('declarationDate2', { type: 'date' })}
        </>
      )}
    </div>
  );

  const nextStep = () => {
    // En modo lectura (vista del administrador) se navega sin validar.
    if (!readOnly) {
      const miss = missingFieldsForStep(step, formData);
      if (miss.length) {
        setMissing(miss);
        window.alert([t('kyce.validationIncomplete'), describeMissingFields(miss, { labels, fields: FIELDS, lang })].filter(Boolean).join('\n\n'));
        scrollToFirstMissing();
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
      window.alert([t('kyce.validationIncomplete'), describeMissingFields(missingFieldsForStep(firstStep, formData), { labels, fields: FIELDS, lang })].filter(Boolean).join('\n\n'));
      scrollToFirstMissing();
      return;
    }
    onSave(withProgress(formData, step, TOTAL_STEPS, true), true);
  };

  return (
    <div className="nx-form">
      <div className="nx-header">
        <div>
          <h1 className="nx-title">{t('formType.Cumplimiento Entidades')}</h1>
          <p className="nx-subtitle">
            {L === 'en'
              ? 'Compliance form — Companies, trusts and partnerships · Know your client procedure'
              : 'Formulario de cumplimiento — Sociedades, fideicomisos y sociedades de personas · Conozca a su cliente'}
          </p>
        </div>
        {!readOnly && (
          <button type="button" onClick={() => onSave(withProgress(formData, step, TOTAL_STEPS))} disabled={saving} className="expert-btn-save">
            <Save size={18} /> {saving ? t('common.saving') : t('kyce.saveDraft')}
          </button>
        )}
      </div>

      <div className="standard-step-header">
        <span className="standard-step-title">{STEP_META[step - 1][L]}</span>
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

      <style>{kycFormSharedStyles(PRIMARY) + ' .kyc-guide { display: block; font-size: 13px; color: #475569; line-height: 1.5; margin-top: 2px; }'}</style>
    </div>
  );
};

export default CumplimientoEntidadesForm;
