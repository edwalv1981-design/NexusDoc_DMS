import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import API_BASE_URL from '../config';

const Verify = () => {
  const navigate = useNavigate();
  const t = useT();
  const [code, setCode] = useState('');
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasExpired, setHasExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const email = localStorage.getItem('userEmail');

  // Persistent Absolute Expiration Timer (Maintains countdown even on app exit / tab close / reload)
  useEffect(() => {
    let expiresAt = parseInt(localStorage.getItem('otp_expires_at') || '0', 10);
    if (!expiresAt) {
      expiresAt = Date.now() + 180 * 1000;
      localStorage.setItem('otp_expires_at', expiresAt.toString());
    }

    const calculateTime = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setHasExpired(true);
      } else {
        setHasExpired(false);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (hasExpired) {
      setErrorMessage('El código ha caducado. Por favor, solicita uno nuevo.');
      setShowError(true);
      return;
    }

    setLoading(true);
    setShowError(false);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.removeItem('otp_expires_at');
        setShowSuccess(true);
      } else {
        setErrorMessage(data.msg || t('verify.invalidCode') || 'Código inválido');
        if (data.expired) setHasExpired(true);
        setShowError(true);
      }
    } catch (err) {
      setErrorMessage(t('verify.connectionError') || 'Error de conexión');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok) {
        const newExpiresAt = Date.now() + 180 * 1000;
        localStorage.setItem('otp_expires_at', newExpiresAt.toString());
        setHasExpired(false);
        setTimeLeft(180);
        setShowError(false);
        setCode('');
      } else {
        setErrorMessage(data.msg || t('verify.resendError') || 'Error al reenviar el código');
        setShowError(true);
      }
    } catch (err) {
      setErrorMessage(t('verify.connectionError') || 'Error de conexión');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)', position: 'relative', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 5 }}>
        <LanguageSwitcher />
      </div>

      <div style={{ maxWidth: '480px', width: '100%', background: '#ffffff', borderRadius: '20px', padding: '48px 40px', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
        
        {/* Shield Header Icon */}
        <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 100%)', color: '#ffffff', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 20px rgba(15, 118, 110, 0.3)' }}>
          <ShieldCheck size={32} color="#2dd4bf" />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          {t('verify.title') || 'Verificar Código'}
        </h1>

        <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '20px', lineHeight: 1.5 }}>
          {t('verify.subtitle') || 'Ingresa el código de 6 dígitos enviado a'} <br/>
          <strong style={{ color: '#0f172a', fontWeight: 700 }}>{email || 'tu correo'}</strong>
        </p>

        {/* Real-time Persistent Countdown Badge */}
        {!hasExpired ? (
          <div style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
            <Clock size={16} color="#d97706" />
            <span>Caduca en <strong>{formatTime(timeLeft)}</strong></span>
          </div>
        ) : (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '8px 16px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertCircle size={16} color="#dc2626" />
              <span>El código OTP ha caducado</span>
            </div>
            <div>
              <button 
                type="button" 
                onClick={handleResend} 
                disabled={loading} 
                style={{ background: '#0f766e', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
              >
                <RefreshCw size={14} /> Reenviar nuevo código
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <input 
            type="text" 
            placeholder="000000"
            style={{ textAlign: 'center', fontSize: '32px', letterSpacing: '10px', fontWeight: 800, color: '#0f172a', padding: '14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <button type="submit" className="btn-primary" disabled={loading || hasExpired} style={{ width: '100%', padding: '13px', fontSize: '14px', borderRadius: '10px', background: hasExpired ? '#94a3b8' : 'linear-gradient(135deg, #0f172a 0%, #0f766e 100%)' }}>
            {loading ? 'Verificando...' : (t('verify.verifyButton') || 'VERIFICAR CÓDIGO')}
            {!loading && <ArrowRight size={18} style={{ marginLeft: 8 }} />}
          </button>

          <button 
            type="button"
            onClick={() => navigate('/register')}
            style={{ background: 'none', border: 'none', color: '#0f766e', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginTop: '-4px' }}
          >
            {t('verify.wrongEmail') || '¿Correo incorrecto? Volver al registro'}
          </button>
        </form>

        {/* Error Modal */}
        {showError && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ maxWidth: '380px', width: '90%', padding: '32px', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ color: '#ef4444', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <AlertCircle size={48} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>Error de Verificación</h3>
              <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px', lineHeight: 1.5 }}>{errorMessage}</p>
              
              {hasExpired && (
                <button 
                  onClick={handleResend}
                  className="btn-primary" 
                  style={{ width: '100%', background: '#0f766e', marginBottom: '10px' }}
                  disabled={loading}
                >
                  <RefreshCw size={16} /> Reenviar nuevo código
                </button>
              )}

              <button 
                onClick={() => setShowError(false)}
                className="btn-secondary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccess && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ maxWidth: '380px', width: '90%', padding: '32px', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ color: '#10b981', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <CheckCircle size={48} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>¡Cuenta Verificada!</h3>
              <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px', lineHeight: 1.5 }}>Tu código de verificación ha sido validado correctamente.</p>
              <button 
                onClick={() => navigate('/')}
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Iniciar Sesión Ahora
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;
