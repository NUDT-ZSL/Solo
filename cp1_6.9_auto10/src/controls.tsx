import React from 'react';

interface ControlsProps {
  foldAngle: number;
  unfoldSpeed: number;
  particleMultiplier: number;
  autoPlay: boolean;
  onFoldAngleChange: (v: number) => void;
  onUnfoldSpeedChange: (v: number) => void;
  onParticleMultiplierChange: (v: number) => void;
  onAutoPlayChange: (v: boolean) => void;
  onReset: () => void;
  onRandomColors: () => void;
}

const sliderTrackStyle = {
  background: 'linear-gradient(90deg, #FF6B6B 0%, #FFA94D 25%, #FFD93D 50%, #6BCB77 75%, #4ECDC4 100%)'
};

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit = '', onChange }) => {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        fontSize: 13,
        fontWeight: 500,
        color: '#EAEAEA',
        letterSpacing: 0.5
      }}>
        <span>{label}</span>
        <span style={{
          color: '#FFD93D',
          fontFamily: 'monospace',
          fontSize: 14,
          textShadow: '0 0 8px rgba(255, 217, 61, 0.5)'
        }}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <div style={{
        position: 'relative',
        height: 6,
        borderRadius: 3,
        ...sliderTrackStyle,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${percent}%`,
          borderRadius: 3,
          background: 'transparent'
        }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            left: 0,
            top: -7,
            width: '100%',
            height: 20,
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
            zIndex: 2,
            WebkitAppearance: 'none',
            appearance: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${percent}% - 8px)`,
            top: -5,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#FFD93D',
            boxShadow: `0 0 4px 2px rgba(255, 217, 61, 0.6), 0 0 12px 4px rgba(255, 217, 61, 0.3)`,
            zIndex: 1,
            pointerEvents: 'none',
            transition: 'left 0.08s ease-out, box-shadow 0.2s ease-out'
          }}
        />
      </div>
    </div>
  );
};

const GradientButton: React.FC<{
  label: string;
  onClick: () => void;
}> = ({ label, onClick }) => {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 0 16px 4px rgba(108, 99, 255, 0.5), 0 0 24px 8px rgba(255, 101, 132, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 0 8px 2px rgba(108, 99, 255, 0.25)';
      }}
      style={{
        position: 'relative',
        flex: 1,
        padding: '12px 16px',
        fontSize: 13,
        fontWeight: 600,
        color: '#EAEAEA',
        background: 'rgba(22, 33, 62, 0.6)',
        border: 'none',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'all 0.25s ease-out',
        letterSpacing: 0.8,
        overflow: 'hidden',
        boxShadow: '0 0 8px 2px rgba(108, 99, 255, 0.25)'
      } as React.CSSProperties}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        padding: 2,
        borderRadius: 10,
        background: 'linear-gradient(135deg, #6C63FF 0%, #FF6584 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none'
      } as React.CSSProperties} />
      {label}
    </button>
  );
};

const AutoToggle: React.FC<{
  active: boolean;
  onChange: (v: boolean) => void;
}> = ({ active, onChange }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: 10,
      border: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#EAEAEA',
        letterSpacing: 0.8
      }}>
        自动演展
      </span>
      <button
        onClick={() => onChange(!active)}
        style={{
          position: 'relative',
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: active
            ? 'linear-gradient(135deg, #00E676 0%, #00BFA5 100%)'
            : 'rgba(255, 255, 255, 0.08)',
          border: `2px solid ${active ? 'rgba(0, 230, 118, 0.8)' : 'rgba(255, 255, 255, 0.15)'}`,
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: active
            ? '0 0 16px 4px rgba(0, 230, 118, 0.4), inset 0 0 12px rgba(0, 230, 118, 0.3)'
            : 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
          transform: active ? 'rotate(180deg)' : 'rotate(0deg)'
        } as React.CSSProperties}
      >
        <div style={{
          position: 'absolute',
          inset: 10,
          borderRadius: '50%',
          background: active
            ? 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(255,255,255,0.1) 70%)'
            : 'rgba(255, 255, 255, 0.03)'
        }} />
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#ffffff' : 'rgba(255,255,255,0.35)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: 'absolute',
            left: 11,
            top: 11,
            transform: active ? 'rotate(-180deg)' : 'rotate(0deg)',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
          } as React.CSSProperties}
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>
    </div>
  );
};

const ControlsPanel: React.FC<ControlsProps> = (props) => {
  return (
    <div className="origami-controls" style={{
      position: 'fixed',
      left: 24,
      top: 24,
      bottom: 24,
      width: 280,
      padding: 24,
      borderRadius: 12,
      background: 'rgba(22, 33, 62, 0.72)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
      overflowY: 'auto',
      overflowX: 'hidden'
    } as React.CSSProperties}>
      <div style={{
        marginBottom: 28,
        paddingBottom: 18,
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          margin: 0,
          background: 'linear-gradient(90deg, #FF6B6B 0%, #FFD93D 30%, #4ECDC4 70%, #6C63FF 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          letterSpacing: 3
        }}>
          时序折纸
        </h1>
        <p style={{
          fontSize: 11,
          color: 'rgba(234, 234, 234, 0.45)',
          marginTop: 6,
          marginBottom: 0,
          letterSpacing: 1.5,
          textTransform: 'uppercase'
        }}>
          Temporal Origami
        </p>
      </div>

      <div style={{ flex: 1 }}>
        <Slider
          label="折叠角度"
          value={props.foldAngle}
          min={0}
          max={180}
          step={1}
          unit="°"
          onChange={props.onFoldAngleChange}
        />
        <Slider
          label="展开速度"
          value={props.unfoldSpeed}
          min={0.5}
          max={5}
          step={0.1}
          unit="x"
          onChange={props.onUnfoldSpeedChange}
        />
        <Slider
          label="粒子数量"
          value={props.particleMultiplier}
          min={0.5}
          max={2}
          step={0.1}
          unit="x"
          onChange={props.onParticleMultiplierChange}
        />
      </div>

      <div>
        <div style={{
          display: 'flex',
          gap: 10,
          marginBottom: 14
        }}>
          <GradientButton label="重置动画" onClick={props.onReset} />
          <GradientButton label="随机着色" onClick={props.onRandomColors} />
        </div>
        <AutoToggle
          active={props.autoPlay}
          onChange={props.onAutoPlayChange}
        />
      </div>

      <style>{`
        .origami-controls::-webkit-scrollbar {
          width: 4px;
        }
        .origami-controls::-webkit-scrollbar-track {
          background: transparent;
        }
        .origami-controls::-webkit-scrollbar-thumb {
          background: rgba(255, 217, 61, 0.3);
          border-radius: 2px;
        }
        @media (max-width: 1024px) {
          .origami-controls {
            left: 16px !important;
            right: 16px !important;
            top: auto !important;
            bottom: 16px !important;
            width: auto !important;
            height: 200px !important;
            flex-direction: row !important;
            gap: 20px !important;
            padding: 16px 20px !important;
          }
          .origami-controls > div:nth-child(1) {
            display: none !important;
          }
          .origami-controls > div:nth-child(2) {
            flex: 2 !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 24px !important;
          }
          .origami-controls > div:nth-child(2) > div {
            flex: 1 !important;
            margin-bottom: 0 !important;
          }
          .origami-controls > div:nth-child(3) {
            flex: 1.2 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            gap: 10px !important;
          }
          .origami-controls > div:nth-child(3) > div {
            margin-bottom: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ControlsPanel;
