import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
}

const bgColors: Record<ToastType, string> = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#1e293b',
};

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const renderIcon = () => {
    const iconSize = 16;
    const iconStyle = { marginRight: '8px', flexShrink: 0 as const };

    switch (type) {
      case 'success':
        return <CheckCircle size={iconSize} style={iconStyle} />;
      case 'error':
        return <AlertCircle size={iconSize} style={iconStyle} />;
      case 'info':
      default:
        return <Info size={iconSize} style={iconStyle} />;
    }
  };

  return (
    <div
      className="toast"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: bgColors[type],
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '14px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        animation: 'toast-in 0.3s ease',
      }}
    >
      {renderIcon()}
      <span>{message}</span>
    </div>
  );
};

export default Toast;
