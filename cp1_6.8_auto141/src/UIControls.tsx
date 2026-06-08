import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { ParticleClickInfo } from './InkFlowEngine';

type ControlChangeHandler = (key: string, value: number) => void;
type ResetHandler = () => void;

interface UIControlsProps {
  onControlChange?: ControlChangeHandler;
  onReset?: ResetHandler;
  clickInfo: ParticleClickInfo | null;
}

const panelStyle: React.CSSProperties = {
  position: 'relative',
  width: '260px',
  padding: '20px',
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(20px) saturate(1.5)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  color: '#3a3a3a',
  fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  transform: 'translateY(20px)',
  opacity: 0,
  animation: 'panelSlideIn 0.6s ease forwards',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 500,
  letterSpacing: '0.5px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(0, 0, 0, 0.1)',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '16px',
  padding: '10px 0',
  background: 'rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(0, 0, 0, 0.1)',
  borderRadius: '8px',
  color: '#3a3a3a',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  letterSpacing: '1px',
  fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
};

const infoCardStyle: React.CSSProperties = {
  position: 'fixed',
  padding: '16px 20px',
  background: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(24px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  color: '#2a2a2a',
  fontSize: '13px',
  fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  lineHeight: 1.8,
  pointerEvents: 'none',
  zIndex: 200,
  transform: 'scale(0.9)',
  opacity: 0,
  transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
};

const infoCardVisibleStyle: React.CSSProperties = {
  ...infoCardStyle,
  transform: 'scale(1)',
  opacity: 1,
};

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, onChange }) => (
  <div style={{ marginBottom: '14px' }}>
    <div style={labelStyle}>
      <span>{label}</span>
      <span style={{ opacity: 0.6, fontSize: '12px' }}>{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={sliderStyle}
    />
  </div>
);

const UIControls: React.FC<UIControlsProps> = ({ onControlChange, onReset, clickInfo }) => {
  const [flowSpeed, setFlowSpeed] = useState(0.3);
  const [inkAmount, setInkAmount] = useState(0.5);
  const [spreadRadius, setSpreadRadius] = useState(1.0);

  const [cardPos, setCardPos] = useState({ x: 0, y: 0 });
  const [cardVisible, setCardVisible] = useState(false);
  const [cardData, setCardData] = useState<ParticleClickInfo | null>(null);

  useEffect(() => {
    if (clickInfo) {
      setCardData(clickInfo);
      setCardPos({
        x: Math.min(clickInfo.position.x * 40 + window.innerWidth / 2, window.innerWidth - 200),
        y: Math.min(-clickInfo.position.y * 40 + window.innerHeight / 2, window.innerHeight - 150),
      });
      setCardVisible(true);
      const timer = setTimeout(() => setCardVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [clickInfo]);

  const handleFlowSpeed = useCallback((v: number) => {
    setFlowSpeed(v);
    onControlChange?.('flowSpeed', v);
  }, [onControlChange]);

  const handleInkAmount = useCallback((v: number) => {
    setInkAmount(v);
    onControlChange?.('inkAmount', v);
  }, [onControlChange]);

  const handleSpreadRadius = useCallback((v: number) => {
    setSpreadRadius(v);
    onControlChange?.('spreadRadius', v);
  }, [onControlChange]);

  return (
    <>
      <div style={panelStyle}>
        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px', letterSpacing: '2px', textAlign: 'center' }}>
          墨流幻境
        </div>

        <Slider label="水流速度" value={flowSpeed} min={0.05} max={1.0} step={0.01} onChange={handleFlowSpeed} />
        <Slider label="墨量" value={inkAmount} min={0.1} max={2.0} step={0.01} onChange={handleInkAmount} />
        <Slider label="扩散半径" value={spreadRadius} min={0.3} max={3.0} step={0.01} onChange={handleSpreadRadius} />

        <button
          style={buttonStyle}
          onClick={() => onReset?.()}
          onMouseEnter={e => {
            (e.target as HTMLElement).style.background = 'rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.background = 'rgba(0, 0, 0, 0.08)';
          }}
        >
          重置画面
        </button>
      </div>

      {cardData && (
        <div
          style={{
            ...(cardVisible ? infoCardVisibleStyle : infoCardStyle),
            left: cardPos.x,
            top: cardPos.y,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>
            墨点 · {cardData.inkName}
          </div>
          <div>浓度：{(cardData.concentration * 100).toFixed(1)}%</div>
          <div>扩散速度：{cardData.spreadSpeed.toFixed(3)}</div>
          <div>颜色深度：{(cardData.colorDepth * 100).toFixed(1)}%</div>
        </div>
      )}
    </>
  );
};

let currentClickInfo: ParticleClickInfo | null = null;
let controlChangeHandler: ControlChangeHandler | null = null;
let resetHandler: ResetHandler | null = null;

export function mountUI(container: HTMLElement): void {
  const root = createRoot(container);

  const App = () => {
    const [clickInfo, setClickInfo] = useState<ParticleClickInfo | null>(null);

    useEffect(() => {
      const interval = setInterval(() => {
        if (currentClickInfo) {
          setClickInfo({ ...currentClickInfo });
          currentClickInfo = null;
        }
      }, 100);
      return () => clearInterval(interval);
    }, []);

    return (
      <UIControls
        onControlChange={(key, value) => controlChangeHandler?.(key, value)}
        onReset={() => resetHandler?.()}
        clickInfo={clickInfo}
      />
    );
  };

  root.render(<App />);
}

export function setClickInfo(info: ParticleClickInfo): void {
  currentClickInfo = info;
}

export function setControlChangeHandler(handler: ControlChangeHandler): void {
  controlChangeHandler = handler;
}

export function setResetHandler(handler: ResetHandler): void {
  resetHandler = handler;
}
