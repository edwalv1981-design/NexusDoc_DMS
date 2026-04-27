import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Forgot Password States
  const [recoveryStep, setRecoveryStep] = useState(0); 
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user.mustChangePassword) return navigate('/reset-password');
      res.data.user.role === 'admin' ? navigate('/admin') : navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Error al iniciar sesión');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setRecoveryLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email: recoveryEmail });
      setRecoveryStep(2);
    } catch (err) { 
        setError(err.response?.data?.msg || err.response?.data?.error || 'Error al enviar código'); 
    } finally { setRecoveryLoading(false); }
  };

  const handleVerifyRecovery = async (e) => {
    e.preventDefault();
    setRecoveryLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/verify-forgot-password`, { email: recoveryEmail, code: recoveryCode });
      setRecoveryStep(3);
    } catch (err) { 
        setError(err.response?.data?.msg || err.response?.data?.error || 'Error al validar código'); 
    } finally { setRecoveryLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#f8fafc' }}>
      <div style={{ maxWidth: '900px', width: '100%', display: 'flex', overflow: 'hidden', background: 'white', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        
        {/* Left Side: Branding */}
        <div style={{ flex: 1, padding: '50px', background: 'var(--primary)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 35, color: 'white' }}>
            <ShieldCheck size={24} />
            <span style={{ fontSize: '18px', fontWeight: 700 }}>NexusDoc DMS</span>
          </div>
          
          <h2 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.3, marginBottom: 20, color: 'white' }}>
            Toma el control total de tu empresa.
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: 15, lineHeight: 1.6 }}>
            Olvida el caos de usar mil herramientas. Centraliza tu negocio en un solo lugar, diseñado para simplificar tu día a día.
          </p>
          <p style={{ fontSize: '13px', opacity: 0.8, lineHeight: 1.6 }}>
            Personaliza tu experiencia: Activa solo lo que necesites hoy y añade funciones conforme tu negocio avance.
          </p>
          
          <button onClick={() => navigate('/onboarding')} style={{ marginTop: '30px', background: 'white', color: 'var(--primary)', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
            <UserPlus size={16} /> Abre tu cuenta
          </button>
        </div>

        {/* Right Side: Login Form */}
        <div style={{ flex: 0.8, padding: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: 5 }}>Bienvenido</h3>
            <p style={{ color: '#64748b', fontSize: '13px' }}>Ingresa tus credenciales para acceder</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 8, color: '#475569' }}>EMAIL / USUARIO</label>
              <input type="text" className="input-expert" placeholder="ejemplo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 8, color: '#475569' }}>CONTRASEÑA</label>
              <input type={showPassword ? "text" : "password"} className="input-expert" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: '45px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '34px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>{error}</p>}

            <button type="button" onClick={() => { setError(''); setRecoveryStep(1); }} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '-5px' }}>
              ¿Olvidaste tu contraseña?
            </button>

            <button type="submit" className="btn-primary" style={{ marginTop: '5px' }}>
              <LogIn size={16} /> Iniciar Sesión
            </button>
          </form>

          {/* Recovery Flow Overlays */}
          {recoveryStep > 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <div style={{ width: '100%', maxWidth: '350px', background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
                {recoveryStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center' }}>Recuperar Acceso</h3>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: 6, display: 'block' }}>EMAIL REGISTRADO</label>
                        <input type="email" className="input-expert" required value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => setRecoveryStep(0)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                      <button type="button" onClick={(e) => { console.log('📡 Disparando recuperación...'); handleForgotPassword(e); }} className="btn-primary" style={{ flex: 1.5 }}>Enviar Código</button>
                    </div>
                  </div>
                )}
                {recoveryStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center' }}>Verificar Código</h3>
                    <input type="text" className="input-expert" placeholder="000000" maxLength={6} required value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '5px' }} />
                    <button type="button" onClick={(e) => { console.log('📡 Validando código...'); handleVerifyRecovery(e); }} className="btn-primary">Validar</button>
                  </div>
                )}
                {recoveryStep === 3 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#16a34a', marginBottom: 15 }}><ShieldCheck size={40} style={{ margin: '0 auto' }} /></div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 10 }}>¡Todo listo!</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: 20 }}>Hemos enviado una clave temporal a tu correo.</p>
                    <button onClick={() => setRecoveryStep(0)} className="btn-primary" style={{ width: '100%' }}>Volver</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
