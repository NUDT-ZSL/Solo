import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { Visualizer3D, ThemeName, THEMES } from './visualizer/Visualizer3D';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp3'];

type PlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended';

export default function App({ audioContext }: { audioContext: AudioContext }) {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const visualizerRef = useRef<Visualizer3D | null>(null);
  const rafIdRef = useRef<number>(0);

  const [fileName, setFileName] = useState<string>('');
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [theme, setTheme] = useState<ThemeName>('neon');
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [tooltip, setTooltip] = useState<ThemeName | null>(null);

  const frequencyDataRef = useRef<number[]>(new Array(64).fill(0));

  useEffect(() => {
    const engine = new AudioEngine(audioContext);
    audioEngineRef.current = engine;

    engine.setOnEnded(() => {
      setPlayState('ended');
      setProgress(1);
    });

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      engine.stop();
    };
  }, [audioContext]);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const viz = new Visualizer3D(canvasContainerRef.current);
    visualizerRef.current = viz;
    viz.setTheme(theme);
    return () => {
      viz.dispose();
      visualizerRef.current = null;
    };
  }, []);

  useEffect(() => {
    visualizerRef.current?.setTheme(theme);
  }, [theme]);

  const startRenderLoop = useCallback(() => {
    const loop = () => {
      const engine = audioEngineRef.current;
      const viz = visualizerRef.current;
      if (engine && viz) {
        const data = engine.getFrequencyData();
        frequencyDataRef.current = data;
        viz.updateFrequencyData(data);

        const cur = engine.getCurrentTime();
        const dur = engine.getDuration();
        if (dur > 0) {
          setProgress(cur / dur);
        }
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    startRenderLoop();
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [startRenderLoop]);

  const validateFile = (file: File): boolean => {
    setError('');
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.mp3')) {
      setError('请上传 MP3 格式的音频文件');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('文件大小不能超过 10MB');
      return false;
    }
    return true;
  };

  const handleFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;
    const engine = audioEngineRef.current;
    if (!engine) return;

    setFileName(file.name);
    setPlayState('loading');
    setProgress(0);

    try {
      await engine.loadFile(file);
      setDuration(engine.getDuration());
      engine.play();
      setPlayState('playing');
    } catch (e) {
      console.error(e);
      setError('音频解析失败，请尝试其他文件');
      setPlayState('idle');
    }
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const togglePlay = () => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    if (playState === 'playing') {
      engine.pause();
      setPlayState('paused');
    } else if (playState === 'paused' || playState === 'ended') {
      if (playState === 'ended') {
        engine.stop();
      }
      engine.play();
      setPlayState('playing');
    }
  };

  const formatTime = (s: number): string => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const themeList: { key: ThemeName; label: string; icon: string }[] = [
    { key: 'neon', label: '霓虹', icon: '🌈' },
    { key: 'aurora', label: '极光', icon: '🌌' },
    { key: 'retro', label: '复古', icon: '📻' },
  ];

  const showUploader = playState === 'idle' && !fileName;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0d1a',
        position: 'relative',
        color: '#ffffff',
        overflow: 'hidden',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '10px',
          background: 'rgba(255,255,255,0.05)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: '#00ff88',
            boxShadow: '0 0 10px #00ff88',
            transition: 'width 80ms linear',
          }}
        />
      </div>

      <div
        ref={canvasContainerRef}
        style={{
          position: 'absolute',
          top: '10px',
          left: 0,
          right: 0,
          bottom: '61px',
          overflow: 'hidden',
        }}
      />

      {showUploader && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: 0,
            right: 0,
            bottom: '61px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: dragOver
              ? 'rgba(0,255,136,0.08)'
              : 'rgba(13,13,26,0.75)',
            border: dragOver ? '2px dashed #00ff88' : '2px dashed rgba(255,255,255,0.15)',
            margin: '20px',
            borderRadius: '12px',
            transition: 'all 0.2s',
            cursor: 'pointer',
            zIndex: 20,
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>🎵</div>
            <div style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px', color: '#ffffff' }}>
              {dragOver ? '松开以上传文件' : '上传 MP3 文件开始可视化'}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '16px' }}>
              拖拽文件到此处，或点击选择（最大 10MB）
            </div>
            {error && (
              <div style={{ color: '#ff4d6d', fontSize: '13px', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            <button
              style={{
                background: '#00ff88',
                color: '#0d0d1a',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0,255,136,0.35)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById('file-input')?.click();
              }}
            >
              选择文件
            </button>
          </div>
          <input
            id="file-input"
            type="file"
            accept=".mp3,audio/mpeg,audio/mp3"
            style={{ display: 'none' }}
            onChange={onFileInput}
          />
        </div>
      )}

      {!showUploader && error && (
        <div
          style={{
            position: 'absolute',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,77,109,0.9)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            zIndex: 30,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '60px',
          height: '1px',
          background: '#00ff88',
          opacity: 0.5,
          boxShadow: '0 0 8px #00ff88',
          zIndex: 15,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '60px',
          background: '#ffffff0d',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 15,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
          {!showUploader && (
            <button
              onClick={togglePlay}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: '#00ff88',
                color: '#0d0d1a',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(0,255,136,0.4)',
              }}
              title={playState === 'playing' ? '暂停' : '播放'}
            >
              {playState === 'playing' ? '⏸' : '▶'}
            </button>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '16px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#ffffff',
              }}
              title={fileName}
            >
              {fileName || '未选择文件'}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
              {formatTime(progress * duration)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          {themeList.map((t) => {
            const cfg = THEMES[t.key];
            const active = theme === t.key;
            return (
              <div key={t.key} style={{ position: 'relative' }}>
                <button
                  onClick={() => setTheme(t.key)}
                  onMouseEnter={() => setTooltip(t.key)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: active ? '2px solid #00ff88' : '2px solid rgba(255,255,255,0.2)',
                    background: `linear-gradient(135deg, #${cfg.barBottom.toString(16).padStart(6, '0')} 0%, #${cfg.barTop.toString(16).padStart(6, '0')} 100%)`,
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    transform: active ? 'scale(1.1)' : tooltip === t.key ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: active
                      ? '0 0 16px rgba(0,255,136,0.5)'
                      : tooltip === t.key
                      ? '0 0 12px rgba(255,255,255,0.3)'
                      : 'none',
                  }}
                >
                  <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}>
                    {t.icon}
                  </span>
                </button>
                {tooltip === t.key && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.85)',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 100,
                    }}
                  >
                    {t.label}主题
                  </div>
                )}
              </div>
            );
          })}

          {!showUploader && (
            <button
              onClick={() => document.getElementById('file-input-2')?.click()}
              style={{
                marginLeft: '8px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              title="换一首"
            >
              📁
            </button>
          )}
          <input
            id="file-input-2"
            type="file"
            accept=".mp3,audio/mpeg,audio/mp3"
            style={{ display: 'none' }}
            onChange={onFileInput}
          />
        </div>
      </div>
    </div>
  );
}
