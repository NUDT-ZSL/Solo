import React, { memo, useState } from 'react';
import { DropdownProps } from '../../types';

const getBorderColor = (status: string) => {
  switch (status) {
    case 'success':
      return { border: '#10B981', ring: 'rgba(16,185,129,0.2)' };
    case 'error':
      return { border: '#EF4444', ring: 'rgba(239,68,68,0.2)' };
    case 'focus':
    case 'default':
      return { border: '#2563EB', ring: 'rgba(37,99,235,0.2)' };
    case 'hover':
      return { border: '#64748B', ring: 'transparent' };
    case 'disabled':
      return { border: '#E2E8F0', ring: 'transparent' };
    default:
      return { border: '#CBD5E1', ring: 'transparent' };
  }
};

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform 200ms ease',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Dropdown: React.FC<DropdownProps> = memo((props) => {
  const {
    value,
    options,
    placeholder,
    size,
    disabled,
    status,
    open: controlledOpen,
  } = props;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen || internalOpen;

  const isDisabled = disabled || status === 'disabled';
  const displayStatus = isDisabled ? 'disabled' : (open ? 'focus' : status);
  const colors = getBorderColor(displayStatus);

  const sizeStyles: Record<string, React.CSSProperties> = {
    small: { height: '32px', fontSize: '12px', padding: '0 12px', minWidth: '180px' },
    medium: { height: '40px', fontSize: '14px', padding: '0 14px', minWidth: '220px' },
    large: { height: '48px', fontSize: '16px', padding: '0 18px', minWidth: '260px' },
  };

  const optionSizeStyles: Record<string, React.CSSProperties> = {
    small: { padding: '8px 12px', fontSize: '12px' },
    medium: { padding: '10px 14px', fontSize: '14px' },
    large: { padding: '12px 18px', fontSize: '16px' },
  };

  const selectedOption = options.find(o => o.value === value);

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    ...sizeStyles[size],
  };

  const selectorStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    padding: sizeStyles[size].padding,
    backgroundColor: isDisabled ? '#F1F5F9' : '#FFFFFF',
    border: `2px solid ${colors.border}`,
    borderRadius: '8px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: displayStatus === 'focus' ? `0 0 0 3px ${colors.ring}` : 'none',
    opacity: isDisabled ? 0.7 : 1,
  };

  const dropdownMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
    maxHeight: '240px',
    overflowY: 'auto',
    zIndex: 100,
    opacity: open ? 1 : 0,
    visibility: open ? 'visible' : 'hidden',
    transform: open ? 'translateY(0)' : 'translateY(-8px)',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div style={wrapperStyle}>
      <div
        style={selectorStyle}
        onClick={() => !isDisabled && setInternalOpen(!open)}
      >
        <span style={{
          color: selectedOption ? '#1E293B' : '#94A3B8',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          marginRight: '8px',
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center' }}>
          <ChevronIcon open={open} />
        </span>
      </div>

      <div style={dropdownMenuStyle}>
        {options.map((option, index) => (
          <div
            key={option.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              ...optionSizeStyles[size],
              cursor: 'pointer',
              backgroundColor: option.value === value ? '#EFF6FF' : 'transparent',
              color: '#334155',
              fontWeight: option.value === value ? 500 : 400,
              transition: 'background-color 150ms ease',
              borderTop: index === 0 ? 'none' : '1px solid #F1F5F9',
            }}
            onMouseEnter={(e) => {
              if (option.value !== value) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F8FAFC';
              }
            }}
            onMouseLeave={(e) => {
              if (option.value !== value) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
              }
            }}
            onClick={() => {
              if (!isDisabled) {
                setInternalOpen(false);
              }
            }}
          >
            <span>{option.label}</span>
            {option.value === value && <CheckIcon />}
          </div>
        ))}
      </div>
    </div>
  );
});

Dropdown.displayName = 'Dropdown';

export default Dropdown;
