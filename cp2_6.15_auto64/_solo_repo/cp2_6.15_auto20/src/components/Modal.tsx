import React, { useEffect, useState } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  slideUp?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  width = 400,
  slideUp = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!isVisible && !open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: isAnimating ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0)',
        display: 'flex',
        alignItems: slideUp ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        transition: 'background 0.3s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `${width}px`,
          maxWidth: '92vw',
          maxHeight: slideUp ? '85vh' : '90vh',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflowY: 'auto',
          transform: slideUp
            ? (isAnimating ? 'translateY(0)' : 'translateY(100%)')
            : (isAnimating ? 'translateY(0) scale(1)' : 'translateY(100%) scale(0.8)'),
          opacity: isAnimating ? 1 : 0,
          transition: 'transform 0.4s ease-out, opacity 0.3s ease',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--progress-bg)',
            color: 'var(--text-primary)',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-pink)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--progress-bg)')}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
