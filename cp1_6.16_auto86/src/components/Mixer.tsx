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
      </div>
      <div className="mixer-tracks">
        {clips.length === 0 && (
          <div className="mixer-empty">暂无片段</div>
        )}
        {clips.map((clip) => (
          <MixerTrack
            key={clip.id}
            clip={clip}
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
  onUpdate: (id: string, updates: Partial<AudioClip>) => void;
  onRemove: (id: string) => void;
}

const MixerTrack: React.FC<TrackProps> = ({ clip, onUpdate, onRemove }) => {
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedUpdate = useCallback((field: string, value: number) => {
    if (debounceTimers.current[field]) {
      clearTimeout(debounceTimers.current[field]);
    }
    debounceTimers.current[field] = setTimeout(() => {
      onUpdate(clip.id, { [field]: value });
    }, 100);
  }, [clip.id, onUpdate]);

  return (
    <div className="mixer-track">
      <div className="mixer-track-header">
        <span className="mixer-track-name" style={{ color: clip.color }}>
          {clip.name}
        </span>
        <button className="mixer-remove-btn" onClick={() => onRemove(clip.id)}>×</button>
      </div>
      <div className="mixer-control">
        <label className="mixer-label">音量</label>
        <div className="mixer-slider-group">
          <input
            type="range"
            min="0"
            max="100"
            value={clip.volume}
            className="mixer-slider volume-slider"
            onChange={(e) => {
              const val = Number(e.target.value);
              onUpdate(clip.id, { volume: val });
            }}
          />
          <span className="mixer-value">{clip.volume}%</span>
        </div>
      </div>
      <div className="mixer-control">
        <label className="mixer-label">淡入</label>
        <div className="mixer-slider-group">
          <input
            type="range"
            min="0"
            max="50"
            value={Math.round(clip.fadeIn * 10)}
            className="mixer-slider fade-slider"
            onChange={(e) => {
              const val = Number(e.target.value) / 10;
              onUpdate(clip.id, { fadeIn: val });
            }}
          />
          <span className="mixer-value">{clip.fadeIn.toFixed(1)}s</span>
        </div>
      </div>
      <div className="mixer-control">
        <label className="mixer-label">淡出</label>
        <div className="mixer-slider-group">
          <input
            type="range"
            min="0"
            max="50"
            value={Math.round(clip.fadeOut * 10)}
            className="mixer-slider fade-slider"
            onChange={(e) => {
              const val = Number(e.target.value) / 10;
              onUpdate(clip.id, { fadeOut: val });
            }}
          />
          <span className="mixer-value">{clip.fadeOut.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
};

export default Mixer;
