import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioAnalyzer } from '../audio/AudioAnalyzer';
import { ParticleBloom } from '../visual/ParticleBloom';
import { eventBus } from '../utils/eventBus';
import './App.css';

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const bloomRef = useRef<ParticleBloom | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const [fileName, setFileName] = useState<string>('');
  const [loadProgress, setLoadProgress] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.7);
  const [flowerDensity, setFlowerDensity] = useState<number>(80);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!containerRef.current) return;

    analyzerRef.current = new AudioAnalyzer();
    bloomRef.current = new ParticleBloom(containerRef.current);

    const handleFileName = (name: string) => setFileName(name);
    const handleLoadProgress = (p: number) => setLoadProgress(p);
    const handleLoaded = (data: { duration: number; fileName: string }) => {
      setDuration(data.duration);
      setIsLoading(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleTimeUpdate = (t: number, d: number) => {
      setCurrentTime(t);
      setDuration(d);
    };

    eventBus.on('audio:fileName', handleFileName);
    eventBus.on('audio:loadProgress', handleLoadProgress);
    eventBus.on('audio:loaded', handleLoaded);
    eventBus.on('audio:play', handlePlay);
    eventBus.on('audio:pause', handlePause);
    eventBus.on('audio:ended', handleEnded);
    eventBus.on('audio:timeupdate', handleTimeUpdate);

    return () => {
      eventBus.off('audio:fileName', handleFileName);
      eventBus.off('audio:loadProgress', handleLoadProgress);
      eventBus.off('audio:loaded', handleLoaded);
      eventBus.off('audio:play', handlePlay);
      eventBus.off('audio:pause', handlePause);
      eventBus.off('audio:ended', handleEnded);
      eventBus.off('audio:timeupdate', handleTimeUpdate);
      analyzerRef.current?.destroy();
      bloomRef.current?.destroy();
    };
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setIsLoading(true);
    setLoadProgress(0);
    try {
      await analyzerRef.current?.loadFile(file);
    } catch (err: any) {
      setError(err.message || '加载音频失败');
      setIsLoading(false);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleTogglePlay = useCallback(() => {
    analyzerRef.current?.togglePlay();
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    analyzerRef.current?.setVolume(v);
  }, []);

  const handleDensityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const d = parseInt(e.target.value);
    setFlowerDensity(d);
    bloomRef.current?.setFlowerDensity(d);
  }, []);

  const calculateTimeFromEvent = useCallback((clientX: number): number | null => {
    if (!progressRef.current || duration <= 0) return null;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  const performSeek = useCallback((time: number) => {
    if (!isFinite(time) || time < 0) return;
    setCurrentTime(time);
    analyzerRef.current?.seek(time);
  }, []);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const time = calculateTimeFromEvent(e.clientX);
    if (time !== null) {
      isDraggingRef.current = true;
      performSeek(time);
    }
  }, [calculateTimeFromEvent, performSeek]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const time = calculateTimeFromEvent(e.clientX);
        if (time !== null) {
          performSeek(time);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [calculateTimeFromEvent, performSeek]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="app-container">
      <div ref={containerRef} className="scene-container" />

      <div className="top-bar">
        <div className="file-name">{fileName || '请选择音频文件开始体验'}</div>
        <div
          className="progress-container"
          ref={progressRef}
          onMouseDown={handleProgressMouseDown}
        >
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
          <div className="progress-time">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="control-panel">
        <button
          className="upload-btn"
          onClick={handleUploadClick}
          title="上传音频"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>

        <button
          className="play-btn"
          onClick={handleTogglePlay}
          disabled={!fileName}
          style={{
            background: isPlaying ? '#00ff88' : '#ff6b6b',
            boxShadow: isPlaying
              ? '0 0 20px rgba(0, 255, 136, 0.5)'
              : '0 0 20px rgba(255, 107, 107, 0.5)'
          }}
        >
          {isPlaying ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        <div className="slider-group">
          <div className="slider-label">音量</div>
          <div className="vertical-slider-wrapper">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="vertical-slider volume-slider"
              style={{
                background: `linear-gradient(to top, #ff69b4 ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
              }}
            />
          </div>
          <div className="slider-value">{Math.round(volume * 100)}%</div>
        </div>

        <div className="slider-group">
          <div className="slider-label">花密度</div>
          <div className="vertical-slider-wrapper">
            <input
              type="range"
              min="30"
              max="200"
              step="1"
              value={flowerDensity}
              onChange={handleDensityChange}
              className="vertical-slider density-slider"
              style={{
                background: `linear-gradient(to top, #c71585 ${((flowerDensity - 30) / 170) * 100}%, rgba(255,255,255,0.1) ${((flowerDensity - 30) / 170) * 100}%)`
              }}
            />
          </div>
          <div className="slider-value">{flowerDensity}</div>
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <div className="loading-text">加载中... {loadProgress}%</div>
            <div className="loading-bar">
              <div
                className="loading-bar-fill"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast">{error}</div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        onChange={handleFileSelect}
        className="file-input"
      />
    </div>
  );
}
