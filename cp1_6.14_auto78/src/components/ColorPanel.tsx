import { useState, useCallback, useRef } from 'react'
import type { ThemeVariable } from '../hooks/useTheme'
import './ColorPanel.css'

const PRESET_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#6c5ce7', '#fd79a8', '#e84393',
  '#00cec9', '#55efc4', '#81ecec', '#74b9ff', '#a29bfe',
  '#ffeaa7', '#fab1a0', '#ff7675', '#dfe6e9', '#636e72',
]

interface ColorPanelProps {
  onColorDrop?: (variable: ThemeVariable, color: string) => void
  onCustomColor?: (color: string) => void
}

export default function ColorPanel({ onColorDrop, onCustomColor }: ColorPanelProps) {
  const [tooltip, setTooltip] = useState<{ color: string; x: number; y: number } | null>(null)
  const [customColor, setCustomColor] = useState('#6c5ce7')
  const colorInputRef = useRef<HTMLInputElement>(null)

  const handleDragStart = useCallback((e: React.DragEvent, color: string) => {
    e.dataTransfer.setData('text/plain', color)
    e.dataTransfer.effectAllowed = 'copy'

    const preview = document.createElement('div')
    preview.className = 'drag-preview'
    preview.style.width = '48px'
    preview.style.height = '48px'
    preview.style.borderRadius = '50%'
    preview.style.backgroundColor = color
    preview.style.opacity = '0.7'
    preview.style.position = 'absolute'
    preview.style.top = '-1000px'
    preview.style.pointerEvents = 'none'
    document.body.appendChild(preview)
    e.dataTransfer.setDragImage(preview, 24, 24)

    setTimeout(() => {
      if (preview.parentNode) {
        preview.parentNode.removeChild(preview)
      }
    }, 100)
  }, [])

  const handleCustomColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    if (onCustomColor) {
      onCustomColor(color)
    }
  }, [onCustomColor])

  const handleColorInputClick = useCallback(() => {
    colorInputRef.current?.click()
  }, [])

  return (
    <aside className="color-panel">
      <h2 className="color-panel-title">颜色面板</h2>

      <div className="color-swatch-grid">
        {PRESET_COLORS.map((color) => (
          <div
            key={color}
            className="color-swatch"
            draggable
            onDragStart={(e) => handleDragStart(e, color)}
            onMouseEnter={(e) => setTooltip({ color, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setTooltip(null)}
            onMouseMove={(e) => {
              if (tooltip) {
                setTooltip({ color, x: e.clientX, y: e.clientY })
              }
            }}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {tooltip && (
        <div
          className="color-tooltip"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 32,
          }}
        >
          {tooltip.color}
        </div>
      )}

      <div className="custom-picker-section">
        <label className="custom-picker-label">自定义取色器</label>
        <div className="custom-picker-row">
          <div
            className="custom-picker-swatch"
            draggable
            onDragStart={(e) => handleDragStart(e, customColor)}
            style={{ backgroundColor: customColor }}
          />
          <input
            ref={colorInputRef}
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="color-input-hidden"
          />
          <button
            className="color-value-btn"
            onClick={handleColorInputClick}
          >
            {customColor}
          </button>
        </div>
      </div>

      <p className="color-panel-hint">
        拖拽色块到右侧组件上，即可实时覆盖对应CSS变量的色值
      </p>
    </aside>
  )
}
