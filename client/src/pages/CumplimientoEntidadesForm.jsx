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

  const PRIMARY = '#1d4ed8';
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

  const renderStep1 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Building2 size={22} color={PRIMARY} /> {t('kyce.steps.entity')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="expert-group" style={{ gridColumn: '1 / -1' }}><label>{L('legalName')}</label><input className="expert-input" value={formData.legalName} onChange={(e) => setFormData({ ...formData, legalName: e.target.value })} required /></div>
        <div className="expert-group"><label>{L('tradeName')}</label><input className="expert-input" value={formData.tradeName} onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })} /></div>
        <div className="expert-group"><label>{L('entityType')}</label>
          <select className="expert-input" value={formData.entityType} onChange={(e) => setFormData({ ...formData, entityType: e.target.value })} required>
            <option value="">—</option>
            {ENTITY_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="expert-group"><label>{L('incorporationDate')}</label><input type="date" className="expert-input" value={formData.incorporationDate} onChange={(e) => setFormData({ ...formData, incorporationDate: e.target.value })} required /></div>
        <div className="expert-group"><label>{L('jurisdiction')}</label><input className="expert-input" value={formData.jurisdiction} onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })} required /></div>
        <div className="expert-group"><label>{L('taxId')}</label><input className="expert-input" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} required /></div>
        <div className="expert-group"><label>{L('registrationNumber')}</label><input className="expert-input" value={formData.registrationNumber} onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} /></div>
        <div className="expert-group" style={{ gridColumn: '1 / -1' }}><label>{L('registeredAddress')}</label><input className="expert-input" value={formData.registeredAddress} onChange={(e) => setFormData({ ...formData, registeredAddress: e.target.value })} required /></div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Phone size={22} color={PRIMARY} /> {t('kyce.steps.contact')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="expert-group"><label>{L('phone')}</label><input className="expert-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required /></div>
        <div className="expert-group"><label>{L('email')}</label><input type="email" className="expert-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
        <div className="expert-group"><label>{L('city')}</label><input className="expert-input" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required /></div>
        <div className="expert-group"><label>{L('country')}</label><input className="expert-input" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} required /></div>
        <div className="expert-group" style={{ gridColumn: '1 / -1' }}><label>{L('businessActivity')}</label><textarea className="expert-input" rows={2} value={formData.businessActivity} onChange={(e) => setFormData({ ...formData, businessActivity: e.target.value })} required /></div>
        <div className="expert-group"><label>{L('website')}</label><input className="expert-input" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} /></div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={22} color={PRIMARY} /> {t('kyce.steps.compliance')}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div className="expert-group"><label>{L('legalRepName')}</label><input className="expert-input" value={formData.legalRepName} onChange={(e) => setFormData({ ...formData, legalRepName: e.target.value })} required /></div>
          <div className="expert-group"><label>{L('legalRepId')}</label><input className="expert-input" value={formData.legalRepId} onChange={(e) => setFormData({ ...formData, legalRepId: e.target.value })} required /></div>
          <div className="expert-group"><label>{L('legalRepNationality')}</label><input className="expert-input" value={formData.legalRepNationality} onChange={(e) => setFormData({ ...formData, legalRepNationality: e.target.value })} /></div>
        </div>
        <div className="expert-group"><label>{L('beneficialOwners')}</label><textarea className="expert-input" rows={3} value={formData.beneficialOwners} onChange={(e) => setFormData({ ...formData, beneficialOwners: e.target.value })} required placeholder={t('kyce.beneficialOwnersHint')} /></div>
        <div className="expert-group"><label>{L('pep')}</label>
          <select className="expert-input" value={formData.pep} onChange={(e) => setFormData({ ...formData, pep: e.target.value, pepDetails: e.target.value === 'No' ? '' : formData.pepDetails })}>
            <option value="No">{t('kyce.pepNo')}</option>
            <option value="Sí">{t('kyce.pepYes')}</option>
          </select>
        </div>
        {formData.pep === 'Sí' && (
          <div className="expert-group"><label>{L('pepDetails')}</label><textarea className="expert-input" rows={3} value={formData.pepDetails} onChange={(e) => setFormData({ ...formData, pepDetails: e.target.value })} required /></div>
        )}
        <div>
          <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>{L('fundsSource')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {FUNDS_OPTIONS.map((f) => (
              <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '12px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.fundsSource.includes(f.key)} onChange={() => toggleFunds(f.key)} />
                {t(`kyce.sources.${f.labelKey}`)}
              </label>
            ))}
          </div>
        </div>
        <div className="expert-group"><label>{L('fundsOther')}</label><input className="expert-input" value={formData.fundsOther} onChange={(e) => setFormData({ ...formData, fundsOther: e.target.value })} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="expert-group"><label>{L('declarationName')}</label><input className="expert-input" value={formData.declarationName} onChange={(e) => setFormData({ ...formData, declarationName: e.target.value })} required /></div>
          <div className="expert-group"><label>{L('declarationDate')}</label><input type="date" className="expert-input" value={formData.declarationDate} onChange={(e) => setFormData({ ...formData, declarationDate: e.target.value })} required /></div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: SECONDARY }}>{t('formType.Cumplimiento Entidades')}</h1>
        <button type="button" onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save">
          <Save size={18} /> {saving ? t('common.saving') : t('kyce.saveDraft')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '40px' }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ flex: 1, position: 'relative' }}>
            <div style={{ height: '5px', background: step >= s ? PRIMARY : '#e2e8f0', borderRadius: '10px', transition: 'all 0.3s' }} />
            <div style={{ position: 'absolute', top: '-25px', left: 0, fontSize: '10px', fontWeight: 800, color: step >= s ? PRIMARY : '#94a3b8' }}>
              {t('kyce.stepLabel', { step: s })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 25px rgba(0,0,0,0.02)' }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '30px', borderTop: '1px solid #f1f5f9' }}>
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

      <style>{`
        .expert-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 13px; font-weight: 500; }
        .expert-input:focus { border-color: ${PRIMARY}; box-shadow: 0 0 0 4px ${PRIMARY}15; }
        .expert-group { display: flex; flex-direction: column; gap: 6px; }
        .expert-group label { font-size: 10px; font-weight: 800; color: #475569; letter-spacing: 0.5px; }
        .expert-btn-primary { padding: 12px 25px; background: ${PRIMARY}; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .expert-btn-nav { padding: 12px 25px; background: #f1f5f9; color: #475569; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .expert-btn-save { padding: 10px 20px; background: white; color: ${PRIMARY}; border: 1.5px solid ${PRIMARY}; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .expert-btn-finish { padding: 12px 25px; background: #16a34a; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
      `}</style>
    </div>
  );
};

export default CumplimientoEntidadesForm;
