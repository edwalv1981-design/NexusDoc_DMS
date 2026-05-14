import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, Trash2, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { useT } from '../i18n';
import axios from 'axios';
import { useToast } from '../components/Toast';
import API_BASE_URL from '../config';

const PRIMARY = '#0078d4';
const RADIUS = '8px';
const BORDER = '#e2e8f0';

const UserDocuments = () => {
  const t = useT();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null); // If replacing a file
  const toast = useToast();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/documents`, {
        headers: { 'x-auth-token': token }
      });
      setDocuments(res.data);
    } catch (err) {
      toast.error(t('userDocs.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error(t('userDocs.selectPdf'));

    setUploading(true);
    const formData = new FormData();
    formData.append('document', file);

    try {
      const token = localStorage.getItem('token');
      if (editingDocId) {
        // Replace existing
        await axios.put(`${API_BASE_URL}/api/documents/update/${editingDocId}`, formData, {
          headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
        });
        toast.success(t('userDocs.docUpdated'));
      } else {
        // Upload new
        await axios.post(`${API_BASE_URL}/api/documents/upload`, formData, {
          headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
        });
        toast.success(t('userDocs.docUploaded'));
      }
      setFile(null);
      setEditingDocId(null);
      document.getElementById('doc-upload-input').value = '';
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.msg || t('userDocs.errorUpload') || t('toast.saveError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, filename) => {
    if (!window.confirm(t('userDocs.confirmDelete', { filename }))) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/documents/${id}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success(t('userDocs.docDeleted'));
      fetchDocuments();
    } catch (err) {
      toast.error(t('userDocs.errorDelete'));
    }
  };

  const handleDownload = async (id, filename) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/documents/download/${id}`, {
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
    } catch (err) {
      toast.error(t('userDocs.errorDownload'));
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px', color: '#0f172a' }}>{t('userDocs.title')}</h2>
      
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: RADIUS, padding: '15px', marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
        <AlertCircle color="#0078d4" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ color: '#1e3a8a', margin: '0 0 5px 0', fontSize: '14px' }}>{t('userDocs.safeSpaceTitle')}</h4>
          <p style={{ color: '#3b82f6', margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
            {t('userDocs.safeSpaceBody')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
        
        {/* Lado Izquierdo: Formulario de Subida */}
        <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: RADIUS, border: `1px dashed #cbd5e1` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            {editingDocId ? <RefreshCw size={20} color="#f59e0b" /> : <UploadCloud size={20} color={PRIMARY} />}
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              {editingDocId ? t('userDocs.replaceDoc') : t('userDocs.uploadNew')}
            </h3>
          </div>
          
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{t('userDocs.pdfLabel')}</label>
              <input 
                id="doc-upload-input"
                type="file" 
                accept=".pdf" 
                onChange={(e) => setFile(e.target.files[0])} 
                style={{ background: '#f8fafc', padding: '10px', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '13px' }}
                required 
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={uploading || !file} className="btn-primary" style={{ flex: 1, background: editingDocId ? '#f59e0b' : PRIMARY }}>
                {uploading ? t('register.processing').toUpperCase() : (editingDocId ? t('userDocs.updateFile') : t('userDocs.uploadSecure'))}
                </button>
                {editingDocId && (
                    <button type="button" onClick={() => { setEditingDocId(null); setFile(null); document.getElementById('doc-upload-input').value = ''; }} style={{ padding: '0 15px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
                        {t('common.cancel')}
                    </button>
                )}
            </div>
          </form>
        </div>

        {/* Lado Derecho: Tabla de Documentos */}
        <div style={{ flex: 1.5 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>{t('userDocs.mySavedDocs')}</h3>
          
          {loading ? (
            <p style={{ color: '#64748b', fontSize: '13px' }}>{t('common.loading')}</p>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: RADIUS, border: `1px solid ${BORDER}` }}>
                <FileText size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px', fontWeight: 600 }}>{t('userDocs.noDocs')}</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: RADIUS, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}` }}>
                    <tr style={{ fontSize: '10px', color: '#64748b', fontWeight: 800 }}>
                    <th style={{ padding: '12px 15px' }}>{t('userDocs.fileName')}</th>
                    <th style={{ padding: '12px 15px' }}>{t('userDocs.uploadDate')}</th>
                    <th style={{ padding: '12px 15px', textAlign: 'right' }}>{t('admin.audit').split(' ')[0]}</th>
                    </tr>
                </thead>
                <tbody>
                    {documents.map(doc => (
                    <tr key={doc.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ padding: '12px 15px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={16} color="#ef4444" /> {doc.filename}
                            </div>
                        </td>
                        <td style={{ padding: '12px 15px', fontSize: '12px', color: '#64748b' }}>
                            {new Date(doc.updatedAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 15px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleDownload(doc.id, doc.filename)} style={{ background: '#dcfce7', color: '#16a34a', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Descargar">
                                <Download size={14} />
                            </button>
                            <button onClick={() => setEditingDocId(doc.id)} style={{ background: '#fef3c7', color: '#d97706', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('common.edit')}>
                                <RefreshCw size={14} />
                            </button>
                            <button onClick={() => handleDelete(doc.id, doc.filename)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('common.delete')}>
                                <Trash2 size={14} />
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UserDocuments;
