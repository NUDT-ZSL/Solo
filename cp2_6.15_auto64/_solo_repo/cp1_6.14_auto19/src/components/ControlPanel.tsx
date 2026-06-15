import React, { useCallback, useRef, useEffect, useState } from 'react';
import { ParticleConfig } from '../utils/particleEngine';

interface SliderConfig {
  key: keyof ParticleConfig;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderConfig[] = [
  { key: 'count', label: '粒子数量', min: 100, max: 10000, step: 100 },
  { key: 'speed', label: '扩散速度', min: 0, max: 5, step: 0.1 },
  { key: 'rotation', label: '旋转角度', min: 0, max: 2, step: 0.01 },
  { key: 'colorMix', label: '颜色混合', min: 0, max: 1, step: 0.01 },
  { key: 'size', label: '粒子尺寸', min: 0.5, max: 10, step: 0.5 },
  { key: 'trail', label: '尾迹长度', min: 0, max: 1, step: 0.05 },
  { key: 'noise', label: '噪波强度', min: 0, max: 3, step: 0.1 },
];

interface ControlPanelProps {
  config: ParticleConfig;
  onChange: (key: keyof ParticleConfig, value: number) => void;
  compact?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, onChange, compact }) => {
  const pendingRef = useRef<Partial<Record<keyof ParticleConfig, number>>>({});
  const rafRef = useRef<number | null>(null);
  const [localValues, setLocalValues] = useState<Partial<ParticleConfig>>({});

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    const keys = Object.keys(pending) as (keyof ParticleConfig)[];
    for (const key of keys) {
      const val = pending[key];
      if (val !== undefined) {
        onChange(key, val);
      }
    }
    pendingRef.current = {};
    rafRef.current = null;
  }, [onChange]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flush);
    }
  }, [flush]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const handleChange = useCallback(
    (key: keyof ParticleConfig, value: number) => {
      pendingRef.current[key] = value;
      setLocalValues((prev) => ({ ...prev, [key]: value }));
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const getValue = (key: keyof ParticleConfig) => {
    return localValues[key] !== undefined ? (localValues[key] as number) : config[key];
  };

  const visibleSliders = compact
    ? SLIDERS.filter((s) => ['count', 'speed', 'colorMix'].includes(s.key))
    : SLIDERS;

  return (
    <div
      style={{
        width: compact ? '100%' : '280px',
        background: 'rgba(26, 26, 46, 0.85)',
        borderRadius: '16px',
        padding: compact ? '12px' : '20px',
        border: '2px solid transparent',
        backgroundImage:
          'linear-gradient(rgba(26,26,46,0.85), rgba(26,26,46,0.85)), linear-gradient(135deg, #6366f1, #ec4899)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '8px' : '12px',
        maxHeight: compact ? '200px' : 'none',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          fontSize: compact ? '13px' : '14px',
          fontWeight: 600,
          color: '#e5e7f0',
          letterSpacing: '0.5px',
          marginBottom: compact ? '0' : '4px',
        }}
      >
        控制面板
      </div>

      {visibleSliders.map((slider) => (
        <div key={slider.key} style={{ height: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
              fontSize: compact ? '12px' : '13px',
              color: '#9ca3af',
            }}
          >
            <span>{slider.label}</span>
            <span style={{ color: '#e5e7f0', fontVariantNumeric: 'tabular-nums' }}>
              {getValue(slider.key)}
            </span>
          </div>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={getValue(slider.key)}
            onChange={(e) => handleChange(slider.key, parseFloat(e.target.value))}
            style={{ width: '100%', height: '6px' }}
          />
        </div>
      ))}
    </div>
  );
};

export default ControlPanel;
