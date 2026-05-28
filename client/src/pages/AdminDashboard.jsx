import React, { useState, useEffect } from 'react';
import { Users, FileText, Settings, LogOut, CheckCircle, XCircle, Trash2, Search, Clock, Shield, ChevronLeft, ChevronRight, Eye, EyeOff, Key, ShieldOff, UploadCloud, SearchCheck, Building2, User, BadgeCheck, ChevronDown, ChevronUp, X } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import API_BASE_URL from '../config';
import { useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

/** Trámites que generan PDF con motor HTML (no dependen de AcroForm). */
const HTML_ENGINE_TEMPLATES = Object.freeze([
  'fondos',
  'corporacion',
  'fundaciones',
  'cumplimiento_individual',
  'cumplimiento_entidades',
]);

const AdminDashboard = () => {
  const t = useT();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [templateStatus, setTemplateStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateName, setTemplateName] = useState('fondos');
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [lastDetectedFields, setLastDetectedFields] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const [consultaSearch, setConsultaSearch] = useState('');
  const [consultaResults, setConsultaResults] = useState(null);
  const [consultaSummary, setConsultaSummary] = useState(null);
  const [consultaLoading, setConsultaLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserForms, setSelectedUserForms] = useState(null);
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [viewingFormData, setViewingFormData] = useState(null);

  const itemsPerPage = 15;
  const navigate = useNavigate();
  const toast = useToast();

  const PRIMARY = '#0f766e';
  const BORDER = '#e2e8f0';
  const RADIUS = '8px';
  const RADIUS_LG = '12px';

  useEffect(() => {
    fetchData();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setAdminEmail(storedUser.email || '');
  }, [activeTab, currentPage, searchTerm]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers: { 'x-auth-token': token } });
        setUsers(res.data);
      } else if (activeTab === 'logs') {
        const params = { page: currentPage, limit: itemsPerPage };
        if (searchTerm.trim()) params.q = searchTerm.trim();
        const res = await axios.get(`${API_BASE_URL}/api/admin/logs`, {
          headers: { 'x-auth-token': token },
          params
        });
        setLogs(res.data.logs || []);
        setLogsTotal(res.data.total ?? 0);
        setLogsTotalPages(res.data.totalPages ?? 1);
      } else if (activeTab === 'templates') {
        const res = await axios.get(`${API_BASE_URL}/api/admin/templates`, { headers: { 'x-auth-token': token } });
        const payload = res.data;
        if (Array.isArray(payload)) {
          setTemplates(payload);
          setTemplateStatus([]);
        } else {
          setTemplates(payload.templates || []);
          setTemplateStatus(payload.status || []);
        }
      }
    } catch (err) { 
      if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
      console.error(err); 
    } finally { setLoading(false); }
  };

  const handleStatusChange = async (userId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_BASE_URL}/api/admin/users/${userId}/status`, { status: newStatus }, { headers: { 'x-auth-token': token } });
      fetchData();
      toast.success('Estado actualizado');
    } catch (err) { 
        if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
        toast.error('Error'); 
    }
  };

  const handleDeleteUser = async (userId) => {
    const token = localStorage.getItem('token');
    if (window.confirm('¿Eliminar?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, { headers: { 'x-auth-token': token } });
        fetchData();
        toast.success('Eliminado');
      } catch (err) { 
          if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
          toast.error('Error'); 
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/auth/update-profile`, { email: adminEmail, newPassword: newPassword || undefined }, { headers: { 'x-auth-token': token } });
      toast.success('Perfil actualizado con éxito');
      setNewPassword('');
    } catch (err) { 
        if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
        toast.error('Error'); 
    } finally { setSavingSettings(false); }
  };

  const handleResetPassword = async (userId) => {
    if (window.confirm('¿Resetear contraseña y enviar por correo?')) {
      const token = localStorage.getItem('token');
      try {
        await axios.post(`${API_BASE_URL}/api/admin/users/${userId}/reset-password`, {}, { headers: { 'x-auth-token': token } });
        toast.success('Contraseña enviada al usuario');
      } catch (err) { 
          if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
          toast.error('Error al resetear'); 
      }
    }
  };

  const handleTemplateUpload = async (e) => {
    e.preventDefault();
    if (!templateFile) return toast.error('Selecciona un archivo PDF');
    setUploadingTemplate(true);
    
    const formData = new FormData();
    formData.append('template', templateFile);
    formData.append('name', templateName);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/admin/upload-template`, formData, {
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
      });
      const label = res.data?.processLabel || templateName;
      const detected = res.data?.detectedFields;
      setLastDetectedFields(detected || null);
      const count = detected?.fieldCount ?? 0;
      const isHtmlTemplate =
        HTML_ENGINE_TEMPLATES.includes(templateName) ||
        templateStatus.find((s) => s.id === templateName)?.kind === 'html';
      if (detected && !detected.extractError) {
        toast.success(
          count > 0
            ? t('admin.fieldsDetected', { count, type: label })
            : isHtmlTemplate
              ? t('admin.templateSavedArchive', { type: label })
              : t('admin.flatPdfWarning', { type: label })
        );
      } else {
        toast.success(t('admin.templateSaved', { type: label }));
        if (detected?.extractError) {
          toast.error(`${t('admin.fieldsExtractError')} (${detected.extractError})`);
        }
      }
      setTemplateFile(null);
      await fetchData();
    } catch (err) {
      toast.error('Error al subir la plantilla');
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (name) => {
    if (!window.confirm(`⚠️ ADVERTENCIA: ¿Está seguro de eliminar la plantilla de "${name}"? \n\nSi la elimina, los usuarios NO podrán generar PDFs para este trámite hasta que suba una nueva plantilla.`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/delete-template/${name}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Plantilla eliminada correctamente');
      fetchData();
    } catch (err) {
      toast.error('Error al eliminar la plantilla');
    }
  };

  const handleConsultaSearch = async (e) => {
    e && e.preventDefault();
    const q = consultaSearch.trim();
    if (!q || q.length < 2) return toast.error('Ingrese al menos 2 caracteres');
    setConsultaLoading(true);
    setSelectedUser(null);
    setSelectedUserForms(null);
    setExpandedPerson(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/search-person`, {
        headers: { 'x-auth-token': token },
        params: { q }
      });
      setConsultaResults(res.data.results || []);
      setConsultaSummary(res.data.summary || null);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
      toast.error('Error en la búsqueda');
    } finally { setConsultaLoading(false); }
  };

  const handleViewUserForms = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/user-forms/${userId}`, {
        headers: { 'x-auth-token': token }
      });
      setSelectedUser(res.data.user);
      setSelectedUserForms(res.data.forms);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
      toast.error('Error al cargar formularios');
    }
  };

  const logout = () => { localStorage.clear(); navigate('/'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '230px', background: PRIMARY, color: 'white', padding: '25px 15px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '40px', padding: '0 10px' }}>
          <Shield size={20} color="white" />
          <span style={{ fontWeight: 700, fontSize: '13px' }}>NEXUSDOC ADMIN</span>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[{ id: 'users', icon: Users, label: t('admin.users') }, { id: 'consultas', icon: SearchCheck, label: 'Consultas' }, { id: 'logs', icon: Clock, label: t('admin.audit') }, { id: 'templates', icon: FileText, label: t('admin.templates') }, { id: 'settings', icon: Settings, label: t('admin.settings') }].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setCurrentPage(1); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', border: 'none', background: activeTab === item.id ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '12px', borderRadius: RADIUS }}>
              <item.icon size={15} /> {item.label}
            </button>
          ))}
        </nav>
        <LanguageSwitcher variant="sidebar" />
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '11px', borderRadius: RADIUS, marginTop: 10 }}>
          <LogOut size={15} /> {t('sidebar.logout')}
        </button>
      </div>

      <div style={{ flex: 1, padding: '35px 45px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1000px' }}>
          <header style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <h1>ADMINISTRACIÓN MASTER</h1>
            {activeTab === 'logs' && (
              <div style={{ position: 'relative', width: '250px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                <input placeholder={t('admin.searchLogs')} className="input-modern-admin" style={{ paddingLeft: '32px' }} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
              </div>
            )}
          </header>

          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            {activeTab === 'users' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f9f9f9', borderBottom: `1px solid ${BORDER}` }}>
                  <tr style={{ fontSize: '10px', color: '#666', fontWeight: 800 }}>
                    <th style={{ padding: '12px 15px' }}>ID</th>
                    <th style={{ padding: '12px 15px' }}>USUARIO</th>
                    <th style={{ padding: '12px 15px' }}>ESTADO</th>
                    <th style={{ padding: '12px 15px' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                      <td style={{ padding: '12px 15px', fontWeight: 700, color: PRIMARY }}>{user.uniqueCode}</td>
                      <td style={{ padding: '12px 15px' }}>{user.name}</td>
                      <td style={{ padding: '12px 15px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '20px', background: user.status === 'authorized' ? '#dcfce7' : '#fee2e2', fontSize: '9px', color: user.status === 'authorized' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{user.status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => handleStatusChange(user.id, 'authorized')} title="Autorizar" style={{ border: `1px solid ${BORDER}`, background: 'white', padding: 5, borderRadius: RADIUS, cursor: 'pointer', color: '#15803d' }}><CheckCircle size={14} /></button>
                          <button onClick={() => handleStatusChange(user.id, 'blocked')} title="Desautorizar" style={{ border: `1px solid ${BORDER}`, background: 'white', padding: 5, borderRadius: RADIUS, cursor: 'pointer', color: '#f59e0b' }}><ShieldOff size={14} /></button>
                          <button onClick={() => handleResetPassword(user.id)} title="Resetear Clave" style={{ border: `1px solid ${BORDER}`, background: 'white', padding: 5, borderRadius: RADIUS, cursor: 'pointer', color: PRIMARY }}><Key size={14} /></button>
                          <button onClick={() => handleDeleteUser(user.id)} title="Eliminar" style={{ border: `1px solid ${BORDER}`, background: 'white', padding: 5, borderRadius: RADIUS, cursor: 'pointer', color: '#dc2626' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'logs' && (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f9f9f9', borderBottom: `1px solid ${BORDER}` }}>
                    <tr style={{ fontSize: '10px', color: '#666', fontWeight: 800 }}>
                      <th style={{ padding: '12px 15px' }}>{t('admin.date')}</th>
                      <th style={{ padding: '12px 15px' }}>{t('admin.action')}</th>
                      <th style={{ padding: '12px 15px' }}>{t('admin.user')}</th>
                      <th style={{ padding: '12px 15px' }}>{t('admin.description')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} style={{ padding: '20px 15px', textAlign: 'center', color: '#888' }}>...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '20px 15px', textAlign: 'center', color: '#888' }}>{t('admin.noLogs')}</td></tr>
                    ) : logs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
                        <td style={{ padding: '10px 15px', color: '#666' }}>{new Date(log.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '10px 15px' }}><span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}>{log.action}</span></td>
                        <td style={{ padding: '10px 15px', fontWeight: 600 }}>{log.User?.name || 'Sistema'}</td>
                        <td style={{ padding: '10px 15px', color: '#444' }}>{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 15px', borderTop: `1px solid ${BORDER}`, background: '#fafafa', flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{t('admin.totalRecords', { count: logsTotal })}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, background: 'white', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.5 : 1, fontSize: '11px', fontWeight: 600 }}
                    >
                      <ChevronLeft size={14} /> {t('admin.prevPage')}
                    </button>
                    {Array.from({ length: logsTotalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === logsTotalPages || Math.abs(p - currentPage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) => typeof p === 'number' ? (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          style={{ minWidth: 32, padding: '6px 8px', border: `1px solid ${p === currentPage ? PRIMARY : BORDER}`, borderRadius: RADIUS, background: p === currentPage ? PRIMARY : 'white', color: p === currentPage ? 'white' : '#334155', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                        >
                          {p}
                        </button>
                      ) : (
                        <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '11px' }}>…</span>
                      ))}
                    <button
                      type="button"
                      disabled={currentPage >= logsTotalPages}
                      onClick={() => setCurrentPage(p => Math.min(logsTotalPages, p + 1))}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, background: 'white', cursor: currentPage >= logsTotalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= logsTotalPages ? 0.5 : 1, fontSize: '11px', fontWeight: 600 }}
                    >
                      {t('admin.nextPage')} <ChevronRight size={14} />
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 8 }}>{t('admin.pageOf', { page: currentPage, total: logsTotalPages })}</span>
                </div>
              </>
            )}

            {activeTab === 'consultas' && (
              <div style={{ padding: '30px' }}>
                <form onSubmit={handleConsultaSearch} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      className="input-modern-admin"
                      placeholder="Buscar por nombre, pasaporte o cédula..."
                      value={consultaSearch}
                      onChange={e => setConsultaSearch(e.target.value)}
                      style={{ paddingLeft: 34 }}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={consultaLoading} style={{ whiteSpace: 'nowrap', padding: '10px 20px' }}>
                    {consultaLoading ? 'BUSCANDO...' : 'BUSCAR'}
                  </button>
                </form>

                {consultaSummary && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: RADIUS, padding: '14px 18px' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{consultaSummary.totalResults}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', marginTop: 2 }}>RESULTADOS</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: RADIUS, padding: '14px 18px' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{consultaSummary.uniqueForms}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', marginTop: 2 }}>FORMULARIOS</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, background: '#fefce8', border: '1px solid #fde68a', borderRadius: RADIUS, padding: '14px 18px' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#a16207' }}>{consultaSummary.uniqueUsers}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#facc15', marginTop: 2 }}>USUARIOS</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: RADIUS, padding: '14px 18px' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#7e22ce' }}>{(consultaSummary.roles || []).join(', ')}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#c084fc', marginTop: 2 }}>ROLES ENCONTRADOS</div>
                    </div>
                  </div>
                )}

                {selectedUser && selectedUserForms && (
                  <div style={{ marginBottom: 24, background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>
                          <User size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                          {selectedUser.name}
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
                          {selectedUser.email} &middot; {selectedUser.uniqueCode || 'Sin código'} &middot; {selectedUser.idNumber || 'Sin cédula'}
                        </p>
                      </div>
                      <button onClick={() => { setSelectedUser(null); setSelectedUserForms(null); }} style={{ border: `1px solid ${BORDER}`, background: 'white', padding: 6, borderRadius: RADIUS, cursor: 'pointer', color: '#64748b' }}>
                        <X size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>
                      {selectedUserForms.length} formulario(s) encontrado(s)
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: `1px solid ${BORDER}` }}>
                      <thead style={{ background: '#f1f5f9', borderBottom: `1px solid ${BORDER}` }}>
                        <tr style={{ fontSize: 10, color: '#64748b', fontWeight: 800 }}>
                          <th style={{ padding: '10px 12px' }}>TIPO</th>
                          <th style={{ padding: '10px 12px' }}>ENTIDAD/EMPRESA</th>
                          <th style={{ padding: '10px 12px' }}>DETALLES</th>
                          <th style={{ padding: '10px 12px' }}>FECHA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUserForms.map(f => (
                          <tr key={f.formId} style={{ borderBottom: `1px solid ${BORDER}`, fontSize: 11 }}>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{f.formType}</span>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{f.entityName || '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>
                              {f.directorCount > 0 && <span style={{ marginRight: 8 }}>{f.directorCount} director(es)</span>}
                              {f.dignitaryCount > 0 && <span style={{ marginRight: 8 }}>{f.dignitaryCount} dignatario(s)</span>}
                              {f.shareholderCount > 0 && <span style={{ marginRight: 8 }}>{f.shareholderCount} accionista(s)</span>}
                              {f.beneficiaryCount > 0 && <span style={{ marginRight: 8 }}>{f.beneficiaryCount} beneficiario(s)</span>}
                              {f.memberCount > 0 && <span>{f.memberCount} miembro(s)</span>}
                              {!f.directorCount && !f.dignitaryCount && !f.shareholderCount && !f.beneficiaryCount && !f.memberCount && '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{new Date(f.updatedAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {consultaResults && consultaResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <SearchCheck size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p style={{ fontSize: 13 }}>No se encontraron resultados para "<strong>{consultaSearch}</strong>"</p>
                  </div>
                )}

                {consultaResults && consultaResults.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: `1px solid ${BORDER}` }}>
                    <thead style={{ background: '#f9f9f9', borderBottom: `1px solid ${BORDER}` }}>
                      <tr style={{ fontSize: 10, color: '#666', fontWeight: 800 }}>
                        <th style={{ padding: '12px 12px' }}>PERSONA</th>
                        <th style={{ padding: '12px 12px' }}>ENTIDAD</th>
                        <th style={{ padding: '12px 12px' }}>PASAPORTE/CÉDULA</th>
                        <th style={{ padding: '12px 12px' }}>ROL</th>
                        <th style={{ padding: '12px 12px' }}>FORMULARIO</th>
                        <th style={{ padding: '12px 12px' }}>USUARIO</th>
                        <th style={{ padding: '12px 12px' }}>FECHA</th>
                        <th style={{ padding: '12px 8px', width: 80 }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultaResults.map((r, idx) => {
                        const isExpanded = expandedPerson === idx;
                        const det = r.personDetails || {};
                        const detailKeys = Object.keys(det).filter(k => det[k] && typeof det[k] !== 'object');
                        return (
                          <React.Fragment key={`${r.formId}-${r.role}-${idx}`}>
                            <tr style={{ borderBottom: isExpanded ? 'none' : `1px solid ${BORDER}`, fontSize: 11, background: isExpanded ? '#f8fafc' : 'white' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>{r.personName || '—'}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f766e' }}>{r.entityName || '—'}</td>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{r.personPassport || '—'}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                                  background: r.role === 'Director' ? '#dbeafe' : r.role === 'Dignatario' ? '#fef3c7' : r.role === 'Accionista' ? '#d1fae5' : r.role === 'Beneficiario' ? '#ede9fe' : '#f1f5f9',
                                  color: r.role === 'Director' ? '#1e40af' : r.role === 'Dignatario' ? '#92400e' : r.role === 'Accionista' ? '#065f46' : r.role === 'Beneficiario' ? '#5b21b6' : '#475569'
                                }}>{r.role}</span>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{r.formType}</span>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <button onClick={() => handleViewUserForms(r.userId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PRIMARY, fontWeight: 600, fontSize: 11, textDecoration: 'underline', padding: 0 }}>
                                  {r.userName}
                                </button>
                                <div style={{ fontSize: 9, color: '#94a3b8' }}>{r.userCode}</div>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{new Date(r.formDate).toLocaleDateString()}</td>
                              <td style={{ padding: '10px 8px' }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button title="Ver Formulario Completo" onClick={() => setViewingFormData(r)} style={{ border: `1px solid ${BORDER}`, background: '#f0fdf4', padding: 4, borderRadius: RADIUS, cursor: 'pointer', color: '#15803d', display: 'flex' }}>
                                    <Eye size={12} />
                                  </button>
                                  <button onClick={() => setExpandedPerson(isExpanded ? null : idx)} style={{ border: `1px solid ${BORDER}`, background: 'white', padding: 4, borderRadius: RADIUS, cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && detailKeys.length > 0 && (
                              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#f8fafc' }}>
                                <td colSpan={7} style={{ padding: '12px 20px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                                    {detailKeys.map(k => (
                                      <div key={k} style={{ fontSize: 11 }}>
                                        <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 9, textTransform: 'uppercase' }}>{k}: </span>
                                        <span style={{ color: '#334155' }}>{String(det[k])}</span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {!consultaResults && !consultaLoading && (
                  <div style={{ textAlign: 'center', padding: 50, color: '#cbd5e1' }}>
                    <Building2 size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>Busque una persona por nombre, pasaporte o cédula para ver en qué empresas y formularios aparece.</p>
                  </div>
                )}

                {viewingFormData && (
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '90%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h2 style={{ fontSize: 18, margin: 0, color: '#0f766e', fontWeight: 800 }}>
                            {viewingFormData.entityName || 'Datos del Formulario'}
                          </h2>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                            {viewingFormData.formType} &middot; Subido por: {viewingFormData.userName} ({viewingFormData.userEmail})
                          </p>
                        </div>
                        <button onClick={() => setViewingFormData(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                      </div>
                      <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
                          {JSON.stringify(viewingFormData.formData, null, 2)}
                        </pre>
                      </div>
                      <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, textAlign: 'right' }}>
                        <button onClick={() => setViewingFormData(null)} className="btn-primary" style={{ padding: '8px 16px' }}>Cerrar</button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ padding: '30px', maxWidth: '450px' }}>
                <h3 style={{ marginBottom: '20px' }}>Configuración del Perfil</h3>
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <div className="field-group-admin">
                    <label style={{ fontSize: '10px', fontWeight: 700 }}>CORREO ELECTRÓNICO</label>
                    <input className="input-modern-admin" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                  </div>
                  <div className="field-group-admin">
                    <label style={{ fontSize: '10px', fontWeight: 700 }}>NUEVA CONTRASEÑA</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        className="input-modern-admin" 
                        type={showPassword ? 'text' : 'password'} 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        style={{ paddingRight: '40px' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#666' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={savingSettings} className="btn-primary" style={{ width: '100%', marginTop: 10 }}>
                    {savingSettings ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'templates' && (
              <div style={{ padding: '30px' }}>
                <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>Estado de Plantillas Base</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: `1px solid ${BORDER}` }}>
                        <thead style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}` }}>
                          <tr style={{ fontSize: '10px', color: '#64748b', fontWeight: 800 }}>
                            <th style={{ padding: '12px' }}>TIPO DE TRÁMITE</th>
                            <th style={{ padding: '12px' }}>ESTADO ACTUAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { id: 'fondos', label: 'Declaración de Fondos' },
                            { id: 'corporacion', label: 'Incorporación' },
                            { id: 'fundaciones', label: 'Fundaciones' },
                            { id: 'cumplimiento_individual', label: 'Cumplimiento Individual' },
                            { id: 'cumplimiento_entidades', label: 'Cumplimiento Entidades' }
                          ].map(type => {
                            const rowStatus = templateStatus.find((s) => s.id === type.id);
                            const isHtml = rowStatus?.kind === 'html';
                            const isAvailable = rowStatus ? rowStatus.available : templates.some((tpl) => tpl.name === type.id);
                            const customTemplate = templates.find((tpl) => tpl.name === type.id);
                            return (
                              <tr key={type.id} style={{ borderBottom: `1px solid ${BORDER}`, fontSize: '12px' }}>
                                <td style={{ padding: '12px', fontWeight: 700, color: '#1e293b' }}>{type.label}</td>
                                <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {isAvailable ? (
                                        <>
                                            <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                              {isHtml ? t('admin.htmlEngine') : t('admin.customDb')}
                                            </span>
                                            {!isHtml && customTemplate && (
                                            <button 
                                                onClick={() => handleDeleteTemplate(type.id)}
                                                style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Eliminar plantilla (Desactiva la generación de PDF para este trámite)"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            )}
                                        </>
                                    ) : (
                                        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>{t('admin.noTemplate')}</span>
                                    )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                  </div>
                  
                  <div style={{ flex: 1, background: '#f8fafc', padding: '25px', borderRadius: RADIUS_LG, border: `1px dashed #cbd5e1` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <UploadCloud size={20} color={PRIMARY} />
                      <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Subir/Reemplazar Plantilla</h3>
                    </div>
                    <form onSubmit={handleTemplateUpload} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                      <div className="field-group-admin">
                        <label style={{ fontSize: '10px', fontWeight: 700 }}>TIPO DE TRÁMITE A VINCULAR</label>
                        <select
                          className="input-modern-admin"
                          value={templateName}
                          onChange={(e) => {
                            setTemplateName(e.target.value);
                            setLastDetectedFields(null);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <option value="fondos">Declaración de Fondos</option>
                          <option value="corporacion">Incorporación</option>
                          <option value="fundaciones">Fundaciones</option>
                          <option value="cumplimiento_individual">Cumplimiento Individual</option>
                          <option value="cumplimiento_entidades">Cumplimiento Entidades</option>
                        </select>
                        {(HTML_ENGINE_TEMPLATES.includes(templateName) ||
                          templateStatus.find((s) => s.id === templateName)?.kind === 'html') && (
                          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#0f766e', lineHeight: 1.45 }}>
                            {t('admin.htmlEngineUploadHint')}
                          </p>
                        )}
                      </div>
                      <div className="field-group-admin">
                        <label style={{ fontSize: '10px', fontWeight: 700 }}>ARCHIVO PDF</label>
                        <input 
                          type="file" 
                          accept=".pdf" 
                          onChange={(e) => setTemplateFile(e.target.files[0])} 
                          className="input-modern-admin" 
                          style={{ background: 'white', padding: '8px' }}
                          required 
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={uploadingTemplate || !templateFile} 
                        className="btn-primary" 
                        style={{ marginTop: 10, background: templates.some(t => t.name === templateName) ? '#f59e0b' : '#16a34a' }}
                      >
                        {uploadingTemplate ? 'PROCESANDO...' : (templates.some(t => t.name === templateName) ? 'ACTUALIZAR PLANTILLA EXISTENTE' : 'SUBIR NUEVA PLANTILLA')}
                      </button>
                      <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
                        {templates.some(t => t.name === templateName) ? 'Esta acción sobreescribirá el archivo actual en la base de datos.' : 'Se inyectará un nuevo archivo en el sistema maestro.'}
                      </p>
                      {lastDetectedFields && (
                        <div
                          style={{
                            marginTop: 16,
                            padding: 12,
                            background: 'white',
                            borderRadius: RADIUS,
                            border: `1px solid ${BORDER}`,
                            fontSize: 11,
                          }}
                        >
                          <p style={{ fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>
                            {t('admin.detectedFieldsTitle', { count: lastDetectedFields.fieldCount ?? 0 })}
                          </p>
                          {(lastDetectedFields.fieldCount ?? 0) === 0 &&
                          !HTML_ENGINE_TEMPLATES.includes(templateName) &&
                          templateStatus.find((s) => s.id === templateName)?.kind !== 'html' ? (
                            <p style={{ color: '#b91c1c', margin: 0 }}>{t('admin.flatPdfHint')}</p>
                          ) : (lastDetectedFields.fieldCount ?? 0) === 0 ? (
                            <p style={{ color: '#64748b', margin: 0 }}>{t('admin.templateSavedArchive', { type: templateName })}</p>
                          ) : (
                            <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                                <thead>
                                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                                    <th style={{ padding: '4px 6px' }}>#</th>
                                    <th style={{ padding: '4px 6px' }}>AcroForm</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(lastDetectedFields.fieldNames || []).map((name, idx) => (
                                    <tr key={name} style={{ borderTop: `1px solid ${BORDER}` }}>
                                      <td style={{ padding: '4px 6px', color: '#94a3b8' }}>{idx + 1}</td>
                                      <td style={{ padding: '4px 6px', fontFamily: 'monospace' }}>{name}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {lastDetectedFields.schemaSource && (
                            <p style={{ marginTop: 8, color: '#64748b', fontSize: 10 }}>
                              {t('admin.schemaSource')}: {lastDetectedFields.schemaSource}
                            </p>
                          )}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .input-modern-admin { width: 100%; padding: 10px 12px; border: 1px solid ${BORDER}; border-radius: ${RADIUS}; outline: none; font-size: 12px; }
        .field-group-admin { display: flex; flex-direction: column; gap: 6px; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
