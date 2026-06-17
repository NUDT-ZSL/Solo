import { useRef, useState, useEffect, useCallback } from 'react';
import type { Video, Marker } from './types';
import { PRESET_TAGS, formatTimestamp } from './types';

interface VideoPlayerProps {
  video: Video;
  initialTime?: number;
  markers: Marker[];
  onClose: () => void;
  onMarkerAdded: (marker: Marker) => void;
  onDurationLoaded: (videoId: string, duration: number) => void;
}

function VideoPlayer({
  video,
  initialTime,
  markers,
  onClose,
  onMarkerAdded,
  onDurationLoaded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null);
  const [volume, setVolume] = useState(1);
  const animationRef = useRef<number>();

  const animate = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      setCurrentTime(videoRef.current.currentTime);
    }
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  useEffect(() => {
    if (initialTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = initialTime;
      setCurrentTime(initialTime);
    }
  }, [initialTime]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'm' || e.key === 'M') {
        openTagPopup();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      onDurationLoaded(video.id, dur);
      if (initialTime !== undefined) {
        videoRef.current.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const openTagPopup = () => {
    const timestamp = videoRef.current ? videoRef.current.currentTime : currentTime;
    setPendingTimestamp(timestamp);
    setCustomTagInput('');
    setShowTagPopup(true);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleAddMarker = async (label: string, color: string) => {
    if (pendingTimestamp === null) return;
    try {
      const res = await fetch('/api/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          timestamp: pendingTimestamp,
          label,
          color,
          thumbnail: '',
        }),
      });
      if (res.ok) {
        const marker: Marker = await res.json();
        onMarkerAdded(marker);
      }
    } catch (err) {
      console.error('Failed to add marker:', err);
    }
    setShowTagPopup(false);
    setPendingTimestamp(null);
  };

  const handleCustomTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTagInput.trim()) {
      handleAddMarker(customTagInput.trim(), '#ff5722');
    }
  };

  const getMarkerPosition = (timestamp: number): number => {
    if (duration === 0) return 0;
    return (timestamp / duration) * 100;
  };

  const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
      className="video-player-modal-backdrop"
    >
      <div
        className="video-player-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '640px',
          height: '360px',
          backgroundColor: '#1e1e1e',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
        }}
      >
        <video
          ref={videoRef}
          src={video.path}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000',
          }}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            padding: '12px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: '#fff', fontWeight: 500, maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {video.originalName}
          </p>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            padding: '12px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          }}
        >
          <div
            ref={progressBarRef}
            onClick={handleProgressBarClick}
            style={{
              position: 'relative',
              height: '30px',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '18px',
                left: 0,
                right: 0,
                height: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: duration ? `${(currentTime / duration) * 100}%` : 0,
                  backgroundColor: '#ff5722',
                  borderRadius: '3px',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>

            {sortedMarkers.map((marker) => (
              <div
                key={marker.id}
                style={{
                  position: 'absolute',
                  left: `${getMarkerPosition(marker.timestamp)}%`,
                  top: '0',
                  bottom: '0',
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                }}
                onMouseEnter={() => setHoveredMarker(marker)}
                onMouseLeave={() => setHoveredMarker(null)}
              >
                <div
                  style={{
                    width: '3px',
                    height: '30px',
                    backgroundColor: marker.color,
                    borderRadius: '2px',
                  }}
                />
                {hoveredMarker?.id === marker.id && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      fontSize: '12px',
                      color: '#fff',
                      marginBottom: '4px',
                      pointerEvents: 'none',
                      border: `1px solid ${marker.color}`,
                    }}
                  >
                    <div style={{ fontWeight: 500, color: marker.color, marginBottom: '2px' }}>
                      {marker.label}
                    </div>
                    <div style={{ color: '#aaa' }}>{formatTimestamp(marker.timestamp)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={togglePlay}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#ff5722',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="white"
                    style={{ marginLeft: '1px' }}
                  >
                    <polygon points="6,3 20,12 6,21" />
                  </svg>
                )}
              </button>

              <div style={{ fontSize: '13px', color: '#fff', minWidth: '110px' }}>
                {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#aaa">
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" />
                  <path d="M19.07,4.93a10,10 0 0,1 0,14.14M15.54,8.46a5,5 0 0,1 0,7.07" stroke="#aaa" strokeWidth="2" fill="none" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    setVolume(vol);
                    if (videoRef.current) videoRef.current.volume = vol;
                  }}
                  style={{ width: '60px', accentColor: '#ff5722' }}
                />
              </div>
            </div>

            <button
              onClick={() => openTagPopup()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff5722',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12,5 L12,19 M5,12 L19,12" strokeLinecap="round" />
              </svg>
              添加标记 (M)
            </button>
          </div>
        </div>
      </div>

      {showTagPopup && pendingTimestamp !== null && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 16px 32px rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            minWidth: '340px',
            border: '1px solid #444',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ fontSize: '16px', color: '#e0e0e0', marginBottom: '16px', fontWeight: 600 }}>
            在 {formatTimestamp(pendingTimestamp)} 添加标签
          </h3>

          <form onSubmit={handleCustomTagSubmit} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="输入自定义标签..."
                autoFocus
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#e0e0e0',
                  fontSize: '13px',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#ff5722',
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                添加
              </button>
            </div>
          </form>

          <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>或选择预设标签：</p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag.name}
                onClick={() => handleAddMarker(tag.name, tag.color)}
                style={{
                  width: '60px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: tag.color,
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  opacity: 0.9,
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.opacity = '0.9';
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setShowTagPopup(false);
              setPendingTimestamp(null);
            }}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '8px',
              backgroundColor: 'transparent',
              border: '1px solid #555',
              color: '#aaa',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
