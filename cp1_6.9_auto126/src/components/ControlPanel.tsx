import React from 'react'

interface ControlPanelProps {
  startHue: number
  endHue: number
  brushSize: number
  maxAge: number
  backgroundColor: string
  particleCount: number
  onStartHueChange: (hue: number) => void
  onEndHueChange: (hue: number) => void
  onBrushSizeChange: (size: number) => void
  onMaxAgeChange: (age: number) => void
  onBackgroundColorChange: (color: string) => void
  onClear: () => void
}

function hslToHex(hue: number, sat: number = 90, light: number = 80): string {
  const h = hue / 360
  const s = sat / 100
  const l = light / 100
  const k = (n: number) => (n + h * 12) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  startHue,
  endHue,
  brushSize,
  maxAge,
  backgroundColor,
  particleCount,
  onStartHueChange,
  onEndHueChange,
  onBrushSizeChange,
  onMaxAgeChange,
  onBackgroundColorChange,
  onClear
}) => {
  const gradientStyle = `linear-gradient(to right, ${hslToHex(startHue)}, ${hslToHex(endHue)})`
  const maxAgeSeconds = Math.round(maxAge / 60)

  return (
    <div className="control-panel">
      <h2 className="panel-title">生命笔触</h2>
      <p className="panel-subtitle">Life Brush</p>

      <div className="control-group">
        <label className="control-label">
          起始色 · H {Math.round(startHue)}°
          <div className="color-preview" style={{ background: hslToHex(startHue, 90, 80) }} />
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={startHue}
          onChange={(e) => onStartHueChange(Number(e.target.value))}
          className="slider"
          style={{ background: gradientStyle }}
        />
      </div>

      <div className="control-group">
        <label className="control-label">
          结束色 · H {Math.round(endHue)}°
          <div className="color-preview" style={{ background: hslToHex(endHue, 90, 80) }} />
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={endHue}
          onChange={(e) => onEndHueChange(Number(e.target.value))}
          className="slider"
          style={{ background: gradientStyle }}
        />
      </div>

      <div className="control-group">
        <label className="control-label">笔触粗细 · {brushSize}px</label>
        <input
          type="range"
          min="1"
          max="15"
          step="0.5"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="slider"
          style={{ background: gradientStyle }}
        />
      </div>

      <div className="control-group">
        <label className="control-label">生命时长 · {maxAgeSeconds}s</label>
        <input
          type="range"
          min="10"
          max="60"
          value={maxAgeSeconds}
          onChange={(e) => onMaxAgeChange(Number(e.target.value) * 60)}
          className="slider"
          style={{ background: gradientStyle }}
        />
      </div>

      <div className="control-group">
        <label className="control-label">画布背景</label>
        <div className="color-picker-row">
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            className="color-picker"
          />
          <span className="color-hex">{backgroundColor.toUpperCase()}</span>
        </div>
      </div>

      <div className="color-presets">
        <span className="presets-label">预设</span>
        <div className="preset-buttons">
          <button
            className="preset-btn"
            onClick={() => {
              onStartHueChange(176)
              onEndHueChange(343)
            }}
            style={{ background: 'linear-gradient(135deg, #45A29E, #C3073F)' }}
            title="荧光青→洋红"
          />
          <button
            className="preset-btn"
            onClick={() => {
              onStartHueChange(280)
              onEndHueChange(200)
            }}
            style={{ background: 'linear-gradient(135deg, #9D4EDD, #4CC9F0)' }}
            title="紫→青蓝"
          />
          <button
            className="preset-btn"
            onClick={() => {
              onStartHueChange(30)
              onEndHueChange(350)
            }}
            style={{ background: 'linear-gradient(135deg, #FFB703, #FF006E)' }}
            title="金→粉"
          />
          <button
            className="preset-btn"
            onClick={() => {
              onStartHueChange(120)
              onEndHueChange(180)
            }}
            style={{ background: 'linear-gradient(135deg, #06D6A0, #118AB2)' }}
            title="翡翠→蓝"
          />
        </div>
      </div>

      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">活跃粒子</span>
          <span className="stat-value">{particleCount}</span>
        </div>
      </div>

      <button className="clear-btn" onClick={onClear}>
        清空画布
      </button>
    </div>
  )
}
