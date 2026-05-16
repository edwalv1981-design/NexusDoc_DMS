import React, { useState, useEffect } from 'react';
import { 
    Building, Users, UserCheck, Briefcase, FileCheck, 
    Plus, Trash2, ChevronRight, ChevronLeft, Save, 
    CheckCircle2, Info, Shield, Award
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
            const cleanData = { ...initialData };
            if (!cleanData.directors) cleanData.directors = formData.directors;
            if (!cleanData.dignitaries) cleanData.dignitaries = formData.dignitaries;
            if (!cleanData.shareholders) cleanData.shareholders = formData.shareholders;
            if (!cleanData.signers) cleanData.signers = formData.signers;
            setFormData(prev => ({ ...prev, ...cleanData }));
        }
    }, [initialData]);

    const getT = (key, fallback) => {
        const val = t(key);
        if (!val || val === key || val.includes('corporacion.fields')) return fallback;
        return val;
    };

    const findPersonData = (name) => {
        if (!name || name.trim().length < 3) return null;
        const searchName = name.toLowerCase().trim();

        for (const d of formData.directors) {
            const full = [d.firstName, d.secondName, d.lastName].filter(p => p && p.trim()).join(' ');
            if (full.toLowerCase().trim() === searchName) {
                return { birthDate: d.birthDate, passport: d.passport, address: d.address };
            }
        }

        for (const d of formData.dignitaries) {
            if (d.fullName && d.fullName.toLowerCase().trim() === searchName) {
                return { birthDate: d.birthDate, passport: d.passport };
            }
        }

        for (const s of formData.shareholders) {
            if (s.name && s.name.toLowerCase().trim() === searchName) {
                return { address: s.address };
            }
        }

        return null;
    };

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
        if (field === 'fullName' && value.length > 3) {
            const person = findPersonData(value);
            if (person) {
                if (person.birthDate && !newDigs[index].birthDate) newDigs[index].birthDate = person.birthDate;
                if (person.passport && !newDigs[index].passport) newDigs[index].passport = person.passport;
            }
        }
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
        if (field === 'name' && value.length > 3) {
            const person = findPersonData(value);
            if (person && person.address && !newShareholders[index].address) {
                newShareholders[index].address = person.address;
            }
        }
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
        setFormData(prev => ({ ...prev, signers: newSigners }));
    };

    const PRIMARY = '#0078d4';
    const SECONDARY = '#1e293b';

    const renderStep1 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><Building size={22} color={PRIMARY} /> {getT('corporacion.steps.societyInfo', 'Información de la Sociedad')}</h2>
            <div className="expert-grid">
                <div className="expert-field full-width">
                    <label>{getT('corporacion.fields.nameSA', 'NOMBRE S.A.')}</label>
                    <input className="expert-input" value={formData.corpNameSA} onChange={e => setFormData({...formData, corpNameSA: e.target.value})} placeholder="NEXUS SOLUTIONS S.A." />
                </div>
                <div className="expert-field">
                    <label>{getT('corporacion.fields.nameCorp', 'NOMBRE CORP.')}</label>
                    <input className="expert-input" value={formData.corpNameCorp} onChange={e => setFormData({...formData, corpNameCorp: e.target.value})} />
                </div>
                <div className="expert-field">
                    <label>{getT('corporacion.fields.nameInc', 'NOMBRE INC.')}</label>
                    <input className="expert-input" value={formData.corpNameInc} onChange={e => setFormData({...formData, corpNameInc: e.target.value})} />
                </div>
                <div className="expert-field full-width">
                    <label>{t('corporacion.fields.capital')}</label>
                    <div className="expert-hint">{t('corporacion.hints.capital')}</div>
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
            <div className="expert-hint-box"><Info size={16} /> {t('corporacion.hints.directors')}</div>
            {formData.directors.map((d, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">DIRECTOR #{i+1}</div>
                    {formData.directors.length > 3 && <button onClick={() => removeDirector(i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field"><label>PRIMER NOMBRE</label><input className="expert-input" list="corp-global-names" value={d.firstName} onChange={e => updateDirector(i, 'firstName', e.target.value)} /></div>
                        <div className="expert-field"><label>SEGUNDO NOMBRE</label><input className="expert-input" value={d.secondName} onChange={e => updateDirector(i, 'secondName', e.target.value)} /></div>
                        <div className="expert-field"><label>APELLIDOS</label><input className="expert-input" value={d.lastName} onChange={e => updateDirector(i, 'lastName', e.target.value)} /></div>
                        <div className="expert-field">
                            <label>ESTADO CIVIL</label>
                            <select className="expert-input" value={d.maritalStatus} onChange={e => updateDirector(i, 'maritalStatus', e.target.value)}>
                                <option value="">Seleccione...</option>
                                <option value="Soltero(a)">Soltero(a)</option>
                                <option value="Casado(a)">Casado(a)</option>
                                <option value="Divorciado(a)">Divorciado(a)</option>
                                <option value="Viudo(a)">Viudo(a)</option>
                            </select>
                        </div>
                        <div className="expert-field"><label>NACIONALIDAD</label><input className="expert-input" value={d.nationality} onChange={e => updateDirector(i, 'nationality', e.target.value)} /></div>
                        <div className="expert-field"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={d.passport} onChange={e => updateDirector(i, 'passport', e.target.value)} /></div>
                        <div className="expert-field"><label>FECHA DE NACIMIENTO</label><input type="date" className="expert-input" value={d.birthDate} onChange={e => updateDirector(i, 'birthDate', e.target.value)} /></div>
                        <div className="expert-field full-width"><label>DIRECCIÓN COMPLETA</label><input className="expert-input" value={d.address} onChange={e => updateDirector(i, 'address', e.target.value)} /></div>
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
            <div className="expert-hint-box"><Info size={16} /> {t('corporacion.hints.dignitaries')}</div>
            {formData.dignitaries.map((dig, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">DIGNATARIO #{i+1}</div>
                    {formData.dignitaries.length > 3 && <button onClick={() => removeDignitary(i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field"><label>CARGO</label><input className="expert-input" value={dig.role} onChange={e => updateDignitary(i, 'role', e.target.value.toUpperCase())} placeholder="EJ: PRESIDENTE" /></div>
                        <div className="expert-field full-width"><label>NOMBRE COMPLETO</label><input className="expert-input" list="corp-global-names" value={dig.fullName} onChange={e => updateDignitary(i, 'fullName', e.target.value)} /></div>
                        <div className="expert-field"><label>PASAPORTE/CÉDULA</label><input className="expert-input" value={dig.passport} onChange={e => updateDignitary(i, 'passport', e.target.value)} /></div>
                        <div className="expert-field"><label>FECHA DE NACIMIENTO</label><input type="date" className="expert-input" value={dig.birthDate} onChange={e => updateDignitary(i, 'birthDate', e.target.value)} /></div>
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
            <div className="expert-hint-box"><Info size={16} /> {t('corporacion.hints.shareholders')}</div>
            {formData.shareholders.map((s, i) => (
                <div key={i} className="expert-card-legal">
                    <div className="expert-card-label">ACCIONISTA #{i+1}</div>
                    {formData.shareholders.length > 1 && <button onClick={() => removeShareholder(i)} className="expert-btn-remove"><Trash2 size={16} /></button>}
                    <div className="expert-grid">
                        <div className="expert-field"><label>CERTIFICADO</label><input className="expert-input" value={s.certificate} onChange={e => updateShareholder(i, 'certificate', e.target.value)} /></div>
                        <div className="expert-field"><label>VALOR USD</label><input className="expert-input" value={s.value} onChange={e => updateShareholder(i, 'value', e.target.value)} /></div>
                        <div className="expert-field"><label>ACCIONES</label><input className="expert-input" value={s.shares} onChange={e => updateShareholder(i, 'shares', e.target.value)} /></div>
                        <div className="expert-field full-width"><label>NOMBRE COMPLETO</label><input className="expert-input" list="corp-global-names" value={s.name} onChange={e => updateShareholder(i, 'name', e.target.value)} /></div>
                        <div className="expert-field full-width"><label>DIRECCIÓN RESIDENCIAL</label><input className="expert-input" value={s.address} onChange={e => updateShareholder(i, 'address', e.target.value)} /></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep5 = () => (
        <div className="expert-step animate-in fade-in slide-in-from-bottom-4">
            <h2 className="expert-step-title"><FileCheck size={22} color={PRIMARY} /> {t('corporacion.steps.finalization')}</h2>
            <div className="expert-field full-width" style={{ marginBottom: '30px' }}>
                <label>OBJETO SOCIAL Y ACTIVIDADES</label>
                <div className="expert-hint" style={{ marginBottom: '10px' }}>{t('corporacion.hints.activities')}</div>
                <textarea className="expert-input" rows={4} value={formData.companyActivities} onChange={e => setFormData({...formData, companyActivities: e.target.value})} placeholder="Describa las actividades..." />
            </div>

            <div className="expert-legal-box">
                <h3 style={{ fontSize: '16px', fontWeight: 900, marginBottom: '15px' }}>DECLARACIÓN JURADA</h3>
                <p className="expert-legal-text">{t('corporacion.hints.declaration')}</p>
                <button onClick={addSigner} className="expert-btn-add-white"><Plus size={16} /> {t('corporacion.fields.addSigner')}</button>
                
                {formData.signers.map((s, i) => (
                    <div key={i} style={{ marginTop: '20px', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="expert-grid">
                            <div className="expert-field full-width">
                                <label style={{ color: '#94a3b8' }}>NOMBRE DEL FIRMANTE</label>
                                <input className="expert-input-legal" list="corp-global-names" value={s.name} onChange={e => updateSigner(i, 'name', e.target.value)} />
                            </div>
                            <div className="expert-field full-width">
                                <label style={{ color: '#94a3b8' }}>FIRMA (NOMBRE COMPLETO)</label>
                                <input className="expert-input-legal" value={s.signature} onChange={e => updateSigner(i, 'signature', e.target.value)} placeholder="Como aparece en su identificación..." />
                            </div>
                        </div>
                    </div>
                ))}
                <div className="expert-field" style={{ marginTop: '20px' }}>
                    <label style={{ color: '#94a3b8' }}>FECHA DE DECLARACIÓN</label>
                    <input type="date" className="expert-input-legal" value={formData.declarationDate} onChange={e => setFormData({...formData, declarationDate: e.target.value})} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="expert-container">
            <div className="expert-header">
                <div>
                    <h1 className="expert-title">INCORPORACIÓN</h1>
                    <p className="expert-subtitle">Sistema de Alta Precisión Corporativa</p>
                </div>
                <button onClick={() => onSave(formData)} disabled={saving} className="expert-btn-save-master">
                    <Save size={18} /> {saving ? 'Sincronizando...' : 'GUARDAR AVANCE'}
                </button>
            </div>

            <div className="expert-stepper">
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={`expert-step-node ${step === s ? 'active' : step > s ? 'done' : ''}`}>
                        <div className="expert-step-circle">{step > s ? <CheckCircle2 size={16} /> : s}</div>
                        <div className="expert-step-line" />
                    </div>
                ))}
            </div>

            <div className="expert-main-panel">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}

                <div className="expert-nav-footer">
                    <button onClick={() => setStep(prev => prev - 1)} disabled={step === 1} className="expert-btn-nav-prev"><ChevronLeft size={18} /> ANTERIOR</button>
                    {step < 5 ? (
                        <button onClick={() => setStep(prev => prev + 1)} className="expert-btn-nav-next">SIGUIENTE PASO <ChevronRight size={18} /></button>
                    ) : (
                        <button onClick={() => onSave(formData, true)} disabled={saving} className="expert-btn-nav-finish"><CheckCircle2 size={18} /> {saving ? 'FINALIZANDO...' : 'REGISTRAR SOCIEDAD'}</button>
                    )}
                </div>
            </div>

            <datalist id="corp-global-names">
                {formData.directors.map((d, i) => {
                    const full = [d.firstName, d.lastName].filter(Boolean).join(' ');
                    return full && <option key={`d-${i}`} value={full} />;
                })}
                {formData.dignitaries.map((d, i) => d.fullName && <option key={`dig-${i}`} value={d.fullName} />)}
            </datalist>

            <style>{`
                .expert-container { width: 100%; maxWidth: 900px; margin: 0 auto; padding: 20px 0 80px; font-family: 'Inter', sans-serif; }
                .expert-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
                .expert-title { font-size: 26px; font-weight: 900; color: ${SECONDARY}; margin: 0; letter-spacing: -1px; }
                .expert-subtitle { font-size: 13px; color: #64748b; margin: 5px 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                
                .expert-btn-save-master { padding: 12px 24px; background: white; color: ${PRIMARY}; border: 2.5px solid ${PRIMARY}; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; font-size: 13px; }
                .expert-btn-save-master:hover { background: ${PRIMARY}; color: white; transform: translateY(-2px); box-shadow: 0 10px 20px ${PRIMARY}30; }

                .expert-stepper { display: flex; gap: 10px; margin-bottom: 40px; padding: 0 10px; }
                .expert-step-node { flex: 1; position: relative; }
                .expert-step-circle { width: 30px; height: 30px; border-radius: 50%; background: white; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; color: #94a3b8; z-index: 2; position: relative; }
                .expert-step-line { position: absolute; height: 4px; background: #e2e8f0; width: 100%; top: 13px; left: 15px; z-index: 1; border-radius: 10px; }
                .expert-step-node:last-child .expert-step-line { display: none; }
                .expert-step-node.active .expert-step-circle { border-color: ${PRIMARY}; color: ${PRIMARY}; box-shadow: 0 0 0 4px ${PRIMARY}15; }
                .expert-step-node.done .expert-step-circle { background: ${PRIMARY}; border-color: ${PRIMARY}; color: white; }
                .expert-step-node.done .expert-step-line { background: ${PRIMARY}; }

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

                .expert-legal-box { background: ${SECONDARY}; border-radius: 24px; padding: 35px; color: white; margin-top: 30px; }
                .expert-legal-text { font-size: 13px; line-height: 1.6; color: #94a3b8; margin-bottom: 25px; font-style: italic; border-left: 2px solid ${PRIMARY}; padding-left: 15px; }
                .expert-btn-add-white { background: rgba(255,255,255,0.1); color: white; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 11px; }
                .expert-btn-add-white:hover { background: white; color: ${SECONDARY}; }
                .expert-input-legal { width: 100%; padding: 14px 18px; border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.05); color: white; outline: none; }
                .expert-input-legal:focus { border-color: ${PRIMARY}; background: rgba(255,255,255,0.1); }

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
