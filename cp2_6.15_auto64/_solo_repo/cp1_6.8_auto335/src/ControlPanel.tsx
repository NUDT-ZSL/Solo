import React from 'react';
import { ThemeKey } from './utils/particleSystem';

interface ControlPanelProps {
  micOn: boolean;
  onMicToggle: () => void;
  theme: ThemeKey;
  onThemeChange: (theme: ThemeKey) => void;
  density: number;
  onDensityChange: (density: number) => void;
}

const themes: { key: ThemeKey; label: string; colors: string }[] = [
  { key: 'aurora', label: '极光', colors: '#00ff88' },
  { key: 'flame', label: '火焰', colors: '#ff4400' },
  { key: 'ocean', label: '海洋', colors: '#0066ff' },
];

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  left: 24,
  background: 'rgba(10, 15, 30, 0.55)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 16,
  padding: '20px 24px',
  color: '#e0e8f0',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  fontSize: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  zIndex: 100,
  minWidth: 220,
  transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s',
  userSelect: 'none',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
  letterSpacing: '0.5px',
};

const micBtnStyle = (on: boolean): React.CSSProperties => ({
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: `2px solid ${on ? '#00ff88' : 'rgba(255,255,255,0.2)'}`,
  background: on ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
  color: on ? '#00ff88' : '#8899aa',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  transition: 'all 0.3s ease',
  outline: 'none',
});

const themeBtnStyle = (active: boolean, color: string): React.CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  border: `2px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
  background: active ? `${color}33` : 'rgba(255,255,255,0.05)',
  color: active ? color : '#8899aa',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 600,
  transition: 'all 0.3s ease',
  outline: 'none',
});

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(255,255,255,0.1)',
  borderRadius: 2,
  outline: 'none',
  cursor: 'pointer',
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  micOn,
  onMicToggle,
  theme,
  onThemeChange,
  density,
  onDensityChange,
}) => {
  return (
    <div style={panelStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>麦克风</span>
        <button
          style={micBtnStyle(micOn)}
          onClick={onMicToggle}
          aria-label={micOn ? '关闭麦克风' : '开启麦克风'}
        >
          {micOn ? '🎤' : '🔇'}
        </button>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>主题</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {themes.map((t) => (
            <button
              key={t.key}
              style={themeBtnStyle(theme === t.key, t.colors)}
              onClick={() => onThemeChange(t.key)}
              aria-label={`切换${t.label}主题`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 0 }}>
        <div style={{ ...rowStyle, marginBottom: 8 }}>
          <span style={labelStyle}>粒子密度</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>{density}</span>
        </div>
        <input
          type="range"
          min={200}
          max={3000}
          step={100}
          value={density}
          onChange={(e) => onDensityChange(Number(e.target.value))}
          style={sliderStyle}
          aria-label="粒子密度"
        />
      </div>
    </div>
  );
};

export default ControlPanel;
