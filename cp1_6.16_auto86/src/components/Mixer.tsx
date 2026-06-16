import React, { useCallback, useRef, useState, useEffect } from 'react';
import { AudioClip, THEME } from '../types';
import { PreviewPlayer } from '../engine/PreviewPlayer';

interface Props {
  clips: AudioClip[];
  onUpdateClip: (id: string, updates: Partial<AudioClip>) => void;
  onRemoveClip: (id: string) => void;
}

const Mixer: React.FC<Props> = ({ clips, onUpdateClip, onRemoveClip }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const playerRef = useRef<PreviewPlayer | null>(null);
  const lastPausePosRef = useRef<number>(0);

  const totalDuration = clips.length > 0
    ? Math.max(...clips.map((c) => c.startTime + (c.trimEnd - c.trimStart)))
    : 0;

  useEffect(() => {
    playerRef.current = new PreviewPlayer({
      onTimeUpdate: (t) => {
        if (!isSeeking) setCurrentTime(t);
      },
      onPlaybackEnd: () => {
        setIsPlaying(false);
        setCurrentTime(0);
        lastPausePosRef.current = 0;
      },
    });

    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (playerRef.current && isPlaying) {
      clips.forEach((clip) => {
        playerRef.current!.updateClipVolume(clip.id, clip.volume);
      });
    }
  }, [clips, isPlaying]);

  const handleTrackVolumeChange = useCallback((clipId: string, volume: number) => {
    onUpdateClip(clipId, { volume });
    if (playerRef.current && isPlaying) {
      playerRef.current.updateClipVolume(clipId, volume);
    }
  }, [onUpdateClip, isPlaying]);

  const handleTrackFadeInChange = useCallback((clipId: string, fadeIn: number) => {
    onUpdateClip(clipId, { fadeIn });
    if (playerRef.current && isPlaying) {
      playerRef.current.updateClipFadeIn(clipId, fadeIn);
    }
  }, [onUpdateClip, isPlaying]);

  const handleTrackFadeOutChange = useCallback((clipId: string, fadeOut: number) => {
    onUpdateClip(clipId, { fadeOut });
    if (playerRef.current && isPlaying) {
      playerRef.current.updateClipFadeOut(clipId, fadeOut);
    }
  }, [onUpdateClip, isPlaying]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || clips.length === 0) return;

    if (isPlaying) {
      lastPausePosRef.current = playerRef.current.pause();
      setIsPlaying(false);
    } else {
      const startPos = lastPausePosRef.current >= totalDuration ? 0 : lastPausePosRef.current;
      playerRef.current.play(clips, startPos);
      setIsPlaying(true);
    }
  }, [isPlaying, clips, totalDuration]);

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
  }, []);

  const handleSeekEnd = useCallback(() => {
    if (!playerRef.current) {
      setIsSeeking(false);
      return;
    }
    const seekTime = currentTime;
    lastPausePosRef.current = seekTime;
    if (isPlaying) {
      playerRef.current.play(clips, seekTime);
    } else {
      setCurrentTime(seekTime);
    }
    setIsSeeking(false);
  }, [currentTime, isPlaying, clips]);

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="mixer-content">
      <div className="mixer-header">
        <span>混音控制台</span>
        <span className="mixer-clip-count">{clips.length} 个片段</span>
      </div>

      <div className="mixer-preview">
        <div className="mixer-preview-header">
          <span className="mixer-preview-title">预览播放</span>
        </div>
        <div className="mixer-preview-controls">
          <button
            className={`mixer-preview-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
            disabled={clips.length === 0}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="mixer-preview-progress-container">
            <div
              className="mixer-preview-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
            <input
              type="range"
              min="0"
              max={Math.max(totalDuration, 0.01)}
              step="0.01"
              value={currentTime}
              className="mixer-preview-slider"
              onMouseDown={handleSeekStart}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchStart={handleSeekStart}
              onTouchEnd={handleSeekEnd}
              disabled={clips.length === 0}
            />
          </div>
          <span className="mixer-preview-time">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>
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
            onUpdateVolume={handleTrackVolumeChange}
            onUpdateFadeIn={handleTrackFadeInChange}
            onUpdateFadeOut={handleTrackFadeOutChange}
            onRemove={onRemoveClip}
            isPlaying={isPlaying}
          />
        ))}
      </div>
    </div>
  );
};

interface TrackProps {
  clip: AudioClip;
  index: number;
  onUpdateVolume: (id: string, volume: number) => void;
  onUpdateFadeIn: (id: string, fadeIn: number) => void;
  onUpdateFadeOut: (id: string, fadeOut: number) => void;
  onRemove: (id: string) => void;
  isPlaying: boolean;
}

const MixerTrack: React.FC<TrackProps> = ({ clip, index, onUpdateVolume, onUpdateFadeIn, onUpdateFadeOut, onRemove, isPlaying }) => {
  return (
    <div className={`mixer-track ${isPlaying ? 'playing' : ''}`}>
      <div className="mixer-track-header">
        <div className="mixer-track-indicator" style={{ background: clip.color }} />
        <span className="mixer-track-name" style={{ color: clip.color }}>
          {clip.name}
        </span>
        {isPlaying && <span className="mixer-track-playing-indicator">♪</span>}
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
        onChange={(val) => onUpdateVolume(clip.id, val)}
      />

      <SliderWithBubble
        label="淡入"
        value={clip.fadeIn}
        min={0}
        max={5}
        step={0.1}
        unit="s"
        color="#4ECDC4"
        onChange={(val) => onUpdateFadeIn(clip.id, Math.round(val * 10) / 10)}
      />

      <SliderWithBubble
        label="淡出"
        value={clip.fadeOut}
        min={0}
        max={5}
        step={0.1}
        unit="s"
        color="#FFB86C"
        onChange={(val) => onUpdateFadeOut(clip.id, Math.round(val * 10) / 10)}
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
