import React, { memo } from 'react';
import { ButtonProps } from '../../types';

const SpinnerIcon = () => (
  <svg
    className="animate-spin"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="31.4 31.4"
      opacity="0.25"
    />
    <path
      d="M22 12a10 10 0 0 1-10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const getColorByStatus = (status: string, themeColor: string) => {
  switch (status) {
    case 'success':
      return { bg: '#10B981', hoverBg: '#059669', ring: 'rgba(16,185,129,0.3)' };
    case 'error':
      return { bg: '#EF4444', hoverBg: '#DC2626', ring: 'rgba(239,68,68,0.3)' };
    case 'disabled':
      return { bg: '#9CA3AF', hoverBg: '#9CA3AF', ring: 'transparent' };
    default:
      return { bg: themeColor, hoverBg: darkenColor(themeColor, 10), ring: `${themeColor}4D` };
  }
};

const darkenColor = (color: string, percent: number) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
};

const Button: React.FC<ButtonProps> = memo((props) => {
  const {
    text,
    size,
    themeColor,
    disabled,
    loading,
    status,
    icon,
  } = props;

  const isDisabled = disabled || status === 'disabled' || loading || status === 'loading';
  const currentStatus = status === 'disabled' || status === 'loading' ? status : (isDisabled ? 'disabled' : status);
  const colors = getColorByStatus(currentStatus, themeColor);

  const sizeStyles: Record<string, React.CSSProperties> = {
    small: { padding: '6px 14px', fontSize: '12px', gap: '6px' },
    medium: { padding: '10px 20px', fontSize: '14px', gap: '8px' },
    large: { padding: '14px 28px', fontSize: '16px', gap: '10px' },
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...sizeStyles[size],
    border: 'none',
    borderRadius: '8px',
    backgroundColor: colors.bg,
    color: '#FFFFFF',
    fontWeight: 500,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    userSelect: 'none',
    opacity: isDisabled ? 0.7 : 1,
    boxShadow: currentStatus === 'focus' ? `0 0 0 3px ${colors.ring}` : 'none',
  };

  const hoverStyle: React.CSSProperties = currentStatus === 'hover' && !isDisabled
    ? { backgroundColor: colors.hoverBg, transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }
    : {};

  return (
    <button
      style={{ ...baseStyle, ...hoverStyle }}
      disabled={isDisabled}
      onMouseEnter={() => {}}
      onFocus={() => {}}
    >
      {status === 'loading' || loading ? (
        <SpinnerIcon />
      ) : status === 'success' ? (
        <CheckIcon />
      ) : status === 'error' ? (
        <XIcon />
      ) : icon ? (
        <span style={{ display: 'inline-flex', fontSize: size === 'small' ? '14px' : size === 'medium' ? '16px' : '18px' }}>{icon}</span>
      ) : null}
      <span>{text}</span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
