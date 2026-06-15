import { useEffect, useRef, useState, useCallback } from 'react';
import Timeline from './Timeline';
import {
  processImage,
  renderFrame,
  rgbToHex,
  type RGB,
  type Point,
  type Particle,
} from './lightPainting';

export interface LightPainting {
  id: string;
  createdAt: number;
  dateLabel: string;
  primaryColor: RGB;
  controlPoints: Point[];
  particles: Particle[];
}

const STORAGE_KEY = 'light_paintings_v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECORDS = 30;
const CYCLE_MS = 2000;
const CANVAS_W = 800;
const CANVAS_H = 600;

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadPaintings(): LightPainting[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr: LightPainting[] = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    const filtered = arr.filter((p) => now - p.createdAt <= MAX_AGE_MS).slice(0, MAX_RECORDS);
    if (filtered.length !== arr.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
}

function savePaintings(list: LightPainting[]): void {
  try {
    const now = Date.now();
    const trimmed = list
      .filter((p) => now - p.createdAt <= MAX_AGE_MS)
      .slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export default function App() {
  const [paintings, setPaintings] = useState<LightPainting[]>(() => loadPaintings());
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [canvasHover, setCanvasHover] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaybackMode, setIsPlaybackMode] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const playbackStartRef = useRef<number>(0);
  const playbackProgressRef = useRef<number>(0);

  useEffect(() => {
    savePaintings(paintings);
  }, [paintings]);

  const startPlayback = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= paintings.length) return;
    setIsPlaybackMode(true);
    setIsPlaying(true);
    playbackStartRef.current = performance.now();
    playbackProgressRef.current = 0;
    startTimeRef.current = performance.now() - pausedAtRef.current;
  }, [activeIndex, paintings.length]);

  const animate = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      const p = paintings[activeIndex];
      if (!p) {
        ctx.fillStyle = '#13132A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.fillStyle = 'rgba(150, 150, 200, 0.35)';
        ctx.font = '500 18px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = ['点击下方按钮上传照片', '开启你的光影记忆之旅'];
        lines.forEach((text, i) => {
          ctx.fillText(text, canvas.width / 2, canvas.height / 2 + (i - 0.5) * 32);
        });
        ctx.restore();
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      let effectiveElapsed: number;
      let playbackProgress = 0;
      if (isPlaybackMode && isPlaying) {
        const pbElapsed = (now - playbackStartRef.current) * speed;
        playbackProgress = Math.min(pbElapsed / CYCLE_MS, 1);
        playbackProgressRef.current = playbackProgress;
        if (playbackProgress >= 1) {
          setIsPlaybackMode(false);
          setIsPlaying(false);
          pausedAtRef.current = 0;
        }
      }
      if (isPlaying) {
        effectiveElapsed = (now - startTimeRef.current) * speed;
      } else {
        effectiveElapsed = pausedAtRef.current;
      }
      const cycleProgress = isPlaybackMode
        ? playbackProgress
        : ((effectiveElapsed % CYCLE_MS) + CYCLE_MS) % CYCLE_MS / CYCLE_MS;
      renderFrame({
        ctx,
        width: canvas.width,
        height: canvas.height,
        primaryColor: p.primaryColor,
        controlPoints: p.controlPoints,
        particles: p.particles,
        cycleProgress,
        playbackProgress,
        isPlaybackMode,
      });
      rafRef.current = requestAnimationFrame(animate);
    },
    [paintings, activeIndex, isPlaying, speed, isPlaybackMode]
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  const togglePlay = () => {
    if (activeIndex < 0) return;
    if (isPlaybackMode) {
      if (isPlaying) {
        const now = performance.now();
        pausedAtRef.current = now - startTimeRef.current;
        setIsPlaying(false);
      } else {
        const now = performance.now();
        startTimeRef.current = now - pausedAtRef.current;
        playbackStartRef.current = now - (playbackProgressRef.current * CYCLE_MS) / speed;
        setIsPlaying(true);
      }
    } else {
      if (isPlaying) {
        const now = performance.now();
        pausedAtRef.current = (now - startTimeRef.current) * speed;
        setIsPlaying(false);
      } else {
        const now = performance.now();
        startTimeRef.current = now - pausedAtRef.current / speed;
        setIsPlaying(true);
      }
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (!/^image\/(jpeg|png|jpg)$/i.test(file.type)) {
      setError('仅支持 JPG / PNG 格式图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }
    setIsProcessing(true);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = url;
      });
      const off = document.createElement('canvas');
      off.width = img.naturalWidth;
      off.height = img.naturalHeight;
      const offCtx = off.getContext('2d')!;
      offCtx.drawImage(img, 0, 0);
      const imgData = offCtx.getImageData(0, 0, off.width, off.height);
      URL.revokeObjectURL(url);
      const result = await processImage(imgData);
      const newPainting: LightPainting = {
        id: uuid(),
        createdAt: Date.now(),
        dateLabel: formatDateLabel(Date.now()),
        primaryColor: result.primaryColor,
        controlPoints: result.controlPoints,
        particles: result.particles,
      };
      setPaintings((prev) => {
        const next = [newPainting, ...prev];
        return next.slice(0, MAX_RECORDS);
      });
      setActiveIndex(0);
      setIsPlaying(true);
      setIsPlaybackMode(true);
      playbackProgressRef.current = 0;
      playbackStartRef.current = performance.now();
      startTimeRef.current = performance.now();
      pausedAtRef.current = 0;
    } catch (e) {
      setError(e instanceof Error ? e.message : '处理图片时出错');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    setIsPlaybackMode(true);
    setIsPlaying(true);
    playbackStartRef.current = performance.now();
    startTimeRef.current = performance.now();
    pausedAtRef.current = 0;
    playbackProgressRef.current = 0;
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (isPlaybackMode && isPlaying) {
      const now = performance.now();
      const remainingMs = (1 - playbackProgressRef.current) * CYCLE_MS / speed;
      playbackStartRef.current = now - (playbackProgressRef.current * CYCLE_MS) / v;
    }
    if (isPlaying) {
      const now = performance.now();
      pausedAtRef.current = (now - startTimeRef.current) * speed;
      startTimeRef.current = now - pausedAtRef.current / v;
    }
    setSpeed(v);
  };

  const activePainting = activeIndex >= 0 ? paintings[activeIndex] : null;

  return (
    <div className="app-root">
      <div className="app-container">
        <header className="app-header">
          <div className="title-wrap">
            <h1 className="app-title">光影沙盘</h1>
            <p className="app-subtitle">· 每 日 光 画 ·</p>
          </div>
          <p className="app-desc">捕捉日常光影，让每张照片化作流动的抽象之河</p>
        </header>

        <section className="upload-section">
          <button
            className={`upload-btn ${isProcessing ? 'loading' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <><span className="spinner" />提取光影特征中...</>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                上传今日照片
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <span className="upload-hint">JPG / PNG · 最大 5MB</span>
          {error && <div className="error-msg">{error}</div>}
        </section>

        <section className="canvas-section">
          <div className={`canvas-wrapper ${canvasHover ? 'hover' : ''}`}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="main-canvas"
              onMouseEnter={() => setCanvasHover(true)}
              onMouseLeave={() => setCanvasHover(false)}
            />
            {activePainting && (
              <div className="canvas-meta">
                <span className="meta-dot" style={{ backgroundColor: rgbToHex(activePainting.primaryColor) }} />
                <span className="meta-label">{activePainting.dateLabel}</span>
              </div>
            )}
          </div>

          <div className="control-bar">
            <button
              className={`ctrl-btn play-btn ${activeIndex < 0 ? 'disabled' : ''}`}
              onClick={togglePlay}
              disabled={activeIndex < 0}
            >
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 4v16l13-8z" />
                </svg>
              )}
              <span>{isPlaying ? '暂停' : '播放'}</span>
            </button>
            <button
              className={`ctrl-btn replay-btn ${activeIndex < 0 ? 'disabled' : ''}`}
              onClick={startPlayback}
              disabled={activeIndex < 0}
              title="重新播放一次"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              <span>重放</span>
            </button>
            <div className="speed-control">
              <span className="speed-label">速度</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speed}
                onChange={handleSpeedChange}
                className="speed-slider"
              />
              <span className="speed-value">{speed.toFixed(1)}x</span>
            </div>
            <div className="status-info">
              {activeIndex >= 0 && paintings[activeIndex]
                ? `第 ${activeIndex + 1} / ${paintings.length} 幅 · ${isPlaybackMode ? '回放模式' : isPlaying ? '循环流动' : '已暂停'}`
                : '等待上传...'}
            </div>
          </div>
        </section>

        <section className="timeline-section">
          <Timeline paintings={paintings} activeIndex={activeIndex} onSelect={handleSelect} />
        </section>

        <footer className="app-footer">
          <span>✨ 所有光画自动保存于本地浏览器 · 保留最近 30 天</span>
        </footer>
      </div>
    </div>
  );
}
