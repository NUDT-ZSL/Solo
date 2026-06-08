import { useLavaStore } from './store'
import { RotateCcw, Flame, Sun, GitBranch } from 'lucide-react'

export function UIControl() {
  const {
    flowSpeed,
    glowIntensity,
    branchDensity,
    selectedBranch,
    setFlowSpeed,
    setGlowIntensity,
    setBranchDensity,
    setSelectedBranch,
    reset,
  } = useLavaStore()

  return (
    <>
      <div className="control-panel">
        <div className="panel-header">
          <Flame size={18} />
          <span>熔岩控制</span>
        </div>

        <div className="slider-group">
          <label>
            <GitBranch size={14} />
            <span>熔岩流速</span>
          </label>
          <div className="slider-row">
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={flowSpeed}
              onChange={(e) => setFlowSpeed(parseFloat(e.target.value))}
            />
            <span className="slider-value">{flowSpeed.toFixed(1)}</span>
          </div>
        </div>

        <div className="slider-group">
          <label>
            <Sun size={14} />
            <span>发光强度</span>
          </label>
          <div className="slider-row">
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={glowIntensity}
              onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
            />
            <span className="slider-value">{glowIntensity.toFixed(1)}</span>
          </div>
        </div>

        <div className="slider-group">
          <label>
            <GitBranch size={14} />
            <span>分支密度</span>
          </label>
          <div className="slider-row">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={branchDensity}
              onChange={(e) => setBranchDensity(parseInt(e.target.value))}
            />
            <span className="slider-value">{branchDensity}</span>
          </div>
        </div>

        <button className="reset-btn" onClick={reset}>
          <RotateCcw size={14} />
          <span>重置</span>
        </button>
      </div>

      {selectedBranch && (
        <div
          className="info-card"
          style={{
            left: Math.min(selectedBranch.screenX + 20, window.innerWidth - 260),
            top: Math.min(selectedBranch.screenY - 40, window.innerHeight - 180),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="info-card-header">
            <Flame size={16} />
            <span>支流信息</span>
            <button className="close-btn" onClick={() => setSelectedBranch(null)}>✕</button>
          </div>
          <div className="info-row">
            <span className="info-label">流速</span>
            <span className="info-value">{selectedBranch.speed.toFixed(2)} m/s</span>
          </div>
          <div className="info-row">
            <span className="info-label">温度</span>
            <span className="info-value">{selectedBranch.temperature.toFixed(0)} °C</span>
          </div>
          <div className="info-row">
            <span className="info-label">分支数</span>
            <span className="info-value">{selectedBranch.childCount}</span>
          </div>
        </div>
      )}
    </>
  )
}
