import React, { useState, useEffect } from 'react';
import { Users, FileText, Settings, LogOut, CheckCircle, XCircle, Trash2, Search, Clock, Shield, ChevronLeft, ChevronRight, Eye, EyeOff, Key, ShieldOff, UploadCloud, BookOpen } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import API_BASE_URL from '../config';
import { useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

const AdminDashboard = () => {
  const t = useT();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const fileInputRef = React.useRef(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const itemsPerPage = 12;
  const navigate = useNavigate();
  const toast = useToast();

  const PRIMARY = '#0078d4';
  const BORDER = '#e2e8f0';
  const RADIUS = '8px';
  const RADIUS_LG = '12px';

  useEffect(() => {
    fetchData();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setAdminEmail(storedUser.email || '');
  }, [activeTab]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers: { 'x-auth-token': token } });
        setUsers(res.data);
      } else if (activeTab === 'logs') {
        const res = await axios.get(`${API_BASE_URL}/api/admin/logs`, { headers: { 'x-auth-token': token } });
        setLogs(res.data);
      } else if (activeTab === 'templates') {
        const res = await axios.get(`${API_BASE_URL}/api/admin/templates`, { headers: { 'x-auth-token': token } });
        setTemplates(res.data);
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
      toast.success(t('toast.saveSuccess'));
    } catch (err) { 
        if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
        toast.error('Error'); 
    }
  };

  const handleDeleteUser = async (userId) => {
    const token = localStorage.getItem('token');
    if (window.confirm(t('modal.confirmDelete'))) {
      try {
        await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, { headers: { 'x-auth-token': token } });
        fetchData();
        toast.success(t('modal.deleted'));
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
      toast.success(t('toast.saveSuccess'));
      setNewPassword('');
    } catch (err) { 
        if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
        toast.error('Error'); 
    } finally { setSavingSettings(false); }
  };

  const handleResetPassword = async (userId) => {
    if (window.confirm(t('modal.confirmReset'))) {
      const token = localStorage.getItem('token');
      try {
        await axios.post(`${API_BASE_URL}/api/admin/users/${userId}/reset-password`, {}, { headers: { 'x-auth-token': token } });
        toast.success(t('modal.passwordSent'));
      } catch (err) { 
          if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
          toast.error('Error al resetear'); 
      }
    }
  };

  const handleTemplateUpload = async (e) => {
    e.preventDefault();
    if (!templateName || !templateFile) {
      toast.error("Primero debe seleccionar un trámite y estar listo para descarga");
      return;
    }
    setUploadingTemplate(true);
    
    const formData = new FormData();
    formData.append('template', templateFile);
    formData.append('name', templateName);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/admin/upload-template`, formData, {
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
      });
      toast.success(t('toast.saveSuccess'));
      setTemplateFile(null);
      fetchData();
    } catch (err) {
      toast.error('Error al subir la plantilla');
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (name) => {
    if (!window.confirm(t('modal.confirmDelete'))) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/delete-template/${name}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success(t('toast.saveSuccess'));
      fetchData();
    } catch (err) {
      toast.error('Error al eliminar la plantilla');
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
          {[{ id: 'users', icon: Users, label: t('admin.users') }, { id: 'logs', icon: Clock, label: t('admin.audit') }, { id: 'templates', icon: FileText, label: t('admin.templates') }, { id: 'settings', icon: Settings, label: t('admin.settings') }].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setCurrentPage(1); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', border: 'none', background: activeTab === item.id ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '12px', borderRadius: RADIUS }}>
              <item.icon size={15} /> {item.label}
            </button>
          ))}
          <button onClick={() => navigate('/tutorial')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 15px', border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '12px', borderRadius: RADIUS, marginTop: '15px' }}>
              <BookOpen size={15} /> {t('admin.helpTutorial')}
          </button>
        </nav>
        <LanguageSwitcher variant="sidebar" />
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '11px', borderRadius: RADIUS, marginTop: 10 }}>
          <LogOut size={15} /> {t('sidebar.logout')}
        </button>
      </div>

      <div style={{ flex: 1, padding: '35px 45px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1000px' }}>
          <header style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <h1>{t('admin.masterTitle')}</h1>
            {activeTab === 'logs' && (
              <div style={{ position: 'relative', width: '250px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                <input placeholder={t('common.search')} className="input-modern-admin" style={{ paddingLeft: '32px' }} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
              </div>
            )}
          </header>

          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            {activeTab === 'users' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f9f9f9', borderBottom: `1px solid ${BORDER}` }}>
                  <tr style={{ fontSize: '10px', color: '#666', fontWeight: 800 }}>
                    <th style={{ padding: '12px 15px' }}>ID</th>
                    <th style={{ padding: '12px 15px' }}>{t('admin.user')}</th>
                    <th style={{ padding: '12px 15px' }}>{t('admin.status')}</th>
                    <th style={{ padding: '12px 15px' }}>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                      <td style={{ padding: '12px 15px', fontWeight: 700, color: PRIMARY }}>{user.uniqueCode}</td>
                      <td style={{ padding: '12px 15px' }}>{user.name}</td>
                       <td style={{ padding: '12px 15px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '20px', background: user.status === 'authorized' ? '#dcfce7' : '#fee2e2', fontSize: '9px', color: user.status === 'authorized' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{user.status === 'authorized' ? t('corporacion.authorized') : t('corporacion.pending')}</span>
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

            {activeTab === 'logs' && (() => {
              const filteredLogs = logs.filter(l => l.action.toLowerCase().includes(searchTerm.toLowerCase()) || l.description.toLowerCase().includes(searchTerm.toLowerCase()));
              const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
              const pagedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
              return (
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
                      {pagedLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
                          <td style={{ padding: '10px 15px', color: '#666' }}>{new Date(log.createdAt).toLocaleString()}</td>
                          <td style={{ padding: '10px 15px' }}><span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}>{log.action}</span></td>
                          <td style={{ padding: '10px 15px', fontWeight: 600 }}>{log.User?.name || 'Sistema'}</td>
                          <td style={{ padding: '10px 15px', color: '#444' }}>{log.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              );
            })()}

            {activeTab === 'settings' && (
              <div style={{ padding: '30px', maxWidth: '450px' }}>
                <h3 style={{ marginBottom: '20px' }}>{t('admin.profileSettings')}</h3>
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <div className="field-group-admin">
                    <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.email')}</label>
                    <input className="input-modern-admin" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                  </div>
                  <div className="field-group-admin">
                    <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.newPassword')}</label>
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
                    {savingSettings ? t('common.loading') : t('admin.saveChanges')}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'templates' && (
              <div style={{ padding: '30px' }}>
                <div style={{ display: 'flex', gap: '30px', alignItems: 'stretch' }}>
                  {/* PANEL IZQUIERDO: ESTADO DE TRÁMITES */}
                  <div style={{ flex: 1.2, background: 'white', padding: '25px', borderRadius: RADIUS_LG, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: `1px solid ${BORDER}` }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '15px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.025em' }}>
                      {t('admin.templatesStatus')}
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: `2px solid ${BORDER}` }}>
                          <th style={{ padding: '12px 8px' }}>{t('admin.processType')}</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right' }}>{t('admin.currentStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: 'fondos', label: t('formType.Fondos Registros contables') },
                          { id: 'corporacion', label: t('formType.Corporación') },
                          { id: 'fundaciones', label: t('formType.Fundaciones') },
                          { id: 'cumplimiento_individual', label: t('formType.Cumplimiento Individual') },
                          { id: 'cumplimiento_entidades', label: t('formType.Cumplimiento Entidades') }
                        ].map(type => {
                          const customTemplate = templates.find(t => t.name === type.id);
                          return (
                            <tr key={type.id} style={{ borderBottom: `1px solid ${BORDER}`, transition: 'background 0.2s', ':hover': { background: '#f8fafc' } }}>
                              <td style={{ padding: '16px 8px', fontWeight: 700, color: '#334155', fontSize: '13px' }}>{type.label}</td>
                              <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                  {customTemplate ? (
                                    <>
                                      <span style={{ 
                                        background: '#ecfdf5', 
                                        color: '#047857', 
                                        padding: '5px 10px', 
                                        borderRadius: '9999px', 
                                        fontSize: '11px', 
                                        fontWeight: 700, 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '5px',
                                        border: '1px solid #a7f3d0'
                                      }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                                        {t('admin.customDb')}
                                      </span>
                                      <button 
                                        onClick={() => handleDeleteTemplate(type.id)}
                                        style={{ 
                                          background: '#fff1f2', 
                                          color: '#e11d48', 
                                          border: '1px solid #fecdd3', 
                                          padding: '6px', 
                                          borderRadius: '8px', 
                                          cursor: 'pointer', 
                                          transition: 'all 0.2s', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center' 
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ffe4e6'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.transform = 'scale(1)'; }}
                                        title="Eliminar plantilla"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <span style={{ 
                                      background: '#fff1f2', 
                                      color: '#e11d48', 
                                      padding: '5px 10px', 
                                      borderRadius: '9999px', 
                                      fontSize: '11px', 
                                      fontWeight: 700, 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '5px',
                                      border: '1px solid #fecdd3'
                                    }}>
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e', display: 'inline-block' }}></span>
                                      {t('admin.noTemplate')}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* PANEL DERECHO: CARGADOR DE PLANTILLA */}
                  <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: RADIUS_LG, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px' }}>
                          <UploadCloud size={20} color={PRIMARY} />
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.025em' }}>
                          {t('admin.uploadReplace')}
                        </h3>
                      </div>
                      
                      <form onSubmit={handleTemplateUpload} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* SELECTOR DE TRÁMITE */}
                        <div className="field-group-admin">
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                            {t('admin.processToLink')}
                          </label>
                          <select 
                            className="input-modern-admin" 
                            value={templateName} 
                            onChange={(e) => setTemplateName(e.target.value)} 
                            style={{ 
                              cursor: 'pointer', 
                              padding: '12px', 
                              borderRadius: '8px', 
                              border: `1px solid ${BORDER}`,
                              fontSize: '13px',
                              background: '#f8fafc',
                              color: templateName ? '#0f172a' : '#94a3b8',
                              fontWeight: templateName ? '600' : '400',
                              outline: 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            <option value="" style={{ color: '#94a3b8' }}>-- Seleccione un Trámite --</option>
                            <option value="fondos">{t('formType.Fondos Registros contables')}</option>
                            <option value="corporacion">{t('formType.Corporación')}</option>
                            <option value="fundaciones">{t('formType.Fundaciones')}</option>
                            <option value="cumplimiento_individual">{t('formType.Cumplimiento Individual')}</option>
                            <option value="cumplimiento_entidades">{t('formType.Cumplimiento Entidades')}</option>
                          </select>
                        </div>
                        
                        {/* ZONA DE CARGA DE ARCHIVO (DROPZONE UX HÍBRIDA) */}
                        <div className="field-group-admin">
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                            {t('userDocs.pdfLabel')}
                          </label>
                          
                          {/* INPUT DE FILE OCULTO */}
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".pdf" 
                            onChange={(e) => setTemplateFile(e.target.files[0])} 
                            style={{ display: 'none' }}
                          />
                          
                          {/* DISEÑO UX REEMPLAZO DE FILE INPUT */}
                          <div 
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            style={{ 
                              border: `2px dashed ${templateFile ? '#10b981' : '#cbd5e1'}`, 
                              background: templateFile ? '#f0fdf4' : '#f8fafc', 
                              borderRadius: '10px', 
                              padding: '30px 20px', 
                              textAlign: 'center', 
                              cursor: 'pointer', 
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '10px'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = templateFile ? '#10b981' : PRIMARY; e.currentTarget.style.background = templateFile ? '#f0fdf4' : '#eff6ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = templateFile ? '#10b981' : '#cbd5e1'; e.currentTarget.style.background = templateFile ? '#f0fdf4' : '#f8fafc'; }}
                          >
                            <UploadCloud size={32} color={templateFile ? '#10b981' : '#64748b'} style={{ marginBottom: 5 }} />
                            {templateFile ? (
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#047857', wordBreak: 'break-all' }}>
                                  📄 {templateFile.name}
                                </p>
                                <p style={{ fontSize: '11px', color: '#059669', marginTop: 4 }}>
                                  ({(templateFile.size / (1024 * 1024)).toFixed(2)} MB) - Haga clic para cambiar
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                                  Haga clic aquí para seleccionar el archivo PDF
                                </p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
                                  Soporta formato PDF (Máx. 10MB)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* BOTÓN DE CARGA */}
                        <button 
                          type="submit" 
                          disabled={uploadingTemplate} 
                          className="btn-primary" 
                          style={{ 
                            marginTop: 10, 
                            padding: '12px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            cursor: uploadingTemplate ? 'not-allowed' : 'pointer',
                            background: uploadingTemplate ? '#94a3b8' : (templateName && templates.some(t => t.name === templateName) ? '#f59e0b' : '#10b981'),
                            border: 'none',
                            color: 'white',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => { if (!uploadingTemplate) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={(e) => { if (!uploadingTemplate) e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          {uploadingTemplate 
                            ? t('register.processing').toUpperCase() 
                            : (templateName && templates.some(t => t.name === templateName) 
                               ? 'REEMPLAZAR PLANTILLA EXISTENTE' 
                               : 'SUBIR NUEVA PLANTILLA'
                              )}
                        </button>

                        <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
                          {templateName && templates.some(t => t.name === templateName) 
                            ? '⚠️ Atención: Subir una plantilla para un trámite con plantilla existente sobrescribirá el archivo maestro anterior.' 
                            : 'Las plantillas subidas se utilizarán como base interactiva para la inyección de datos de los clientes.'}
                        </p>
                      </form>
                    </div>
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
