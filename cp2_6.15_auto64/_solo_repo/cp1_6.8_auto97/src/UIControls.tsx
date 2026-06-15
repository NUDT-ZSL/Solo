import React, { useState } from 'react';
import { useStarStore } from './store';

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  right: '20px',
  transform: 'translateY(-50%)',
  width: '260px',
  padding: '24px 20px',
  background: 'rgba(10, 10, 46, 0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '16px',
  border: '1px solid rgba(100, 120, 255, 0.2)',
  boxShadow: '0 0 30px rgba(80, 80, 255, 0.1), inset 0 0 30px rgba(80, 80, 255, 0.05)',
  fontFamily: "'Rajdhani', sans-serif",
  color: '#c8c8ff',
  zIndex: 100,
  pointerEvents: 'auto',
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: '16px',
  fontWeight: 700,
  letterSpacing: '3px',
  color: '#a0a0ff',
  textAlign: 'center' as const,
  marginBottom: '24px',
  textTransform: 'uppercase' as const,
  textShadow: '0 0 10px rgba(160, 160, 255, 0.5)',
};

const sliderGroupStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
  fontSize: '13px',
  fontWeight: 500,
  letterSpacing: '1px',
};

const valueStyle: React.CSSProperties = {
  color: '#8080ff',
  fontFamily: "'Orbitron', monospace",
  fontSize: '12px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  appearance: 'none' as any,
  WebkitAppearance: 'none' as any,
  background: 'linear-gradient(90deg, rgba(80,80,255,0.3), rgba(160,100,255,0.5))',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  marginBottom: '10px',
  fontFamily: "'Orbitron', monospace",
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '2px',
  color: '#a0a0ff',
  background: 'rgba(80, 80, 255, 0.15)',
  border: '1px solid rgba(100, 120, 255, 0.3)',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  textTransform: 'uppercase' as const,
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}

const SliderControl: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}) => {
  const [hover, setHover] = useState(false);
  return (
    <div style={sliderGroupStyle}>
      <div style={labelRowStyle}>
        <span>{label}</span>
        <span style={valueStyle}>{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          ...sliderStyle,
          boxShadow: hover ? '0 0 12px rgba(100, 100, 255, 0.4)' : 'none',
        }}
      />
    </div>
  );
};

interface UIControlsProps {
  onResetView: () => void;
  onRandomize: () => void;
}

const UIControls: React.FC<UIControlsProps> = ({ onResetView, onRandomize }) => {
  const { particleDensity, flowSpeed, spectralShift, setParticleDensity, setFlowSpeed, setSpectralShift, resetAll } =
    useStarStore();

  const [btnHoverReset, setBtnHoverReset] = useState(false);
  const [btnHoverRandom, setBtnHoverRandom] = useState(false);

  const handleReset = () => {
    resetAll();
    onResetView();
  };

  const handleRandomize = () => {
    onRandomize();
  };

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>星尘回廊</div>

      <SliderControl
        label="粒子密度"
        value={particleDensity}
        min={500}
        max={5000}
        step={100}
        displayValue={String(particleDensity)}
        onChange={setParticleDensity}
      />

      <SliderControl
        label="流动速度"
        value={flowSpeed}
        min={0.1}
        max={2.0}
        step={0.05}
        displayValue={flowSpeed.toFixed(2)}
        onChange={setFlowSpeed}
      />

      <SliderControl
        label="光谱偏移"
        value={spectralShift}
        min={0}
        max={1}
        step={0.01}
        displayValue={spectralShift.toFixed(2)}
        onChange={setSpectralShift}
      />

      <button
        onClick={handleReset}
        onMouseEnter={() => setBtnHoverReset(true)}
        onMouseLeave={() => setBtnHoverReset(false)}
        style={{
          ...btnStyle,
          background: btnHoverReset ? 'rgba(80, 80, 255, 0.3)' : btnStyle.background,
          boxShadow: btnHoverReset ? '0 0 20px rgba(80, 80, 255, 0.3)' : 'none',
        }}
      >
        重置视角
      </button>

      <button
        onClick={handleRandomize}
        onMouseEnter={() => setBtnHoverRandom(true)}
        onMouseLeave={() => setBtnHoverRandom(false)}
        style={{
          ...btnStyle,
          marginBottom: 0,
          background: btnHoverRandom ? 'rgba(160, 80, 255, 0.3)' : btnStyle.background,
          boxShadow: btnHoverRandom ? '0 0 20px rgba(160, 80, 255, 0.3)' : 'none',
          borderColor: 'rgba(160, 100, 255, 0.3)',
        }}
      >
        随机生成
      </button>
    </div>
  );
};

export default UIControls;
