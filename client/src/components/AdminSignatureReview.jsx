import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Eye, CheckCircle, XCircle, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import API_BASE_URL from '../config';
import { useLang } from '../i18n';
import { useToast } from './Toast';
import { signatureBadge, signatureStatusLabel } from '../pages/SignedDocuments';

const BORDER = '#e2e8f0';

const TX = {
  es: {
    title: 'Revisión de firmas', pending: 'Pendientes', all: 'Todos', refresh: 'Actualizar',
    intro: 'Las firmas digitales de autoridades reconocidas se validan solas. Aquí quedan las firmas manuscritas (escaneadas), las firmas digitales de autoridades no reconocidas y los errores de verificación: abra el PDF y decida. Cada decisión queda en la bitácora.',
    empty: 'No hay documentos pendientes de revisión.', user: 'Usuario', file: 'Documento', status: 'Estado', details: 'Verificación',
    view: 'Ver PDF', approve: 'Aprobar', reject: 'Rechazar', notePh: 'Nota (obligatoria para rechazar)',
    signer: 'Firmante', issuer: 'Emitido por', trusted: 'Autoridad reconocida', intact: 'Documento sin alterar', valid: 'Firma criptográfica válida',
    identity: 'Coincide con el usuario', yes: 'Sí', no: 'No', unknown: 'No determinado', noDigital: 'Sin firma digital (posible firma manuscrita).',
    reviewed: 'Revisado por', needReason: 'Indique el motivo del rechazo.', done: 'Revisión registrada en la bitácora.', hash: 'Huella SHA-256',
  },
  en: {
    title: 'Signature review', pending: 'Pending', all: 'All', refresh: 'Refresh',
    intro: 'Digital signatures from recognized authorities are validated automatically. Handwritten (scanned) signatures, digital signatures from unrecognized authorities and verification errors land here: open the PDF and decide. Every decision is recorded in the audit log.',
    empty: 'No documents pending review.', user: 'User', file: 'Document', status: 'Status', details: 'Verification',
    view: 'View PDF', approve: 'Approve', reject: 'Reject', notePh: 'Note (required to reject)',
    signer: 'Signer', issuer: 'Issued by', trusted: 'Recognized authority', intact: 'Document not altered', valid: 'Cryptographically valid',
    identity: 'Matches the user', yes: 'Yes', no: 'No', unknown: 'Undetermined', noDigital: 'No digital signature (possible handwritten signature).',
    reviewed: 'Reviewed by', needReason: 'Enter the reason for rejection.', done: 'Review recorded in the audit log.', hash: 'SHA-256 fingerprint',
  },
};

const yn = (v, tx) => (v === true ? tx.yes : v === false ? tx.no : tx.unknown);

const AdminSignatureReview = () => {
  const { lang } = useLang();
  const tx = TX[lang === 'en' ? 'en' : 'es'];
  const toast = useToast();
  // El objeto toast cambia en cada aviso: usar una referencia evita recargas en bucle.
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [filter, setFilter] = useState('pending');
  const [data, setData] = useState({ documents: [], pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState(null);

  const token = () => localStorage.getItem('token');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/signatures`, { params: { filter }, headers: { 'x-auth-token': token() } });
      setData(res.data);
    } catch (err) {
      toastRef.current.error(err.response?.data?.msg || 'Error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const viewPdf = async (doc) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/signed-docs/download/${doc.id}`, { headers: { 'x-auth-token': token() }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Error');
    }
  };

  const review = async (doc, decision) => {
    const note = (notes[doc.id] || '').trim();
    if (decision === 'rejected' && !note) { toast.error(tx.needReason); return; }
    setBusy(doc.id);
    try {
      await axios.post(`${API_BASE_URL}/api/admin/signatures/${doc.id}/review`, { decision, note }, { headers: { 'x-auth-token': token() } });
      toast.success(tx.done);
      setNotes((n) => ({ ...n, [doc.id]: '' }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="#0f766e" /> {tx.title}
          {data.pendingCount > 0 && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{data.pendingCount} {tx.pending.toLowerCase()}</span>}
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['pending', 'all'].map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', border: `1px solid ${filter === f ? '#0f766e' : BORDER}`, background: filter === f ? '#0f766e' : 'white', color: filter === f ? 'white' : '#334155' }}>
              {tx[f]}
            </button>
          ))}
          <button type="button" onClick={load} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'white', cursor: 'pointer' }} title={tx.refresh}><RefreshCw size={13} /></button>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#475569', margin: '0 0 14px' }}>{tx.intro}</p>

      {loading ? <p style={{ fontSize: 12, color: '#64748b' }}>…</p> : data.documents.length === 0 ? (
        <p style={{ fontSize: 13, color: '#64748b', padding: 20, textAlign: 'center' }}>{tx.empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.documents.map((doc) => {
            const b = signatureBadge(doc.signatureStatus);
            const v = doc.verification || {};
            const sig = (v.signatures || [])[0];
            const rv = v.review;
            return (
              <div key={doc.id} style={{ border: `1px solid ${doc.pending ? '#fcd34d' : BORDER}`, borderRadius: 8, padding: 14, background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{doc.filename}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{tx.user}: {doc.user ? `${doc.user.name || doc.user.email}${doc.user.idNumber ? ` · ${doc.user.idNumber}` : ''}` : '-'} · {new Date(doc.updatedAt).toLocaleString(lang === 'en' ? 'en-US' : 'es-EC')}</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: b.bg, color: b.color, padding: '3px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, marginTop: 6 }}>
                      <b.Icon size={12} /> {signatureStatusLabel(doc.signatureStatus, lang)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#334155', flex: 1, minWidth: 260 }}>
                    {sig ? (
                      <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 2 }}>
                        <li>{tx.signer}: <strong>{sig.signer?.commonName || '-'}</strong>{sig.signer?.serialNumber ? ` (${sig.signer.serialNumber})` : ''}{sig.signer?.country ? ` · ${sig.signer.country}` : ''}</li>
                        <li>{tx.issuer}: {sig.issuer?.commonName || sig.issuer?.organization || '-'}</li>
                        <li>{tx.intact}: {yn(sig.intact && !sig.alteredAfterSigning, tx)} · {tx.valid}: {yn(sig.valid, tx)} · {tx.trusted}: {yn(sig.trusted, tx)}</li>
                        <li>{tx.identity}: {v.identity?.match === 'match' ? tx.yes : v.identity?.match === 'no_match' ? <strong style={{ color: '#b45309' }}>{tx.no}</strong> : tx.unknown}</li>
                      </ul>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={13} color="#b45309" /> {v.error ? v.error : tx.noDigital}</div>
                    )}
                    {doc.fileHash && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, wordBreak: 'break-all' }}>{tx.hash}: {doc.fileHash}</div>}
                    {rv && rv.status !== 'pending' && rv.status !== 'not_required' && (
                      <div style={{ fontSize: 11, marginTop: 4, color: rv.status === 'approved' ? '#15803d' : '#b91c1c' }}>
                        {tx.reviewed}: {rv.byName || rv.byEmail} · {new Date(rv.at).toLocaleString(lang === 'en' ? 'en-US' : 'es-EC')}{rv.note ? ` · ${rv.note}` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" onClick={() => viewPdf(doc)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', background: '#0369a1', color: 'white', cursor: 'pointer' }}><Eye size={12} /> {tx.view}</button>
                  <input value={notes[doc.id] || ''} onChange={(e) => setNotes((n) => ({ ...n, [doc.id]: e.target.value }))} placeholder={tx.notePh} maxLength={500}
                    style={{ flex: 1, minWidth: 200, padding: '6px 10px', fontSize: 12, border: `1px solid ${BORDER}`, borderRadius: 6 }} aria-label={tx.notePh} />
                  <button type="button" disabled={busy === doc.id} onClick={() => review(doc, 'approved')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', background: '#15803d', color: 'white', cursor: 'pointer' }}><CheckCircle size={12} /> {tx.approve}</button>
                  <button type="button" disabled={busy === doc.id} onClick={() => review(doc, 'rejected')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', background: '#b91c1c', color: 'white', cursor: 'pointer' }}><XCircle size={12} /> {tx.reject}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSignatureReview;
