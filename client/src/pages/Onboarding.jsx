import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Building, Heart, User, ShieldAlert, ChevronLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useT } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Onboarding = () => {
  const navigate = useNavigate();
  const t = useT();

  const options = [
    { id: 'Fondos Registros contables', label: t('formType.Fondos Registros contables'), icon: <ClipboardList size={26} />, color: '#0f766e', bg: '#f0fdf4', border: '#bbf7d0' },
    { id: 'Corporación', label: t('formType.Corporación'), icon: <Building size={26} />, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
    { id: 'Fundaciones', label: t('formType.Fundaciones'), icon: <Heart size={26} />, color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
    { id: 'Cumplimiento Individual', label: t('formType.Cumplimiento Individual'), icon: <User size={26} />, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { id: 'Cumplimiento Entidades', label: t('formType.Cumplimiento Entidades'), icon: <ShieldAlert size={26} />, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  ];

  const handleSelect = (optionId) => {
    localStorage.setItem('selectedForm', optionId);
    navigate('/register');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)', position: 'relative', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 5 }}>
        <LanguageSwitcher />
      </div>

      <div style={{ maxWidth: '960px', width: '100%', position: 'relative' }}>
        {/* Navigation Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}
          >
            <ChevronLeft size={18} /> {t('onboarding.backToStart')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff' }}>
            <div style={{ padding: '6px', background: 'rgba(20, 184, 166, 0.2)', borderRadius: '8px', border: '1px solid rgba(45, 212, 191, 0.3)', color: '#2dd4bf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>NexusDoc DMS</span>
          </div>
        </div>

        {/* Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', color: '#ffffff', letterSpacing: '-0.5px' }}>
            {t('onboarding.title')}
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '15px', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            {t('onboarding.subtitle')}
          </p>
        </div>

        {/* Form Options Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '22px' }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              style={{
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '18px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: '#ffffff',
                borderRadius: '20px',
                outline: 'none',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = '#14b8a6';
                e.currentTarget.style.boxShadow = '0 25px 50px -10px rgba(20, 184, 166, 0.25)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(0, 0, 0, 0.3)';
              }}
            >
              <div style={{ 
                background: opt.bg, 
                color: opt.color, 
                border: `1px solid ${opt.border}`,
                width: '64px', 
                height: '64px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
              }}>
                {opt.icon}
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{opt.label}</h3>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Comenzar registro <ArrowRight size={13} color="#0f766e" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
