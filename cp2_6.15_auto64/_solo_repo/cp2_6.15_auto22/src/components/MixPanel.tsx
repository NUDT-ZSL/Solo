import type { SelectedAroma } from '@/types'
import './MixPanel.css'

interface MixPanelProps {
  selectedAromas: SelectedAroma[]
  onUpdateRatio: (aromaId: number, ratio: number) => void
  onRemoveAroma: (aromaId: number) => void
  onMix: () => void
  onReset: () => void
}

export default function MixPanel({
  selectedAromas,
  onUpdateRatio,
  onRemoveAroma,
  onMix,
  onReset,
}: MixPanelProps) {
  const totalRatio = selectedAromas.reduce((sum, s) => sum + s.ratio, 0)

  const handleSliderChange = (aromaId: number, value: number) => {
    onUpdateRatio(aromaId, value / 100)
  }

  return (
    <div className="mix-panel" style={{ width: 300 }}>
      <h2 className="mix-panel-title">调香配方</h2>

      {selectedAromas.length === 0 ? (
        <div className="mix-panel-empty">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mix-panel-empty-icon"
          >
            <path d="M9 3h6l-1 5h2a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1h2L9 3z" />
          </svg>
          <p className="mix-panel-empty-text">点击轮盘中的香味添加到配方</p>
        </div>
      ) : (
        <>
          <div className="mix-gradient-bar">
            {selectedAromas.map((s) => (
              <div
                key={s.aroma.id}
                className="mix-gradient-segment"
                style={{
                  width: `${(s.ratio / totalRatio) * 100}%`,
                  background: s.aroma.color,
                }}
              />
            ))}
          </div>

          <div className="mix-aroma-list">
            {selectedAromas.map((s) => {
              const percentage = Math.round((s.ratio / totalRatio) * 100)
              return (
                <div key={s.aroma.id} className="mix-aroma-item">
                  <div className="mix-aroma-header">
                    <div className="mix-aroma-info">
                      <div
                        className="mix-aroma-color-dot"
                        style={{ background: s.aroma.color }}
                      />
                      <span className="mix-aroma-name">{s.aroma.name}</span>
                    </div>
                    <div className="mix-aroma-actions">
                      <span className="mix-aroma-percentage">{percentage}%</span>
                      <button
                        onClick={() => onRemoveAroma(s.aroma.id)}
                        className="mix-aroma-remove"
                        aria-label="删除"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mix-aroma-controls">
                    <button
                      onClick={() => handleSliderChange(s.aroma.id, Math.max(1, percentage - 5))}
                      className="mix-aroma-btn"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={percentage}
                      onChange={(e) => handleSliderChange(s.aroma.id, Number(e.target.value))}
                      className="mix-aroma-slider"
                      style={{
                        background: `linear-gradient(to right, ${s.aroma.color} 0%, ${s.aroma.color} ${percentage}%, #e0c8a0 ${percentage}%, #e0c8a0 100%)`,
                      }}
                    />
                    <button
                      onClick={() => handleSliderChange(s.aroma.id, Math.min(100, percentage + 5))}
                      className="mix-aroma-btn"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mix-actions">
            <button onClick={onMix} className="mix-btn-primary">
              🧪 混合调香
            </button>
            <button onClick={onReset} className="mix-btn-secondary">
              清空配方
            </button>
          </div>
        </>
      )}
    </div>
  )
}
