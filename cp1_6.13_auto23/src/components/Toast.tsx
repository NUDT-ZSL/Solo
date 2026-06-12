import { useEffect } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, visible, onClose, duration = 2000 }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#ffffff',
        color: '#1e1e2e',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        fontSize: '14px',
        fontWeight: 500,
        animation: 'toastIn 0.2s ease-out',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}
    >
      {message}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
