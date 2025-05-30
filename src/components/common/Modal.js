// src/components/common/Modal.js
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './Modal.module.css'; // Your Modal.module.css
// You might need to import global styles if you plan to use global .btn classes
// For example, if App.css is imported globally in App.js, it might already be available.
// Otherwise, for explicit global class usage:
// import globalStyles from '../../App.css'; // Adjust path as needed if you use this

const modalRoot = document.getElementById('modal-root'); // Ensure you have <div id="modal-root"></div> in your public/index.html

function Modal({ isOpen, onClose, title, children, footerActions }) {
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!modalRoot || !isOpen) {
    return null;
  }

  return ReactDOM.createPortal(
    <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {title && <div className={styles.header} id="modal-title">{title}</div>}
        <div className={styles.body}>
          {children}
        </div>
        {footerActions && footerActions.length > 0 && (
          <div className={styles.footer}>
            {footerActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                // Apply global button classes from App.css and variant-specific ones
                // Assumes global styles like .btn, .btn-secondary are available
                // If not, you might need to import them or use module-specific styles.
                className={`btn ${action.variant ? `btn-${action.variant}` : 'btn-secondary'}`}
              >
                {action.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    modalRoot
  );
}

export default Modal;