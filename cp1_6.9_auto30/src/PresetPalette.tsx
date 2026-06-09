import React, { useState } from 'react'
import { HSL, hexToHsl, hslToHex } from './utils/color'

export interface HistoryItem {
  hsl: HSL
  hex: string
  timestamp: number
}

export interface PresetClick {
  idx: number
  hsl: HSL
  screenX: number
  screenY: number
}

interface Props {
  history: HistoryItem[]
  onApplyPreset: (e: PresetClick) => void
  onApplyHistory: (item: HistoryItem) => void
}

const PRESETS: string[] = [
  '#FF4D4F',
  '#FA8C16',
  '#FADB14',
  '#52C41A',
  '#13C2C2',
  '#1890FF',
  '#722ED1',
  '#EB2F96'
]

export default function PresetPalette({ history, onApplyPreset, onApplyHistory }: Props) {
  const [restoreMsg, setRestoreMsg] = useState<{ text: string; id: number } | null>(null)
  const [hoverHistory, setHoverHistory] = useState<number | null>(null)
  const [hoverPreset, setHoverPreset] = useState<number | null>(null)

  const handlePresetClick = (idx: number, hex: string, e: React.MouseEvent<HTMLDivElement>) => {
    const hsl = hexToHsl(hex)
    if (!hsl) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    onApplyPreset({
      idx,
      hsl,
      screenX: rect.left + rect.width / 2,
      screenY: rect.top + rect.height / 2
    })
  }

  const handleHistoryClick = (item: HistoryItem) => {
    onApplyHistory(item)
    const msgId = Date.now()
    setRestoreMsg({ text: `已恢复 ${item.hex}`, id: msgId })
    const startTs = performance.now()
    const fadeDuration = 1500
    const tick = () => {
      if (performance.now() - startTs > fadeDuration) {
        setRestoreMsg(prev => prev?.id === msgId ? null : prev)
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  return (
    <div className="preset-palette">
      <div className="preset-section">
        <div className="section-title">快速预设</div>
        <div className="preset-row">
          {PRESETS.map((hex, idx) => {
            const isHover = hoverPreset === idx
            return (
              <div
                key={idx}
                className={`preset-swatch ${isHover ? 'hover' : ''}`}
                style={{
                  background: hex,
                  transform: isHover ? 'scale(1.12)' : 'scale(1)',
                  boxShadow: isHover
                    ? `0 0 18px ${hex}99`
                    : '0 2px 6px rgba(0,0,0,0.3)',
                  transition: 'transform 0.18s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={() => setHoverPreset(idx)}
                onMouseLeave={() => setHoverPreset(null)}
                onClick={(e) => handlePresetClick(idx, hex, e)}
                title={hex}
              />
            )
          })}
        </div>
      </div>

      <div className="history-section">
        <div className="section-title-row">
          <span className="section-title">历史记录</span>
          {restoreMsg && <span className="restore-tip">{restoreMsg.text}</span>}
        </div>
        <div className="history-grid">
          {Array.from({ length: 12 }).map((_, idx) => {
            const item = history[idx]
            const isHover = hoverHistory === idx
            if (!item) {
              return (
                <div key={idx} className="history-slot">
                  <div className="history-empty" />
                </div>
              )
            }
            const bg = hslToHex(item.hsl)
            return (
              <div
                key={idx}
                className="history-slot"
                onMouseEnter={() => setHoverHistory(idx)}
                onMouseLeave={() => setHoverHistory(null)}
                onClick={() => handleHistoryClick(item)}
                title={item.hex}
              >
                <div
                  className={`history-swatch ${isHover ? 'hover' : ''}`}
                  style={{
                    background: bg,
                    transform: isHover ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: isHover ? `0 0 12px ${bg}aa` : 'none',
                    transition: 'transform 0.18s ease, box-shadow 0.2s ease'
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
