import React, { useState, useEffect } from 'react';
import { Users, FileText, Settings, LogOut, CheckCircle, XCircle, Trash2, Search, Clock, Shield, ChevronLeft, ChevronRight, Eye, EyeOff, Key, ShieldOff, UploadCloud, SearchCheck, Building2, User, BadgeCheck, UserCog, ChevronDown, ChevronUp, X, Edit2, Plus, Mail } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import API_BASE_URL from '../config';
import { useT, useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

/** Trámites que generan PDF con motor HTML (no dependen de AcroForm). */
const HTML_ENGINE_TEMPLATES = Object.freeze([
  'fondos',
  'corporacion',
  'fundaciones',
  'cumplimiento_individual',
  'cumplimiento_entidades',
]);

const renderFormDataValue = (value, t) => {
  if (value === null || value === undefined || value === '') return <span style={{ color: '#94a3b8' }}>—</span>;
  if (typeof value === 'boolean') return value ? t('admin.yes') : t('admin.no');
  
  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: '#94a3b8' }}>{t('admin.none')}</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '4px 0' }}>
        {value.map((v, i) => (
          <div key={i} style={{ padding: typeof v === 'object' ? '8px 12px' : '0', background: typeof v === 'object' ? '#ffffff' : 'transparent', border: typeof v === 'object' ? '1px solid #e2e8f0' : 'none', borderRadius: '6px' }}>
            {typeof v === 'object' ? renderFormDataValue(v, t) : String(v)}
          </div>
        ))}
      </div>
    );
  }
  
  if (typeof value === 'object') {
    try {
      const keys = Object.keys(value);
      if (keys.length === 0) return <span style={{ color: '#94a3b8' }}>{t('admin.empty')}</span>;
      return (
        <ul style={{ margin: 0, paddingLeft: '18px', listStyleType: 'circle', color: '#475569' }}>
          {keys.map(k => (
            <li key={k} style={{ marginBottom: '4px', fontSize: '12px' }}>
              <strong style={{ color: '#334155' }}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> 
              <span style={{ marginLeft: '6px', color: '#1e293b' }}>{typeof value[k] === 'object' ? renderFormDataValue(value[k], t) : String(value[k])}</span>
            </li>
          ))}
        </ul>
      );
    } catch {
      return JSON.stringify(value);
    }
  }
  return String(value);
};

const adminStatusLabel = (status, t) => {
  const key = `admin.status_${status || 'pending'}`;
  const label = t(key);
  return label === key ? String(status || 'pending').toUpperCase() : label;
};

const adminRoleLabel = (roleOverride, t) => {
  if (roleOverride === 'master') return t('admin.roleMaster');
  if (roleOverride === 'manager') return t('admin.roleManager');
  return t('admin.roleClient');
};

const AdminDashboard = () => {
  const t = useT();
  const { lang } = useLang();
  const locale = lang === 'en' ? 'en-US' : 'es-EC';
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
  const [templateUploadMode, setTemplateUploadMode] = useState('base');
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [lastDetectedFields, setLastDetectedFields] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const [consultaSearch, setConsultaSearch] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    nombres: '',
    ruc: '',
    codigoUnico: '',
    usuario: '',
    empresa: '',
    formType: ''
  });
  const [consultaResults, setConsultaResults] = useState(null);
  const [consultaDocuments, setConsultaDocuments] = useState([]);
  const [consultaCatalogPeople, setConsultaCatalogPeople] = useState([]);
  const [consultaSummary, setConsultaSummary] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedTemplateForConfig, setSelectedTemplateForConfig] = useState(null);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ name: '', email: '', idNumber: '', roleOverride: 'client' });
  const [creatingUser, setCreatingUser] = useState(false);

  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [newRoleOverride, setNewRoleOverride] = useState('client');
  const [changingRole, setChangingRole] = useState(false);

  const [consultaLoading, setConsultaLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserForms, setSelectedUserForms] = useState(null);
  const [selectedUserDocuments, setSelectedUserDocuments] = useState([]);
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [viewingFormData, setViewingFormData] = useState(null);

  const handleDownloadDoc = async (docId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/user-documents/${docId}/download`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' }));
      window.open(blobUrl, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.msg || t('admin.errDownloadDoc'));
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm(t('admin.confirmDeleteDoc'))) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_BASE_URL}/api/admin/user-documents/${docId}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success(res.data.msg || t('admin.docDeleted'));
      setSelectedUserDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      toast.error(err.response?.data?.msg || t('admin.errDeleteDoc'));
    }
  };

  // Admin Form & User Edit/Delete Modals State
  const [editingForm, setEditingForm] = useState(null);
  const [editFormDataJson, setEditFormDataJson] = useState('');
  const [savingFormEdit, setSavingFormEdit] = useState(false);

  const [deletingForm, setDeletingForm] = useState(null);
  const [deletingFormLoading, setDeletingFormLoading] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', email: '', idNumber: '', nationality: '' });
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  const itemsPerPage = 15;
  const navigate = useNavigate();
  const toast = useToast();

  const handleOpenEditForm = (item) => {
    setEditingForm(item);
    setEditFormDataJson(JSON.stringify(item.formData || {}, null, 2));
  };

  const handleSaveEditForm = async () => {
    if (!editingForm) return;
    setSavingFormEdit(true);
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(editFormDataJson);
      } catch (jsonErr) {
        toast.error(t('admin.invalidJson'));
        setSavingFormEdit(false);
        return;
      }

      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_BASE_URL}/api/admin/forms/${editingForm.formId}`, {
        data: parsedData,
        formType: editingForm.formType
      }, {
        headers: { 'x-auth-token': token }
      });

      toast.success(res.data.msg || t('admin.formUpdated'));
      setEditingForm(null);

      if (consultaResults) {
        setConsultaResults(prev => prev.map(r => r.formId === editingForm.formId ? { ...r, formData: parsedData } : r));
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || t('admin.errUpdateForm'));
    } finally {
      setSavingFormEdit(false);
    }
  };

  const handleConfirmDeleteForm = async () => {
    if (!deletingForm) return;
    setDeletingFormLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_BASE_URL}/api/admin/forms/${deletingForm.formId}`, {
        headers: { 'x-auth-token': token }
      });

      toast.success(res.data.msg || t('admin.formDeletedOk'));
      setDeletingForm(null);

      if (consultaResults) {
        setConsultaResults(prev => prev.filter(r => r.formId !== deletingForm.formId));
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || t('admin.errDeleteForm'));
    } finally {
      setDeletingFormLoading(false);
    }
  };

  const handleOpenEditUser = (item) => {
    setEditingUser(item);
    setEditUserForm({
      name: item.userName || '',
      email: item.userEmail || '',
      idNumber: item.personPassport || item.userCode || '',
      nationality: ''
    });
  };

  const handleSaveEditUser = async () => {
    if (!editingUser || !editingUser.userId) {
      toast.error(t('admin.noUserId'));
      return;
    }
    setSavingUserEdit(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_BASE_URL}/api/admin/users/${editingUser.userId}/info`, editUserForm, {
        headers: { 'x-auth-token': token }
      });

      toast.success(res.data.msg || t('admin.userInfoUpdated'));
      setEditingUser(null);

      if (consultaResults) {
        setConsultaResults(prev => prev.map(r => r.userId === editingUser.userId ? { ...r, userName: editUserForm.name, userEmail: editUserForm.email } : r));
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || t('admin.errUpdateUserInfo'));
    } finally {
      setSavingUserEdit(false);
    }
  };

  const PRIMARY = '#0f172a';
  const ACCENT_TEAL = '#0f766e';
  const BORDER = '#e2e8f0';
  const RADIUS = '8px';
  const RADIUS_LG = '12px';

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, searchTerm]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/admin/users/create`, createUserForm, {
        headers: { 'x-auth-token': token }
      });
      toast.success(t('admin.userCreated'));
      setShowCreateUserModal(false);
      setCreateUserForm({ name: '', email: '', idNumber: '', roleOverride: 'client' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.msg || t('admin.errCreateUser'));
    } finally {
      setCreatingUser(false);
    }
  };

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers: { 'x-auth-token': token } });
        const payload = res.data;
        if (typeof payload === 'string') {
          toast.error(t('admin.errUsersNotJson'));
          setUsers([]);
        } else {
          const list = Array.isArray(payload) ? payload : (payload?.users || []);
          setUsers(Array.isArray(list) ? list : []);
          if (!Array.isArray(list) || (payload && !Array.isArray(payload) && payload.msg && !payload.users)) {
            toast.error(payload?.msg || t('admin.errReadUsers'));
          }
        }
      } else if (activeTab === 'logs') {
        const params = { page: currentPage, limit: itemsPerPage };
        if (searchTerm.trim()) params.q = searchTerm.trim();
        const res = await axios.get(`${API_BASE_URL}/api/admin/logs`, {
          headers: { 'x-auth-token': token },
          params
        });
        const payload = res.data;
        const list = Array.isArray(payload) ? payload : (payload?.logs || []);
        setLogs(Array.isArray(list) ? list : []);
        setLogsTotal(payload?.total ?? (Array.isArray(list) ? list.length : 0));
        setLogsTotalPages(payload?.totalPages ?? 1);
        if (payload?.msg && !list.length) toast.error(payload.msg);
      } else if (activeTab === 'templates') {
        const res = await axios.get(`${API_BASE_URL}/api/admin/templates`, { headers: { 'x-auth-token': token } });
        const payload = res.data;
        const htmlStatus = HTML_ENGINE_TEMPLATES.map((id) => ({ id, kind: 'html', available: true }));
        if (Array.isArray(payload)) {
          setTemplates(payload);
          setTemplateStatus(htmlStatus);
        } else {
          setTemplates(Array.isArray(payload?.templates) ? payload.templates : []);
          setTemplateStatus(Array.isArray(payload?.status) && payload.status.length ? payload.status : htmlStatus);
        }
      }
    } catch (err) { 
      if (err.response?.status === 401) { localStorage.clear(); navigate('/'); return; }
      console.error(err);
      toast.error(err.response?.data?.msg || t('admin.errLoadAdmin'));
    } finally { setLoading(false); }
  };

  const handleStatusChange = async (userId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_BASE_URL}/api/admin/users/${userId}/status`, { status: newStatus }, { headers: { 'x-auth-token': token } });
      fetchData();
      toast.success(t('admin.statusUpdated'));
    } catch (err) { 
        if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
        toast.error(t('admin.errGeneric')); 
    }
  };

  const handleDeleteUser = async (userId) => {
    const token = localStorage.getItem('token');
    if (window.confirm(t('admin.confirmDeleteUser'))) {
      try {
        const res = await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, { headers: { 'x-auth-token': token } });
        fetchData();
        toast.success(res.data?.msg || t('admin.userDeletedDb'));
      } catch (err) { 
          if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
          toast.error(err.response?.data?.msg || t('admin.errDeleteUser')); 
      }
    }
  };

  const handlePurgeInactiveUsers = async () => {
    if (!window.confirm(t('admin.confirmPurge'))) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/admin/users/purge-inactive`, {}, {
        headers: { 'x-auth-token': token }
      });
      toast.success(res.data?.msg || t('admin.purgeDone'));
      fetchData();
    } catch (err) {
      toast.error(t('admin.errPurge'));
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/auth/update-profile`, { email: adminEmail }, { headers: { 'x-auth-token': token } });
      toast.success(t('admin.emailUpdated'));
    } catch (err) { 
        if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
        toast.error(err.response?.data?.msg || t('admin.errUpdateEmail')); 
    } finally { setSavingSettings(false); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/auth/update-profile`, { newPassword }, { headers: { 'x-auth-token': token } });
      toast.success(t('admin.passwordUpdated'));
      setNewPassword('');
    } catch (err) { 
        if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
        toast.error(err.response?.data?.msg || t('admin.errUpdatePassword')); 
    } finally { setSavingSettings(false); }
  };
  const handleChangeRoleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForRole) return;
    setChangingRole(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/admin/users/${selectedUserForRole.id}/role`, { roleOverride: newRoleOverride }, {
        headers: { 'x-auth-token': token }
      });
      toast.success(t('admin.roleChanged'));
      setShowChangeRoleModal(false);
      setSelectedUserForRole(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.msg || t('admin.errChangeRole'));
    } finally {
      setChangingRole(false);
    }
  };

  const handleResetPassword = async (userId) => {
    if (window.confirm(t('admin.confirmResetPassword'))) {
      const token = localStorage.getItem('token');
      try {
        await axios.post(`${API_BASE_URL}/api/admin/users/${userId}/reset-password`, {}, { headers: { 'x-auth-token': token } });
        toast.success(t('admin.passwordSent'));
      } catch (err) { 
          if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
          toast.error(t('admin.errReset')); 
      }
    }
  };

  const handleTemplateUpload = async (e) => {
    e.preventDefault();
    if (!templateFile) return toast.error(t('admin.selectPdf'));
    
    const finalTemplateName = templateUploadMode === 'custom' ? customTemplateName : templateName;
    if (templateUploadMode === 'custom' && !finalTemplateName.trim()) {
      return toast.error(t('admin.enterTemplateName'));
    }

    setUploadingTemplate(true);
    
    const formData = new FormData();
    formData.append('template', templateFile);
    formData.append('name', finalTemplateName.trim());

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
      toast.error(t('admin.errUploadTemplate'));
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (name) => {
    if (!window.confirm(t('admin.confirmDeleteTemplate', { name }))) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/delete-template/${name}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success(t('admin.templateDeleted'));
      fetchData();
    } catch (err) {
      toast.error(t('admin.errDeleteTemplate'));
    }
  };

  const handleEditTemplate = (name) => {
    setTemplateUploadMode('custom');
    setCustomTemplateName(name);
    toast.info(t('admin.selectReplacePdf'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConsultaSearch = async (e) => {
    e && e.preventDefault();
    const token = localStorage.getItem('token');
    const { nombres, ruc, codigoUnico, usuario, empresa, formType } = searchFilters;
    setConsultaLoading(true);
    setExpandedPerson(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/search-person`, {
        headers: { 'x-auth-token': token },
        params: { nombres, ruc, codigoUnico, usuario, empresa, formType }
      });
      setConsultaResults(res.data.results || []);
      setConsultaDocuments(res.data.matchingDocuments || []);
      setConsultaCatalogPeople(res.data.catalogPeople || []);
      setConsultaSummary(res.data.summary || null);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
      toast.error(err.response?.data?.msg || t('admin.errSearch'));
    } finally { setConsultaLoading(false); }
  };

  const handleExportSearchPdf = async () => {
    const token = localStorage.getItem('token');
    const { nombres, ruc, codigoUnico, usuario, empresa, formType } = searchFilters;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/export-search-pdf`, {
        headers: { 'x-auth-token': token },
        params: { nombres, ruc, codigoUnico, usuario, empresa, formType },
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(blobUrl, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.msg || t('admin.errExportPdf'));
    }
  };

  const handleViewUserForms = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/user-forms/${userId}`, {
        headers: { 'x-auth-token': token }
      });
      setSelectedUser(res.data.user);
      setSelectedUserForms(res.data.forms);
      setSelectedUserDocuments(res.data.documents || []);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
      toast.error(t('admin.errLoadForms'));
    }
  };

  const logout = () => { localStorage.clear(); window.location.replace('/'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div style={{ width: '240px', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '25px 16px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '35px', padding: '0 8px' }}>
          <div style={{ padding: '6px', background: 'rgba(20, 184, 166, 0.2)', border: '1px solid rgba(45, 212, 191, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#2dd4bf" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.3px', color: '#ffffff' }}>{t('admin.brand')}</span>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[{ id: 'users', icon: Users, label: t('admin.users') }, { id: 'consultas', icon: SearchCheck, label: t('admin.consultas') }, { id: 'logs', icon: Clock, label: t('admin.audit') }, { id: 'templates', icon: FileText, label: t('admin.templates') }, { id: 'change-password', icon: Key, label: t('admin.changePassword') }, { id: 'change-email', icon: Mail, label: t('admin.changeEmail') }].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setCurrentPage(1); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 15px', border: 'none', background: activeTab === item.id ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(15, 118, 110, 0.4) 100%)' : 'transparent', color: activeTab === item.id ? '#ffffff' : '#cbd5e1', cursor: 'pointer', fontWeight: 600, fontSize: '12.5px', borderRadius: RADIUS, borderLeft: activeTab === item.id ? '4px solid #2dd4bf' : '4px solid transparent', transition: 'all 0.2s ease' }}>
              <item.icon size={16} color={activeTab === item.id ? '#2dd4bf' : '#94a3b8'} /> {item.label}
            </button>
          ))}
        </nav>
        <LanguageSwitcher variant="sidebar" />
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '11.5px', borderRadius: RADIUS, marginTop: 15, transition: 'all 0.2s ease' }}>
          <LogOut size={15} color="#ef4444" /> {t('sidebar.logout')}
        </button>
      </div>

      <div style={{ flex: 1, padding: '35px 45px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1000px' }}>
          <header style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <h1>{t('admin.masterTitle')}</h1>
            {activeTab === 'users' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handlePurgeInactiveUsers} title={t('admin.purgeInactiveTitle')} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: RADIUS, fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                  <Trash2 size={15} /> {t('admin.purgeInactive')}
                </button>
                <button onClick={() => setShowCreateUserModal(true)} className="btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> {t('admin.createUser')}
                </button>
              </div>
            )}
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
                    <th style={{ padding: '12px 15px' }}>{t('admin.colId')}</th>
                    <th style={{ padding: '12px 15px' }}>{t('admin.user')}</th>
                    <th style={{ padding: '12px 15px' }}>{t('admin.role')}</th>
                    <th style={{ padding: '12px 15px' }}>{t('admin.status')}</th>
                    <th style={{ padding: '12px 15px' }}>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                        {t('admin.loadingUsers')}
                      </td>
                    </tr>
                  ) : !Array.isArray(users) || users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        {t('admin.noUsers')}
                      </td>
                    </tr>
                  ) : users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                      <td style={{ padding: '12px 15px', fontWeight: 700, color: PRIMARY }}>{user.uniqueCode}</td>
                      <td style={{ padding: '12px 15px' }}>{user.name}</td>
                      <td style={{ padding: '12px 15px' }}>
                        {user.roleOverride === 'master' ? (
                          <span style={{ padding: '3px 8px', borderRadius: '20px', background: '#fef08a', fontSize: '9px', color: '#854d0e', fontWeight: 800 }}>{t('admin.roleMaster')}</span>
                        ) : (
                          <span style={{ padding: '3px 8px', borderRadius: '20px', background: user.roleOverride === 'manager' ? '#e0f2fe' : '#f1f5f9', fontSize: '9px', color: user.roleOverride === 'manager' ? '#0284c7' : '#64748b', fontWeight: 700 }}>
                            {adminRoleLabel(user.roleOverride, t)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '20px', background: user.status === 'authorized' ? '#dcfce7' : '#fee2e2', fontSize: '9px', color: user.status === 'authorized' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{adminStatusLabel(user.status, t)}</span>
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button onClick={() => handleStatusChange(user.id, 'authorized')} title={t('admin.authorize')} style={{ border: `1px solid ${BORDER}`, background: '#f0fdf4', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={14} /></button>
                          <button onClick={() => handleStatusChange(user.id, 'blocked')} title={t('admin.revoke')} style={{ border: `1px solid ${BORDER}`, background: '#fffbeb', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#d97706', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ShieldOff size={14} /></button>
                          {user.roleOverride !== 'master' && (
                            <button onClick={() => { setSelectedUserForRole(user); setNewRoleOverride(user.roleOverride || 'client'); setShowChangeRoleModal(true); }} title={t('admin.changeRole')} style={{ border: '1px solid #bae6fd', background: '#f0f9ff', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><UserCog size={14} /></button>
                          )}
                          <button onClick={() => handleResetPassword(user.id)} title={t('admin.resetKey')} style={{ border: `1px solid ${BORDER}`, background: '#f8fafc', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Key size={14} /></button>
                          <button onClick={() => handleDeleteUser(user.id)} title={t('admin.deleteUser')} style={{ border: '1px solid #fecaca', background: '#fef2f2', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
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
                        <td style={{ padding: '10px 15px', color: '#666' }}>{new Date(log.createdAt).toLocaleString(locale)}</td>
                        <td style={{ padding: '10px 15px' }}><span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}>{log.action}</span></td>
                        <td style={{ padding: '10px 15px', fontWeight: 600 }}>{log.User?.name || log.user?.name || t('admin.system')}</td>
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
                <div style={{ background: '#f8fafc', padding: 24, borderRadius: RADIUS, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ background: '#e0f2fe', padding: 8, borderRadius: 8 }}>
                      <Search size={18} color="#0284c7" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 800 }}>{t('admin.searchTitle')}</h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{t('admin.searchSubtitle')}</p>
                    </div>
                  </div>
                  <form onSubmit={handleConsultaSearch} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('admin.names')}</label>
                        <input type="text" value={searchFilters.nombres} onChange={e => setSearchFilters({...searchFilters, nombres: e.target.value})}
                          placeholder={t('admin.phNames')}
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('admin.ruc')}</label>
                        <input type="text" value={searchFilters.ruc} onChange={e => setSearchFilters({...searchFilters, ruc: e.target.value})}
                          placeholder={t('admin.phRuc')}
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('admin.uniqueCode')}</label>
                        <input type="text" value={searchFilters.codigoUnico} onChange={e => setSearchFilters({...searchFilters, codigoUnico: e.target.value})}
                          placeholder={t('admin.phCode')}
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('admin.userFilter')}</label>
                        <input type="text" value={searchFilters.usuario} onChange={e => setSearchFilters({...searchFilters, usuario: e.target.value})}
                          placeholder={t('admin.phUser')}
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('admin.companyName')}</label>
                        <input type="text" value={searchFilters.empresa} onChange={e => setSearchFilters({...searchFilters, empresa: e.target.value})}
                          placeholder={t('admin.phCompany')}
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('admin.formTypeLabel')}</label>
                        <select 
                          value={searchFilters.formType} 
                          onChange={e => setSearchFilters({...searchFilters, formType: e.target.value})}
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="">{t('admin.allForms')}</option>
                          <option value="corporacion">{t('admin.formCorp')}</option>
                          <option value="fundacion">{t('admin.formFund')}</option>
                          <option value="cumplimiento-entidad">{t('admin.formKyce')}</option>
                          <option value="cumplimiento-individual">{t('admin.formKyci')}</option>
                          <option value="fondos">{t('admin.formFunds')}</option>
                        </select>
                      </div>

                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
                      {consultaResults && (
                        <button type="button" onClick={handleExportSearchPdf} style={{ padding: '12px 24px', fontWeight: 800, background: '#0f766e', color: 'white', border: 'none', borderRadius: RADIUS, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={16} /> {t('admin.downloadPdfReport')}
                        </button>
                      )}
                      <button type="submit" disabled={consultaLoading} className="btn-primary" style={{ padding: '12px 40px', fontWeight: 800, letterSpacing: '0.5px' }}>
                        {consultaLoading ? t('admin.searching') : t('admin.runSearch')}
                      </button>
                    </div>
                  </form>
                </div>

                {consultaResults && consultaResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <SearchCheck size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p style={{ fontSize: 13 }}>{t('admin.noSearchResults')}</p>
                  </div>
                )}

                {consultaSummary && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: RADIUS, padding: '14px 18px' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{consultaSummary.totalResults || 0}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', marginTop: 2 }}>{t('admin.formsFound')}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: RADIUS, padding: '14px 18px' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{consultaDocuments ? consultaDocuments.length : 0}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', marginTop: 2 }}>{t('admin.attachedDocs')}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, background: '#fefce8', border: '1px solid #fde68a', borderRadius: RADIUS, padding: '14px 18px' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#a16207' }}>{consultaSummary.uniqueUsers || 0}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#facc15', marginTop: 2 }}>{t('admin.associatedUsers')}</div>
                    </div>
                  </div>
                )}

                {/* SECCIÓN 1: FORMULARIOS CREADOS / DISPONIBLES */}
                {consultaResults && consultaResults.length > 0 && (
                  <div style={{ marginBottom: 35 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                        <FileText size={18} color="#15803d" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 800 }}>
                          {t('admin.formsCreatedTitle', { count: consultaResults.length })}
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                          {t('admin.formsCreatedSubtitle')}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {consultaResults.map((r, idx) => {
                        const isExpanded = expandedPerson === idx;
                        const fd = r.formData || {};

                        return (
                          <div key={`${r.formId}-${idx}`} style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                  <h3 style={{ margin: 0, fontSize: 15, color: '#0f766e', fontWeight: 800 }}>{r.entityName || t('admin.formGeneric')}</h3>
                                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, marginRight: 8, fontWeight: 700 }}>{r.formType}</span>
                                    {t('admin.uploadedBy')} <button onClick={() => handleViewUserForms(r.userId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PRIMARY, fontWeight: 600, textDecoration: 'underline', padding: 0 }}>{r.userName}</button> ({r.userCode || t('admin.noCode')}) {t('admin.onDate')} {new Date(r.formDate).toLocaleDateString(locale)}
                                    <button onClick={() => handleOpenEditUser(r)} title={t('admin.editUser')} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', color: '#0369a1', fontSize: 10, fontWeight: 700, padding: '2px 6px', marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                      <UserCog size={10} /> {t('admin.editUser')}
                                    </button>
                                  </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button onClick={() => handleOpenEditForm(r)} title={t('admin.editForm')} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Edit2 size={12} /> {t('common.edit')}
                                </button>
                                <button onClick={() => setDeletingForm(r)} title={t('admin.deleteForm')} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Trash2 size={12} /> {t('common.delete')}
                                </button>
                                <button onClick={() => setExpandedPerson(isExpanded ? null : idx)} className="btn-primary" style={{ padding: '6px 16px', fontSize: 11 }}>
                                  {isExpanded ? t('admin.seeLess') : t('admin.seeMore')}
                                </button>
                              </div>
                            </div>
                            
                            {/* Matched Form Sections & Roles Banner */}
                            {r.matchedSections && r.matchedSections.length > 0 && (
                              <div style={{ background: '#f0fdf4', padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>📍</span> {t('admin.exactRoles', { count: r.matchedSections.length })}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {r.matchedSections.map((ms, msIdx) => (
                                    <div key={msIdx} style={{ background: 'white', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ background: '#dcfce7', color: '#16a34a', fontWeight: 800, padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
                                        {ms.section}
                                      </span>
                                      <span style={{ color: '#0f172a', fontWeight: 700 }}>
                                        {ms.role}
                                      </span>
                                      {ms.name && (
                                        <span style={{ color: '#475569' }}>
                                          ({ms.name} {ms.idNumber ? `- ${ms.idNumber}` : ''})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Extracted Participants Grid */}
                            <div style={{ padding: '16px 20px', borderTop: `1px solid ${BORDER}` }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Users size={14} color="#0f766e" />
                                {t('admin.peopleInForm', { count: r.participants ? r.participants.length : 0 })}
                              </div>
                              {r.participants && r.participants.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                                  {r.participants.map((part, pIdx) => {
                                    const queryTerm = (searchFilters.ruc || searchFilters.nombres || searchFilters.codigoUnico || '').toLowerCase().trim();
                                    const isMatched = queryTerm && (
                                      (part.name && part.name.toLowerCase().includes(queryTerm)) ||
                                      (part.idNumber && part.idNumber.toLowerCase().includes(queryTerm))
                                    );
                                    return (
                                      <div key={pIdx} style={{ background: isMatched ? '#f0fdf4' : '#f8fafc', border: `1px solid ${isMatched ? '#86efac' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                          <span style={{ background: isMatched ? '#dcfce7' : '#e0f2fe', color: isMatched ? '#16a34a' : '#0369a1', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                                            {part.role}
                                          </span>
                                          {isMatched && (
                                            <span style={{ background: '#16a34a', color: 'white', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 10 }}>
                                              {t('admin.match')}
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{part.name}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                          📄 ID: <strong>{part.idNumber || '—'}</strong>
                                          {part.nationality && <span> &middot; 🌐 {part.nationality}</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: 12, color: '#64748b' }}>{t('admin.noPeopleHint')}</div>
                              )}
                            </div>

                            {/* Full Table when expanded */}
                            {isExpanded && (
                              <div style={{ borderTop: `1px solid ${BORDER}`, padding: '0', background: '#f8fafc' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: '#f1f5f9', borderBottom: `1px solid ${BORDER}` }}>
                                      <tr style={{ fontSize: 10, color: '#475569', fontWeight: 800 }}>
                                        <th style={{ padding: '12px 20px', width: '35%' }}>{t('admin.allFormFields')}</th>
                                        <th style={{ padding: '12px 20px', width: '65%' }}>{t('admin.registeredValue')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Object.entries(fd).length > 0 ? (
                                          Object.entries(fd).map(([key, value], i) => (
                                            <tr key={key} style={{ borderBottom: `1px solid #f1f5f9`, fontSize: 12, background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                              <td style={{ padding: '12px 20px', fontWeight: 700, color: '#334155', wordBreak: 'break-word' }}>
                                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                              </td>
                                              <td style={{ padding: '12px 20px', color: '#1e293b', wordBreak: 'break-word' }}>
                                                {renderFormDataValue(value, t)}
                                              </td>
                                            </tr>
                                          ))
                                      ) : (
                                          <tr>
                                            <td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                                                {t('admin.noExtraData')}
                                            </td>
                                          </tr>
                                      )}
                                    </tbody>
                                  </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECCIÓN 2: DOCUMENTOS ADJUNTOS Y FIRMADOS DISPONIBLES */}
                {consultaDocuments && consultaDocuments.length > 0 && (
                  <div style={{ marginBottom: 35 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ background: '#e0f2fe', padding: 8, borderRadius: 8, border: '1px solid #bae6fd' }}>
                        <UploadCloud size={18} color="#0284c7" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 800 }}>
                          {t('admin.docsSectionTitle', { count: consultaDocuments.length })}
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                          {t('admin.docsSectionSubtitle')}
                        </p>
                      </div>
                    </div>

                    <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}` }}>
                          <tr style={{ fontSize: 10, color: '#64748b', fontWeight: 800 }}>
                            <th style={{ padding: '12px 16px' }}>{t('admin.fileTitle')}</th>
                            <th style={{ padding: '12px 16px' }}>{t('admin.typeStatus')}</th>
                            <th style={{ padding: '12px 16px' }}>{t('admin.ownerUser')}</th>
                            <th style={{ padding: '12px 16px' }}>{t('admin.uploadDate')}</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('admin.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consultaDocuments.map(doc => (
                            <tr key={`${doc.type}-${doc.id}`} style={{ borderBottom: `1px solid ${BORDER}`, fontSize: 11 }}>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                                📄 {doc.filename}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ background: doc.type === 'SignedDocument' ? '#dcfce7' : '#e0f2fe', color: doc.type === 'SignedDocument' ? '#15803d' : '#0369a1', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
                                  {doc.signatureStatus || doc.type}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600 }}>
                                {doc.userName} ({doc.userCode || doc.userEmail || t('admin.ownerClient')})
                              </td>
                              <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                {new Date(doc.createdAt).toLocaleDateString(locale)}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                  <button onClick={() => handleDownloadDoc(doc.id)} title={t('admin.download')} style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '6px 12px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {t('admin.download')}
                                  </button>
                                  <button onClick={() => handleDeleteDoc(doc.id)} title={t('common.delete')} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '6px 12px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Trash2 size={12} /> {t('common.delete')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Estado Inicial sin búsquedas */}
                {!consultaResults && !consultaLoading && (
                  <div style={{ textAlign: 'center', padding: 50, color: '#cbd5e1' }}>
                    <Building2 size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>{t('admin.emptySearchHint')}</p>
                  </div>
                )}

                {viewingFormData && (
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '90%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h2 style={{ fontSize: 18, margin: 0, color: '#0f766e', fontWeight: 800 }}>
                            {viewingFormData.entityName || t('admin.formDataTitle')}
                          </h2>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                            {t('admin.uploadedByModal', { type: viewingFormData.formType, name: viewingFormData.userName, email: viewingFormData.userEmail })}
                          </p>
                        </div>
                        <button onClick={() => setViewingFormData(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                      </div>
                      <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: `1px solid ${BORDER}`, borderRadius: RADIUS, overflow: 'hidden', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          <thead style={{ background: '#f1f5f9', borderBottom: `1px solid ${BORDER}` }}>
                            <tr style={{ fontSize: 11, color: '#475569', fontWeight: 800 }}>
                              <th style={{ padding: '14px 20px', width: '35%' }}>{t('admin.field')}</th>
                              <th style={{ padding: '14px 20px', width: '65%' }}>{t('admin.enteredValue')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingFormData.formData && Object.keys(viewingFormData.formData).length > 0 ? (
                              Object.entries(viewingFormData.formData).map(([key, value], idx) => (
                                <tr key={key} style={{ borderBottom: `1px solid #f1f5f9`, fontSize: 13, background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                  <td style={{ padding: '12px 20px', fontWeight: 700, color: '#334155', wordBreak: 'break-word' }}>
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                  </td>
                                  <td style={{ padding: '12px 20px', color: '#1e293b', wordBreak: 'break-word' }}>
                                    {renderFormDataValue(value, t)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                                  {t('admin.noFormData')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, textAlign: 'right' }}>
                        <button onClick={() => setViewingFormData(null)} className="btn-primary" style={{ padding: '8px 16px' }}>{t('admin.close')}</button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {activeTab === 'change-email' && (
              <div style={{ padding: '30px', maxWidth: '450px' }}>
                <h3 style={{ marginBottom: '20px' }}>{t('admin.updateEmailTitle')}</h3>
                <form onSubmit={handleUpdateEmail} style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: '40px' }}>
                  <div className="field-group-admin">
                    <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.email')}</label>
                    <input className="input-modern-admin" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                  </div>
                  <button type="submit" disabled={savingSettings} className="btn-primary" style={{ width: '100%', marginTop: 10 }}>
                    {savingSettings ? t('admin.saving') : t('admin.updateEmailBtn')}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'change-password' && (
              <div style={{ padding: '30px', maxWidth: '450px' }}>
                <h3 style={{ marginBottom: '20px' }}>{t('admin.updatePasswordTitle')}</h3>
                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <div className="field-group-admin">
                    <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.newPassword')}</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        className="input-modern-admin" 
                        type={showPassword ? 'text' : 'password'} 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        required
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
                    {savingSettings ? t('admin.saving') : t('admin.updatePasswordBtn')}
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
                          {(() => {
                            const baseTypes = [
                              { id: 'fondos', label: t('admin.processFondos') },
                              { id: 'corporacion', label: t('admin.processCorp') },
                              { id: 'fundaciones', label: t('admin.processFund') },
                              { id: 'cumplimiento_individual', label: t('admin.processKyci') },
                              { id: 'cumplimiento_entidades', label: t('admin.processKyce') }
                            ];
                            const baseIds = baseTypes.map(bt => bt.id);
                            const dynamicTypes = templates.filter(tpl => !baseIds.includes(tpl.name)).map(tpl => ({
                                id: tpl.name,
                                label: `${tpl.name.replace(/_/g, ' ').toUpperCase()} ${t('admin.dynamicSuffix')}`
                            }));
                            const allTypes = [...baseTypes, ...dynamicTypes];
                            
                            return allTypes.map(type => {
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
                                              <>
                                              <button 
                                                  onClick={() => handleEditTemplate(type.id)}
                                                  style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                  title={t('admin.editTemplateTitle')}
                                              >
                                                  <Edit2 size={14} />
                                              </button>
                                              {customTemplate && (
                                              <button 
                                                  onClick={() => handleDeleteTemplate(type.id)}
                                                  style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                  title={t('admin.deleteTemplateTitle')}
                                              >
                                                  <Trash2 size={14} />
                                              </button>
                                              )}
                                              </>
                                          </>
                                      ) : (
                                          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>{t('admin.noTemplate')}</span>
                                      )}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                  </div>
                  
                  <div style={{ flex: 1, background: '#f8fafc', padding: '25px', borderRadius: RADIUS_LG, border: `1px dashed #cbd5e1` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <UploadCloud size={20} color={PRIMARY} />
                      <h3 style={{ fontSize: '14px', fontWeight: 700 }}>{t('admin.uploadReplace')}</h3>
                    </div>
                    <form onSubmit={handleTemplateUpload} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                      <div className="field-group-admin" style={{ display: 'flex', gap: '15px', marginBottom: 5 }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input type="radio" checked={templateUploadMode === 'base'} onChange={() => setTemplateUploadMode('base')} /> {t('admin.systemProcess')}
                        </label>
                        <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input type="radio" checked={templateUploadMode === 'custom'} onChange={() => setTemplateUploadMode('custom')} /> {t('admin.dynamicTemplate')}
                        </label>
                      </div>

                      <div className="field-group-admin">
                        <label style={{ fontSize: '10px', fontWeight: 700 }}>{templateUploadMode === 'base' ? t('admin.processToLink') : t('admin.newTemplateName')}</label>
                        {templateUploadMode === 'base' ? (
                            <select
                              className="input-modern-admin"
                              value={templateName}
                              onChange={(e) => {
                                setTemplateName(e.target.value);
                                setLastDetectedFields(null);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <option value="fondos">{t('admin.processFondos')}</option>
                              <option value="corporacion">{t('admin.processCorp')}</option>
                              <option value="fundaciones">{t('admin.processFund')}</option>
                              <option value="cumplimiento_individual">{t('admin.processKyci')}</option>
                              <option value="cumplimiento_entidades">{t('admin.processKyce')}</option>
                            </select>
                        ) : (
                            <input 
                              type="text" 
                              className="input-modern-admin" 
                              placeholder={t('admin.phTemplate')} 
                              value={customTemplateName} 
                              onChange={(e) => setCustomTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
                              required={templateUploadMode === 'custom'}
                            />
                        )}
                        {templateUploadMode === 'base' && (HTML_ENGINE_TEMPLATES.includes(templateName) ||
                          templateStatus.find((s) => s.id === templateName)?.kind === 'html') && (
                          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#0f766e', lineHeight: 1.45 }}>
                            {t('admin.htmlEngineUploadHint')}
                          </p>
                        )}
                      </div>
                      <div className="field-group-admin">
                        <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.pdfFile')}</label>
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
                        style={{ marginTop: 10, background: templates.some(tpl => tpl.name === templateName) ? '#f59e0b' : '#16a34a' }}
                      >
                        {uploadingTemplate ? t('admin.processing') : (templates.some(tpl => tpl.name === templateName) ? t('admin.updateExistingTemplate') : t('admin.uploadNewTemplate'))}
                      </button>
                      <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
                        {templates.some(tpl => tpl.name === templateName) ? t('admin.overwriteHint') : t('admin.injectHint')}
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

      {showCreateUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, margin: 0, color: PRIMARY }}>{t('admin.createUser')}</h2>
              <button onClick={() => setShowCreateUserModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.fullName')}</label>
                <input className="input-modern-admin" type="text" value={createUserForm.name} onChange={e => setCreateUserForm({ ...createUserForm, name: e.target.value })} required />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.email')}</label>
                <input className="input-modern-admin" type="email" value={createUserForm.email} onChange={e => setCreateUserForm({ ...createUserForm, email: e.target.value })} required />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.idOptional')}</label>
                <input className="input-modern-admin" type="text" value={createUserForm.idNumber} onChange={e => setCreateUserForm({ ...createUserForm, idNumber: e.target.value })} />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.role')}</label>
                <select className="input-modern-admin" value={createUserForm.roleOverride} onChange={e => setCreateUserForm({ ...createUserForm, roleOverride: e.target.value })} required>
                  <option value="client">{t('admin.roleClientFull')}</option>
                  <option value="manager">{t('admin.roleManagerFull')}</option>
                  <option value="master">{t('admin.roleMasterFull')}</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={creatingUser} style={{ marginTop: 10 }}>
                {creatingUser ? t('admin.creating') : t('admin.createUser')}
              </button>
            </form>
          </div>
        </div>
      )}

      {showChangeRoleModal && selectedUserForRole && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '90%', maxWidth: '350px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, margin: 0, color: PRIMARY }}>{t('admin.changeRole')}</h2>
              <button onClick={() => setShowChangeRoleModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleChangeRoleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.user')}</label>
                <input className="input-modern-admin" type="text" value={selectedUserForRole.email} disabled style={{ background: '#f8fafc' }} />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.newRole')}</label>
                <select className="input-modern-admin" value={newRoleOverride} onChange={e => setNewRoleOverride(e.target.value)} required>
                  <option value="client">{t('admin.roleClientFull')}</option>
                  <option value="manager">{t('admin.roleManagerFull')}</option>
                  <option value="master">{t('admin.roleMasterFull')}</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={changingRole} style={{ marginTop: 10 }}>
                {changingRole ? t('admin.savingShort') : t('admin.saveRole')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Formulario */}
      {editingForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '90%', maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit2 size={18} color="#f59e0b" />
                <h2 style={{ fontSize: 16, margin: 0, color: PRIMARY, fontWeight: 800 }}>{t('admin.editFormData')}</h2>
              </div>
              <button onClick={() => setEditingForm(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {t('admin.formIdLine', { type: editingForm.formType, id: editingForm.formId })}
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{t('admin.formJson')}</label>
                <textarea
                  className="input-modern-admin"
                  rows={14}
                  value={editFormDataJson}
                  onChange={e => setEditFormDataJson(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.4 }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc', borderRadius: `0 0 ${RADIUS_LG} ${RADIUS_LG}` }}>
              <button onClick={() => setEditingForm(null)} style={{ padding: '10px 18px', border: `1px solid ${BORDER}`, background: 'white', borderRadius: RADIUS, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t('admin.cancel')}</button>
              <button onClick={handleSaveEditForm} disabled={savingFormEdit} style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: RADIUS, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                {savingFormEdit ? t('admin.savingShort') : t('admin.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar Formulario */}
      {deletingForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '90%', maxWidth: '420px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={18} color="#ef4444" />
                <h2 style={{ fontSize: 16, margin: 0, color: '#dc2626', fontWeight: 800 }}>{t('admin.deleteFormTitle')}</h2>
              </div>
              <button onClick={() => setDeletingForm(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                {t('admin.deleteFormConfirm', { type: deletingForm.formType, name: deletingForm.entityName || deletingForm.formId })}
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#991b1b' }}>
                {t('admin.deleteFormWarn')}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc', borderRadius: `0 0 ${RADIUS_LG} ${RADIUS_LG}` }}>
              <button onClick={() => setDeletingForm(null)} style={{ padding: '10px 18px', border: `1px solid ${BORDER}`, background: 'white', borderRadius: RADIUS, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t('admin.cancel')}</button>
              <button onClick={handleConfirmDeleteForm} disabled={deletingFormLoading} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: RADIUS, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                {deletingFormLoading ? t('admin.deleting') : t('admin.yesDeleteForm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Información de Usuario */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '90%', maxWidth: '450px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCog size={18} color="#0284c7" />
                <h2 style={{ fontSize: 16, margin: 0, color: PRIMARY, fontWeight: 800 }}>{t('admin.editUserData')}</h2>
              </div>
              <button onClick={() => setEditingUser(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.fullName')}</label>
                <input className="input-modern-admin" type="text" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.email')}</label>
                <input className="input-modern-admin" type="email" value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.idPassportRuc')}</label>
                <input className="input-modern-admin" type="text" value={editUserForm.idNumber} onChange={e => setEditUserForm({ ...editUserForm, idNumber: e.target.value })} />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{t('admin.nationality')}</label>
                <input className="input-modern-admin" type="text" value={editUserForm.nationality} onChange={e => setEditUserForm({ ...editUserForm, nationality: e.target.value })} placeholder={t('admin.phNationality')} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc', borderRadius: `0 0 ${RADIUS_LG} ${RADIUS_LG}` }}>
              <button onClick={() => setEditingUser(null)} style={{ padding: '10px 18px', border: `1px solid ${BORDER}`, background: 'white', borderRadius: RADIUS, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t('admin.cancel')}</button>
              <button onClick={handleSaveEditUser} disabled={savingUserEdit} style={{ padding: '10px 20px', background: '#0284c7', color: 'white', border: 'none', borderRadius: RADIUS, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                {savingUserEdit ? t('admin.savingShort') : t('admin.saveData')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input-modern-admin { width: 100%; padding: 10px 12px; border: 1px solid ${BORDER}; border-radius: ${RADIUS}; outline: none; font-size: 12px; }
        .field-group-admin { display: flex; flex-direction: column; gap: 6px; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
