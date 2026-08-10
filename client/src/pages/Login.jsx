import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn, UserPlus, Eye, EyeOff, X, KeyRound, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import axios from 'axios';
import API_BASE_URL from '../config';

const Login = () => {
  const navigate = useNavigate();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website_hp, setWebsiteHp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Recovery Flow State
  const [recoveryStep, setRecoveryStep] = useState(0); // 0: Closed, 1: Email, 2: Code
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password, website_hp });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user.mustChangePassword) return navigate('/reset-password');
      res.data.user.role === 'admin' ? navigate('/admin') : navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || t('login.errorGeneric'));
    }
  };

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    setRecoveryLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.toLowerCase().trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || t('login.errorSendingCode'));
      setRecoveryStep(2);
      setHasExpired(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.toLowerCase().trim(), code: recoveryCode.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || (t('login.invalidCode') !== 'login.invalidCode' ? t('login.invalidCode') : 'Código inválido'));
      
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/reset-password');
      } else {
        throw new Error(data.msg || 'Error de autenticación.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)', position: 'relative', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 5 }}>
        <LanguageSwitcher />
      </div>

      <div style={{ maxWidth: '960px', width: '100%', display: 'flex', overflow: 'hidden', background: '#ffffff', borderRadius: '20px', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
        
        {/* Left Side: Executive Branding */}
        <div style={{ flex: 1.1, padding: '56px 48px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle Ambient Light Blob */}
          <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, rgba(0,0,0,0) 70%)', top: '-80px', left: '-80px', pointerEvents: 'none' }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, color: '#ffffff' }}>
              <div style={{ padding: '8px', background: 'rgba(20, 184, 166, 0.15)', borderRadius: '10px', border: '1px solid rgba(45, 212, 191, 0.3)', color: '#2dd4bf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={24} />
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#ffffff' }}>NexusDoc DMS</span>
            </div>
            
            <h2 style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.3, marginBottom: 20, color: '#ffffff', letterSpacing: '-0.5px' }}>
              {t('login.brandTitle')}
            </h2>

            <p style={{ fontSize: '14.5px', color: '#e2e8f0', marginBottom: 16, lineHeight: 1.6, fontWeight: 400 }}>
              {t('login.brandSubtitle1')}
            </p>

            <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.6, fontWeight: 400 }}>
              {t('login.brandSubtitle2')}
            </p>
          </div>

          <div style={{ marginTop: '40px' }}>
            <button className="btn-open-account" onClick={() => navigate('/onboarding')} style={{ background: '#ffffff', color: '#0f172a', border: 'none', padding: '13px 26px', borderRadius: '12px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'all 0.2s ease', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)' }}>
              <UserPlus size={18} color="#0f766e" /> {t('login.openAccount')}
            </button>
          </div>
        </div>

        {/* Right Side: Professional Corporate Login Form */}
        <div style={{ flex: 1, padding: '56px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#ffffff', color: '#0f172a' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: 6, color: '#0f172a', letterSpacing: '-0.5px' }}>{t('login.welcome')}</h1>
            <p style={{ color: '#64748b', fontSize: '13.5px', margin: 0 }}>{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Anti-IA / Anti-Bot Honeypot Field */}
            <input
              type="text"
              name="website_hp"
              value={website_hp}
              onChange={(e) => setWebsiteHp(e.target.value)}
              style={{ display: 'none', position: 'absolute', left: '-9999px' }}
              tabIndex={-1}
              autoComplete="off"
            />

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {t('login.emailUser')}
              </label>
              <input
                type="text"
                placeholder="ejemplo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '11px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '14px', outline: 'none', transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {t('login.password')}
                </label>
                <button type="button" onClick={() => { setError(''); setRecoveryStep(1); }} style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {t('login.forgotPassword')}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '11px 14px', paddingRight: '45px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '14px', outline: 'none', transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', color: '#dc2626', fontSize: '12.5px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ marginTop: '8px', width: '100%', padding: '12px', fontSize: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 100%)' }}>
              <LogIn size={18} /> {t('login.signIn')}
            </button>
          </form>
        </div>
      </div>

      {/* Recovery Flow Overlays */}
      {recoveryStep > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px', background: '#ffffff', padding: '36px 32px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', color: '#0f172a' }}>
            <button 
              onClick={() => { setRecoveryStep(0); setRecoveryCode(''); setError(''); }} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            {recoveryStep === 1 ? (
              <form onSubmit={handleForgotPassword}>
                <div style={{ width: '48px', height: '48px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: '20px' }}>
                  <Mail size={24} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>Recuperar Contraseña</h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
                  Ingresa tu correo electrónico para recibir un código OTP de 6 dígitos.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>Correo Registrado</label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>{error}</p>}

                <button type="submit" disabled={recoveryLoading} className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '10px' }}>
                  {recoveryLoading ? 'Enviando código...' : 'Enviar Código OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode}>
                <div style={{ width: '48px', height: '48px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: '20px' }}>
                  <KeyRound size={24} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>Ingresar Código OTP</h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
                  Se ha enviado un código de 6 dígitos a <strong>{recoveryEmail}</strong>.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>Código OTP (6 dígitos)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="123456"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '18px', letterSpacing: '4px', textAlign: 'center', fontWeight: 700, outline: 'none' }}
                  />
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>{error}</p>}

                <button type="submit" disabled={recoveryLoading} className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '10px' }}>
                  {recoveryLoading ? 'Verificando...' : 'Verificar y Restablecer'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
