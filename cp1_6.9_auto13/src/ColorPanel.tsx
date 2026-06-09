import React, { useCallback, useMemo, useState } from 'react'
import { hslToHex, hslString } from './utils/colorUtils'

export interface ColorScheme {
  bgHue: number
  mainHue: number
  accentHue: number
}

interface ColorPanelProps {
  scheme: ColorScheme
  onChange: (scheme: ColorScheme) => void
}

const SATURATION = 70
const LIGHTNESS = 60

interface SliderConfig {
  key: keyof ColorScheme
  label: string
}

const SLIDERS: SliderConfig[] = [
  { key: 'bgHue', label: '背景色调' },
  { key: 'mainHue', label: '主图形色调' },
  { key: 'accentHue', label: '辅图形色调' },
]

const ROW_LABELS: Record<keyof ColorScheme, string> = {
  bgHue: '背景色',
  mainHue: '主图形',
  accentHue: '辅图形',
}

const ColorPanel: React.FC<ColorPanelProps> = ({ scheme, onChange }) => {
  const [showScheme, setShowScheme] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const handleSliderChange = useCallback(
    (key: keyof ColorScheme, value: number) => {
      onChange({ ...scheme, [key]: value })
    },
    [scheme, onChange]
  )

  const colorInfo = useMemo(() => {
    const keys: Array<keyof ColorScheme> = ['bgHue', 'mainHue', 'accentHue']
    return keys.map((k) => ({
      key: k,
      hue: scheme[k],
      hex: hslToHex(scheme[k], SATURATION, LIGHTNESS),
      color: hslString(scheme[k], SATURATION, LIGHTNESS),
    }))
  }, [scheme])

  const handleCopy = useCallback(async () => {
    const hexes = colorInfo.map((c) => c.hex).join(', ')
    try {
      await navigator.clipboard.writeText(hexes)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1600)
    } catch (err) {
      const ta = document.createElement('textarea')
      ta.value = hexes
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1600)
    }
  }, [colorInfo])

  return (
    <aside className="color-panel">
      <h1 className="color-panel__title">几何色谱</h1>

      {SLIDERS.map((slider) => {
        const hue = scheme[slider.key]
        const pct = (hue / 360) * 100
        const startColor = hslString(hue, SATURATION, LIGHTNESS, 0.55)
        const endColor = hslString(hue, SATURATION, LIGHTNESS, 0.0)
        return (
          <div className="color-panel__slider-group" key={slider.key}>
            <div className="color-panel__slider-label">
              <span>{slider.label}</span>
              <span>H {hue}°</span>
            </div>
            <div className="color-panel__slider-wrapper">
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 16,
                  background: `linear-gradient(90deg, ${startColor}, ${endColor})`,
                  transition:
                    'width 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={hue}
                onChange={(e) =>
                  handleSliderChange(slider.key, Number(e.target.value))
                }
                className="color-panel__slider"
              />
            </div>
          </div>
        )
      })}

      <button
        className="color-panel__export-btn"
        onClick={() => setShowScheme((v) => !v)}
      >
        {showScheme ? '收起方案' : '导出当前方案'}
      </button>

      {showScheme && (
        <div className="color-panel__scheme-card">
          {colorInfo.map((info) => (
            <div
              key={info.key}
              className="color-panel__scheme-row"
              style={{
                borderColor: info.color,
                background: `${info.color}1A`,
              }}
            >
              <div className="color-panel__scheme-info">
                <strong>{ROW_LABELS[info.key]}</strong>
                <small>HSL({info.hue}, {SATURATION}%, {LIGHTNESS}%)</small>
              </div>
              <strong>{info.hex}</strong>
            </div>
          ))}
          <button className="color-panel__copy-btn" onClick={handleCopy}>
            复制色码
          </button>
          {copySuccess && (
            <div className="color-panel__copy-success">已复制到剪贴板 ✓</div>
          )}
        </div>
      )}
    </aside>
  )
}

export default ColorPanel
