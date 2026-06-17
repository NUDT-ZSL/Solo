import { useState, useRef, useEffect, useCallback } from 'react';
import type { Video, Marker } from './types';
import { PRESET_LABELS } from './types';
import './VideoPlayer.css';

interface VideoPlayerProps {
  video: Video;
  markers: Marker[];
  initialTimestamp: number | null;
  onClose: () => void;
  onMarkerAdded: (marker: Marker) => void;
  onMarkerDeleted: (markerId: string) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function VideoPlayer({ video, markers, initialTimestamp, onClose, onMarkerAdded, onMarkerDeleted }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLabelPopup, setShowLabelPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState(0);
  const [customLabel, setCustomLabel] = useState('');
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleLoadedMetadata = () => {
      setDuration(videoEl.duration);
      if (initialTimestamp !== null) {
        videoEl.currentTime = initialTimestamp;
        setCurrentTime(initialTimestamp);
      }
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(videoEl.currentTime);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);

    return () => {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
    };
  }, [initialTimestamp, isDragging]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' && !showLabelPopup) {
        e.preventDefault();
        openLabelPopup();
      }
      if (e.key === 'Escape') {
        if (showLabelPopup) {
          setShowLabelPopup(false);
        } else {
          onClose();
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLabelPopup]);

  const togglePlay = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isPlaying) {
      videoEl.pause();
    } else {
      videoEl.play();
    }
  }, [isPlaying]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const videoEl = videoRef.current;
    const progressEl = progressRef.current;
    if (!videoEl || !progressEl || duration === 0) return;

    const rect = progressEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    videoEl.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);

    const handleMouseMove = (e: MouseEvent) => {
      const progressEl = progressRef.current;
      const videoEl = videoRef.current;
      if (!progressEl || !videoEl || duration === 0) return;

      const rect = progressEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * duration;
      videoEl.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const openLabelPopup = useCallback(() => {
    const progressEl = progressRef.current;
    if (!progressEl || duration === 0) return;

    const percentage = currentTime / duration;
    setPopupPosition(percentage * 100);
    setCustomLabel('');
    setShowLabelPopup(true);
  }, [currentTime, duration]);

  const handleAddMarker = async (label: string, color: string) => {
    try {
      const res = await fetch(`/api/videos/${video.id}/markers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: currentTime,
          label,
          color,
        }),
      });

      if (res.ok) {
        const marker = await res.json();
        onMarkerAdded(marker);
      }
    } catch (err) {
      console.error('添加标记失败:', err);
    }
    setShowLabelPopup(false);
  };

  const handleCustomLabelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customLabel.trim()) {
      handleAddMarker(customLabel.trim(), '#ff5722');
    }
  };

  const handleDeleteMarker = async (markerId: string) => {
    try {
      const res = await fetch(`/api/markers/${markerId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onMarkerDeleted(markerId);
      }
    } catch (err) {
      console.error('删除标记失败:', err);
    }
  };

  const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="player-modal" onClick={e => e.stopPropagation()}>
        <div className="player-header">
          <h2 className="player-title">{video.name}</h2>
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="player-video-container">
          <video
            ref={videoRef}
            src={video.path}
            onClick={togglePlay}
            playsInline
          />
        </div>

        <div className="player-controls">
          <button className="control-button play-pause" onClick={togglePlay}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <div className="progress-wrapper">
            <div
              ref={progressRef}
              className="progress-bar"
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
            >
              <div
                className="progress-fill"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
              {sortedMarkers.map(marker => (
                <div
                  key={marker.id}
                  className="progress-marker"
                  style={{
                    left: `${(marker.timestamp / duration) * 100}%`,
                    backgroundColor: marker.color,
                  }}
                  onMouseEnter={() => setHoveredMarker(marker)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  onDoubleClick={() => handleDeleteMarker(marker.id)}
                  title={`${marker.label} - ${formatTime(marker.timestamp)}`}
                >
                  {hoveredMarker?.id === marker.id && (
                    <div className="marker-tooltip">
                      <span className="marker-tooltip-label" style={{ backgroundColor: marker.color }}>{marker.label}</span>
                      <span className="marker-tooltip-time">{formatTime(marker.timestamp)}</span>
                    </div>
                  )}
                </div>
              ))}
              {showLabelPopup && (
                <div
                  className="label-popup"
                  style={{ left: `${popupPosition}%` }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="label-popup-content">
                    <div className="preset-labels">
                      {PRESET_LABELS.map(preset => (
                        <button
                          key={preset.label}
                          className="preset-label"
                          style={{ backgroundColor: preset.color }}
                          onClick={() => handleAddMarker(preset.label, preset.color)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <form className="custom-label-form" onSubmit={handleCustomLabelSubmit}>
                      <input
                        type="text"
                        value={customLabel}
                        onChange={e => setCustomLabel(e.target.value)}
                        placeholder="或输入自定义标签..."
                        autoFocus
                      />
                      <button type="submit" disabled={!customLabel.trim()}>
                        添加
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="time-display">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="time-separator">/</span>
            <span className="duration">{formatTime(duration)}</span>
          </div>

          <button className="control-button add-marker" onClick={openLabelPopup} title="添加标记 (M)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>添加标记</span>
          </button>
        </div>

        <div className="player-hint">
          快捷键：空格 播放/暂停 · M 添加标记 · ESC 关闭
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
