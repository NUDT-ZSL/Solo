import React, { useEffect } from 'react';

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
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: slideUp ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
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
          animation: slideUp ? 'slideUp 0.4s ease-out' : 'scaleIn 0.3s ease-out',
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
