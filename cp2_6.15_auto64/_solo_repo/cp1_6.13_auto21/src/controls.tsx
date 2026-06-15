import React from 'react';
import { ColorTheme } from './particles';

interface ControlsProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
  theme: ColorTheme;
  onThemeChange: (theme: ColorTheme) => void;
  onResetCamera: () => void;
}

const themeNames: Record<ColorTheme, string> = {
  aurora: '极光蓝白',
  fire: '火焰红橙',
  neon: '霓虹紫绿',
};

const themeColors: Record<ColorTheme, { start: string; end: string }> = {
  aurora: { start: '#87ceeb', end: '#ffffff' },
  fire: { start: '#ff4500', end: '#ffd700' },
  neon: { start: '#a855f7', end: '#22c55e' },
};

const themeOrder: ColorTheme[] = ['aurora', 'fire', 'neon'];

export const Controls: React.FC<ControlsProps> = ({
  speed,
  onSpeedChange,
  theme,
  onThemeChange,
  onResetCamera,
}) => {
  const handleThemeClick = () => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    onThemeChange(themeOrder[nextIndex]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: '24px',
        bottom: '24px',
        width: '240px',
        padding: '20px',
        backgroundColor: '#00000080',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 100,
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '12px',
            color: '#ffffff',
            opacity: 0.9,
          }}
        >
          风速强度
        </div>
        <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            style={{
              width: '180px',
              height: '4px',
              WebkitAppearance: 'none',
              appearance: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
            className="speed-slider"
          />
          <span
            style={{
              marginLeft: '12px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#60a5fa',
              minWidth: '36px',
              textAlign: 'right',
            }}
          >
            {speed.toFixed(1)}x
          </span>
        </div>
        <style>{`
          .speed-slider::-webkit-slider-runnable-track {
            height: 4px;
            background: #ffffff33;
            border-radius: 2px;
          }
          .speed-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            background: #60a5fa;
            border-radius: 50%;
            cursor: pointer;
            margin-top: -8px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .speed-slider::-webkit-slider-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 0 12px rgba(96, 165, 250, 0.6);
          }
          .speed-slider::-moz-range-track {
            height: 4px;
            background: #ffffff33;
            border-radius: 2px;
          }
          .speed-slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: #60a5fa;
            border-radius: 50%;
            cursor: pointer;
            border: none;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .speed-slider::-moz-range-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 0 12px rgba(96, 165, 250, 0.6);
          }
        `}</style>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '12px',
            color: '#ffffff',
            opacity: 0.9,
          }}
        >
          粒子颜色
        </div>
        <button
          onClick={handleThemeClick}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
          className="theme-btn"
        >
          <span>{themeNames[theme]}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${themeColors[theme].start}, ${themeColors[theme].end})`,
              }}
            />
          </div>
        </button>
        <style>{`
          .theme-btn:hover {
            background-color: rgba(255, 255, 255, 0.18) !important;
            transform: scale(1.02);
          }
          .theme-btn:active {
            transform: scale(0.98);
          }
        `}</style>
      </div>

      <div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '12px',
            color: '#ffffff',
            opacity: 0.9,
          }}
        >
          视角控制
        </div>
        <button
          onClick={onResetCamera}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#60a5fa',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          className="reset-btn"
        >
          重置视角
        </button>
        <style>{`
          .reset-btn:hover {
            background-color: #3b82f6 !important;
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(96, 165, 250, 0.4);
          }
          .reset-btn:active {
            transform: scale(0.98);
          }
        `}</style>
      </div>

      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.5)',
          lineHeight: '1.6',
        }}
      >
        <div>拖拽旋转 · 滚轮缩放</div>
        <div>空格键 暂停/继续</div>
      </div>
    </div>
  );
};
