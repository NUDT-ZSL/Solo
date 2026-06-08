import { useState } from 'react';
import type { WallpaperConfig, PatternType, ColorScheme } from '../App';
import { COLOR_SCHEMES } from '../App';

interface ControlPanelProps {
  config: WallpaperConfig;
  onPatternChange: (pattern: PatternType) => void;
  onColorSchemeChange: (colorScheme: ColorScheme) => void;
  onSpeedChange: (speed: number) => void;
  onDensityChange: (density: number) => void;
}

const PATTERNS: { key: PatternType; label: string; icon: string }[] = [
  { key: 'kaleidoscope', label: '万花筒', icon: '✦' },
  { key: 'ripple', label: '波纹', icon: '◎' },
  { key: 'smoke', label: '烟雾', icon: '≈' },
];

export default function ControlPanel({
  config,
  onPatternChange,
  onColorSchemeChange,
  onSpeedChange,
  onDensityChange,
}: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    zIndex: 10,
    width: collapsed ? '56px' : '320px',
    padding: collapsed ? '14px' : '24px',
    background: 'rgba(15, 15, 35, 0.65)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(100, 100, 255, 0.05)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
  };

  const sectionTitleStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    marginBottom: '10px',
  };

  const toggleBtnStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    position: collapsed ? 'relative' : 'absolute',
    top: collapsed ? 'auto' : '16px',
    right: collapsed ? 'auto' : '16px',
  };

  return (
    <div style={panelStyle}>
      <button
        style={toggleBtnStyle}
        onClick={() => setCollapsed(!collapsed)}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
          (e.target as HTMLElement).style.boxShadow = '0 0 12px rgba(150,150,255,0.3)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
          (e.target as HTMLElement).style.boxShadow = 'none';
        }}
      >
        {collapsed ? '☰' : '✕'}
      </button>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '16px',
              fontWeight: 600,
              margin: 0,
              letterSpacing: '1px',
            }}>
              流光印相
            </h2>
          </div>

          <div>
            <div style={sectionTitleStyle}>图案模式</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PATTERNS.map(({ key, label, icon }) => {
                const isActive = config.pattern === key;
                return (
                  <button
                    key={key}
                    onClick={() => onPatternChange(key)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      border: isActive ? '1px solid rgba(150, 150, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      background: isActive
                        ? 'rgba(100, 100, 255, 0.2)'
                        : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: isActive ? '0 0 20px rgba(100, 100, 255, 0.15)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(150,150,255,0.3)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(150,150,255,0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={sectionTitleStyle}>配色方案</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLOR_SCHEMES.map((scheme) => {
                const isActive = config.colorScheme.name === scheme.name;
                return (
                  <button
                    key={scheme.name}
                    onClick={() => onColorSchemeChange(scheme)}
                    style={{
                      padding: '6px 14px',
                      border: isActive
                        ? '1px solid rgba(150, 150, 255, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '20px',
                      background: isActive
                        ? 'rgba(100, 100, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.04)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isActive ? '0 0 16px rgba(100, 100, 255, 0.1)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(150,150,255,0.3)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(150,150,255,0.12)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }
                    }}
                  >
                    <span style={{ display: 'flex', gap: '2px' }}>
                      {scheme.colors.slice(0, 3).map((c, i) => (
                        <span key={i} style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: c,
                          display: 'inline-block',
                        }} />
                      ))}
                    </span>
                    {scheme.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ ...sectionTitleStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>运动速度</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{config.speed}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={config.speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, rgba(100,100,255,0.6) ${config.speed}%, rgba(255,255,255,0.08) ${config.speed}%)`,
                borderRadius: '2px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <div>
            <div style={{ ...sectionTitleStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>粒子密度</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{config.density}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={config.density}
              onChange={(e) => onDensityChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, rgba(100,100,255,0.6) ${config.density}%, rgba(255,255,255,0.08) ${config.density}%)`,
                borderRadius: '2px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
