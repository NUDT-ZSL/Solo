import { useState, useRef, useEffect } from 'react'
import { Preset, loadPresets, savePreset } from '../data/presets'

interface EditorPanelProps {
  particleCount: number
  speed: number
  direction: number
  size: number
  color: string
  onParticleCountChange: (value: number) => void
  onSpeedChange: (value: number) => void
  onDirectionChange: (value: number) => void
  onSizeChange: (value: number) => void
  onColorChange: (value: string) => void
  onPresetLoad: (preset: Preset) => void
}

export default function EditorPanel({
  particleCount,
  speed,
  direction,
  size,
  color,
  onParticleCountChange,
  onSpeedChange,
  onDirectionChange,
  onSizeChange,
  onColorChange,
  onPresetLoad,
}: EditorPanelProps) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState<Preset[]>([])
  const gradientRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPresets(loadPresets())
  }, [])

  const handleColorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gradientRef.current) return
    const rect = gradientRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const hex = ratioToHex(ratio)
    onColorChange(hex)
  }

  const ratioToHex = (ratio: number): string => {
    const hue = ratio * 300
    const rgb = hslToRgb(hue, 1, 0.5)
    return rgbToHex(rgb[0], rgb[1], rgb[2])
  }

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h / 360 + 1 / 3)
      g = hue2rgb(p, q, h / 360)
      b = hue2rgb(p, q, h / 360 - 1 / 3)
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
  }

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
  }

  const handleSavePreset = () => {
    if (!presetName.trim()) return
    const newPreset = savePreset({
      name: presetName.trim(),
      particleCount,
      speed,
      direction,
      size,
      color,
    })
    setPresets([...presets, newPreset])
    setPresetName('')
    setShowSaveModal(false)
  }

  const handleLoadPreset = (preset: Preset) => {
    onPresetLoad(preset)
    setShowLoadModal(false)
  }

  const renderPresetThumbnail = (preset: Preset, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, w, h)

    const count = Math.min(preset.particleCount, 50)
    const dirRad = (preset.direction * Math.PI) / 180

    ctx.fillStyle = preset.color
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const r = (preset.size / 10) * 2 + 0.5
      ctx.globalAlpha = 0.6 + Math.random() * 0.4
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  return (
    <div className="editor-panel">
      <div>
        <h1 className="panel-title">WindyCanvas</h1>
        <p className="panel-subtitle">粒子动画编辑器</p>
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span>粒子数量</span>
          <span className="slider-value">{particleCount}</span>
        </div>
        <input
          type="range"
          min="100"
          max="1000"
          step="10"
          value={particleCount}
          onChange={(e) => onParticleCountChange(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span>运动速度</span>
          <span className="slider-value">{speed.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span>方向角度</span>
          <span className="slider-value">{direction}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={direction}
          onChange={(e) => onDirectionChange(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span>粒子大小</span>
          <span className="slider-value">{size}</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="color-group">
        <span className="color-label">粒子颜色</span>
        <div className="color-picker-container">
          <div
            ref={gradientRef}
            className="color-gradient"
            onClick={handleColorClick}
          />
          <span className="color-value">{color.toUpperCase()}</span>
        </div>
      </div>

      <div className="button-group">
        <button className="btn btn-secondary" onClick={() => setShowSaveModal(true)}>
          保存预设
        </button>
        <button className="btn btn-primary" onClick={() => setShowLoadModal(true)}>
          加载预设
        </button>
      </div>

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">保存预设</h3>
            <input
              type="text"
              className="modal-input"
              placeholder="输入预设名称"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSavePreset}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">加载预设</h3>
            <div className="preset-list">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="preset-card"
                  onClick={() => handleLoadPreset(preset)}
                >
                  <div className="preset-thumbnail">
                    <canvas
                      width={60}
                      height={60}
                      ref={(canvas) => renderPresetThumbnail(preset, canvas)}
                    />
                  </div>
                  <span className="preset-name">{preset.name}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowLoadModal(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
