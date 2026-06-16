import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioAnalyzer } from './AudioAnalyzer';
import VisualizerScene from './VisualizerScene';

const BAR_COUNT = 48;

function App() {
  const [fileName, setFileName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(BAR_COUNT).fill(0));
  const [fps, setFps] = useState<number>(0);
  const [freqLatency, setFreqLatency] = useState<number | null>(null);
  const [showPerf, setShowPerf] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const rafRef = useRef<number | null>(null);
  const perfRafRef = useRef<number | null>(null);
  const lastFreqUpdateRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const freqUpdateTimesRef = useRef<number[]>([]);

  const startLoop = useCallback(() => {
    const loop = (now: number) => {
      if (!analyzerRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const audio = audioRef.current;
      const isAudioPlaying = audio && !audio.paused && audio.duration > 0 && audio.currentTime < audio.duration;

      if (isAudioPlaying && now - lastFreqUpdateRef.current >= 38) {
        const data = analyzerRef.current.getFrequencyDataNormalized(BAR_COUNT);
        setFrequencyData(data);
        freqUpdateTimesRef.current.push(now);
        if (freqUpdateTimesRef.current.length > 10) {
          freqUpdateTimesRef.current.shift();
        }
        lastFreqUpdateRef.current = now;
      }

      if (lastFrameRef.current > 0) {
        const frameTime = now - lastFrameRef.current;
        fpsRef.current = 1000 / frameTime;
      }
      lastFrameRef.current = now;

      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    analyzerRef.current = new AudioAnalyzer({ fftSize: 512 });
    startLoop();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (perfRafRef.current) {
        cancelAnimationFrame(perfRafRef.current);
      }
      if (analyzerRef.current) {
        analyzerRef.current.dispose();
      }
    };
  }, [startLoop]);

  useEffect(() => {
    if (!showPerf) {
      if (perfRafRef.current) {
        cancelAnimationFrame(perfRafRef.current);
        perfRafRef.current = null;
      }
      return;
    }

    const updatePerf = () => {
      setFps(Math.round(fpsRef.current * 10) / 10);

      const audio = audioRef.current;
      const isAudioPlaying = audio && !audio.paused && audio.duration > 0 && audio.currentTime < audio.duration;

      if (!isAudioPlaying) {
        setFreqLatency(null);
        freqUpdateTimesRef.current = [];
      } else {
        const times = freqUpdateTimesRef.current;
        if (times.length >= 3) {
          const intervals: number[] = [];
          for (let i = 1; i < times.length; i++) {
            const interval = times[i] - times[i - 1];
            if (interval > 0 && interval < 200) {
              intervals.push(interval);
            }
          }
          if (intervals.length > 0) {
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            setFreqLatency(Math.round(avgInterval));
          } else {
            setFreqLatency(null);
          }
        } else {
          setFreqLatency(null);
        }
      }

      perfRafRef.current = requestAnimationFrame(updatePerf);
    };

    perfRafRef.current = requestAnimationFrame(updatePerf);

    return () => {
      if (perfRafRef.current) {
        cancelAnimationFrame(perfRafRef.current);
      }
    };
  }, [showPerf]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioRef.current) return;

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
    const validExts = ['.mp3', '.wav'];
    const nameLower = file.name.toLowerCase();
    const isValid =
      validTypes.includes(file.type) || validExts.some((ext) => nameLower.endsWith(ext));

    if (!isValid) {
      alert('请选择 MP3 或 WAV 格式的音频文件');
      return;
    }

    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    audioRef.current.load();

    setFileName(file.name);
    setCurrentTime(0);
    setDuration(0);

    try {
      analyzerRef.current?.connect(audioRef.current);
    } catch (err) {
      console.warn('Audio connect warning:', err);
    }

    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn('Autoplay prevented:', err);
        setIsPlaying(false);
      });
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !audioRef.current.src) return;

    try {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        analyzerRef.current?.connect(audioRef.current);
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.warn('Play error:', err));
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleReplay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (audioRef.current.src) {
      analyzerRef.current?.connect(audioRef.current);
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, ratio * duration));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const formatTime = (t: number): string => {
    if (!isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="app-container">
      <div className="canvas-container">
        <VisualizerScene frequencyData={frequencyData} />
      </div>

      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      />

      <div className="control-panel">
        <div className="panel-header">
          <div className="panel-title">🎵 3D Audio Visualizer</div>
          <label className="file-label" title="选择音频文件">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v16m8-8H4" />
            </svg>
            <span className="desktop-only">上传</span>
            <input
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              className="file-input"
              onChange={handleFileChange}
            />
          </label>
        </div>

        <div className={`file-name ${!fileName ? 'placeholder' : ''}`}>
          {fileName || '请上传 MP3 / WAV 音频文件...'}
        </div>

        <div className="progress-container">
          <div className="progress-info desktop-only">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="progress-bar" onClick={handleProgressClick}>
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="progress-info mobile-only">
            <span className="mobile-file-name">{fileName || '未选择文件'}</span>
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
        </div>

        <div className="controls">
          <button
            className="sec-button"
            onClick={handleReplay}
            disabled={!fileName}
            title="重新播放"
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </button>

          <button
            className="play-button"
            onClick={handlePlayPause}
            disabled={!fileName}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            className="sec-button"
            onClick={() => {
              if (audioRef.current && duration > 0) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
                audioRef.current.pause();
                setIsPlaying(false);
              }
            }}
            disabled={!fileName}
            title="停止"
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="perf-panel" onClick={() => setShowPerf(!showPerf)} title="点击切换性能监控">
        <div className="perf-item">
          <span className="perf-label">FPS</span>
          <span className={`perf-value ${fps >= 30 ? 'ok' : 'warn'}`}>{fps.toFixed(1)}</span>
        </div>
        <div className="perf-item">
          <span className="perf-label">延迟</span>
          <span className={`perf-value ${freqLatency !== null && freqLatency <= 50 ? 'ok' : 'warn'}`}>
            {freqLatency !== null ? `${freqLatency}ms` : '--'}
          </span>
        </div>
      </div>

      <div className="hint">
        🖱️ 左键拖拽旋转视角 · 滚轮缩放 · 上传音乐后开始可视化
      </div>
    </div>
  );
}

export default App;
