import React from 'react';
import { Globe } from 'lucide-react';
import { useLang } from '../i18n';

const LanguageSwitcher = ({ variant = 'pill', dark = false }) => {
  const { lang, setLang } = useLang();

  if (variant === 'sidebar') {
    return (
      <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 6 }}>
          <Globe size={12} /> {lang === 'es' ? 'IDIOMA' : 'LANGUAGE'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['es', 'en'].map((code) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              style={{
                flex: 1,
                padding: '6px 0',
                background: lang === code ? 'rgba(255,255,255,0.25)' : 'transparent',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {code === 'es' ? 'ES' : 'EN'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const base = dark
    ? { bg: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.3)', color: 'white', active: 'rgba(255,255,255,0.3)' }
    : { bg: 'white', border: '#e2e8f0', color: '#0f172a', active: '#0078d4' };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: base.bg, border: `1px solid ${base.border}`, padding: 4, borderRadius: 999 }}>
      <Globe size={14} color={base.color} style={{ marginLeft: 6 }} />
      {['es', 'en'].map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          style={{
            padding: '4px 10px',
            background: lang === code ? base.active : 'transparent',
            color: lang === code ? (dark ? 'white' : 'white') : base.color,
            border: 'none',
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 11,
            cursor: 'pointer',
            minWidth: 28,
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
