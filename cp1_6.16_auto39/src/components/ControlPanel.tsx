import type { StandardBeatPattern } from '../utils/beatEngine';
import '../components/ControlPanel.css';

interface ControlPanelProps {
  patterns: StandardBeatPattern[];
  selectedPattern: string;
  bpm: number;
  sensitivity: number;
  inputMode: 'manual' | 'recording';
  isRecording: boolean;
  hasStarted: boolean;
  onPatternChange: (patternId: string) => void;
  onBpmChange: (bpm: number) => void;
  onSensitivityChange: (sensitivity: number) => void;
  onInputModeChange: (mode: 'manual' | 'recording') => void;
  onStartStop: () => void;
  onManualBeat: (e?: React.MouseEvent) => void;
  onReset: () => void;
  onPlay: () => void;
  canPlay: boolean;
  isPlaying: boolean;
  pulseAnimations: { id: number; x: number; y: number }[];
}

function ControlPanel({
  patterns,
  selectedPattern,
  bpm,
  sensitivity,
  inputMode,
  isRecording,
  hasStarted,
  onPatternChange,
  onBpmChange,
  onSensitivityChange,
  onInputModeChange,
  onStartStop,
  onManualBeat,
  onReset,
  onPlay,
  canPlay,
  isPlaying,
  pulseAnimations,
}: ControlPanelProps) {
  return (
    <div className="control-panel">
      <h2 className="panel-title">控制面板</h2>

      <div className="control-section">
        <label className="control-label">节拍模式</label>
        <select
          className="control-select"
          value={selectedPattern}
          onChange={(e) => onPatternChange(e.target.value)}
        >
          {patterns.map((pattern) => (
            <option key={pattern.id} value={pattern.id}>
              {pattern.name}
            </option>
          ))}
        </select>
      </div>

      <div className="control-section">
        <label className="control-label">
          速度 (BPM): <span className="value-display">{bpm}</span>
        </label>
        <input
          type="range"
          className="control-slider"
          min="40"
          max="200"
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
        />
        <div className="slider-labels">
          <span>40</span>
          <span>120</span>
          <span>200</span>
        </div>
      </div>

      <div className="control-section">
        <label className="control-label">输入模式</label>
        <div className="mode-toggle">
          <button
            className={`mode-btn ${inputMode === 'manual' ? 'active' : ''}`}
            onClick={() => onInputModeChange('manual')}
          >
            手动点击
          </button>
          <button
            className={`mode-btn ${inputMode === 'recording' ? 'active' : ''}`}
            onClick={() => onInputModeChange('recording')}
          >
            自动录音
          </button>
        </div>
      </div>

      {inputMode === 'recording' && (
        <div className="control-section">
          <label className="control-label">
            检测灵敏度: <span className="value-display">{sensitivity}%</span>
          </label>
          <input
            type="range"
            className="control-slider"
            min="10"
            max="100"
            value={sensitivity}
            onChange={(e) => onSensitivityChange(Number(e.target.value))}
          />
          <div className="slider-labels">
            <span>低</span>
            <span>中</span>
            <span>高</span>
          </div>
        </div>
      )}

      <div className="control-section">
        <div className="action-buttons">
          {inputMode === 'manual' && (
            <button
              className="action-btn primary beat-btn"
              onClick={onManualBeat}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className="beat-icon">🥁</span>
              点击打拍
              {pulseAnimations.map((pulse) => (
                <span
                  key={pulse.id}
                  className="pulse-ring"
                  style={{ left: pulse.x, top: pulse.y }}
                ></span>
              ))}
            </button>
          )}

          <button
            className={`action-btn ${isRecording ? 'danger' : 'primary'}`}
            onClick={onStartStop}
          >
            {inputMode === 'manual'
              ? hasStarted
                ? '完成录入'
                : '开始练习'
              : isRecording
              ? '停止录音'
              : '开始录音'}
          </button>

          <button
            className="action-btn secondary"
            onClick={onPlay}
            disabled={!canPlay || isPlaying}
          >
            {isPlaying ? '播放中...' : '播放对比'}
          </button>

          <button className="action-btn secondary" onClick={onReset}>
            重置
          </button>
        </div>
      </div>

      <div className="control-section">
        <div className="legend">
          <h3 className="legend-title">图例说明</h3>
          <div className="legend-item">
            <div className="legend-line standard"></div>
            <span>标准节拍 (蓝色实线)</span>
          </div>
          <div className="legend-item">
            <div className="legend-line user"></div>
            <span>用户节拍 (红色虚线)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot"></div>
            <span>当前播放进度</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
