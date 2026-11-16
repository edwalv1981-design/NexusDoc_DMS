/**
 * Cumplimiento Entidades (KYCE) — plantilla oficial
 * "PTL_KYC – Compliance Form – Companies/Trusts/Partnerships".
 * Campos, obligatorios, textos guía y orden: lib/kyceMasterSpec.cjs (misma fuente que el PDF).
 *
 *  Paso 1  Solicitante (datos registrales, delitos y sanciones)
 *  Paso 2  Tipo de solicitante y documentos
 *  Paso 3  Clasificación FATCA/CRS y residencia fiscal
 *  Paso 4  Declaración y firmas
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
import { KYC_PRIMARY, KycHintBox, kycFormSharedStyles } from '../components/KycFormShared';
import {
  YES,
  NO,
  APPLICANT_TYPE_OPTIONS,
  PRIVATE_DOC_OPTIONS,
  TRUST_DOC_OPTIONS,
  PARTNERSHIP_DOC_OPTIONS,
  FATCA_OPTIONS,
  FIELDS,
  FORM_LABELS,
  FORM_GUIDES,
  YES_NO_DETAILS,
  NOTES_EN,
  NOTES_ES,
  isShown,
  missingFieldsForStep,
  missingFields,
  legacyApplicantType,
} from '../utils/kyceMasterSpec';
import { validateField } from '../utils/fieldValidators';
import ReadOnlyFieldset from '../components/common/ReadOnlyFieldset';
import { withProgress } from '../utils/formProgress';

const TOTAL_STEPS = 4;
const ARRAY_KEYS = ['privateDocs', 'trustDocs', 'partnershipDocs'];

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
  return loaded;
}

const STEP_META = [
  { icon: Building2, es: 'I. Solicitante', en: 'I. Applicant' },
  { icon: Layers, es: 'II. Tipo de solicitante y documentos', en: 'II. Applicant type and documents' },
  { icon: Landmark, es: 'III. Clasificación FATCA/CRS y residencia fiscal', en: 'III. FATCA/CRS classification and tax residency' },
  { icon: FileCheck, es: 'IV. Declaración y firmas', en: 'IV. Declaration and signatures' },
];

const STEP_HINTS = {
  es: [
    'Este formulario lo completa, respecto de la Sociedad, cada sociedad, fideicomiso o sociedad de personas que posea o proponga poseer, directa o indirectamente, el 10% o más del capital social; que sea Director Corporativo de la Sociedad, o titular de un Poder (el “Solicitante”). Se debe enviar una copia original del formulario firmado junto con los documentos de debida diligencia. Los campos con * son obligatorios.',
    'Indique qué tipo de Solicitante es y complete la sección correspondiente con los documentos certificados que adjunta.',
    'Indique la clasificación FATCA/CRS de la entidad y su residencia fiscal. Por favor complete y presente el Formulario de Declaración de Autocertificación de la Entidad.',
    'Confirme la declaración. El PDF incluye los recuadros de firma para dos personas autorizadas a firmar por y en nombre del Solicitante, cada uno con su fecha.',
  ],
  en: [
    'This form is completed, in respect of the Company, by each company, trust or partnership which owns or proposes owning, directly or indirectly, 10% or greater of the share capital; that is a Corporate Director of the Company, or is a holder of a Power of Attorney (the “Applicant”). An original copy of the executed form must be sent together with the due diligence documents. Fields marked * are required.',
    'State which type of Applicant it is and complete the matching section with the certified documents attached.',
    'State the entity’s FATCA/CRS classification and tax residency. Please complete and submit the Entity Self Certification Declaration Form.',
    'Confirm the declaration. The PDF includes signature boxes for two persons authorised to sign for and on behalf of the Applicant, each with its date.',
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
      <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '1px' }}>{fieldErrors[name]}</span>
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

  /** Radio con opciones Sí/No o con opciones {key, es, en}. */
  const radio = (key, options) =>
    shown(key) ? (
      <div className="expert-group" style={{ gridColumn: '1 / -1', ...(isMissing(key) ? { outline: '1px solid #ef4444', borderRadius: 4, padding: 4 } : {}) }} key={key}>
        <Label k={key} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: 4, flexDirection: options ? 'column' : 'row' }}>
          {(options || [{ key: YES, es: 'Sí', en: yesLabel }, { key: NO, es: 'No', en: 'No' }]).map((opt) => (
            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: formData[key] === opt.key ? 700 : 500, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`kyce-${key}`}
                checked={formData[key] === opt.key}
                onChange={() => setValue(key, opt.key)}
                style={{ width: 15, height: 15, accentColor: PRIMARY }}
              />
              {opt[L]}
            </label>
          ))}
        </div>
      </div>
    ) : null;

  const checkboxGroup = (key, options) =>
    shown(key) ? (
      <div className="expert-group" style={{ gridColumn: '1 / -1' }} key={key}>
        <Label k={key} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
            const optMissing = isMissing(`${key}.${opt.key}`);
            return (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, fontWeight: selected ? 700 : 500, color: optMissing ? '#b91c1c' : '#1e293b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleInList(key, opt.key)}
                  style={{ width: 15, height: 15, marginTop: 1, accentColor: PRIMARY, flexShrink: 0 }}
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>{children}</div>
  );

  const header = (s) => {
    const meta = STEP_META[s - 1];
    const Icon = meta.icon;
    return (
      <>
        <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={22} color={PRIMARY} /> {meta[L]}
        </h2>
        <KycHintBox>{STEP_HINTS[L][s - 1]}</KycHintBox>
      </>
    );
  };

  const typeTitle = (key) => {
    if (formData.applicantType !== key) return null;
    const opt = APPLICANT_TYPE_OPTIONS.find((o) => o.key === key);
    return (
      <div style={{ gridColumn: '1 / -1', fontWeight: 700, fontSize: 13, color: PRIMARY, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }} key={`title-${key}`}>
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
          {radio('applicantType', APPLICANT_TYPE_OPTIONS)}
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
          {typeTitle('trustFoundation')}
          {checkboxGroup('trustDocs', TRUST_DOC_OPTIONS)}
          {textInput('settlorNameAddress', { full: true })}
          {textInput('trusteesNameAddress', { full: true })}
          {textInput('enforcerNameAddress', { full: true })}
          {textInput('protectorNameAddress', { full: true })}
          {textInput('beneficiary1', { full: true })}
          {textInput('beneficiary2', { full: true })}
          {textInput('beneficiary3', { full: true })}
          {textInput('beneficiary4', { full: true })}
          {typeTitle('partnership')}
          {checkboxGroup('partnershipDocs', PARTNERSHIP_DOC_OPTIONS)}
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
          <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#334155', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
            {L === 'en'
              ? 'I hereby confirm that the above details are true and accurate and I undertake to advise you in the event that any of the circumstances change within 14 days of those changes occurring.'
              : 'Por la presente confirmo que los datos anteriores son verdaderos y exactos, y me comprometo a informarles en caso de que alguna de las circunstancias cambie, dentro de los 14 días siguientes a dicho cambio.'}
          </div>
          {textInput('declarationDate', { type: 'date' })}
          {textInput('declarationDate2', { type: 'date' })}
          <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{L === 'en' ? 'NOTES' : 'NOTAS'}</div>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(L === 'en' ? NOTES_EN : NOTES_ES).map((n) => <li key={n}>{n}</li>)}
            </ol>
          </div>
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
        window.alert(t('kyce.validationIncomplete'));
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
      window.alert(t('kyce.validationIncomplete'));
      return;
    }
    onSave(withProgress(formData, step, TOTAL_STEPS, true), true);
  };

  return (
    <div style={{ width: '100%', padding: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: SECONDARY }}>{t('formType.Cumplimiento Entidades')}</h1>
        {!readOnly && (
          <button type="button" onClick={() => onSave(withProgress(formData, step, TOTAL_STEPS))} disabled={saving} className="expert-btn-save">
            <Save size={18} /> {saving ? t('common.saving') : t('kyce.saveDraft')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: '20px' }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{ flex: 1, position: 'relative' }}>
            <div style={{ height: '3px', background: step >= s ? PRIMARY : '#e2e8f0', borderRadius: '3px', transition: 'all 0.3s' }} />
            <div style={{ position: 'absolute', top: '-18px', left: 0, fontSize: '9px', fontWeight: 700, color: step >= s ? PRIMARY : '#94a3b8' }}>
              {t('kyce.stepLabel', { step: s })}
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

      <style>{kycFormSharedStyles(PRIMARY) + ' .kyc-guide { display: block; font-size: 10.5px; font-weight: 500; color: #64748b; line-height: 1.35; margin: 1px 0 3px; }'}</style>
    </div>
  );
};

export default CumplimientoEntidadesForm;
