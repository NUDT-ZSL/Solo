import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  parseColor,
  generateShades,
  SHADE_LABELS,
  hexToHsl,
  hslToHex,
  getContrastText,
} from '../utils/colorUtils'
import './ColorEditor.css'

export interface ColorSlot {
  id: string
  name: string
  hex: string
  shades: string[]
}

interface ColorEditorProps {
  slots: ColorSlot[]
  activeSlotId: string
  onSlotChange: (slotId: string, hex: string) => void
  onActiveSlotChange: (slotId: string) => void
  onExport: () => void
}

export function ColorEditor({
  slots,
  activeSlotId,
  onSlotChange,
  onActiveSlotChange,
  onExport,
}: ColorEditorProps) {
  const activeSlot = useMemo(
    () => slots.find(s => s.id === activeSlotId) || slots[0],
    [slots, activeSlotId]
  )

  const [inputValue, setInputValue] = useState(activeSlot.hex)
  const [isAnimating, setIsAnimating] = useState(false)
  const [lightnessOffset, setLightnessOffset] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(activeSlot.hex)
    setLightnessOffset(0)
  }, [activeSlot.id, activeSlot.hex])

  const handleColorApply = useCallback(() => {
    const parsed = parseColor(inputValue)
    if (parsed && parsed !== activeSlot.hex) {
      onSlotChange(activeSlot.id, parsed)
    } else if (parsed) {
      setInputValue(parsed)
    }
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 200)
  }, [inputValue, activeSlot.id, activeSlot.hex, onSlotChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleColorApply()
      }
    },
    [handleColorApply]
  )

  const handleSwatchClick = useCallback(() => {
    handleColorApply()
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [handleColorApply])

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const offset = parseInt(e.target.value, 10)
      setLightnessOffset(offset)

      const hsl = hexToHsl(activeSlot.hex)
      const newL = Math.max(3, Math.min(97, hsl.l + offset))
      const newHex = hslToHex({ ...hsl, l: newL })
      onSlotChange(activeSlot.id, newHex)
    },
    [activeSlot.hex, activeSlot.id, onSlotChange]
  )

  const handleShadeClick = useCallback(
    (shadeHex: string) => {
      navigator.clipboard.writeText(shadeHex).catch(() => {})
    },
    []
  )

  const primaryHex = slots.find(s => s.id === 'primary')?.hex || '#6366f1'

  return (
    <div className="color-editor">
      <div className="color-editor-header">
        <h2 className="color-editor-title">ChromaChord</h2>
        <p className="color-editor-subtitle">构建你的专属色彩主题</p>
      </div>

      <div className="color-slot-tabs">
        {slots.map(slot => (
          <button
            key={slot.id}
            className={`color-slot-tab ${slot.id === activeSlotId ? 'active' : ''}`}
            style={{ backgroundColor: slot.hex }}
            onClick={() => onActiveSlotChange(slot.id)}
            title={slot.name}
          />
        ))}
      </div>

      <div className="color-input-section">
        <div
          className={`color-swatch ${isAnimating ? 'animate' : ''}`}
          style={{ backgroundColor: activeSlot.hex }}
          onClick={handleSwatchClick}
        >
          <span
            className="color-swatch-label"
            style={{ color: getContrastText(activeSlot.hex) }}
          >
            {activeSlot.name}
          </span>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="color-input"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleColorApply}
          placeholder="#6366F1"
        />
      </div>

      <div className="shade-slider-section">
        <div className="shade-slider-label">
          <span>亮度调整</span>
          <span className="shade-slider-value">{lightnessOffset > 0 ? '+' : ''}{lightnessOffset}</span>
        </div>
        <input
          type="range"
          className="shade-slider"
          min="-20"
          max="20"
          value={lightnessOffset}
          onChange={handleSliderChange}
        />
      </div>

      <div className="shade-list">
        <div className="shade-list-header">
          <span>色阶</span>
          <span className="shade-list-hint">点击复制色值</span>
        </div>
        {activeSlot.shades.map((shade, index) => (
          <div
            key={SHADE_LABELS[index]}
            className="shade-card"
            onClick={() => handleShadeClick(shade)}
          >
            <div
              className="shade-card-preview"
              style={{ backgroundColor: shade }}
            />
            <div className="shade-card-info">
              <span className="shade-card-level">{SHADE_LABELS[index]}</span>
              <span className="shade-card-hex">{shade}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        className="export-button"
        style={{ backgroundColor: primaryHex }}
        onClick={onExport}
      >
        导出配置
      </button>
    </div>
  )
}
