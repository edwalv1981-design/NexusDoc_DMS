import React, { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (type, message) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const toast = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-icon">
              {t.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
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
