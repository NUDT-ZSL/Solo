import { City } from '../data/cities';

interface ControlPanelProps {
  cities: City[];
  selectedCity: City;
  currentTime: number;
  formattedTime: string;
  sunriseTime: string;
  sunsetTime: string;
  isPlaying: boolean;
  speed: number;
  onCityChange: (city: City) => void;
  onTimeChange: (time: number) => void;
  onPlayToggle: () => void;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [1, 2, 5, 10];

export default function ControlPanel({
  cities,
  selectedCity,
  currentTime,
  formattedTime,
  sunriseTime,
  sunsetTime,
  isPlaying,
  speed,
  onCityChange,
  onTimeChange,
  onPlayToggle,
  onSpeedChange
}: ControlPanelProps) {
  return (
    <div className="control-panel">
      <div className="panel-title">城市晨昏线模拟器</div>

      <div className="control-group">
        <label className="control-label">选择城市</label>
        <select
          className="city-select"
          value={selectedCity.nameEn}
          onChange={(e) => {
            const city = cities.find(c => c.nameEn === e.target.value);
            if (city) onCityChange(city);
          }}
        >
          {cities.map(city => (
            <option key={city.nameEn} value={city.nameEn}>
              {city.name} ({city.nameEn})
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label className="control-label">时间控制</label>
        <div className="time-slider-container">
          <input
            type="range"
            className="time-slider"
            min="0"
            max="24"
            step="0.1"
            value={currentTime}
            onChange={(e) => onTimeChange(parseFloat(e.target.value))}
          />
          <div className="time-display">
            <div className="current-time">{formattedTime}</div>
            <div className="sun-times">
              日出 {sunriseTime} / 日落 {sunsetTime}
            </div>
          </div>
        </div>
      </div>

      <div className="control-group">
        <button className="play-button" onClick={onPlayToggle}>
          {isPlaying ? '暂停' : '播放'}
        </button>
      </div>

      <div className="control-group">
        <label className="control-label">播放速度</label>
        <div className="speed-selector">
          {SPEEDS.map(s => (
            <button
              key={s}
              className={`speed-button ${speed === s ? 'active' : ''}`}
              onClick={() => onSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
