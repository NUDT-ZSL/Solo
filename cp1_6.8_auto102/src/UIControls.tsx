import React, { useCallback } from 'react'
import { useAuroraStore } from './store'
import { RotateCcw, Lock, Unlock } from 'lucide-react'

export const UIControls: React.FC = () => {
  const density = useAuroraStore((s) => s.density)
  const amplitude = useAuroraStore((s) => s.amplitude)
  const volume = useAuroraStore((s) => s.volume)
  const locked = useAuroraStore((s) => s.locked)
  const setDensity = useAuroraStore((s) => s.setDensity)
  const setAmplitude = useAuroraStore((s) => s.setAmplitude)
  const setVolume = useAuroraStore((s) => s.setVolume)
  const toggleLocked = useAuroraStore((s) => s.toggleLocked)
  const triggerCameraReset = useAuroraStore((s) => s.triggerCameraReset)

  const handleDensityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDensity(Number(e.target.value))
  }, [setDensity])

  const handleAmplitudeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmplitude(Number(e.target.value))
  }, [setAmplitude])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value))
  }, [setVolume])

  return (
    <div className="ui-panel">
      <div className="ui-panel-header">
        <span className="ui-panel-title">极光编织</span>
        <span className="ui-panel-subtitle">AURORA WEAVE</span>
      </div>

      <div className="ui-slider-group">
        <label className="ui-label">
          <span>极光密度</span>
          <span className="ui-value">{density}</span>
        </label>
        <input
          type="range"
          min={1000}
          max={5000}
          step={100}
          value={density}
          onChange={handleDensityChange}
          className="ui-slider"
        />
      </div>

      <div className="ui-slider-group">
        <label className="ui-label">
          <span>波动幅度</span>
          <span className="ui-value">{amplitude.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={3.0}
          step={0.1}
          value={amplitude}
          onChange={handleAmplitudeChange}
          className="ui-slider"
        />
      </div>

      <div className="ui-slider-group">
        <label className="ui-label">
          <span>音频音量</span>
          <span className="ui-value">{Math.round(volume * 100)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          className="ui-slider"
        />
      </div>

      <div className="ui-button-group">
        <button className="ui-button" onClick={triggerCameraReset}>
          <RotateCcw size={16} />
          <span>视角重置</span>
        </button>
        <button className={`ui-button ${locked ? 'ui-button-active' : ''}`} onClick={toggleLocked}>
          {locked ? <Unlock size={16} /> : <Lock size={16} />}
          <span>{locked ? '解锁极光' : '锁定极光'}</span>
        </button>
      </div>
    </div>
  )
}
