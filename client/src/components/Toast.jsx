import React, { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (type, message, duration = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const toast = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg, duration) => addToast('info', msg, duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} style={t.type === 'info' ? { borderLeft: '4px solid #3b82f6', background: '#eff6ff' } : {}}>
            <div className="toast-icon">
              {t.type === 'success' ? <CheckCircle size={18} /> : t.type === 'error' ? <XCircle size={18} /> : <Info size={18} color="#3b82f6" />}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
              {t.message}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
