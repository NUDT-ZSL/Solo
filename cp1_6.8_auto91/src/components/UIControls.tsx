import { useDuneStore } from '@/store/useDuneStore'
import { Wind, Compass, Mountain, Shuffle } from 'lucide-react'

export default function UIControls() {
  const { windSpeed, windDirection, duneAmplitude, setWindSpeed, setWindDirection, setDuneAmplitude, randomize } = useDuneStore()

  return (
    <div className="ui-panel">
      <h2 className="ui-panel-title">沙丘控制</h2>

      <div className="ui-control-group">
        <label className="ui-label">
          <Wind size={14} />
          <span>风速</span>
          <span className="ui-value">{windSpeed.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={windSpeed}
          onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
          className="ui-slider"
        />
      </div>

      <div className="ui-control-group">
        <label className="ui-label">
          <Compass size={14} />
          <span>风向</span>
          <span className="ui-value">{windDirection.toFixed(0)}°</span>
        </label>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={windDirection}
          onChange={(e) => setWindDirection(parseFloat(e.target.value))}
          className="ui-slider"
        />
      </div>

      <div className="ui-control-group">
        <label className="ui-label">
          <Mountain size={14} />
          <span>起伏度</span>
          <span className="ui-value">{duneAmplitude.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={duneAmplitude}
          onChange={(e) => setDuneAmplitude(parseFloat(e.target.value))}
          className="ui-slider"
        />
      </div>

      <button className="ui-btn" onClick={randomize}>
        <Shuffle size={16} />
        <span>随机地貌</span>
      </button>
    </div>
  )
}
