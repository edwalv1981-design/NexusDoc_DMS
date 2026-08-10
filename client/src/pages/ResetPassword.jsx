import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import API_BASE_URL from '../config';
import axios from 'axios';

const ResetPassword = () => {
  const navigate = useNavigate();
  const t = useT();
  const user = JSON.parse(localStorage.getItem('user'));
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getTranslation = (key, fallback) => {
    const res = t(key);
    return res && res !== key ? res : fallback;
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (passwords.new !== passwords.confirm) {
      return setError(getTranslation('reset.passwordsDontMatch', 'Las contraseñas no coinciden.'));
    }
    if (passwords.new.length < 7) {
      return setError(getTranslation('reset.passwordMinLength', 'La contraseña debe tener al menos 7 caracteres.'));
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_BASE_URL}/api/auth/update-profile`, {
        newPassword: passwords.new
      }, {
        headers: { 'x-auth-token': token }
      });

      // Update local user object with full response data
      const updatedUser = { ...res.data.user, mustChangePassword: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Redirect based on role
      if (updatedUser.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || getTranslation('reset.updateError', 'Error al actualizar la contraseña.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)', position: 'relative', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 5 }}>
        <LanguageSwitcher />
      </div>

      <div style={{ maxWidth: '480px', width: '100%', background: '#ffffff', borderRadius: '20px', padding: '48px 40px', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)' }}>
        
        {/* Header Icon */}
        <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 100%)', color: '#ffffff', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 20px rgba(15, 118, 110, 0.3)' }}>
          <ShieldCheck size={32} color="#2dd4bf" />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', letterSpacing: '-0.5px' }}>
            {getTranslation('reset.securityUpdate', 'Actualización de Seguridad')}
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.5 }}>
            {getTranslation('reset.securitySubtitle', 'Por razones de seguridad, debes actualizar tu contraseña para ingresar.')}
          </p>
        </div>

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', fontWeight: 700, marginBottom: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Lock size={14} color="#0f766e" /> {getTranslation('reset.newPassword', 'NUEVA CONTRASEÑA')}
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPass ? "text" : "password"} 
                required
                placeholder="••••••••"
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                style={{ width: '100%', padding: '11px 45px 11px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '14px', outline: 'none' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', fontWeight: 700, marginBottom: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Lock size={14} color="#0f766e" /> {getTranslation('reset.confirmPassword', 'CONFIRMAR NUEVA CONTRASEÑA')}
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPass ? "text" : "password"} 
                required
                placeholder="••••••••"
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                style={{ width: '100%', padding: '11px 45px 11px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '14px', outline: 'none' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', color: '#dc2626', fontSize: '12.5px', fontWeight: 600, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px', width: '100%', padding: '13px', fontSize: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 100%)' }}>
            {loading ? 'Actualizando...' : getTranslation('reset.updateAndEnter', 'Actualizar Contraseña y Entrar')}
            {!loading && <CheckCircle size={18} style={{ marginLeft: 8 }} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
