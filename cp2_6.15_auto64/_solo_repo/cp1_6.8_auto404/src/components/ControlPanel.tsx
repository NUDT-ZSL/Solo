import { ColorTheme, THEME_LABELS } from '../App'

interface Props {
  inkConcentration: number
  brushSize: number
  diffusionSpeed: number
  colorTheme: ColorTheme
  onInkConcentrationChange: (v: number) => void
  onBrushSizeChange: (v: number) => void
  onDiffusionSpeedChange: (v: number) => void
  onColorThemeChange: (v: ColorTheme) => void
  onReset: () => void
}

const themes: ColorTheme[] = ['inkCyan', 'cinnabar', 'goldJade', 'darkPurple', 'moonWhite']

const themePreviewColors: Record<ColorTheme, string> = {
  inkCyan: '#288cb4',
  cinnabar: '#dc3c28',
  goldJade: '#d4af37',
  darkPurple: '#8c3cc8',
  moonWhite: '#b4c8dc',
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 20,
  right: 20,
  width: 240,
  padding: '24px 20px',
  background: 'rgba(20, 22, 28, 0.55)',
  backdropFilter: 'blur(20px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
  border: '1px solid rgba(120, 140, 180, 0.15)',
  borderRadius: 12,
  color: 'rgba(190, 205, 225, 0.85)',
  fontFamily: '"Noto Serif SC", "SimSun", serif',
  fontSize: 13,
  zIndex: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
  letterSpacing: 2,
  fontSize: 12,
  color: 'rgba(170, 190, 215, 0.7)',
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'rgba(60, 75, 100, 0.4)',
  borderRadius: 2,
  outline: 'none',
  cursor: 'pointer',
}

const sectionGap: React.CSSProperties = {
  marginBottom: 20,
}

export default function ControlPanel({
  inkConcentration,
  brushSize,
  diffusionSpeed,
  colorTheme,
  onInkConcentrationChange,
  onBrushSizeChange,
  onDiffusionSpeedChange,
  onColorThemeChange,
  onReset,
}: Props) {
  return (
    <div style={panelStyle}>
      <div
        style={{
          textAlign: 'center',
          fontSize: 16,
          letterSpacing: 6,
          marginBottom: 24,
          color: 'rgba(210, 220, 235, 0.9)',
          textShadow: '0 0 12px rgba(100, 160, 220, 0.3)',
        }}
      >
        流光墨韵
      </div>

      <div style={sectionGap}>
        <div style={labelStyle}>
          <span>墨色浓度</span>
          <span style={{ color: 'rgba(220, 200, 140, 0.8)' }}>{inkConcentration}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={inkConcentration}
          onChange={(e) => onInkConcentrationChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={sectionGap}>
        <div style={labelStyle}>
          <span>笔触粗细</span>
          <span style={{ color: 'rgba(220, 200, 140, 0.8)' }}>{brushSize}</span>
        </div>
        <input
          type="range"
          min={2}
          max={20}
          step={1}
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={sectionGap}>
        <div style={labelStyle}>
          <span>晕染速度</span>
          <span style={{ color: 'rgba(220, 200, 140, 0.8)' }}>{diffusionSpeed.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.1}
          value={diffusionSpeed}
          onChange={(e) => onDiffusionSpeedChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={sectionGap}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>
          <span>颜色主题</span>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {themes.map((t) => (
            <button
              key={t}
              onClick={() => onColorThemeChange(t)}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: colorTheme === t ? '2px solid rgba(255,255,255,0.7)' : '2px solid rgba(80,90,110,0.3)',
                background: themePreviewColors[t],
                cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.2s',
                transform: colorTheme === t ? 'scale(1.15)' : 'scale(1)',
                boxShadow: colorTheme === t
                  ? `0 0 12px ${themePreviewColors[t]}60`
                  : '0 0 4px rgba(0,0,0,0.3)',
              }}
              title={THEME_LABELS[t]}
            />
          ))}
        </div>
        <div
          style={{
            textAlign: 'center',
            marginTop: 6,
            fontSize: 11,
            color: 'rgba(170, 190, 215, 0.5)',
            letterSpacing: 1,
          }}
        >
          {THEME_LABELS[colorTheme]}
        </div>
      </div>

      <button
        onClick={onReset}
        style={{
          width: '100%',
          padding: '8px 0',
          background: 'rgba(60, 75, 100, 0.25)',
          border: '1px solid rgba(120, 140, 180, 0.2)',
          borderRadius: 6,
          color: 'rgba(190, 205, 225, 0.75)',
          fontSize: 13,
          letterSpacing: 4,
          cursor: 'pointer',
          fontFamily: '"Noto Serif SC", "SimSun", serif',
          transition: 'background 0.2s, border-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(80, 95, 130, 0.35)'
          e.currentTarget.style.borderColor = 'rgba(140, 160, 200, 0.35)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(60, 75, 100, 0.25)'
          e.currentTarget.style.borderColor = 'rgba(120, 140, 180, 0.2)'
        }}
      >
        重置画布
      </button>
    </div>
  )
}
