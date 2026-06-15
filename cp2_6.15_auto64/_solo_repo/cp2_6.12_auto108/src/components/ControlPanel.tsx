import { useState } from 'react'
import './ControlPanel.css'

interface ControlPanelProps {
  initialVx: number
  initialVy: number
  fuel: number
  fps: number
  isLaunched: boolean
  isGameOver: boolean
  onVxChange: (value: number) => void
  onVyChange: (value: number) => void
  onLaunch: () => void
  onReset: () => void
}

export default function ControlPanel({
  initialVx,
  initialVy,
  fuel,
  fps,
  isLaunched,
  isGameOver,
  onVxChange,
  onVyChange,
  onLaunch,
  onReset,
}: ControlPanelProps) {
  const [isLaunchPressed, setIsLaunchPressed] = useState(false)
  const [isResetPressed, setIsResetPressed] = useState(false)

  const handleLaunchClick = () => {
    if (isLaunched || isGameOver) return
    setIsLaunchPressed(true)
    setTimeout(() => {
      setIsLaunchPressed(false)
      onLaunch()
    }, 200)
  }

  const handleResetClick = () => {
    setIsResetPressed(true)
    setTimeout(() => {
      setIsResetPressed(false)
      onReset()
    }, 200)
  }

  return (
    <div className="control-panel">
      <h2 className="panel-title">控制面板</h2>

      <div className="slider-group">
        <label className="slider-label">初始速度 X</label>
        <input
          type="range"
          min="-5"
          max="5"
          step="0.1"
          value={initialVx}
          onChange={(e) => onVxChange(parseFloat(e.target.value))}
          disabled={isLaunched}
          className="slider"
        />
        <div className="slider-value">{initialVx.toFixed(1)}</div>
      </div>

      <div className="slider-group">
        <label className="slider-label">初始速度 Y</label>
        <input
          type="range"
          min="-5"
          max="5"
          step="0.1"
          value={initialVy}
          onChange={(e) => onVyChange(parseFloat(e.target.value))}
          disabled={isLaunched}
          className="slider"
        />
        <div className="slider-value">{initialVy.toFixed(1)}</div>
      </div>

      <div className="button-group">
        <button
          className={`btn btn-reset ${isResetPressed ? 'btn-pressed' : ''}`}
          onClick={handleResetClick}
        >
          重置
        </button>
        <button
          className={`btn btn-launch ${isLaunchPressed ? 'btn-pressed' : ''} ${isLaunched || isGameOver ? 'btn-disabled' : ''}`}
          onClick={handleLaunchClick}
          disabled={isLaunched || isGameOver}
        >
          发射
        </button>
      </div>

      <div className="fuel-container">
        <div className="fuel-label">燃料</div>
        <div className="fuel-bar">
          <div
            className="fuel-fill"
            style={{ width: `${Math.max(0, fuel)}%` }}
          />
        </div>
        <div className="fuel-value">{Math.max(0, fuel).toFixed(1)}</div>
      </div>

      <div className="fps-display">
        <span>FPS: {fps}</span>
      </div>
    </div>
  )
}
