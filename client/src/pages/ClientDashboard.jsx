import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    FileText, Clock, User as UserIcon, LogOut, 
    Trash2, Plus, LayoutGrid, Shield, Check, AlertCircle, X, Info, Search, Calendar, Download, Building, Heart, ShieldAlert, ClipboardList, Construction, Edit, BookOpen, UploadCloud
} from 'lucide-react';
import API_BASE_URL from '../config';
import UserDocuments from './UserDocuments';
import SignedDocuments from './SignedDocuments';
import CorporacionForm from './CorporacionForm';
import CorporacionPreview from '../components/CorporacionPreview';
import html2pdf from 'html2pdf.js';

const ClientDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('id');
    const showForm = queryParams.get('view') === 'form';
    const showDocuments = queryParams.get('view') === 'documents';
    const showSignedDocs = queryParams.get('view') === 'signed-docs';
    const formTypeQuery = queryParams.get('type');

    const [currentFormType, setCurrentFormType] = useState(formTypeQuery || '');

    const PRIMARY = '#0078d4';
    const BG = '#f8fafc';
    const TEXT = '#111';
    const BORDER = '#e2e8f0';
    const RADIUS = '8px';
    const RADIUS_LG = '16px';

    const [user, setUser] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // FILTROS Y BÚSQUEDA
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // SISTEMA DE NOTIFICACIONES UX-UI
    const [toast, setToast] = useState({ show: false, msg: '', type: 'error' });
    const [modal, setModal] = useState({ show: false, msg: '', onConfirm: null });
    const [pdfData, setPdfData] = useState(null); // Para el motor dinámico de descarga
    const pdfRef = React.useRef(null);

    const [step, setStep] = useState(1);
    const EMPTY_FORM = {
        companyName: '', activities: '', country: '', beneficiaryName: '',
        birthDate: '', birthPlace: '', address: '', fundsSource: [],
        fundsOther: '', custodyName: '', custodyPhone: '', custodyEmail: '',
        custodyAddress: '', signerName: '', date: new Date().toISOString().split('T')[0]
    };
    const [formData, setFormData] = useState(EMPTY_FORM);

    const formOptions = [
        { id: 'Fondos Registros contables', label: 'Fondos Registros contables', icon: <ClipboardList size={24} />, color: '#6366f1' },
        { id: 'Corporación', label: 'Corporación', icon: <Building size={24} />, color: '#10b981' },
        { id: 'Fundaciones', label: 'Fundaciones', icon: <Heart size={24} />, color: '#ef4444' },
        { id: 'Cumplimiento Individual', label: 'Cumplimiento Individual', icon: <UserIcon size={24} />, color: '#f59e0b' },
        { id: 'Cumplimiento Entidades', label: 'Cumplimiento Entidades', icon: <ShieldAlert size={24} />, color: '#3b82f6' },
    ];

    useEffect(() => {
        fetchData();
        if (editId) fetchFormData(editId);
        if (formTypeQuery) setCurrentFormType(formTypeQuery);
    }, [editId, formTypeQuery]);

    const showToast = (msg, type = 'error') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: '', type: 'error' }), 4000);
    };

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/');
            const [userRes, docsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/auth/me`, { headers: { 'x-auth-token': token } }),
                fetch(`${API_BASE_URL}/api/forms/my-forms`, { headers: { 'x-auth-token': token } })
            ]);
            if (userRes.status === 401 || docsRes.status === 401) { localStorage.clear(); return navigate('/'); }
            if (userRes.ok) setUser(await userRes.json());
            if (docsRes.ok) setDocuments(await docsRes.json());
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const fetchFormData = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/${id}`, { headers: { 'x-auth-token': token } });
            if (response.status === 401) { localStorage.clear(); return navigate('/'); }
            if (response.ok) {
                const result = await response.json();
                if (result.data) setFormData(result.data);
                if (result.type) setCurrentFormType(result.type);
            }
        } catch (e) { console.error(e); }
    };

    const validateStep = (currentStep) => {
        if (currentStep === 1) {
            const { companyName, activities, country, beneficiaryName, birthDate, birthPlace, address } = formData;
            if (!companyName || !activities || !country || !beneficiaryName || !birthDate || !birthPlace || !address) {
                showToast('Debe completar todos los campos obligatorios del Paso 1.');
                return false;
            }
        }
        if (currentStep === 2) {
            if (formData.fundsSource.length === 0) {
                showToast('Es obligatorio seleccionar al menos un origen de fondos.');
                return false;
            }
        }
        return true;
    };

    const handleSaveForm = async (e) => {
        if (e) e.preventDefault();
        if (!validateStep(1) || !validateStep(2)) return;
        
        const { custodyName, custodyPhone, custodyEmail, custodyAddress, signerName, date } = formData;
        if (!custodyName || !custodyPhone || !custodyEmail || !custodyAddress || !signerName || !date) {
            return showToast('Por favor, complete la información del Paso 3 para finalizar.');
        }

        setSaving(true);
        const token = localStorage.getItem('token');
        const cleanId = (editId && editId !== 'null') ? editId : null;
        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ id: cleanId, type: currentFormType || user?.initialForm || 'Documento', data: formData })
            });
            if (response.status === 401) { localStorage.clear(); return navigate('/'); }
            if (response.ok) { 
                showToast('Documento guardado con éxito', 'success');
                setTimeout(() => { navigate('/dashboard'); setStep(1); fetchData(); }, 1500);
            } else { 
                const errData = await response.json(); 
                showToast(errData.msg || 'Error técnico al procesar el guardado'); 
            }
        } catch (error) { showToast('Falla de conexión con el servidor central'); } finally { setSaving(false); }
    };

    const saveDynamicForm = async (dataToSave) => {
        setSaving(true);
        const token = localStorage.getItem('token');
        const cleanId = (editId && editId !== 'null') ? editId : null;
        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ id: cleanId, type: currentFormType || user?.initialForm || 'Documento', data: dataToSave })
            });
            if (response.status === 401) { localStorage.clear(); return navigate('/'); }
            if (response.ok) { 
                showToast('Documento guardado con éxito', 'success');
                setTimeout(() => { navigate('/dashboard'); setStep(1); fetchData(); }, 1500);
            } else { 
                const errData = await response.json(); 
                showToast(errData.msg || 'Error técnico al procesar el guardado'); 
            }
        } catch (error) { showToast('Falla de conexión con el servidor central'); } finally { setSaving(false); }
    };

    const confirmDelete = (id) => {
        setModal({
            show: true,
            msg: '¿Está seguro de que desea eliminar permanentemente este registro?',
            onConfirm: () => handleDelete(id)
        });
    };

    const handleDelete = async (id) => {
        setModal({ ...modal, show: false });
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
            if (response.status === 401) { localStorage.clear(); return navigate('/'); }
            if (response.ok) {
                showToast('Registro eliminado con éxito', 'success');
                fetchData();
            }
        } catch (e) { showToast('No se pudo procesar la eliminación'); }
    };
    const handleDownloadPDF = async (doc) => {
        const id = doc.id;
        const token = localStorage.getItem('token');
        const normType = doc.type ? doc.type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
        const isCorp = normType.includes('corporacion') || normType.includes('corporativos');

        showToast('Generando Fiel Copia...', 'success');

        // SI ES CORPORACIÓN, USAMOS EL MOTOR DINÁMICO DE ALTA FIDELIDAD (FRONTEND)
        if (isCorp) {
            try {
                // Obtenemos los datos frescos si no los tenemos
                const response = await fetch(`${API_BASE_URL}/api/forms/${id}`, { headers: { 'x-auth-token': token } });
                const result = await response.json();
                const dataForPdf = result.data;
                
                setPdfData(dataForPdf);
                
                // Esperamos al render y disparamos captura
                setTimeout(() => {
                    const element = pdfRef.current;
                    if (!element) return showToast('Error al inicializar motor dinámico');

                    const safeId = doc.userUniqueCode ? doc.userUniqueCode : id.substring(0, 8);
                    const opt = {
                        margin: 0,
                        filename: `PTLC_${safeId}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { 
                            scale: 3, 
                            useCORS: true, 
                            logging: false,
                            width: 794 // A4 exact width to avoid distortion
                        },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().set(opt).from(element).save().then(() => {
                        setPdfData(null);
                        showToast('Descarga completada', 'success');
                    });
                }, 500);
            } catch (e) {
                showToast('Error en motor dinámico de PDF');
            }
            return;
        }

        // OTROS FORMULARIOS: USAN EL MOTOR DEL SERVIDOR (BACKEND)
        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/generate-pdf/${id}`, {
                headers: { 'x-auth-token': token }
            });
            if (response.ok) {
                let prefix = 'DOC';
                if (normType.includes('fondos')) prefix = 'SFAR';
                else if (normType.includes('fundacion')) prefix = 'PTLF';
                else if (normType.includes('cumplimiento individual')) prefix = 'KYCI';
                else if (normType.includes('cumplimiento entidades')) prefix = 'KYCE';

                const safeId = doc.userUniqueCode ? doc.userUniqueCode : id.toString().substring(0, 8);
                const filename = `${prefix}_${safeId}.pdf`;

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            } else {
                const errData = await response.json().catch(() => ({}));
                showToast(errData.msg || 'Error al generar el PDF. Verifique la conexión.');
            }
        } catch (e) {
            showToast('Falla de conexión al generar PDF');
        }
    };

    // LÓGICA DE FILTRADO
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.type.toLowerCase().includes(searchTerm.toLowerCase());
        const docDate = new Date(doc.date).toISOString().split('T')[0];
        const matchesDate = !dateFilter || docDate === dateFilter;
        return matchesSearch && matchesDate;
    });

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>Sincronizando sistema...</div>;

    return (
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', fontFamily: "'Inter', sans-serif", color: TEXT, position: 'relative' }}>
            
            {/* MODAL DE CONFIRMACIÓN UX-UI */}
            {modal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: RADIUS_LG, maxWidth: '400px', width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
                        <div style={{ color: PRIMARY, marginBottom: '15px' }}><Info size={32} /></div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '15px', color: '#1e293b' }}>Confirmar Acción</h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '25px', lineHeight: 1.5 }}>{modal.msg}</p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setModal({ ...modal, show: false })} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>CANCELAR</button>
                            <button onClick={modal.onConfirm} style={{ flex: 1, padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>ELIMINAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST SYSTEM (PROFESSIONAL UX) */}
            {toast.show && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', background: 'white', padding: '15px 25px', borderRadius: RADIUS, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12, zIndex: 3000, borderLeft: `5px solid ${toast.type === 'error' ? '#dc2626' : '#16a34a'}`, animation: 'slideIn 0.3s ease-out' }}>
                    {toast.type === 'error' ? <AlertCircle size={20} color="#dc2626" /> : <Check size={20} color="#16a34a" />}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{toast.msg}</span>
                    <button onClick={() => setToast({ ...toast, show: false })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
                </div>
            )}

            <aside style={{ width: '230px', background: PRIMARY, color: 'white', padding: '25px 15px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '40px', padding: '0 10px' }}>
                    <Shield size={20} color="white" />
                    <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px' }}>NEXUSDOC DMS</span>
                </div>
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div onClick={() => { navigate('/dashboard'); setCurrentFormType(''); setStep(1); setFormData(EMPTY_FORM); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', background: !showForm ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: RADIUS, cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                        <LayoutGrid size={15} /> <span>ESCRITORIO</span>
                    </div>
                    <div onClick={() => { navigate('/dashboard?view=form'); setCurrentFormType(''); setStep(1); setFormData(EMPTY_FORM); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', background: showForm ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: RADIUS, cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                        <Plus size={15} /> <span>NUEVO TRÁMITE</span>
                    </div>
                    <div onClick={() => { navigate('/dashboard?view=documents'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', background: showDocuments ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: RADIUS, cursor: 'pointer', fontWeight: 600, fontSize: '12px', marginTop: '15px' }}>
                        <UploadCloud size={15} /> <span>MIS DOCUMENTOS</span>
                    </div>
                    <div onClick={() => { navigate('/dashboard?view=signed-docs'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', background: showSignedDocs ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: RADIUS, cursor: 'pointer', fontWeight: 600, fontSize: '12px', marginTop: '5px' }}>
                        <Check size={15} /> <span>DOC. FIRMADOS</span>
                    </div>
                    <div onClick={() => navigate('/tutorial')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', background: 'transparent', borderRadius: RADIUS, cursor: 'pointer', fontWeight: 600, fontSize: '12px', marginTop: '15px' }}>
                        <BookOpen size={15} /> <span>AYUDA Y TUTORIAL</span>
                    </div>
                </nav>
                <button onClick={() => { localStorage.clear(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '11px', borderRadius: RADIUS }}>
                    <LogOut size={15} /> SALIR
                </button>
            </aside>

            <main style={{ flex: 1, padding: '35px 45px', overflowY: 'auto' }}>
                {showSignedDocs ? (
                    <SignedDocuments />
                ) : showDocuments ? (
                    <UserDocuments />
                ) : !showForm ? (
                    <div style={{ maxWidth: '900px' }}>
                        <div style={{ background: PRIMARY, borderRadius: RADIUS_LG, padding: '30px 35px', color: 'white', marginBottom: '35px', boxShadow: '0 10px 25px rgba(0, 120, 212, 0.1)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Portal del Cliente</span>
                                <h1 style={{ color: 'white', marginTop: '5px', marginBottom: '18px' }}>Bienvenido, {user?.name}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: RADIUS, padding: '12px 18px', border: '1px solid rgba(255,255,255,0.2)', display: 'inline-block' }}>
                                        <div style={{ fontSize: '9px', fontWeight: 800, opacity: 0.9, marginBottom: '3px' }}>TRÁMITE ASIGNADO:</div>
                                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{user?.initialForm || 'No asignado'}</div>
                                    </div>
                                    {user?.initialForm && (
                                        <button 
                                            onClick={() => { setCurrentFormType(user.initialForm); navigate(`/dashboard?view=form&type=${user.initialForm}`); }} 
                                            style={{ 
                                                padding: '12px 24px', background: 'white', color: PRIMARY, border: 'none', 
                                                borderRadius: RADIUS, fontWeight: 800, fontSize: '13px', cursor: 'pointer', 
                                                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                                                transition: 'transform 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            CONTINUAR CON EL TRÁMITE <Plus size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* BARRA DE FILTROS UX-UI */}
                        <div style={{ display: 'flex', gap: 15, marginBottom: '25px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input placeholder="Buscar por tipo de documento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: '13px', outline: 'none' }} />
                            </div>
                            <div style={{ width: '200px', position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: '13px', outline: 'none' }} />
                            </div>
                        </div>
                        
                        <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ padding: '18px 25px', borderBottom: `1px solid ${BORDER}`, background: '#fcfcfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ color: '#444' }}>TRÁMITES REGISTRADOS</h2>
                                <span style={{ background: '#eef6ff', color: PRIMARY, padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>{filteredDocuments.length} RESULTADOS</span>
                            </div>
                            {filteredDocuments.length === 0 ? <div style={{ padding: '50px', textAlign: 'center', color: '#999', fontSize: '13px' }}>No se encontraron registros que coincidan con los filtros.</div> : filteredDocuments.map(doc => (
                                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', padding: '15px 25px', borderBottom: `1px solid ${BORDER}` }}>
                                    <FileText size={16} color={PRIMARY} style={{ marginRight: 15 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{doc.type}</div>
                                        {/* FECHA Y HORA EXACTA (INGENIERO PROTOCOL) */}
                                        <div style={{ fontSize: '11px', color: '#666', display: 'flex', gap: 10, marginTop: 2 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(doc.date).toLocaleDateString()}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(doc.date).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => handleDownloadPDF(doc)} style={{ padding: '8px', background: '#eef6ff', border: `1px solid ${PRIMARY}`, borderRadius: RADIUS, color: PRIMARY, cursor: 'pointer', transition: 'all 0.2s' }} title="Descargar Documento PDF" onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={(e) => e.currentTarget.style.background = '#eef6ff'}>
                                            <Download size={16} />
                                        </button>
                                        <button onClick={() => navigate(`/dashboard?view=form&id=${doc.id}`)} style={{ padding: '8px', background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: RADIUS, color: '#16a34a', cursor: 'pointer', transition: 'all 0.2s' }} title="Editar este trámite" onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'} onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}>
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => confirmDelete(doc.id)} style={{ padding: '8px', background: '#fef2f2', border: '1px solid #dc2626', borderRadius: RADIUS, color: '#dc2626', cursor: 'pointer', transition: 'all 0.2s' }} title="Eliminar registro permanentemente" onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !currentFormType ? (
                    <div style={{ maxWidth: '900px' }}>
                        <h1 style={{ marginBottom: '25px', color: '#1e293b' }}>Seleccione el tipo de trámite</h1>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                          {formOptions.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => { setCurrentFormType(opt.id); navigate(`/dashboard?view=form&type=${opt.id}`); }}
                              style={{
                                padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px',
                                cursor: 'pointer', transition: 'all 0.2s', border: '1px solid #e2e8f0', background: 'white',
                                borderRadius: RADIUS_LG, outline: 'none'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.borderColor = opt.color; e.currentTarget.style.boxShadow = `0 10px 15px -3px ${opt.color}20`; }}
                              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              <div style={{ background: `${opt.color}15`, color: opt.color, width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {opt.icon}
                              </div>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                    </div>
                ) : currentFormType === 'Fondos Registros contables' ? (
                    <div style={{ maxWidth: '800px' }}>
                        <h1 style={{ marginBottom: '25px' }}>{currentFormType}</h1>
                        <form onSubmit={handleSaveForm} style={{ background: 'white', padding: '35px', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: PRIMARY, letterSpacing: '1px' }}>ESTADO DEL REGISTRO</span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>PASO {step} DE 3</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 35 }}>
                                {[1,2,3].map(s => (
                                    <div key={s} style={{ flex: 1, height: '4px', background: step >= s ? PRIMARY : '#f1f5f9', borderRadius: '10px' }}></div>
                                ))}
                            </div>
                            {step === 1 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        <div className="field-group"><label>NOMBRE COMPAÑÍA</label><input className="input-expert" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required /></div>
                                        <div className="field-group"><label>PAÍS / JURISDICCIÓN</label><input className="input-expert" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} required /></div>
                                    </div>
                                    <div className="field-group"><label>OBJETO SOCIAL / ACTIVIDADES</label><textarea className="input-expert" rows={2} value={formData.activities} onChange={e => setFormData({...formData, activities: e.target.value})} required /></div>
                                    <div className="field-group"><label>NOMBRE DEL BENEFICIARIO FINAL</label><input className="input-expert" value={formData.beneficiaryName} onChange={e => setFormData({...formData, beneficiaryName: e.target.value})} required /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        <div className="field-group"><label>FECHA DE NACIMIENTO</label><input type="date" className="input-expert" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} required /></div>
                                        <div className="field-group"><label>LUGAR DE NACIMIENTO</label><input className="input-expert" value={formData.birthPlace} onChange={e => setFormData({...formData, birthPlace: e.target.value})} required /></div>
                                    </div>
                                    <div className="field-group"><label>DIRECCIÓN COMPLETA</label><input className="input-expert" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required /></div>
                                    <button type="button" onClick={() => validateStep(1) && setStep(2)} style={{ padding: '12px 30px', background: PRIMARY, color: 'white', border: 'none', borderRadius: RADIUS, fontWeight: 700, alignSelf: 'flex-end', cursor: 'pointer', fontSize: '13px' }}>CONTINUAR</button>
                                </div>
                            )}
                            {step === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <h3>PROCEDENCIA DE LOS FONDOS</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        {['Bienes personales', 'Inversiones Financieras', 'Negocios', 'Prestamos', 'Herencia o Fondo Fiduciario'].map(f => (
                                            <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '12px', padding: '10px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={formData.fundsSource.includes(f)} onChange={() => {
                                                    const updated = formData.fundsSource.includes(f) ? formData.fundsSource.filter(x => x !== f) : [...formData.fundsSource, f];
                                                    setFormData({...formData, fundsSource: updated});
                                                }} /> {f}
                                            </label>
                                        ))}
                                    </div>
                                    <div className="field-group"><label>OTRAS FUENTES (ESPECIFIQUE)</label><input className="input-expert" value={formData.fundsOther} onChange={e => setFormData({...formData, fundsOther: e.target.value})} placeholder="Obligatorio si aplica..." /></div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                        <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>ATRÁS</button>
                                        <button type="button" onClick={() => validateStep(2) && setStep(3)} style={{ flex: 1, padding: '12px', background: PRIMARY, color: 'white', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>CONTINUAR</button>
                                    </div>
                                </div>
                            )}
                            {step === 3 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        <div className="field-group"><label>NOMBRE DEL CUSTODIO</label><input className="input-expert" value={formData.custodyName} onChange={e => setFormData({...formData, custodyName: e.target.value})} required /></div>
                                        <div className="field-group"><label>TELÉFONO DE CONTACTO</label><input type="text" className="input-expert" value={formData.custodyPhone} onChange={e => setFormData({...formData, custodyPhone: e.target.value.replace(/\D/g,'')})} required /></div>
                                    </div>
                                    <div className="field-group"><label>EMAIL DE CUSTODIA</label><input type="email" className="input-expert" value={formData.custodyEmail} onChange={e => setFormData({...formData, custodyEmail: e.target.value})} required placeholder="ejemplo@correo.com" /></div>
                                    <div className="field-group"><label>DIRECCIÓN DE ALMACENAMIENTO</label><input className="input-expert" value={formData.custodyAddress} onChange={e => setFormData({...formData, custodyAddress: e.target.value})} required /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        <div className="field-group"><label>NOMBRE DEL FIRMANTE</label><input className="input-expert" value={formData.signerName} onChange={e => setFormData({...formData, signerName: e.target.value})} required /></div>
                                        <div className="field-group"><label>FECHA DE REGISTRO</label><input type="date" className="input-expert" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required /></div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                        <button type="button" onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>ATRÁS</button>
                                        <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: PRIMARY, color: 'white', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px', opacity: saving ? 0.7 : 1 }}>
                                            {saving ? 'GUARDANDO...' : 'FINALIZAR Y GUARDAR'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                ) : currentFormType.startsWith('Corporaci') ? (
                    <CorporacionForm 
                        initialData={formData} 
                        onSave={saveDynamicForm} 
                        saving={saving} 
                    />
                ) : (
                    <div style={{ maxWidth: '800px', textAlign: 'center', padding: '50px', background: 'white', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG }}>
                        <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: PRIMARY }}>
                            <Construction size={40} />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '15px' }}>Formulario en Construcción</h2>
                        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, marginBottom: '30px', maxWidth: '400px', margin: '0 auto 30px' }}>
                            El formulario interactivo para <strong>{currentFormType}</strong> se encuentra en desarrollo y pronto estará disponible en el sistema.
                        </p>
                        <button onClick={() => { setCurrentFormType(''); navigate('/dashboard?view=form'); }} style={{ padding: '12px 25px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                            Elegir otro trámite
                        </button>
                    </div>
                )}
            </main>
            <style>{`
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .field-group { display: flex; flex-direction: column; gap: 4px; } 
                .field-group label { font-size: 10px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; } 
                .input-expert { width: 100%; padding: 10px 14px; border: 1.5px solid ${BORDER}; border-radius: ${RADIUS}; outline: none; font-size: 13px; } 
            `}</style>

            {/* MOTOR DINÁMICO OCULTO PARA DESCARGAS (BLINDAJE TOTAL) */}
            {pdfData && (
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '794px' }}>
                    <div ref={pdfRef}>
                        <CorporacionPreview data={pdfData} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDashboard;
