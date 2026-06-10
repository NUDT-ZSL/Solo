import React from 'react';
import { PenTool, Droplets, Grid3x3, Layers, Palette } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { StyleType } from '@/types';

const STYLES: { value: StyleType; label: string; icon: React.ReactNode }[] = [
  { value: 'sketch', label: '手绘线稿', icon: <PenTool size={16} /> },
  { value: 'watercolor', label: '水彩晕染', icon: <Droplets size={16} /> },
  { value: 'pixel', label: '像素风', icon: <Grid3x3 size={16} /> },
  { value: 'collage', label: '拼贴感', icon: <Layers size={16} /> },
  { value: 'oil', label: '复古油画', icon: <Palette size={16} /> },
];

export const StylePanel: React.FC = () => {
  const { currentStyle, setCurrentStyle, setStyleTransitioning, setRenderProgress, fragments } =
    useStore();

  const handleStyleChange = (style: StyleType) => {
    if (style === currentStyle || fragments.length === 0) return;
    setStyleTransitioning(true);
    setRenderProgress(20);
    setTimeout(() => setRenderProgress(50), 150);
    setTimeout(() => {
      setCurrentStyle(style);
      setRenderProgress(80);
    }, 300);
    setTimeout(() => {
      setRenderProgress(100);
      setStyleTransitioning(false);
      setTimeout(() => setRenderProgress(0), 300);
    }, 600);
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
      {STYLES.map((s) => (
        <button
          key={s.value}
          onClick={() => handleStyleChange(s.value)}
          className={`style-btn ${currentStyle === s.value ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          disabled={fragments.length === 0}
        >
          {s.icon}
          {s.label}
        </button>
      ))}
    </div>
  );
};
