import React, { useState, useEffect } from 'react';
import { Users, FileText, Settings, LogOut, CheckCircle, XCircle, Trash2, Search, Clock, Shield, ChevronLeft, ChevronRight, Eye, EyeOff, Key, ShieldOff, UploadCloud, SearchCheck, Building2, User, BadgeCheck, UserCog, ChevronDown, ChevronUp, X, Edit2, Plus, Mail, FolderOpen, Download, FileCheck, ExternalLink } from 'lucide-react';
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

const renderFormDataValue = (value) => {
  if (value === null || value === undefined || value === '') return <span style={{ color: '#94a3b8' }}>—</span>;
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: '#94a3b8' }}>Ninguno</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '4px 0' }}>
        {value.map((v, i) => (
          <div key={i} style={{ padding: typeof v === 'object' ? '8px 12px' : '0', background: typeof v === 'object' ? '#ffffff' : 'transparent', border: typeof v === 'object' ? '1px solid #e2e8f0' : 'none', borderRadius: '6px' }}>
            {typeof v === 'object' ? renderFormDataValue(v) : String(v)}
          </div>
        ))}
      </div>
    );
  }
  
  if (typeof value === 'object') {
    try {
      const keys = Object.keys(value);
      if (keys.length === 0) return <span style={{ color: '#94a3b8' }}>Vacío</span>;
      return (
        <ul style={{ margin: 0, paddingLeft: '18px', listStyleType: 'circle', color: '#475569' }}>
          {keys.map(k => (
            <li key={k} style={{ marginBottom: '4px', fontSize: '12px' }}>
              <strong style={{ color: '#334155' }}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> 
              <span style={{ marginLeft: '6px', color: '#1e293b' }}>{typeof value[k] === 'object' ? renderFormDataValue(value[k]) : String(value[k])}</span>
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
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [viewingFormData, setViewingFormData] = useState(null);

  const [showUserDocsModal, setShowUserDocsModal] = useState(false);
  const [selectedUserForDocs, setSelectedUserForDocs] = useState(null);
  const [userDocsData, setUserDocsData] = useState({ personalDocuments: [], signedDocuments: [] });
  const [userDocsLoading, setUserDocsLoading] = useState(false);
  const [docsActiveTab, setDocsActiveTab] = useState('personal');

  // States for Admin editing User/Company info
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userEditData, setUserEditData] = useState({
    name: '', email: '', phone: '', companyName: '', taxId: '', address: '', status: 'authorized', roleOverride: 'client'
  });
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  // States for Admin uploading personal doc for user
  const [showAdminUploadModal, setShowAdminUploadModal] = useState(false);
  const [adminUploadFile, setAdminUploadFile] = useState(null);
  const [adminUploadDocType, setAdminUploadDocType] = useState('Identificación / Cédula / Pasaporte');
  const [uploadingAdminDoc, setUploadingAdminDoc] = useState(false);

  // States for Admin editing Form data
  const [showEditFormModal, setShowEditFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [editingFormJson, setEditingFormJson] = useState('');
  const [savingFormEdit, setSavingFormEdit] = useState(false);

  const handleOpenEditUserModal = (userObj) => {
    setEditingUser(userObj);
    setUserEditData({
      name: userObj.name || '',
      email: userObj.email || '',
      phone: userObj.phone || '',
      companyName: userObj.companyName || '',
      taxId: userObj.taxId || '',
      address: userObj.address || '',
      status: userObj.status || 'authorized',
      roleOverride: userObj.roleOverride || 'client'
    });
    setShowEditUserModal(true);
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    setSavingUserEdit(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/admin/users/${editingUser.id}/info`, userEditData, {
        headers: { 'x-auth-token': token }
      });
      toast.success(lang === 'en' ? 'User and company information updated successfully' : 'Información de usuario y empresa actualizada correctamente');
      setShowEditUserModal(false);
      fetchData();
    } catch (err) {
      console.error('Error updating user info:', err);
      toast.error(err.response?.data?.msg || 'Error al actualizar información');
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleDeleteUserDoc = async (docId, fileName) => {
    if (!window.confirm(lang === 'en' ? `Delete document "${fileName}" permanently?` : `¿Eliminar permanentemente el documento "${fileName}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/user-documents/${docId}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success(lang === 'en' ? 'Document deleted successfully' : 'Documento eliminado correctamente');
      if (selectedUserForDocs) handleOpenUserDocsModal(selectedUserForDocs);
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error(err.response?.data?.msg || 'Error al eliminar documento');
    }
  };

  const handleAdminUploadDoc = async (e) => {
    e.preventDefault();
    if (!adminUploadFile) return toast.error(lang === 'en' ? 'Please select a file' : 'Por favor seleccione un archivo');
    setUploadingAdminDoc(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', adminUploadFile);
      formData.append('docType', adminUploadDocType);

      await axios.post(`${API_BASE_URL}/api/admin/user-documents/${selectedUserForDocs.id}/upload`, formData, {
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
      });
      toast.success(lang === 'en' ? 'Document uploaded successfully' : 'Documento subido correctamente');
      setShowAdminUploadModal(false);
      setAdminUploadFile(null);
      if (selectedUserForDocs) handleOpenUserDocsModal(selectedUserForDocs);
    } catch (err) {
      console.error('Error uploading doc:', err);
      toast.error(err.response?.data?.msg || 'Error al subir el documento');
    } finally {
      setUploadingAdminDoc(false);
    }
  };

  const handleDeleteUserForm = async (formId, formType) => {
    if (!window.confirm(lang === 'en' ? `Delete form "${formType}" permanently?` : `¿Eliminar permanentemente el formulario "${formType}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/forms/${formId}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success(lang === 'en' ? 'Form deleted successfully' : 'Formulario eliminado correctamente');
      if (selectedUserForDocs) handleOpenUserDocsModal(selectedUserForDocs);
      if (consultaResults) handleConsultaSearch();
    } catch (err) {
      console.error('Error deleting form:', err);
      toast.error(err.response?.data?.msg || 'Error al eliminar el formulario');
    }
  };

  const handleOpenEditFormModal = (formObj) => {
    setEditingForm(formObj);
    const dataObj = formObj.data || formObj.formData || {};
    setEditingFormJson(JSON.stringify(dataObj, null, 2));
    setShowEditFormModal(true);
  };

  const handleSaveAdminForm = async (e) => {
    e.preventDefault();
    let parsedData;
    try {
      parsedData = JSON.parse(editingFormJson);
    } catch (jsonErr) {
      return toast.error(lang === 'en' ? 'Invalid JSON format' : 'El formato de JSON ingresado no es válido');
    }
    setSavingFormEdit(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/admin/forms/${editingForm.id}`, { data: parsedData }, {
        headers: { 'x-auth-token': token }
      });
      toast.success(lang === 'en' ? 'Form updated successfully' : 'Formulario actualizado correctamente');
      setShowEditFormModal(false);
      if (selectedUserForDocs) handleOpenUserDocsModal(selectedUserForDocs);
      if (consultaResults) handleConsultaSearch();
    } catch (err) {
      console.error('Error updating form:', err);
      toast.error(err.response?.data?.msg || 'Error al actualizar el formulario');
    } finally {
      setSavingFormEdit(false);
    }
  };

  const handleOpenUserDocsModal = async (userObj) => {
    setSelectedUserForDocs(userObj);
    setShowUserDocsModal(true);
    setUserDocsLoading(true);
    setDocsActiveTab('personal');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/user-documents/${userObj.id}`, {
        headers: { 'x-auth-token': token }
      });
      setUserDocsData(res.data);
    } catch (err) {
      console.error('Error fetching user documents:', err);
      toast.error('Error al cargar los documentos del usuario');
    } finally {
      setUserDocsLoading(false);
    }
  };

  const handleDownloadUserDoc = async (type, docId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/documents/download/${type}/${docId}`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
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
      toast.success('Descargando documento...');
    } catch (err) {
      console.error('Error downloading document:', err);
      toast.error('Error al descargar el documento');
    }
  };

  const handlePreviewUserDoc = async (type, docId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/documents/download/${type}/${docId}`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error previewing document:', err);
      toast.error('Error al previsualizar el documento');
    }
  };

  const handleGenerateFormPdf = async (formId, formType) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/forms/generate-pdf/${formId}`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error generating form PDF:', err);
      toast.error('Error al generar el PDF del formulario');
    }
  };

  const itemsPerPage = 15;
  const navigate = useNavigate();
  const toast = useToast();

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
      toast.success('Usuario creado con éxito y correo enviado');
      setShowCreateUserModal(false);
      setCreateUserForm({ name: '', email: '', idNumber: '', roleOverride: 'client' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Error al crear usuario');
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
    if (window.confirm('¿Está seguro de eliminar permanentemente a este usuario y liberar su correo de la base de datos?')) {
      try {
        const res = await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, { headers: { 'x-auth-token': token } });
        fetchData();
        toast.success(res.data?.msg || 'Usuario eliminado totalmente de la base de datos');
      } catch (err) { 
          if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
          toast.error(err.response?.data?.msg || 'Error al eliminar usuario'); 
      }
    }
  };

  const handlePurgeInactiveUsers = async () => {
    if (!window.confirm('¿Desea depurar y eliminar permanentemente de la base de datos todos los usuarios no activos e historial de registros huérfanos?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/admin/users/purge-inactive`, {}, {
        headers: { 'x-auth-token': token }
      });
      toast.success(res.data?.msg || 'Depuración completada');
      fetchData();
    } catch (err) {
      toast.error('Error al depurar usuarios inactivos');
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/auth/update-profile`, { email: adminEmail }, { headers: { 'x-auth-token': token } });
      toast.success('Correo electrónico actualizado con éxito');
    } catch (err) { 
        if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
        toast.error(err.response?.data?.msg || 'Error al actualizar correo'); 
    } finally { setSavingSettings(false); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/auth/update-profile`, { newPassword }, { headers: { 'x-auth-token': token } });
      toast.success('Contraseña actualizada con éxito');
      setNewPassword('');
    } catch (err) { 
        if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
        toast.error(err.response?.data?.msg || 'Error al actualizar contraseña'); 
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
      toast.success('Rol cambiado exitosamente');
      setShowChangeRoleModal(false);
      setSelectedUserForRole(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Error al cambiar rol');
    } finally {
      setChangingRole(false);
    }
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
    
    const finalTemplateName = templateUploadMode === 'custom' ? customTemplateName : templateName;
    if (templateUploadMode === 'custom' && !finalTemplateName.trim()) {
      return toast.error('Ingrese un nombre para la nueva plantilla');
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

  const handleEditTemplate = (name) => {
    setTemplateUploadMode('custom');
    setCustomTemplateName(name);
    toast.info('Seleccione un nuevo archivo PDF para reemplazar esta plantilla');
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
      setConsultaCatalogPeople(res.data.catalogPeople || []);
      setConsultaSummary(res.data.summary || null);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/'); }
      toast.error(err.response?.data?.msg || 'Error en la búsqueda');
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div style={{ width: '240px', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '25px 16px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '35px', padding: '0 8px' }}>
          <div style={{ padding: '6px', background: 'rgba(20, 184, 166, 0.2)', border: '1px solid rgba(45, 212, 191, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#2dd4bf" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.3px', color: '#ffffff' }}>NEXUSDOC ADMIN</span>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[{ id: 'users', icon: Users, label: t('admin.users') }, { id: 'consultas', icon: SearchCheck, label: 'Consultas' }, { id: 'logs', icon: Clock, label: t('admin.audit') }, { id: 'templates', icon: FileText, label: t('admin.templates') }, { id: 'change-password', icon: Key, label: 'Cambio de Clave' }, { id: 'change-email', icon: Mail, label: 'Cambio de Correo' }].map(item => (
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
            <h1>ADMINISTRACIÓN MASTER</h1>
            {activeTab === 'users' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handlePurgeInactiveUsers} title="Eliminar permanentemente todos los usuarios no activos de la base de datos" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: RADIUS, fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                  <Trash2 size={15} /> Depurar Inactivos
                </button>
                <button onClick={() => setShowCreateUserModal(true)} className="btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> Crear Usuario
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
                    <th style={{ padding: '12px 15px' }}>ID</th>
                    <th style={{ padding: '12px 15px' }}>USUARIO</th>
                    <th style={{ padding: '12px 15px' }}>ROL</th>
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
                        {user.roleOverride === 'master' ? (
                          <span style={{ padding: '3px 8px', borderRadius: '20px', background: '#fef08a', fontSize: '9px', color: '#854d0e', fontWeight: 800 }}>MASTER</span>
                        ) : (
                          <span style={{ padding: '3px 8px', borderRadius: '20px', background: user.roleOverride === 'manager' ? '#e0f2fe' : '#f1f5f9', fontSize: '9px', color: user.roleOverride === 'manager' ? '#0284c7' : '#64748b', fontWeight: 700 }}>
                            {user.roleOverride === 'manager' ? 'ADMIN USUARIOS' : 'CLIENTE'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '20px', background: user.status === 'authorized' ? '#dcfce7' : '#fee2e2', fontSize: '9px', color: user.status === 'authorized' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{user.status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button onClick={() => handleOpenUserDocsModal(user)} title={lang === 'en' ? "View Files & Forms" : "Ver Archivos / Documentos del Usuario"} style={{ border: '1px solid #99f6e4', background: '#f0fdfa', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#0d9488', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><FolderOpen size={14} /></button>
                          <button onClick={() => handleOpenEditUserModal(user)} title={lang === 'en' ? "Edit Personal & Company Info" : "Editar Datos Personales y de Empresa"} style={{ border: '1px solid #fed7aa', background: '#fff7ed', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#c2410c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={14} /></button>
                          <button onClick={() => handleStatusChange(user.id, 'authorized')} title={lang === 'en' ? "Authorize" : "Autorizar"} style={{ border: `1px solid ${BORDER}`, background: '#f0fdf4', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={14} /></button>
                          <button onClick={() => handleStatusChange(user.id, 'blocked')} title="Desautorizar" style={{ border: `1px solid ${BORDER}`, background: '#fffbeb', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#d97706', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ShieldOff size={14} /></button>
                          {user.roleOverride !== 'master' && (
                            <button onClick={() => { setSelectedUserForRole(user); setNewRoleOverride(user.roleOverride || 'client'); setShowChangeRoleModal(true); }} title="Cambiar Rol" style={{ border: '1px solid #bae6fd', background: '#f0f9ff', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><UserCog size={14} /></button>
                          )}
                          <button onClick={() => handleResetPassword(user.id)} title="Resetear Clave" style={{ border: `1px solid ${BORDER}`, background: '#f8fafc', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Key size={14} /></button>
                          <button onClick={() => handleDeleteUser(user.id)} title="Eliminar" style={{ border: '1px solid #fecaca', background: '#fef2f2', padding: '6px', borderRadius: RADIUS, cursor: 'pointer', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
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
                <div style={{ background: '#f8fafc', padding: 24, borderRadius: RADIUS, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ background: '#e0f2fe', padding: 8, borderRadius: 8 }}>
                      <Search size={18} color="#0284c7" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 800 }}>Búsqueda Avanzada</h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Ingrese una o varias opciones para filtrar los formularios</p>
                    </div>
                  </div>
                  <form onSubmit={handleConsultaSearch} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Nombres / Apellidos</label>
                        <input type="text" value={searchFilters.nombres} onChange={e => setSearchFilters({...searchFilters, nombres: e.target.value})}
                          placeholder="Ej. Edwin Alvarez"
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>RUC / Identificación</label>
                        <input type="text" value={searchFilters.ruc} onChange={e => setSearchFilters({...searchFilters, ruc: e.target.value})}
                          placeholder="Ej. 1700000000001"
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Código Único</label>
                        <input type="text" value={searchFilters.codigoUnico} onChange={e => setSearchFilters({...searchFilters, codigoUnico: e.target.value})}
                          placeholder="Ej. C001"
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Usuario</label>
                        <input type="text" value={searchFilters.usuario} onChange={e => setSearchFilters({...searchFilters, usuario: e.target.value})}
                          placeholder="Nombre o Email"
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Nombre de Empresa</label>
                        <input type="text" value={searchFilters.empresa} onChange={e => setSearchFilters({...searchFilters, empresa: e.target.value})}
                          placeholder="Razón Social"
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Tipo de Formulario</label>
                        <select 
                          value={searchFilters.formType} 
                          onChange={e => setSearchFilters({...searchFilters, formType: e.target.value})}
                          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="">Todos los formularios</option>
                          <option value="corporacion">Formulario de Corporación</option>
                          <option value="fundacion">Formulario de Fundación</option>
                          <option value="cumplimiento-entidad">Cumplimiento (Entidad)</option>
                          <option value="cumplimiento-individual">Cumplimiento (Individual)</option>
                          <option value="fondos">Declaración de Fondos</option>
                        </select>
                      </div>

                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
                      <button type="submit" disabled={consultaLoading} className="btn-primary" style={{ padding: '12px 40px', fontWeight: 800, letterSpacing: '0.5px' }}>
                        {consultaLoading ? 'BUSCANDO...' : 'EJECUTAR BÚSQUEDA'}
                      </button>
                    </div>
                  </form>
                </div>

                {consultaResults && consultaResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <SearchCheck size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p style={{ fontSize: 13 }}>No se encontraron resultados para los filtros ingresados.</p>
                  </div>
                )}

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

                {/* Master Person Catalog Multi-Form Traceability Section */}
                {consultaCatalogPeople && consultaCatalogPeople.length > 0 && (
                  <div style={{ marginBottom: 30 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                        <Building2 size={18} color="#15803d" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 800 }}>
                          Catálogo Maestro de Personas ({consultaCatalogPeople.length} Coincidencias)
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                          Trazabilidad de la persona en múltiples trámites y formularios del sistema
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {consultaCatalogPeople.map((person, pIdx) => (
                        <div key={person.id || pIdx} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: RADIUS_LG, padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, paddingBottom: 14, borderBottom: '1px solid #e2e8f0', marginBottom: 14 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{person.fullName}</span>
                                <span style={{ background: '#0f766e', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                                  {person.lastRoleLabel || 'Registrado'}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <span>📄 <strong>Pasaporte/ID:</strong> {person.passport || person.idNumber || '—'}</span>
                                <span>🌐 <strong>Nacionalidad:</strong> {person.nationality || '—'}</span>
                                <span>📧 <strong>Email:</strong> {person.email || '—'}</span>
                                <span>📞 <strong>Teléfono:</strong> {person.phone || '—'}</span>
                              </div>
                            </div>
                            {person.userOwner && (
                              <div style={{ textAlign: 'right', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Usuario Cliente Propietario</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{person.userOwner.name} ({person.userOwner.uniqueCode || 'Sin código'})</div>
                              </div>
                            )}
                          </div>

                          {/* List of associated forms */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={14} color="#0f766e" />
                              Trámites y Formularios donde esta Persona Participa ({person.associatedForms.length}):
                            </div>
                            {person.associatedForms && person.associatedForms.length > 0 ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                                {person.associatedForms.map((af, afIdx) => (
                                  <div key={afIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                      <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                                        {af.formType}
                                      </span>
                                      <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                                        {af.roleLabel}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
                                      Código: {af.userUniqueCode || af.formId || 'Trámite Registrado'}
                                    </div>
                                    {af.updatedAt && (
                                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                                        Registrado el: {new Date(af.updatedAt).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                                Esta persona fue registrada en la base de datos. Sus trámites asociados se listan arriba.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          onClick={() => handleOpenUserDocsModal(selectedUser)}
                          title="Ver Archivos / Documentos del Usuario"
                          style={{ border: '1px solid #99f6e4', background: '#f0fdfa', color: '#0f766e', padding: '6px 12px', borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <FolderOpen size={14} />
                          Ver Archivos Subidos
                        </button>
                        <button onClick={() => { setSelectedUser(null); setSelectedUserForms(null); }} style={{ border: `1px solid ${BORDER}`, background: 'white', padding: 6, borderRadius: RADIUS, cursor: 'pointer', color: '#64748b' }}>
                          <X size={14} />
                        </button>
                      </div>
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



                {consultaResults && consultaResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {consultaResults.map((r, idx) => {
                      const isExpanded = expandedPerson === idx;
                      const fd = r.formData || {};
                      
                      // Identify common "Personal Data" keys
                      const personalDataKeys = ['fullName', 'name', 'firstName', 'lastName', 'idNumber', 'passport', 'email', 'phone', 'nationality', 'country', 'birthDate', 'companyName', 'corporationName', 'foundationName'];
                      const filteredPersonalData = Object.entries(fd).filter(([k, v]) => personalDataKeys.includes(k) && v);

                      return (
                        <div key={`${r.formId}-${idx}`} style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: RADIUS_LG, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 15, color: '#0f766e', fontWeight: 800 }}>{r.entityName || 'Formulario'}</h3>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, marginRight: 8, fontWeight: 700 }}>{r.formType}</span>
                                  Subido por <button onClick={() => handleViewUserForms(r.userId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PRIMARY, fontWeight: 600, textDecoration: 'underline', padding: 0 }}>{r.userName}</button> ({r.userCode || 'Sin código'}) el {new Date(r.formDate).toLocaleDateString()}
                                  <button
                                    onClick={() => handleOpenUserDocsModal({ id: r.userId, name: r.userName, email: r.userEmail, uniqueCode: r.userCode })}
                                    title="Ver Archivos / Documentos Subidos por este Usuario"
                                    style={{ background: '#f0fdfa', border: '1px solid #99f6e4', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <FolderOpen size={12} /> Archivos
                                  </button>
                                </div>
                            </div>
                            <button onClick={() => setExpandedPerson(isExpanded ? null : idx)} className="btn-primary" style={{ padding: '6px 16px', fontSize: 11 }}>
                              {isExpanded ? 'Ver Menos' : 'Ver Más Detalles'}
                            </button>
                          </div>
                          
                          {/* Matched Form Sections & Roles Banner */}
                          {r.matchedSections && r.matchedSections.length > 0 && (
                            <div style={{ background: '#f0fdf4', padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>📍</span> UBICACIÓN Y ROLES EXACTOS EN ESTE FORMULARIO ({r.matchedSections.length}):
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
                              Personas y Roles Registrados en este Formulario ({r.participants ? r.participants.length : 0}):
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
                                            COINCIDENCIA
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
                              <div style={{ fontSize: 12, color: '#64748b' }}>No se identificaron personas en arreglos. Haz clic en "Ver Más Detalles" para ver toda la información extraída.</div>
                            )}
                          </div>

                          {/* Full Table when expanded */}
                          {isExpanded && (
                            <div style={{ borderTop: `1px solid ${BORDER}`, padding: '0', background: '#f8fafc' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                  <thead style={{ background: '#f1f5f9', borderBottom: `1px solid ${BORDER}` }}>
                                    <tr style={{ fontSize: 10, color: '#475569', fontWeight: 800 }}>
                                      <th style={{ padding: '12px 20px', width: '35%' }}>TODOS LOS CAMPOS DEL FORMULARIO</th>
                                      <th style={{ padding: '12px 20px', width: '65%' }}>VALOR REGISTRADO</th>
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
                                              {renderFormDataValue(value)}
                                            </td>
                                          </tr>
                                        ))
                                    ) : (
                                        <tr>
                                          <td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                                              No hay datos registrados adicionales.
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
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: `1px solid ${BORDER}`, borderRadius: RADIUS, overflow: 'hidden', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          <thead style={{ background: '#f1f5f9', borderBottom: `1px solid ${BORDER}` }}>
                            <tr style={{ fontSize: 11, color: '#475569', fontWeight: 800 }}>
                              <th style={{ padding: '14px 20px', width: '35%' }}>CAMPO</th>
                              <th style={{ padding: '14px 20px', width: '65%' }}>VALOR INGRESADO</th>
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
                                    {renderFormDataValue(value)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                                  No hay datos registrados en este formulario.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, textAlign: 'right' }}>
                        <button onClick={() => setViewingFormData(null)} className="btn-primary" style={{ padding: '8px 16px' }}>Cerrar</button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {activeTab === 'change-email' && (
              <div style={{ padding: '30px', maxWidth: '450px' }}>
                <h3 style={{ marginBottom: '20px' }}>Actualizar Correo Electrónico</h3>
                <form onSubmit={handleUpdateEmail} style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: '40px' }}>
                  <div className="field-group-admin">
                    <label style={{ fontSize: '10px', fontWeight: 700 }}>CORREO ELECTRÓNICO</label>
                    <input className="input-modern-admin" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                  </div>
                  <button type="submit" disabled={savingSettings} className="btn-primary" style={{ width: '100%', marginTop: 10 }}>
                    {savingSettings ? 'GUARDANDO...' : 'ACTUALIZAR CORREO'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'change-password' && (
              <div style={{ padding: '30px', maxWidth: '450px' }}>
                <h3 style={{ marginBottom: '20px' }}>Actualizar Contraseña</h3>
                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <div className="field-group-admin">
                    <label style={{ fontSize: '10px', fontWeight: 700 }}>NUEVA CONTRASEÑA</label>
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
                    {savingSettings ? 'GUARDANDO...' : 'ACTUALIZAR CONTRASEÑA'}
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
                          {(() => {
                            const baseTypes = [
                              { id: 'fondos', label: 'Declaración de Fondos' },
                              { id: 'corporacion', label: 'Incorporación' },
                              { id: 'fundaciones', label: 'Fundaciones' },
                              { id: 'cumplimiento_individual', label: 'Cumplimiento Individual' },
                              { id: 'cumplimiento_entidades', label: 'Cumplimiento Entidades' }
                            ];
                            const baseIds = baseTypes.map(t => t.id);
                            const dynamicTypes = templates.filter(t => !baseIds.includes(t.name)).map(t => ({
                                id: t.name,
                                label: t.name.replace(/_/g, ' ').toUpperCase() + ' (Dinámico)'
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
                                                  title="Editar plantilla (Reemplazar PDF)"
                                              >
                                                  <Edit2 size={14} />
                                              </button>
                                              {customTemplate && (
                                              <button 
                                                  onClick={() => handleDeleteTemplate(type.id)}
                                                  style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                  title="Eliminar plantilla"
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
                      <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Subir/Reemplazar Plantilla</h3>
                    </div>
                    <form onSubmit={handleTemplateUpload} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                      <div className="field-group-admin" style={{ display: 'flex', gap: '15px', marginBottom: 5 }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input type="radio" checked={templateUploadMode === 'base'} onChange={() => setTemplateUploadMode('base')} /> Trámite del Sistema
                        </label>
                        <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input type="radio" checked={templateUploadMode === 'custom'} onChange={() => setTemplateUploadMode('custom')} /> Plantilla Dinámica
                        </label>
                      </div>

                      <div className="field-group-admin">
                        <label style={{ fontSize: '10px', fontWeight: 700 }}>{templateUploadMode === 'base' ? 'TIPO DE TRÁMITE A VINCULAR' : 'NOMBRE DE LA NUEVA PLANTILLA'}</label>
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
                              <option value="fondos">Declaración de Fondos</option>
                              <option value="corporacion">Incorporación</option>
                              <option value="fundaciones">Fundaciones</option>
                              <option value="cumplimiento_individual">Cumplimiento Individual</option>
                              <option value="cumplimiento_entidades">Cumplimiento Entidades</option>
                            </select>
                        ) : (
                            <input 
                              type="text" 
                              className="input-modern-admin" 
                              placeholder="Ej. contrato_arrendamiento" 
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

      {showCreateUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, margin: 0, color: PRIMARY }}>Crear Usuario</h2>
              <button onClick={() => setShowCreateUserModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>NOMBRES COMPLETOS</label>
                <input className="input-modern-admin" type="text" value={createUserForm.name} onChange={e => setCreateUserForm({ ...createUserForm, name: e.target.value })} required />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>CORREO ELECTRÓNICO</label>
                <input className="input-modern-admin" type="email" value={createUserForm.email} onChange={e => setCreateUserForm({ ...createUserForm, email: e.target.value })} required />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>IDENTIFICACIÓN (OPCIONAL)</label>
                <input className="input-modern-admin" type="text" value={createUserForm.idNumber} onChange={e => setCreateUserForm({ ...createUserForm, idNumber: e.target.value })} />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>ROL</label>
                <select className="input-modern-admin" value={createUserForm.roleOverride} onChange={e => setCreateUserForm({ ...createUserForm, roleOverride: e.target.value })} required>
                  <option value="client">Cliente Normal</option>
                  <option value="manager">Administrador Usuarios</option>
                  <option value="master">Administrador Maestro</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={creatingUser} style={{ marginTop: 10 }}>
                {creatingUser ? 'Creando...' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showChangeRoleModal && selectedUserForRole && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '90%', maxWidth: '350px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, margin: 0, color: PRIMARY }}>Cambiar Rol</h2>
              <button onClick={() => setShowChangeRoleModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleChangeRoleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>USUARIO</label>
                <input className="input-modern-admin" type="text" value={selectedUserForRole.email} disabled style={{ background: '#f8fafc' }} />
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>NUEVO ROL</label>
                <select className="input-modern-admin" value={newRoleOverride} onChange={e => setNewRoleOverride(e.target.value)} required>
                  <option value="client">Cliente Normal</option>
                  <option value="manager">Administrador Usuarios</option>
                  <option value="master">Administrador Maestro</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={changingRole} style={{ marginTop: 10 }}>
                {changingRole ? 'Guardando...' : 'Guardar Cambio'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showUserDocsModal && selectedUserForDocs && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div style={{ background: '#0f172a', padding: '20px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'rgba(45, 212, 191, 0.15)', border: '1px solid #2dd4bf', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderOpen size={22} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white' }}>
                    Documentos Subidos por el Usuario
                  </h3>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>👤 <strong>{selectedUserForDocs.name}</strong></span>
                    <span>📧 {selectedUserForDocs.email}</span>
                    <span>🏷️ Code: <strong>{selectedUserForDocs.uniqueCode || 'Sin código'}</strong></span>
                    {selectedUserForDocs.idNumber && <span>📄 ID: {selectedUserForDocs.idNumber}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => { setShowUserDocsModal(false); setSelectedUserForDocs(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', display: 'flex', gap: 16, overflowX: 'auto' }}>
              <button
                type="button"
                onClick={() => setDocsActiveTab('personal')}
                style={{
                  padding: '14px 16px',
                  border: 'none',
                  borderBottom: docsActiveTab === 'personal' ? '3px solid #0f766e' : '3px solid transparent',
                  background: 'transparent',
                  color: docsActiveTab === 'personal' ? '#0f766e' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap'
                }}
              >
                <FileText size={16} />
                Documentos Personales ({(userDocsData.personalDocuments || []).length})
              </button>

              <button
                type="button"
                onClick={() => setDocsActiveTab('forms')}
                style={{
                  padding: '14px 16px',
                  border: 'none',
                  borderBottom: docsActiveTab === 'forms' ? '3px solid #0f766e' : '3px solid transparent',
                  background: 'transparent',
                  color: docsActiveTab === 'forms' ? '#0f766e' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap'
                }}
              >
                <Building2 size={16} />
                Formularios / Trámites Generados ({(userDocsData.userForms || []).length})
              </button>
              
              <button
                type="button"
                onClick={() => setDocsActiveTab('signed')}
                style={{
                  padding: '14px 16px',
                  border: 'none',
                  borderBottom: docsActiveTab === 'signed' ? '3px solid #0f766e' : '3px solid transparent',
                  background: 'transparent',
                  color: docsActiveTab === 'signed' ? '#0f766e' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap'
                }}
              >
                <FileCheck size={16} />
                Documentos Firmados ({(userDocsData.signedDocuments || []).length})
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {userDocsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <Clock size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Cargando documentos del usuario...</p>
                </div>
              ) : docsActiveTab === 'personal' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                      {lang === 'en' ? 'Uploaded Personal Files' : 'Archivos Personales Subidos'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdminUploadModal(true)}
                      style={{ border: '1px solid #0f766e', background: '#0f766e', color: 'white', padding: '6px 14px', borderRadius: RADIUS, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <UploadCloud size={14} /> {lang === 'en' ? 'Upload / Replace File' : 'Subir / Reemplazar Documento'}
                    </button>
                  </div>
                  {(userDocsData.personalDocuments || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: RADIUS_LG, border: `1px dashed ${BORDER}` }}>
                      <FolderOpen size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#64748b' }}>El usuario aún no ha subido documentos personales en su panel.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(userDocsData.personalDocuments || []).map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: RADIUS, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', padding: 10, borderRadius: 8, color: '#0d9488' }}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{doc.filename}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                Subido/Actualizado el: {new Date(doc.updatedAt || doc.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handlePreviewUserDoc('personal', doc.id, doc.filename)}
                              style={{ border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0284c7', padding: '8px 14px', borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <ExternalLink size={14} /> Ver PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadUserDoc('personal', doc.id, doc.filename)}
                              style={{ border: `1px solid ${BORDER}`, background: '#0f172a', color: 'white', padding: '8px 14px', borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <Download size={14} /> Descargar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUserDoc(doc.id, doc.filename)}
                              style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                              title={lang === 'en' ? 'Delete document' : 'Eliminar documento'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : docsActiveTab === 'forms' ? (
                <div>
                  {(userDocsData.userForms || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: RADIUS_LG, border: `1px dashed ${BORDER}` }}>
                      <Building2 size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#64748b' }}>El usuario no tiene formularios o trámites registrados en el sistema.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(userDocsData.userForms || []).map(form => (
                        <div key={form.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: RADIUS, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: 10, borderRadius: 8, color: '#d97706' }}>
                              <Building2 size={20} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{form.entityName}</span>
                                <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                                  {form.formType}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                Código: <strong>{form.userUniqueCode || form.id}</strong> &middot; Actualizado el: {new Date(form.updatedAt || form.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleGenerateFormPdf(form.id, form.formType)}
                              style={{ border: '1px solid #99f6e4', background: '#f0fdfa', color: '#0f766e', padding: '8px 14px', borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <ExternalLink size={14} /> PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditFormModal(form)}
                              style={{ border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', padding: '8px 14px', borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <Edit2 size={14} /> {lang === 'en' ? 'Edit' : 'Editar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUserForm(form.id, form.formType)}
                              style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                              title={lang === 'en' ? 'Delete form' : 'Eliminar trámite'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {(userDocsData.signedDocuments || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: RADIUS_LG, border: `1px dashed ${BORDER}` }}>
                      <FileCheck size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#64748b' }}>El usuario no tiene documentos firmados subidos en el sistema.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(userDocsData.signedDocuments || []).map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: RADIUS, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: 10, borderRadius: 8, color: '#2563eb' }}>
                              <FileCheck size={20} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{doc.filename}</span>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  background: doc.signatureStatus === 'Firma Detectada' ? '#dcfce7' : '#fef3c7',
                                  color: doc.signatureStatus === 'Firma Detectada' ? '#15803d' : '#92400e'
                                }}>
                                  {doc.signatureStatus || 'Firma Pendiente'}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                Subido el: {new Date(doc.updatedAt || doc.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handlePreviewUserDoc('signed', doc.id, doc.filename)}
                              style={{ border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0284c7', padding: '8px 14px', borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <ExternalLink size={14} /> Ver PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadUserDoc('signed', doc.id, doc.filename)}
                              style={{ border: `1px solid ${BORDER}`, background: '#0f172a', color: 'white', padding: '8px 14px', borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <Download size={14} /> Descargar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowUserDocsModal(false); setSelectedUserForDocs(null); }}
                style={{ padding: '10px 24px', background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 13, fontWeight: 700, color: '#334155', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin Edit User & Company Info Modal */}
      {showEditUserModal && editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '100%', maxWidth: '550px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', padding: '18px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Edit2 size={18} color="#2dd4bf" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  {lang === 'en' ? 'Edit User & Company Information' : 'Editar Información de Usuario y Empresa'}
                </h3>
              </div>
              <button onClick={() => setShowEditUserModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveUserEdit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field-group-admin">
                  <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'FULL NAME' : 'NOMBRE COMPLETO'}</label>
                  <input className="input-modern-admin" type="text" value={userEditData.name} onChange={e => setUserEditData({ ...userEditData, name: e.target.value })} required />
                </div>
                <div className="field-group-admin">
                  <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'EMAIL' : 'CORREO ELECTRÓNICO'}</label>
                  <input className="input-modern-admin" type="email" value={userEditData.email} onChange={e => setUserEditData({ ...userEditData, email: e.target.value })} required />
                </div>
                <div className="field-group-admin">
                  <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'PHONE' : 'TELÉFONO'}</label>
                  <input className="input-modern-admin" type="text" value={userEditData.phone} onChange={e => setUserEditData({ ...userEditData, phone: e.target.value })} placeholder="+593 999 999 999" />
                </div>
                <div className="field-group-admin">
                  <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'STATUS' : 'ESTADO'}</label>
                  <select className="input-modern-admin" value={userEditData.status} onChange={e => setUserEditData({ ...userEditData, status: e.target.value })}>
                    <option value="authorized">AUTORIZADO / ACTIVE</option>
                    <option value="blocked">BLOQUEADO / INACTIVE</option>
                  </select>
                </div>
                <div className="field-group-admin" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'COMPANY NAME / RAZÓN SOCIAL' : 'RAZÓN SOCIAL / NOMBRE DE LA EMPRESA'}</label>
                  <input className="input-modern-admin" type="text" value={userEditData.companyName} onChange={e => setUserEditData({ ...userEditData, companyName: e.target.value })} placeholder="Ej: EDWIN S.A." />
                </div>
                <div className="field-group-admin">
                  <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'RUC / TAX ID' : 'RUC / NO. IDENTIFICACIÓN FISCAL'}</label>
                  <input className="input-modern-admin" type="text" value={userEditData.taxId} onChange={e => setUserEditData({ ...userEditData, taxId: e.target.value })} placeholder="Ej: 1790000000001" />
                </div>
                <div className="field-group-admin">
                  <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'ROLE' : 'ROL DEL SISTEMA'}</label>
                  <select className="input-modern-admin" value={userEditData.roleOverride} onChange={e => setUserEditData({ ...userEditData, roleOverride: e.target.value })}>
                    <option value="client">CLIENTE NORMAL</option>
                    <option value="manager">ADMINISTRADOR USUARIOS</option>
                    <option value="master">ADMINISTRADOR MAESTRO</option>
                  </select>
                </div>
                <div className="field-group-admin" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'REGISTERED ADDRESS' : 'DIRECCIÓN REGISTRADA / DOMICILIO SOCIAL'}</label>
                  <input className="input-modern-admin" type="text" value={userEditData.address} onChange={e => setUserEditData({ ...userEditData, address: e.target.value })} placeholder="Dirección completa..." />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowEditUserModal(false)} style={{ padding: '9px 18px', background: '#f1f5f9', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {lang === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" disabled={savingUserEdit} className="btn-primary" style={{ padding: '9px 24px', fontSize: 12 }}>
                  {savingUserEdit ? (lang === 'en' ? 'SAVING...' : 'GUARDANDO...') : (lang === 'en' ? 'SAVE CHANGES' : 'GUARDAR CAMBIOS')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Upload Document for User Modal */}
      {showAdminUploadModal && selectedUserForDocs && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', padding: '18px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UploadCloud size={18} color="#2dd4bf" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                  {lang === 'en' ? 'Upload Document for User' : 'Subir Documento para Usuario'}
                </h3>
              </div>
              <button onClick={() => setShowAdminUploadModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdminUploadDoc} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'DOCUMENT TYPE' : 'TIPO DE DOCUMENTO'}</label>
                <select className="input-modern-admin" value={adminUploadDocType} onChange={e => setAdminUploadDocType(e.target.value)}>
                  <option value="Identificación / Cédula / Pasaporte">Identificación / Cédula / Pasaporte</option>
                  <option value="Comprobante de Domicilio">Comprobante de Domicilio</option>
                  <option value="Registro Mercantil / RUC">Registro Mercantil / RUC</option>
                  <option value="Documento Personal / Otros">Documento Personal / Otros</option>
                </select>
              </div>
              <div className="field-group-admin">
                <label style={{ fontSize: '10px', fontWeight: 700 }}>{lang === 'en' ? 'PDF FILE' : 'ARCHIVO PDF'}</label>
                <input type="file" accept="application/pdf" onChange={e => setAdminUploadFile(e.target.files[0])} className="input-modern-admin" required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAdminUploadModal(false)} style={{ padding: '9px 18px', background: '#f1f5f9', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {lang === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" disabled={uploadingAdminDoc} className="btn-primary" style={{ padding: '9px 24px', fontSize: 12 }}>
                  {uploadingAdminDoc ? (lang === 'en' ? 'UPLOADING...' : 'SUBIENDO...') : (lang === 'en' ? 'UPLOAD FILE' : 'SUBIR ARCHIVO')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Form Data Modal */}
      {showEditFormModal && editingForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: RADIUS_LG, width: '100%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', padding: '18px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Edit2 size={18} color="#2dd4bf" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  {lang === 'en' ? 'Edit Form Data' : 'Editar Datos del Formulario'} ({editingForm.formType})
                </h3>
              </div>
              <button onClick={() => setShowEditFormModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveAdminForm} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                {lang === 'en' ? 'Modify the JSON structure below to update form details:' : 'Modifique la estructura JSON para actualizar cualquier información del formulario:'}
              </div>
              <textarea
                value={editingFormJson}
                onChange={e => setEditingFormJson(e.target.value)}
                style={{ width: '100%', minHeight: '350px', fontFamily: 'monospace', fontSize: 12, padding: 14, border: `1px solid ${BORDER}`, borderRadius: RADIUS, background: '#0f172a', color: '#38bdf8', lineHeight: 1.5 }}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowEditFormModal(false)} style={{ padding: '9px 18px', background: '#f1f5f9', border: `1px solid ${BORDER}`, borderRadius: RADIUS, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {lang === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" disabled={savingFormEdit} className="btn-primary" style={{ padding: '9px 24px', fontSize: 12 }}>
                  {savingFormEdit ? (lang === 'en' ? 'SAVING...' : 'GUARDANDO...') : (lang === 'en' ? 'SAVE FORM CHANGES' : 'GUARDAR CAMBIOS DEL TRÁMITE')}
                </button>
              </div>
            </form>
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
