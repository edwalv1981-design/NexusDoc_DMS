import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { useT } from './i18n';

const Onboarding = lazy(() => import('./pages/Onboarding'));
const Register = lazy(() => import('./pages/Register'));
const Verify = lazy(() => import('./pages/Verify'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const FondosForm = lazy(() => import('./pages/FondosForm'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

function App() {
  const t = useT();
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60);
  const timerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // 1. LÓGICA DE INACTIVIDAD (1 MINUTO DE INACTIVIDAD COMPLETA DE LA PANTALLA)
  const TIMEOUT_DURATION = 60000; // 1 minuto (60,000 ms)

  const lastUpdateRef = useRef(0);

  const forceResetActivity = () => {
    const now = Date.now();
    lastUpdateRef.current = now;
    try {
      localStorage.setItem('lastActivityTime', now.toString());
    } catch (_) {}
  };

  const updateActivity = () => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 1000) return;
    lastUpdateRef.current = now;
    try {
      localStorage.setItem('lastActivityTime', now.toString());
    } catch (_) {}
  };

  // 2. MANEJO DE CIERRE DE SESIÓN Y CONTINUAR
  const handleLogout = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    try { localStorage.clear(); } catch (_) {}
    setShowTimeoutModal(false);
    window.location.href = '/'; 
  };

  const handleStay = () => {
    forceResetActivity();
    setRemainingTime(30);
    setShowTimeoutModal(false);
  };

  // 3. EFECTO PARA EL COUNTDOWN (30 SEGUNDOS DE ADVERTENCIA)
  useEffect(() => {
    if (showTimeoutModal) {
      setRemainingTime(30);
      countdownIntervalRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showTimeoutModal]);

  // 4. EFECTO PARA DESLOGUEAR AL RECARGAR PÁGINA (F5)
  useEffect(() => {
    const navEntries = window.performance.getEntriesByType('navigation');
    if (navEntries.length > 0 && navEntries[0].type === 'reload') {
      localStorage.clear();
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
  }, []);

  // 5. EFECTO PARA DETECTAR ACTIVIDAD Y CHEQUEAR TIEMPO MUERTO
  useEffect(() => {
    if (!localStorage.getItem('lastActivityTime')) {
      forceResetActivity();
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'keydown', 'scroll', 'touchstart', 'click', 'input', 'focus'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    const checkInactivity = setInterval(() => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const lastActivity = parseInt(localStorage.getItem('lastActivityTime') || Date.now().toString(), 10);
      const timeSinceLastActivity = Date.now() - lastActivity;

      if (timeSinceLastActivity >= TIMEOUT_DURATION) {
        setShowTimeoutModal(true);
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(checkInactivity);
    };
  }, []);

  // 6. EFECTO PARA BLOQUEAR EL BOTÓN ATRÁS DEL NAVEGADOR
  useEffect(() => {
    // Empuja un estado inicial
    window.history.pushState(null, null, window.location.href);
    const handlePopState = (event) => {
      // Forzar que el usuario siempre se mantenga en el estado actual si intenta retroceder
      window.history.pushState(null, null, window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <ToastProvider>
      <Router>
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route 
            path="/admin" 
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <ClientDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/forms/fondos" 
            element={
              <ProtectedRoute>
                <FondosForm />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>

        {showTimeoutModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '16px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
              <div style={{ width: '60px', height: '60px', background: '#fff1f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <span style={{ fontSize: '24px' }}>⏳</span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111', marginBottom: '10px' }}>{t('timeout.title')}</h2>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px', lineHeight: '1.5' }}>{t('timeout.body', { n: remainingTime })}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={handleStay} style={{ padding: '14px', background: '#0f766e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>{t('timeout.continue')}</button>
                <button onClick={handleLogout} style={{ padding: '14px', background: 'transparent', color: '#dc2626', border: '1px solid #fee2e2', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>{t('timeout.logoutNow')}</button>
              </div>
            </div>
          </div>
        )}
      </Router>
    </ToastProvider>
  );
}

export default App;
