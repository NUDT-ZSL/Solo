import React from 'react';

interface Props {
  message: string;
  onClose: () => void;
}

const ErrorToast: React.FC<Props> = ({ message, onClose }) => {
  return (
    <div style={styles.wrap} onClick={onClose}>
      <div style={styles.icon}>!</div>
      <span style={styles.text}>{message}</span>
      <button style={styles.closeBtn} onClick={(e) => { e.stopPropagation(); onClose(); }}>
        ✕
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    top: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255, 107, 107, 0.95)',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
    zIndex: 2000,
    cursor: 'pointer',
    animation: 'fade-in 0.2s ease-out',
    maxWidth: '90vw',
  },
  icon: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
  },
  text: {
    fontSize: 14,
    fontWeight: 500,
  },
  closeBtn: {
    background: 'transparent',
    color: '#fff',
    fontSize: 14,
    padding: 2,
    marginLeft: 8,
    opacity: 0.8,
  },
};

export default ErrorToast;
