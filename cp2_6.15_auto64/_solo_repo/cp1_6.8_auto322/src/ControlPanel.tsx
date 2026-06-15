import React, { useState } from 'react';
import { BREATHING_PATTERNS } from './utils/breathingUtils';

interface ControlPanelProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
  durationMultiplier: number;
  onDurationChange: (val: number) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  glassBlurStrength: number;
  onGlassBlurChange: (val: number) => void;
  isRunning: boolean;
  onStartStop: () => void;
  heartRate: number;
  relaxationIndex: number;
  cycleCount: number;
}

export default function ControlPanel({
  currentMode,
  onModeChange,
  durationMultiplier,
  onDurationChange,
  soundEnabled,
  onSoundToggle,
  glassBlurStrength,
  onGlassBlurChange,
  isRunning,
  onStartStop,
  heartRate,
  relaxationIndex,
  cycleCount,
}: ControlPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="control-panel">
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{heartRate}</span>
          <span className="stat-label">估算心率</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{relaxationIndex}</span>
          <span className="stat-label">放松指数</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{cycleCount}</span>
          <span className="stat-label">完成循环</span>
        </div>
      </div>

      <div className="mode-selector">
        {Object.keys(BREATHING_PATTERNS).map((key) => (
          <button
            key={key}
            className={`mode-btn ${currentMode === key ? 'active' : ''}`}
            onClick={() => onModeChange(key)}
            disabled={isRunning}
          >
            {BREATHING_PATTERNS[key].name}
          </button>
        ))}
      </div>

      <div className="action-row">
        <button className={`start-btn ${isRunning ? 'running' : ''}`} onClick={onStartStop}>
          {isRunning ? '停 止' : '开 始'}
        </button>
        <button
          className={`settings-toggle ${settingsOpen ? 'open' : ''}`}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          ⚙
        </button>
      </div>

      <div className={`settings-panel ${settingsOpen ? 'open' : ''}`}>
        <div className="setting-item">
          <label>呼吸周期倍率</label>
          <div className="slider-row">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={durationMultiplier}
              onChange={(e) => onDurationChange(parseFloat(e.target.value))}
            />
            <span className="slider-val">{durationMultiplier.toFixed(1)}x</span>
          </div>
        </div>
        <div className="setting-item">
          <label>提示音</label>
          <div className="toggle-wrap" onClick={onSoundToggle}>
            <div className={`toggle-track ${soundEnabled ? 'on' : ''}`}>
              <div className="toggle-thumb" />
            </div>
          </div>
        </div>
        <div className="setting-item">
          <label>光晕扩散强度</label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={glassBlurStrength}
              onChange={(e) => onGlassBlurChange(parseInt(e.target.value))}
            />
            <span className="slider-val">{glassBlurStrength}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
