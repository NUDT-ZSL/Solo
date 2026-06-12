import React, { useState, useRef, useEffect } from 'react';

export type ColorTheme = 'aurora' | 'lava' | 'galaxy' | 'neon' | 'classic';
export type ViewMode = 'front' | 'top' | 'side' | 'free';

export interface VisualizerParams {
  particleDensity: number;
  colorTheme: ColorTheme;
  sizeMultiplier: number;
  rotationSpeed: number;
  viewMode: ViewMode;
}

interface ControlPanelProps {
  params: VisualizerParams;
  onChange: (key: keyof VisualizerParams, value: number | string) => void;
  fps?: number;
}

const colorThemes: { value: ColorTheme; label: string }[] = [
  { value: 'aurora', label: '极光蓝绿' },
  { value: 'lava', label: '熔岩红橙' },
  { value: 'galaxy', label: '星际紫' },
  { value: 'neon', label: '霓虹粉' },
  { value: 'classic', label: '经典白' },
];

const viewModes: { value: ViewMode; label: string; icon: string }[] = [
  { value: 'front', label: '正面', icon: '⊙' },
  { value: 'top', label: '俯视45°', icon: '⊘' },
  { value: 'side', label: '侧面', icon: '◎' },
  { value: 'free', label: '自由', icon: '◌' },
];

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  appearance: 'none' as any,
  WebkitAppearance: 'none',
  background: 'rgba(255,255,255,0.3)',
  borderRadius: 8,
  outline: 'none',
  cursor: 'pointer',
};

const ControlPanel: React.FC<ControlPanelProps> = ({ params, onChange, fps = 60 }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [autoDowngraded, setAutoDowngraded] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const lowFPSFrames = useRef(0);
  const highFPSFrames = useRef(0);
  const originalDensityRef = useRef<number | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      setPos({
        x: dragStart.current.px + (e.clientX - dragStart.current.x),
        y: dragStart.current.py + (e.clientY - dragStart.current.y),
      });
    };
    const onMouseUp = () => setDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (fps < 30) {
      lowFPSFrames.current++;
      highFPSFrames.current = 0;
      if (lowFPSFrames.current > 3) {
        setWarningVisible(true);
      }
      if (fps < 25 && lowFPSFrames.current > 6 && !autoDowngraded && params.particleDensity > 1000) {
        if (originalDensityRef.current === null) {
          originalDensityRef.current = params.particleDensity;
        }
        const newDensity = Math.max(1000, params.particleDensity - 3000);
        const snapped = Math.round(newDensity / 500) * 500;
        onChange('particleDensity', snapped);
        setAutoDowngraded(true);
        lowFPSFrames.current = 0;
      }
    } else if (fps >= 50) {
      highFPSFrames.current++;
      lowFPSFrames.current = 0;
      if (autoDowngraded && originalDensityRef.current !== null && highFPSFrames.current > 8) {
        const step = Math.min(2000, originalDensityRef.current - params.particleDensity);
        if (step > 0) {
          const newDensity = Math.min(originalDensityRef.current, params.particleDensity + step);
          const snapped = Math.round(newDensity / 500) * 500;
          onChange('particleDensity', snapped);
          highFPSFrames.current = 0;
          if (snapped >= originalDensityRef.current) {
            setAutoDowngraded(false);
            originalDensityRef.current = null;
            setWarningVisible(false);
          }
        }
      }
    } else {
      lowFPSFrames.current = 0;
      highFPSFrames.current = 0;
      if (fps >= 45) {
        setWarningVisible(false);
      }
    }
  }, [fps, params.particleDensity, onChange, autoDowngraded]);

  return (
    <div
      ref={panelRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width: 240,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 12,
        padding: '16px',
        color: '#fff',
        fontSize: 12,
        zIndex: 100,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, opacity: 0.8 }}>
        ⚙ 控制面板
      </div>

      {warningVisible && (
        <div
          style={{
            background: 'rgba(255, 68, 68, 0.2)',
            border: '1px solid rgba(255, 68, 68, 0.5)',
            borderRadius: 6,
            padding: '6px 8px',
            marginBottom: 10,
            fontSize: 11,
            color: '#ff8888',
          }}
        >
          ⚠ 性能警告：当前帧率 {fps} FPS
          {autoDowngraded && '（已自动降低粒子密度）'}
        </div>
      )}

      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
        <span>当前帧率</span>
        <span style={{ color: fps < 30 ? '#ff4444' : fps < 45 ? '#ffaa00' : '#44ff88', fontFamily: 'monospace' }}>
          {fps} FPS
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, opacity: 0.7 }}>粒子密度</label>
        <input
          type="range"
          min={1000}
          max={15000}
          step={500}
          value={params.particleDensity}
          onChange={(e) => onChange('particleDensity', Number(e.target.value))}
          style={sliderStyle}
        />
        <div style={{ textAlign: 'right', opacity: 0.5, marginTop: 2 }}>{params.particleDensity}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, opacity: 0.7 }}>颜色主题</label>
        <select
          value={params.colorTheme}
          onChange={(e) => onChange('colorTheme', e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            color: '#fff',
            padding: '4px 8px',
            fontSize: 12,
            outline: 'none',
          }}
        >
          {colorThemes.map((t) => (
            <option key={t.value} value={t.value} style={{ background: '#1a1a2e' }}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, opacity: 0.7 }}>粒子大小倍率</label>
        <input
          type="range"
          min={0.5}
          max={3.0}
          step={0.1}
          value={params.sizeMultiplier}
          onChange={(e) => onChange('sizeMultiplier', Number(e.target.value))}
          style={sliderStyle}
        />
        <div style={{ textAlign: 'right', opacity: 0.5, marginTop: 2 }}>{params.sizeMultiplier.toFixed(1)}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, opacity: 0.7 }}>旋转速度</label>
        <input
          type="range"
          min={0}
          max={2.0}
          step={0.1}
          value={params.rotationSpeed}
          onChange={(e) => onChange('rotationSpeed', Number(e.target.value))}
          style={sliderStyle}
        />
        <div style={{ textAlign: 'right', opacity: 0.5, marginTop: 2 }}>{params.rotationSpeed.toFixed(1)}</div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, opacity: 0.7 }}>视角切换</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {viewModes.map((v) => (
            <button
              key={v.value}
              onClick={() => onChange('viewMode', v.value)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: params.viewMode === v.value
                  ? 'rgba(255,215,0,0.3)'
                  : 'rgba(255,255,255,0.15)',
                color: params.viewMode === v.value ? '#ffd700' : '#fff',
                fontSize: 16,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: params.viewMode === v.value ? 'scale(1.15)' : 'scale(1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={v.label}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }
        input[type="range"]::-webkit-slider-thumb:active {
          background: #ffd700;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }
        input[type="range"]::-moz-range-thumb:active {
          background: #ffd700;
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
