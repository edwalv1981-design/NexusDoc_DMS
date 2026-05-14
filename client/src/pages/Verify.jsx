import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useT } from '../i18n';
import axios from 'axios';
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
  const email = localStorage.getItem('userEmail');

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowError(false);
    console.log('📡 Verificando código para:', email);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Código verificado con éxito');
        setShowSuccess(true);
      } else {
        console.error('❌ Error de verificación:', data.msg);
        setErrorMessage(data.msg || t('verify.invalidCode'));
        if (data.expired) setHasExpired(true);
        setShowError(true);
      }
    } catch (err) {
      console.error('🔥 Error de red en verificación:', err);
      setErrorMessage(t('verify.connectionError'));
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
        setHasExpired(false);
        setShowError(false);
        setCode('');
        alert(t('verify.resendSuccess'));
      } else {
        setErrorMessage(data.msg || t('verify.resendError'));
        setShowError(true);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(t('verify.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#f8fafc' }}>
      <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '60px', textAlign: 'center' }}>
        <div style={{ background: 'var(--primary)', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
          <ShieldCheck size={32} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>{t('verify.title')}</h1>
        <p style={{ color: 'var(--text-sub)', marginBottom: '15px' }}>
          {t('verify.subtitle')} <br/>
          <strong style={{ color: 'var(--text)' }}>{email}</strong>
        </p>
        <div style={{ background: '#fffbeb', color: '#d97706', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '30px', border: '1px solid #fde68a' }}>
            <AlertCircle size={16} /> {t('verify.expiresIn3Min')}
        </div>

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="000000"
            style={{ textAlign: 'center', fontSize: '32px', letterSpacing: '8px', fontWeight: 700 }}
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t('verify.verifying') : t('verify.verifyButton')}
            {!loading && <ArrowRight size={18} style={{ marginLeft: 8, verticalAlign: 'middle' }} />}
          </button>

          <button 
            type="button"
            onClick={() => navigate('/register')}
            style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: '14px', marginTop: '-8px' }}
          >
            {t('verify.wrongEmail')}
          </button>
        </form>

        {/* Error Popup */}
        {showError && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ maxWidth: '400px', width: '90%', padding: '32px', background: 'white', textAlign: 'center' }}>
              <div style={{ color: 'var(--error)', marginBottom: '16px' }}>
                <AlertCircle size={48} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{t('common.error')}</h3>
              <p style={{ color: 'var(--text-sub)', marginBottom: '24px' }}>{errorMessage}</p>
              
              {hasExpired ? (
                <button 
                  onClick={handleResend}
                  className="btn-primary" 
                  style={{ width: '100%', background: '#f59e0b', marginBottom: '10px' }}
                  disabled={loading}
                >
                  {loading ? t('common.loading') : t('login.generateNewCode')}
                </button>
              ) : null}

              <button 
                onClick={() => setShowError(false)}
                className="btn-primary" 
                style={{ width: '100%', background: hasExpired ? '#94a3b8' : 'var(--error)' }}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}

        {/* Success Popup */}
        {showSuccess && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ maxWidth: '400px', width: '90%', padding: '32px', background: 'white', textAlign: 'center' }}>
              <div style={{ color: 'var(--success)', marginBottom: '16px' }}>
                <CheckCircle size={48} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{t('verify.successTitle')}</h3>
              <p style={{ color: 'var(--text-sub)', marginBottom: '24px' }}>{t('verify.successBody')}</p>
              <button 
                onClick={() => navigate('/')}
                className="btn-primary" 
                style={{ width: '100%' }}
              >
                {t('onboarding.backToStart')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;
