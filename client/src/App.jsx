import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Register from './pages/Register';
import Verify from './pages/Verify';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import FondosForm from './pages/FondosForm';
import ResetPassword from './pages/ResetPassword';
import Tutorial from './pages/Tutorial';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { useT } from './i18n';

function App() {
  const t = useT();
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60);
  const timerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // 1. LÓGICA DE INACTIVIDAD (PERSISTENTE EN LOCALSTORAGE)
  const TIMEOUT_DURATION = 60000; // 60 segundos de inactividad antes de advertir

  const updateActivity = () => {
    const token = localStorage.getItem('token');
    if (!token || showTimeoutModal) return;
    localStorage.setItem('lastActivityTime', Date.now().toString());
  };

  // 2. MANEJO DE CIERRE DE SESIÓN
  const handleLogout = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    localStorage.clear();
    setShowTimeoutModal(false);
    window.location.href = '/'; 
  };

  const handleStay = () => {
    setShowTimeoutModal(false);
    updateActivity();
  };

  // 3. EFECTO PARA EL COUNTDOWN (INDEPENDIENTE Y PERSISTENTE)
  useEffect(() => {
    if (showTimeoutModal) {
      setRemainingTime(60);
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
    // Inicializar si no existe
    if (!localStorage.getItem('lastActivityTime')) {
        localStorage.setItem('lastActivityTime', Date.now().toString());
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    const checkInactivity = setInterval(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const lastActivity = parseInt(localStorage.getItem('lastActivityTime') || Date.now().toString(), 10);
        const timeSinceLastActivity = Date.now() - lastActivity;

        if (timeSinceLastActivity >= TIMEOUT_DURATION && !showTimeoutModal) {
            setShowTimeoutModal(true);
        }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(checkInactivity);
    };
  }, [showTimeoutModal]);

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />

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
