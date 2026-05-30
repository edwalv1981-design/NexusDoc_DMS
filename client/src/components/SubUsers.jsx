import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './Toast';
import { UserPlus, Mail, Phone, MapPin, X } from 'lucide-react';
import API_BASE_URL from '../config';

const PRIMARY = '#0f766e';
const RADIUS = '8px';
const BORDER = '#e2e8f0';

const SubUsers = () => {
    const [subUsers, setSubUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
    const [creating, setCreating] = useState(false);
    const toast = useToast();

    const fetchSubUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/manager/sub-users`, {
                headers: { 'x-auth-token': token }
            });
            setSubUsers(res.data);
        } catch (err) {
            toast.error('Error al cargar usuarios adicionales');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubUsers();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/manager/sub-users`, formData, {
                headers: { 'x-auth-token': token }
            });
            toast.success('Usuario adicional creado. Clave temporal enviada al correo.');
            setShowModal(false);
            setFormData({ name: '', email: '', phone: '', address: '' });
            fetchSubUsers();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al crear usuario');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div style={{ padding: '30px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#1e293b' }}>Usuarios Adicionales</h2>
                <button onClick={() => setShowModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                    <UserPlus size={16} /> Crear Usuario Adicional
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: RADIUS, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando usuarios...</div>
                ) : subUsers.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No has creado usuarios adicionales todavía.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}` }}>
                            <tr style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>
                                <th style={{ padding: '12px 20px' }}>NOMBRE</th>
                                <th style={{ padding: '12px 20px' }}>CORREO</th>
                                <th style={{ padding: '12px 20px' }}>TELÉFONO</th>
                                <th style={{ padding: '12px 20px' }}>ESTADO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subUsers.map(u => (
                                <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}`, fontSize: '13px' }}>
                                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#1e293b' }}>{u.name}</td>
                                    <td style={{ padding: '12px 20px', color: '#475569' }}>{u.email}</td>
                                    <td style={{ padding: '12px 20px', color: '#475569' }}>{u.phone || '---'}</td>
                                    <td style={{ padding: '12px 20px' }}>
                                        <span style={{ background: u.status === 'authorized' ? '#dcfce7' : '#f1f5f9', color: u.status === 'authorized' ? '#16a34a' : '#64748b', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                            {u.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '450px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 16, margin: 0, color: PRIMARY }}>Crear Usuario Adicional</h2>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '10px', fontWeight: 700 }}>NOMBRES COMPLETOS</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required style={{ padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '10px', fontWeight: 700 }}>CORREO ELECTRÓNICO</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required style={{ padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '10px', fontWeight: 700 }}>TELÉFONO</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required style={{ padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '10px', fontWeight: 700 }}>DIRECCIÓN</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required style={{ padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: RADIUS, outline: 'none' }} />
                            </div>
                            <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: 10 }}>
                                {creating ? 'Creando y enviando...' : 'Guardar y Enviar Correo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubUsers;
