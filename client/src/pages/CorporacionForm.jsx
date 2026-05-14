import React, { useState, useEffect } from 'react';
import { 
    Building, Users, UserCheck, Briefcase, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    CheckCircle2
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
        dignitaries: [
            { role: 'PRESIDENTE', fullName: '', birthDate: '', passport: '', registrationNumber: '' },
            { role: 'SECRETARIO', fullName: '', birthDate: '', passport: '', registrationNumber: '' },
            { role: 'TESORERO', fullName: '', birthDate: '', passport: '', registrationNumber: '' }
        ],
        shareholders: [
            { certificate: '', value: '', shares: '', name: '', address: '' }
        ],
        
        // Declaration
        signers: [
            { signature: '', name: '' }
        ],
        declarationDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            // Asegurarse de que los arrays existan si vienen de la DB
            const cleanData = { ...initialData };
            if (!cleanData.directors) cleanData.directors = formData.directors;
            if (!cleanData.dignitaries) cleanData.dignitaries = formData.dignitaries;
            if (!cleanData.shareholders) cleanData.shareholders = formData.shareholders;
            if (!cleanData.signers) cleanData.signers = formData.signers;
            setFormData(prev => ({ ...prev, ...cleanData }));
        }
    }, [initialData]);

    // HELPERS PARA TRADUCCIÓN ROBUSTA
    const getT = (key, fallback) => {
        const val = t(key);
        if (!val || val === key || val.includes('corporacion.fields')) return fallback;
        return val;
    };

    // GESTIÓN DE DIGNATARIOS
    const addDignitary = () => {
        setFormData(prev => ({
            ...prev,
            dignitaries: [...prev.dignitaries, { role: '', fullName: '', birthDate: '', passport: '', registrationNumber: '' }]
        }));
    };

    const removeDignitary = (index) => {
        if (formData.dignitaries.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            dignitaries: prev.dignitaries.filter((_, i) => i !== index)
        }));
    };

    const updateDignitary = (index, field, value) => {
        const newDigs = [...formData.dignitaries];
        newDigs[index][field] = value;
        
        // AUTOCOMPLETADO INTELIGENTE
        if (field === 'fullName' && value.length > 3) {
            const person = findPersonData(value);
            if (person) {
                if (person.birthDate && !newDigs[index].birthDate) newDigs[index].birthDate = person.birthDate;
                if (person.passport && !newDigs[index].passport) newDigs[index].passport = person.passport;
            }
        }
        
        setFormData(prev => ({ ...prev, dignitaries: newDigs }));
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
        setFormData(prev => ({
            ...prev,
            shareholders: formData.shareholders.filter((_, i) => i !== index)
        }));
    };

    const updateShareholder = (index, field, value) => {
        const newShareholders = [...formData.shareholders];
        newShareholders[index][field] = value;
        
        // AUTOCOMPLETADO INTELIGENTE
        if (field === 'name' && value.length > 3) {
            const person = findPersonData(value);
            if (person && person.address && !newShareholders[index].address) {
                newShareholders[index].address = person.address;
            }
        }
        
        setFormData(prev => ({ ...prev, shareholders: newShareholders }));
    };

    // GESTIÓN DE FIRMANTES
    const addSigner = () => {
        setFormData(prev => ({
            ...prev,
            signers: [...prev.signers, { signature: '', name: '' }]
        }));
    };

    const removeSigner = (index) => {
        if (formData.signers.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            signers: prev.signers.filter((_, i) => i !== index)
        }));
    };

    const updateSigner = (index, field, value) => {
        const newSigners = [...formData.signers];
        newSigners[index][field] = value;
        setFormData(prev => ({ ...prev, signers: newSigners }));
    };

    // MOTOR DE BÚSQUEDA CONTEXTUAL
    const findPersonData = (name) => {
        if (!name || name.trim().length < 3) return null;
        const searchName = name.toLowerCase().trim();

        // Buscar en Directores
        for (const d of formData.directors) {
            const full = [d.firstName, d.secondName, d.lastName].filter(p => p && p.trim()).join(' ');
            if (full.toLowerCase().trim() === searchName) {
                return { birthDate: d.birthDate, passport: d.passport, address: d.address };
            }
        }

        // Buscar en otros Dignatarios
        for (const d of formData.dignitaries) {
            if (d.fullName && d.fullName.toLowerCase().trim() === searchName) {
                return { birthDate: d.birthDate, passport: d.passport };
            }
        }

        // Buscar en otros Accionistas
        for (const s of formData.shareholders) {
            if (s.name && s.name.toLowerCase().trim() === searchName) {
                return { address: s.address };
            }
        }

        return null;
    };

    const PRIMARY = '#0078d4';
    const SECONDARY = '#1e293b';

    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building size={22} color={PRIMARY} /> {getT('corporacion.steps.societyInfo', 'Información de la Sociedad')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div className="expert-group">
                    <label>{getT('corporacion.fields.nameSA', 'Nombre S.A.')}</label>
                    <input className="expert-input" autoComplete="organization" value={formData.corpNameSA} onChange={e => setFormData({...formData, corpNameSA: e.target.value})} placeholder="Ej: NEXUS SOLUTIONS S.A." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="expert-group">
                        <label>{getT('corporacion.fields.nameCorp', 'Nombre Corp.')}</label>
                        <input className="expert-input" autoComplete="organization" value={formData.corpNameCorp} onChange={e => setFormData({...formData, corpNameCorp: e.target.value})} />
                    </div>
                    <div className="expert-group">
                        <label>{getT('corporacion.fields.nameInc', 'Nombre Inc.')}</label>
                        <input className="expert-input" autoComplete="organization" value={formData.corpNameInc} onChange={e => setFormData({...formData, corpNameInc: e.target.value})} />
                    </div>
                </div>
                <div className="expert-group">
                    <label>{getT('corporacion.fields.capital', 'Capital Social')}</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>$</span>
                        <input type="number" min="10000" className="expert-input" style={{ paddingLeft: '30px' }} value={formData.capitalSocial} onChange={e => setFormData({...formData, capitalSocial: e.target.value})} />
                    </div>
                    {parseInt(formData.capitalSocial) < 10000 && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '5px', fontWeight: 600 }}>{getT('corporacion.fields.minCapitalError', 'El capital mínimo es $10,000')}</p>}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Users size={22} color={PRIMARY} /> {getT('corporacion.steps.directors', 'Directores')}
                </h2>
                <button type="button" onClick={addDirector} className="expert-btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }}>
                    <Plus size={16} /> {getT('corporacion.fields.addDirector', 'Añadir Director')}
                </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {formData.directors.map((d, index) => (
                    <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#f8fafc', position: 'relative' }}>
                        <div style={{ position: 'absolute', right: '15px', top: '15px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>DIRECTOR #{index + 1}</span>
                            {formData.directors.length > 3 && (
                                <button onClick={() => removeDirector(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            )}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
                            <div className="expert-group"><label>{getT('corporacion.fields.firstName', 'Primer Nombre')}</label><input className="expert-input" list="corp-global-names" autoComplete="given-name" value={d.firstName} onChange={e => updateDirector(index, 'firstName', e.target.value)} /></div>
                            <div className="expert-group"><label>{getT('corporacion.fields.middleName', 'Segundo Nombre')}</label><input className="expert-input" list="corp-global-names" autoComplete="additional-name" value={d.secondName} onChange={e => updateDirector(index, 'secondName', e.target.value)} /></div>
                            <div className="expert-group"><label>{getT('corporacion.fields.lastName', 'Apellidos')}</label><input className="expert-input" list="corp-global-names" autoComplete="family-name" value={d.lastName} onChange={e => updateDirector(index, 'lastName', e.target.value)} /></div>
                            <div className="expert-group"><label>{getT('corporacion.fields.maritalStatus', 'Estado Civil')}</label>
                                <select className="expert-input" value={d.maritalStatus} onChange={e => updateDirector(index, 'maritalStatus', e.target.value)}>
                                    <option value="">Seleccione...</option>
                                    <option value="Soltero(a)">Soltero(a)</option>
                                    <option value="Casado(a)">Casado(a)</option>
                                    <option value="Divorciado(a)">Divorciado(a)</option>
                                    <option value="Viudo(a)">Viudo(a)</option>
                                </select>
                            </div>
                            <div className="expert-group"><label>{getT('corporacion.fields.nationality', 'Nacionalidad')}</label><input className="expert-input" value={d.nationality} onChange={e => updateDirector(index, 'nationality', e.target.value)} /></div>
                            <div className="expert-group"><label>{getT('corporacion.fields.passport', 'Pasaporte/Cédula')}</label><input className="expert-input" value={d.passport} onChange={e => updateDirector(index, 'passport', e.target.value)} /></div>
                            <div className="expert-group"><label>{getT('corporacion.fields.birthDate', 'Fecha de Nacimiento')}</label><input type="date" className="expert-input" value={d.birthDate} onChange={e => updateDirector(index, 'birthDate', e.target.value)} /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: SECONDARY, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserCheck size={22} color={PRIMARY} /> {getT('corporacion.steps.dignitaries', 'Dignatarios')}
                </h2>
                <button type="button" onClick={addDignitary} className="expert-btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }}>
                    <Plus size={16} /> {getT('corporacion.fields.addDignitary', 'Añadir Dignatario')}
                </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {formData.dignitaries.map((dig, index) => (
                    <div key={index} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', position: 'relative' }}>
                        {formData.dignitaries.length > 1 && (
                            <button onClick={() => removeDignitary(index)} style={{ position: 'absolute', right: '15px', top: '15px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div className="expert-group">
                                <label>{getT('corporacion.fields.role', 'Cargo')}</label>
                                <input className="expert-input" value={dig.role} onChange={e => updateDignitary(index, 'role', e.target.value.toUpperCase())} placeholder="EJ: PRESIDENTE" />
                            </div>
                            <div className="expert-group">
                                <label>{getT('corporacion.fields.fullName', 'Nombre Completo')}</label>
                                <input className="expert-input" list="corp-global-names" value={dig.fullName} onChange={e => updateDignitary(index, 'fullName', e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                            <div className="expert-group"><label>{getT('corporacion.fields.regNumber', 'N° Registro')}</label><input className="expert-input" value={dig.registrationNumber} onChange={e => updateDignitary(index, 'registrationNumber', e.target.value)} /></div>
                            <div className="expert-group"><label>{getT('corporacion.fields.birthDate', 'Fecha de Nacimiento')}</label><input type="date" className="expert-input" value={dig.birthDate} onChange={e => updateDignitary(index, 'birthDate', e.target.value)} /></div>
                            <div className="expert-group"><label>{getT('corporacion.fields.passport', 'Pasaporte/Cédula')}</label><input className="expert-input" value={dig.passport} onChange={e => updateDignitary(index, 'passport', e.target.value)} /></div>
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
                    <Briefcase size={22} color={PRIMARY} /> {getT('corporacion.steps.shareholders', 'Accionistas')}
                </h2>
                <button type="button" onClick={addShareholder} className="expert-btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }}>
                    <Plus size={16} /> {getT('corporacion.fields.addShareholder', 'Agregar Accionista')}
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {formData.shareholders.map((s, index) => (
                    <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', background: 'white', position: 'relative' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 80px 1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
                            <div className="expert-group"><label>CERT.</label><input className="expert-input" value={s.certificate} onChange={e => updateShareholder(index, 'certificate', e.target.value)} /></div>
                            <div className="expert-group"><label>VALOR</label><input className="expert-input" value={s.value} onChange={e => updateShareholder(index, 'value', e.target.value)} /></div>
                            <div className="expert-group"><label>ACC.</label><input className="expert-input" value={s.shares} onChange={e => updateShareholder(index, 'shares', e.target.value)} /></div>
                            <div className="expert-group"><label>NOMBRE COMPLETO</label><input className="expert-input" list="corp-global-names" value={s.name} onChange={e => updateShareholder(index, 'name', e.target.value)} /></div>
                            <div className="expert-group"><label>DIRECCIÓN RESIDENCIAL</label><input className="expert-input" value={s.address} onChange={e => updateShareholder(index, 'address', e.target.value)} /></div>
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
                <FileCheck size={22} color={PRIMARY} /> {getT('corporacion.steps.finalization', 'Finalización')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div className="expert-group">
                    <label>{getT('corporacion.fields.activities', 'Actividades de la Empresa')}</label>
                    <textarea className="expert-input" rows={4} value={formData.companyActivities} onChange={e => setFormData({...formData, companyActivities: e.target.value})} />
                </div>
                
                <div style={{ background: '#f8fafc', border: `1px solid #e2e8f0`, borderRadius: '16px', padding: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: SECONDARY }}>{getT('corporacion.steps.declaration', 'Declaración')}</h3>
                        <button type="button" onClick={addSigner} className="expert-btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }}>
                            <Plus size={16} /> {getT('corporacion.fields.addSigner', 'Añadir Firmante')}
                        </button>
                    </div>
                    {formData.signers.map((signer, index) => (
                        <div key={index} style={{ borderBottom: index < formData.signers.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: '20px', marginBottom: '20px', position: 'relative' }}>
                            {formData.signers.length > 1 && (
                                <button onClick={() => removeSigner(index)} style={{ position: 'absolute', right: '0', top: '0', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            )}
                            <div className="expert-group">
                                <label>{getT('corporacion.fields.signature', 'Firma')}</label>
                                <input className="expert-input" autoComplete="off" value={signer.signature} onChange={e => updateSigner(index, 'signature', e.target.value)} placeholder="..." />
                            </div>
                            <div className="expert-group" style={{ marginTop: '15px' }}>
                                <label>{getT('corporacion.fields.declarantName', 'Nombre del Declarante')}</label>
                                <input className="expert-input" list="corp-global-names" value={signer.name} onChange={e => updateSigner(index, 'name', e.target.value)} />
                            </div>
                        </div>
                    ))}
                    <div className="expert-group">
                        <label>{getT('corporacion.fields.declarationDate', 'Fecha')}</label>
                        <input type="date" className="expert-input" value={formData.declarationDate} onChange={e => setFormData({...formData, declarationDate: e.target.value})} />
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
                    <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>{getT('corporacion.title', 'INCORPORACIÓN')}</h1>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{getT('corporacion.subtitle', 'Gestión de Trámites Corporativos')}</p>
                </div>
                <button onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save">
                    <Save size={18} /> {saving ? 'Guardando...' : 'GUARDAR BORRADOR'}
                </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: '40px' }}>
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} style={{ flex: 1, position: 'relative' }}>
                        <div style={{ height: '5px', background: step >= s ? PRIMARY : '#e2e8f0', borderRadius: '10px', transition: 'all 0.3s' }} />
                        <div style={{ position: 'absolute', top: '-25px', left: '0', fontSize: '10px', fontWeight: 800, color: step >= s ? PRIMARY : '#94a3b8' }}>{getT(`corporacion.steps.step${s}`, `PASO 0${s}`)}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 25px rgba(0,0,0,0.02)' }}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '30px', borderTop: '1px solid #f1f5f9' }}>
                    <button type="button" onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="expert-btn-nav" style={{ opacity: step === 1 ? 0.3 : 1 }}><ChevronLeft size={18} /> ANTERIOR</button>
                    {step < 5 ? (
                        <button type="button" onClick={nextStep} className="expert-btn-primary">SIGUIENTE PASO <ChevronRight size={18} /></button>
                    ) : (
                        <button type="button" onClick={() => onSave(formData, true)} disabled={saving} className="expert-btn-finish"><CheckCircle2 size={18} /> {saving ? 'Finalizando...' : 'GUARDAR Y FINALIZAR'}</button>
                    )}
                </div>
            </div>

            <datalist id="corp-global-names">
                {formData.directors.map((d, i) => {
                    const full = [d.firstName, d.secondName, d.lastName].filter(p => p && p.trim()).join(' ');
                    return full ? <option key={`dir-g-${i}`} value={full} /> : null;
                })}
                {formData.directors.map((d, i) => d.firstName && <option key={`fn-${i}`} value={d.firstName} />)}
                {formData.directors.map((d, i) => d.lastName && <option key={`ln-${i}`} value={d.lastName} />)}
                {formData.dignitaries.map((d, i) => d.fullName && <option key={`dig-g-${i}`} value={d.fullName} />)}
                {formData.shareholders.map((s, i) => s.name && <option key={`sha-g-${i}`} value={s.name} />)}
                {formData.signers.map((s, i) => s.name && <option key={`sig-n-${i}`} value={s.name} />)}
            </datalist>

            <style>{`
                .expert-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 13px; font-weight: 500; transition: all 0.2s; }
                .expert-input:focus { border-color: ${PRIMARY}; box-shadow: 0 0 0 4px ${PRIMARY}15; }
                .expert-group { display: flex; flex-direction: column; gap: 6px; }
                .expert-group label { font-size: 10px; font-weight: 800; color: #475569; letter-spacing: 0.5px; }
                .expert-btn-primary { padding: 12px 25px; background: ${PRIMARY}; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
                .expert-btn-nav { padding: 12px 25px; background: #f1f5f9; color: #475569; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
                .expert-btn-save { padding: 10px 20px; background: white; color: ${PRIMARY}; border: 1.5px solid ${PRIMARY}; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 12px; }
                .expert-btn-secondary { background: white; color: ${SECONDARY}; border: 1.5px solid #e2e8f0; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 8px 15px; }
                .expert-btn-finish { padding: 12px 25px; background: #16a34a; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
            `}</style>
        </div>
    );
};

export default CorporacionForm;
