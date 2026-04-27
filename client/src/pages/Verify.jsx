import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, X, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const Verify = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
        setErrorMessage(data.msg || 'El código ingresado no es correcto.');
        setShowError(true);
      }
    } catch (err) {
      console.error('🔥 Error de red en verificación:', err);
      setErrorMessage('Error de conexión con el servidor.');
      setShowError(true);
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

        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Código de Seguridad</h1>
        <p style={{ color: 'var(--text-sub)', marginBottom: '40px' }}>
          Ingresa el código que hemos enviado a tu correo: <br/>
          <strong style={{ color: 'var(--text)' }}>{email}</strong>
        </p>

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
            {loading ? 'Verificando...' : 'Verificar Código'}
            {!loading && <ArrowRight size={18} style={{ marginLeft: 8, verticalAlign: 'middle' }} />}
          </button>

          <button 
            type="button"
            onClick={() => navigate('/register')}
            style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: '14px', marginTop: '-8px' }}
          >
            ¿Email incorrecto? Regresar
          </button>
        </form>

        {/* Error Popup */}
        {showError && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ maxWidth: '400px', width: '90%', padding: '32px', background: 'white', textAlign: 'center' }}>
              <div style={{ color: 'var(--error)', marginBottom: '16px' }}>
                <AlertCircle size={48} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Atención</h3>
              <p style={{ color: 'var(--text-sub)', marginBottom: '24px' }}>{errorMessage}</p>
              <button 
                onClick={() => setShowError(false)}
                className="btn-primary" 
                style={{ width: '100%', background: 'var(--error)' }}
              >
                Cerrar
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
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>¡Verificación Exitosa!</h3>
              <p style={{ color: 'var(--text-sub)', marginBottom: '24px' }}>Tu código ha sido validado correctamente. <br/><br/> <strong>Revisa tu correo electrónico:</strong> te hemos enviado tu clave temporal de acceso.</p>
              <button 
                onClick={() => navigate('/')}
                className="btn-primary" 
                style={{ width: '100%' }}
              >
                Volver al inicio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;
