import type { AuroraBandParams } from '../App'

interface ControlPanelProps {
  params: AuroraBandParams[]
  onUpdateBand: (id: number, patch: Partial<AuroraBandParams>) => void
  onReset: () => void
}

export default function ControlPanel({ params, onUpdateBand, onReset }: ControlPanelProps) {
  return (
    <div className="control-panel">
      {params.map((band) => (
        <div key={band.id} className="band-group">
          <div className="band-header">
            <div className="color-picker-wrapper">
              <input
                type="color"
                value={band.color}
                onChange={(e) => onUpdateBand(band.id, { color: e.target.value })}
              />
              <div
                className="color-preview"
                style={{ background: band.color, color: band.color }}
              />
            </div>
            <span className="band-label">极光带 {band.id + 1}</span>
          </div>

          <div className="slider-group" style={{ ['--slider-color' as string]: band.color }}>
            <div className="slider-label">
              <span>流速</span>
              <span>{band.flowSpeed.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={band.flowSpeed}
              onChange={(e) =>
                onUpdateBand(band.id, { flowSpeed: parseFloat(e.target.value) })
              }
            />
          </div>

          <div className="slider-group" style={{ ['--slider-color' as string]: band.color }}>
            <div className="slider-label">
              <span>波动幅度</span>
              <span>{band.amplitude.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={band.amplitude}
              onChange={(e) =>
                onUpdateBand(band.id, { amplitude: parseFloat(e.target.value) })
              }
            />
          </div>
        </div>
      ))}
      <button className="reset-btn" onClick={onReset}>
        重置
      </button>
    </div>
  )
}
