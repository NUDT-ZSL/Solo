import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react'
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

interface ShadeCardProps {
  shade: string
  label: string
  onClick: (hex: string) => void
}

const ShadeCard = memo(function ShadeCard({ shade, label, onClick }: ShadeCardProps) {
  return (
    <div
      className="shade-card"
      onClick={() => onClick(shade)}
    >
      <div
        className="shade-card-preview"
        style={{ backgroundColor: shade }}
      />
      <div className="shade-card-info">
        <span className="shade-card-level">{label}</span>
        <span className="shade-card-hex">{shade}</span>
      </div>
    </div>
  )
})

const ColorSlotTab = memo(function ColorSlotTab({
  slot,
  isActive,
  onClick,
}: {
  slot: ColorSlot
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`color-slot-tab ${isActive ? 'active' : ''}`}
      style={{ backgroundColor: slot.hex }}
      onClick={onClick}
      title={slot.name}
    />
  )
})

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
  const rafIdRef = useRef<number | null>(null)
  const pendingSliderRef = useRef<{ offset: number; hex: string; id: string } | null>(null)

  useEffect(() => {
    setInputValue(activeSlot.hex)
    setLightnessOffset(0)
  }, [activeSlot.id, activeSlot.hex])

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  const commitSliderUpdate = useCallback(() => {
    rafIdRef.current = null
    const pending = pendingSliderRef.current
    if (pending) {
      pendingSliderRef.current = null
      onSlotChange(pending.id, pending.hex)
    }
  }, [onSlotChange])

  const scheduleSliderUpdate = useCallback(
    (offset: number) => {
      const hsl = hexToHsl(activeSlot.hex)
      const newL = Math.max(3, Math.min(97, hsl.l + offset))
      const newHex = hslToHex({ ...hsl, l: newL })
      pendingSliderRef.current = { offset, hex: newHex, id: activeSlot.id }

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(commitSliderUpdate)
      }
    },
    [activeSlot.hex, activeSlot.id, commitSliderUpdate]
  )

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
      scheduleSliderUpdate(offset)
    },
    [scheduleSliderUpdate]
  )

  const handleShadeClick = useCallback((shadeHex: string) => {
    navigator.clipboard.writeText(shadeHex).catch(() => {})
  }, [])

  const primaryHex = useMemo(
    () => slots.find(s => s.id === 'primary')?.hex || '#6366f1',
    [slots]
  )

  const shades = activeSlot.shades

  return (
    <div className="color-editor">
      <div className="color-editor-header">
        <h2 className="color-editor-title">ChromaChord</h2>
        <p className="color-editor-subtitle">构建你的专属色彩主题</p>
      </div>

      <div className="color-slot-tabs">
        {slots.map(slot => (
          <ColorSlotTab
            key={slot.id}
            slot={slot}
            isActive={slot.id === activeSlotId}
            onClick={() => onActiveSlotChange(slot.id)}
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
        <div className="shade-list-inner">
          {shades.map((shade, index) => (
            <ShadeCard
              key={`${activeSlot.id}-${SHADE_LABELS[index]}`}
              shade={shade}
              label={SHADE_LABELS[index]}
              onClick={handleShadeClick}
            />
          ))}
        </div>
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
