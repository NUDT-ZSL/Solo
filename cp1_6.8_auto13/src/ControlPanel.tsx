import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  color: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'auroraSpeed', label: '极光流速', min: 0.1, max: 3.0, step: 0.05, default: 1.0, color: '#44ddaa' },
  { key: 'crystalBrightness', label: '冰晶亮度', min: 0.1, max: 2.0, step: 0.05, default: 1.0, color: '#7799ff' },
  { key: 'particleDensity', label: '粒子密度', min: 0.1, max: 2.0, step: 0.05, default: 1.0, color: '#aa77ff' },
];

export type ParamValues = Record<string, number>;

interface ControlPanelProps {
  onChange: (values: ParamValues) => void;
}

const ElasticSlider: React.FC<{
  config: SliderConfig;
  value: number;
  onChange: (key: string, val: number) => void;
}> = ({ config, value, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [visualValue, setVisualValue] = useState(value);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (isDragging) return;
    const start = visualValue;
    const end = value;
    const startTime = performance.now();
    const duration = 300;

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI) * 0.04;
      setVisualValue(start + (end - start) * ease);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [value, isDragging]);

  const percent = ((visualValue - config.min) / (config.max - config.min)) * 100;

  const handleInteraction = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newVal = config.min + ratio * (config.max - config.min);
      const snapped = Math.round(newVal / config.step) * config.step;
      onChange(config.key, snapped);
    },
    [config, onChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handleInteraction(e.clientX);
      const onMove = (ev: MouseEvent) => handleInteraction(ev.clientX);
      const onUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [handleInteraction]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      handleInteraction(e.touches[0].clientX);
      const onMove = (ev: TouchEvent) => handleInteraction(ev.touches[0].clientX);
      const onEnd = () => {
        setIsDragging(false);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
      };
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onEnd);
    },
    [handleInteraction]
  );

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
        <span style={{ color: '#8899bb' }}>{config.label}</span>
        <span style={{ color: config.color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {visualValue.toFixed(2)}
        </span>
      </div>
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          position: 'relative',
          height: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 3,
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${config.color}44, ${config.color})`,
            borderRadius: 3,
            transition: isDragging ? 'none' : 'width 0.1s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${percent}%`,
            transform: 'translate(-50%, -50%)',
            width: isDragging ? 18 : 14,
            height: isDragging ? 18 : 14,
            borderRadius: '50%',
            background: config.color,
            boxShadow: `0 0 ${isDragging ? 16 : 10}px ${config.color}88`,
            transition: isDragging ? 'none' : 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({ onChange }) => {
  const [values, setValues] = useState<ParamValues>(() => {
    const init: ParamValues = {};
    SLIDERS.forEach((s) => (init[s.key] = s.default));
    return init;
  });

  const handleChange = useCallback(
    (key: string, val: number) => {
      setValues((prev) => {
        const next = { ...prev, [key]: val };
        onChange(next);
        return next;
      });
    },
    [onChange]
  );

  return (
    <div
      style={{
        width: 260,
        padding: '20px 22px',
        background: 'rgba(8, 12, 35, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 16,
        border: '1px solid rgba(100, 140, 220, 0.2)',
        boxShadow: '0 8px 40px rgba(0, 20, 80, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        color: '#c0d0f0',
        fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 16,
          color: '#8eaadd',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>✦</span> 场景控制
      </div>
      {SLIDERS.map((s) => (
        <ElasticSlider key={s.key} config={s} value={values[s.key]} onChange={handleChange} />
      ))}
    </div>
  );
};

export function mountControlPanel(container: HTMLElement, onChange: (values: ParamValues) => void): void {
  const root = createRoot(container);
  root.render(<ControlPanel onChange={onChange} />);
}
