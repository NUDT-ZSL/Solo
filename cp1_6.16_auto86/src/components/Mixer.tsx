import React, { useCallback, useRef, useState } from 'react';
import { AudioClip, THEME } from '../types';

interface Props {
  clips: AudioClip[];
  onUpdateClip: (id: string, updates: Partial<AudioClip>) => void;
  onRemoveClip: (id: string) => void;
}

const Mixer: React.FC<Props> = ({ clips, onUpdateClip, onRemoveClip }) => {
  return (
    <div className="mixer-content">
      <div className="mixer-header">
        <span>混音控制台</span>
        <span className="mixer-clip-count">{clips.length} 个片段</span>
      </div>
      <div className="mixer-tracks">
        {clips.length === 0 && (
          <div className="mixer-empty">
            <div className="mixer-empty-icon">🎵</div>
            <span>暂无片段</span>
            <span className="mixer-empty-hint">从左侧片段库添加音频片段</span>
          </div>
        )}
        {clips.map((clip, index) => (
          <MixerTrack
            key={clip.id}
            clip={clip}
            index={index}
            onUpdate={onUpdateClip}
            onRemove={onRemoveClip}
          />
        ))}
      </div>
    </div>
  );
};

interface TrackProps {
  clip: AudioClip;
  index: number;
  onUpdate: (id: string, updates: Partial<AudioClip>) => void;
  onRemove: (id: string) => void;
}

const MixerTrack: React.FC<TrackProps> = ({ clip, index, onUpdate, onRemove }) => {
  return (
    <div className="mixer-track">
      <div className="mixer-track-header">
        <div className="mixer-track-indicator" style={{ background: clip.color }} />
        <span className="mixer-track-name" style={{ color: clip.color }}>
          {clip.name}
        </span>
        <span className="mixer-track-index">#{index + 1}</span>
        <button
          className="mixer-remove-btn"
          onClick={() => onRemove(clip.id)}
          title="删除片段"
        >
          ×
        </button>
      </div>

      <SliderWithBubble
        label="音量"
        value={clip.volume}
        min={0}
        max={100}
        step={1}
        unit="%"
        color={THEME.accent}
        onChange={(val) => onUpdate(clip.id, { volume: val })}
      />

      <SliderWithBubble
        label="淡入"
        value={clip.fadeIn}
        min={0}
        max={5}
        step={0.1}
        unit="s"
        color="#4ECDC4"
        onChange={(val) => onUpdate(clip.id, { fadeIn: Math.round(val * 10) / 10 })}
      />

      <SliderWithBubble
        label="淡出"
        value={clip.fadeOut}
        min={0}
        max={5}
        step={0.1}
        unit="s"
        color="#FFB86C"
        onChange={(val) => onUpdate(clip.id, { fadeOut: Math.round(val * 10) / 10 })}
      />
    </div>
  );
};

interface SliderWithBubbleProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  onChange: (value: number) => void;
}

const SliderWithBubble: React.FC<SliderWithBubbleProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  color,
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const formatValue = () => {
    if (step >= 1) return `${Math.round(value)}${unit}`;
    return `${value.toFixed(1)}${unit}`;
  };

  return (
    <div className="mixer-control">
      <label className="mixer-label">{label}</label>
      <div className="mixer-slider-group">
        <div className="mixer-slider-container">
          <div
            className="mixer-slider-fill"
            style={{
              width: `${percentage}%`,
              background: color,
            }}
          />
          <input
            ref={sliderRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            className="mixer-slider"
            onChange={handleInput}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
          />
          {isDragging && (
            <div
              className="mixer-slider-bubble"
              style={{
                left: `calc(${percentage}% - 22px)`,
                background: color,
              }}
            >
              {formatValue()}
            </div>
          )}
        </div>
        <span
          className={`mixer-value ${isDragging ? 'active' : ''}`}
          style={{ color: isDragging ? color : undefined }}
        >
          {formatValue()}
        </span>
      </div>
    </div>
  );
};

export default Mixer;
