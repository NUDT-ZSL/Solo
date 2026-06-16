import React from 'react';

interface ControlBarProps {
  onReset: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({ onReset }) => {
  return (
    <button
      onClick={onReset}
      style={{
        width: 140,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#e63946',
        color: '#ffffff',
        border: 'none',
        fontSize: 16,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#c1121f';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(230, 57, 70, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#e63946';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      🔄 重置
    </button>
  );
};
