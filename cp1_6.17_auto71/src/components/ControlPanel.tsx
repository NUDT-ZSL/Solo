import type { DesignToken } from '../types'
import './ControlPanel.css'

interface ControlPanelProps {
  token: DesignToken
  onChange: (token: DesignToken) => void
}

export default function ControlPanel({ token, onChange }: ControlPanelProps) {
  const handleChange = (key: keyof DesignToken, value: number | string) => {
    onChange({ ...token, [key]: value })
  }

  return (
    <div className="control-panel">
      <h2 className="panel-title">参数调节</h2>

      <div className="control-group">
        <h3 className="group-title">圆角</h3>
        <div className="slider-row">
          <input
            type="range"
            min="0"
            max="24"
            step="1"
            value={token.borderRadius}
            onChange={(e) => handleChange('borderRadius', Number(e.target.value))}
            className="md-slider"
          />
          <span className="slider-value">{token.borderRadius}px</span>
        </div>
      </div>

      <div className="control-group">
        <h3 className="group-title">阴影偏移</h3>
        <div className="slider-row">
          <label className="slider-label">X</label>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={token.shadowOffsetX}
            onChange={(e) => handleChange('shadowOffsetX', Number(e.target.value))}
            className="md-slider"
          />
          <span className="slider-value">{token.shadowOffsetX}px</span>
        </div>
        <div className="slider-row">
          <label className="slider-label">Y</label>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={token.shadowOffsetY}
            onChange={(e) => handleChange('shadowOffsetY', Number(e.target.value))}
            className="md-slider"
          />
          <span className="slider-value">{token.shadowOffsetY}px</span>
        </div>
      </div>

      <div className="control-group">
        <h3 className="group-title">背景色</h3>
        <div className="color-row">
          <div className="color-preview-wrap">
            <input
              type="color"
              value={token.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              className="color-picker"
            />
            <div
              className="color-preview-circle"
              style={{ backgroundColor: token.backgroundColor }}
            />
          </div>
          <span className="color-hex">{token.backgroundColor.toUpperCase()}</span>
        </div>
      </div>

      <div className="control-group">
        <h3 className="group-title">动画时长</h3>
        <div className="slider-row">
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={token.animationDuration}
            onChange={(e) => handleChange('animationDuration', Number(e.target.value))}
            className="md-slider"
          />
          <span className="slider-value">{token.animationDuration.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  )
}
