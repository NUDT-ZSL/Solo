import React, { memo } from 'react';
import { InputProps } from '../../types';

const getBorderColor = (status: string) => {
  switch (status) {
    case 'success':
      return { border: '#10B981', ring: 'rgba(16,185,129,0.2)' };
    case 'error':
      return { border: '#EF4444', ring: 'rgba(239,68,68,0.2)' };
    case 'focus':
      return { border: '#2563EB', ring: 'rgba(37,99,235,0.2)' };
    case 'hover':
      return { border: '#64748B', ring: 'transparent' };
    case 'disabled':
      return { border: '#E2E8F0', ring: 'transparent' };
    default:
      return { border: '#CBD5E1', ring: 'transparent' };
  }
};

const Input: React.FC<InputProps> = memo((props) => {
  const {
    value,
    placeholder,
    size,
    disabled,
    status,
    prefixIcon,
    suffixIcon,
    maxLength,
  } = props;

  const isDisabled = disabled || status === 'disabled';
  const colors = getBorderColor(isDisabled ? 'disabled' : status);

  const sizeStyles: Record<string, React.CSSProperties> = {
    small: { height: '32px', fontSize: '12px', padding: '0 10px' },
    medium: { height: '40px', fontSize: '14px', padding: '0 14px' },
    large: { height: '48px', fontSize: '16px', padding: '0 18px' },
  };

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    width: '320px',
    ...sizeStyles[size],
    backgroundColor: isDisabled ? '#F1F5F9' : '#FFFFFF',
    border: `2px solid ${colors.border}`,
    borderRadius: '8px',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: status === 'focus' ? `0 0 0 3px ${colors.ring}` : 'none',
    cursor: isDisabled ? 'not-allowed' : 'text',
    opacity: isDisabled ? 0.7 : 1,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 'inherit',
    color: isDisabled ? '#94A3B8' : '#1E293B',
    width: '100%',
    minWidth: 0,
  };

  const iconStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: size === 'small' ? '14px' : size === 'medium' ? '16px' : '18px',
    color: '#94A3B8',
    flexShrink: 0,
  };

  return (
    <div style={wrapperStyle}>
      {prefixIcon && <span style={{ ...iconStyle, marginRight: size === 'small' ? '6px' : '8px' }}>{prefixIcon}</span>}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={isDisabled}
        maxLength={maxLength}
        style={inputStyle}
        readOnly
      />
      {suffixIcon && <span style={{ ...iconStyle, marginLeft: size === 'small' ? '6px' : '8px' }}>{suffixIcon}</span>}
      {maxLength && (
        <span style={{ ...iconStyle, marginLeft: '8px', fontSize: '11px', color: '#94A3B8' }}>
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
