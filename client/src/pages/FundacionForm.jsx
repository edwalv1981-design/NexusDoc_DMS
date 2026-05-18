import React, { useState, useEffect } from 'react';
import { 
    Heart, Users, UserCheck, Shield, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    CheckCircle2, Info, User, Briefcase, Award
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
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const findPersonData = (name) => {
        if (!name || name.trim().length < 3) return null;
        const searchName = name.toLowerCase().trim();
        
        // Buscar en Fundadores
        for (const f of formData.founders) {
            if (f.fullName?.toLowerCase().trim() === searchName) return f;
        }
        
        // Buscar en Consejo
        for (const m of formData.councilMembers) {
            const full = [m.firstName, m.secondName, m.lastName].filter(Boolean).join(' ');
            if (full.toLowerCase().trim() === searchName) {
                return { fullName: full, birthDate: m.birthDate, passport: m.passport, address: m.address };
            }
        }
        
        // Buscar en Protectores
        for (const p of formData.protectors) {
            if (p.fullName?.toLowerCase().trim() === searchName) return p;
        }

        // Buscar en Dignatarios
        for (const d of formData.dignitaries) {
            if (d.fullName?.toLowerCase().trim() === searchName) return d;
        }

        // Buscar en Beneficiarios
        for (const b of formData.beneficiaries) {
            if (b.fullName?.toLowerCase().trim() === searchName) return b;
        }
        
        return null;
    };

    const updateArrayField = (arrayName, index, field, value) => {
        const newArray = [...formData[arrayName]];
        newArray[index][field] = value;
        
        // AUTOCOMPLETADO INTELIGENTE PARA NOMBRES
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

    const PRIMARY = '#4f46e5';
    const SECONDARY = '#1e293b';

    const renderStep1 = () => (
        <div className="step-content animate-in fade-in slide-in-from-bottom-4">
            <h2 className="step-title-legal">1. NOMBRE DE LA FUNDACIÓN <span className="legal-hint">({t('fundacion.hints.basicInfo')})</span></h2>
            <div className="expert-form-grid">
                <div className="field-group full-width">
                    <label>OPCIÓN 1 DE NOMBRE</label>
                    <input className="expert-input" value={formData.foundationNameOption1} onChange={e => setFormData({...formData, foundationNameOption1: e.target.value})} placeholder="EJ: FUNDACIÓN ESPERANZA" />
                </div>
                <div className="field-group">
                    <label>OPCIÓN 2 DE NOMBRE</label>
                    <input className="expert-input" value={formData.foundationNameOption2} onChange={e => setFormData({...formData, foundationNameOption2: e.target.value})} />
                </div>
                <div className="field-group">
                    <label>OPCIÓN 3 DE NOMBRE</label>
                    <input className="expert-input" value={formData.foundationNameOption3} onChange={e => setFormData({...formData, foundationNameOption3: e.target.value})} />
                </div>
                
                <div className="field-group full-width" style={{ marginTop: '20px' }}>
                    <h2 className="step-title-legal">2. PATRIMONIO DE LA FUNDACIÓN <span className="legal-hint">({t('fundacion.hints.capital')})</span></h2>
                    <label>PATRIMONIO INICIAL (USD)</label>
                    <div className="input-with-icon">
                        <span className="prefix">$</span>
                        <input type="number" className="expert-input" style={{ paddingLeft: '30px' }} value={formData.initialPatrimony} onChange={e => setFormData({...formData, initialPatrimony: e.target.value})} />
                    </div>
                </div>

                <div className="field-group full-width" style={{ marginTop: '20px' }}>
                    <h2 className="step-title-legal">OBJETIVOS Y FINES <span className="legal-hint">({t('fundacion.hints.activities')})</span></h2>
                    <label>DESCRIPCIÓN DE ACTIVIDADES</label>
                    <textarea className="expert-input" rows={4} value={formData.foundationObjects} onChange={e => setFormData({...formData, foundationObjects: e.target.value})} placeholder="Describa detalladamente los fines de la fundación..." />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="step-content animate-in fade-in slide-in-from-bottom-4">
            <div className="section-header">
                <h2 className="step-title-legal">3. FUNDADOR (ES) <span className="legal-hint">({t('fundacion.hints.founders')})</span></h2>
                <button type="button" onClick={() => addArrayItem('founders', { fullName: '', birthDate: '', passport: '', address: '' })} className="btn-add">
                    <Plus size={16} /> AÑADIR FUNDADOR
                </button>
            </div>
            {formData.founders.map((f, i) => (
                <div key={i} className="expert-card">
                    <div className="card-badge">FUNDADOR #{i+1}</div>
                    {formData.founders.length > 1 && <button onClick={() => removeArrayItem('founders', i)} className="btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-form-grid">
                        <div className="field-group full-width">
                            <label>NOMBRE COMPLETO</label>
                            <input className="expert-input" list="names-global" value={f.fullName} onChange={e => updateArrayField('founders', i, 'fullName', e.target.value)} placeholder="Como aparece en el pasaporte..." />
                        </div>
                        <div className="field-group">
                            <label>FECHA DE NACIMIENTO</label>
                            <input type="date" className="expert-input" value={f.birthDate} onChange={e => updateArrayField('founders', i, 'birthDate', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>PASAPORTE / CÉDULA</label>
                            <input className="expert-input" value={f.passport} onChange={e => updateArrayField('founders', i, 'passport', e.target.value)} />
                        </div>
                        <div className="field-group full-width">
                            <label>DIRECCIÓN COMPLETA</label>
                            <input className="expert-input" value={f.address} onChange={e => updateArrayField('founders', i, 'address', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep3 = () => (
        <div className="step-content animate-in fade-in slide-in-from-bottom-4">
            <div className="section-header">
                <h2 className="step-title-legal">4. CONSEJO DE FUNDACIÓN <span className="legal-hint">({t('fundacion.hints.council')})</span></h2>
                <button type="button" onClick={() => addArrayItem('councilMembers', { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' })} className="btn-add">
                    <Plus size={16} /> AÑADIR MIEMBRO
                </button>
            </div>
            {formData.councilMembers.map((m, i) => (
                <div key={i} className="expert-card">
                    <div className="card-badge">CONSEJO #{i+1}</div>
                    {formData.councilMembers.length > 3 && <button onClick={() => removeArrayItem('councilMembers', i, 3)} className="btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-form-grid">
                        <div className="field-group">
                            <label>PRIMER NOMBRE</label>
                            <input className="expert-input" list="names-global" value={m.firstName} onChange={e => updateArrayField('councilMembers', i, 'firstName', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>APELLIDOS</label>
                            <input className="expert-input" value={m.lastName} onChange={e => updateArrayField('councilMembers', i, 'lastName', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>PASAPORTE / CÉDULA</label>
                            <input className="expert-input" value={m.passport} onChange={e => updateArrayField('councilMembers', i, 'passport', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>FECHA DE NACIMIENTO</label>
                            <input type="date" className="expert-input" value={m.birthDate} onChange={e => updateArrayField('councilMembers', i, 'birthDate', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>NACIONALIDAD</label>
                            <input className="expert-input" value={m.nationality} onChange={e => updateArrayField('councilMembers', i, 'nationality', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>ESTADO CIVIL</label>
                            <select className="expert-input" value={m.maritalStatus} onChange={e => updateArrayField('councilMembers', i, 'maritalStatus', e.target.value)}>
                                <option value="">-- Seleccione --</option>
                                <option value="Soltero">Soltero(a)</option>
                                <option value="Casado">Casado(a)</option>
                                <option value="Divorciado">Divorciado(a)</option>
                                <option value="Viudo">Viudo(a)</option>
                            </select>
                        </div>
                        <div className="field-group full-width">
                            <label>DIRECCIÓN RESIDENCIAL</label>
                            <input className="expert-input" value={m.address} onChange={e => updateArrayField('councilMembers', i, 'address', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep4 = () => (
        <div className="step-content animate-in fade-in slide-in-from-bottom-4">
            <div className="section-header">
                <h2 className="step-title-legal">5. PROTECTOR (ES) <span className="legal-hint">({t('fundacion.hints.protectors')})</span></h2>
                <button type="button" onClick={() => addArrayItem('protectors', { fullName: '', birthDate: '', passport: '', address: '' })} className="btn-add">
                    <Plus size={16} /> AÑADIR PROTECTOR
                </button>
            </div>
            {formData.protectors.map((p, i) => (
                <div key={i} className="expert-card-mini">
                    <div className="card-badge-mini">PROTECTOR #{i+1}</div>
                    {formData.protectors.length > 1 && <button onClick={() => removeArrayItem('protectors', i)} className="btn-remove-mini"><Trash2 size={14} /></button>}
                    <div className="expert-form-grid">
                        <div className="field-group full-width">
                            <label>NOMBRE COMPLETO</label>
                            <input className="expert-input" list="names-global" value={p.fullName} onChange={e => updateArrayField('protectors', i, 'fullName', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>PASAPORTE / CÉDULA</label>
                            <input className="expert-input" value={p.passport} onChange={e => updateArrayField('protectors', i, 'passport', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>FECHA DE NACIMIENTO</label>
                            <input type="date" className="expert-input" value={p.birthDate} onChange={e => updateArrayField('protectors', i, 'birthDate', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
            
            <div className="section-header" style={{ marginTop: '40px' }}>
                <h2 className="step-title-legal">6. DIGNATARIOS <span className="legal-hint" style={{ textTransform: 'none' }}>({t('fundacion.hints.dignitaries')})</span></h2>
                <button type="button" onClick={() => addArrayItem('dignitaries', { role: '', fullName: '', birthDate: '', passport: '' })} className="btn-add">
                    <Plus size={16} /> AÑADIR DIGNATARIO
                </button>
            </div>
            {formData.dignitaries.map((d, i) => (
                <div key={i} className="expert-card-mini">
                    <div className="card-badge-mini">DIGNATARIO #{i+1}</div>
                    {formData.dignitaries.length > 3 && <button onClick={() => removeArrayItem('dignitaries', i, 3)} className="btn-remove-mini"><Trash2 size={14} /></button>}
                    <div className="expert-form-grid" style={{ gridTemplateColumns: '1.2fr 2fr 1fr' }}>
                        <div className="field-group">
                            <label>CARGO</label>
                            <input className="expert-input" list="roles-dignitaries" value={d.role} onChange={e => updateArrayField('dignitaries', i, 'role', e.target.value.toUpperCase())} placeholder="EJ: PRESIDENTE" />
                        </div>
                        <div className="field-group">
                            <label>NOMBRE COMPLETO</label>
                            <input className="expert-input" list="names-global" value={d.fullName} onChange={e => updateArrayField('dignitaries', i, 'fullName', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>PASAPORTE</label>
                            <input className="expert-input" value={d.passport} onChange={e => updateArrayField('dignitaries', i, 'passport', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep5 = () => (
        <div className="step-content animate-in fade-in slide-in-from-bottom-4">
            <div className="section-header">
                <h2 className="step-title-legal">7. BENEFICIARIOS <span className="legal-hint">({t('fundacion.hints.beneficiaries')})</span></h2>
                <button type="button" onClick={() => addArrayItem('beneficiaries', { fullName: '', birthDate: '', passport: '', address: '', percentage: '' })} className="btn-add">
                    <Plus size={16} /> AÑADIR BENEFICIARIO
                </button>
            </div>
            {formData.beneficiaries.map((b, i) => (
                <div key={i} className="expert-card">
                    <div className="card-badge">BENEFICIARIO #{i+1}</div>
                    {formData.beneficiaries.length > 1 && <button onClick={() => removeArrayItem('beneficiaries', i)} className="btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-form-grid">
                        <div className="field-group full-width">
                            <label>NOMBRE COMPLETO</label>
                            <input className="expert-input" list="names-global" value={b.fullName} onChange={e => updateArrayField('beneficiaries', i, 'fullName', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>PASAPORTE / CÉDULA</label>
                            <input className="expert-input" value={b.passport} onChange={e => updateArrayField('beneficiaries', i, 'passport', e.target.value)} />
                        </div>
                        <div className="field-group">
                            <label>% DE PARTICIPACIÓN</label>
                            <input className="expert-input" placeholder="Ej: 100%" value={b.percentage} onChange={e => updateArrayField('beneficiaries', i, 'percentage', e.target.value)} />
                        </div>
                        <div className="field-group full-width">
                            <label>DIRECCIÓN</label>
                            <input className="expert-input" value={b.address} onChange={e => updateArrayField('beneficiaries', i, 'address', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
            
            <div className="expert-final-box" style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px' }}>
                    <Award size={24} color="#fbbf24" />
                    <h3 className="final-box-title" style={{ margin: 0 }}>8. DECLARACIÓN JURADA Y FIRMA</h3>
                </div>
                <p className="legal-statement">
                    {t('fundacion.hints.declaration')}
                </p>
                {formData.signers.map((s, i) => (
                    <div key={i} className="expert-form-grid">
                        <div className="field-group full-width">
                            <label>NOMBRE DEL DECLARANTE</label>
                            <input className="expert-input-dark" list="names-global" value={s.name} onChange={e => {
                                const newS = [...formData.signers]; newS[i].name = e.target.value; setFormData({...formData, signers: newS});
                            }} />
                        </div>
                        <div className="field-group full-width">
                            <label>FIRMA ELECTRÓNICA (NOMBRE COMPLETO)</label>
                            <input className="expert-input-dark" value={s.signature} onChange={e => {
                                const newS = [...formData.signers]; newS[i].signature = e.target.value; setFormData({...formData, signers: newS});
                            }} placeholder="Escriba su nombre como firma..." />
                        </div>
                    </div>
                ))}
                <div className="field-group" style={{ marginTop: '20px' }}>
                    <label>FECHA DE DECLARACIÓN</label>
                    <input type="date" className="expert-input-dark" value={formData.declarationDate} onChange={e => setFormData({...formData, declarationDate: e.target.value})} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="expert-foundation-container">
            <div className="expert-header-panel">
                <div className="header-text">
                    <h1>FUNDACIÓN DE INTERÉS PRIVADO</h1>
                    <p>Formulario Oficial de Constitución - Protocolo de Alta Fidelidad</p>
                </div>
                <button onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save">
                    <Save size={18} /> {saving ? 'Sincronizando...' : 'GUARDAR AVANCE'}
                </button>
            </div>

            {/* Cabecera de Paso Estándar */}
            <div className="standard-step-header">
                <span className="standard-step-title">
                    {step === 1 && `I. Nombre y Fines de la Fundación`}
                    {step === 2 && `II. Fundador (es)`}
                    {step === 3 && `III. Consejo de Fundación`}
                    {step === 4 && `IV. Protector (es) y Dignatarios`}
                    {step === 5 && `V. Beneficiarios`}
                </span>
                <span className="standard-step-badge">
                    PASO {step} DE 5
                </span>
            </div>

            {/* Stepper Progresivo Estándar */}
            <div className="standard-progress-stepper">
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={`standard-progress-bar ${step >= s ? 'active' : ''}`} />
                ))}
            </div>

            <div className="expert-form-panel">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}

                <div className="expert-footer-nav">
                    <button type="button" onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="btn-nav-back">
                        <ChevronLeft size={18} /> ANTERIOR
                    </button>
                    {step < 5 ? (
                        <button type="button" onClick={() => setStep(prev => prev + 1)} className="btn-nav-next">
                            SIGUIENTE PASO <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button type="button" onClick={() => onSave(formData, true)} disabled={saving} className="btn-nav-finish">
                            <CheckCircle2 size={18} /> {saving ? 'FINALIZANDO...' : 'FINALIZAR Y REGISTRAR'}
                        </button>
                    )}
                </div>
            </div>

            {/* DATALISTS PARA AUTOCOMPLETADO */}
            <datalist id="names-global">
                {formData.founders.map((f, i) => f.fullName && <option key={`f-${i}`} value={f.fullName} />)}
                {formData.councilMembers.map((m, i) => {
                    const full = [m.firstName, m.lastName].filter(Boolean).join(' ');
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
                .expert-foundation-container { width: 100%; maxWidth: 1000px; margin: 0 auto; padding-bottom: 60px; font-family: 'Inter', sans-serif; }
                .expert-header-panel { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
                .header-text h1 { font-size: 28px; font-weight: 900; color: ${SECONDARY}; margin: 0; letter-spacing: -1px; text-transform: uppercase; }
                .header-text p { font-size: 14px; color: #64748b; margin: 5px 0 0; font-weight: 600; }
                
                .expert-btn-save { padding: 12px 24px; background: white; color: ${PRIMARY}; border: 2.5px solid ${PRIMARY}; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; font-size: 13px; }
                .expert-btn-save:hover { background: ${PRIMARY}; color: white; transform: translateY(-2px); box-shadow: 0 10px 20px ${PRIMARY}20; }

                .standard-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 5px; }
                .standard-step-title { font-size: 14px; font-weight: 800; color: ${SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px; }
                .standard-step-badge { font-size: 11px; font-weight: 900; color: ${PRIMARY}; background: ${PRIMARY}15; padding: 4px 12px; border-radius: 20px; letter-spacing: 1px; }

                .standard-progress-stepper { display: flex; gap: 8px; margin-bottom: 40px; }
                .standard-progress-bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 10px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                .standard-progress-bar.active { background: ${PRIMARY}; }

                .expert-form-panel { background: white; border-radius: 32px; padding: 50px; border: 1px solid #e2e8f0; box-shadow: 0 20px 50px rgba(0,0,0,0.04); }
                .step-title-legal { font-size: 16px; font-weight: 900; color: ${SECONDARY}; margin: 0 0 30px; text-transform: uppercase; border-left: 5px solid ${PRIMARY}; padding-left: 15px; line-height: 1.2; }
                .legal-hint { font-size: 13px; font-weight: 600; color: #64748b; font-style: italic; margin-left: 8px; text-transform: none; display: block; margin-top: 5px; opacity: 0.8; }
                
                .expert-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
                .full-width { grid-column: span 2; }
                .field-group { display: flex; flex-direction: column; gap: 10px; }
                .field-group label { font-size: 12px; font-weight: 900; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; }
                
                .expert-input { width: 100%; padding: 16px 20px; border: 2px solid #f1f5f9; border-radius: 16px; outline: none; font-size: 15px; font-weight: 600; color: ${SECONDARY}; transition: all 0.2s; background: #f8fafc; }
                .expert-input:focus { border-color: ${PRIMARY}; background: white; box-shadow: 0 0 0 5px ${PRIMARY}10; }
                
                .expert-input-dark { width: 100%; padding: 16px 20px; border: 2px solid rgba(255,255,255,0.1); border-radius: 16px; outline: none; font-size: 15px; font-weight: 600; color: white; background: rgba(255,255,255,0.05); }
                .expert-input-dark:focus { border-color: ${PRIMARY}; background: rgba(255,255,255,0.1); }

                .input-with-icon { position: relative; }
                .prefix { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-weight: 900; color: #94a3b8; }

                .section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                .btn-add { padding: 12px 20px; background: ${PRIMARY}10; color: ${PRIMARY}; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 12px; transition: 0.2s; }
                .btn-add:hover { background: ${PRIMARY}; color: white; transform: scale(1.02); }

                .expert-card { background: #fcfdfe; border: 2px solid #f1f5f9; border-radius: 24px; padding: 40px; position: relative; margin-bottom: 30px; }
                .card-badge { position: absolute; top: -12px; left: 30px; background: ${SECONDARY}; color: white; font-size: 10px; font-weight: 900; padding: 6px 16px; border-radius: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                .btn-remove { position: absolute; top: 25px; right: 25px; color: #ef4444; background: #fee2e2; border: none; padding: 10px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
                .btn-remove:hover { background: #ef4444; color: white; transform: rotate(90deg); }

                .expert-card-mini { background: white; border: 2px solid #f1f5f9; border-radius: 20px; padding: 25px; margin-bottom: 20px; position: relative; }
                .card-badge-mini { position: absolute; top: -10px; right: 25px; background: #f1f5f9; color: #64748b; font-size: 9px; font-weight: 900; padding: 4px 12px; border-radius: 20px; }
                .btn-remove-mini { position: absolute; bottom: 20px; right: 20px; color: #ef4444; background: none; border: none; cursor: pointer; opacity: 0.5; }
                .btn-remove-mini:hover { opacity: 1; }

                .expert-final-box { background: ${SECONDARY}; border-radius: 28px; padding: 45px; color: white; box-shadow: 0 30px 60px rgba(0,0,0,0.2); }
                .final-box-title { font-size: 18px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
                .legal-statement { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 30px; font-style: italic; border-left: 3px solid ${PRIMARY}; padding-left: 20px; }
                .expert-final-box label { color: #94a3b8; }

                .expert-footer-nav { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 40px; border-top: 2px solid #f1f5f9; }
                .btn-nav-back { padding: 16px 32px; background: #f8fafc; color: #64748b; border: 2px solid #e2e8f0; border-radius: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.2s; font-size: 14px; }
                .btn-nav-back:hover { background: #f1f5f9; border-color: #cbd5e1; }
                
                .btn-nav-next { padding: 16px 32px; background: ${PRIMARY}; color: white; border: none; border-radius: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 12px; box-shadow: 0 15px 30px ${PRIMARY}40; transition: 0.3s; font-size: 14px; }
                .btn-nav-next:hover { transform: translateY(-3px); box-shadow: 0 20px 40px ${PRIMARY}50; }
                
                .btn-nav-finish { padding: 16px 32px; background: #16a34a; color: white; border: none; border-radius: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 12px; box-shadow: 0 15px 30px rgba(22, 163, 74, 0.3); transition: 0.3s; font-size: 14px; }
                .btn-nav-finish:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(22, 163, 74, 0.4); }
            `}</style>
        </div>
    );
};

export default FundacionForm;
