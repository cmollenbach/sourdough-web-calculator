// src/components/common/Toast.js
import React, { useState, useEffect } from 'react';
import styles from './Toast.module.css'; // Your Toast.module.css

// Simple icons as Unicode characters (replace with SVGs or an icon library for better visuals)
const ICONS = {
  info: 'ℹ️',
  success: '✔️', // Check mark
  warning: '⚠️',
  error: '❌', // Cross mark
};

function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
      setShow(true);
    });

    // Auto close logic is now primarily handled by ToastProvider,
    // but if you want the Toast to manage its own fade-out before removal:
    const timer = setTimeout(() => {
      setShow(false);
      // Give time for fade-out animation before calling onClose which removes it from DOM
      setTimeout(onClose, 300); // Matches transition duration
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);


  const icon = ICONS[type] || ICONS.info;

  return (
    // The outer div uses global .toast and type-specific classes from App.css
    // combined with local module classes.
    <div
      className={`toast toast-${type} ${styles.toast} ${show ? styles.toastShow : ''}`}
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      style={{ pointerEvents: 'auto' }} /* Re-enable pointer events for individual toasts */
    >
      {icon && <span className={styles.toastIcon}>{icon}</span>}
      <p className={styles.message}>{message}</p>
      <button onClick={onClose} className={styles.closeButton} aria-label="Close notification">
        &times;
      </button>
    </div>
  );
}

export default Toast;