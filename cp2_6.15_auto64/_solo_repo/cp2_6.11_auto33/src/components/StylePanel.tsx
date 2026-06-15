import React from 'react';
import { PenTool, Droplets, Grid3x3, Layers, Palette } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { StyleType } from '@/types';
import { applyStyle } from '@/utils/collageEngine';

const STYLES: { value: StyleType; label: string; icon: React.ReactNode }[] = [
  { value: 'sketch', label: '手绘线稿', icon: <PenTool size={16} /> },
  { value: 'watercolor', label: '水彩晕染', icon: <Droplets size={16} /> },
  { value: 'pixel', label: '像素风', icon: <Grid3x3 size={16} /> },
  { value: 'collage', label: '拼贴感', icon: <Layers size={16} /> },
  { value: 'oil', label: '复古油画', icon: <Palette size={16} /> },
];

const FADE_DURATION = 300;
const TOTAL_TRANSITION_DURATION = 600;

export const StylePanel: React.FC = () => {
  const {
    currentStyle,
    setCurrentStyle,
    setStyleTransitioning,
    setRenderProgress,
    fragments,
    sourceImage,
  } = useStore();

  const handleStyleChange = async (newStyle: StyleType) => {
    if (newStyle === currentStyle || fragments.length === 0 || !sourceImage) return;

    setStyleTransitioning(true);
    setRenderProgress(15);

    await new Promise((resolve) => setTimeout(resolve, FADE_DURATION));
    setRenderProgress(50);

    setCurrentStyle(newStyle);

    await new Promise((resolve) => setTimeout(resolve, 100));
    setRenderProgress(80);

    await new Promise((resolve) => setTimeout(resolve, FADE_DURATION - 100));
    setRenderProgress(100);
    setStyleTransitioning(false);

    setTimeout(() => {
      setRenderProgress(0);
    }, 300);
  };

  return (
    <div
      className="glass-dark"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 40px',
        zIndex: 50,
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Palette size={18} color="#C5A55A" />
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: 0.5,
          }}
        >
          风格模板
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {STYLES.map((s) => (
          <button
            key={s.value}
            onClick={() => handleStyleChange(s.value)}
            className={`style-btn ${currentStyle === s.value ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: fragments.length === 0 ? 0.5 : 1,
              cursor: fragments.length === 0 ? 'not-allowed' : 'pointer',
            }}
            disabled={fragments.length === 0}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <span>当前风格</span>
        <span
          style={{
            color: '#C5A55A',
            fontWeight: 600,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {STYLES.find((s) => s.value === currentStyle)?.label}
        </span>
      </div>
    </div>
  );
};

export { applyStyle };
