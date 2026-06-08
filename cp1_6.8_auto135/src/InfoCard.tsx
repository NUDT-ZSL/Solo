import React, { useEffect, useState } from 'react';

export interface InfoCardData {
  age: number;
  glowIntensity: number;
  branchCount: number;
  depth: number;
  screenX: number;
  screenY: number;
}

interface InfoCardProps {
  data: InfoCardData | null;
  onClose: () => void;
}

const cardBase: React.CSSProperties = {
  position: 'fixed',
  width: 220,
  background: 'rgba(20, 15, 10, 0.8)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(100, 80, 60, 0.35)',
  borderRadius: 14,
  padding: 18,
  color: '#d4c4a8',
  fontFamily: "'Segoe UI', sans-serif",
  zIndex: 200,
  pointerEvents: 'auto',
  boxShadow:
    '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px rgba(100,60,200,0.15)',
  transition: 'opacity 0.3s ease, transform 0.3s ease',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0',
  borderBottom: '1px solid rgba(100, 80, 60, 0.15)',
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  color: '#8a7a60',
  fontSize: 12,
};

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 10,
  background: 'none',
  border: 'none',
  color: '#8a7a60',
  fontSize: 16,
  cursor: 'pointer',
  padding: 4,
  lineHeight: 1,
};

export const InfoCard: React.FC<InfoCardProps> = ({ data, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (data) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [data]);

  if (!data) return null;

  const left = Math.min(data.screenX + 20, window.innerWidth - 250);
  const top = Math.min(data.screenY - 40, window.innerHeight - 200);

  return (
    <div
      style={{
        ...cardBase,
        left,
        top,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button style={closeBtnStyle} onClick={onClose}>
        ✕
      </button>

      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          marginBottom: 10,
          letterSpacing: 0.5,
          color: '#e8d8b8',
        }}
      >
        💎 晶体束 #{data.depth}
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>年龄</span>
        <span style={valueStyle}>{data.age.toFixed(1)}s</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>光泽强度</span>
        <span style={valueStyle}>{data.glowIntensity}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>分支数</span>
        <span style={valueStyle}>{data.branchCount}</span>
      </div>

      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <span style={labelStyle}>层级深度</span>
        <span style={valueStyle}>{data.depth}</span>
      </div>
    </div>
  );
};
