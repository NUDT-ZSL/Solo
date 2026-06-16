import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Tag } from 'lucide-react';
import { useStore, formatTime } from './store';
import type { Video, Marker } from './types';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  const { 
    markers, 
    presetLabels, 
    currentTime, 
    isPlaying,
    setCurrentTime, 
    setIsPlaying,
    hoveredMarker,
    setHoveredMarker,
    createMarker,
    fetchPresetLabels
  } = useStore();

  const [showTagPicker, setShowTagPicker] = useState(false);
  const [pendingTimestamp, setPendingTimestamp] = useState<number>(0);
  const [customLabel, setCustomLabel] = useState('');
  const [duration, setDuration] = useState(0);

  const videoMarkers = markers
    .filter(m => m.videoId === video.id)
    .sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    fetchPresetLabels();
  }, [fetchPresetLabels]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleAddMarker();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        skipBackward();
      } else if (e.key === 'ArrowRight') {
        skipForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, isPlaying]);

  useEffect(() => {
    const updateProgress = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= 33) {
        if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
        }
        lastTimeRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(updateProgress);
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, setCurrentTime]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
    }
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || !videoRef.current || duration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
  };

  const handleAddMarker = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setPendingTimestamp(time);
    setShowTagPicker(true);
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSelectTag = useCallback(async (label: string, color: string) => {
    const thumbnail = await captureThumbnail();
    await createMarker({
      videoId: video.id,
      timestamp: pendingTimestamp,
      label: label || customLabel,
      color,
      thumbnail
    });
    setShowTagPicker(false);
    setCustomLabel('');
  }, [video.id, pendingTimestamp, customLabel, createMarker]);

  const captureThumbnail = async (): Promise<string | undefined> => {
    if (!videoRef.current) return undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.6);
    } catch (e) {
      return undefined;
    }
  };

  const handleMarkerClick = (marker: Marker) => {
    if (videoRef.current) {
      videoRef.current.currentTime = marker.timestamp;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div 
        className="modal-player animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
        >
          <X size={20} />
        </button>

        <video
          ref={videoRef}
          src={video.filePath}
          className="w-full h-full object-contain bg-black"
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <div className="w-20 h-20 rounded-full bg-orange-500/90 flex items-center justify-center">
              <Play size={36} className="text-white ml-1" />
            </div>
          </button>
        )}

        <div
          ref={progressRef}
          className="progress-bar"
          onClick={handleProgressClick}
        >
          <div className="progress-fill" style={{ width: `${progressPercent}%` }}>
            {videoMarkers.map((marker) => {
              const markerPercent = (marker.timestamp / duration) * 100;
              return (
                <div
                  key={marker.id}
                  className="progress-marker"
                  style={{ 
                    left: `${markerPercent}%`,
                    backgroundColor: marker.color
                  }}
                  onMouseEnter={() => setHoveredMarker(marker)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkerClick(marker);
                  }}
                />
              );
            })}
          </div>

          {hoveredMarker && hoveredMarker.videoId === video.id && (
            <div
              className="marker-tooltip"
              style={{ 
                left: `${(hoveredMarker.timestamp / duration) * 100}%`,
                borderLeft: `3px solid ${hoveredMarker.color}`
              }}
            >
              <span style={{ color: hoveredMarker.color }}>{hoveredMarker.label}</span>
              <span className="ml-2 text-gray-400">{formatTime(hoveredMarker.timestamp)}</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={skipBackward}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </button>
            <button
              onClick={skipForward}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            >
              <SkipForward size={18} />
            </button>
            <span className="text-sm text-gray-300 ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={handleAddMarker}
            className="btn-primary flex items-center gap-2"
          >
            <Tag size={16} />
            添加标记 (M)
          </button>
        </div>

        {showTagPicker && (
          <div className="tag-picker animate-slideUp">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">选择标签</h3>
              <span className="text-sm text-gray-400">
                时间: {formatTime(pendingTimestamp)}
              </span>
            </div>
            
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="或输入自定义标签..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:border-orange-500"
            />
            
            <div className="flex flex-wrap gap-2">
              {presetLabels.map((label) => (
                <button
                  key={label.name}
                  className="tag-btn"
                  style={{ backgroundColor: label.color }}
                  onClick={() => handleSelectTag(label.name, label.color)}
                >
                  {label.name}
                </button>
              ))}
            </div>

            {customLabel && (
              <button
                className="btn-primary w-full"
                onClick={() => handleSelectTag(customLabel, '#ff5722')}
              >
                使用自定义标签
              </button>
            )}

            <button
              className="btn-secondary w-full mt-2"
              onClick={() => {
                setShowTagPicker(false);
                setCustomLabel('');
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
