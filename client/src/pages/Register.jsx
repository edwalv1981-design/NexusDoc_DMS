import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Globe, Mail, ChevronLeft, ArrowRight, CreditCard, X } from 'lucide-react';
import { useT } from '../i18n';
import axios from 'axios';
import API_BASE_URL from '../config';

const Register = () => {
  const navigate = useNavigate();
  const t = useT();
  const [formData, setFormData] = useState({
    name: '',
    nationality: '',
    email: '',
    idNumber: '',
    website_hp: '',
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
    console.log('📡 Iniciando registro para:', formData.email);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Registro exitoso, redirigiendo a verificación');
        localStorage.setItem('userEmail', formData.email);
        navigate('/verify');
      } else {
        console.error('❌ Error de registro:', data.msg);
        setError(data.msg || t('toast.saveError'));
      }
    } catch (err) {
      console.error('🔥 Error de red en registro:', err);
      setError(t('login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#f4f7fa' }}>
      <div style={{ 
        maxWidth: '550px', 
        width: '100%', 
        background: 'white', 
        borderRadius: '24px', 
        padding: '50px', 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0'
      }}>
        
        {/* Breadcrumb / Back Link */}
        <button 
          onClick={() => navigate('/onboarding')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#64748b', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            cursor: 'pointer', 
            marginBottom: '35px', 
            fontSize: '13px',
            fontWeight: 600,
            padding: 0
          }}
        >
          <ChevronLeft size={16} /> {t('register.changeForm')}
        </button>

        {/* Header Section */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--primary)', marginBottom: '10px', letterSpacing: '-0.02em' }}>{t('register.userData')}</h1>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5 }}>
            {t('register.startingProcessFor')} <span style={{ color: 'var(--primary)', fontWeight: 700, background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>{formData.initialForm}</span>
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          <div className="input-group-expert">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', fontWeight: 700, marginBottom: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <User size={14} color="var(--primary)" /> {t('register.fullName')}
            </label>
            <input 
              type="text" 
              className="input-expert" 
              placeholder={t('register.fullNamePlaceholder')}
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={{ padding: '14px 18px', fontSize: '15px' }}
            />
          </div>

          <div className="input-group-expert">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', fontWeight: 700, marginBottom: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <CreditCard size={14} color="var(--primary)" /> {t('register.idOrPassport')}
            </label>
            <input 
              type="text" 
              className="input-expert" 
              placeholder="Ej: 1600050254"
              required
              value={formData.idNumber}
              onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
              style={{ padding: '14px 18px', fontSize: '15px' }}
            />
          {/* Anti-IA / Anti-Bot Honeypot Field */}
          <input
            type="text"
            name="website_hp"
            value={formData.website_hp}
            onChange={(e) => setFormData({ ...formData, website_hp: e.target.value })}
            style={{ display: 'none', position: 'absolute', left: '-9999px' }}
            tabIndex={-1}
            autoComplete="off"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="input-group-expert">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', fontWeight: 700, marginBottom: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Globe size={14} color="var(--primary)" /> {t('register.nationality')}
                </label>
                <input 
                  type="text" 
                  className="input-expert" 
                  placeholder={t('register.nationalityPlaceholder')}
                  required
                  value={formData.nationality}
                  onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                  style={{ padding: '14px 18px', fontSize: '15px' }}
                />
              </div>

              <div className="input-group-expert">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', fontWeight: 700, marginBottom: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Mail size={14} color="var(--primary)" /> Email
                </label>
                <input 
                  type="email" 
                  className="input-expert" 
                  placeholder="correo@ejemplo.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{ padding: '14px 18px', fontSize: '15px' }}
                />
              </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '12px', borderRadius: '10px', color: '#dc2626', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
               <X size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 15, marginTop: '15px' }}>
            <button 
              type="button"
              onClick={() => navigate('/onboarding')}
              style={{ 
                flex: 1, 
                padding: '16px', 
                borderRadius: '14px', 
                border: '1px solid #e2e8f0', 
                background: 'white', 
                color: '#64748b', 
                fontWeight: 700, 
                fontSize: '14px', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.target.style.background = 'white'}
            >
              {t('common.back')}
            </button>
            <button 
              type="submit"
              className="btn-primary" 
              style={{ 
                flex: 2, 
                padding: '16px', 
                borderRadius: '14px', 
                fontSize: '14px', 
                boxShadow: '0 10px 15px -3px rgba(0, 120, 212, 0.25)' 
              }}
              disabled={loading}
            >
              {loading ? t('register.processing') : t('common.continue')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
        </form>

        <p style={{ marginTop: '35px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
          {t('register.termsNote')}
        </p>
      </div>
    </div>
  );
};

export default Register;
