import React from 'react';
import type { PrismState } from './App';

interface ControlsPanelProps {
  prisms: PrismState[];
  lightIntensity: number;
  onUpdatePrism: (id: number, key: 'rotation' | 'refraction', value: number) => void;
  onUpdateLightIntensity: (value: number) => void;
  onApplyPreset: (presetKey: string) => void;
  transitioning: boolean;
}

const PRESET_CONFIG = [
  { key: 'sunset', name: '日落暖调', color: '#ff6b35' },
  { key: 'aurora', name: '极光冷调', color: '#00d4aa' },
  { key: 'neon', name: '霓虹幻彩', color: '#c77dff' },
];

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  accentColor?: string;
}> = ({ label, value, min, max, step, unit = '', onChange, accentColor = '#6366f1' }) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, color: '#a0aec0', fontWeight: 500 }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 12,
            color: accentColor,
            fontWeight: 600,
            fontFamily: 'monospace',
            background: `${accentColor}15`,
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 6 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#1e293b',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})`,
            borderRadius: 3,
            transition: 'width 0.1s ease',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${percent}% - 8px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: accentColor,
            boxShadow: `0 0 12px ${accentColor}aa, 0 2px 4px rgba(0,0,0,0.3)`,
            pointerEvents: 'none',
            transition: 'left 0.1s ease',
          }}
        />
      </div>
    </div>
  );
};

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  prisms,
  lightIntensity,
  onUpdatePrism,
  onUpdateLightIntensity,
  onApplyPreset,
  transitioning,
}) => {
  const prismColors = ['#f472b6', '#60a5fa', '#34d399'];

  return (
    <div
      style={{
        position: 'fixed',
        left: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 280,
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 16,
        border: '1px solid rgba(99, 102, 241, 0.2)',
        boxShadow:
          '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background:
                'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 22h20L12 2z"
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#f1f5f9',
              letterSpacing: -0.3,
            }}
          >
            棱镜光谱控制台
          </h2>
        </div>
        <p style={{ fontSize: 11, color: '#64748b', marginLeft: 38 }}>
          Prism Spectrum Visualizer
        </p>
      </div>

      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent)',
          marginBottom: 18,
        }}
      />

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 12,
            paddingLeft: 4,
          }}
        >
          预设场景
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {PRESET_CONFIG.map(preset => (
            <button
              key={preset.key}
              onClick={() => !transitioning && onApplyPreset(preset.key)}
              disabled={transitioning}
              style={{
                flex: 1,
                padding: '10px 6px',
                fontSize: 11,
                fontWeight: 600,
                color: preset.color,
                background: `${preset.color}12`,
                border: `1px solid ${preset.color}40`,
                borderRadius: 8,
                cursor: transitioning ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: transitioning ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                if (!transitioning) {
                  e.currentTarget.style.background = `${preset.color}25`;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${preset.color}30`;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = `${preset.color}12`;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 14,
            paddingLeft: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#fbbf24',
              boxShadow: '0 0 8px #fbbf24',
            }}
          />
          全局光源
        </div>
        <Slider
          label="光源强度"
          value={lightIntensity}
          min={0.5}
          max={2.0}
          step={0.1}
          unit="x"
          onChange={onUpdateLightIntensity}
          accentColor="#fbbf24"
        />
      </div>

      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent)',
          marginBottom: 18,
        }}
      />

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 14,
          paddingLeft: 4,
        }}
      >
        棱镜参数
      </div>

      {prisms.map((prism, idx) => (
        <div
          key={prism.id}
          style={{
            marginBottom: 18,
            padding: 14,
            background: `linear-gradient(135deg, ${prismColors[idx]}08 0%, transparent 100%)`,
            borderRadius: 12,
            border: `1px solid ${prismColors[idx]}22`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: prismColors[idx],
                boxShadow: `0 0 8px ${prismColors[idx]}`,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#e2e8f0',
              }}
            >
              棱镜 {idx + 1}
            </span>
            <span
              style={{
                fontSize: 10,
                color: '#64748b',
                marginLeft: 'auto',
                fontFamily: 'monospace',
              }}
            >
              X:{prism.position[0].toFixed(1)}
            </span>
          </div>

          <Slider
            label="旋转角度"
            value={prism.rotation}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={v => onUpdatePrism(prism.id, 'rotation', v)}
            accentColor={prismColors[idx]}
          />
          <div style={{ height: 2 }} />
          <Slider
            label="折射率"
            value={prism.refraction}
            min={1.3}
            max={2.5}
            step={0.1}
            onChange={v => onUpdatePrism(prism.id, 'refraction', v)}
            accentColor={prismColors[idx]}
          />
        </div>
      ))}

      <div
        style={{
          marginTop: 20,
          padding: 12,
          background: 'rgba(99, 102, 241, 0.08)',
          borderRadius: 10,
          border: '1px solid rgba(99, 102, 241, 0.15)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: '#818cf8',
            fontWeight: 600,
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          快捷键提示
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.7 }}>
          <div>
            <kbd
              style={{
                background: '#1e293b',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontFamily: 'monospace',
                border: '1px solid #334155',
                marginRight: 6,
              }}
            >
              S
            </kbd>
            保存场景截图 (PNG)
          </div>
          <div>
            <kbd
              style={{
                background: '#1e293b',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontFamily: 'monospace',
                border: '1px solid #334155',
                marginRight: 6,
              }}
            >
              拖拽
            </kbd>
            旋转场景视角
          </div>
          <div>
            <kbd
              style={{
                background: '#1e293b',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontFamily: 'monospace',
                border: '1px solid #334155',
                marginRight: 6,
              }}
            >
              滚轮
            </kbd>
            缩放场景
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsPanel;
