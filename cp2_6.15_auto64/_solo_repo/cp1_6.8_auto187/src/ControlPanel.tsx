import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface ControlPanelProps {
  onRotationSpeedChange: (value: number) => void;
  onParticleSpeedChange: (value: number) => void;
  onResetView: () => void;
}

const SLIDER_STYLES: React.CSSProperties = {
  WebkitAppearance: 'none',
  appearance: 'none',
  width: '100%',
  height: '4px',
  borderRadius: '2px',
  background: 'rgba(255, 255, 255, 0.1)',
  outline: 'none',
  transition: 'background 0.3s ease',
};

const GLASS_PANEL: React.CSSProperties = {
  background: 'rgba(20, 20, 40, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '20px 24px',
  minWidth: '240px',
  color: 'rgba(255, 255, 255, 0.85)',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
};

function AnimatedSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  displayMultiplier,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  displayMultiplier: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [springOffset, setSpringOffset] = useState(0);

  useEffect(() => {
    if (isDragging) {
      setSpringOffset(2);
      const timer = setTimeout(() => setSpringOffset(0), 150);
      return () => clearTimeout(timer);
    }
  }, [isDragging, value]);

  const ratio = (value - min) / (max - min);
  const displayValue = (value * displayMultiplier).toFixed(1);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '12px',
        }}
      >
        <span style={{ opacity: 0.7, letterSpacing: '0.5px' }}>{label}</span>
        <span
          style={{
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
            color: 'rgba(199, 210, 254, 0.9)',
            transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: `scale(${1 + springOffset * 0.05})`,
          }}
        >
          {displayValue}x
        </span>
      </div>
      <div ref={trackRef} style={{ position: 'relative', height: '20px', cursor: 'pointer' }}>
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: 0,
            right: 0,
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: 0,
            width: `${ratio * 100}%`,
            height: '4px',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.6), rgba(192, 132, 252, 0.6))',
            transition: 'width 0.1s ease-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: `${4 - springOffset}px`,
            left: `${ratio * 100}%`,
            transform: 'translateX(-50%)',
            width: `${12 + springOffset * 2}px`,
            height: `${12 + springOffset * 2}px`,
            borderRadius: '50%',
            background: isDragging
              ? 'rgba(199, 210, 254, 0.95)'
              : 'rgba(165, 180, 252, 0.8)',
            boxShadow: isDragging
              ? '0 0 12px rgba(99, 102, 241, 0.5)'
              : '0 0 8px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: 'grab',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          style={{
            ...SLIDER_STYLES,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '20px',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
      </div>
    </div>
  );
}

function ControlPanel({ onRotationSpeedChange, onParticleSpeedChange, onResetView }: ControlPanelProps) {
  const [rotationSpeed, setRotationSpeed] = useState(1.0);
  const [particleSpeed, setParticleSpeed] = useState(1.0);
  const [resetHover, setResetHover] = useState(false);

  const handleRotationChange = useCallback(
    (v: number) => {
      setRotationSpeed(v);
      onRotationSpeedChange(v);
    },
    [onRotationSpeedChange]
  );

  const handleParticleChange = useCallback(
    (v: number) => {
      setParticleSpeed(v);
      onParticleSpeedChange(v);
    },
    [onParticleSpeedChange]
  );

  return (
    <div style={GLASS_PANEL}>
      <div
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          opacity: 0.4,
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        流光剪影
      </div>

      <AnimatedSlider
        label="旋转速度"
        min={0}
        max={2}
        step={0.01}
        value={rotationSpeed}
        onChange={handleRotationChange}
        displayMultiplier={1}
      />

      <AnimatedSlider
        label="粒子扩散"
        min={0.5}
        max={2}
        step={0.01}
        value={particleSpeed}
        onChange={handleParticleChange}
        displayMultiplier={1}
      />

      <button
        onClick={onResetView}
        onMouseEnter={() => setResetHover(true)}
        onMouseLeave={() => setResetHover(false)}
        style={{
          width: '100%',
          padding: '8px 0',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          background: resetHover
            ? 'rgba(99, 102, 241, 0.2)'
            : 'rgba(255, 255, 255, 0.04)',
          color: 'rgba(255, 255, 255, 0.75)',
          fontSize: '12px',
          letterSpacing: '1px',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      >
        重置视角
      </button>
    </div>
  );
}

export function mountControlPanel(
  container: HTMLElement,
  callbacks: {
    onRotationSpeedChange: (value: number) => void;
    onParticleSpeedChange: (value: number) => void;
    onResetView: () => void;
  }
): void {
  const root = createRoot(container);
  root.render(
    <ControlPanel
      onRotationSpeedChange={callbacks.onRotationSpeedChange}
      onParticleSpeedChange={callbacks.onParticleSpeedChange}
      onResetView={callbacks.onResetView}
    />
  );
}
