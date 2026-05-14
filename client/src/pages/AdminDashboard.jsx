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
  const [templateName, setTemplateName] = useState('fondos');
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
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
    if (!templateFile) return toast.error(t('userDocs.selectPdf'));
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
                <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>{t('admin.templatesStatus')}</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: `1px solid ${BORDER}` }}>
                        <thead style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}` }}>
                          <tr style={{ fontSize: '10px', color: '#64748b', fontWeight: 800 }}>
                            <th style={{ padding: '12px' }}>{t('admin.processType')}</th>
                            <th style={{ padding: '12px' }}>{t('admin.currentStatus')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { id: 'fondos', label: getFormTypeLabel('Fondos Registros contables', lang) },
                            { id: 'corporacion', label: getFormTypeLabel('Corporación', lang) },
                            { id: 'fundaciones', label: getFormTypeLabel('Fundaciones', lang) },
                            { id: 'cumplimiento_individual', label: getFormTypeLabel('Cumplimiento Individual', lang) },
                            { id: 'cumplimiento_entidades', label: getFormTypeLabel('Cumplimiento Entidades', lang) }
                          ].map(type => {
                            const customTemplate = templates.find(t => t.name === type.id);
                            return (
                              <tr key={type.id} style={{ borderBottom: `1px solid ${BORDER}`, fontSize: '12px' }}>
                                <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{type.label}</td>
                                <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {customTemplate ? (
                                        <>
                                            <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>✅ {t('admin.customDb')}</span>
                                            <button 
                                                onClick={() => handleDeleteTemplate(type.id)}
                                                style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Eliminar plantilla (Desactiva la generación de PDF para este trámite)"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    ) : (
                                        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>⚠️ {t('admin.noTemplate')}</span>
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
                      <h3 style={{ fontSize: '14px', fontWeight: 700 }}>{t('admin.uploadReplace')}</h3>
                    </div>
                    <form onSubmit={handleTemplateUpload} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                      <div className="field-group-admin">
                        <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.processToLink')}</label>
                        <select className="input-modern-admin" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={{ cursor: 'pointer' }}>
                          <option value="fondos">{getFormTypeLabel('Fondos Registros contables', lang)}</option>
                          <option value="corporacion">{getFormTypeLabel('Corporación', lang)}</option>
                          <option value="fundaciones">{getFormTypeLabel('Fundaciones', lang)}</option>
                          <option value="cumplimiento_individual">{getFormTypeLabel('Cumplimiento Individual', lang)}</option>
                          <option value="cumplimiento_entidades">{getFormTypeLabel('Cumplimiento Entidades', lang)}</option>
                        </select>
                      </div>
                      <div className="field-group-admin">
                        <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('userDocs.pdfLabel')}</label>
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
                        {uploadingTemplate ? t('register.processing').toUpperCase() : (templates.some(t => t.name === templateName) ? t('admin.updateExisting') : t('admin.uploadNew'))}
                      </button>
                      <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
                        {templates.some(t => t.name === templateName) ? t('admin.overwriteNotice') : t('admin.injectNotice')}
                      </p>
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
