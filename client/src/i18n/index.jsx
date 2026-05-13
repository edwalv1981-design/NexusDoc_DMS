import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import es from './locales/es';
import en from './locales/en';
import API_BASE_URL from '../config';

const DICTS = { es, en };
const SUPPORTED_LANGS = ['es', 'en'];
const STORAGE_KEY = 'lang';

function detectInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const fromUser = (() => {
      try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && SUPPORTED_LANGS.includes(parsed.language) ? parsed.language : null;
      } catch (_) {
        return null;
      }
    })();
    if (fromUser) return fromUser;
    const nav = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.toLowerCase() : '';
    if (nav.startsWith('en')) return 'en';
  } catch (_) {}
  return 'es';
}

function resolveKey(dict, keyPath) {
  if (!keyPath) return '';
  const parts = String(keyPath).split('.');
  let node = dict;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) {
      node = node[part];
    } else {
      return null;
    }
  }
  return typeof node === 'string' ? node : null;
}

function interpolate(template, params) {
  if (!template) return '';
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name) => {
    const v = params[name];
    return v === undefined || v === null ? '' : String(v);
  });
}

const LanguageContext = createContext({
  lang: 'es',
  t: (k) => k,
  setLang: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang);
  const syncedFromServerRef = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    try { document.documentElement.lang = lang; } catch (_) {}
  }, [lang]);

  const setLang = useCallback(async (nextLang, options = {}) => {
    const normalized = SUPPORTED_LANGS.includes(nextLang) ? nextLang : 'es';
    setLangState(normalized);
    const token = (() => { try { return localStorage.getItem('token'); } catch { return null; } })();
    if (!token || options.skipServerSync) return { ok: true, server: false };
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me/language`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ language: normalized }),
      });
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.language = normalized;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      } catch (_) {}
      return { ok: res.ok, server: true };
    } catch (err) {
      return { ok: false, server: true, error: err };
    }
  }, []);

  const t = useCallback(
    (keyPath, params) => {
      const primary = resolveKey(DICTS[lang], keyPath);
      const fallback = primary !== null ? primary : resolveKey(DICTS.es, keyPath);
      const final = fallback !== null ? fallback : keyPath;
      return interpolate(final, params);
    },
    [lang]
  );

  useEffect(() => {
    if (syncedFromServerRef.current) return;
    let cancelled = false;
    (async () => {
      const token = (() => { try { return localStorage.getItem('token'); } catch { return null; } })();
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: { 'x-auth-token': token } });
        if (!res.ok || cancelled) return;
        const u = await res.json();
        if (cancelled) return;
        if (u && SUPPORTED_LANGS.includes(u.language) && u.language !== lang) {
          setLangState(u.language);
        }
        syncedFromServerRef.current = true;
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [lang]);

  const value = useMemo(() => ({ lang, t, setLang, supported: SUPPORTED_LANGS }), [lang, t, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}

export function useT() {
  const ctx = useContext(LanguageContext);
  return ctx.t;
}

export { SUPPORTED_LANGS };
