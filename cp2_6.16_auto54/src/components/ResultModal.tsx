import React, { useEffect, useState } from 'react';

interface ResultModalProps {
  isVisible: boolean;
  isVictory: boolean | null;
  message: string;
  onClose: () => void;
  onRestart?: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = React.memo(({
  isVisible,
  isVictory,
  message,
  onClose,
  onRestart,
}) => {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowAnimation(true);
    } else {
      setShowAnimation(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const bgColor = isVictory ? '#2e7d32' : '#c62828';
  const titleText = isVictory ? '🎉 胜利！' : '💀 失败';

  return (
    <div style={styles.overlay}>
      <div
        style={{
          ...styles.modal,
          backgroundColor: bgColor,
          transform: showAnimation ? 'scale(1)' : 'scale(0)',
          opacity: showAnimation ? 1 : 0,
        }}
      >
        <h2 style={styles.title}>{titleText}</h2>
        <p style={styles.message}>{message}</p>
        <div style={styles.buttonRow}>
          {isVictory && (
            <button style={styles.button} onClick={onClose}>
              继续
            </button>
          )}
          {!isVictory && onRestart && (
            <button style={styles.button} onClick={onRestart}>
              重新开始
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ResultModal.displayName = 'ResultModal';

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: 300,
    height: 200,
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    fontFamily: 'monospace',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    margin: 0,
  },
  message: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    margin: 0,
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  button: {
    padding: '10px 24px',
    borderRadius: 20,
    border: 'none',
    backgroundColor: '#ffffff',
    color: '#0d0d0d',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'all 0.2s ease',
  },
};
