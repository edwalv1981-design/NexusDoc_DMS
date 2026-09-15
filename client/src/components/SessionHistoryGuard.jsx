import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function clearSession() {
  try {
    localStorage.clear();
  } catch (_) {}
}

function isReloadNavigation() {
  try {
    const nav = window.performance && window.performance.getEntriesByType
      ? window.performance.getEntriesByType('navigation')[0]
      : null;
    if (nav && nav.type === 'reload') return true;
    if (typeof performance.navigation !== 'undefined' && performance.navigation.type === 1) {
      return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Una sola entrada de historial (el Atrás del navegador no recorre el sistema)
 * y F5 / Actualizar cierra sesión.
 */
export default function SessionHistoryGuard() {
  const location = useLocation();

  useEffect(() => {
    if (!isReloadNavigation()) return;
    if (!localStorage.getItem('token') && location.pathname === '/') return;
    clearSession();
    if (location.pathname !== '/' || location.search) {
      window.location.replace('/');
    }
  }, []);

  useEffect(() => {
    const onPageShow = (event) => {
      if (!event.persisted) return;
      clearSession();
      window.location.replace('/');
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useEffect(() => {
    const href = window.location.href;
    window.history.replaceState({ nexusDocLock: 1 }, '', href);
    window.history.pushState({ nexusDocLock: 1 }, '', href);

    const onPopState = () => {
      window.history.pushState({ nexusDocLock: 1 }, '', window.location.href);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [location.pathname, location.search]);

  return null;
}
