import React, { useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useStarStore } from '@/store/useStarStore';
import { MAX_AGE, formatAge } from '@/data/starData';

const MASS_OPTIONS = [0.5, 1, 4, 10, 25];

const SLIDER_MIN = 0;
const SLIDER_MAX = 1000;
const LOG_SCALE_BASE = 10;
const LOG_MAX_EXPONENT = Math.log10(MAX_AGE + 1);

function sliderValueToTime(sliderVal: number): number {
  const normalized = sliderVal / SLIDER_MAX;
  const logValue = normalized * LOG_MAX_EXPONENT;
  const time = Math.pow(LOG_SCALE_BASE, logValue) - 1;
  return Math.max(0, Math.min(time, MAX_AGE));
}

function timeToSliderValue(time: number): number {
  const clampedTime = Math.max(0, Math.min(time, MAX_AGE));
  const logValue = Math.log10(clampedTime + 1);
  const normalized = logValue / LOG_MAX_EXPONENT;
  return normalized * SLIDER_MAX;
}

const TIME_MARKERS = [
  { time: 0, label: '0' },
  { time: 1e6, label: '1M年' },
  { time: 10e6, label: '10M年' },
  { time: 100e6, label: '100M年' },
  { time: 1e9, label: '10亿年' },
  { time: 10e9, label: '100亿年' },
  { time: MAX_AGE, label: '140亿年' },
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

  const sliderValue = useMemo(() => timeToSliderValue(currentTime), [currentTime]);

  const handleMassClick = useCallback((mass: number) => {
    setCurrentMass(mass);
    setIsPlaying(false);
    onMassChange(mass);
  }, [setCurrentMass, setIsPlaying, onMassChange]);

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderVal = Number(e.target.value);
    const time = sliderValueToTime(sliderVal);
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

  const markerPositions = useMemo(() => {
    return TIME_MARKERS.map(marker => ({
      ...marker,
      position: (timeToSliderValue(marker.time) / SLIDER_MAX) * 100,
    }));
  }, []);

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
          
          <div className="slider-wrapper">
            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={1}
              value={sliderValue}
              onChange={handleTimeChange}
              className="time-slider"
            />
          </div>
          
          <div className="time-markers-log">
            {markerPositions.map((marker) => (
              <span 
                key={marker.time} 
                className="time-marker-item"
                style={{ left: `${marker.position}%` }}
              >
                <span className="marker-tick" />
                <span className="marker-label">{marker.label}</span>
              </span>
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
