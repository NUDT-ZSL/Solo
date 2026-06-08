import { useState, useMemo } from 'react'
import { THEMES } from './utils/particleSystem'

interface ControlPanelProps {
  themeIndex: number
  particleSize: number
  dissipationSpeed: number
  fps: number
  onThemeChange: (index: number) => void
  onParticleSizeChange: (size: number) => void
  onDissipationSpeedChange: (speed: number) => void
  onClear: () => void
}

export default function ControlPanel({
  themeIndex,
  particleSize,
  dissipationSpeed,
  fps,
  onThemeChange,
  onParticleSizeChange,
  onDissipationSpeedChange,
  onClear,
}: ControlPanelProps) {
  const [hoveredTheme, setHoveredTheme] = useState<number | null>(null)
  const [hoveredClear, setHoveredClear] = useState(false)

  const themeButtons = useMemo(
    () =>
      THEMES.map((theme, i) => {
        const isActive = i === themeIndex
        const gradient = `linear-gradient(135deg, rgb(${theme.colors[0].join(',')}), rgb(${theme.colors[2].join(',')}))`
        return (
          <button
            key={theme.name}
            onClick={() => onThemeChange(i)}
            onMouseEnter={() => setHoveredTheme(i)}
            onMouseLeave={() => setHoveredTheme(null)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              border: isActive ? `1.5px solid rgba(${theme.colors[0].join(',')},0.8)` : '1.5px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              background: isActive
                ? `rgba(${theme.colors[0].join(',')},0.15)`
                : 'rgba(255,255,255,0.03)',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              outline: 'none',
              transform: hoveredTheme === i ? 'translateY(-1px)' : 'none',
              boxShadow: isActive
                ? `0 0 20px rgba(${theme.colors[0].join(',')},0.25), inset 0 0 12px rgba(${theme.colors[0].join(',')},0.1)`
                : hoveredTheme === i
                  ? '0 0 15px rgba(255,255,255,0.06)'
                  : 'none',
            }}
          >
            <span
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: gradient,
                flexShrink: 0,
                boxShadow: isActive ? `0 0 8px rgba(${theme.colors[0].join(',')},0.6)` : 'none',
                transition: 'box-shadow 0.35s ease',
              }}
            />
            {theme.nameZh}
            {hoveredTheme === i && !isActive && (
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '10px',
                  background: `radial-gradient(circle at center, rgba(${theme.colors[0].join(',')},0.08) 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
            )}
          </button>
        )
      }),
    [themeIndex, hoveredTheme, onThemeChange]
  )

  const sliderStyle = (color: string): React.CSSProperties => ({
    width: '100%',
    height: '4px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: `linear-gradient(90deg, ${color}33, ${color})`,
    borderRadius: '4px',
    outline: 'none',
    cursor: 'pointer',
  })

  return (
    <div
      style={{
        width: '260px',
        minWidth: '260px',
        height: '100%',
        padding: '24px 20px',
        background: 'rgba(15, 12, 30, 0.65)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.3), inset 0 0 60px rgba(100,60,180,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        overflowY: 'auto',
        color: 'rgba(255,255,255,0.75)',
        fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '2px',
            textShadow: '0 0 20px rgba(140,80,255,0.4)',
          }}
        >
          ⚡ 控制面板
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
          }}
        >
          颜色主题
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {themeButtons}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
            }}
          >
            粒子大小
          </label>
          <span
            style={{
              fontSize: '12px',
              color: THEMES[themeIndex].colors[0].join(',').replace(/^/, 'rgba(').replace(/$/, ',0.8)'),
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {particleSize.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="12"
          step="0.5"
          value={particleSize}
          onChange={(e) => onParticleSizeChange(parseFloat(e.target.value))}
          style={sliderStyle(`rgb(${THEMES[themeIndex].colors[0].join(',')})`)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
            }}
          >
            消散速度
          </label>
          <span
            style={{
              fontSize: '12px',
              color: `rgba(${THEMES[themeIndex].colors[1].join(',')},0.8)`,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {dissipationSpeed.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={dissipationSpeed}
          onChange={(e) => onDissipationSpeedChange(parseFloat(e.target.value))}
          style={sliderStyle(`rgb(${THEMES[themeIndex].colors[1].join(',')})`)}
        />
      </div>

      <button
        onClick={onClear}
        onMouseEnter={() => setHoveredClear(true)}
        onMouseLeave={() => setHoveredClear(false)}
        style={{
          padding: '12px 0',
          border: '1.5px solid rgba(255,60,80,0.3)',
          borderRadius: '10px',
          background: hoveredClear
            ? 'rgba(255,60,80,0.15)'
            : 'rgba(255,60,80,0.06)',
          color: hoveredClear ? '#ff5070' : 'rgba(255,100,120,0.7)',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          letterSpacing: '2px',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
          transform: hoveredClear ? 'translateY(-1px) scale(1.02)' : 'none',
          boxShadow: hoveredClear
            ? '0 0 25px rgba(255,60,80,0.2), inset 0 0 15px rgba(255,60,80,0.08)'
            : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        🗑️ 清空画布
        {hoveredClear && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '10px',
              background: 'radial-gradient(circle at center, rgba(255,60,80,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </button>

      <div
        style={{
          marginTop: 'auto',
          padding: '12px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '1px',
            marginBottom: '4px',
          }}
        >
          性能监控
        </div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: fps >= 55 ? '#00ff88' : fps >= 30 ? '#ffcc00' : '#ff4060',
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 15px ${fps >= 55 ? 'rgba(0,255,136,0.4)' : fps >= 30 ? 'rgba(255,204,0,0.4)' : 'rgba(255,64,96,0.4)'}`,
            transition: 'color 0.3s ease',
          }}
        >
          {fps}
          <span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
            {' '}
            FPS
          </span>
        </div>
      </div>
    </div>
  )
}
