import React, { useState, useEffect } from 'react';
import { 
    Heart, Users, UserCheck, Shield, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    CheckCircle2, Info
} from 'lucide-react';
import { useT } from '../i18n';

const FundacionForm = ({ initialData, onSave, saving }) => {
    const t = useT();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Basic Info
        foundationNameOption1: '', foundationNameOption2: '', foundationNameOption3: '',
        initialPatrimony: '10000', 
        foundationObjects: '',
        
        // Dynamic Arrays
        founders: [
            { fullName: '', birthDate: '', passport: '', address: '' }
        ],
        councilMembers: [
            { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' },
            { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' },
            { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' }
        ],
        protectors: [
            { fullName: '', birthDate: '', passport: '', address: '' }
        ],
        dignitaries: [
            { role: 'PRESIDENTE', fullName: '', birthDate: '', passport: '' },
            { role: 'SECRETARIO', fullName: '', birthDate: '', passport: '' },
            { role: 'TESORERO', fullName: '', birthDate: '', passport: '' }
        ],
        beneficiaries: [
            { fullName: '', birthDate: '', passport: '', address: '', percentage: '' }
        ],
        
        // Finalization
        signers: [{ signature: '', name: '' }],
        declarationDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    // HELPERS PARA TRADUCCIÓN ROBUSTA (Mismo sistema que Incorporación)
    const getT = (key, fallback) => {
        const val = t(key);
        if (!val || val === key || val.includes('fundacion.')) return fallback;
        return val;
    };

    // MOTOR DE AUTOCOMPLETADO INTELIGENTE (MEJORADO)
    const findPersonData = (name) => {
        if (!name || name.trim().length < 3) return null;
        const searchName = name.toLowerCase().trim();

        // Escanear Fundadores
        for (const f of formData.founders) {
            if (f.fullName && f.fullName.toLowerCase().trim() === searchName) return f;
        }
        // Escanear Consejo
        for (const m of formData.councilMembers) {
            const full = [m.firstName, m.secondName, m.lastName].filter(p => p && p.trim()).join(' ');
            if (full.toLowerCase().trim() === searchName) {
                return { fullName: full, birthDate: m.birthDate, passport: m.passport, address: m.address };
            }
        }
        // Escanear Protectores
        for (const p of formData.protectors) {
            if (p.fullName && p.fullName.toLowerCase().trim() === searchName) return p;
        }
        return null;
    };

    const updateArrayField = (arrayName, index, field, value) => {
        const newArray = [...formData[arrayName]];
        newArray[index][field] = value;

        // Disparar autocompletado inteligente si es un campo de nombre
        if ((field === 'fullName' || field === 'firstName') && value.length > 3) {
            const person = findPersonData(value);
            if (person) {
                if (person.birthDate && !newArray[index].birthDate) newArray[index].birthDate = person.birthDate;
                if (person.passport && !newArray[index].passport) newArray[index].passport = person.passport;
                if (person.address && !newArray[index].address) newArray[index].address = person.address;
            }
        }

        setFormData(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const addArrayItem = (arrayName, emptyItem) => {
        setFormData(prev => ({ ...prev, [arrayName]: [...prev[arrayName], emptyItem] }));
    };

    const removeArrayItem = (arrayName, index, minItems = 1) => {
        if (formData[arrayName].length <= minItems) return;
        setFormData(prev => ({ ...prev, [arrayName]: formData[arrayName].filter((_, i) => i !== index) }));
    };

    const PRIMARY = '#6366f1'; // Indigo para Fundaciones
    const SECONDARY = '#1e293b';

    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="step-title"><Heart size={22} color={PRIMARY} /> {getT('fundacion.steps.basicInfo', 'Información de la Fundación')}</h2>
            <div className="expert-grid">
                <div className="expert-group">
                    <label>OPCIÓN 1 DE NOMBRE</label>
                    <input className="expert-input" value={formData.foundationNameOption1} onChange={e => setFormData({...formData, foundationNameOption1: e.target.value})} placeholder="Ej: FUNDACIÓN ESPERANZA" />
                </div>
                <div className="expert-group">
                    <label>OPCIÓN 2 DE NOMBRE</label>
                    <input className="expert-input" value={formData.foundationNameOption2} onChange={e => setFormData({...formData, foundationNameOption2: e.target.value})} />
                </div>
                <div className="expert-group">
                    <label>OPCIÓN 3 DE NOMBRE</label>
                    <input className="expert-input" value={formData.foundationNameOption3} onChange={e => setFormData({...formData, foundationNameOption3: e.target.value})} />
                </div>
                <div className="expert-group">
                    <label>PATRIMONIO INICIAL (USD)</label>
                    <input type="number" className="expert-input" value={formData.initialPatrimony} onChange={e => setFormData({...formData, initialPatrimony: e.target.value})} />
                </div>
            </div>
            <div className="expert-group" style={{ marginTop: '20px' }}>
                <label>OBJETIVOS / ACTIVIDADES</label>
                <textarea className="expert-input" rows={4} value={formData.foundationObjects} onChange={e => setFormData({...formData, foundationObjects: e.target.value})} placeholder="Describa los fines de la fundación..." />
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="section-header">
                <h2 className="step-title"><Users size={22} color={PRIMARY} /> Fundadores</h2>
                <button type="button" onClick={() => addArrayItem('founders', { fullName: '', birthDate: '', passport: '', address: '' })} className="expert-btn-secondary"><Plus size={16} /> Añadir Fundador</button>
            </div>
            <div className="dynamic-list">
                {formData.founders.map((f, i) => (
                    <div key={i} className="dynamic-card">
                        <div className="card-header">
                            <span className="badge">FUNDADOR #{i+1}</span>
                            {formData.founders.length > 1 && <button onClick={() => removeArrayItem('founders', i)} className="btn-delete"><Trash2 size={16} /></button>}
                        </div>
                        <div className="expert-grid">
                            <div className="expert-group"><label>NOMBRE COMPLETO</label><input className="expert-input" list="foundation-global-names" value={f.fullName} onChange={e => updateArrayField('founders', i, 'fullName', e.target.value)} /></div>
                            <div className="expert-group"><label>FECHA DE NACIMIENTO</label><input type="date" className="expert-input" value={f.birthDate} onChange={e => updateArrayField('founders', i, 'birthDate', e.target.value)} /></div>
                            <div className="expert-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={f.passport} onChange={e => updateArrayField('founders', i, 'passport', e.target.value)} /></div>
                            <div className="expert-group"><label>DIRECCIÓN</label><input className="expert-input" value={f.address} onChange={e => updateArrayField('founders', i, 'address', e.target.value)} /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="section-header">
                <h2 className="step-title"><Shield size={22} color={PRIMARY} /> Consejo de Fundación (Miembros)</h2>
                <button type="button" onClick={() => addArrayItem('councilMembers', { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' })} className="expert-btn-secondary"><Plus size={16} /> Añadir Miembro</button>
            </div>
            <div className="dynamic-list">
                {formData.councilMembers.map((m, i) => (
                    <div key={i} className="dynamic-card">
                        <div className="card-header">
                            <span className="badge">MIEMBRO #{i+1}</span>
                            {formData.councilMembers.length > 3 && <button onClick={() => removeArrayItem('councilMembers', i, 3)} className="btn-delete"><Trash2 size={16} /></button>}
                        </div>
                        <div className="expert-grid">
                            <div className="expert-group"><label>PRIMER NOMBRE</label><input className="expert-input" list="foundation-global-names" value={m.firstName} onChange={e => updateArrayField('councilMembers', i, 'firstName', e.target.value)} /></div>
                            <div className="expert-group"><label>APELLIDOS</label><input className="expert-input" list="foundation-global-names" value={m.lastName} onChange={e => updateArrayField('councilMembers', i, 'lastName', e.target.value)} /></div>
                            <div className="expert-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={m.passport} onChange={e => updateArrayField('councilMembers', i, 'passport', e.target.value)} /></div>
                            <div className="expert-group"><label>FECHA DE NACIMIENTO</label><input type="date" className="expert-input" value={m.birthDate} onChange={e => updateArrayField('councilMembers', i, 'birthDate', e.target.value)} /></div>
                            <div className="expert-group"><label>NACIONALIDAD</label><input className="expert-input" value={m.nationality} onChange={e => updateArrayField('councilMembers', i, 'nationality', e.target.value)} /></div>
                            <div className="expert-group"><label>DIRECCIÓN</label><input className="expert-input" value={m.address} onChange={e => updateArrayField('councilMembers', i, 'address', e.target.value)} /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="section-header">
                <h2 className="step-title"><UserCheck size={22} color={PRIMARY} /> Protectores y Dignatarios</h2>
                <button type="button" onClick={() => addArrayItem('protectors', { fullName: '', birthDate: '', passport: '', address: '' })} className="expert-btn-secondary"><Plus size={16} /> Añadir Protector</button>
            </div>
            <div className="dynamic-list">
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '15px', color: '#64748b' }}>PROTECTORES</h3>
                {formData.protectors.map((p, i) => (
                    <div key={i} className="dynamic-card" style={{ background: '#f0f9ff' }}>
                        <div className="card-header">
                            <span className="badge" style={{ background: '#0ea5e9' }}>PROTECTOR #{i+1}</span>
                            {formData.protectors.length > 1 && <button onClick={() => removeArrayItem('protectors', i)} className="btn-delete"><Trash2 size={16} /></button>}
                        </div>
                        <div className="expert-grid">
                            <div className="expert-group"><label>NOMBRE COMPLETO</label><input className="expert-input" list="foundation-global-names" value={p.fullName} onChange={e => updateArrayField('protectors', i, 'fullName', e.target.value)} /></div>
                            <div className="expert-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={p.passport} onChange={e => updateArrayField('protectors', i, 'passport', e.target.value)} /></div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="dynamic-list" style={{ marginTop: '30px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '15px', color: '#64748b' }}>DIGNATARIOS DEL CONSEJO</h3>
                {formData.dignitaries.map((d, i) => (
                    <div key={i} className="dynamic-card">
                        <div className="expert-grid" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
                            <div className="expert-group"><label>CARGO</label><input className="expert-input" value={d.role} onChange={e => updateArrayField('dignitaries', i, 'role', e.target.value.toUpperCase())} /></div>
                            <div className="expert-group"><label>NOMBRE COMPLETO</label><input className="expert-input" list="foundation-global-names" value={d.fullName} onChange={e => updateArrayField('dignitaries', i, 'fullName', e.target.value)} /></div>
                            <div className="expert-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={d.passport} onChange={e => updateArrayField('dignitaries', i, 'passport', e.target.value)} /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="section-header">
                <h2 className="step-title"><FileCheck size={22} color={PRIMARY} /> Beneficiarios y Declaración</h2>
                <button type="button" onClick={() => addArrayItem('beneficiaries', { fullName: '', birthDate: '', passport: '', address: '', percentage: '' })} className="expert-btn-secondary"><Plus size={16} /> Añadir Beneficiario</button>
            </div>
            <div className="dynamic-list">
                {formData.beneficiaries.map((b, i) => (
                    <div key={i} className="dynamic-card" style={{ borderLeft: `4px solid ${PRIMARY}` }}>
                        <div className="card-header">
                            <span className="badge">BENEFICIARIO #{i+1}</span>
                            {formData.beneficiaries.length > 1 && <button onClick={() => removeArrayItem('beneficiaries', i)} className="btn-delete"><Trash2 size={16} /></button>}
                        </div>
                        <div className="expert-grid">
                            <div className="expert-group"><label>NOMBRE COMPLETO</label><input className="expert-input" list="foundation-global-names" value={b.fullName} onChange={e => updateArrayField('beneficiaries', i, 'fullName', e.target.value)} /></div>
                            <div className="expert-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={b.passport} onChange={e => updateArrayField('beneficiaries', i, 'passport', e.target.value)} /></div>
                            <div className="expert-group"><label>% DE BENEFICIO</label><input className="expert-input" placeholder="Ej: 50%" value={b.percentage} onChange={e => updateArrayField('beneficiaries', i, 'percentage', e.target.value)} /></div>
                            <div className="expert-group"><label>DIRECCIÓN</label><input className="expert-input" value={b.address} onChange={e => updateArrayField('beneficiaries', i, 'address', e.target.value)} /></div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div style={{ background: '#f8fafc', border: `1px solid #e2e8f0`, borderRadius: '16px', padding: '30px', marginTop: '40px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>DECLARACIÓN FINAL</h3>
                {formData.signers.map((s, i) => (
                    <div key={i} style={{ marginBottom: '20px' }}>
                        <div className="expert-group"><label>NOMBRE DEL DECLARANTE</label><input className="expert-input" list="foundation-global-names" value={s.name} onChange={e => {
                            const newSigners = [...formData.signers];
                            newSigners[i].name = e.target.value;
                            setFormData({...formData, signers: newSigners});
                        }} /></div>
                        <div className="expert-group" style={{ marginTop: '10px' }}><label>FIRMA</label><input className="expert-input" placeholder="..." value={s.signature} onChange={e => {
                            const newSigners = [...formData.signers];
                            newSigners[i].signature = e.target.value;
                            setFormData({...formData, signers: newSigners});
                        }} /></div>
                    </div>
                ))}
                <div className="expert-group"><label>FECHA</label><input type="date" className="expert-input" value={formData.declarationDate} onChange={e => setFormData({...formData, declarationDate: e.target.value})} /></div>
            </div>
        </div>
    );

    return (
        <div className="foundation-form-container">
            <div className="header-actions">
                <div>
                    <h1 className="title">FORMULARIO DE FUNDACIÓN</h1>
                    <p className="subtitle">Gestión de Fundaciones de Interés Privado de Alta Precisión</p>
                </div>
                <button onClick={() => onSave(formData)} disabled={saving} className="btn-save-draft">
                    <Save size={18} /> {saving ? 'Guardando...' : 'GUARDAR BORRADOR'}
                </button>
            </div>

            <div className="stepper">
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className="step-item">
                        <div className={`step-bar ${step >= s ? 'active' : ''}`} />
                        <span className={`step-label ${step >= s ? 'active' : ''}`}>PASO 0{s}</span>
                    </div>
                ))}
            </div>

            <div className="form-content">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}

                <div className="navigation-actions">
                    <button type="button" onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="btn-nav btn-prev"><ChevronLeft size={18} /> ANTERIOR</button>
                    {step < 5 ? (
                        <button type="button" onClick={() => setStep(prev => prev + 1)} className="btn-nav btn-next">SIGUIENTE PASO <ChevronRight size={18} /></button>
                    ) : (
                        <button type="button" onClick={() => onSave(formData, true)} disabled={saving} className="btn-finish"><CheckCircle2 size={18} /> {saving ? 'Finalizando...' : 'FINALIZAR Y GUARDAR'}</button>
                    )}
                </div>
            </div>

            <datalist id="foundation-global-names">
                {formData.founders.map((f, i) => f.fullName && <option key={`found-${i}`} value={f.fullName} />)}
                {formData.councilMembers.map((m, i) => {
                    const full = [m.firstName, m.lastName].filter(Boolean).join(' ');
                    return full && <option key={`coun-${i}`} value={full} />;
                })}
                {formData.protectors.map((p, i) => p.fullName && <option key={`prot-${i}`} value={p.fullName} />)}
                {formData.beneficiaries.map((b, i) => b.fullName && <option key={`bene-${i}`} value={b.fullName} />)}
            </datalist>

            <style>{`
                .foundation-form-container { width: 100%; maxWidth: 900px; margin: 0 auto; }
                .header-actions { display: flex; justifyContent: space-between; alignItems: center; marginBottom: 30px; }
                .title { fontSize: 24px; fontWeight: 900; letterSpacing: -0.5px; margin: 0; }
                .subtitle { fontSize: 13px; color: #64748b; marginTop: 4px; margin-bottom: 0; }
                .stepper { display: flex; gap: 10px; marginBottom: 40px; }
                .step-item { flex: 1; position: relative; }
                .step-bar { height: 5px; background: #e2e8f0; borderRadius: 10px; transition: all 0.3s; }
                .step-bar.active { background: ${PRIMARY}; }
                .step-label { position: absolute; top: -25px; left: 0; fontSize: 10px; fontWeight: 800; color: #94a3b8; }
                .step-label.active { color: ${PRIMARY}; }
                .form-content { background: white; padding: 40px; borderRadius: 24px; border: 1px solid #e2e8f0; boxShadow: 0 4px 25px rgba(0,0,0,0.02); }
                .step-title { fontSize: 18px; fontWeight: 800; marginBottom: 25px; color: ${SECONDARY}; display: flex; alignItems: center; gap: 10px; margin-top: 0; }
                .expert-grid { display: grid; gridTemplateColumns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
                .expert-group { display: flex; flexDirection: column; gap: 6px; }
                .expert-group label { fontSize: 10px; fontWeight: 800; color: #475569; letterSpacing: 0.5px; text-transform: uppercase; }
                .expert-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; outline: none; font-size: 13px; font-weight: 500; transition: all 0.2s; box-sizing: border-box; }
                .expert-input:focus { border-color: ${PRIMARY}; box-shadow: 0 0 0 4px ${PRIMARY}15; }
                .section-header { display: flex; justifyContent: space-between; alignItems: center; marginBottom: 20px; }
                .expert-btn-secondary { background: white; color: ${PRIMARY}; border: 1.5px solid ${PRIMARY}; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 8px 15px; font-size: 12px; transition: all 0.2s; }
                .expert-btn-secondary:hover { background: ${PRIMARY}10; }
                .dynamic-list { display: flex; flexDirection: column; gap: 20px; }
                .dynamic-card { background: #fcfcfc; border: 1px solid #e2e8f0; borderRadius: 16px; padding: 20px; position: relative; }
                .card-header { display: flex; justifyContent: space-between; alignItems: center; marginBottom: 15px; }
                .badge { fontSize: 9px; fontWeight: 900; background: ${PRIMARY}; color: white; padding: 4px 10px; border-radius: 20px; }
                .btn-delete { color: #ef4444; background: none; border: none; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; }
                .btn-delete:hover { opacity: 1; }
                .navigation-actions { display: flex; justifyContent: space-between; marginTop: 40px; paddingTop: 30px; borderTop: 1px solid #f1f5f9; }
                .btn-nav { padding: 12px 25px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; transition: all 0.2s; }
                .btn-prev { background: #f1f5f9; color: #475569; border: none; }
                .btn-next { background: ${PRIMARY}; color: white; border: none; }
                .btn-finish { padding: 12px 25px; background: #16a34a; color: white; border: none; borderRadius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
                .btn-save-draft { padding: 10px 20px; background: white; color: ${PRIMARY}; border: 1.5px solid ${PRIMARY}; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 12px; }
            `}</style>
        </div>
    );
};

export default FundacionForm;
