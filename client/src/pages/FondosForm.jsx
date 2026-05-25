import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    ChevronLeft, ChevronRight, Check, Save, 
    FileCheck, Trash2, X, Building, Wallet, Shield 
} from 'lucide-react';
import { useT } from '../i18n';
import API_BASE_URL from '../config';
import {
    mergeBeneficiaryIntoCustody,
    CUSTODY_PREFILL_TARGETS,
} from '../utils/fondosBeneficiaryCustody';

const FondosForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const t = useT();
    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('id');

    // Color del Login
    const PRIMARY_COLOR = '#6366f1';

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        companyName: '',
        activities: '',
        country: '',
        beneficiaryName: '',
        birthDate: '',
        birthPlace: '',
        address: '',
        fundsSource: [],
        fundsOther: '',
        custodyName: '',
        custodyPhone: '',
        custodyEmail: '',
        custodyAddress: '',
        signerName: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [loading, setLoading] = useState(false);
    const [submittedId, setSubmittedId] = useState(editId || null);
    const [validationErrors, setValidationErrors] = useState([]);
    const [beneficiarySuggestions, setBeneficiarySuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const custodyTouchedRef = useRef({});

    useEffect(() => {
        if (editId) fetchExistingData();
    }, [editId]);

    const applyBeneficiaryToCustody = useCallback((onlyEmpty = false) => {
        setFormData((prev) =>
            mergeBeneficiaryIntoCustody(prev, {
                touched: custodyTouchedRef.current,
                onlyEmpty,
            })
        );
    }, []);

    useEffect(() => {
        if (step !== 3) return;
        applyBeneficiaryToCustody(true);
    }, [step, applyBeneficiaryToCustody]);

    useEffect(() => {
        if (step !== 3) return;
        applyBeneficiaryToCustody(false);
    }, [step, formData.beneficiaryName, formData.address, applyBeneficiaryToCustody]);

    const setCustodyField = (field, value) => {
        if (CUSTODY_PREFILL_TARGETS.includes(field)) {
            custodyTouchedRef.current[field] = true;
        }
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validateStep = () => {
        let errors = [];
        if (step === 1) {
            if (!formData.companyName) errors.push('companyName');
            if (!formData.activities) errors.push('activities');
            if (!formData.country) errors.push('country');
            if (!formData.beneficiaryName) errors.push('beneficiaryName');
            if (!formData.birthDate) errors.push('birthDate');
            if (!formData.birthPlace) errors.push('birthPlace');
            if (!formData.address) errors.push('address');
        }
        if (step === 2) {
            if (formData.fundsSource.length === 0) errors.push('fundsSource');
        }
        if (step === 3) {
            if (!formData.custodyName) errors.push('custodyName');
            if (!formData.custodyPhone) errors.push('custodyPhone');
            if (!formData.custodyEmail) errors.push('custodyEmail');
            if (!formData.custodyAddress) errors.push('custodyAddress');
        }
        setValidationErrors(errors);
        return errors.length === 0;
    };

    const fetchExistingData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/${editId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const result = await response.json();
                setFormData(result.data);
            }
        } catch (error) {
            console.error('Error loading data');
        }
    };

    const searchBeneficiaries = async (query) => {
        if (!query || query.length < 2) {
            setBeneficiarySuggestions([]);
            setShowSuggestions(false);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/beneficiaries/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const results = await response.json();
                setBeneficiarySuggestions(results);
                setShowSuggestions(results.length > 0);
            }
        } catch (error) {
            console.error('Error searching beneficiaries', error);
        }
    };

    const handleNext = () => {
        if (!validateStep()) return;
        const nextStep = step + 1;
        if (nextStep === 3) {
            setFormData((prev) =>
                mergeBeneficiaryIntoCustody(prev, {
                    touched: custodyTouchedRef.current,
                    onlyEmpty: true,
                })
            );
        }
        setStep(nextStep);
        window.scrollTo(0, 0);
    };

    const handleBack = () => {
        setValidationErrors([]);
        setStep(step - 1);
    };

    const toggleFund = (fund) => {
        const updated = formData.fundsSource.includes(fund)
            ? formData.fundsSource.filter(f => f !== fund)
            : [...formData.fundsSource, fund];
        setFormData({ ...formData, fundsSource: updated });
        if (updated.length > 0) setValidationErrors(prev => prev.filter(e => e !== 'fundsSource'));
    };

    const handleFinish = async () => {
        if (!validateStep()) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    id: editId,
                    type: 'Fondos Registros contables',
                    data: formData
                })
            });
            const result = await response.json();
            if (response.ok) {
                setSubmittedId(result.id);
                setStep(4);
            }
        } catch (error) {
            alert('Error de conexión');
        } finally {
            setLoading(false);
        }
    };


    const renderStep = () => {
        const headerStyle = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '35px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' };
        const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' };
        const getErrorStyle = (field) => validationErrors.includes(field) ? { borderColor: '#ef4444', boxShadow: '0 0 0 4px #ef444415' } : {};

        switch(step) {
            case 1:
                return (
                    <div className="corporate-step">
                        <div style={headerStyle}>
                            <div style={{ padding: '8px', background: `${PRIMARY_COLOR}11`, borderRadius: '8px', color: PRIMARY_COLOR }}>
                                <Building size={20} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>{t('fondos.step1')} {editId && <span style={{ color: '#22c55e', fontSize: '12px', marginLeft: 10 }}>{t('fondos.editing')}</span>}</h2>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
                            <div>
                                <label style={labelStyle}>{t('fondos.companyName')}</label>
                                <input className="corporate-input" style={getErrorStyle('companyName')} autoComplete="off" value={formData.companyName} onChange={e => { setFormData({...formData, companyName: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'companyName')); }} placeholder={t('fondos.companyPlaceholder')} />
                            </div>
                            <div>
                                <label style={labelStyle}>{t('fondos.activities')}</label>
                                <textarea className="corporate-input" style={getErrorStyle('activities')} rows={3} value={formData.activities} onChange={e => { setFormData({...formData, activities: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'activities')); }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div>
                                    <label style={labelStyle}>{t('fondos.country')}</label>
                                    <input className="corporate-input" style={getErrorStyle('country')} autoComplete="off" value={formData.country} onChange={e => { setFormData({...formData, country: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'country')); }} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{t('fondos.beneficiaryName')}</label>
                                    <input className="corporate-input" style={getErrorStyle('beneficiaryName')} autoComplete="off" value={formData.beneficiaryName} 
                                        onChange={e => { 
                                            const val = e.target.value;
                                            setFormData({...formData, beneficiaryName: val}); 
                                            if (val) setValidationErrors(prev => prev.filter(err => err !== 'beneficiaryName')); 
                                            searchBeneficiaries(val);
                                        }} 
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        onFocus={() => { if (beneficiarySuggestions.length > 0) setShowSuggestions(true); }}
                                    />
                                    {showSuggestions && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', zIndex: 10, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                                            {beneficiarySuggestions.map((sug, idx) => (
                                                <div 
                                                    key={idx} 
                                                    style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: idx === beneficiarySuggestions.length - 1 ? 'none' : '1px solid #f1f5f9', fontSize: '13px', color: '#334155' }}
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            beneficiaryName: sug.beneficiaryName,
                                                            birthDate: sug.birthDate || prev.birthDate,
                                                            birthPlace: sug.birthPlace || prev.birthPlace,
                                                            address: sug.address || prev.address
                                                        }));
                                                        setShowSuggestions(false);
                                                    }}
                                                    onMouseEnter={e => e.target.style.background = '#f8fafc'}
                                                    onMouseLeave={e => e.target.style.background = 'white'}
                                                >
                                                    <div style={{ fontWeight: 600 }}>{sug.beneficiaryName}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                        {[sug.birthDate, sug.birthPlace].filter(Boolean).join(' • ')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div>
                                    <label style={labelStyle}>{t('fondos.birthDate')}</label>
                                    <input type="date" className="corporate-input" style={getErrorStyle('birthDate')} autoComplete="off" value={formData.birthDate} onChange={e => { setFormData({...formData, birthDate: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'birthDate')); }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>{t('fondos.birthPlace')}</label>
                                    <input className="corporate-input" style={getErrorStyle('birthPlace')} autoComplete="off" value={formData.birthPlace} onChange={e => { setFormData({...formData, birthPlace: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'birthPlace')); }} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>{t('fondos.address')}</label>
                                <input className="corporate-input" style={getErrorStyle('address')} autoComplete="off" value={formData.address} onChange={e => { setFormData({...formData, address: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'address')); }} />
                            </div>
                        </div>
                        {validationErrors.length > 0 && (
                            <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '10px', marginTop: '20px', border: '1px solid #fee2e2' }}>
                                <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700, margin: 0 }}>
                                    {t('fondos.validationTitle')}
                                </p>
                                <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#b91c1c', fontSize: '12px', fontWeight: 600 }}>
                                    {validationErrors.map(err => {
                                        return <li key={err}>{t(`fondos.fields.${err}`)}</li>;
                                    })}
                                </ul>
                            </div>
                        )}
                        <button onClick={handleNext} className="corporate-btn-primary" style={{ marginTop: '40px' }}>
                            {t('common.next')} <ChevronRight size={18} />
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div className="corporate-step">
                         <div style={headerStyle}>
                            <div style={{ padding: '8px', background: `${PRIMARY_COLOR}11`, borderRadius: '8px', color: PRIMARY_COLOR }}>
                                <Wallet size={20} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>{t('fondos.step2')}</h2>
                        </div>
              <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px', border: validationErrors.includes('fundsSource') ? '2px solid #ef4444' : '1px solid #e2e8f0', marginBottom: '25px', boxShadow: validationErrors.includes('fundsSource') ? '0 0 0 4px #ef444415' : 'none' }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: validationErrors.includes('fundsSource') ? '#ef4444' : '#64748b', marginBottom: '20px' }}>{t('fondos.fundsInstructions')}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {['bienes', 'inversiones', 'negocios', 'prestamos', 'herencia', 'otras'].map(fKey => (
                                    <label key={fKey} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '10px 15px', borderRadius: '8px', border: formData.fundsSource.includes(fKey) ? `1px solid ${PRIMARY_COLOR}` : '1px solid transparent', background: formData.fundsSource.includes(fKey) ? `${PRIMARY_COLOR}08` : 'transparent', transition: '0.2s' }}>
                                        <input type="checkbox" checked={formData.fundsSource.includes(fKey)} onChange={() => toggleFund(fKey)} style={{ width: '18px', height: '18px', accentColor: PRIMARY_COLOR }} />
                                        <span style={{ fontSize: '14px', fontWeight: formData.fundsSource.includes(fKey) ? 700 : 500, color: '#1e293b' }}>{t(`fondos.sources.${fKey}`)}</span>
                                    </label>
                                ))}
                            </div>
                    </div>

                         <div>
                            <label style={labelStyle}>{t('fondos.fundsOther')}</label>
                            <input className="corporate-input" value={formData.fundsOther} onChange={e => setFormData({...formData, fundsOther: e.target.value})} />
                        </div>

                         {validationErrors.length > 0 && <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700, marginTop: '20px' }}>{t('fondos.fundsError')}</p>}
                        <div style={{ display: 'flex', gap: '15px', marginTop: '40px' }}>
                            <button onClick={handleBack} className="corporate-btn-secondary"><ChevronLeft size={18} /> {t('common.back')}</button>
                            <button onClick={handleNext} className="corporate-btn-primary" style={{ flex: 1 }}>{t('common.continue')} <ChevronRight size={18} /></button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="corporate-step">
                         <div style={headerStyle}>
                            <div style={{ padding: '8px', background: `${PRIMARY_COLOR}11`, borderRadius: '8px', color: PRIMARY_COLOR }}>
                                <Shield size={20} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>{t('fondos.step3')}</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            <div>
                                <label style={labelStyle}>{t('fondos.custodyName')}</label>
                                <input 
                                    className="corporate-input" 
                                    style={getErrorStyle('custodyName')} 
                                    autoComplete="name"
                                    value={formData.custodyName} 
                                    onChange={e => { 
                                        const val = e.target.value;
                                        setCustodyField('custodyName', val);
                                        if (val) setValidationErrors(prev => prev.filter(err => err !== 'custodyName'));
                                    }} 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div>
                                    <label style={labelStyle}>{t('fondos.custodyPhone')}</label>
                                    <input type="text" className="corporate-input" style={getErrorStyle('custodyPhone')} autoComplete="tel" value={formData.custodyPhone} onChange={e => { setFormData({...formData, custodyPhone: e.target.value.replace(/\D/g,'')}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'custodyPhone')); }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>{t('fondos.custodyEmail')}</label>
                                    <input type="email" className="corporate-input" style={getErrorStyle('custodyEmail')} autoComplete="email" value={formData.custodyEmail} onChange={e => { setFormData({...formData, custodyEmail: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'custodyEmail')); }} placeholder="ejemplo@correo.com" />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>{t('fondos.custodyAddress')}</label>
                                <input className="corporate-input" style={getErrorStyle('custodyAddress')} autoComplete="street-address" value={formData.custodyAddress} onChange={e => { setCustodyField('custodyAddress', e.target.value); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'custodyAddress')); }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div>
                                    <label style={labelStyle}>{t('fondos.signerName')}</label>
                                    <input 
                                        className="corporate-input" 
                                        style={getErrorStyle('signerName')} 
                                        autoComplete="name"
                                        value={formData.signerName} 
                                        onChange={e => { setFormData({...formData, signerName: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'signerName')); }} 
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>{t('fondos.date')}</label>
                                    <input type="date" className="corporate-input" style={getErrorStyle('date')} value={formData.date} onChange={e => { setFormData({...formData, date: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'date')); }} />
                                </div>
                            </div>
                        </div>

                         {validationErrors.length > 0 && <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700, marginTop: '20px' }}>{t('fondos.custodyError')}</p>}
                        <div style={{ display: 'flex', gap: '15px', marginTop: '40px' }}>
                            <button onClick={handleBack} className="corporate-btn-secondary"><ChevronLeft size={18} /> {t('common.back')}</button>
                            <button onClick={handleFinish} className="corporate-btn-finish" style={{ background: PRIMARY_COLOR, padding: '16px' }} disabled={loading}>
                                <Save size={18} /> {loading ? t('common.saving') : t('fondos.finish')}
                            </button>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: '72px', height: '72px', background: '#ecfdf5', color: '#10b981', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', border: '1px solid #d1fae5' }}>
                            <Check size={36} />
                        </div>
                         <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>{t('fondos.validatedTitle')}</h2>
                        <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px' }}>{t('fondos.validatedBody')}</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
                            <button onClick={() => navigate('/dashboard')} className="corporate-btn-primary">
                                {t('fondos.backDashboard')}
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="corporate-page">
            <div className="corporate-card">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>{t('fondos.management')}</div>
                    <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><X size={24} /></button>
                </div>
                
                {/* Cabecera de Paso Estándar */}
                <div className="standard-step-header">
                    <span className="standard-step-title">
                        {step === 1 && `I. Identificación Corporativa`}
                        {step === 2 && `II. Declaración de Origen de Fondos`}
                        {step === 3 && `III. Registro y Responsabilidades`}
                        {step === 4 && `IV. Validación Completa`}
                    </span>
                    <span className="standard-step-badge">
                        PASO {step} DE 3
                    </span>
                </div>

                {/* Stepper Progresivo Estándar */}
                <div className="standard-progress-stepper">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`standard-progress-bar ${step >= s ? 'active' : ''}`} />
                    ))}
                </div>

                {renderStep()}
            </div>

            <style>{`
                .standard-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 5px; }
                .standard-step-title { font-size: 14px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
                .standard-step-badge { font-size: 11px; font-weight: 900; color: ${PRIMARY_COLOR}; background: ${PRIMARY_COLOR}15; padding: 4px 12px; border-radius: 20px; letter-spacing: 1px; }

                .standard-progress-stepper { display: flex; gap: 8px; margin-bottom: 40px; }
                .standard-progress-bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 10px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                .standard-progress-bar.active { background: ${PRIMARY_COLOR}; }

                .corporate-page {
                    min-height: 100vh;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .corporate-card {
                    width: 100%;
                    max-width: 750px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 24px;
                    padding: 50px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
                }
                .corporate-input {
                    width: 100%;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 14px 18px;
                    font-size: 15px;
                    color: #1e293b;
                    outline: none;
                    transition: all 0.2s;
                }
                .corporate-input:focus {
                    border-color: ${PRIMARY_COLOR};
                    box-shadow: 0 0 0 4px ${PRIMARY_COLOR}15;
                    background: white;
                }
                .corporate-btn-primary {
                    width: 100%;
                    background: ${PRIMARY_COLOR};
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 16px;
                    font-weight: 700;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s;
                    box-shadow: 0 10px 15px -3px ${PRIMARY_COLOR}33;
                }
                .corporate-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 20px -5px ${PRIMARY_COLOR}44;
                }
                .corporate-btn-secondary {
                    background: white;
                    border: 1.5px solid #e2e8f0;
                    color: #64748b;
                    padding: 14px 30px;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.2s;
                }
                .corporate-btn-secondary:hover {
                    border-color: #cbd5e1;
                    background: #f8fafc;
                }
                .corporate-btn-finish {
                    flex: 1;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s;
                }
            `}</style>
        </div>
    );
};

export default FondosForm;
