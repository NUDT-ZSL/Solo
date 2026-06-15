import React, { useEffect, useState } from 'react';
import type { SilkInfo } from './SilkEngine';

interface InfoCardProps {
  info: SilkInfo | null;
  onClose: () => void;
}

const cardStyle: React.CSSProperties = {
  position: 'absolute',
  background: 'rgba(15, 10, 40, 0.6)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 14,
  border: '1px solid rgba(255, 200, 100, 0.2)',
  padding: '18px 22px',
  color: '#e8dcc8',
  fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
  minWidth: 180,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 200, 100, 0.12)',
  transition: 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  transformOrigin: 'top left',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 0',
  fontSize: 13,
  borderBottom: '1px solid rgba(255, 200, 100, 0.06)',
};

const colorDotStyle = (color: string): React.CSSProperties => ({
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: color,
  boxShadow: `0 0 8px ${color}`,
  display: 'inline-block',
});

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 12,
  background: 'none',
  border: 'none',
  color: 'rgba(232, 200, 140, 0.5)',
  fontSize: 16,
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
  transition: 'color 0.2s',
};

export const InfoCard: React.FC<InfoCardProps> = ({ info, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (info) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [info]);

  if (!info) return null;

  const left = Math.min(info.screenPos.x + 20, window.innerWidth - 220);
  const top = Math.min(info.screenPos.y - 20, window.innerHeight - 160);

  return (
    <div
      style={{
        ...cardStyle,
        left,
        top,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(8px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <button
        style={closeBtnStyle}
        onClick={onClose}
        onMouseOver={(e) => {
          (e.target as HTMLButtonElement).style.color = 'rgba(232, 200, 140, 0.9)';
        }}
        onMouseOut={(e) => {
          (e.target as HTMLButtonElement).style.color = 'rgba(232, 200, 140, 0.5)';
        }}
      >
        ✕
      </button>

      <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 10, letterSpacing: 2 }}>
        丝线信息
      </div>

      <div style={rowStyle}>
        <span style={{ opacity: 0.7 }}>编号</span>
        <span style={{ fontWeight: 600 }}>#{String(info.id).padStart(3, '0')}</span>
      </div>

      <div style={rowStyle}>
        <span style={{ opacity: 0.7 }}>颜色</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={colorDotStyle(info.color)} />
          <span style={{ fontSize: 12, opacity: 0.8 }}>{info.color}</span>
        </span>
      </div>

      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <span style={{ opacity: 0.7 }}>张力</span>
        <span style={{ fontWeight: 600, color: info.tension > 5 ? '#e8a832' : '#a8d8a0' }}>
          {info.tension.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
