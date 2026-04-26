import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    ChevronLeft, ChevronRight, Check, Save, 
    FileCheck, Trash2, X 
} from 'lucide-react';

const FondosForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('id');

    // Color del Login
    const PRIMARY_COLOR = '#6366f1';

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

    useEffect(() => {
        if (editId) fetchExistingData();
    }, [editId]);

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
            console.error('Error loading data');
        }
    };

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const toggleFund = (fund) => {
        const updated = formData.fundsSource.includes(fund)
            ? formData.fundsSource.filter(f => f !== fund)
            : [...formData.fundsSource, fund];
        setFormData({ ...formData, fundsSource: updated });
    };

    const handleFinish = async () => {
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
        const headerStyle = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '35px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' };
        const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' };

        switch(step) {
            case 1:
                return (
                    <div className="corporate-step">
                        <div style={headerStyle}>
                            <div style={{ padding: '8px', background: `${PRIMARY_COLOR}11`, borderRadius: '8px', color: PRIMARY_COLOR }}>
                                <Building size={20} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>I. Identificación Corporativa {editId && <span style={{ color: '#22c55e', fontSize: '12px', marginLeft: 10 }}>[Edición]</span>}</h2>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
                            <div>
                                <label style={labelStyle}>Razón Social de la Compañía</label>
                                <input className="corporate-input" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="Ingrese el nombre oficial..." />
                            </div>
                            <div>
                                <label style={labelStyle}>Actividades Principales</label>
                                <textarea className="corporate-input" rows={3} value={formData.activities} onChange={e => setFormData({...formData, activities: e.target.value})} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div>
                                    <label style={labelStyle}>Jurisdicción / País</label>
                                    <input className="corporate-input" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Beneficiario Final</label>
                                    <input className="corporate-input" value={formData.beneficiaryName} onChange={e => setFormData({...formData, beneficiaryName: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <button onClick={handleNext} className="corporate-btn-primary" style={{ marginTop: '40px' }}>
                            Siguiente Paso <ChevronRight size={18} />
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div className="corporate-step">
                        <div style={headerStyle}>
                            <div style={{ padding: '8px', background: `${PRIMARY_COLOR}11`, borderRadius: '8px', color: PRIMARY_COLOR }}>
                                <Wallet size={20} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>II. Declaración de Origen de Fondos</h2>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '20px' }}>Marque las opciones que correspondan:</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {['Bienes personales', 'Inversiones Financieras', 'Negocios', 'Prestamos', 'Herencia o Fondo Fiduciario'].map(f => (
                                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '10px 15px', borderRadius: '8px', border: formData.fundsSource.includes(f) ? `1px solid ${PRIMARY_COLOR}` : '1px solid transparent', background: formData.fundsSource.includes(f) ? `${PRIMARY_COLOR}08` : 'transparent', transition: '0.2s' }}>
                                        <input type="checkbox" checked={formData.fundsSource.includes(f)} onChange={() => toggleFund(f)} style={{ width: '18px', height: '18px', accentColor: PRIMARY_COLOR }} />
                                        <span style={{ fontSize: '14px', fontWeight: formData.fundsSource.includes(f) ? 700 : 500, color: '#1e293b' }}>{f}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Otras especificaciones</label>
                            <input className="corporate-input" value={formData.fundsOther} onChange={e => setFormData({...formData, fundsOther: e.target.value})} />
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '40px' }}>
                            <button onClick={handleBack} className="corporate-btn-secondary"><ChevronLeft size={18} /> Anterior</button>
                            <button onClick={handleNext} className="corporate-btn-primary" style={{ flex: 1 }}>Continuar <ChevronRight size={18} /></button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="corporate-step">
                        <div style={headerStyle}>
                            <div style={{ padding: '8px', background: `${PRIMARY_COLOR}11`, borderRadius: '8px', color: PRIMARY_COLOR }}>
                                <Shield size={20} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>III. Registro y Responsabilidades</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            <div>
                                <label style={labelStyle}>Nombre del Responsable de Custodia</label>
                                <input className="corporate-input" value={formData.custodyName} onChange={e => setFormData({...formData, custodyName: e.target.value})} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div>
                                    <label style={labelStyle}>Teléfono Corporativo</label>
                                    <input className="corporate-input" value={formData.custodyPhone} onChange={e => setFormData({...formData, custodyPhone: e.target.value})} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Email Institucional</label>
                                    <input className="corporate-input" value={formData.custodyEmail} onChange={e => setFormData({...formData, custodyEmail: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Dirección de Almacenamiento de Registros</label>
                                <input className="corporate-input" value={formData.custodyAddress} onChange={e => setFormData({...formData, custodyAddress: e.target.value})} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '40px' }}>
                            <button onClick={handleBack} className="corporate-btn-secondary"><ChevronLeft size={18} /> Atrás</button>
                            <button onClick={handleFinish} className="corporate-btn-finish" style={{ background: PRIMARY_COLOR, padding: '16px' }} disabled={loading}>
                                <Save size={18} /> {loading ? 'Sincronizando...' : 'Finalizar Registro'}
                            </button>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: '72px', height: '72px', background: '#ecfdf5', color: '#10b981', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', border: '1px solid #d1fae5' }}>
                            <Check size={36} />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>Documentación Validada</h2>
                        <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px' }}>El formulario ha sido procesado y guardado exitosamente en el sistema.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
                            <button onClick={() => navigate('/dashboard')} className="corporate-btn-primary">
                                Regresar al Dashboard
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>Gestión de Registros Contables</div>
                    <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><X size={24} /></button>
                </div>
                
                {/* Stepper Progresivo Color-Matched */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '45px' }}>
                    {[1,2,3].map(s => (
                        <div key={s} style={{ flex: 1, height: '6px', background: step >= s ? PRIMARY_COLOR : '#f1f5f9', borderRadius: '10px', transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                    ))}
                </div>

                {renderStep()}
            </div>

            <style>{`
                .corporate-page {
                    min-height: 100vh;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .corporate-card {
                    width: 100%;
                    max-width: 750px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 24px;
                    padding: 50px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
                }
                .corporate-input {
                    width: 100%;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 14px 18px;
                    font-size: 15px;
                    color: #1e293b;
                    outline: none;
                    transition: all 0.2s;
                }
                .corporate-input:focus {
                    border-color: ${PRIMARY_COLOR};
                    box-shadow: 0 0 0 4px ${PRIMARY_COLOR}15;
                    background: white;
                }
                .corporate-btn-primary {
                    width: 100%;
                    background: ${PRIMARY_COLOR};
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 16px;
                    font-weight: 700;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s;
                    box-shadow: 0 10px 15px -3px ${PRIMARY_COLOR}33;
                }
                .corporate-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 20px -5px ${PRIMARY_COLOR}44;
                }
                .corporate-btn-secondary {
                    background: white;
                    border: 1.5px solid #e2e8f0;
                    color: #64748b;
                    padding: 14px 30px;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.2s;
                }
                .corporate-btn-secondary:hover {
                    border-color: #cbd5e1;
                    background: #f8fafc;
                }
                .corporate-btn-finish {
                    flex: 1;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s;
                }
            `}</style>
        </div>
    );
};

export default FondosForm;
