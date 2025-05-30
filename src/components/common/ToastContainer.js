// src/components/common/ToastContainer.js
import React from 'react';
import { useToast } from '../../contexts/ToastContext'; // Adjust path if needed
import Toast from './Toast'; // We'll create this next
import styles from './ToastContainer.module.css'; // Create this for container specific styles if any

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    // This outer div will use the .toast-container class from App.css for positioning
    <div className={`toast-container ${styles.container}`}> {/* Using global class and optional module class */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default ToastContainer;