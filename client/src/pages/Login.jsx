import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ShieldCheck, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Login = () => {
  const navigate = useNavigate();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Forgot Password States
  const [recoveryStep, setRecoveryStep] = useState(0); 
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
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
    console.log('📡 Iniciando Fetch de recuperación para:', recoveryEmail);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.toLowerCase().trim() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Respuesta de servidor recibida con éxito');
        setRecoveryStep(2);
      } else {
        console.error('❌ El servidor respondió con error:', data.msg);
        setError(data.msg || data.error || t('login.errorGeneric'));
      }
    } catch (err) { 
      console.error('🔥 Error de red o crítico en Frontend:', err);
      setError(t('login.connectionError')); 
    } finally { setRecoveryLoading(false); }
  };

  const handleVerifyRecovery = async (e) => {
    if (e) e.preventDefault();
    setRecoveryLoading(true);
    setHasExpired(false);
    console.log('📡 Iniciando Fetch de verificación...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.toLowerCase().trim(), code: recoveryCode })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRecoveryStep(3);
      } else {
        setError(data.msg || data.error || t('login.invalidCode'));
        if (data.expired) setHasExpired(true);
      }
    } catch (err) { 
      console.error('🔥 Error de red en verificación:', err);
      setError(t('login.validateCodeError')); 
    } finally { setRecoveryLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#f8fafc', position: 'relative' }}>
      <style>{`
        .login-right-panel { --text: #ffffff !important; --text-light: rgba(255,255,255,0.7) !important; }
        .login-right-panel, .login-right-panel div, .login-right-panel span,
        .login-right-panel p, .login-right-panel h1, .login-right-panel h2,
        .login-right-panel h3, .login-right-panel h4, .login-right-panel label,
        .login-right-panel a, .login-right-panel button:not(.btn-primary) { color: #ffffff !important; }
        .login-right-panel input { background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.25) !important; color: #ffffff !important; }
        .login-right-panel input::placeholder { color: rgba(255,255,255,0.5) !important; }
      `}</style>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 5 }}>
        <LanguageSwitcher />
      </div>
      <div style={{ maxWidth: '900px', width: '100%', display: 'flex', overflow: 'hidden', background: 'white', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        
        {/* Left Side: Branding */}
        <div className="login-left-panel" style={{ flex: 1, padding: '50px', background: 'var(--primary)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 35, color: 'white' }}>
            <ShieldCheck size={24} />
            <span style={{ fontSize: '18px', fontWeight: 700 }}>NexusDoc DMS</span>
          </div>
          
          <h2 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.3, marginBottom: 20, color: 'white' }}>
            {t('login.brandTitle')}
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: 15, lineHeight: 1.6 }}>
            {t('login.brandSubtitle1')}
          </p>
          <p style={{ fontSize: '13px', opacity: 0.8, lineHeight: 1.6 }}>
            {t('login.brandSubtitle2')}
          </p>
          
          <button className="btn-open-account" onClick={() => navigate('/onboarding')} style={{ marginTop: '30px', background: 'white', color: 'var(--primary)', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
            <UserPlus size={16} /> {t('login.openAccount')}
          </button>
        </div>

        {/* Right Side: Login Form */}
        <div className="login-right-panel" style={{ flex: 0.8, padding: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#134e4a', color: '#ffffff' }}>
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: 5, color: '#ffffff' }}>{t('login.welcome')}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{t('login.subtitle')}</div>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 8, color: '#ffffff', letterSpacing: '0.3px' }}>{t('login.emailUser')}</span>
              <input type="text" placeholder="ejemplo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '4px', color: '#ffffff', fontSize: '13px', outline: 'none' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 8, color: '#ffffff', letterSpacing: '0.3px' }}>{t('login.password')}</span>
              <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '7px 10px', paddingRight: '45px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '4px', color: '#ffffff', fontSize: '13px', outline: 'none' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '34px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>{error}</p>}

            <button type="button" onClick={() => { setError(''); setRecoveryStep(1); }} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '-5px' }}>
              {t('login.forgotPassword')}
            </button>

            <button type="submit" className="btn-primary" style={{ marginTop: '5px' }}>
              <LogIn size={16} /> {t('login.signIn')}
            </button>
          </form>

        </div>
      </div>

      {/* Recovery Flow Overlays */}
      {recoveryStep > 0 && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '350px', background: 'white', padding: '35px 30px 30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', color: '#1e293b' }}>
            <button 
              onClick={() => { setRecoveryStep(0); setRecoveryCode(''); setError(''); }} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              title={t('common.close')}
            >
              <X size={16} />
            </button>
            {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
            {recoveryStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', color: '#1e293b' }}>{t('login.recoverAccess')}</h3>
                <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: 6, display: 'block', color: '#475569' }}>{t('login.registeredEmail')}</label>
                    <input type="email" className="input-expert" required value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b' }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setRecoveryStep(0)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}>{t('login.cancel')}</button>
                  <button type="button" onClick={(e) => { console.log('📡 Disparando recuperación...'); handleForgotPassword(e); }} className="btn-primary" style={{ flex: 1.5 }}>{t('login.sendCode')}</button>
                </div>
              </div>
            )}
            {recoveryStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', color: '#1e293b' }}>{t('login.verifyCode')}</h3>
                <div style={{ background: '#fffbeb', color: '#d97706', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', border: '1px solid #fde68a' }}>
                    <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '5px', marginBottom: '2px' }} /> {t('login.expiresIn3Min')}
                </div>
                <input type="text" className="input-expert" placeholder="000000" maxLength={6} required value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '5px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b' }} />
                {hasExpired && (
                  <button 
                    type="button" 
                    onClick={(e) => { setHasExpired(false); handleForgotPassword(e); }} 
                    className="btn-primary" 
                    style={{ background: '#f59e0b', marginBottom: '-10px' }}
                    disabled={recoveryLoading}
                  >
                    {recoveryLoading ? t('login.generating') : t('login.generateNewCode')}
                  </button>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => { setRecoveryStep(0); setRecoveryCode(''); setError(''); setHasExpired(false); }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}>{t('login.cancel')}</button>
                  <button type="button" onClick={(e) => { console.log('📡 Validando código...'); handleVerifyRecovery(e); }} className="btn-primary" style={{ flex: 1.5, background: hasExpired ? '#94a3b8' : '' }} disabled={hasExpired}>{t('login.validate')}</button>
                </div>
              </div>
            )}
            {recoveryStep === 3 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#16a34a', marginBottom: 15 }}><ShieldCheck size={40} style={{ margin: '0 auto' }} /></div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 10, color: '#1e293b' }}>{t('login.allReady')}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: 20 }}>{t('login.tempPasswordSent')}</p>
                <button onClick={() => setRecoveryStep(0)} className="btn-primary" style={{ width: '100%' }}>{t('login.back')}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
