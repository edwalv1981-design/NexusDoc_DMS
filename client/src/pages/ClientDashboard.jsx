import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    FileText, Clock, User as UserIcon, LogOut, 
    Trash2, Plus, LayoutGrid, Shield, Check, AlertCircle, X, Info, Search, Calendar, Download, Building, Heart, ShieldAlert, ClipboardList, Construction, Edit, IdCard, FileStack
} from 'lucide-react';
import API_BASE_URL from '../config';
import { getFormTypeLabel } from '../formTypes';
import { useLang, useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import UserDocuments from './UserDocuments';
import SignedDocuments from './SignedDocuments';
import CorporacionForm from './CorporacionForm';
import FundacionForm from './FundacionForm';
import CumplimientoIndividualForm from './CumplimientoIndividualForm';
import CumplimientoEntidadesForm from './CumplimientoEntidadesForm';
import PdfSchemaWizard from '../components/PdfSchemaWizard';
import {
  resolveCanonicalFormType,
  usesSchemaWizard,
  usesFondosWizard,
  isKyciFormType,
  isKyceFormType,
} from '../utils/formWizardRouting';
import { validateField, validateFields } from '../utils/fieldValidators';

const ClientDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { lang } = useLang();
    const t = useT();
    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('id');
    const showForm = queryParams.get('view') === 'form';
    const showDocuments = queryParams.get('view') === 'documents';
    const showSignedDocs = queryParams.get('view') === 'signed-docs';
    const formTypeQuery = queryParams.get('type');
    const normalizedFormTypeQuery = formTypeQuery ? resolveCanonicalFormType(formTypeQuery) : '';

    const [currentFormType, setCurrentFormType] = useState(normalizedFormTypeQuery || '');

    const PRIMARY = '#0f766e';
    const BG = '#f8fafc';
    const TEXT = '#1e293b';
    const BORDER = '#e2e8f0';
    const RADIUS = '8px';
    const RADIUS_LG = '16px';

    const [user, setUser] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedDocs, setExpandedDocs] = useState({});
    
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [toast, setToast] = useState({ show: false, msg: '', type: 'error' });
    const [modal, setModal] = useState({ show: false, msg: '', onConfirm: null });

    const [templateStatus, setTemplateStatus] = useState(null);
    const [templateStatusLoading, setTemplateStatusLoading] = useState(false);
    const [step, setStep] = useState(1);
    const EMPTY_FORM = {
        companyName: '', activities: '', country: '', beneficiaryName: '',
        birthDate: '', birthPlace: '', address: '', fundsSource: [],
        fundsOther: '', custodyName: '', custodyPhone: '', custodyEmail: '',
        custodyAddress: '', signerName: '', date: new Date().toISOString().split('T')[0]
    };
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});

    const handleFieldBlur = (fieldName) => {
        const error = validateField(fieldName, formData[fieldName]);
        setFieldErrors(prev => {
            const next = { ...prev };
            if (error) next[fieldName] = error;
            else delete next[fieldName];
            return next;
        });
    };

    const getFieldErrorStyle = (fieldName) => fieldErrors[fieldName] ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #fecaca' } : {};

    const handleFieldChange = (fieldName, value) => {
        if (fieldErrors[fieldName]) {
            const err = validateField(fieldName, value);
            if (!err) setFieldErrors(prev => { const next = {...prev}; delete next[fieldName]; return next; });
        }
    };

    const [beneficiarySuggestions, setBeneficiarySuggestions] = useState([]);
    const [beneficiaryLoading, setBeneficiaryLoading] = useState(false);
    const [showBeneficiaryDropdown, setShowBeneficiaryDropdown] = useState(false);
    const beneficiaryRef = useRef(null);
    const beneficiaryTimerRef = useRef(null);

    const searchBeneficiaries = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setBeneficiarySuggestions([]);
            setShowBeneficiaryDropdown(false);
            return;
        }
        setBeneficiaryLoading(true);
        setShowBeneficiaryDropdown(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/api/forms/beneficiaries/search?q=${encodeURIComponent(query)}`,
                { headers: { 'x-auth-token': token } }
            );
            if (res.ok) {
                const data = await res.json();
                setBeneficiarySuggestions(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setBeneficiaryLoading(false);
        }
    }, []);

    const handleBeneficiaryChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, beneficiaryName: val }));
        handleFieldChange('beneficiaryName', val);
        if (beneficiaryTimerRef.current) clearTimeout(beneficiaryTimerRef.current);
        beneficiaryTimerRef.current = setTimeout(() => searchBeneficiaries(val), 300);
    };

    const handleBeneficiarySelect = (item) => {
        setFormData(prev => {
            const updates = { beneficiaryName: item.beneficiaryName };
            if (item.birthDate) updates.birthDate = item.birthDate;
            if (item.birthPlace) updates.birthPlace = item.birthPlace;
            if (item.address) updates.address = item.address;
            return { ...prev, ...updates };
        });
        setShowBeneficiaryDropdown(false);
        setBeneficiarySuggestions([]);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (beneficiaryRef.current && !beneficiaryRef.current.contains(e.target)) {
                setShowBeneficiaryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const goToFondosStep = (nextStep) => {
        setStep(nextStep);
    };

    const formOptions = [
        { id: 'Fondos Registros contables', label: getFormTypeLabel('Fondos Registros contables', lang), icon: <ClipboardList size={24} />, color: '#6366f1' },
        { id: 'Corporación', label: getFormTypeLabel('Corporación', lang), icon: <Building size={24} />, color: '#10b981' },
        { id: 'Fundaciones', label: getFormTypeLabel('Fundaciones', lang), icon: <Heart size={24} />, color: '#ef4444' },
        { id: 'Cumplimiento Individual', label: getFormTypeLabel('Cumplimiento Individual', lang), icon: <UserIcon size={24} />, color: '#f59e0b' },
        { id: 'Cumplimiento Entidades', label: getFormTypeLabel('Cumplimiento Entidades', lang), icon: <ShieldAlert size={24} />, color: '#3b82f6' },
    ];
    
    if (templateStatus) {
        Object.keys(templateStatus).forEach(key => {
            if (templateStatus[key] && !formOptions.some(f => f.id === key)) {
                formOptions.push({
                    id: key,
                    label: key.replace(/_/g, ' ').toUpperCase(),
                    icon: <ClipboardList size={24} />,
                    color: '#8b5cf6'
                });
            }
        });
    }

    const fetchTemplateStatus = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setTemplateStatusLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/templates/status`, {
                headers: { 'x-auth-token': token },
            });
            if (response.status === 401) {
                localStorage.clear();
                navigate('/');
                return;
            }
            if (response.ok) {
                setTemplateStatus(await response.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTemplateStatusLoading(false);
        }
    }, [navigate]);

    const isHtmlFormType = (type) =>
        type?.startsWith('Corporaci') || type === 'Fundaciones' || type === 'Cumplimiento Individual' || type === 'Cumplimiento Entidades';

    const isFormReady = (type) => {
        if (!type) return true;
        if (isHtmlFormType(type)) return true;
        if (!templateStatus) return null;
        return Boolean(templateStatus[type]);
    };

    useEffect(() => {
        fetchData();
        if (editId) fetchFormData(editId);
        if (formTypeQuery) setCurrentFormType(resolveCanonicalFormType(formTypeQuery));
    }, [editId, formTypeQuery]);

    useEffect(() => {
        if (showForm) fetchTemplateStatus();
    }, [showForm, fetchTemplateStatus]);

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
                if (result.type) setCurrentFormType(resolveCanonicalFormType(result.type));
            }
        } catch (e) { console.error(e); }
    };

    const validateStep = (currentStep) => {
        if (currentStep === 1) {
            const { companyName, activities, country, beneficiaryName, birthDate, birthPlace, address } = formData;
            if (!companyName || !activities || !country || !beneficiaryName || !birthDate || !birthPlace || !address) {
                showToast(t('toast.completeStep1'));
                return false;
            }
        }
        if (currentStep === 2) {
            if (formData.fundsSource.length === 0) {
                showToast(t('toast.atLeastOneFundsSource'));
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
            return showToast(t('toast.completeStep3'));
        }

        const allFields = ['companyName', 'country', 'activities', 'beneficiaryName', 'birthDate', 'birthPlace', 'address', 'custodyName', 'custodyPhone', 'custodyEmail', 'custodyAddress', 'signerName', 'date'];
        if (formData.fundsOther) allFields.push('fundsOther');
        const fieldErrs = validateFields(formData, allFields);
        if (Object.keys(fieldErrs).length > 0) {
            setFieldErrors(fieldErrs);
            showToast('Corrige los campos marcados antes de guardar');
            return;
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
                showToast(t('toast.savedOk'), 'success');
                setTimeout(() => { navigate('/dashboard'); setStep(1); fetchData(); }, 1500);
            } else { 
                const errData = await response.json(); 
                showToast(errData.msg || t('toast.saveError')); 
            }
        } catch (error) { showToast(t('toast.connectionFailure')); } finally { setSaving(false); }
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
                showToast(t('toast.savedOk'), 'success');
                setTimeout(() => { navigate('/dashboard'); setStep(1); fetchData(); }, 1500);
            } else { 
                const errData = await response.json(); 
                showToast(errData.msg || t('toast.saveError')); 
            }
        } catch (error) { showToast(t('toast.connectionFailure')); } finally { setSaving(false); }
    };

    const confirmDelete = (id) => {
        setModal({
            show: true,
            msg: t('modal.confirmDelete'),
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
                showToast(t('toast.deletedOk'), 'success');
                fetchData();
            }
        } catch (e) { showToast(t('toast.deleteError')); }
    };
    const handleDownloadPDF = async (doc) => {
        const id = doc.id;
        const token = localStorage.getItem('token');
        const normType = doc.type ? doc.type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';

        showToast(t('toast.generatingFile'), 'success');

        try {
            const response = await fetch(`${API_BASE_URL}/api/forms/generate-pdf/${id}`, {
                headers: { 'x-auth-token': token }
            });
            if (response.ok) {
                let prefix = 'DOC';
                if (normType.includes('fondos')) prefix = 'SFAR';
                else if (normType.includes('corporacion') || normType.includes('corporativos')) prefix = 'PTLC';
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
                showToast(errData.msg || t('toast.pdfError'));
            }
        } catch (e) {
            showToast(t('toast.pdfConnectionFailure'));
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.type.toLowerCase().includes(searchTerm.toLowerCase());
        const docDate = new Date(doc.date).toISOString().split('T')[0];
        const matchesDate = !dateFilter || docDate === dateFilter;
        return matchesSearch && matchesDate;
    });

    // Grouping logic for versions
    const groupedDocuments = {};
    filteredDocuments.forEach(doc => {
        const key = doc.parentId || doc.id;
        if (!groupedDocuments[key]) groupedDocuments[key] = [];
        groupedDocuments[key].push(doc);
    });

    Object.keys(groupedDocuments).forEach(key => {
        groupedDocuments[key].sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    const groupsArray = Object.values(groupedDocuments).sort((a, b) => new Date(b[0].date) - new Date(a[0].date));

    const toggleExpand = (parentId) => {
        setExpandedDocs(prev => ({ ...prev, [parentId]: !prev[parentId] }));
    };

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>{t('dashboard.syncing')}</div>;

    return (
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', fontFamily: "'Inter', sans-serif", color: TEXT, position: 'relative' }}>
            
            
            {modal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: RADIUS_LG, maxWidth: '400px', width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
                        <div style={{ color: PRIMARY, marginBottom: '15px' }}><Info size={32} /></div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '15px', color: '#1e293b' }}>{t('modal.confirmAction')}</h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '25px', lineHeight: 1.5 }}>{modal.msg}</p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setModal({ ...modal, show: false })} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>{t('modal.cancel')}</button>
                            <button onClick={modal.onConfirm} style={{ flex: 1, padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>{t('modal.delete')}</button>
                        </div>
                    </div>
                </div>
            )}

            
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
                        <LayoutGrid size={15} /> <span>{t('sidebar.desktop')}</span>
                    </div>
                    <div onClick={() => { navigate('/dashboard?view=form'); setCurrentFormType(''); setStep(1); setFormData(EMPTY_FORM); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', background: showForm ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: RADIUS, cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                        <Plus size={15} /> <span>{t('sidebar.newProcess')}</span>
                    </div>
                    <div onClick={() => { navigate('/dashboard?view=documents'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', background: showDocuments ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: RADIUS, cursor: 'pointer', fontWeight: 600, fontSize: '12px', marginTop: '15px' }}>
                        <IdCard size={15} /> <span>{t('sidebar.myDocs')}</span>
                    </div>
                    <div onClick={() => { navigate('/dashboard?view=signed-docs'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', background: showSignedDocs ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: RADIUS, cursor: 'pointer', fontWeight: 600, fontSize: '12px', marginTop: '5px' }}>
                        <FileStack size={15} /> <span>{t('sidebar.signedDocs')}</span>
                    </div>
                </nav>
                <LanguageSwitcher variant="sidebar" />
                <button onClick={() => { localStorage.clear(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '11px', borderRadius: RADIUS, marginTop: 10 }}>
                    <LogOut size={15} /> {t('sidebar.logout')}
                </button>
            </aside>

            <main style={{ flex: 1, padding: '35px 45px', overflowY: 'auto' }}>
              <div className="form-content-frame">
                {showSignedDocs ? (
                    <SignedDocuments />
                ) : showDocuments ? (
                    <UserDocuments />
                ) : !showForm ? (
                    <div>
                        <div style={{ background: PRIMARY, borderRadius: RADIUS_LG, padding: '30px 35px', color: 'white', marginBottom: '35px', boxShadow: '0 10px 25px rgba(0, 120, 212, 0.1)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('dashboard.clientPortal')}</span>
                                <h1 style={{ color: 'white', marginTop: '5px', marginBottom: '18px' }}>{t('dashboard.welcome', { name: user?.name || '' })}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: RADIUS, padding: '12px 18px', border: '1px solid rgba(255,255,255,0.2)', display: 'inline-block' }}>
                                        <div style={{ fontSize: '9px', fontWeight: 800, opacity: 0.9, marginBottom: '3px' }}>{t('dashboard.assignedProcess')}</div>
                                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{user?.initialForm ? getFormTypeLabel(user.initialForm, lang) : t('dashboard.notAssigned')}</div>
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
                                            {t('dashboard.continueProcess')} <Plus size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        
                        <div style={{ display: 'flex', gap: 15, marginBottom: '25px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input placeholder={t('dashboard.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: '13px', outline: 'none' }} />
                            </div>
                            <div style={{ width: '200px', position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: '13px', outline: 'none' }} />
                            </div>
                        </div>
                        
                        <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ padding: '18px 25px', borderBottom: `1px solid ${BORDER}`, background: '#fcfcfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ color: '#444' }}>{t('dashboard.registeredProcesses')}</h2>
                                <span style={{ background: '#eef6ff', color: PRIMARY, padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>{t('dashboard.resultsCount', { n: groupsArray.length })}</span>
                            </div>
                            {groupsArray.length === 0 ? <div style={{ padding: '50px', textAlign: 'center', color: '#999', fontSize: '13px' }}>{t('dashboard.noResults')}</div> : groupsArray.map(group => {
                                const mainDoc = group[0];
                                const hasHistory = group.length > 1;
                                const isExpanded = expandedDocs[mainDoc.parentId || mainDoc.id];
                                
                                return (
                                <div key={mainDoc.parentId || mainDoc.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '15px 25px', background: isExpanded ? '#f8fafc' : 'white' }}>
                                        <FileText size={16} color={PRIMARY} style={{ marginRight: 15 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {getFormTypeLabel(mainDoc.type, lang)}
                                                <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>v{mainDoc.version || 1} (Actual)</span>
                                            </div>
                                            
                                            <div style={{ fontSize: '11px', color: '#666', display: 'flex', gap: 10, marginTop: 4 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(mainDoc.date).toLocaleDateString()}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(mainDoc.date).toLocaleTimeString()}</span>
                                                {hasHistory && (
                                                    <span 
                                                        onClick={() => toggleExpand(mainDoc.parentId || mainDoc.id)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: PRIMARY, cursor: 'pointer', fontWeight: 600, marginLeft: 10 }}
                                                    >
                                                        {isExpanded ? 'Ocultar Historial' : `Ver Historial (${group.length - 1} versiones)`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => handleDownloadPDF(mainDoc)} style={{ padding: '8px', background: '#eef6ff', border: `1px solid ${PRIMARY}`, borderRadius: RADIUS, color: PRIMARY, cursor: 'pointer', transition: 'all 0.2s' }} title={t('common.download')} onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={(e) => e.currentTarget.style.background = '#eef6ff'}>
                                                <Download size={16} />
                                            </button>
                                            <button onClick={() => navigate(`/dashboard?view=form&id=${mainDoc.id}`)} style={{ padding: '8px', background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: RADIUS, color: '#16a34a', cursor: 'pointer', transition: 'all 0.2s' }} title={t('common.editProcess')} onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'} onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}>
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => confirmDelete(mainDoc.id)} style={{ padding: '8px', background: '#fef2f2', border: '1px solid #dc2626', borderRadius: RADIUS, color: '#dc2626', cursor: 'pointer', transition: 'all 0.2s' }} title={t('common.deletePermanent')} onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {isExpanded && hasHistory && (
                                        <div style={{ background: '#f8fafc', padding: '0 25px 15px 45px', borderTop: `1px dashed ${BORDER}` }}>
                                            {group.slice(1).map(histDoc => (
                                                <div key={histDoc.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid rgba(0,0,0,0.05)` }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            Versión {histDoc.version || 1}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', gap: 10, marginTop: 2 }}>
                                                            <span><Calendar size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }}/> {new Date(histDoc.date).toLocaleDateString()}</span>
                                                            <span><Clock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }}/> {new Date(histDoc.date).toLocaleTimeString()}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={() => handleDownloadPDF(histDoc)} style={{ padding: '5px 8px', background: 'white', border: `1px solid #cbd5e1`, borderRadius: RADIUS, color: '#475569', cursor: 'pointer', fontSize: '11px' }} title={t('common.download')}>
                                                            <Download size={12} />
                                                        </button>
                                                        <button onClick={() => navigate(`/dashboard?view=form&id=${histDoc.id}`)} style={{ padding: '5px 8px', background: 'white', border: `1px solid #cbd5e1`, borderRadius: RADIUS, color: '#475569', cursor: 'pointer', fontSize: '11px' }} title={t('common.editProcess')}>
                                                            <Edit size={12} />
                                                        </button>
                                                        <button onClick={() => confirmDelete(histDoc.id)} style={{ padding: '5px 8px', background: 'white', border: `1px solid #cbd5e1`, borderRadius: RADIUS, color: '#ef4444', cursor: 'pointer', fontSize: '11px' }} title={t('common.deletePermanent')}>
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    </div>
                ) : !currentFormType ? (
                    <div>
                        <h1 style={{ marginBottom: '25px', color: '#1e293b' }}>{t('dashboard.selectType')}</h1>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                          {formOptions.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => { setCurrentFormType(resolveCanonicalFormType(opt.id)); navigate(`/dashboard?view=form&type=${encodeURIComponent(opt.id)}`); }}
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
                ) : templateStatusLoading && currentFormType && !isHtmlFormType(currentFormType) ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }} aria-busy="true">
                        <p>{t('dashboard.syncing')}</p>
                    </div>
                ) : usesSchemaWizard(currentFormType) && isFormReady(currentFormType) ? (
                    <div>
                        <h1 style={{ marginBottom: '25px' }}>{getFormTypeLabel(currentFormType, lang)}</h1>
                        <PdfSchemaWizard
                            formType={currentFormType}
                            initialData={formData}
                            onSave={saveDynamicForm}
                            saving={saving}
                            onValidationError={(msg) => showToast(msg)}
                        />
                    </div>
                ) : usesFondosWizard(currentFormType) && isFormReady(currentFormType) ? (
                    <div>
                        <h1 style={{ marginBottom: '25px' }}>{getFormTypeLabel(currentFormType, lang)}</h1>
                        <form onSubmit={handleSaveForm} style={{ background: 'white', padding: '35px', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: PRIMARY, letterSpacing: '1px' }}>{t('dashboard.recordState')}</span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{t('dashboard.stepOf', { step, total: 3 })}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 35 }}>
                                {[1,2,3].map(s => (
                                    <div key={s} style={{ flex: 1, height: '4px', background: step >= s ? PRIMARY : '#f1f5f9', borderRadius: '10px' }}></div>
                                ))}
                            </div>
                            {step === 1 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        <div className="field-group"><label>{t('fondos.companyName')}</label><input className="input-expert" style={getFieldErrorStyle('companyName')} value={formData.companyName} onChange={e => { setFormData({...formData, companyName: e.target.value}); handleFieldChange('companyName', e.target.value); }} onBlur={() => handleFieldBlur('companyName')} required />{fieldErrors.companyName && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.companyName}</span>}</div>
                                        <div className="field-group"><label>{t('fondos.country')}</label><input className="input-expert" style={getFieldErrorStyle('country')} value={formData.country} onChange={e => { setFormData({...formData, country: e.target.value}); handleFieldChange('country', e.target.value); }} onBlur={() => handleFieldBlur('country')} required />{fieldErrors.country && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.country}</span>}</div>
                                    </div>
                                    <div className="field-group"><label>{t('fondos.operatingAddress') || 'Dirección de operaciones'}</label><input className="input-expert" style={getFieldErrorStyle('operatingAddress')} value={formData.operatingAddress || ''} onChange={e => { setFormData({...formData, operatingAddress: e.target.value}); handleFieldChange('operatingAddress', e.target.value); }} onBlur={() => handleFieldBlur('operatingAddress')} placeholder={t('fondos.operatingAddressPlaceholder') || ''} required />{fieldErrors.operatingAddress && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.operatingAddress}</span>}</div>
                                    <div className="field-group"><label>{t('fondos.activities')}</label><textarea className="input-expert" style={getFieldErrorStyle('activities')} rows={2} value={formData.activities} onChange={e => { setFormData({...formData, activities: e.target.value}); handleFieldChange('activities', e.target.value); }} onBlur={() => handleFieldBlur('activities')} required />{fieldErrors.activities && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.activities}</span>}</div>
                                    <div className="field-group" ref={beneficiaryRef} style={{ position: 'relative' }}>
                                        <label>{t('fondos.beneficiaryName')}</label>
                                        <input
                                            className="input-expert"
                                            style={getFieldErrorStyle('beneficiaryName')}
                                            value={formData.beneficiaryName}
                                            onChange={handleBeneficiaryChange}
                                            onFocus={() => { if (beneficiarySuggestions.length > 0) setShowBeneficiaryDropdown(true); }}
                                            onBlur={() => handleFieldBlur('beneficiaryName')}
                                            placeholder={t('fondos.beneficiaryPlaceholder')}
                                            autoComplete="off"
                                            required
                                        />
                                        {fieldErrors.beneficiaryName && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.beneficiaryName}</span>}
                                        {showBeneficiaryDropdown && (
                                            <div className="beneficiary-dropdown">
                                                {beneficiaryLoading ? (
                                                    <div className="beneficiary-dropdown-item beneficiary-dropdown-status">{t('fondos.beneficiarySearching')}</div>
                                                ) : beneficiarySuggestions.length === 0 ? (
                                                    <div className="beneficiary-dropdown-item beneficiary-dropdown-status">{t('fondos.beneficiaryNoResults')}</div>
                                                ) : beneficiarySuggestions.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="beneficiary-dropdown-item"
                                                        onMouseDown={(e) => { e.preventDefault(); handleBeneficiarySelect(item); }}
                                                    >
                                                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{item.beneficiaryName}</div>
                                                        {(item.birthDate || item.birthPlace || item.address) && (
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                                {item.birthDate && <span>{item.birthDate}</span>}
                                                                {item.birthPlace && <span>{item.birthPlace}</span>}
                                                                {item.address && <span style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.address}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        <div className="field-group"><label>{t('fondos.birthDate')}</label><input type="date" className="input-expert" style={getFieldErrorStyle('birthDate')} value={formData.birthDate} onChange={e => { setFormData({...formData, birthDate: e.target.value}); handleFieldChange('birthDate', e.target.value); }} onBlur={() => handleFieldBlur('birthDate')} required />{fieldErrors.birthDate && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.birthDate}</span>}</div>
                                        <div className="field-group"><label>{t('fondos.birthPlace')}</label><input className="input-expert" style={getFieldErrorStyle('birthPlace')} value={formData.birthPlace} onChange={e => { setFormData({...formData, birthPlace: e.target.value}); handleFieldChange('birthPlace', e.target.value); }} onBlur={() => handleFieldBlur('birthPlace')} required />{fieldErrors.birthPlace && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.birthPlace}</span>}</div>
                                    </div>
                                    <div className="field-group"><label>{t('fondos.address')}</label><input className="input-expert" style={getFieldErrorStyle('address')} value={formData.address} onChange={e => { setFormData({...formData, address: e.target.value}); handleFieldChange('address', e.target.value); }} onBlur={() => handleFieldBlur('address')} required />{fieldErrors.address && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.address}</span>}</div>
                                    <button type="button" onClick={() => validateStep(1) && goToFondosStep(2)} style={{ padding: '12px 30px', background: PRIMARY, color: 'white', border: 'none', borderRadius: RADIUS, fontWeight: 700, alignSelf: 'flex-end', cursor: 'pointer', fontSize: '13px' }}>{t('common.continue')}</button>
                                </div>
                            )}
                            {step === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <h3>{t('fondos.fundsSourceTitle')}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        {[
                                            { key: 'Bienes personales', label: t('fondos.sources.bienes') },
                                            { key: 'Inversiones Financieras', label: t('fondos.sources.inversiones') },
                                            { key: 'Negocios', label: t('fondos.sources.negocios') },
                                            { key: 'Prestamos', label: t('fondos.sources.prestamos') },
                                            { key: 'Herencia o Fondo Fiduciario', label: t('fondos.sources.herencia') },
                                        ].map(f => (
                                            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '12px', padding: '10px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={formData.fundsSource.includes(f.key)} onChange={() => {
                                                    const updated = formData.fundsSource.includes(f.key) ? formData.fundsSource.filter(x => x !== f.key) : [...formData.fundsSource, f.key];
                                                    setFormData({...formData, fundsSource: updated});
                                                }} /> {f.label}
                                            </label>
                                        ))}
                                    </div>
                                    <div className="field-group"><label>{t('fondos.fundsOther')}</label><input className="input-expert" style={getFieldErrorStyle('fundsOther')} value={formData.fundsOther} onChange={e => { setFormData({...formData, fundsOther: e.target.value}); handleFieldChange('fundsOther', e.target.value); }} onBlur={() => handleFieldBlur('fundsOther')} placeholder={t('fondos.fundsOtherPlaceholder')} />{fieldErrors.fundsOther && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.fundsOther}</span>}</div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                        <button type="button" onClick={() => goToFondosStep(1)} style={{ flex: 1, padding: '12px', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>{t('common.back')}</button>
                                        <button type="button" onClick={() => validateStep(2) && goToFondosStep(3)} style={{ flex: 1, padding: '12px', background: PRIMARY, color: 'white', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>{t('common.continue')}</button>
                                    </div>
                                </div>
                            )}
                            {step === 3 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        <div className="field-group"><label>{t('fondos.custodyName')}</label><input className="input-expert" style={getFieldErrorStyle('custodyName')} value={formData.custodyName} onChange={e => { setFormData(prev => ({...prev, custodyName: e.target.value})); handleFieldChange('custodyName', e.target.value); }} onBlur={() => handleFieldBlur('custodyName')} required />{fieldErrors.custodyName && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.custodyName}</span>}</div>
                                        <div className="field-group"><label>{t('fondos.custodyPhone')}</label><input type="text" className="input-expert" style={getFieldErrorStyle('custodyPhone')} value={formData.custodyPhone} onChange={e => { setFormData({...formData, custodyPhone: e.target.value.replace(/\D/g,'')}); handleFieldChange('custodyPhone', e.target.value.replace(/\D/g,'')); }} onBlur={() => handleFieldBlur('custodyPhone')} required />{fieldErrors.custodyPhone && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.custodyPhone}</span>}</div>
                                    </div>
                                    <div className="field-group"><label>{t('fondos.custodyEmail')}</label><input type="email" className="input-expert" style={getFieldErrorStyle('custodyEmail')} value={formData.custodyEmail} onChange={e => { setFormData({...formData, custodyEmail: e.target.value}); handleFieldChange('custodyEmail', e.target.value); }} onBlur={() => handleFieldBlur('custodyEmail')} required placeholder="ejemplo@correo.com" />{fieldErrors.custodyEmail && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.custodyEmail}</span>}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        <div className="field-group"><label>{t('fondos.custodyAddress')}</label><input className="input-expert" style={getFieldErrorStyle('custodyAddress')} value={formData.custodyAddress} onChange={e => { setFormData(prev => ({...prev, custodyAddress: e.target.value})); handleFieldChange('custodyAddress', e.target.value); }} onBlur={() => handleFieldBlur('custodyAddress')} required />{fieldErrors.custodyAddress && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.custodyAddress}</span>}</div>
                                        <div className="field-group"><label>{t('fondos.fiscalYear') || 'Periodo fiscal'}</label><input className="input-expert" style={getFieldErrorStyle('fiscalYear')} value={formData.fiscalYear || ''} onChange={e => { setFormData(prev => ({...prev, fiscalYear: e.target.value})); handleFieldChange('fiscalYear', e.target.value); }} onBlur={() => handleFieldBlur('fiscalYear')} placeholder={t('fondos.fiscalYearPlaceholder') || ''} required />{fieldErrors.fiscalYear && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.fiscalYear}</span>}</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        <div className="field-group"><label>{t('fondos.signerName')}</label><input className="input-expert" style={getFieldErrorStyle('signerName')} value={formData.signerName} onChange={e => { setFormData({...formData, signerName: e.target.value}); handleFieldChange('signerName', e.target.value); }} onBlur={() => handleFieldBlur('signerName')} required />{fieldErrors.signerName && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.signerName}</span>}</div>
                                        <div className="field-group"><label>{t('fondos.date')}</label><input type="date" className="input-expert" style={getFieldErrorStyle('date')} value={formData.date} onChange={e => { setFormData({...formData, date: e.target.value}); handleFieldChange('date', e.target.value); }} onBlur={() => handleFieldBlur('date')} required />{fieldErrors.date && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{fieldErrors.date}</span>}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                        <button type="button" onClick={() => goToFondosStep(2)} style={{ flex: 1, padding: '12px', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>{t('common.back')}</button>
                                        <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: PRIMARY, color: 'white', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px', opacity: saving ? 0.7 : 1 }}>
                                            {saving ? t('common.saving') : t('common.finishSave')}
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
                ) : currentFormType === 'Fundaciones' ? (
                    <FundacionForm
                        initialData={formData}
                        onSave={saveDynamicForm}
                        saving={saving}
                    />
                ) : isKyciFormType(currentFormType) ? (
                    <CumplimientoIndividualForm
                        initialData={formData}
                        onSave={saveDynamicForm}
                        saving={saving}
                    />
                ) : isKyceFormType(currentFormType) ? (
                    <CumplimientoEntidadesForm
                        initialData={formData}
                        onSave={saveDynamicForm}
                        saving={saving}
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: PRIMARY }}>
                            <Construction size={40} />
                        </div>
                        <h2 style={{ marginBottom: '15px' }}>{t('dashboard.formInDev')}</h2>
                        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, marginBottom: '30px', maxWidth: '400px', margin: '0 auto 30px' }}>
                            {t('dashboard.formInDevBody', { type: getFormTypeLabel(currentFormType, lang) })}
                        </p>
                        <button onClick={() => { setCurrentFormType(''); navigate('/dashboard?view=form'); }} style={{ padding: '12px 25px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: RADIUS, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                            {t('dashboard.chooseAnother')}
                        </button>
                    </div>
                )}
              </div>
            </main>
            <style>{`
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .field-group { display: flex; flex-direction: column; gap: 2px; } 
                .field-group label { font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.3px; } 
                .input-expert { width: 100%; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; font-size: 13px; background: #f8fafc; }
                .input-expert:focus { border-color: ${PRIMARY}; background: white; box-shadow: 0 0 0 2px rgba(15,118,110,0.08); }
                .beneficiary-dropdown {
                    position: absolute; top: 100%; left: 0; right: 0; z-index: 200;
                    background: white; border: 1px solid #cbd5e1;
                    border-radius: 0 0 5px 5px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
                    max-height: 180px; overflow-y: auto;
                }
                .beneficiary-dropdown-item {
                    padding: 7px 10px; cursor: pointer;
                    border-bottom: 1px solid ${BORDER}; transition: background 0.1s;
                }
                .beneficiary-dropdown-item:last-child { border-bottom: none; }
                .beneficiary-dropdown-item:hover { background: #eef6ff; }
                .beneficiary-dropdown-status { cursor: default; color: #94a3b8; font-size: 12px; font-style: italic; }
                .beneficiary-dropdown-status:hover { background: transparent; }
            `}</style>
        </div>
    );
};

export default ClientDashboard;
