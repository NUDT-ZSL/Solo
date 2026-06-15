import React from 'react';

interface Props {
  code: string;
  from: string;
  onClose: () => void;
}

const BroadcastModal: React.FC<Props> = ({ code, from, onClose }) => {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.tag}>示例代码</div>
            <div style={styles.title}>来自 {from} 的代码</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <pre style={styles.code}>{code}</pre>
        <div style={styles.footer}>
          <button style={styles.okBtn} onClick={onClose}>
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
    animation: 'fade-in 0.2s ease-out',
  },
  modal: {
    background: '#1E1E1E',
    borderRadius: 12,
    width: '100%',
    maxWidth: 720,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #333',
  },
  tag: {
    display: 'inline-block',
    padding: '3px 10px',
    background: 'rgba(78, 205, 196, 0.15)',
    color: '#4ECDC4',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 6,
  },
  title: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'transparent',
    color: '#858585',
    fontSize: 18,
    padding: 4,
    lineHeight: 1,
  },
  code: {
    flex: 1,
    margin: 0,
    padding: 24,
    background: '#121212',
    color: '#E0E0E0',
    fontFamily: "'Fira Code', monospace",
    fontSize: 14,
    lineHeight: 1.6,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #333',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  okBtn: {
    padding: '10px 24px',
    background: '#4ECDC4',
    color: '#121212',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
  },
};

export default BroadcastModal;
