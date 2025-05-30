// src/contexts/ToastContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []); // removeToast itself has no dependencies from this scope

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prevToasts => [...prevToasts, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id); // Now removeToast is correctly in scope
    }, duration);
  }, [removeToast]); // Added removeToast to the dependency array

  const value = { addToast, removeToast, toasts };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};