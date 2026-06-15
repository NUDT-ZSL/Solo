import React from 'react';
import { useApp } from '../context/AppContext';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div style={styles.container}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            ...styles.toast,
            backgroundColor: toast.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
          }}
          onClick={() => removeToast(toast.id)}
        >
          <span style={styles.toastIcon}>
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          <span style={styles.toastMessage}>{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '80px',
    right: '24px',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    animation: 'slideInRight 0.3s ease-out',
    pointerEvents: 'auto',
  },
  toastIcon: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  toastMessage: {
    flex: 1,
  },
};

export default ToastContainer;
