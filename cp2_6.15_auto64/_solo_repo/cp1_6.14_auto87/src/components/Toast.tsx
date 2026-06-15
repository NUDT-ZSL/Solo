interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

function Toast({ message, type }: ToastProps) {
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  const colors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3',
  };

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon" style={{ backgroundColor: colors[type] }}>
        {icons[type]}
      </span>
      <span className="toast-message">{message}</span>
      
      <style>{`
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          background: rgba(30, 30, 46, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: slideIn 0.3s ease-out;
          min-width: 280px;
          max-width: 400px;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .toast-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .toast-message {
          font-size: 14px;
          color: #e0e0e0;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .toast {
            min-width: auto;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default Toast;
