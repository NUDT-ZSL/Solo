import React from 'react';

interface ControlPanelProps {
  particleCount: number;
  setParticleCount: (v: number) => void;
  flowSpeed: number;
  setFlowSpeed: (v: number) => void;
  colorTheme: string;
  setColorTheme: (v: string) => void;
  onResetView: () => void;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  width: 260,
  padding: '20px 22px',
  background: 'rgba(20, 10, 40, 0.55)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(120, 80, 200, 0.25)',
  borderRadius: 16,
  color: '#d0c8e8',
  fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
  fontSize: 13,
  zIndex: 100,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 4,
  fontSize: 12,
  letterSpacing: '0.3px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(120, 80, 200, 0.3)',
  borderRadius: 2,
  outline: 'none',
  cursor: 'pointer',
  marginBottom: 14,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  background: 'rgba(30, 15, 60, 0.7)',
  border: '1px solid rgba(120, 80, 200, 0.3)',
  borderRadius: 8,
  color: '#d0c8e8',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
  marginBottom: 14,
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 0',
  background: 'linear-gradient(135deg, rgba(100,60,180,0.6), rgba(60,30,140,0.8))',
  border: '1px solid rgba(140, 100, 220, 0.35)',
  borderRadius: 8,
  color: '#e0d8f0',
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.2s',
  letterSpacing: '1px',
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  particleCount,
  setParticleCount,
  flowSpeed,
  setFlowSpeed,
  colorTheme,
  setColorTheme,
  onResetView,
}) => {
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, letterSpacing: '1.5px', textAlign: 'center' }}>
        ✦ 星砂回廊 ✦
      </div>

      <div style={labelStyle}>
        <span>粒子密度</span>
        <span style={{ color: '#a090c8' }}>{particleCount}</span>
      </div>
      <input
        type="range"
        min={1000}
        max={5000}
        step={100}
        value={particleCount}
        onChange={(e) => setParticleCount(Number(e.target.value))}
        style={sliderStyle}
      />

      <div style={labelStyle}>
        <span>流动速度</span>
        <span style={{ color: '#a090c8' }}>{flowSpeed.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={0.1}
        max={5.0}
        step={0.1}
        value={flowSpeed}
        onChange={(e) => setFlowSpeed(Number(e.target.value))}
        style={sliderStyle}
      />

      <div style={labelStyle}>
        <span>颜色主题</span>
      </div>
      <select
        value={colorTheme}
        onChange={(e) => setColorTheme(e.target.value)}
        style={selectStyle}
      >
        <option value="stardust">星尘</option>
        <option value="aurora">极光</option>
        <option value="lava">熔岩</option>
      </select>

      <button
        onClick={onResetView}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(130,80,220,0.8), rgba(80,40,180,0.9))';
          e.currentTarget.style.borderColor = 'rgba(180, 140, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100,60,180,0.6), rgba(60,30,140,0.8))';
          e.currentTarget.style.borderColor = 'rgba(140, 100, 220, 0.35)';
        }}
      >
        重置视角
      </button>

      <div style={{ marginTop: 12, fontSize: 10, color: 'rgba(160,144,200,0.5)', textAlign: 'center', lineHeight: 1.5 }}>
        左键点击 · 星爆 &nbsp;|&nbsp; 双击 · 冲击波<br />
        拖拽旋转 &nbsp;|&nbsp; 滚轮缩放
      </div>
    </div>
  );
};

export default ControlPanel;
