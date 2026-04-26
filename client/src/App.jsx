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
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';

function App() {
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60);
  const timerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // 1. LÓGICA DE INACTIVIDAD (RESETEO)
  const resetTimer = () => {
    // Si no hay token o ya está el modal, no hacemos nada
    const token = localStorage.getItem('token');
    if (!token || showTimeoutModal) return;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Si no hay actividad por 60 segundos, mostramos el modal
    timerRef.current = setTimeout(() => {
      setShowTimeoutModal(true);
    }, 60000); 
  };

  // 2. MANEJO DE CIERRE DE SESIÓN
  const handleLogout = () => {
    clearInterval(countdownIntervalRef.current);
    localStorage.clear();
    setShowTimeoutModal(false);
    window.location.href = '/'; 
  };

  const handleStay = () => {
    setShowTimeoutModal(false);
    resetTimer();
  };

  // 3. EFECTO PARA EL COUNTDOWN (INDEPENDIENTE)
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

  // 4. EFECTO PARA DETECTAR ACTIVIDAD
  useEffect(() => {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0 && navEntries[0].type === 'reload') {
      localStorage.clear();
      window.location.href = '/';
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
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
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111', marginBottom: '10px' }}>¿Sigues ahí?</h2>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px', lineHeight: '1.5' }}>Tu sesión expirará por inactividad en <strong style={{ color: '#0078d4', fontSize: '18px' }}>{remainingTime} segundos</strong> por seguridad.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={handleStay} style={{ padding: '14px', background: '#0078d4', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>CONTINUAR EN EL SISTEMA</button>
                <button onClick={handleLogout} style={{ padding: '14px', background: 'transparent', color: '#dc2626', border: '1px solid #fee2e2', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>CERRAR SESIÓN AHORA</button>
              </div>
            </div>
          </div>
        )}
      </Router>
    </ToastProvider>
  );
}

export default App;
