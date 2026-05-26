import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    ChevronLeft, ChevronRight, Check, Save, 
    FileCheck, Trash2, X, Building, Wallet, Shield 
} from 'lucide-react';
import { useT } from '../i18n';
import API_BASE_URL from '../config';
import { validateField, validateFields } from '../utils/fieldValidators';

const FondosForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const t = useT();
    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('id');

    const PRIMARY_COLOR = '#0f766e';

    const [beneficiarySuggestions, setBeneficiarySuggestions] = useState([]);
    const [beneficiaryLoading, setBeneficiaryLoading] = useState(false);
    const [showBeneficiaryDropdown, setShowBeneficiaryDropdown] = useState(false);
    const beneficiaryRef = useRef(null);
    const beneficiaryTimerRef = useRef(null);

    const searchBeneficiaries = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setBeneficiarySuggestions([]);
            setShowBeneficiaryDropdown(false);
            return;
        }
        setBeneficiaryLoading(true);
        setShowBeneficiaryDropdown(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/api/forms/beneficiaries/search?q=${encodeURIComponent(query)}`,
                { headers: { 'x-auth-token': token } }
            );
            if (res.ok) {
                const data = await res.json();
                setBeneficiarySuggestions(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setBeneficiaryLoading(false);
        }
    }, []);

    const handleBeneficiaryInputChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, beneficiaryName: val }));
        setValidationErrors(prev => prev.filter(err => err !== 'beneficiaryName'));
        handleFieldChange('beneficiaryName', val);
        if (beneficiaryTimerRef.current) clearTimeout(beneficiaryTimerRef.current);
        beneficiaryTimerRef.current = setTimeout(() => searchBeneficiaries(val), 300);
    };

    const handleBeneficiarySelect = (item) => {
        setFormData(prev => {
            const updates = { beneficiaryName: item.beneficiaryName };
            if (item.birthDate) updates.birthDate = item.birthDate;
            if (item.birthPlace) updates.birthPlace = item.birthPlace;
            if (item.address) updates.address = item.address;
            return { ...prev, ...updates };
        });
        setValidationErrors(prev => prev.filter(err => !['beneficiaryName','birthDate','birthPlace','address'].includes(err)));
        setShowBeneficiaryDropdown(false);
        setBeneficiarySuggestions([]);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (beneficiaryRef.current && !beneficiaryRef.current.contains(e.target)) {
                setShowBeneficiaryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
    const [fieldErrors, setFieldErrors] = useState({});

    const handleFieldBlur = (fieldName) => {
        const error = validateField(fieldName, formData[fieldName]);
        setFieldErrors(prev => {
            const next = { ...prev };
            if (error) next[fieldName] = error;
            else delete next[fieldName];
            return next;
        });
    };

    const getFieldErrorStyle = (fieldName) => fieldErrors[fieldName] ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #fecaca' } : {};

    const handleFieldChange = (fieldName, value) => {
        if (fieldErrors[fieldName]) {
            const err = validateField(fieldName, value);
            if (!err) setFieldErrors(prev => { const next = {...prev}; delete next[fieldName]; return next; });
        }
    };

    useEffect(() => {
        if (editId) fetchExistingData();
    }, [editId]);

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
            console.error(error);
        }
    };

    const handleNext = () => {
        if (!validateStep()) return;
        const nextStep = step + 1;
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

        const allFields = ['companyName', 'country', 'activities', 'beneficiaryName', 'birthDate', 'birthPlace', 'address', 'custodyName', 'custodyPhone', 'custodyEmail', 'custodyAddress', 'signerName', 'date'];
        if (formData.fundsOther) allFields.push('fundsOther');
        const fieldErrs = validateFields(formData, allFields);
        if (Object.keys(fieldErrs).length > 0) {
            setFieldErrors(fieldErrs);
            return;
        }

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
        const headerStyle = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '16px', borderBottom: '1px solid #e8edf2', paddingBottom: '10px' };
        const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' };
        const getErrorStyle = (field) => validationErrors.includes(field) ? { borderColor: '#ef4444', boxShadow: '0 0 0 4px #ef444415' } : {};

        switch(step) {
            case 1:
                return (
                    <div className="corporate-step">
                        <div style={headerStyle}>
                            <div style={{ padding: '5px', background: `${PRIMARY_COLOR}0a`, borderRadius: '4px', color: PRIMARY_COLOR }}>
                                <Building size={18} />
                            </div>
                            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{t('fondos.step1')} {editId && <span style={{ color: '#22c55e', fontSize: '11px', marginLeft: 6 }}>{t('fondos.editing')}</span>}</h2>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>{t('fondos.companyName')}</label>
                                <input className="corporate-input" style={{...getErrorStyle('companyName'), ...getFieldErrorStyle('companyName')}} autoComplete="off" value={formData.companyName} onChange={e => { setFormData({...formData, companyName: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'companyName')); handleFieldChange('companyName', e.target.value); }} onBlur={() => handleFieldBlur('companyName')} placeholder={t('fondos.companyPlaceholder')} />
                                {fieldErrors.companyName && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.companyName}</span>}
                            </div>
                            <div>
                                <label style={labelStyle}>{t('fondos.activities')}</label>
                                <textarea className="corporate-input" style={{...getErrorStyle('activities'), ...getFieldErrorStyle('activities')}} rows={3} value={formData.activities} onChange={e => { setFormData({...formData, activities: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'activities')); handleFieldChange('activities', e.target.value); }} onBlur={() => handleFieldBlur('activities')} />
                                {fieldErrors.activities && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.activities}</span>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>{t('fondos.country')}</label>
                                    <input className="corporate-input" style={{...getErrorStyle('country'), ...getFieldErrorStyle('country')}} autoComplete="off" value={formData.country} onChange={e => { setFormData({...formData, country: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'country')); handleFieldChange('country', e.target.value); }} onBlur={() => handleFieldBlur('country')} />
                                    {fieldErrors.country && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.country}</span>}
                                </div>
                                <div ref={beneficiaryRef} style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{t('fondos.beneficiaryName')}</label>
                                    <input
                                        className="corporate-input"
                                        style={{...getErrorStyle('beneficiaryName'), ...getFieldErrorStyle('beneficiaryName')}}
                                        autoComplete="off"
                                        value={formData.beneficiaryName}
                                        onChange={handleBeneficiaryInputChange}
                                        onFocus={() => { if (beneficiarySuggestions.length > 0) setShowBeneficiaryDropdown(true); }}
                                        onBlur={() => handleFieldBlur('beneficiaryName')}
                                        placeholder={t('fondos.beneficiaryPlaceholder') || ''}
                                    />
                                    {fieldErrors.beneficiaryName && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.beneficiaryName}</span>}
                                    {showBeneficiaryDropdown && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'white', border: '1px solid #cbd5e1', borderRadius: '0 0 5px 5px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: '180px', overflowY: 'auto' }}>
                                            {beneficiaryLoading ? (
                                                <div style={{ padding: '7px 10px', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>{t('fondos.beneficiarySearching')}</div>
                                            ) : beneficiarySuggestions.length === 0 ? (
                                                <div style={{ padding: '7px 10px', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>{t('fondos.beneficiaryNoResults')}</div>
                                            ) : beneficiarySuggestions.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    onMouseDown={(e) => { e.preventDefault(); handleBeneficiarySelect(item); }}
                                                    style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#eef6ff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                                >
                                                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{item.beneficiaryName}</div>
                                                    {(item.birthDate || item.birthPlace || item.address) && (
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                            {item.birthDate && <span>{item.birthDate}</span>}
                                                            {item.birthPlace && <span>{item.birthPlace}</span>}
                                                            {item.address && <span style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.address}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>{t('fondos.birthDate')}</label>
                                    <input type="date" className="corporate-input" style={{...getErrorStyle('birthDate'), ...getFieldErrorStyle('birthDate')}} autoComplete="off" value={formData.birthDate} onChange={e => { setFormData({...formData, birthDate: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'birthDate')); handleFieldChange('birthDate', e.target.value); }} onBlur={() => handleFieldBlur('birthDate')} />
                                    {fieldErrors.birthDate && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.birthDate}</span>}
                                </div>
                                <div>
                                    <label style={labelStyle}>{t('fondos.birthPlace')}</label>
                                    <input className="corporate-input" style={{...getErrorStyle('birthPlace'), ...getFieldErrorStyle('birthPlace')}} autoComplete="off" value={formData.birthPlace} onChange={e => { setFormData({...formData, birthPlace: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'birthPlace')); handleFieldChange('birthPlace', e.target.value); }} onBlur={() => handleFieldBlur('birthPlace')} />
                                    {fieldErrors.birthPlace && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.birthPlace}</span>}
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>{t('fondos.address')}</label>
                                <input className="corporate-input" style={{...getErrorStyle('address'), ...getFieldErrorStyle('address')}} autoComplete="off" value={formData.address} onChange={e => { setFormData({...formData, address: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'address')); handleFieldChange('address', e.target.value); }} onBlur={() => handleFieldBlur('address')} />
                                {fieldErrors.address && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.address}</span>}
                            </div>
                        </div>
                        {validationErrors.length > 0 && (
                            <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '6px', marginTop: '12px', border: '1px solid #fee2e2' }}>
                                <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700, margin: 0 }}>
                                    {t('fondos.validationTitle')}
                                </p>
                                <ul style={{ margin: '4px 0 0', paddingLeft: '16px', color: '#b91c1c', fontSize: '11px', fontWeight: 600 }}>
                                    {validationErrors.map(err => {
                                        return <li key={err}>{t(`fondos.fields.${err}`)}</li>;
                                    })}
                                </ul>
                            </div>
                        )}
                        <button onClick={handleNext} className="corporate-btn-primary" style={{ marginTop: '18px' }}>
                            {t('common.next')} <ChevronRight size={18} />
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div className="corporate-step">
                         <div style={headerStyle}>
                            <div style={{ padding: '5px', background: `${PRIMARY_COLOR}0a`, borderRadius: '4px', color: PRIMARY_COLOR }}>
                                <Wallet size={18} />
                            </div>
                            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{t('fondos.step2')}</h2>
                        </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: validationErrors.includes('fundsSource') ? '1.5px solid #ef4444' : '1px solid #e2e8f0', marginBottom: '12px', boxShadow: validationErrors.includes('fundsSource') ? '0 0 0 2px #ef444412' : 'none' }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: validationErrors.includes('fundsSource') ? '#ef4444' : '#64748b', marginBottom: '10px' }}>{t('fondos.fundsInstructions')}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {['bienes', 'inversiones', 'negocios', 'prestamos', 'herencia', 'otras'].map(fKey => (
                                    <label key={fKey} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', border: formData.fundsSource.includes(fKey) ? `1px solid ${PRIMARY_COLOR}` : '1px solid transparent', background: formData.fundsSource.includes(fKey) ? `${PRIMARY_COLOR}06` : 'transparent', transition: '0.15s' }}>
                                        <input type="checkbox" checked={formData.fundsSource.includes(fKey)} onChange={() => toggleFund(fKey)} style={{ width: '15px', height: '15px', accentColor: PRIMARY_COLOR }} />
                                        <span style={{ fontSize: '13px', fontWeight: formData.fundsSource.includes(fKey) ? 700 : 500, color: '#1e293b' }}>{t(`fondos.sources.${fKey}`)}</span>
                                    </label>
                                ))}
                            </div>
                    </div>

                         <div>
                            <label style={labelStyle}>{t('fondos.fundsOther')}</label>
                            <input className="corporate-input" style={getFieldErrorStyle('fundsOther')} autoComplete="off" value={formData.fundsOther} onChange={e => { setFormData({...formData, fundsOther: e.target.value}); handleFieldChange('fundsOther', e.target.value); }} onBlur={() => handleFieldBlur('fundsOther')} />
                            {fieldErrors.fundsOther && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.fundsOther}</span>}
                        </div>

                         {validationErrors.length > 0 && <p style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700, marginTop: '10px' }}>{t('fondos.fundsError')}</p>}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                            <button onClick={handleBack} className="corporate-btn-secondary"><ChevronLeft size={16} /> {t('common.back')}</button>
                            <button onClick={handleNext} className="corporate-btn-primary" style={{ flex: 1 }}>{t('common.continue')} <ChevronRight size={16} /></button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="corporate-step">
                         <div style={headerStyle}>
                            <div style={{ padding: '5px', background: `${PRIMARY_COLOR}0a`, borderRadius: '4px', color: PRIMARY_COLOR }}>
                                <Shield size={18} />
                            </div>
                            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{t('fondos.step3')}</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>{t('fondos.custodyName')}</label>
                                <input 
                                    className="corporate-input" 
                                    style={{...getErrorStyle('custodyName'), ...getFieldErrorStyle('custodyName')}} 
                                    autoComplete="off"
                                    value={formData.custodyName} 
                                    onChange={e => { 
                                        setFormData(prev => ({...prev, custodyName: e.target.value}));
                                        if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'custodyName'));
                                        handleFieldChange('custodyName', e.target.value);
                                    }} 
                                    onBlur={() => handleFieldBlur('custodyName')}
                                />
                                {fieldErrors.custodyName && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.custodyName}</span>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>{t('fondos.custodyPhone')}</label>
                                    <input type="text" className="corporate-input" style={{...getErrorStyle('custodyPhone'), ...getFieldErrorStyle('custodyPhone')}} autoComplete="off" value={formData.custodyPhone} onChange={e => { setFormData({...formData, custodyPhone: e.target.value.replace(/\D/g,'')}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'custodyPhone')); handleFieldChange('custodyPhone', e.target.value.replace(/\D/g,'')); }} onBlur={() => handleFieldBlur('custodyPhone')} />
                                    {fieldErrors.custodyPhone && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.custodyPhone}</span>}
                                </div>
                                <div>
                                    <label style={labelStyle}>{t('fondos.custodyEmail')}</label>
                                    <input type="email" className="corporate-input" style={{...getErrorStyle('custodyEmail'), ...getFieldErrorStyle('custodyEmail')}} autoComplete="off" value={formData.custodyEmail} onChange={e => { setFormData({...formData, custodyEmail: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'custodyEmail')); handleFieldChange('custodyEmail', e.target.value); }} onBlur={() => handleFieldBlur('custodyEmail')} placeholder="ejemplo@correo.com" />
                                    {fieldErrors.custodyEmail && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.custodyEmail}</span>}
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>{t('fondos.custodyAddress')}</label>
                                <input className="corporate-input" style={{...getErrorStyle('custodyAddress'), ...getFieldErrorStyle('custodyAddress')}} autoComplete="off" value={formData.custodyAddress} onChange={e => { setFormData(prev => ({...prev, custodyAddress: e.target.value})); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'custodyAddress')); handleFieldChange('custodyAddress', e.target.value); }} onBlur={() => handleFieldBlur('custodyAddress')} />
                                {fieldErrors.custodyAddress && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.custodyAddress}</span>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>{t('fondos.signerName')}</label>
                                    <input 
                                        className="corporate-input" 
                                        style={{...getErrorStyle('signerName'), ...getFieldErrorStyle('signerName')}} 
                                        autoComplete="off"
                                        value={formData.signerName} 
                                        onChange={e => { setFormData({...formData, signerName: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'signerName')); handleFieldChange('signerName', e.target.value); }} 
                                        onBlur={() => handleFieldBlur('signerName')}
                                    />
                                    {fieldErrors.signerName && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.signerName}</span>}
                                </div>
                                <div>
                                    <label style={labelStyle}>{t('fondos.date')}</label>
                                    <input type="date" className="corporate-input" style={{...getErrorStyle('date'), ...getFieldErrorStyle('date')}} value={formData.date} onChange={e => { setFormData({...formData, date: e.target.value}); if (e.target.value) setValidationErrors(prev => prev.filter(err => err !== 'date')); handleFieldChange('date', e.target.value); }} onBlur={() => handleFieldBlur('date')} />
                                    {fieldErrors.date && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.date}</span>}
                                </div>
                            </div>
                        </div>

                         {validationErrors.length > 0 && <p style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700, marginTop: '10px' }}>{t('fondos.custodyError')}</p>}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                            <button onClick={handleBack} className="corporate-btn-secondary"><ChevronLeft size={16} /> {t('common.back')}</button>
                            <button onClick={handleFinish} className="corporate-btn-finish" style={{ background: PRIMARY_COLOR, padding: '9px 18px' }} disabled={loading}>
                                <Save size={18} /> {loading ? t('common.saving') : t('fondos.finish')}
                            </button>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ width: '56px', height: '56px', background: '#ecfdf5', color: '#10b981', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', border: '1px solid #d1fae5' }}>
                            <Check size={28} />
                        </div>
                         <h2 style={{ marginBottom: '8px' }}>{t('fondos.validatedTitle')}</h2>
                        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>{t('fondos.validatedBody')}</p>
                        
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
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{t('fondos.management')}</div>
                    <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><X size={24} /></button>
                </div>
                
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

                <div className="standard-progress-stepper">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`standard-progress-bar ${step >= s ? 'active' : ''}`} />
                    ))}
                </div>

                {renderStep()}
            </div>

            <style>{`
                .standard-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 4px; }
                .standard-step-title { font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
                .standard-step-badge { font-size: 10px; font-weight: 800; color: ${PRIMARY_COLOR}; background: ${PRIMARY_COLOR}12; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px; }

                .standard-progress-stepper { display: flex; gap: 4px; margin-bottom: 18px; }
                .standard-progress-bar { flex: 1; height: 3px; background: #e2e8f0; border-radius: 3px; transition: all 0.3s ease; }
                .standard-progress-bar.active { background: ${PRIMARY_COLOR}; }

                .corporate-page {
                    min-height: 100vh;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .corporate-card {
                    width: 100%;
                    max-width: 750px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 28px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                }
                .corporate-input {
                    width: 100%;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    padding: 5px 8px;
                    font-size: 13px;
                    color: #1e293b;
                    outline: none;
                    transition: all 0.15s;
                    background: #f8fafc;
                }
                .corporate-input:focus {
                    border-color: ${PRIMARY_COLOR};
                    box-shadow: 0 0 0 2px rgba(15,118,110,0.08);
                    background: white;
                }
                .corporate-btn-primary {
                    width: 100%;
                    background: ${PRIMARY_COLOR};
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 9px 18px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.15s;
                    box-shadow: 0 2px 6px ${PRIMARY_COLOR}25;
                }
                .corporate-btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px ${PRIMARY_COLOR}30;
                }
                .corporate-btn-secondary {
                    background: white;
                    border: 1.5px solid #e2e8f0;
                    color: #64748b;
                    padding: 8px 18px;
                    border-radius: 6px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s;
                    font-size: 13px;
                }
                .corporate-btn-secondary:hover {
                    border-color: #cbd5e1;
                    background: #f8fafc;
                }
                .corporate-btn-finish {
                    flex: 1;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.15s;
                    font-size: 13px;
                }
            `}</style>
        </div>
    );
};

export default FondosForm;
