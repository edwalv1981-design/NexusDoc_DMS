import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Globe, Mail, ChevronLeft, ArrowRight, CreditCard, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
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
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('userEmail', formData.email);
        navigate('/verify');
      } else {
        setError(data.msg || t('toast.saveError'));
      }
    } catch (err) {
      setError(t('login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)', position: 'relative', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 5 }}>
        <LanguageSwitcher />
      </div>

      <div style={{ maxWidth: '960px', width: '100%', display: 'flex', overflow: 'hidden', background: '#ffffff', borderRadius: '20px', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
        
        {/* Left Side: Executive Branding & Step Indicator */}
        <div style={{ flex: 1.1, padding: '56px 48px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          {/* Ambient Glow */}
          <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, rgba(0,0,0,0) 70%)', top: '-80px', left: '-80px', pointerEvents: 'none' }} />

          <div>
            <button 
              onClick={() => navigate('/onboarding')}
              style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, marginBottom: '32px', transition: 'all 0.2s ease' }}
            >
              <ChevronLeft size={16} /> Cambiar Trámite
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, color: '#ffffff' }}>
              <div style={{ padding: '8px', background: 'rgba(20, 184, 166, 0.15)', borderRadius: '10px', border: '1px solid rgba(45, 212, 191, 0.3)', color: '#2dd4bf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={24} />
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#ffffff' }}>NexusDoc DMS</span>
            </div>

            <h2 style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.3, marginBottom: 16, color: '#ffffff' }}>
              {t('register.title')}
            </h2>

            <div style={{ background: 'rgba(20, 184, 166, 0.15)', border: '1px solid rgba(45, 212, 191, 0.3)', padding: '12px 16px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: 10, color: '#2dd4bf', fontSize: '13px', fontWeight: 700, marginBottom: 24 }}>
              <CheckCircle2 size={18} />
              <span>Trámite: {formData.initialForm}</span>
            </div>

            <p style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: 1.6 }}>
              {t('register.subtitle')}
            </p>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px', marginTop: '30px' }}>
            {t('register.termsNote')}
          </div>
        </div>

        {/* Right Side: Professional Corporate Registration Form */}
        <div style={{ flex: 1.2, padding: '56px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#ffffff', color: '#0f172a' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', fontWeight: 700, marginBottom: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <User size={14} color="#0f766e" /> {t('register.fullName')}
              </label>
              <input
                type="text"
                placeholder="Ej: Edwin Alvarez"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ width: '100%', padding: '11px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', fontWeight: 700, marginBottom: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Mail size={14} color="#0f766e" /> {t('register.email')}
              </label>
              <input
                type="email"
                placeholder="ejemplo@empresa.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%', padding: '11px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', fontWeight: 700, marginBottom: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <CreditCard size={14} color="#0f766e" /> {t('register.idNumber')}
                </label>
                <input
                  type="text"
                  placeholder="Ej: 1700000001"
                  required
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', fontWeight: 700, marginBottom: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Globe size={14} color="#0f766e" /> {t('register.nationality')}
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ecuatoriana"
                  required
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', color: '#dc2626', fontSize: '12.5px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '10px', width: '100%', padding: '12px', fontSize: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 100%)' }}>
              {loading ? 'Procesando registro...' : t('register.submit')} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
