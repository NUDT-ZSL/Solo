import React, { useCallback, useRef, useState } from 'react';
import type { SceneParams } from './SceneManager';

interface ControlPanelProps {
  params: SceneParams;
  onParamsChange: (params: SceneParams) => void;
}

interface BurstInfo {
  phase: number;
  density: number;
  intensity: number;
}

interface SliderConfig {
  key: keyof SceneParams;
  label: string;
  min: number;
  max: number;
  step: number;
  color: string;
  glowColor: string;
}

const sliderConfigs: SliderConfig[] = [
  { key: 'tideSpeed', label: '潮汐流速', min: 0.1, max: 3.0, step: 0.05, color: '#00bcd4', glowColor: 'rgba(0, 188, 212, 0.6)' },
  { key: 'glowIntensity', label: '生物荧光强度', min: 0.2, max: 2.5, step: 0.05, color: '#7c4dff', glowColor: 'rgba(124, 77, 255, 0.6)' },
  { key: 'particleDensity', label: '粒子密度', min: 500, max: 5000, step: 100, color: '#00e676', glowColor: 'rgba(0, 230, 118, 0.6)' },
];

export const BurstInfoCard: React.FC<{ info: BurstInfo | null; onClose: () => void }> = ({ info, onClose }) => {
  if (!info) return null;

  const phaseLabel = info.phase < 0.33 ? '退潮' : info.phase < 0.66 ? '平潮' : '涨潮';

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(5, 20, 40, 0.65)',
      backdropFilter: 'blur(20px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
      border: '1px solid rgba(0, 200, 255, 0.2)',
      borderRadius: '16px',
      padding: '28px 36px',
      color: '#e0f7fa',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      zIndex: 100,
      animation: 'fadeSlideIn 0.4s ease-out',
      boxShadow: '0 0 40px rgba(0, 150, 255, 0.15), inset 0 0 30px rgba(0, 100, 200, 0.05)',
      minWidth: '260px',
    }}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translate(-50%, -40%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <span style={{ fontSize: '18px', fontWeight: 600, color: '#80deea' }}>🌊 潮涌回响</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0 4px',
            transition: 'color 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = '#fff')}
          onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          ✕
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>潮汐相位</span>
          <span style={{ color: '#4dd0e1', fontSize: '15px', fontWeight: 500 }}>{phaseLabel} ({(info.phase * 100).toFixed(0)}%)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>生物密度</span>
          <span style={{ color: '#b388ff', fontSize: '15px', fontWeight: 500 }}>{(info.density * 100).toFixed(1)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>荧光强度指数</span>
          <span style={{ color: '#69f0ae', fontSize: '15px', fontWeight: 500 }}>{info.intensity.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

const GlowSlider: React.FC<{
  config: SliderConfig;
  value: number;
  onChange: (val: number) => void;
}> = ({ config, value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [animValue, setAnimValue] = useState(value);
  const rafRef = useRef<number>(0);
  const prevValue = useRef(value);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    onChange(v);
  }, [onChange]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const startVal = animValue;
    const targetVal = value;
    const startTime = performance.now();
    const duration = 200;

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimValue(startVal + (targetVal - startVal) * ease);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    prevValue.current = value;
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  const pct = ((animValue - config.min) / (config.max - config.min)) * 100;

  return (
    <div style={{
      marginBottom: '20px',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500 }}>
          {config.label}
        </span>
        <span style={{ color: config.color, fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>
          {animValue.toFixed(config.step < 1 ? 2 : 0)}
        </span>
      </div>
      <div style={{ position: 'relative', height: '28px' }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '0',
          right: '0',
          height: '4px',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${config.color}88, ${config.color})`,
            borderRadius: '2px',
            transition: 'width 0.15s ease-out',
            boxShadow: isDragging ? `0 0 12px ${config.glowColor}` : 'none',
          }} />
        </div>
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={handleInput}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: isDragging ? '18px' : '14px',
          height: isDragging ? '18px' : '14px',
          borderRadius: '50%',
          background: config.color,
          boxShadow: isDragging
            ? `0 0 16px ${config.glowColor}, 0 0 32px ${config.glowColor}`
            : `0 0 8px ${config.glowColor}`,
          transition: 'width 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ params, onParamsChange }) => {
  const handleChange = useCallback((key: keyof SceneParams, value: number) => {
    onParamsChange({ ...params, [key]: value });
  }, [params, onParamsChange]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '280px',
      background: 'rgba(5, 20, 40, 0.55)',
      backdropFilter: 'blur(24px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
      border: '1px solid rgba(0, 200, 255, 0.15)',
      borderRadius: '16px',
      padding: '24px',
      color: '#fff',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      zIndex: 50,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 60px rgba(0, 100, 200, 0.08)',
    }}>
      <div style={{
        fontSize: '15px',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        letterSpacing: '0.5px',
      }}>
        🌊 控制面板
      </div>
      {sliderConfigs.map(cfg => (
        <GlowSlider
          key={cfg.key}
          config={cfg}
          value={params[cfg.key]}
          onChange={(v) => handleChange(cfg.key, v)}
        />
      ))}
    </div>
  );
};

export default ControlPanel;
