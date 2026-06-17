import React, { memo } from 'react';
import { ModalProps } from '../../types';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return { accent: '#10B981', confirmBg: '#10B981', confirmHover: '#059669' };
    case 'error':
      return { accent: '#EF4444', confirmBg: '#EF4444', confirmHover: '#DC2626' };
    case 'loading':
      return { accent: '#2563EB', confirmBg: '#2563EB', confirmHover: '#1D4ED8' };
    default:
      return { accent: '#2563EB', confirmBg: '#2563EB', confirmHover: '#1D4ED8' };
  }
};

const SpinnerIcon = () => (
  <svg
    className="animate-spin"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" opacity="0.25" />
    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Modal: React.FC<ModalProps> = memo((props) => {
  const {
    title,
    content,
    visible,
    confirmText,
    cancelText,
    status,
    showClose,
  } = props;

  const colors = getStatusColor(status);
  const isDisabled = status === 'disabled';

  const maskStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '220px',
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    opacity: visible ? 1 : 0.3,
    transition: 'opacity 300ms ease',
  };

  const modalStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
    transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: status !== 'default' ? `3px solid ${colors.accent}` : '1px solid #E2E8F0',
    transition: 'border-color 200ms ease',
  };

  const contentStyle: React.CSSProperties = {
    padding: '24px',
    color: '#475569',
    fontSize: '14px',
    lineHeight: 1.6,
    minHeight: '80px',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
  };

  const cancelBtnStyle: React.CSSProperties = {
    padding: '8px 20px',
    fontSize: '14px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#475569',
    borderRadius: '6px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    transition: 'all 200ms ease',
  };

  const confirmBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 20px',
    fontSize: '14px',
    border: 'none',
    backgroundColor: colors.confirmBg,
    color: '#FFFFFF',
    borderRadius: '6px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    fontWeight: 500,
    transition: 'all 200ms ease',
  };

  return (
    <div style={maskStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
            {title}
          </h3>
          {showClose && (
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                padding: '4px',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
                transition: 'all 200ms ease',
              }}
              disabled={isDisabled}
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <div style={contentStyle}>
          {content}
        </div>
        <div style={footerStyle}>
          <button style={cancelBtnStyle} disabled={isDisabled}>
            {cancelText}
          </button>
          <button style={confirmBtnStyle} disabled={isDisabled}>
            {status === 'loading' && <SpinnerIcon />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

export default Modal;
