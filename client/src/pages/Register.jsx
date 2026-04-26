import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Globe, Mail, ChevronLeft, ArrowRight, CreditCard } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    nationality: '',
    email: '',
    idNumber: '',
    initialForm: localStorage.getItem('selectedForm') || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!formData.initialForm) {
      navigate('/onboarding');
    }
  }, [formData.initialForm, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, formData);
      localStorage.setItem('userEmail', formData.email);
      navigate('/verify');
    } catch (err) {
      setError(err.response?.data?.msg || 'Error al procesar el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#f8fafc' }}>
      <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '60px' }}>
        <button 
          onClick={() => navigate('/onboarding')}
          style={{ background: 'none', border: 'none', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: '32px', fontSize: '15px' }}
        >
          <ChevronLeft size={18} /> Cambiar formulario
        </button>

        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Datos de Usuario</h1>
          <p style={{ color: 'var(--text-sub)' }}>
            Estás iniciando el proceso para: <strong style={{ color: 'var(--primary)' }}>{formData.initialForm}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '14px', fontWeight: 600, marginBottom: 8, color: 'var(--text-sub)' }}>
              <User size={16} /> Nombres completos
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ej: Juan Pérez"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '14px', fontWeight: 600, marginBottom: 8, color: 'var(--text-sub)' }}>
              <CreditCard size={16} /> Cédula o Pasaporte
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ej: 1712345678"
              required
              value={formData.idNumber}
              onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '14px', fontWeight: 600, marginBottom: 8, color: 'var(--text-sub)' }}>
              <Globe size={16} /> Nacionalidad
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ej: Ecuatoriana"
              required
              value={formData.nationality}
              onChange={(e) => setFormData({...formData, nationality: e.target.value})}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '14px', fontWeight: 600, marginBottom: 8, color: 'var(--text-sub)' }}>
              <Mail size={16} /> Correo Electrónico
            </label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="ejemplo@correo.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: '14px', fontWeight: 500 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 16, marginTop: '16px' }}>
            <button 
              type="button"
              onClick={() => navigate('/')}
              className="btn-primary" 
              style={{ flex: 1, background: '#f1f5f9', color: '#64748b' }}
            >
              Regresar
            </button>
            <button 
              type="submit"
              className="btn-primary" 
              style={{ flex: 1.5 }}
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Continuar'}
              {!loading && <ArrowRight size={18} style={{ marginLeft: 8, verticalAlign: 'middle' }} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
