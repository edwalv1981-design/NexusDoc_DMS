import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Building, Heart, User, ShieldAlert, ChevronLeft } from 'lucide-react';

import { useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Onboarding = () => {
  const navigate = useNavigate();
  const t = useT();

  const options = [
    { id: 'Fondos Registros contables', label: t('formType.Fondos Registros contables'), icon: <ClipboardList size={24} />, color: '#6366f1' },
    { id: 'Corporación', label: t('formType.Corporación'), icon: <Building size={24} />, color: '#10b981' },
    { id: 'Fundaciones', label: t('formType.Fundaciones'), icon: <Heart size={24} />, color: '#ef4444' },
    { id: 'Cumplimiento Individual', label: t('formType.Cumplimiento Individual'), icon: <User size={24} />, color: '#f59e0b' },
    { id: 'Cumplimiento Entidades', label: t('formType.Cumplimiento Entidades'), icon: <ShieldAlert size={24} />, color: '#3b82f6' },
  ];

  const handleSelect = (optionId) => {
    localStorage.setItem('selectedForm', optionId);
    navigate('/register');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#f8fafc', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <LanguageSwitcher />
      </div>
      <div style={{ maxWidth: '800px', width: '100%', textAlign: 'center' }}>
        <button 
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: '40px', fontSize: '16px' }}
        >
          <ChevronLeft size={20} /> {t('onboarding.backToStart')}
        </button>

        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', color: 'var(--text)' }}>
          {t('onboarding.title')}
        </h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '18px', marginBottom: '60px' }}>
          {t('onboarding.subtitle')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className="glass-card"
              style={{
                padding: '40px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid transparent',
                background: 'white',
                outline: 'none'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = opt.color;
                e.currentTarget.style.boxShadow = `0 20px 25px -5px ${opt.color}20`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
              }}
            >
              <div style={{ 
                background: `${opt.color}15`, 
                color: opt.color, 
                width: '60px', 
                height: '60px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {opt.icon}
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
