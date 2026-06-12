import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSimulationStore, Resolution } from '../app/store';

const panelStyles: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  width: 260,
  background: 'rgba(20, 30, 50, 0.85)',
  borderRadius: 16,
  border: '0.5px solid rgba(100, 160, 220, 0.5)',
  padding: 20,
  color: '#E0E0E0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 13,
  zIndex: 100,
  boxSizing: 'border-box',
  animation: 'slideIn 0.3s ease-out',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 12,
  color: '#A0B8D0',
  fontWeight: 500
};

const sliderContainerStyle: React.CSSProperties = {
  marginBottom: 16
};

function getSliderTrackStyle(value: number, min: number, max: number): React.CSSProperties {
  const percent = ((value - min) / (max - min)) * 100;
  return {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: `linear-gradient(to right, #4A90D9 0%, #4A90D9 ${percent}%, #2A3A5A ${percent}%, #2A3A5A 100%)`,
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    transition: 'filter 0.2s'
  };
}

function getFpsColor(fps: number): string {
  if (fps > 55) return '#4ADE80';
  if (fps >= 35) return '#FACC15';
  return '#F87171';
}

function getFpsLabel(fps: number): string {
  if (fps > 55) return '流畅';
  if (fps >= 35) return '一般';
  return '卡顿';
}

interface ParticleState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
}

export const ControlPanel: React.FC<{
  onAddWaveSource: (x: number, y: number) => void;
  onAddEnergyRipple: () => void;
  onReset: () => void;
}> = ({ onAddWaveSource, onAddEnergyRipple, onReset }) => {
  const {
    waveSpeed,
    damping,
    resolution,
    fps,
    sourceX,
    sourceY,
    setWaveSpeed,
    setDamping,
    setResolution,
    setSourceX,
    setSourceY
  } = useSimulationStore();

  const [btnPressed, setBtnPressed] = useState(false);
  const [particles, setParticles] = useState<ParticleState[]>([]);
  const particleIdRef = useRef(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const animFrameRef = useRef<number>(0);

  const spawnParticles = useCallback(() => {
    const newParticles: ParticleState[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 60 + Math.random() * 80;
      const size = 2 + Math.random() * 2;
      newParticles.push({
        id: particleIdRef.current++,
        x: 130,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        alpha: 1.0,
        life: 1.0
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  useEffect(() => {
    if (particles.length === 0) return;

    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setParticles(prev => {
        const next = prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            life: p.life - dt * 1.2,
            alpha: Math.max(0, p.life - dt * 1.2),
            vx: p.vx * 0.97,
            vy: p.vy * 0.97
          }))
          .filter(p => p.life > 0);
        return next;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [particles.length > 0]);

  const handleEnergyRipple = useCallback(() => {
    setBtnPressed(true);
    setTimeout(() => setBtnPressed(false), 100);
    spawnParticles();
    onAddEnergyRipple();
  }, [onAddEnergyRipple, spawnParticles]);

  const handleDropWave = useCallback(() => {
    onAddWaveSource(sourceX, sourceY);
  }, [onAddWaveSource, sourceX, sourceY]);

  const fpsColor = getFpsColor(fps);
  const fpsLabel = getFpsLabel(fps);

  const resolutionOptions: Resolution[] = [32, 64, 128];

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(280px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(74, 144, 217, 0.3); }
          50% { box-shadow: 0 0 12px rgba(74, 144, 217, 0.6); }
        }
        .dr-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4A90D9;
          border: 2px solid #6BB5FF;
          box-shadow: 0 0 8px rgba(74, 144, 217, 0.5);
          cursor: pointer;
          transition: box-shadow 0.2s;
        }
        .dr-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 14px rgba(74, 144, 217, 0.8);
        }
        .dr-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4A90D9;
          border: 2px solid #6BB5FF;
          box-shadow: 0 0 8px rgba(74, 144, 217, 0.5);
          cursor: pointer;
        }
        .dr-slider:hover {
          filter: brightness(1.15);
        }
        .dr-btn:hover {
          filter: brightness(1.1);
        }
        .dr-btn:active {
          transform: scale(0.95);
        }
        .dr-select:hover {
          filter: brightness(1.15);
        }
      `}</style>

      <div style={panelStyles}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#C8DCF0' }}>DataRipple</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: fpsColor,
              background: `${fpsColor}18`,
              padding: '2px 8px',
              borderRadius: 10,
              border: `1px solid ${fpsColor}40`
            }}
          >
            {fps} FPS · {fpsLabel}
          </span>
        </div>

        <div style={sliderContainerStyle}>
          <label style={labelStyle}>波速: {waveSpeed.toFixed(2)}</label>
          <input
            type="range"
            className="dr-slider"
            min={0.5}
            max={3.0}
            step={0.01}
            value={waveSpeed}
            onChange={(e) => setWaveSpeed(parseFloat(e.target.value))}
            style={getSliderTrackStyle(waveSpeed, 0.5, 3.0)}
          />
        </div>

        <div style={sliderContainerStyle}>
          <label style={labelStyle}>阻尼系数: {damping.toFixed(3)}</label>
          <input
            type="range"
            className="dr-slider"
            min={0.01}
            max={0.1}
            step={0.001}
            value={damping}
            onChange={(e) => setDamping(parseFloat(e.target.value))}
            style={getSliderTrackStyle(damping, 0.01, 0.1)}
          />
        </div>

        <div style={sliderContainerStyle}>
          <label style={labelStyle}>网格分辨率</label>
          <select
            className="dr-select"
            value={resolution}
            onChange={(e) => setResolution(parseInt(e.target.value) as Resolution)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid rgba(100, 160, 220, 0.3)',
              background: 'rgba(30, 45, 70, 0.8)',
              color: '#E0E0E0',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
              transition: 'filter 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
            }}
          >
            {resolutionOptions.map(r => (
              <option key={r} value={r}>{r} × {r}</option>
            ))}
          </select>
        </div>

        <div style={sliderContainerStyle}>
          <label style={labelStyle}>波源 X: {sourceX.toFixed(1)}</label>
          <input
            type="range"
            className="dr-slider"
            min={-5}
            max={5}
            step={0.1}
            value={sourceX}
            onChange={(e) => setSourceX(parseFloat(e.target.value))}
            style={getSliderTrackStyle(sourceX, -5, 5)}
          />
        </div>

        <div style={sliderContainerStyle}>
          <label style={labelStyle}>波源 Y: {sourceY.toFixed(1)}</label>
          <input
            type="range"
            className="dr-slider"
            min={-5}
            max={5}
            step={0.1}
            value={sourceY}
            onChange={(e) => setSourceY(parseFloat(e.target.value))}
            style={getSliderTrackStyle(sourceY, -5, 5)}
          />
        </div>

        <button
          onClick={handleDropWave}
          className="dr-btn"
          style={{
            width: '100%',
            padding: '8px 0',
            borderRadius: 8,
            border: '1px solid rgba(74, 144, 217, 0.4)',
            background: 'rgba(74, 144, 217, 0.25)',
            color: '#B0D4F1',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 10,
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          💧 在指定位置产生波源
        </button>

        <div style={{ position: 'relative' }}>
          <button
            ref={btnRef}
            onClick={handleEnergyRipple}
            className="dr-btn"
            style={{
              width: '100%',
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              background: '#FF6B35',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transform: btnPressed ? 'scale(0.95)' : 'scale(1)',
              transition: 'transform 0.1s ease, filter 0.2s',
              boxShadow: '0 2px 12px rgba(255, 107, 53, 0.4)'
            }}
          >
            ⚡ 添加能量波纹
          </button>

          {particles.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: `rgba(255, 215, 0, ${p.alpha})`,
                boxShadow: `0 0 ${p.size}px rgba(255, 215, 0, ${p.alpha * 0.6})`,
                pointerEvents: 'none',
                transform: `translate(-50%, -50%)`
              }}
            />
          ))}
        </div>

        <button
          onClick={onReset}
          className="dr-btn"
          style={{
            width: '100%',
            padding: '6px 0',
            marginTop: 12,
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#A0B8D0',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
          }}
        >
          ↺ 重置场景
        </button>
      </div>
    </>
  );
};
