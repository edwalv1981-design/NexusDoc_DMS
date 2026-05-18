import React, { useState, useEffect } from 'react';
import { 
    Heart, Users, UserCheck, Shield, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    CheckCircle2, Info, Award
} from 'lucide-react';
import { useLang } from '../i18n';

const FundacionForm = ({ initialData, onSave, saving }) => {
    const { lang, t } = useLang();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Basic Info
        foundationNameOption1: '', foundationNameOption2: '', foundationNameOption3: '',
        initialPatrimony: '10000', 
        foundationObjects: '',
        
        // Dynamic Arrays
        founders: [{ fullName: '', birthDate: '', passport: '', address: '' }],
        councilMembers: [
            { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' },
            { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' },
            { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' }
        ],
        protectors: [{ fullName: '', birthDate: '', passport: '', address: '' }],
        dignitaries: [
            { role: 'PRESIDENTE', fullName: '', birthDate: '', passport: '' },
            { role: 'SECRETARIO', fullName: '', birthDate: '', passport: '' },
            { role: 'TESORERO', fullName: '', birthDate: '', passport: '' }
        ],
        beneficiaries: [{ fullName: '', birthDate: '', passport: '', address: '', percentage: '' }],
        
        // Finalization
        signers: [{ signature: '', name: '' }],
        declarationDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            const cleanData = { ...initialData };
            if (!cleanData.founders) cleanData.founders = formData.founders;
            if (!cleanData.councilMembers) cleanData.councilMembers = formData.councilMembers;
            if (!cleanData.protectors) cleanData.protectors = formData.protectors;
            if (!cleanData.dignitaries) cleanData.dignitaries = formData.dignitaries;
            if (!cleanData.beneficiaries) cleanData.beneficiaries = formData.beneficiaries;
            if (!cleanData.signers) cleanData.signers = formData.signers;
            setFormData(prev => ({ ...prev, ...cleanData }));
        }
    }, [initialData]);

    const findPersonData = (name) => {
        if (!name || name.trim().length < 3) return null;
        const searchName = name.toLowerCase().trim();
        
        // Buscar en Fundadores
        for (const f of formData.founders) {
            if (f.fullName && f.fullName.toLowerCase().includes(searchName)) return f;
        }
        
        // Buscar en Consejo
        for (const m of formData.councilMembers) {
            const full = [m.firstName, m.secondName, m.lastName].filter(Boolean).join(' ');
            const parts = [m.firstName, m.lastName].filter(Boolean).join(' ');
            if (full.toLowerCase().includes(searchName) || parts.toLowerCase().includes(searchName)) {
                return { fullName: full, birthDate: m.birthDate, passport: m.passport, address: m.address };
            }
        }
        
        // Buscar en Protectores
        for (const p of formData.protectors) {
            if (p.fullName && p.fullName.toLowerCase().includes(searchName)) return p;
        }

        // Buscar en Dignatarios
        for (const d of formData.dignitaries) {
            if (d.fullName && d.fullName.toLowerCase().includes(searchName)) return d;
        }

        // Buscar en Beneficiarios
        for (const b of formData.beneficiaries) {
            if (b.fullName && b.fullName.toLowerCase().includes(searchName)) return b;
        }
        
        return null;
    };

    const updateArrayField = (arrayName, index, field, value) => {
        const newArray = [...formData[arrayName]];
        newArray[index][field] = value;
        
        // AUTOCOMPLETADO INTELIGENTE E INMEDIATO (SOBREESCRIBE DATOS RELACIONADOS AL COINCIDIR)
        if ((field === 'fullName' || field === 'firstName') && value.length > 3) {
            const person = findPersonData(value);
            if (person) {
                if (person.birthDate) newArray[index].birthDate = person.birthDate;
                if (person.passport) newArray[index].passport = person.passport;
                if (person.address) newArray[index].address = person.address;
                
                if (arrayName === 'councilMembers' && field === 'firstName') {
                    const parts = person.fullName ? person.fullName.split(' ') : [];
                    if (parts.length >= 3) {
                        newArray[index].firstName = parts[0];
                        newArray[index].secondName = parts[1];
                        newArray[index].lastName = parts.slice(2).join(' ');
                    } else if (parts.length === 2) {
                        newArray[index].firstName = parts[0];
                        newArray[index].lastName = parts[1];
                    }
                }
            }
        }

        setFormData(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const addArrayItem = (arrayName, emptyObj) => {
        setFormData(prev => ({
            ...prev,
            [arrayName]: [...prev[arrayName], emptyObj]
        }));
    };

    const removeArrayItem = (arrayName, index, minItems = 1) => {
        if (formData[arrayName].length <= minItems) return;
        setFormData(prev => ({
            ...prev,
            [arrayName]: prev[arrayName].filter((_, i) => i !== index)
        }));
    };

    const updateSigner = (index, field, value) => {
        const newSigners = [...formData.signers];
        newSigners[index][field] = value;
        if (field === 'name') {
            newSigners[index].signature = value;
        }
        setFormData(prev => ({ ...prev, signers: newSigners }));
    };

    const addSigner = () => {
        setFormData(prev => ({ ...prev, signers: [...prev.signers, { signature: '', name: '' }] }));
    };

    const removeSigner = (index) => {
        if (formData.signers.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            signers: prev.signers.filter((_, i) => i !== index)
        }));
    };

    const PRIMARY = '#0078d4';
    const SECONDARY = '#1e293b';

    const renderStep1 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><Heart size={22} color={PRIMARY} /> {t('fundacion.steps.basicInfo') || 'Información de la Fundación'}</h2>
            
            <div className="expert-hint-box" style={{ marginBottom: '25px', display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '8px', padding: '15px' }}>
                <Info size={20} color="#0369a1" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.5' }}>
                    <strong>
                        {lang === 'en'
                            ? 'List the names you wish to use for your private interest foundation in order of preference.'
                            : 'Listar los nombres que desea utilizar para su fundación de interés privado en orden de preferencia.'
                        }
                    </strong>
                    <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#475569' }}>
                        {lang === 'en'
                            ? 'The name of the Private Interest Foundation must end with the word "Foundation" or "Fundación".'
                            : 'El nombre de la Fundación de Interés Privado debe terminar con la palabra "Foundation" o "Fundación".'
                        }
                    </div>
                </div>
            </div>

            <div className="expert-grid">
                <div className="expert-field full-width">
                    <label>{lang === 'en' ? 'Foundation Name - 1st Choice' : 'Opción 1 de Nombre'}</label>
                    <input className="expert-input" value={formData.foundationNameOption1} onChange={e => setFormData({...formData, foundationNameOption1: e.target.value})} placeholder="EJ: FUNDACIÓN ESPERANZA" />
                </div>
                <div className="expert-field">
                    <label>{lang === 'en' ? 'Foundation Name - 2nd Choice' : 'Opción 2 de Nombre'}</label>
                    <input className="expert-input" value={formData.foundationNameOption2} onChange={e => setFormData({...formData, foundationNameOption2: e.target.value})} />
                </div>
                <div className="expert-field">
                    <label>{lang === 'en' ? 'Foundation Name - 3rd Choice' : 'Opción 3 de Nombre'}</label>
                    <input className="expert-input" value={formData.foundationNameOption3} onChange={e => setFormData({...formData, foundationNameOption3: e.target.value})} />
                </div>
                
                <div className="expert-field full-width" style={{ marginTop: '20px' }}>
                    <label>{lang === 'en' ? 'Initial Endowment (USD)' : 'Patrimonio Inicial (USD)'}</label>
                    <div className="expert-hint" style={{ marginBottom: '8px' }}>
                        {lang === 'en'
                            ? 'The minimum authorized initial endowment of the foundation is US$10,000.00.'
                            : 'El patrimonio inicial mínimo autorizado de la fundación es de US$10,000.00.'
                        }
                    </div>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#94a3b8' }}>$</span>
                        <input type="number" className="expert-input" style={{ paddingLeft: '32px' }} value={formData.initialPatrimony} onChange={e => setFormData({...formData, initialPatrimony: e.target.value})} placeholder="10000" />
                    </div>
                </div>

                <div className="expert-field full-width" style={{ marginTop: '20px' }}>
                    <label>{lang === 'en' ? 'Foundation Objectives / Purpose' : 'Objetivos y Fines de la Fundación'}</label>
                    <div className="expert-hint" style={{ marginBottom: '8px' }}>
                        {lang === 'en'
                            ? 'Please provide a detailed explanation of the foundation\'s objectives and purposes.'
                            : 'Favor provea una explicación detallada de los objetivos y fines de la fundación.'
                        }
                    </div>
                    <textarea className="expert-input" rows={4} value={formData.foundationObjects} onChange={e => setFormData({...formData, foundationObjects: e.target.value})} placeholder={lang === 'en' ? 'Describe foundation purpose...' : 'Describa detalladamente los fines de la fundación...'} />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Users size={22} color={PRIMARY} /> {t('fundacion.steps.founders') || 'Fundadores'}</h2>
                <button type="button" onClick={() => addArrayItem('founders', { fullName: '', birthDate: '', passport: '', address: '' })} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD FOUNDER' : 'AÑADIR FUNDADOR'}
                </button>
            </div>
            <div className="expert-hint-box">
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? 'The founder is the natural or legal person who constitutes the private interest foundation.'
                        : 'El fundador es la persona natural o jurídica que constituye la fundación de interés privado.'
                    }
                </div>
            </div>
            {formData.founders.map((f, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">{lang === 'en' ? `FOUNDER #${i+1}` : `FUNDADOR #${i+1}`}</div>
                    {formData.founders.length > 1 && <button onClick={() => removeArrayItem('founders', i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field full-width">
                            <label>{lang === 'en' ? 'Full name' : 'Nombre completo'}</label>
                            <input className="expert-input" list="names-global" value={f.fullName} onChange={e => updateArrayField('founders', i, 'fullName', e.target.value)} placeholder={lang === 'en' ? 'As it appears on Passport...' : 'Como aparece en el pasaporte...'} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label>
                            <input type="date" className="expert-input" value={f.birthDate} onChange={e => updateArrayField('founders', i, 'birthDate', e.target.value)} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label>
                            <input className="expert-input" value={f.passport} onChange={e => updateArrayField('founders', i, 'passport', e.target.value)} />
                        </div>
                        <div className="expert-field full-width">
                            <label>{lang === 'en' ? 'Residential Address' : 'Dirección completa'}</label>
                            <input className="expert-input" value={f.address} onChange={e => updateArrayField('founders', i, 'address', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep3 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Shield size={22} color={PRIMARY} /> {lang === 'en' ? 'Protectors' : 'Protector (es)'}</h2>
                <button type="button" onClick={() => addArrayItem('protectors', { fullName: '', birthDate: '', passport: '', address: '' })} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD PROTECTOR' : 'AÑADIR PROTECTOR'}
                </button>
            </div>
            <div className="expert-hint-box">
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? 'The Protector is the governing body in charge of supervising the actions of the Foundation Council.'
                        : 'El Protector es el órgano de control encargado de supervisar las acciones del Consejo de Fundación.'
                    }
                </div>
            </div>
            {formData.protectors.map((p, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">{lang === 'en' ? `PROTECTOR #${i+1}` : `PROTECTOR #${i+1}`}</div>
                    {formData.protectors.length > 1 && <button onClick={() => removeArrayItem('protectors', i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field full-width">
                            <label>{lang === 'en' ? 'Full name' : 'Nombre completo'}</label>
                            <input className="expert-input" list="names-global" value={p.fullName} onChange={e => updateArrayField('protectors', i, 'fullName', e.target.value)} placeholder={lang === 'en' ? 'As it appears on Passport...' : 'Como aparece en el pasaporte...'} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label>
                            <input type="date" className="expert-input" value={p.birthDate} onChange={e => updateArrayField('protectors', i, 'birthDate', e.target.value)} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label>
                            <input className="expert-input" value={p.passport} onChange={e => updateArrayField('protectors', i, 'passport', e.target.value)} />
                        </div>
                        <div className="expert-field full-width">
                            <label>{lang === 'en' ? 'Residential Address' : 'Dirección completa'}</label>
                            <input className="expert-input" value={p.address} onChange={e => updateArrayField('protectors', i, 'address', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep4 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Users size={22} color={PRIMARY} /> {t('fundacion.steps.council') || 'Consejo de Fundación'}</h2>
                <button type="button" onClick={() => addArrayItem('councilMembers', { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' })} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD COUNCIL MEMBER' : 'AÑADIR MIEMBRO'}
                </button>
            </div>
            <div className="expert-hint-box">
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? 'In Panama, a minimum of 3 members are required for the Foundation Council.'
                        : 'En Panamá se requiere un mínimo de 3 miembros para el Consejo de Fundación.'
                    }
                </div>
            </div>
            {formData.councilMembers.map((m, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">{lang === 'en' ? `COUNCIL MEMBER #${i+1}` : `MIEMBRO DEL CONSEJO #${i+1}`}</div>
                    {formData.councilMembers.length > 3 && <button onClick={() => removeArrayItem('councilMembers', i, 3)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field"><label>{lang === 'en' ? 'First Name' : 'Primer nombre'}</label><input className="expert-input" list="names-global" value={m.firstName} onChange={e => updateArrayField('councilMembers', i, 'firstName', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Middle Name' : 'Segundo nombre'}</label><input className="expert-input" value={m.secondName} onChange={e => updateArrayField('councilMembers', i, 'secondName', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Surname(s)' : 'Apellidos'}</label><input className="expert-input" value={m.lastName} onChange={e => updateArrayField('councilMembers', i, 'lastName', e.target.value)} /></div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Marital Status' : 'Estado civil'}</label>
                            <select className="expert-input" value={m.maritalStatus} onChange={e => updateArrayField('councilMembers', i, 'maritalStatus', e.target.value)}>
                                <option value="">{lang === 'en' ? 'Select...' : 'Seleccione...'}</option>
                                <option value="Soltero">{lang === 'en' ? 'Single' : 'Soltero(a)'}</option>
                                <option value="Casado">{lang === 'en' ? 'Married' : 'Casado(a)'}</option>
                                <option value="Divorciado">{lang === 'en' ? 'Divorced' : 'Divorciado(a)'}</option>
                                <option value="Viudo">{lang === 'en' ? 'Widowed' : 'Viudo(a)'}</option>
                            </select>
                        </div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Citizenship' : 'Nacionalidad'}</label><input className="expert-input" value={m.nationality} onChange={e => updateArrayField('councilMembers', i, 'nationality', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label><input className="expert-input" value={m.passport} onChange={e => updateArrayField('councilMembers', i, 'passport', e.target.value)} /></div>
                        <div className="expert-field"><label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label><input type="date" className="expert-input" value={m.birthDate} onChange={e => updateArrayField('councilMembers', i, 'birthDate', e.target.value)} /></div>
                        <div className="expert-field full-width"><label>{lang === 'en' ? 'Residential Address' : 'Dirección completa'}</label><input className="expert-input" value={m.address} onChange={e => updateArrayField('councilMembers', i, 'address', e.target.value)} /></div>
                    </div>
                </div>
            ))}
            
            <div className="expert-section-header" style={{ marginTop: '40px' }}>
                <h2 className="expert-step-title"><UserCheck size={22} color={PRIMARY} /> {lang === 'en' ? 'Dignitaries' : 'Dignatarios'}</h2>
                <button type="button" onClick={() => addArrayItem('dignitaries', { role: '', fullName: '', birthDate: '', passport: '' })} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD DIGNITARY' : 'AÑADIR DIGNATARIO'}
                </button>
            </div>
            <div className="expert-hint-box">
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? 'Dignitaries are the administrative roles (President, Secretary, Treasurer).'
                        : 'Los dignatarios son los cargos administrativos del consejo (Presidente, Secretario, Tesorero).'
                    }
                </div>
            </div>
            {formData.dignitaries.map((d, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">{lang === 'en' ? `DIGNITARY #${i+1}` : `DIGNATARIO #${i+1}`}</div>
                    {formData.dignitaries.length > 3 && <button onClick={() => removeArrayItem('dignitaries', i, 3)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Position / Role' : 'Cargo'}</label>
                            <input className="expert-input" list="roles-dignitaries" value={d.role} onChange={e => updateArrayField('dignitaries', i, 'role', e.target.value.toUpperCase())} placeholder="EJ: PRESIDENTE" />
                        </div>
                        <div className="expert-field full-width">
                            <label>{lang === 'en' ? 'Full name' : 'Nombre completo'}</label>
                            <input className="expert-input" list="names-global" value={d.fullName} onChange={e => updateArrayField('dignitaries', i, 'fullName', e.target.value)} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label>
                            <input className="expert-input" value={d.passport} onChange={e => updateArrayField('dignitaries', i, 'passport', e.target.value)} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}</label>
                            <input type="date" className="expert-input" value={d.birthDate} onChange={e => updateArrayField('dignitaries', i, 'birthDate', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep5 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <div className="expert-section-header">
                <h2 className="expert-step-title"><Award size={22} color={PRIMARY} /> {lang === 'en' ? 'Beneficiaries' : 'Beneficiarios'}</h2>
                <button type="button" onClick={() => addArrayItem('beneficiaries', { fullName: '', birthDate: '', passport: '', address: '', percentage: '' })} className="expert-btn-add">
                    <Plus size={16} /> {lang === 'en' ? 'ADD BENEFICIARY' : 'AÑADIR BENEFICIARIO'}
                </button>
            </div>
            <div className="expert-hint-box">
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    {lang === 'en'
                        ? 'Indicate the persons who will receive the benefits according to the foundation charter.'
                        : 'Indicar las personas que recibirán los beneficios según el acta de la fundación.'
                    }
                </div>
            </div>
            {formData.beneficiaries.map((b, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">{lang === 'en' ? `BENEFICIARY #${i+1}` : `BENEFICIARIO #${i+1}`}</div>
                    {formData.beneficiaries.length > 1 && <button onClick={() => removeArrayItem('beneficiaries', i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field full-width">
                            <label>{lang === 'en' ? 'Full name' : 'Nombre completo'}</label>
                            <input className="expert-input" list="names-global" value={b.fullName} onChange={e => updateArrayField('beneficiaries', i, 'fullName', e.target.value)} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? 'Passport / ID' : 'Pasaporte / Cédula'}</label>
                            <input className="expert-input" value={b.passport} onChange={e => updateArrayField('beneficiaries', i, 'passport', e.target.value)} />
                        </div>
                        <div className="expert-field">
                            <label>{lang === 'en' ? '% of Participation' : '% de Participación'}</label>
                            <input className="expert-input" placeholder="Ej: 100%" value={b.percentage} onChange={e => updateArrayField('beneficiaries', i, 'percentage', e.target.value)} />
                        </div>
                        <div className="expert-field full-width">
                            <label>{lang === 'en' ? 'Residential Address' : 'Dirección'}</label>
                            <input className="expert-input" value={b.address} onChange={e => updateArrayField('beneficiaries', i, 'address', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
            
            <div className="expert-legal-box" style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: SECONDARY, margin: 0 }}>{lang === 'en' ? 'Declaration / Sworn Affidavit' : 'Declaración / Declaración Jurada'}</h3>
                    <button onClick={addSigner} className="expert-btn-add-white"><Plus size={16} /> {lang === 'en' ? 'ADD SIGNER' : 'AGREGAR FIRMANTE'}</button>
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
                                <input className="expert-input-legal" list="names-global" value={s.name} onChange={e => updateSigner(i, 'name', e.target.value)} placeholder={lang === 'en' ? 'e.g. John Doe' : 'Ej: Pedro Roman Romano'} />
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
                    <h1 className="expert-title">{lang === 'en' ? 'PRIVATE INTEREST FOUNDATION' : 'FUNDACIÓN DE INTERÉS PRIVADO'}</h1>
                    <p className="expert-subtitle">{lang === 'en' ? 'High-Precision Foundation DMS System' : 'Sistema de Alta Precisión en Fundaciones'}</p>
                </div>
                <button onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save-master">
                    <Save size={18} /> {saving ? (lang === 'en' ? 'Synchronizing...' : 'Sincronizando...') : (lang === 'en' ? 'SAVE PROGRESS' : 'GUARDAR AVANCE')}
                </button>
            </div>

            {/* Cabecera de Paso Estándar */}
            <div className="standard-step-header">
                <span className="standard-step-title">
                    {step === 1 && `I. ${lang === 'en' ? 'Foundation Name & Objectives' : 'Nombre y Objetivos de la Fundación'}`}
                    {step === 2 && `II. ${lang === 'en' ? 'Founders' : 'Fundador (es)'}`}
                    {step === 3 && `III. ${lang === 'en' ? 'Protectors' : 'Protector (es)'}`}
                    {step === 4 && `IV. ${lang === 'en' ? 'Foundation Council & Dignitaries' : 'Consejo de Fundación y Dignatarios'}`}
                    {step === 5 && `V. ${lang === 'en' ? 'Beneficiaries & Sworn Affidavit' : 'Beneficiarios y Declaración Jurada'}`}
                </span>
                <span className="standard-step-badge">
                    {t('dashboard.stepOf', { step, total: 5 })}
                </span>
            </div>

            {/* Stepper Progresivo Estándar */}
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
                    <button type="button" onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="expert-btn-nav-prev"><ChevronLeft size={18} /> {lang === 'en' ? 'PREVIOUS' : 'ANTERIOR'}</button>
                    {step < 5 ? (
                        <button type="button" onClick={() => setStep(prev => prev + 1)} className="expert-btn-nav-next">{lang === 'en' ? 'NEXT STEP' : 'SIGUIENTE PASO'} <ChevronRight size={18} /></button>
                    ) : (
                        <button type="button" onClick={() => onSave(formData, true)} disabled={saving} className="expert-btn-nav-finish"><CheckCircle2 size={18} /> {saving ? (lang === 'en' ? 'FINALIZING...' : 'FINALIZANDO...') : (lang === 'en' ? 'REGISTER FOUNDATION' : 'REGISTRAR FUNDACIÓN')}</button>
                    )}
                </div>
            </div>

            {/* DATALISTS PARA AUTOCOMPLETADO */}
            <datalist id="names-global">
                {formData.founders.map((f, i) => f.fullName && <option key={`f-${i}`} value={f.fullName} />)}
                {formData.councilMembers.map((m, i) => {
                    const full = [m.firstName, m.secondName, m.lastName].filter(Boolean).join(' ');
                    return full && <option key={`c-${i}`} value={full} />;
                })}
                {formData.protectors.map((p, i) => p.fullName && <option key={`p-${i}`} value={p.fullName} />)}
                {formData.dignitaries.map((d, i) => d.fullName && <option key={`d-${i}`} value={d.fullName} />)}
            </datalist>

            <datalist id="roles-dignitaries">
                <option value="PRESIDENTE" />
                <option value="SECRETARIO" />
                <option value="TESORERO" />
                <option value="VOCAL" />
                <option value="VICEPRESIDENTE" />
            </datalist>

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

export default FundacionForm;
