import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          animation: 'slideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#f3f4f6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e5e7eb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f3f4f6')}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
