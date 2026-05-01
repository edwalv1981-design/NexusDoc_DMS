import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const PRIMARY = '#0078d4';
const BORDER = '#e2e8f0';
const RADIUS = '8px';
const RADIUS_LG = '16px';

const CorporacionForm = ({ initialData, onSave, saving }) => {
    const [step, setStep] = useState(1);
    
    // Initial State
    const defaultDirector = { firstName: '', secondName: '', lastName: '', birthDate: '', maritalStatus: '', nationality: '', passport: '', phone: '', email: '', address: '', city: '', country: '' };
    const defaultShareholder = { certificate: '', value: '', shares: '', name: '', address: '' };
    const defaultDignitary = { fullName: '', birthDate: '', passport: '', registrationNumber: '' };

    const [formData, setFormData] = useState({
        corpNameSA: '',
        corpNameCorp: '',
        corpNameInc: '',
        capitalSocial: '',
        directors: [{ ...defaultDirector }, { ...defaultDirector }, { ...defaultDirector }], // Min 3
        dignitaries: {
            presidente: { ...defaultDignitary },
            secretario: { ...defaultDignitary },
            tesorero: { ...defaultDignitary }
        },
        shareholders: [{ ...defaultShareholder }],
        companyActivities: '',
        declarationName: '',
        declarationDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0 && initialData.corpNameSA !== undefined) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDirectorChange = (index, field, value) => {
        const newDirectors = [...formData.directors];
        newDirectors[index][field] = value;
        setFormData(prev => ({ ...prev, directors: newDirectors }));
    };

    const addDirector = () => {
        setFormData(prev => ({ ...prev, directors: [...prev.directors, { ...defaultDirector }] }));
    };

    const removeDirector = (index) => {
        if (formData.directors.length <= 3) return; // Min 3
        const newDirectors = formData.directors.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, directors: newDirectors }));
    };

    const handleDignitaryChange = (role, field, value) => {
        setFormData(prev => ({
            ...prev,
            dignitaries: {
                ...prev.dignitaries,
                [role]: { ...prev.dignitaries[role], [field]: value }
            }
        }));
    };

    const handleShareholderChange = (index, field, value) => {
        const newShareholders = [...formData.shareholders];
        newShareholders[index][field] = value;
        setFormData(prev => ({ ...prev, shareholders: newShareholders }));
    };

    const addShareholder = () => {
        setFormData(prev => ({ ...prev, shareholders: [...prev.shareholders, { ...defaultShareholder }] }));
    };

    const removeShareholder = (index) => {
        if (formData.shareholders.length <= 1) return;
        const newShareholders = formData.shareholders.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, shareholders: newShareholders }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const renderField = (label, name, value, onChange, type = "text", placeholder = "", required = true) => (
        <div className="field-group">
            <label>{label}</label>
            <input type={type} className="input-expert" name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} />
        </div>
    );

    return (
        <div style={{ maxWidth: '900px' }}>
            <h1 style={{ marginBottom: '25px', color: '#1e293b' }}>Corporación</h1>
            <form onSubmit={handleSubmit} style={{ background: 'white', padding: '35px', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: PRIMARY, letterSpacing: '1px' }}>PASO {step} DE 6</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 35 }}>
                    {[1, 2, 3, 4, 5, 6].map(s => (
                        <div key={s} style={{ flex: 1, height: '4px', background: step >= s ? PRIMARY : '#f1f5f9', borderRadius: '10px' }}></div>
                    ))}
                </div>

                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ background: '#eff6ff', padding: '15px', borderRadius: RADIUS, border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e3a8a', lineHeight: 1.5 }}>
                            <strong>Instrucción:</strong> El nombre de la Compañía debe terminar con una de las siguientes terminaciones: Corporation, Incorporated, Société Anonyme, Sociedad Anónima o con las abreviaciones: Corp., Inc. o S.A., A/S, N.V., B.V., AG.
                        </div>
                        {renderField('NOMBRE COMPAÑÍA S.A.', 'corpNameSA', formData.corpNameSA, handleChange)}
                        {renderField('NOMBRE COMPAÑÍA CORP.', 'corpNameCorp', formData.corpNameCorp, handleChange)}
                        {renderField('NOMBRE COMPAÑÍA INC.', 'corpNameInc', formData.corpNameInc, handleChange)}
                        {renderField('CAPITAL SOCIAL AUTORIZADO (Mínimo $10,000)', 'capitalSocial', formData.capitalSocial, handleChange, 'number', 'Ej: 10000')}

                        <button type="button" onClick={() => setStep(2)} className="btn-primary" style={{ alignSelf: 'flex-end' }}>SIGUIENTE</button>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <h3 style={{ fontSize: '16px', color: '#0f172a' }}>Directores (Mínimo 3)</h3>
                        {formData.directors.map((dir, idx) => (
                            <div key={idx} style={{ padding: '20px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, background: '#f8fafc', position: 'relative' }}>
                                <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: PRIMARY }}>Director {idx + 1}</h4>
                                {idx >= 3 && (
                                    <button type="button" onClick={() => removeDirector(idx)} style={{ position: 'absolute', top: 15, right: 15, background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                    {renderField('PRIMER NOMBRE', 'firstName', dir.firstName, (e) => handleDirectorChange(idx, 'firstName', e.target.value))}
                                    {renderField('SEGUNDO NOMBRE', 'secondName', dir.secondName, (e) => handleDirectorChange(idx, 'secondName', e.target.value))}
                                    {renderField('APELLIDOS', 'lastName', dir.lastName, (e) => handleDirectorChange(idx, 'lastName', e.target.value))}
                                    {renderField('FECHA DE NACIMIENTO', 'birthDate', dir.birthDate, (e) => handleDirectorChange(idx, 'birthDate', e.target.value), 'date')}
                                    {renderField('ESTADO CIVIL', 'maritalStatus', dir.maritalStatus, (e) => handleDirectorChange(idx, 'maritalStatus', e.target.value))}
                                    {renderField('NACIONALIDAD', 'nationality', dir.nationality, (e) => handleDirectorChange(idx, 'nationality', e.target.value))}
                                    {renderField('PASAPORTE', 'passport', dir.passport, (e) => handleDirectorChange(idx, 'passport', e.target.value))}
                                    {renderField('TELÉFONO', 'phone', dir.phone, (e) => handleDirectorChange(idx, 'phone', e.target.value))}
                                    {renderField('EMAIL', 'email', dir.email, (e) => handleDirectorChange(idx, 'email', e.target.value), 'email')}
                                    {renderField('DIRECCIÓN', 'address', dir.address, (e) => handleDirectorChange(idx, 'address', e.target.value))}
                                    {renderField('CIUDAD', 'city', dir.city, (e) => handleDirectorChange(idx, 'city', e.target.value))}
                                    {renderField('PAÍS', 'country', dir.country, (e) => handleDirectorChange(idx, 'country', e.target.value))}
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addDirector} style={{ padding: '10px', background: 'white', border: `1px dashed ${PRIMARY}`, color: PRIMARY, borderRadius: RADIUS, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                            <Plus size={16} /> AUMENTAR DIRECTOR
                        </button>
                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button type="button" onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1 }}>ATRÁS</button>
                            <button type="button" onClick={() => setStep(3)} className="btn-primary" style={{ flex: 1 }}>SIGUIENTE</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <h3 style={{ fontSize: '16px', color: '#0f172a' }}>Dignatarios</h3>
                        {['presidente', 'secretario', 'tesorero'].map((role) => (
                            <div key={role} style={{ padding: '20px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, background: '#f8fafc' }}>
                                <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: PRIMARY, textTransform: 'uppercase' }}>{role}</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                    {renderField('NOMBRE COMPLETO', 'fullName', formData.dignitaries[role].fullName, (e) => handleDignitaryChange(role, 'fullName', e.target.value))}
                                    {renderField('FECHA DE NACIMIENTO', 'birthDate', formData.dignitaries[role].birthDate, (e) => handleDignitaryChange(role, 'birthDate', e.target.value), 'date')}
                                    {renderField('PASAPORTE', 'passport', formData.dignitaries[role].passport, (e) => handleDignitaryChange(role, 'passport', e.target.value))}
                                    {renderField('NÚMERO DE REGISTRO (SI ES EMPRESA)', 'registrationNumber', formData.dignitaries[role].registrationNumber, (e) => handleDignitaryChange(role, 'registrationNumber', e.target.value), 'text', '', false)}
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button type="button" onClick={() => setStep(2)} className="btn-secondary" style={{ flex: 1 }}>ATRÁS</button>
                            <button type="button" onClick={() => setStep(4)} className="btn-primary" style={{ flex: 1 }}>SIGUIENTE</button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <h3 style={{ fontSize: '16px', color: '#0f172a' }}>Accionistas</h3>
                        {formData.shareholders.map((shareholder, idx) => (
                            <div key={idx} style={{ padding: '20px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, background: '#f8fafc', position: 'relative' }}>
                                <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: PRIMARY }}>Accionista {idx + 1}</h4>
                                {idx >= 1 && (
                                    <button type="button" onClick={() => removeShareholder(idx)} style={{ position: 'absolute', top: 15, right: 15, background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                    {renderField('NÚMERO DE CERTIFICADO', 'certificate', shareholder.certificate, (e) => handleShareholderChange(idx, 'certificate', e.target.value))}
                                    {renderField('VALOR POR ACCIÓN', 'value', shareholder.value, (e) => handleShareholderChange(idx, 'value', e.target.value), 'number')}
                                    {renderField('NÚMERO DE ACCIONES', 'shares', shareholder.shares, (e) => handleShareholderChange(idx, 'shares', e.target.value), 'number')}
                                    {renderField('NOMBRE DEL ACCIONISTA', 'name', shareholder.name, (e) => handleShareholderChange(idx, 'name', e.target.value))}
                                    <div className="field-group" style={{ gridColumn: 'span 2' }}>
                                        <label>DIRECCIÓN COMPLETA</label>
                                        <input type="text" className="input-expert" value={shareholder.address} onChange={(e) => handleShareholderChange(idx, 'address', e.target.value)} required />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addShareholder} style={{ padding: '10px', background: 'white', border: `1px dashed ${PRIMARY}`, color: PRIMARY, borderRadius: RADIUS, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                            <Plus size={16} /> AUMENTAR ACCIONISTA
                        </button>
                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button type="button" onClick={() => setStep(3)} className="btn-secondary" style={{ flex: 1 }}>ATRÁS</button>
                            <button type="button" onClick={() => setStep(5)} className="btn-primary" style={{ flex: 1 }}>SIGUIENTE</button>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <h3 style={{ fontSize: '16px', color: '#0f172a' }}>Actividades de la Compañía</h3>
                        <div className="field-group">
                            <label>DETALLE DE ACTIVIDADES A REALIZAR</label>
                            <textarea 
                                className="input-expert" 
                                rows={6} 
                                name="companyActivities" 
                                value={formData.companyActivities} 
                                onChange={handleChange} 
                                required 
                                placeholder="Describa a detalle las actividades comerciales o propósitos de la corporación..."
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button type="button" onClick={() => setStep(4)} className="btn-secondary" style={{ flex: 1 }}>ATRÁS</button>
                            <button type="button" onClick={() => setStep(6)} className="btn-primary" style={{ flex: 1 }}>SIGUIENTE</button>
                        </div>
                    </div>
                )}

                {step === 6 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <h3 style={{ fontSize: '16px', color: '#0f172a' }}>Declaración Final</h3>
                        <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: RADIUS, border: `1px solid ${BORDER}`, fontStyle: 'italic', fontSize: '14px', color: '#334155', lineHeight: 1.6, textAlign: 'center' }}>
                            "I hereby affirm that information given on this application is complete and accurate. I understand that any falsification or ommission will carry legal effects and penalties. I authorize the company to investigate the authenticity of above-mentioned information."
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                            {renderField('NOMBRE DEL DECLARANTE', 'declarationName', formData.declarationName, handleChange)}
                            {renderField('FECHA', 'declarationDate', formData.declarationDate, handleChange, 'date')}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button type="button" onClick={() => setStep(5)} className="btn-secondary" style={{ flex: 1, padding: '12px', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>ATRÁS</button>
                            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, padding: '12px', background: PRIMARY, color: 'white', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'GUARDANDO...' : 'FINALIZAR Y GUARDAR'}
                            </button>
                        </div>
                    </div>
                )}
            </form>
            <style>{`
                .btn-primary { background: ${PRIMARY}; color: white; border: none; padding: 12px 30px; border-radius: ${RADIUS}; font-weight: 700; cursor: pointer; font-size: 13px; }
                .btn-secondary { background: #f8fafc; color: #333; border: 1px solid ${BORDER}; padding: 12px 30px; border-radius: ${RADIUS}; font-weight: 700; cursor: pointer; font-size: 13px; }
            `}</style>
        </div>
    );
};

export default CorporacionForm;
