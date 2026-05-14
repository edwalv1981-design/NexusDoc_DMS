import React, { useState, useEffect } from 'react';
import { 
    Building, Users, UserCheck, Briefcase, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    AlertCircle, CheckCircle2, ShieldCheck, Download, Eye, FileText
} from 'lucide-react';
import { useT } from '../i18n';
const CorporacionForm = ({ initialData, onSave, saving }) => {
    const t = useT();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Basic Info
        corpNameSA: '', corpNameCorp: '', corpNameInc: '',
        capitalSocial: '10000', 
        companyActivities: '',
        
        // Dynamic Arrays
        directors: [
            { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' },
            { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' },
            { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' }
        ],
        dignitaries: {
            presidente: { fullName: '', birthDate: '', passport: '', registrationNumber: '', directorRef: '' },
            secretario: { fullName: '', birthDate: '', passport: '', registrationNumber: '', directorRef: '' },
            tesorero: { fullName: '', birthDate: '', passport: '', registrationNumber: '', directorRef: '' }
        },
        shareholders: [
            { certificate: '', value: '', shares: '', name: '', address: '' }
        ],
        
        // Declaration
        declarationName: '',
        declarationDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    // LÓGICA DE DIGNATARIOS VINCULADOS
    const handleDirectorSelectForDignitary = (role, directorIndex) => {
        if (directorIndex === "") {
            setFormData(prev => ({
                ...prev,
                dignitaries: {
                    ...prev.dignitaries,
                    [role]: { fullName: '', birthDate: '', passport: '', registrationNumber: '', directorRef: '' }
                }
            }));
            return;
        }

        const director = formData.directors[directorIndex];
        const nameParts = [director.firstName, director.secondName, director.lastName].filter(p => p && p.trim() !== "");
        const fullName = nameParts.join(' ');
        
        setFormData(prev => ({
            ...prev,
            dignitaries: {
                ...prev.dignitaries,
                [role]: { 
                    fullName, 
                    birthDate: director.birthDate, 
                    passport: director.passport,
                    registrationNumber: prev.dignitaries[role].registrationNumber,
                    directorRef: directorIndex 
                }
            }
        }));
    };

    // GESTIÓN DE DIRECTORES
    const addDirector = () => {
        setFormData(prev => ({
            ...prev,
            directors: [...prev.directors, { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' }]
        }));
    };

    const removeDirector = (index) => {
        if (formData.directors.length <= 3) return;
        const newDirectors = formData.directors.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, directors: newDirectors }));
    };

    const updateDirector = (index, field, value) => {
        const newDirectors = [...formData.directors];
        newDirectors[index][field] = value;
        setFormData(prev => ({ ...prev, directors: newDirectors }));
    };

    // GESTIÓN DE ACCIONISTAS
    const addShareholder = () => {
        setFormData(prev => ({
            ...prev,
            shareholders: [...prev.shareholders, { certificate: '', value: '', shares: '', name: '', address: '' }]
        }));
    };

    const removeShareholder = (index) => {
        if (formData.shareholders.length <= 1) return;
        const newShareholders = formData.shareholders.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, shareholders: newShareholders }));
    };

    const updateShareholder = (index, field, value) => {
        const newShareholders = [...formData.shareholders];
        newShareholders[index][field] = value;
        setFormData(prev => ({ ...prev, shareholders: newShareholders }));
    };

    const PRIMARY = '#0078d4';
    const SECONDARY = '#1e293b';

    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building size={22} color={PRIMARY} /> {t('corporacion.steps.societyInfo')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div className="expert-group">
                    <label>{t('corporacion.fields.nameSA')}</label>
                    <input className="expert-input" value={formData.corpNameSA} onChange={e => setFormData({...formData, corpNameSA: e.target.value})} placeholder="Ej: NEXUS SOLUTIONS S.A." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="expert-group">
                        <label>{t('corporacion.fields.nameCorp')}</label>
                        <input className="expert-input" value={formData.corpNameCorp} onChange={e => setFormData({...formData, corpNameCorp: e.target.value})} />
                    </div>
                    <div className="expert-group">
                        <label>{t('corporacion.fields.nameInc')}</label>
                        <input className="expert-input" value={formData.corpNameInc} onChange={e => setFormData({...formData, corpNameInc: e.target.value})} />
                    </div>
                </div>
                <div className="expert-group">
                    <label>{t('corporacion.fields.capital')}</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>$</span>
                        <input type="number" min="10000" className="expert-input" style={{ paddingLeft: '30px' }} value={formData.capitalSocial} onChange={e => setFormData({...formData, capitalSocial: e.target.value})} />
                    </div>
                    {parseInt(formData.capitalSocial) < 10000 && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '5px', fontWeight: 600 }}>{t('corporacion.fields.minCapitalError')}</p>}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Users size={22} color={PRIMARY} /> {t('corporacion.steps.directors')}
                </h2>
                <button type="button" onClick={addDirector} className="expert-btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }}>
                    <Plus size={16} /> {t('corporacion.fields.addDirector')}
                </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {formData.directors.map((d, index) => (
                    <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#f8fafc', position: 'relative' }}>
                        <div style={{ position: 'absolute', right: '15px', top: '15px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>{t('corporacion.fields.directorNum', { n: index + 1 })}</span>
                            {formData.directors.length > 3 && (
                                <button onClick={() => removeDirector(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            )}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
                            <div className="expert-group"><label>{t('corporacion.fields.firstName')}</label><input className="expert-input" value={d.firstName} onChange={e => updateDirector(index, 'firstName', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.middleName')}</label><input className="expert-input" value={d.secondName} onChange={e => updateDirector(index, 'secondName', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.lastName')}</label><input className="expert-input" value={d.lastName} onChange={e => updateDirector(index, 'lastName', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.maritalStatus')}</label>
                                <select className="expert-input" value={d.maritalStatus} onChange={e => updateDirector(index, 'maritalStatus', e.target.value)}>
                                    <option value="">{t('corporacion.fields.select')}</option>
                                    <option value="Soltero(a)">{t('corporacion.marital.single')}</option>
                                    <option value="Casado(a)">{t('corporacion.marital.married')}</option>
                                    <option value="Divorciado(a)">{t('corporacion.marital.divorced')}</option>
                                    <option value="Viudo(a)">{t('corporacion.marital.widowed')}</option>
                                </select>
                            </div>
                            <div className="expert-group"><label>{t('corporacion.fields.nationality')}</label><input className="expert-input" value={d.nationality} onChange={e => updateDirector(index, 'nationality', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.passport')}</label><input className="expert-input" value={d.passport} onChange={e => updateDirector(index, 'passport', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.birthDate')}</label><input type="date" className="expert-input" value={d.birthDate} onChange={e => updateDirector(index, 'birthDate', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.phone')}</label><input type="text" className="expert-input" value={d.phone} onChange={e => updateDirector(index, 'phone', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.email')}</label><input type="email" className="expert-input" value={d.email} onChange={e => updateDirector(index, 'email', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.city')}</label><input className="expert-input" value={d.city} onChange={e => updateDirector(index, 'city', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.country')}</label><input className="expert-input" value={d.country} onChange={e => updateDirector(index, 'country', e.target.value)} /></div>
                        </div>
                        <div className="expert-group" style={{ marginTop: '15px' }}><label>{t('corporacion.fields.address')}</label><input className="expert-input" value={d.address} onChange={e => updateDirector(index, 'address', e.target.value)} /></div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserCheck size={22} color={PRIMARY} /> {t('corporacion.steps.dignitaries')}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '25px' }}>{t('corporacion.fields.dignitaryInstructions')}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {['presidente', 'secretario', 'tesorero'].map(role => (
                    <div key={role} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: '15px' }}>
                            <div style={{ width: '40px', height: '40px', background: `${PRIMARY}10`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY, fontWeight: 800 }}>{role[0].toUpperCase()}</div>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'capitalize' }}>{role}</h3>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="expert-group">
                                <label>{t('corporacion.fields.linkDirector')}</label>
                                <select 
                                    className="expert-input" 
                                    value={formData.dignitaries[role].directorRef} 
                                    onChange={e => handleDirectorSelectForDignitary(role, e.target.value)}
                                >
                                    <option value="">{t('corporacion.fields.select')}</option>
                                    {formData.directors.map((d, i) => (
                                        <option key={i} value={i}>{d.firstName} {d.lastName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="expert-group">
                                <label>{t('corporacion.fields.regNumber')}</label>
                                <input className="expert-input" value={formData.dignitaries[role].registrationNumber} onChange={e => setFormData({
                                    ...formData,
                                    dignitaries: {
                                        ...formData.dignitaries,
                                        [role]: { ...formData.dignitaries[role], registrationNumber: e.target.value }
                                    }
                                })} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                            <div className="expert-group">
                                <label>{t('corporacion.fields.birthDate')}</label>
                                <input type="date" className="expert-input" value={formData.dignitaries[role].birthDate} onChange={e => setFormData({
                                    ...formData,
                                    dignitaries: {
                                        ...formData.dignitaries,
                                        [role]: { ...formData.dignitaries[role], birthDate: e.target.value }
                                    }
                                })} />
                            </div>
                            <div className="expert-group">
                                <label>{t('corporacion.fields.passport')}</label>
                                <input className="expert-input" value={formData.dignitaries[role].passport} onChange={e => setFormData({
                                    ...formData,
                                    dignitaries: {
                                        ...formData.dignitaries,
                                        [role]: { ...formData.dignitaries[role], passport: e.target.value }
                                    }
                                })} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Briefcase size={22} color={PRIMARY} /> {t('corporacion.steps.shareholders')}
                </h2>
                <button type="button" onClick={addShareholder} className="expert-btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }}>
                    <Plus size={16} /> {t('corporacion.fields.addShareholder')}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {formData.shareholders.map((s, index) => (
                    <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', background: 'white', position: 'relative' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 80px 1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
                            <div className="expert-group"><label>{t('corporacion.fields.cert')}</label><input className="expert-input" value={s.certificate} onChange={e => updateShareholder(index, 'certificate', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.value')}</label><input className="expert-input" value={s.value} onChange={e => updateShareholder(index, 'value', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.shares')}</label><input className="expert-input" value={s.shares} onChange={e => updateShareholder(index, 'shares', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.fullName')}</label><input className="expert-input" value={s.name} onChange={e => updateShareholder(index, 'name', e.target.value)} /></div>
                            <div className="expert-group"><label>{t('corporacion.fields.address')}</label><input className="expert-input" value={s.address} onChange={e => updateShareholder(index, 'address', e.target.value)} /></div>
                            {formData.shareholders.length > 1 && (
                                <button onClick={() => removeShareholder(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px' }}><Trash2 size={16} /></button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileCheck size={22} color={PRIMARY} /> {t('corporacion.steps.finalization')}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div className="expert-group">
                    <label>{t('corporacion.fields.activities')}</label>
                    <textarea 
                        className="expert-input" 
                        rows={4} 
                        value={formData.companyActivities} 
                        onChange={e => setFormData({...formData, companyActivities: e.target.value})} 
                        placeholder={t('corporacion.fields.activitiesPlaceholder')}
                    />
                </div>
                
                <div style={{ border: `1px solid ${PRIMARY}30`, background: `${PRIMARY}05`, borderRadius: '12px', padding: '25px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '15px', color: PRIMARY }}>{t('corporacion.fields.declarationTitle')}</h3>
                    <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
                        {t('corporacion.fields.declarationBody')}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="expert-group">
                            <label>{t('corporacion.fields.declarantName')}</label>
                            <input className="expert-input" value={formData.declarationName} onChange={e => setFormData({...formData, declarationName: e.target.value})} />
                        </div>
                        <div className="expert-group">
                            <label>{t('corporacion.fields.signatureDate')}</label>
                            <input type="date" className="expert-input" value={formData.declarationDate} onChange={e => setFormData({...formData, declarationDate: e.target.value})} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );


    const nextStep = () => {
        if (step === 1 && parseInt(formData.capitalSocial) < 10000) return;
        setStep(prev => prev + 1);
    };

    return (
        <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>{t('corporacion.title')}</h1>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{t('corporacion.subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save">
                        <Save size={18} /> {saving ? t('common.saving') : t('corporacion.saveDraft')}
                    </button>
                </div>
            </div>

            {/* PROGRESS TRACKER */}
            <div style={{ display: 'flex', gap: 10, marginBottom: '40px' }}>
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} style={{ flex: 1, position: 'relative' }}>
                        <div style={{ height: '5px', background: step >= s ? PRIMARY : '#e2e8f0', borderRadius: '10px', transition: 'all 0.3s' }} />
                        <div style={{ position: 'absolute', top: '-25px', left: '0', fontSize: '10px', fontWeight: 800, color: step >= s ? PRIMARY : '#94a3b8' }}>
                            {t(`corporacion.steps.step${s}`)}
                        </div>
                    </div>
                ))}
            </div>

            {/* FORM CONTENT */}
            <div style={{ background: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 25px rgba(0,0,0,0.02)' }}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '30px', borderTop: '1px solid #f1f5f9' }}>
                    <button 
                        type="button" 
                        onClick={() => setStep(prev => prev - 1)} 
                        disabled={step === 1}
                        className="expert-btn-nav"
                        style={{ opacity: step === 1 ? 0.3 : 1 }}
                    >
                        <ChevronLeft size={18} /> {t('corporacion.status.prev')}
                    </button>
                    
                    {step < 5 ? (
                        <button type="button" onClick={nextStep} className="expert-btn-primary">
                            {t('corporacion.status.next')} <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button type="button" onClick={() => onSave(formData, true)} disabled={saving} className="expert-btn-finish">
                            <CheckCircle2 size={18} /> {saving ? t('common.saving') : t('corporacion.status.saveFinish')}
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .expert-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 13px; font-weight: 500; transition: all 0.2s; }
                .expert-input:focus { border-color: ${PRIMARY}; box-shadow: 0 0 0 4px ${PRIMARY}15; }
                .expert-group { display: flex; flex-direction: column; gap: 6px; }
                .expert-group label { font-size: 10px; font-weight: 800; color: #475569; letter-spacing: 0.5px; }
                .expert-btn-primary { padding: 12px 25px; background: ${PRIMARY}; color: white; border: none; borderRadius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
                .expert-btn-nav { padding: 12px 25px; background: #f1f5f9; color: #475569; border: none; borderRadius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
                .expert-btn-save { padding: 10px 20px; background: white; color: ${PRIMARY}; border: 1.5px solid ${PRIMARY}; borderRadius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 12px; }
                .expert-btn-secondary { background: white; color: ${SECONDARY}; border: 1.5px solid #e2e8f0; borderRadius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
                .expert-btn-finish { padding: 12px 25px; background: #16a34a; color: white; border: none; borderRadius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
            `}</style>
        </div>
    );
};

export default CorporacionForm;
