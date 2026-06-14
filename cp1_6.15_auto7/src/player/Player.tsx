import React, { useRef, useState, useEffect, useCallback } from 'react';
import TimelineMarkers from './TimelineMarkers';
import type { SummaryItem, Speaker, Bookmark, VideoMetadata } from '../types';
import { formatTime } from '../summary/AISummaryEngine';
import { v4 as uuidv4 } from 'uuid';

interface PlayerProps {
  videoMetadata: VideoMetadata | null;
  summaries: SummaryItem[];
  bookmarks: Bookmark[];
  speakers: Speaker[];
  currentTime: number;
  onVideoLoaded: (metadata: VideoMetadata) => void;
  onTimeUpdate: (time: number) => void;
  onSeek: (time: number) => void;
  onAddBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MAX_FILE_SIZE = 200 * 1024 * 1024;

const Player: React.FC<PlayerProps> = ({
  videoMetadata,
  summaries,
  bookmarks,
  speakers,
  currentTime,
  onVideoLoaded,
  onTimeUpdate,
  onSeek,
  onAddBookmark
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);
  const [bookmarkText, setBookmarkText] = useState('');
  const [bookmarkTime, setBookmarkTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      if (!file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
        setError('请上传 MP4 格式的视频文件');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('视频文件大小不能超过 200MB');
        return;
      }

      const url = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.preload = 'metadata';

      tempVideo.onloadedmetadata = () => {
        onVideoLoaded({
          id: uuidv4(),
          name: file.name,
          duration: tempVideo.duration,
          url,
          size: file.size
        });
        setDuration(tempVideo.duration);
      };

      tempVideo.onerror = () => {
        setError('视频文件加载失败，请尝试其他文件');
        URL.revokeObjectURL(url);
      };
    },
    [onVideoLoaded]
  );

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !isDragging) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  }, [isDragging, onTimeUpdate]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        onSeek(time);
      }
    },
    [onSeek]
  );

  const getProgressTime = useCallback(
    (clientX: number) => {
      if (!progressRef.current || duration <= 0) return 0;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handleProgressClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) {
        const time = getProgressTime(e.clientX);
        setBookmarkTime(time);
        setShowBookmarkInput(true);
        setBookmarkText('');
        return;
      }
      const time = getProgressTime(e.clientX);
      handleSeek(time);
    },
    [getProgressTime, handleSeek]
  );

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) return;
      setIsDragging(true);
      const time = getProgressTime(e.clientX);
      handleSeek(time);
    },
    [getProgressTime, handleSeek]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const time = getProgressTime(e.clientX);
      handleSeek(time);
    },
    [isDragging, getProgressTime, handleSeek]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
    }
    setMuted(value === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !muted;
    videoRef.current.muted = newMuted;
    setMuted(newMuted);
  }, [muted]);

  const handleSpeedChange = useCallback((speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  }, []);

  const handleBookmarkSubmit = useCallback(() => {
    if (bookmarkText.trim()) {
      onAddBookmark({
        timestamp: bookmarkTime,
        text: bookmarkText.trim()
      });
    }
    setShowBookmarkInput(false);
    setBookmarkText('');
  }, [bookmarkText, bookmarkTime, onAddBookmark]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };
    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
    };
  }, [isPlaying]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!videoMetadata) {
    return (
      <div className="player-container upload-state">
        <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
          <div className="upload-icon">🎬</div>
          <h2>上传会议视频</h2>
          <p>支持 MP4 格式，最大 200MB</p>
          <button className="upload-btn">选择视频文件</button>
          {error && <p className="error-text">{error}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,.mp4"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <style>{`
          .player-container {
            width: 100%;
            height: 100%;
            background: #0f0f1e;
            border-radius: 8px;
            border: 2px solid rgba(255,255,255,0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .upload-state {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .upload-area {
            text-align: center;
            padding: 60px 40px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .upload-area:hover {
            transform: scale(1.02);
          }
          .upload-icon {
            font-size: 64px;
            margin-bottom: 16px;
          }
          .upload-area h2 {
            color: #e94560;
            font-size: 24px;
            margin-bottom: 8px;
          }
          .upload-area p {
            color: rgba(255,255,255,0.6);
            margin-bottom: 24px;
          }
          .upload-btn {
            background: #e94560;
            color: #fff;
            border: 2px solid #fff;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .upload-btn:hover {
            transform: scale(1.05);
            background: #d63a54;
          }
          .error-text {
            color: #e94560;
            margin-top: 16px;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="player-container">
      <div className="video-wrapper">
        <video
          ref={videoRef}
          src={videoMetadata.url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
          className="video-element"
        />

        <div
          className={`player-controls ${showControls ? 'visible' : 'hidden'}`}
          onMouseEnter={() => setShowControls(true)}
        >
          <div className="progress-section">
            <TimelineMarkers
              summaries={summaries}
              bookmarks={bookmarks}
              speakers={speakers}
              duration={duration}
              onSeek={handleSeek}
              currentTime={currentTime}
            />

            <div
              className="progress-bar-container"
              ref={progressRef}
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
              title="点击跳转 / Shift+点击添加备注"
            >
              <div className="progress-track">
                <div className="progress-filled" style={{ width: `${progressPercent}%` }} />
                <div
                  className="progress-thumb"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="controls-row">
            <button className="control-btn play-btn" onClick={togglePlay}>
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            <button className="control-btn" onClick={toggleMute}>
              {muted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />

            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="spacer" />

            <div className="speed-container">
              <button
                className="control-btn speed-btn"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="speed-menu">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      className={`speed-option ${playbackRate === speed ? 'active' : ''}`}
                      onClick={() => handleSpeedChange(speed)}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="control-btn bookmark-quick-btn"
              onClick={() => {
                setBookmarkTime(currentTime);
                setShowBookmarkInput(true);
                setBookmarkText('');
              }}
              title="添加备注 (B)"
            >
              📝
            </button>
          </div>
        </div>

        {showBookmarkInput && (
          <div className="bookmark-popup">
            <div className="bookmark-popup-header">
              <span>添加备注 [{formatTime(bookmarkTime)}]</span>
              <button
                className="close-btn"
                onClick={() => setShowBookmarkInput(false)}
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              className="bookmark-input"
              placeholder="输入备注内容..."
              value={bookmarkText}
              onChange={(e) => setBookmarkText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBookmarkSubmit();
                if (e.key === 'Escape') setShowBookmarkInput(false);
              }}
              autoFocus
            />
            <button className="bookmark-submit" onClick={handleBookmarkSubmit}>
              保存备注
            </button>
          </div>
        )}
      </div>

      <style>{`
        .player-container {
          width: 100%;
          height: 100%;
          background: #0f0f1e;
          border-radius: 8px;
          border: 2px solid rgba(255,255,255,0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }
        .video-element {
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
          object-fit: contain;
          cursor: pointer;
        }
        .player-controls {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          padding: 8px 16px 12px;
          transition: opacity 0.3s ease, transform 0.3s ease;
          border-top: 2px solid rgba(255,255,255,0.1);
        }
        .player-controls.hidden {
          opacity: 0;
          transform: translateY(100%);
          pointer-events: none;
        }
        .player-controls.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .progress-section {
          width: 100%;
          margin-bottom: 4px;
        }
        .progress-bar-container {
          width: 100%;
          padding: 8px 0 4px;
          cursor: pointer;
        }
        .progress-track {
          position: relative;
          height: 6px;
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
          transition: height 0.2s;
        }
        .progress-bar-container:hover .progress-track {
          height: 8px;
        }
        .progress-filled {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, #e94560, #ff6b8a);
          border-radius: 3px;
        }
        .progress-thumb {
          position: absolute;
          top: 50%;
          width: 14px;
          height: 14px;
          background: #fff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.2s;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .progress-bar-container:hover .progress-thumb {
          opacity: 1;
        }
        .controls-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .control-btn {
          background: transparent;
          color: #fff;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          min-height: 36px;
        }
        .control-btn:hover {
          transform: scale(1.08);
          border-color: #e94560;
          background: rgba(233, 69, 96, 0.2);
        }
        .play-btn {
          font-size: 18px;
          min-width: 44px;
        }
        .volume-slider {
          width: 80px;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          outline: none;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #e94560;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #fff;
        }
        .time-display {
          color: rgba(255,255,255,0.8);
          font-family: monospace;
          font-size: 13px;
          margin-left: 4px;
        }
        .spacer {
          flex: 1;
        }
        .speed-container {
          position: relative;
        }
        .speed-menu {
          position: absolute;
          bottom: 44px;
          right: 0;
          background: rgba(15, 52, 96, 0.95);
          backdrop-filter: blur(8px);
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          overflow: hidden;
          min-width: 80px;
          z-index: 10;
        }
        .speed-option {
          display: block;
          width: 100%;
          padding: 8px 14px;
          background: transparent;
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 13px;
          text-align: left;
          transition: background 0.15s;
        }
        .speed-option:hover {
          background: rgba(233, 69, 96, 0.3);
        }
        .speed-option.active {
          background: rgba(233, 69, 96, 0.5);
          font-weight: 600;
        }
        .bookmark-popup {
          position: absolute;
          left: 50%;
          bottom: 100px;
          transform: translateX(-50%);
          background: rgba(15, 52, 96, 0.98);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          padding: 14px;
          min-width: 300px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          z-index: 20;
        }
        .bookmark-popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          color: rgba(255,255,255,0.8);
          font-size: 13px;
        }
        .close-btn {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          font-size: 16px;
          padding: 0 4px;
        }
        .close-btn:hover {
          color: #e94560;
        }
        .bookmark-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          outline: none;
          margin-bottom: 10px;
        }
        .bookmark-input:focus {
          border-color: #e94560;
        }
        .bookmark-submit {
          width: 100%;
          background: #e94560;
          color: #fff;
          border: 2px solid #fff;
          border-radius: 8px;
          padding: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .bookmark-submit:hover {
          transform: scale(1.02);
          background: #d63a54;
        }
      `}</style>
    </div>
  );
};

export default Player;
