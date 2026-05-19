import React, { useState, useEffect, useCallback } from 'react';
import { 
    Building, Users, UserCheck, Briefcase, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    CheckCircle2, Info, Award
} from 'lucide-react';
import { useLang } from '../i18n';
import FundacionRegistryNameInput from '../components/FundacionRegistryNameInput';
import {
    buildCorporacionPersonRegistry,
    findPersonInRegistry,
    pickCorporacionDirectorFields,
    pickCorporacionDignitaryFields,
    pickCorporacionShareholderPersonFields,
    pickCorporacionSignerFields,
    normalizeLoadedCorporacionData,
} from '../utils/corporacionPersonRegistry';

const CorporacionForm = ({ initialData, onSave, saving }) => {
    const { lang, t } = useLang();
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
        dignitaries: [
            { role: 'PRESIDENTE', fullName: '', birthDate: '', passport: '', registrationNumber: '' },
            { role: 'SECRETARIO', fullName: '', birthDate: '', passport: '', registrationNumber: '' },
            { role: 'TESORERO', fullName: '', birthDate: '', passport: '', registrationNumber: '' }
        ],
        shareholders: [
            { certificate: '1', value: '100', shares: '100', name: '', address: '' }
        ],
        
        // Declaration
        signers: [
            { signature: '', name: '' }
        ],
        declarationDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            const cleanData = normalizeLoadedCorporacionData(initialData, formData);
            setFormData(prev => ({ ...prev, ...cleanData }));
        }
    }, [initialData]);

    const registryForRow = useCallback(
        (arrayName, index) => buildCorporacionPersonRegistry(formData, { arrayName, index }),
        [formData]
    );

    const applyDirectorAt = useCallback((index, source) => {
        if (!source) return;
        const patch = pickCorporacionDirectorFields(source);
        setFormData(prev => {
            const directors = [...prev.directors];
            directors[index] = { ...directors[index], ...patch };
            return { ...prev, directors };
        });
    }, []);

    const applyDignitaryAt = useCallback((index, source) => {
        if (!source) return;
        const patch = pickCorporacionDignitaryFields(source);
        setFormData(prev => {
            const dignitaries = [...prev.dignitaries];
            dignitaries[index] = { ...dignitaries[index], ...patch };
            return { ...prev, dignitaries };
        });
    }, []);

    const applyShareholderAt = useCallback((index, source) => {
        if (!source) return;
        const patch = pickCorporacionShareholderPersonFields(source);
        setFormData(prev => {
            const shareholders = [...prev.shareholders];
            shareholders[index] = { ...shareholders[index], ...patch };
            return { ...prev, shareholders };
        });
    }, []);

    const applySignerAt = useCallback((index, source) => {
        if (!source) return;
        const patch = pickCorporacionSignerFields(source);
        setFormData(prev => {
            const signers = [...prev.signers];
            signers[index] = { ...signers[index], ...patch };
            return { ...prev, signers };
        });
    }, []);

    const tryApplyDirectorFromDraft = useCallback(
        (index, draft) => {
            const reg = registryForRow('directors', index);
            const hit = findPersonInRegistry(reg, draft);
            if (hit) applyDirectorAt(index, hit);
        },
        [registryForRow, applyDirectorAt]
    );

    const addDignitary = () => {
        setFormData(prev => ({
            ...prev,
            dignitaries: [...prev.dignitaries, { role: '', fullName: '', birthDate: '', passport: '', registrationNumber: '' }]
        }));
    };

    const removeDignitary = (index) => {
        if (formData.dignitaries.length <= 1) return;
        setFormData(prev => ({ ...prev, dignitaries: prev.dignitaries.filter((_, i) => i !== index) }));
    };

    const updateDignitary = (index, field, value) => {
        const newDigs = [...formData.dignitaries];
        newDigs[index][field] = value;
        setFormData(prev => ({ ...prev, dignitaries: newDigs }));
    };


    const addDirector = () => {
        setFormData(prev => ({
            ...prev,
            directors: [...prev.directors, { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' }]
        }));
    };

    const removeDirector = (index) => {
        if (formData.directors.length <= 3) return;
        setFormData(prev => ({ ...prev, directors: prev.directors.filter((_, i) => i !== index) }));
    };

    const updateDirector = (index, field, value) => {
        const newDirectors = [...formData.directors];
        newDirectors[index][field] = value;
        setFormData(prev => ({ ...prev, directors: newDirectors }));
    };

    const addShareholder = () => {
        setFormData(prev => ({
            ...prev,
            shareholders: [...prev.shareholders, { certificate: '', value: '', shares: '', name: '', address: '' }]
        }));
    };

    const removeShareholder = (index) => {
        if (formData.shareholders.length <= 1) return;
        setFormData(prev => ({ ...prev, shareholders: prev.shareholders.filter((_, i) => i !== index) }));
    };

    const updateShareholder = (index, field, value) => {
        const newShareholders = [...formData.shareholders];
        newShareholders[index][field] = value;
        setFormData(prev => ({ ...prev, shareholders: newShareholders }));
    };


    const addSigner = () => {
        setFormData(prev => ({ ...prev, signers: [...prev.signers, { signature: '', name: '' }] }));
    };

    const removeSigner = (index) => {
        if (formData.signers.length <= 1) return;
        setFormData(prev => ({ ...prev, signers: prev.signers.filter((_, i) => i !== index) }));
    };

    const updateSigner = (index, field, value) => {
        const newSigners = [...formData.signers];
        newSigners[index][field] = value;
        if (field === 'name') {
            newSigners[index].signature = value;
        }
        setFormData(prev => ({ ...prev, signers: newSigners }));
    };


    const PRIMARY = '#0078d4';
    const SECONDARY = '#1e293b';

    const renderStep1 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><Building size={22} color={PRIMARY} /> {t('corporacion.steps.societyInfo') || 'Información de la Sociedad'}</h2>
            
            <div className="expert-hint-box" style={{ marginBottom: '25px', display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '8px', padding: '15px' }}>
                <Info size={20} color="#0369a1" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.5' }}>
                    <strong>
                        {lang === 'en'
                            ? 'List the names you wish to use to incorporate your corporation in order of preference.'
                            : 'Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia.'
                        }
                    </strong>
                    <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#475569' }}>
                        {lang === 'en'
                            ? 'The name of the Company must be determined by one of the following terminations: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A/S, N.V., B.V., AG.'
                            : 'El nombre de la Compañía debe terminar con una de las siguientes terminaciones: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A/S, N.V., B.V., AG.'
                        }
                    </div>
                </div>
            </div>

            <div className="expert-grid">
                <div className="expert-field full-width">
                    <label>{lang === 'en' ? 'Commercial Name (S.A.) - 1st Choice' : 'Nombre Comercial (S.A.) - Opción 1'}</label>
                    <input className="expert-input" value={formData.corpNameSA} onChange={e => setFormData({...formData, corpNameSA: e.target.value})} placeholder="NEXUS SOLUTIONS S.A." />
                </div>
                <div className="expert-field">
                    <label>{lang === 'en' ? 'Optional Name (CORP.) - 2nd Choice' : 'Nombre Opcional (CORP.) - Opción 2'}</label>
                    <input className="expert-input" value={formData.corpNameCorp} onChange={e => setFormData({...formData, corpNameCorp: e.target.value})} placeholder="NEXUS SOLUTIONS CORP." />
                </div>
                <div className="expert-field">
                    <label>{lang === 'en' ? 'Optional Name (INC.) - 3rd Choice' : 'Nombre Opcional (INC.) - Opción 3'}</label>
                    <input className="expert-input" value={formData.corpNameInc} onChange={e => setFormData({...formData, corpNameInc: e.target.value})} placeholder="NEXUS SOLUTIONS INC." />
                </div>
                <div className="expert-field full-width">
                    <label>{lang === 'en' ? 'Authorized Capital (MIN $10,000)' : 'Capital Social Autorizado (MÍN $10,000)'}</label>
                    <div className="expert-hint">
                        {lang === 'en'
                            ? 'The minimum authorized capital of the company is US$10,000.00.'
                            : 'El capital mínimo autorizado de la sociedad es US$10,000.00.'
                        }
                    </div>
                    <input className="expert-input" value={formData.capitalSocial} onChange={e => setFormData({...formData, capitalSocial: e.target.value})} placeholder="$10,000.00" />
                </div>
            </div>
        </div>
    );


    const renderStep2 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Users size={22} color={PRIMARY} /> {t('corporacion.steps.directors')}</h2>
                <button onClick={addDirector} className="expert-btn-add"><Plus size={16} /> {t('corporacion.fields.addDirector')}</button>
            </div>
            <div className="expert-hint-box">
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? 'In Panama, a minimum of 3 directors are required for the board of directors.'
                        : 'En Panamá se requieren mínimo 3 directores para la junta directiva.'
                    }
                </div>
            </div>
            {formData.directors.map((d, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">DIRECTOR #{i+1}</div>
                    {formData.directors.length > 3 && <button onClick={() => removeDirector(i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field"><label>{lang === 'en' ? 'First Name' : 'Primer nombre'}</label><input className="expert-input" value={d.firstName} onChange={e => { updateDirector(i, 'firstName', e.target.value); if (e.target.value.includes(' ')) tryApplyDirectorFromDraft(i, { ...d, firstName: e.target.value }); }} onBlur={() => tryApplyDirectorFromDraft(i, d)} autoComplete="off" /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Middle Name' : 'Segundo nombre'}</label><input className="expert-input" value={d.secondName} onChange={e => updateDirector(i, 'secondName', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Surname(s)' : 'Apellidos'}</label><input className="expert-input" value={d.lastName} onChange={e => updateDirector(i, 'lastName', e.target.value)} onBlur={() => tryApplyDirectorFromDraft(i, d)} autoComplete="off" /></div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Marital Status' : 'Estado civil'}</label>
                            <select className="expert-input" value={d.maritalStatus} onChange={e => updateDirector(i, 'maritalStatus', e.target.value)}>
                                <option value="">{lang === 'en' ? 'Select...' : 'Seleccione...'}</option>
                                <option value="Soltero(a)">{lang === 'en' ? 'Single' : 'Soltero(a)'}</option>
                                <option value="Casado(a)">{lang === 'en' ? 'Married' : 'Casado(a)'}</option>
                                <option value="Divorciado(a)">{lang === 'en' ? 'Divorced' : 'Divorciado(a)'}</option>
                                <option value="Viudo(a)">{lang === 'en' ? 'Widowed' : 'Viudo(a)'}</option>
                            </select>
                        </div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Citizenship' : 'Nacionalidad'}</label><input className="expert-input" value={d.nationality} onChange={e => updateDirector(i, 'nationality', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label><input className="expert-input" value={d.passport} onChange={e => updateDirector(i, 'passport', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label><input type="date" className="expert-input" value={d.birthDate} onChange={e => updateDirector(i, 'birthDate', e.target.value)} /></div>
                        <div className="expert-field full-width"><label>{lang === 'en' ? 'Residential Address' : 'Dirección completa'}</label><input className="expert-input" value={d.address} onChange={e => updateDirector(i, 'address', e.target.value)} /></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep3 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><UserCheck size={22} color={PRIMARY} /> {t('corporacion.steps.dignitaries')}</h2>
                <button onClick={addDignitary} className="expert-btn-add"><Plus size={16} /> {t('corporacion.fields.addDignitary')}</button>
            </div>
            <div className="expert-hint-box">
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? 'Dignitaries can be the directors themselves or third parties.'
                        : 'Los dignatarios pueden ser los mismos directores o terceras personas.'
                    }
                </div>
            </div>
            {formData.dignitaries.map((dig, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">DIGNATARIO #{i+1}</div>
                    {formData.dignitaries.length > 3 && <button onClick={() => removeDignitary(i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field"><label>{lang === 'en' ? 'Position / Role (President, Secretary, Treasurer...)' : 'Cargo (Presidente, Secretario, Tesorero...)'}</label><input className="expert-input" value={dig.role} onChange={e => updateDignitary(i, 'role', e.target.value.toUpperCase())} placeholder="EJ: PRESIDENTE" /></div>
                        <div className="expert-field full-width"><label>{lang === 'en' ? 'Full name' : 'Nombre completo'}</label><FundacionRegistryNameInput value={dig.fullName} onChange={(v) => updateDignitary(i, 'fullName', v)} registry={registryForRow('dignitaries', i)} onMatch={(hit) => applyDignitaryAt(i, hit)} className="expert-input" /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label><input className="expert-input" value={dig.passport} onChange={e => updateDignitary(i, 'passport', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label><input type="date" className="expert-input" value={dig.birthDate} onChange={e => updateDignitary(i, 'birthDate', e.target.value)} /></div>
                    </div>
                </div>
            ))}
        </div>
    );


    const renderStep4 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Award size={22} color={PRIMARY} /> {t('corporacion.steps.shareholders')}</h2>
                <button onClick={addShareholder} className="expert-btn-add"><Plus size={16} /> {t('corporacion.fields.addShareholder')}</button>
            </div>
            <div className="expert-hint-box">
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? "Indicate the distribution of the company's initial shares."
                        : 'Indicar la distribución de las acciones iniciales de la sociedad.'
                    }
                </div>
            </div>
            {formData.shareholders.map((s, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">ACCIONISTA #{i+1}</div>
                    {formData.shareholders.length > 1 && <button onClick={() => removeShareholder(i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field"><label>{lang === 'en' ? 'Share Certificate Number' : 'No. de Certificado'}</label><input className="expert-input" value={s.certificate} onChange={e => updateShareholder(i, 'certificate', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? "Share's value (USD)" : 'Valor por acción (USD)'}</label><input className="expert-input" value={s.value} onChange={e => updateShareholder(i, 'value', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Number of shares' : 'Cantidad de acciones'}</label><input className="expert-input" value={s.shares} onChange={e => updateShareholder(i, 'shares', e.target.value)} /></div>
                        <div className="expert-field full-width"><label>{lang === 'en' ? 'Shareholder (Full name)' : 'Accionista (Nombre completo)'}</label><FundacionRegistryNameInput value={s.name} onChange={(v) => updateShareholder(i, 'name', v)} registry={registryForRow('shareholders', i)} onMatch={(hit) => applyShareholderAt(i, hit)} className="expert-input" /></div>
                        <div className="expert-field full-width"><label>{lang === 'en' ? 'Residential Address' : 'Dirección residencial'}</label><input className="expert-input" value={s.address} onChange={e => updateShareholder(i, 'address', e.target.value)} /></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep5 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><FileCheck size={22} color={PRIMARY} /> {t('corporacion.steps.finalization')}</h2>
            <div className="expert-field full-width" style={{ marginBottom: '30px' }}>
                <label>{lang === 'en' ? 'Company Activities / Purpose' : 'Actividades y Objeto Social de la Compañía'}</label>
                <div className="expert-hint" style={{ marginBottom: '10px' }}>
                    {lang === 'en'
                        ? "Please provide an explanation of the corporation's activities."
                        : 'Favor provea una explicación de la actividad de la sociedad.'
                    }
                </div>
                <textarea className="expert-input" rows={4} value={formData.companyActivities} onChange={e => setFormData({...formData, companyActivities: e.target.value})} placeholder={lang === 'en' ? 'Describe company activities...' : 'Describa las actividades...'} />
            </div>

            <div className="expert-legal-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: SECONDARY, margin: 0 }}>{lang === 'en' ? 'Declaration / Sworn Affidavit' : 'Declaración / Declaración Jurada'}</h3>
                    <button onClick={addSigner} className="expert-btn-add-white"><Plus size={16} /> {t('corporacion.fields.addSigner') || (lang === 'en' ? 'ADD SIGNER' : 'AGREGAR FIRMANTE')}</button>
                </div>
                <p className="expert-legal-text">
                    {lang === 'en'
                        ? 'I/We declare that the origin of funds and goods linked to the services provided by Panama Tax Lawyers and its associates derive from legitimate sources and without criminal origin.'
                        : 'Declaro que el origen de los fondos y bienes vinculados a los servicios prestados por Panama Tax Lawyers y sus asociados derivan de fuentes legítimas y sin origen delictivo.'
                    }
                </p>
                
                {formData.signers.map((s, i) => (
                    <div key={i} style={{ marginTop: '20px', padding: '25px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 900, color: PRIMARY, letterSpacing: '0.5px' }}>{lang === 'en' ? `SIGNER #${i+1}` : `FIRMANTE #${i+1}`}</span>
                            {formData.signers.length > 1 && (
                                <button onClick={() => removeSigner(i)} style={{ color: '#ef4444', background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Trash2 size={13} /> {lang === 'en' ? 'REMOVE' : 'ELIMINAR'}
                                </button>
                            )}
                        </div>
                        <div className="expert-grid">
                            <div className="expert-field full-width">
                                <label style={{ color: '#64748b', fontWeight: 800, fontSize: '11px' }}>{lang === 'en' ? 'Name of Signer' : 'Nombre del Firmante'}</label>
                                <FundacionRegistryNameInput value={s.name} onChange={(v) => updateSigner(i, 'name', v)} registry={registryForRow('signers', i)} onMatch={(hit) => applySignerAt(i, hit)} className="expert-input-legal" placeholder={lang === 'en' ? 'e.g. John Doe' : 'Ej: Pedro Roman Romano'} />
                            </div>
                            <div className="expert-field full-width">
                                <label style={{ color: '#64748b', fontWeight: 800, fontSize: '11px' }}>{lang === 'en' ? 'Signature (Full name)' : 'Firma (Nombre completo)'}</label>
                                <input className="expert-input-legal" value={s.signature} onChange={e => updateSigner(i, 'signature', e.target.value)} placeholder={lang === 'en' ? 'As it appears on ID...' : 'Como aparece en su identificación...'} />
                            </div>
                        </div>
                    </div>
                ))}
                
                <div className="expert-field" style={{ marginTop: '25px' }}>
                    <label style={{ color: '#475569', fontWeight: 800, fontSize: '11px' }}>{lang === 'en' ? 'Date of Declaration' : 'Fecha de Declaración'}</label>
                    <input type="date" className="expert-input-legal" value={formData.declarationDate} onChange={e => setFormData({...formData, declarationDate: e.target.value})} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="expert-container">
            <div className="expert-header">
                <div>
                    <h1 className="expert-title">{lang === 'en' ? 'INCORPORATION' : 'INCORPORACIÃ“N'}</h1>
                    <p className="expert-subtitle">{lang === 'en' ? 'High-Precision Corporate DMS System' : 'Sistema de Alta Precisión Corporativa'}</p>
                </div>
                <button onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save-master">
                    <Save size={18} /> {saving ? t('corporacion.syncing') : t('corporacion.saveProgress')}
                </button>
            </div>

            {/* Cabecera de Paso EstÃ¡ndar */}
            <div className="standard-step-header">
                <span className="standard-step-title">
                    {step === 1 && `I. ${t('corporacion.steps.societyInfo') || 'Información de la Sociedad'}`}
                    {step === 2 && `II. ${t('corporacion.steps.directors') || 'Junta Directiva'}`}
                    {step === 3 && `III. ${t('corporacion.steps.dignitaries') || 'Dignatarios'}`}
                    {step === 4 && `IV. ${t('corporacion.steps.shareholders') || 'Accionistas'}`}
                    {step === 5 && `V. ${t('corporacion.steps.finalization') || 'Declaración Jurada'}`}
                </span>
                <span className="standard-step-badge">
                    {t('dashboard.stepOf', { step, total: 5 })}
                </span>
            </div>

            {/* Stepper Progresivo EstÃ¡ndar */}
            <div className="standard-progress-stepper">
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={`standard-progress-bar ${step >= s ? 'active' : ''}`} />
                ))}
            </div>

            <div className="expert-main-panel">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}

                <div className="expert-nav-footer">
                    <button onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="expert-btn-nav-prev"><ChevronLeft size={18} /> {t('corporacion.previous')}</button>
                    {step < 5 ? (
                        <button onClick={() => setStep(prev => prev + 1)} className="expert-btn-nav-next">{t('corporacion.nextStep')} <ChevronRight size={18} /></button>
                    ) : (
                        <button onClick={() => onSave(formData, true)} disabled={saving} className="expert-btn-nav-finish"><CheckCircle2 size={18} /> {saving ? t('corporacion.finalizing') : t('corporacion.registerCorp')}</button>
                    )}
                </div>
            </div>



            <style>{`
                .expert-container { width: 100%; maxWidth: 900px; margin: 0 auto; padding: 20px 0 80px; font-family: 'Inter', sans-serif; }
                .expert-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
                .expert-title { font-size: 26px; font-weight: 900; color: ${SECONDARY}; margin: 0; letter-spacing: -1px; }
                .expert-subtitle { font-size: 13px; color: #64748b; margin: 5px 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                
                .expert-btn-save-master { padding: 12px 24px; background: white; color: ${PRIMARY}; border: 2.5px solid ${PRIMARY}; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; font-size: 13px; }
                .expert-btn-save-master:hover { background: ${PRIMARY}; color: white; transform: translateY(-2px); box-shadow: 0 10px 20px ${PRIMARY}30; }

                .standard-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 5px; }
                .standard-step-title { font-size: 14px; font-weight: 800; color: ${SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px; }
                .standard-step-badge { font-size: 11px; font-weight: 900; color: ${PRIMARY}; background: ${PRIMARY}15; padding: 4px 12px; border-radius: 20px; letter-spacing: 1px; }

                .standard-progress-stepper { display: flex; gap: 8px; margin-bottom: 40px; }
                .standard-progress-bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 10px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                .standard-progress-bar.active { background: ${PRIMARY}; }

                .expert-main-panel { background: white; border-radius: 24px; padding: 45px; border: 1px solid #e2e8f0; box-shadow: 0 10px 40px rgba(0,0,0,0.03); }
                .expert-step-title { font-size: 17px; font-weight: 900; color: ${SECONDARY}; margin: 0 0 25px; display: flex; align-items: center; gap: 12px; }
                
                .expert-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .full-width { grid-column: span 2; }
                .expert-field { display: flex; flex-direction: column; gap: 8px; }
                .expert-field label { font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
                
                .expert-input { width: 100%; padding: 14px 18px; border: 2.5px solid #f1f5f9; border-radius: 14px; outline: none; font-size: 14px; font-weight: 600; color: ${SECONDARY}; transition: all 0.2s; background: #f8fafc; }
                .expert-input:focus { border-color: ${PRIMARY}; background: white; box-shadow: 0 0 0 4px ${PRIMARY}10; }

                .expert-hint { font-size: 12px; color: #64748b; font-style: italic; font-weight: 500; }
                .expert-hint-box { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 12px 18px; border-radius: 12px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 12px; margin-bottom: 25px; }

                .expert-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
                .expert-btn-add { padding: 10px 18px; background: ${PRIMARY}10; color: ${PRIMARY}; border: none; border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 11px; transition: 0.2s; }
                .expert-btn-add:hover { background: ${PRIMARY}; color: white; transform: scale(1.03); }

                .expert-card-legal { background: #fcfdfe; border: 2px solid #f1f5f9; border-radius: 20px; padding: 30px; position: relative; margin-bottom: 25px; }
                .expert-card-label { position: absolute; top: -10px; left: 25px; background: ${SECONDARY}; color: white; font-size: 9px; font-weight: 900; padding: 5px 14px; border-radius: 20px; }
                .expert-btn-remove { position: absolute; top: 15px; right: 15px; color: #ef4444; background: #fee2e2; border: none; padding: 8px; border-radius: 10px; cursor: pointer; transition: 0.2s; }
                .expert-btn-remove:hover { transform: rotate(90deg); }

                .expert-legal-box { background: #f8fafc; border: 2.5px dashed #cbd5e1; border-radius: 20px; padding: 35px; color: ${SECONDARY}; margin-top: 30px; }
                .expert-legal-text { font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 25px; font-style: italic; border-left: 4px solid ${PRIMARY}; padding: 15px 20px; background: #eff6ff; border-radius: 8px; font-weight: 500; }
                .expert-btn-add-white { background: ${PRIMARY}10; color: ${PRIMARY}; border: 1.5px solid ${PRIMARY}30; padding: 10px 18px; border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 11px; transition: all 0.2s; }
                .expert-btn-add-white:hover { background: ${PRIMARY}; color: white; transform: scale(1.02); }
                .expert-input-legal { width: 100%; padding: 14px 18px; border: 2.5px solid #e2e8f0; border-radius: 12px; background: white; color: ${SECONDARY}; outline: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
                .expert-input-legal:focus { border-color: ${PRIMARY}; background: white; box-shadow: 0 0 0 4px ${PRIMARY}10; }


                .expert-nav-footer { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 30px; border-top: 2px solid #f1f5f9; }
                .expert-btn-nav-prev { padding: 14px 28px; background: #f8fafc; color: #64748b; border: 2px solid #e2e8f0; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; font-size: 13px; }
                .expert-btn-nav-prev:hover:not(:disabled) { background: #f1f5f9; }
                .expert-btn-nav-next { padding: 14px 28px; background: ${PRIMARY}; color: white; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 20px ${PRIMARY}30; transition: 0.3s; font-size: 13px; }
                .expert-btn-nav-next:hover { transform: translateY(-2px); box-shadow: 0 15px 30px ${PRIMARY}40; }
                .expert-btn-nav-finish { padding: 14px 28px; background: #16a34a; color: white; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 20px rgba(22, 163, 74, 0.3); transition: 0.3s; font-size: 13px; }
            `}</style>
        </div>
    );
};

export default CorporacionForm;

