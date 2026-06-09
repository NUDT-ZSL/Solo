import React, { useState, useCallback } from 'react';
import type { StatsSnapshot } from './FireflyManager';

interface UIControllerProps {
  brightness: number;
  syncTolerance: number;
  timeSpeed: number;
  stats: StatsSnapshot;
  onBrightnessChange: (value: number) => void;
  onSyncToleranceChange: (value: number) => void;
  onTimeSpeedChange: (value: number) => void;
  onReset: () => void;
}

const BRIGHTNESS_DEFAULT = 0.8;
const SYNC_TOLERANCE_DEFAULT = 0.2;
const TIME_SPEED_DEFAULT = 1.0;

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, displayValue, onChange }) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
        }}
      >
        <span style={{ color: '#E0E0E0' }}>{label}</span>
        <span
          style={{
            color: '#00FF88',
            fontFamily: 'monospace',
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {displayValue}
        </span>
      </div>
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            background: 'linear-gradient(to right, #00FF88 0%, #00FF88 ' + percent + '%, rgba(255,255,255,0.15) ' + percent + '%, rgba(255,255,255,0.15) 100%)',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            position: 'relative',
            zIndex: 2,
            appearance: 'none',
            WebkitAppearance: 'none',
            background: 'transparent',
            cursor: 'pointer',
            outline: 'none',
          }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #00FF88;
            cursor: pointer;
            box-shadow: 0 0 8px rgba(0,255,136,0.6);
            border: 2px solid #1A1A2E;
            transition: transform 0.1s;
          }
          input[type=range]::-webkit-slider-thumb:hover {
            transform: scale(1.15);
          }
          input[type=range]::-webkit-slider-thumb:active {
            transform: scale(0.95);
          }
          input[type=range]::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #00FF88;
            cursor: pointer;
            box-shadow: 0 0 8px rgba(0,255,136,0.6);
            border: 2px solid #1A1A2E;
          }
          input[type=range]::-moz-range-track {
            background: transparent;
          }
        `}</style>
      </div>
    </div>
  );
};

const InteractiveButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ onClick, children, style }) => {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        padding: '10px 24px',
        fontSize: 13,
        fontWeight: 600,
        color: '#1A1A2E',
        background: 'linear-gradient(135deg, #00FF88, #00CC66)',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'transform 0.1s ease, box-shadow 0.2s ease',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        boxShadow: pressed
          ? '0 0 4px rgba(0,255,136,0.4)'
          : '0 2px 12px rgba(0,255,136,0.3)',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const StatsPanel: React.FC<{ stats: StatsSnapshot }> = ({ stats }) => {
  const getTimeOfDayLabel = () => {
    if (stats.currentBrightness > 0.8) return '白天';
    if (stats.currentBrightness < 0.2) return '夜晚';
    if (stats.currentBrightness > 0.5) return '黄昏';
    return '黎明';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: 20,
        background: 'rgba(26,26,46,0.85)',
        backdropFilter: 'blur(8px)',
        borderRadius: 12,
        padding: '16px 20px',
        color: '#FFFFFF',
        minWidth: 180,
        border: '1px solid rgba(0,255,136,0.2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#00FF88',
          fontWeight: 600,
          letterSpacing: 1,
          marginBottom: 12,
          textTransform: 'uppercase',
        }}
      >
        生态监测面板
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#AAAAAA', fontSize: 12 }}>活跃萤火虫</span>
          <span
            style={{
              color: '#FFD700',
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {stats.activeCount}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#AAAAAA', fontSize: 12 }}>同步率</span>
          <span
            style={{
              color: '#00FFAA',
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {stats.syncRate}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 3,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            overflow: 'hidden',
            marginTop: -4,
          }}
        >
          <div
            style={{
              width: `${stats.syncRate}%`,
              height: '100%',
              background: 'linear-gradient(to right, #00FFAA, #00FF88)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 4,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ color: '#AAAAAA', fontSize: 12 }}>模拟时间</span>
          <span
            style={{
              color: '#FFFFFF',
              fontFamily: 'monospace',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {stats.simTime}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 2,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: stats.currentBrightness < 0.2 ? '#88CCFF' : stats.currentBrightness > 0.8 ? '#FFCC66' : '#CCAAFF',
              background: 'rgba(255,255,255,0.06)',
              padding: '3px 10px',
              borderRadius: 10,
            }}
          >
            {getTimeOfDayLabel()}
          </span>
        </div>
      </div>
    </div>
  );
};

export const UIController: React.FC<UIControllerProps> = ({
  brightness,
  syncTolerance,
  timeSpeed,
  stats,
  onBrightnessChange,
  onSyncToleranceChange,
  onTimeSpeedChange,
  onReset,
}) => {
  const handleReset = useCallback(() => {
    onBrightnessChange(BRIGHTNESS_DEFAULT);
    onSyncToleranceChange(SYNC_TOLERANCE_DEFAULT);
    onTimeSpeedChange(TIME_SPEED_DEFAULT);
    onReset();
  }, [onBrightnessChange, onSyncToleranceChange, onTimeSpeedChange, onReset]);

  return (
    <>
      <StatsPanel stats={stats} />

      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(26,26,46,0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: 12,
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          color: '#FFFFFF',
          border: '1px solid rgba(0,255,136,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 10,
          maxWidth: '92vw',
        }}
      >
        <Slider
          label="亮度"
          value={brightness}
          min={0.3}
          max={1.0}
          step={0.01}
          displayValue={`${(brightness * 100).toFixed(0)}%`}
          onChange={onBrightnessChange}
        />

        <div
          style={{
            width: 1,
            height: 36,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 1,
          }}
        />

        <Slider
          label="同步度"
          value={syncTolerance}
          min={0.1}
          max={0.5}
          step={0.01}
          displayValue={`${syncTolerance.toFixed(2)}s`}
          onChange={onSyncToleranceChange}
        />

        <div
          style={{
            width: 1,
            height: 36,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 1,
          }}
        />

        <Slider
          label="时间流速"
          value={timeSpeed}
          min={0.5}
          max={3.0}
          step={0.1}
          displayValue={`${timeSpeed.toFixed(1)}x`}
          onChange={onTimeSpeedChange}
        />

        <div
          style={{
            width: 1,
            height: 36,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 1,
          }}
        />

        <InteractiveButton onClick={handleReset}>
          重置
        </InteractiveButton>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 100,
          right: 20,
          fontSize: 11,
          color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.8,
          textAlign: 'right',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <div>单击：区域同步</div>
        <div>双击：共鸣波</div>
        <div>悬停：萤火虫信息</div>
      </div>
    </>
  );
};
