import React, { useState, useEffect } from 'react';
import { 
    Heart, Users, UserCheck, Shield, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    CheckCircle2, Info, User
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
        for (const f of formData.founders) if (f.fullName?.toLowerCase().trim() === searchName) return f;
        for (const m of formData.councilMembers) {
            const full = [m.firstName, m.secondName, m.lastName].filter(Boolean).join(' ');
            if (full.toLowerCase().trim() === searchName) return { fullName: full, birthDate: m.birthDate, passport: m.passport, address: m.address };
        }
        for (const p of formData.protectors) if (p.fullName?.toLowerCase().trim() === searchName) return p;
        return null;
    };

    const updateArrayField = (arrayName, index, field, value) => {
        const newArray = [...formData[arrayName]];
        newArray[index][field] = value;
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
                <div className="field-group full-width">
                    <h2 className="step-title-legal" style={{ marginTop: '20px' }}>2. PATRIMONIO DE LA FUNDACIÓN <span className="legal-hint">({t('fundacion.hints.capital')})</span></h2>
                    <label>PATRIMONIO INICIAL (USD)</label>
                    <div className="input-with-icon">
                        <span className="prefix">$</span>
                        <input type="number" className="expert-input" style={{ paddingLeft: '30px' }} value={formData.initialPatrimony} onChange={e => setFormData({...formData, initialPatrimony: e.target.value})} />
                    </div>
                </div>
                <div className="field-group full-width">
                    <h2 className="step-title-legal" style={{ marginTop: '20px' }}>OBJETIVOS Y FINES <span className="legal-hint">({t('fundacion.hints.activities')})</span></h2>
                    <textarea className="expert-input" rows={4} value={formData.foundationObjects} onChange={e => setFormData({...formData, foundationObjects: e.target.value})} placeholder="Describa los fines de la fundación..." />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="step-content animate-in fade-in slide-in-from-bottom-4">
            <div className="section-header">
                <h2 className="step-title-legal">3. FUNDADOR (ES) <span className="legal-hint">({t('fundacion.hints.founders')})</span></h2>
                <button type="button" onClick={() => setFormData({...formData, founders: [...formData.founders, { fullName: '', birthDate: '', passport: '', address: '' }]})} className="btn-add"><Plus size={16} /> Añadir Fundador</button>
            </div>
            {formData.founders.map((f, i) => (
                <div key={i} className="expert-card">
                    <div className="card-badge">FUNDADOR #{i+1}</div>
                    {formData.founders.length > 1 && <button onClick={() => setFormData({...formData, founders: formData.founders.filter((_, idx) => idx !== i)})} className="btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-form-grid">
                        <div className="field-group full-width"><label>NOMBRE COMPLETO</label><input className="expert-input" list="names-global" value={f.fullName} onChange={e => updateArrayField('founders', i, 'fullName', e.target.value)} /></div>
                        <div className="field-group"><label>FECHA DE NACIMIENTO</label><input type="date" className="expert-input" value={f.birthDate} onChange={e => updateArrayField('founders', i, 'birthDate', e.target.value)} /></div>
                        <div className="field-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={f.passport} onChange={e => updateArrayField('founders', i, 'passport', e.target.value)} /></div>
                        <div className="field-group full-width"><label>DIRECCIÓN</label><input className="expert-input" value={f.address} onChange={e => updateArrayField('founders', i, 'address', e.target.value)} /></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep3 = () => (
        <div className="step-content animate-in fade-in slide-in-from-bottom-4">
            <div className="section-header">
                <h2 className="step-title-legal">4. CONSEJO DE FUNDACIÓN <span className="legal-hint">({t('fundacion.hints.council')})</span></h2>
                <button type="button" onClick={() => setFormData({...formData, councilMembers: [...formData.councilMembers, { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', address: '', city: '', country: '' }]})} className="btn-add"><Plus size={16} /> Añadir Miembro</button>
            </div>
            {formData.councilMembers.map((m, i) => (
                <div key={i} className="expert-card">
                    <div className="card-badge">MIEMBRO DEL CONSEJO #{i+1}</div>
                    {formData.councilMembers.length > 3 && <button onClick={() => setFormData({...formData, councilMembers: formData.councilMembers.filter((_, idx) => idx !== i)})} className="btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-form-grid">
                        <div className="field-group"><label>PRIMER NOMBRE</label><input className="expert-input" list="names-global" value={m.firstName} onChange={e => updateArrayField('councilMembers', i, 'firstName', e.target.value)} /></div>
                        <div className="field-group"><label>APELLIDOS</label><input className="expert-input" list="names-global" value={m.lastName} onChange={e => updateArrayField('councilMembers', i, 'lastName', e.target.value)} /></div>
                        <div className="field-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={m.passport} onChange={e => updateArrayField('councilMembers', i, 'passport', e.target.value)} /></div>
                        <div className="field-group"><label>FECHA DE NACIMIENTO</label><input type="date" className="expert-input" value={m.birthDate} onChange={e => updateArrayField('councilMembers', i, 'birthDate', e.target.value)} /></div>
                        <div className="field-group"><label>NACIONALIDAD</label><input className="expert-input" value={m.nationality} onChange={e => updateArrayField('councilMembers', i, 'nationality', e.target.value)} /></div>
                        <div className="field-group full-width"><label>DIRECCIÓN COMPLETA</label><input className="expert-input" value={m.address} onChange={e => updateArrayField('councilMembers', i, 'address', e.target.value)} /></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep4 = () => (
        <div className="step-content animate-in fade-in slide-in-from-bottom-4">
            <h2 className="step-title-legal">5. PROTECTOR (ES) <span className="legal-hint">({t('fundacion.hints.protectors')})</span></h2>
            <div className="section-header-mini"><span>PROTECTORES</span><button type="button" onClick={() => setFormData({...formData, protectors: [...formData.protectors, { fullName: '', birthDate: '', passport: '', address: '' }]})} className="btn-add-mini"><Plus size={14} /> Añadir</button></div>
            {formData.protectors.map((p, i) => (
                <div key={i} className="expert-card-mini">
                    <div className="card-badge-mini">PROTECTOR #{i+1}</div>
                    {formData.protectors.length > 1 && <button onClick={() => setFormData({...formData, protectors: formData.protectors.filter((_, idx) => idx !== i)})} className="btn-remove-mini"><Trash2 size={14} /></button>}
                    <div className="expert-form-grid">
                        <div className="field-group full-width"><label>NOMBRE COMPLETO</label><input className="expert-input" list="names-global" value={p.fullName} onChange={e => updateArrayField('protectors', i, 'fullName', e.target.value)} /></div>
                        <div className="field-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={p.passport} onChange={e => updateArrayField('protectors', i, 'passport', e.target.value)} /></div>
                        <div className="field-group"><label>FECHA DE NACIMIENTO</label><input type="date" className="expert-input" value={p.birthDate} onChange={e => updateArrayField('protectors', i, 'birthDate', e.target.value)} /></div>
                    </div>
                </div>
            ))}
            
            <div className="section-header-mini" style={{ marginTop: '30px' }}><span>6. DIGNATARIOS <span className="legal-hint" style={{ textTransform: 'none' }}>({t('fundacion.hints.dignitaries')})</span></span></div>
            {formData.dignitaries.map((d, i) => (
                <div key={i} className="expert-card-mini">
                    <div className="expert-form-grid" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
                        <div className="field-group"><label>CARGO</label><input className="expert-input" value={d.role} onChange={e => updateArrayField('dignitaries', i, 'role', e.target.value.toUpperCase())} /></div>
                        <div className="field-group"><label>NOMBRE COMPLETO</label><input className="expert-input" list="names-global" value={d.fullName} onChange={e => updateArrayField('dignitaries', i, 'fullName', e.target.value)} /></div>
                        <div className="field-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={d.passport} onChange={e => updateArrayField('dignitaries', i, 'passport', e.target.value)} /></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep5 = () => (
        <div className="step-content animate-in fade-in slide-in-from-bottom-4">
            <div className="section-header">
                <h2 className="step-title-legal">7. BENEFICIARIOS <span className="legal-hint">({t('fundacion.hints.beneficiaries')})</span></h2>
                <button type="button" onClick={() => setFormData({...formData, beneficiaries: [...formData.beneficiaries, { fullName: '', birthDate: '', passport: '', address: '', percentage: '' }]})} className="btn-add"><Plus size={16} /> Añadir Beneficiario</button>
            </div>
            {formData.beneficiaries.map((b, i) => (
                <div key={i} className="expert-card">
                    <div className="card-badge">BENEFICIARIO #{i+1}</div>
                    {formData.beneficiaries.length > 1 && <button onClick={() => setFormData({...formData, beneficiaries: formData.beneficiaries.filter((_, idx) => idx !== i)})} className="btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-form-grid">
                        <div className="field-group full-width"><label>NOMBRE COMPLETO</label><input className="expert-input" list="names-global" value={b.fullName} onChange={e => updateArrayField('beneficiaries', i, 'fullName', e.target.value)} /></div>
                        <div className="field-group"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={b.passport} onChange={e => updateArrayField('beneficiaries', i, 'passport', e.target.value)} /></div>
                        <div className="field-group"><label>% DE BENEFICIO</label><input className="expert-input" placeholder="Ej: 50%" value={b.percentage} onChange={e => updateArrayField('beneficiaries', i, 'percentage', e.target.value)} /></div>
                        <div className="field-group full-width"><label>DIRECCIÓN</label><input className="expert-input" value={b.address} onChange={e => updateArrayField('beneficiaries', i, 'address', e.target.value)} /></div>
                    </div>
                </div>
            ))}
            
            <div className="expert-final-box">
                <h3 className="final-box-title">8. DECLARACIÓN Y FIRMA</h3>
                <div className="legal-hint" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '15px', fontStyle: 'italic' }}>({t('fundacion.hints.declaration')})</div>
                {formData.signers.map((s, i) => (
                    <div key={i} className="expert-form-grid">
                        <div className="field-group full-width"><label>NOMBRE DEL DECLARANTE</label><input className="expert-input" list="names-global" value={s.name} onChange={e => {
                            const newS = [...formData.signers]; newS[i].name = e.target.value; setFormData({...formData, signers: newS});
                        }} /></div>
                        <div className="field-group full-width"><label>FIRMA ELECTRÓNICA</label><input className="expert-input" value={s.signature} onChange={e => {
                            const newS = [...formData.signers]; newS[i].signature = e.target.value; setFormData({...formData, signers: newS});
                        }} placeholder="..." /></div>
                    </div>
                ))}
                <div className="field-group" style={{ marginTop: '15px' }}><label>FECHA DE DECLARACIÓN</label><input type="date" className="expert-input" value={formData.declarationDate} onChange={e => setFormData({...formData, declarationDate: e.target.value})} /></div>
            </div>
        </div>
    );

    return (
        <div className="expert-foundation-container">
            <div className="expert-header-panel">
                <div className="header-text">
                    <h1>FORMULARIO DE FUNDACIÓN</h1>
                    <p>Gestión de Fundaciones de Interés Privado de Alta Precisión</p>
                </div>
                <button onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save">
                    <Save size={18} /> {saving ? 'Guardando...' : 'GUARDAR BORRADOR'}
                </button>
            </div>

            <div className="expert-stepper-panel">
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={`step-node ${step === s ? 'active' : step > s ? 'completed' : ''}`}>
                        <div className="step-circle">{step > s ? <CheckCircle2 size={16} /> : s}</div>
                        <div className="step-line" />
                        <span className="step-text">PASO 0{s}</span>
                    </div>
                ))}
            </div>

            <div className="expert-form-panel">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}

                <div className="expert-footer-nav">
                    <button type="button" onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="btn-nav-back"><ChevronLeft size={18} /> ANTERIOR</button>
                    {step < 5 ? (
                        <button type="button" onClick={() => setStep(prev => prev + 1)} className="btn-nav-next">SIGUIENTE PASO <ChevronRight size={18} /></button>
                    ) : (
                        <button type="button" onClick={() => onSave(formData, true)} disabled={saving} className="btn-nav-finish"><CheckCircle2 size={18} /> {saving ? 'Finalizando...' : 'FINALIZAR Y GUARDAR'}</button>
                    )}
                </div>
            </div>

            <datalist id="names-global">
                {formData.founders.map((f, i) => f.fullName && <option key={`f-${i}`} value={f.fullName} />)}
                {formData.councilMembers.map((m, i) => <option key={`c-${i}`} value={[m.firstName, m.lastName].filter(Boolean).join(' ')} />)}
                {formData.protectors.map((p, i) => p.fullName && <option key={`p-${i}`} value={p.fullName} />)}
                {formData.beneficiaries.map((b, i) => b.fullName && <option key={`b-${i}`} value={b.fullName} />)}
            </datalist>

            <style>{`
                .expert-foundation-container { width: 100%; maxWidth: 960px; margin: 0 auto; padding-bottom: 50px; }
                .expert-header-panel { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
                .header-text h1 { font-size: 26px; font-weight: 900; color: ${SECONDARY}; margin: 0; letter-spacing: -0.5px; }
                .header-text p { font-size: 13px; color: #64748b; margin: 5px 0 0; font-weight: 500; }
                .expert-btn-save { padding: 12px 20px; background: white; color: ${PRIMARY}; border: 2px solid ${PRIMARY}; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
                .expert-btn-save:hover { background: ${PRIMARY}08; transform: translateY(-1px); }

                .expert-stepper-panel { display: flex; gap: 0; margin-bottom: 45px; padding: 0 20px; position: relative; }
                .step-node { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
                .step-circle { width: 32px; height: 32px; background: white; border: 2px solid #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #94a3b8; z-index: 2; transition: all 0.3s; }
                .step-text { font-size: 10px; font-weight: 800; color: #94a3b8; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
                .step-line { position: absolute; height: 2px; background: #e2e8f0; width: 100%; top: 16px; left: 50%; z-index: 1; }
                .step-node:last-child .step-line { display: none; }
                .step-node.active .step-circle { border-color: ${PRIMARY}; color: ${PRIMARY}; box-shadow: 0 0 0 4px ${PRIMARY}15; }
                .step-node.active .step-text { color: ${PRIMARY}; }
                .step-node.completed .step-circle { background: ${PRIMARY}; border-color: ${PRIMARY}; color: white; }
                .step-node.completed .step-line { background: ${PRIMARY}; }

                .expert-form-panel { background: white; border-radius: 24px; padding: 45px; border: 1px solid #e2e8f0; box-shadow: 0 10px 40px rgba(0,0,0,0.03); }
                .step-title-legal { font-size: 14px; font-weight: 900; color: ${SECONDARY}; margin: 0 0 25px; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
                .legal-hint { font-size: 12px; font-weight: 500; color: #64748b; font-style: italic; margin-left: 5px; }
                .expert-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .expert-hint-box { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 12px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 10px; margin-bottom: 25px; }
                .expert-hint-mini { font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 5px; font-style: italic; }
                .full-width { grid-column: span 2; }
                .field-group { display: flex; flex-direction: column; gap: 8px; }
                .field-group label { font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
                .expert-input { width: 100%; padding: 14px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; outline: none; font-size: 14px; font-weight: 500; transition: all 0.2s; box-sizing: border-box; }
                .expert-input:focus { border-color: ${PRIMARY}; box-shadow: 0 0 0 4px ${PRIMARY}10; }
                .input-with-icon { position: relative; }
                .prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-weight: 800; color: #94a3b8; }

                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
                .btn-add { padding: 10px 18px; background: ${PRIMARY}08; color: ${PRIMARY}; border: 1.5px solid ${PRIMARY}30; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 12px; transition: all 0.2s; }
                .btn-add:hover { background: ${PRIMARY}; color: white; }

                .expert-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 30px; position: relative; margin-bottom: 25px; }
                .card-badge { position: absolute; top: -10px; left: 25px; background: ${PRIMARY}; color: white; font-size: 9px; font-weight: 900; padding: 4px 12px; border-radius: 20px; box-shadow: 0 4px 10px ${PRIMARY}40; }
                .btn-remove { position: absolute; top: 20px; right: 20px; color: #ef4444; background: none; border: none; cursor: pointer; opacity: 0.6; transition: 0.2s; }
                .btn-remove:hover { opacity: 1; transform: scale(1.1); }

                .section-header-mini { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 900; color: #94a3b8; letter-spacing: 1px; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
                .expert-card-mini { background: white; border: 1.5px solid #f1f5f9; border-radius: 16px; padding: 20px; margin-bottom: 15px; position: relative; }
                .card-badge-mini { position: absolute; top: 10px; right: 20px; font-size: 8px; font-weight: 900; color: #94a3b8; }
                .btn-add-mini { background: none; border: 1px solid #e2e8f0; color: #64748b; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px; }
                .btn-remove-mini { position: absolute; bottom: 15px; right: 15px; color: #ef4444; background: none; border: none; cursor: pointer; }

                .expert-final-box { background: ${SECONDARY}; border-radius: 20px; padding: 35px; color: white; margin-top: 40px; }
                .final-box-title { font-size: 16px; font-weight: 900; margin: 0 0 25px; letter-spacing: 1px; }
                .expert-final-box .expert-input { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: white; }
                .expert-final-box label { color: rgba(255,255,255,0.5); }

                .expert-footer-nav { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 35px; border-top: 1px solid #f1f5f9; }
                .btn-nav-back { padding: 14px 28px; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; }
                .btn-nav-back:hover { background: #f1f5f9; }
                .btn-nav-next { padding: 14px 28px; background: ${PRIMARY}; color: white; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 20px ${PRIMARY}30; transition: 0.2s; }
                .btn-nav-next:hover { transform: translateY(-2px); box-shadow: 0 15px 25px ${PRIMARY}40; }
                .btn-nav-finish { padding: 14px 28px; background: #16a34a; color: white; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 20px rgba(22, 163, 74, 0.3); transition: 0.2s; }
                .btn-nav-finish:hover { transform: translateY(-2px); box-shadow: 0 15px 25px rgba(22, 163, 74, 0.4); }
            `}</style>
        </div>
    );
};

export default FundacionForm;
