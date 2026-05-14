import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useT } from '../i18n';
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

  const handleReset = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return setError(t('reset.passwordsDontMatch'));
    }
    if (passwords.new.length < 7) {
      return setError(t('reset.passwordMinLength'));
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
      setError(err.response?.data?.msg || t('reset.updateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#f8fafc' }}>
      <div className="form-card" style={{ maxWidth: '500px', width: '100%', padding: '50px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ background: '#fef2f2', color: '#dc2626', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>{t('reset.securityUpdate')}</h2>
          <p style={{ color: 'var(--text-sub)' }}>{t('reset.securitySubtitle')}</p>
        </div>

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: 8, color: 'var(--text-sub)' }}>{t('reset.newPassword')}</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPass ? "text" : "password"} 
                className="input-field"
                required
                placeholder="••••••••"
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                style={{ paddingRight: '45px' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 15, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: 8, color: 'var(--text-sub)' }}>{t('reset.confirmPassword')}</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPass ? "text" : "password"} 
                className="input-field"
                required
                placeholder="••••••••"
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                style={{ paddingRight: '45px' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 15, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: '14px', textAlign: 'center', fontWeight: 500 }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px', height: '52px' }}>
            {loading ? t('common.saving') : t('reset.updateAndEnter')}
            {!loading && <CheckCircle size={18} style={{ marginLeft: 8, verticalAlign: 'middle' }} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
