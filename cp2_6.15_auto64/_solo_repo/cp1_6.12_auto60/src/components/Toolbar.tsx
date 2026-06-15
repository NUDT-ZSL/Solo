import React, { useRef, useState } from 'react'
import { MOOD_PALETTES, MIN_BLOB_SIZE, MAX_BLOB_SIZE, DEFAULT_BLOB_SIZE } from '../constants'
import type { MoodPalette, HSLColor } from '../types'

interface ToolbarProps {
  selectedPaletteId: string | null
  currentColor: HSLColor | null
  brushSize: number
  isEyedropperActive: boolean
  onPaletteSelect: (palette: MoodPalette) => void
  onColorPick: (color: HSLColor) => void
  onBrushSizeChange: (size: number) => void
  onEyedropperToggle: (active: boolean) => void
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedPaletteId,
  currentColor,
  brushSize,
  isEyedropperActive,
  onPaletteSelect,
  onColorPick,
  onBrushSizeChange,
  onEyedropperToggle
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hoveredPaletteId, setHoveredPaletteId] = useState<string | null>(null)

  const hslToString = (c: HSLColor, alpha = 1) =>
    `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`

  const getColorFromGradient = (palette: MoodPalette, ratio: number): HSLColor => {
    const idx = Math.min(
      Math.floor(ratio * (palette.colors.length - 1)),
      palette.colors.length - 2
    )
    const localRatio = (ratio * (palette.colors.length - 1)) - idx
    const c1 = palette.colors[idx]
    const c2 = palette.colors[idx + 1]
    return {
      h: c1.h + (c2.h - c1.h) * localRatio,
      s: c1.s + (c2.s - c1.s) * localRatio,
      l: c1.l + (c2.l - c1.l) * localRatio
    }
  }

  const handlePaletteCanvasClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
    palette: MoodPalette
  ) => {
    if (!isEyedropperActive) {
      onPaletteSelect(palette)
      return
    }
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = x / rect.width
    const color = getColorFromGradient(palette, Math.max(0, Math.min(1, ratio)))
    onColorPick(color)
    onEyedropperToggle(false)
  }

  const handleQuickColorPick = (color: HSLColor) => {
    onColorPick(color)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>MoodCanvas</h1>
        <p style={styles.subtitle}>用颜色表达心情 · 让画作歌唱</p>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>🎨</span>
          <span style={styles.sectionTitle}>心情色板</span>
        </div>
        <div style={styles.paletteGrid}>
          {MOOD_PALETTES.map((palette) => {
            const isSelected = selectedPaletteId === palette.id
            const isHovered = hoveredPaletteId === palette.id
            return (
              <div
                key={palette.id}
                style={{
                  ...styles.paletteCard,
                  ...(isSelected ? styles.paletteCardSelected : {}),
                  ...(isHovered ? styles.paletteCardHover : {})
                }}
                onMouseEnter={() => setHoveredPaletteId(palette.id)}
                onMouseLeave={() => setHoveredPaletteId(null)}
              >
                <canvas
                  ref={(el) => {
                    if (el && canvasRef) {
                      const ctx = el.getContext('2d')
                      if (ctx) {
                        const w = el.width = el.offsetWidth * 2
                        const h = el.height = el.offsetHeight * 2
                        const grad = ctx.createLinearGradient(0, 0, w, 0)
                        palette.colors.forEach((c, i) => {
                          grad.addColorStop(i / (palette.colors.length - 1), hslToString(c))
                        })
                        ctx.fillStyle = grad
                        ctx.fillRect(0, 0, w, h)
                      }
                    }
                  }}
                  style={{
                    ...styles.paletteGradient,
                    cursor: isEyedropperActive ? 'crosshair' : 'pointer'
                  }}
                  onClick={(e) => handlePaletteCanvasClick(e, palette)}
                  title={isEyedropperActive ? '点击取色' : `选择「${palette.name}」色板`}
                />
                <div style={styles.paletteInfo}>
                  <span style={styles.paletteEmoji}>{palette.emoji}</span>
                  <span style={styles.paletteName}>{palette.name}</span>
                </div>
                <div style={styles.quickColors}>
                  {palette.colors.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.quickColorDot,
                        background: hslToString(c)
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuickColorPick(c)
                      }}
                      title="快速取色"
                    />
                  ))}
                </div>
                {isSelected && <div style={styles.selectedBadge}>✓</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>🖌️</span>
          <span style={styles.sectionTitle}>绘画工具</span>
        </div>

        <div style={styles.toolRow}>
          <button
            style={{
              ...styles.toolButton,
              ...(isEyedropperActive ? styles.toolButtonActive : {})
            }}
            onClick={() => onEyedropperToggle(!isEyedropperActive)}
            title="吸管工具 (I)"
          >
            <span style={{ fontSize: 18 }}>💧</span>
            <span style={styles.toolButtonLabel}>吸管</span>
          </button>

          <div style={styles.currentColorBox}>
            <div
              style={{
                ...styles.currentColorPreview,
                background: currentColor ? hslToString(currentColor) : 'transparent',
                border: currentColor ? 'none' : '2px dashed rgba(255,255,255,0.3)'
              }}
            />
            <span style={styles.currentColorLabel}>
              {currentColor ? `${Math.round(currentColor.h)}°, ${Math.round(currentColor.s)}%, ${Math.round(currentColor.l)}%` : '未选择'}
            </span>
          </div>
        </div>

        <div style={styles.sliderContainer}>
          <div style={styles.sliderLabelRow}>
            <span style={styles.sliderLabel}>笔触大小</span>
            <span style={styles.sliderValue}>{brushSize}px</span>
          </div>
          <input
            type="range"
            min={MIN_BLOB_SIZE}
            max={MAX_BLOB_SIZE}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            style={styles.slider}
          />
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 320,
    height: '100%',
    background: 'rgba(22, 33, 62, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    padding: '24px 20px',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.2) transparent'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(228, 228, 240, 0.55)',
    fontWeight: 400
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  sectionIcon: {
    fontSize: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'rgba(228, 228, 240, 0.9)'
  },
  paletteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10
  },
  paletteCard: {
    position: 'relative',
    borderRadius: 14,
    padding: 8,
    background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  paletteCardHover: {
    transform: 'translateY(-2px) scale(1.02)',
    borderColor: 'rgba(255,255,255,0.15)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
  },
  paletteCardSelected: {
    borderColor: 'rgba(96, 165, 250, 0.6)',
    boxShadow: '0 0 0 2px rgba(96, 165, 250, 0.25), 0 8px 24px rgba(96, 165, 250, 0.15)'
  },
  paletteGradient: {
    width: '100%',
    height: 44,
    borderRadius: 10
  },
  paletteInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 4px'
  },
  paletteEmoji: {
    fontSize: 16
  },
  paletteName: {
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(228, 228, 240, 0.85)'
  },
  quickColors: {
    display: 'flex',
    gap: 5,
    padding: '0 4px 2px'
  },
  quickColorDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    cursor: 'pointer',
    border: '1.5px solid rgba(255,255,255,0.15)',
    transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    flexShrink: 0
  },
  selectedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: '#fff',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(96, 165, 250, 0.5)'
  },
  toolRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  toolButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(228, 228, 240, 0.85)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 200ms ease',
    flexShrink: 0
  },
  toolButtonActive: {
    borderColor: 'rgba(96, 165, 250, 0.5)',
    background: 'rgba(96, 165, 250, 0.12)',
    color: '#93C5FD'
  },
  toolButtonLabel: {
    fontSize: 13
  },
  currentColorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    padding: '8px 12px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid rgba(255,255,255,0.06)'
  },
  currentColorPreview: {
    width: 28,
    height: 28,
    borderRadius: 8,
    flexShrink: 0,
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)'
  },
  currentColorLabel: {
    fontSize: 11,
    color: 'rgba(228, 228, 240, 0.55)',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid rgba(255,255,255,0.06)'
  },
  sliderLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sliderLabel: {
    fontSize: 12,
    color: 'rgba(228, 228, 240, 0.75)',
    fontWeight: 500
  },
  sliderValue: {
    fontSize: 12,
    color: '#93C5FD',
    fontFamily: 'monospace',
    fontWeight: 600
  },
  slider: {
    width: '100%',
    height: 6,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer'
  }
}

export default Toolbar
