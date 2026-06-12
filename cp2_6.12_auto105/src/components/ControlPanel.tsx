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

const ControlPanel: React.FC<ControlPanelProps> = ({ params, onChange }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

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
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, opacity: 0.8 }}>
        ⚙ 控制面板
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

import React, { useState, useRef } from 'react';

export default ControlPanel;
