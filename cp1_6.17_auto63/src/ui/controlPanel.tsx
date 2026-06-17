import React, { useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useStarStore } from '@/store/useStarStore';
import { MAX_AGE, formatAge } from '@/data/starData';

const MASS_OPTIONS = [0.5, 1, 4, 10, 25];

const TIME_MARKERS = [
  { value: 0, label: '0' },
  { value: MAX_AGE * 0.25, label: '35亿年' },
  { value: MAX_AGE * 0.5, label: '70亿年' },
  { value: MAX_AGE * 0.75, label: '105亿年' },
  { value: MAX_AGE, label: '140亿年' },
];

interface ControlPanelProps {
  onMassChange: (mass: number) => void;
  onTimeChange: (time: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onMassChange, onTimeChange }) => {
  const {
    currentMass,
    currentTime,
    isPlaying,
    setCurrentMass,
    setCurrentTime,
    setIsPlaying,
  } = useStarStore();

  const handleMassClick = useCallback((mass: number) => {
    setCurrentMass(mass);
    setIsPlaying(false);
    onMassChange(mass);
  }, [setCurrentMass, setIsPlaying, onMassChange]);

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    onTimeChange(time);
  }, [setCurrentTime, onTimeChange]);

  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const resetTime = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    onTimeChange(0);
  }, [setCurrentTime, setIsPlaying, onTimeChange]);

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h2 className="section-title">恒星质量</h2>
        <div className="mass-buttons">
          {MASS_OPTIONS.map((mass) => (
            <button
              key={mass}
              className={`mass-btn ${currentMass === mass ? 'active' : ''}`}
              onClick={() => handleMassClick(mass)}
            >
              {mass}
              <span className="mass-value">M☉</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h2 className="section-title">演化时间</h2>
        <div className="slider-container">
          <div className="slider-label">
            <span>当前时间</span>
            <span className="value">{formatAge(currentTime)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={MAX_AGE}
            step={MAX_AGE / 1000}
            value={currentTime}
            onChange={handleTimeChange}
          />
          <div className="time-markers">
            {TIME_MARKERS.map((marker) => (
              <span key={marker.value}>{marker.label}</span>
            ))}
          </div>
        </div>

        <div className="playback-controls">
          <button className="play-btn" onClick={togglePlay}>
            {isPlaying ? (
              <><Pause size={18} /> 暂停</>
            ) : (
              <><Play size={18} /> 播放</>
            )}
          </button>
          <button className="reset-btn" onClick={resetTime} title="重置">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h2 className="section-title">使用说明</h2>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
          点击恒星可查看更多对比数据。拖拽场景可旋转视角。
        </p>
      </div>
    </div>
  );
};
