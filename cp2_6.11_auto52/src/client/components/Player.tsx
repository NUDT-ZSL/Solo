import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, RotateCcw, List } from 'lucide-react';
import * as api from '../api';
import type { FilmRoll } from '../types';

interface PlayerProps {
  link?: string;
}

const TRANSITION_MS = 400;
const DISPLAY_MS = 5000;
const NOISE_DENSITY = 0.3;

function Player({ link: propLink }: PlayerProps) {
  const params = useParams<{ link: string }>();
  const shareLink = propLink || params.link || '';
  const navigate = useNavigate();

  const [roll, setRoll] = useState<FilmRoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgFromRef = useRef<HTMLImageElement | null>(null);
  const imgToRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const transitionStartRef = useRef<number>(0);
  const displayTimerRef = useRef<number | null>(null);
  const progressStartRef = useRef<number>(0);
  const preloadedRef = useRef<Set<string>>(new Set());

  const loadRoll = useCallback(async () => {
    if (!shareLink) return;
    try {
      setLoading(true);
      const data = await api.getRollByShareLink(shareLink);
      setRoll(data);
      // 预加载所有图片
      data.photos.forEach((p) => {
        if (preloadedRef.current.has(p.url)) return;
        const img = new Image();
        img.onload = () => preloadedRef.current.add(p.url);
        img.src = p.url;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [shareLink]);

  useEffect(() => {
    loadRoll();
  }, [loadRoll]);

  // 显示计时器（每张5秒）
  const startDisplayTimer = useCallback(() => {
    if (displayTimerRef.current) {
      window.clearTimeout(displayTimerRef.current);
    }
    progressStartRef.current = performance.now();
    setProgress(0);

    const tickProgress = () => {
      if (hovering || transitioning || !started) {
        rafRef.current = requestAnimationFrame(tickProgress);
        return;
      }
      const elapsed = performance.now() - progressStartRef.current;
      setProgress(Math.min(1, elapsed / DISPLAY_MS));
      if (elapsed >= DISPLAY_MS) {
        goNext();
      } else {
        rafRef.current = requestAnimationFrame(tickProgress);
      }
    };
    rafRef.current = requestAnimationFrame(tickProgress);
  }, [hovering, transitioning, started]);

  const pause = () => {
    // 暂停：进度暂停但不清理
  };
  const resume = () => {
    // 从当前位置恢复
    progressStartRef.current = performance.now() - progress * DISPLAY_MS;
  };

  useEffect(() => {
    if (!roll || !started) return;
    startDisplayTimer();
    return () => {
      if (displayTimerRef.current) window.clearTimeout(displayTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [index, roll, started, startDisplayTimer]);

  // canvas噪点过渡
  const runTransition = useCallback((fromIdx: number, toIdx: number) => {
    if (!roll) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fromPhoto = roll.photos[fromIdx];
    const toPhoto = roll.photos[toIdx];

    const loadImg = (url: string) =>
      new Promise<HTMLImageElement>((resolve) => {
        if (imgFromRef.current && imgFromRef.current.src.endsWith(url)) {
          resolve(imgFromRef.current);
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = url;
      });

    Promise.all([loadImg(fromPhoto.url), loadImg(toPhoto.url)]).then(([imgFrom, imgTo]) => {
      imgFromRef.current = imgFrom;
      imgToRef.current = imgTo;

      // 设置canvas大小匹配容器
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
      const W = canvas.width;
      const H = canvas.height;

      transitionStartRef.current = performance.now();

      const drawImageCover = (img: HTMLImageElement) => {
        if (!img || !img.complete || img.naturalWidth === 0) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, W, H);
          return;
        }
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const scale = Math.max(W / iw, H / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (W - dw) / 2;
        const dy = (H - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      };

      const animate = (time: number) => {
        const t = Math.min(1, (time - transitionStartRef.current) / TRANSITION_MS);

        // 阶段1 (0-0.5): from图淡出为噪点
        // 阶段2 (0.5-1): 噪点淡入到to图
        ctx.clearRect(0, 0, W, H);

        if (t < 0.5) {
          const fadeT = t * 2;
          drawImageCover(imgFrom);
          drawNoise(ctx, W, H, 1 - fadeT);
        } else {
          const fadeT = (t - 0.5) * 2;
          drawImageCover(imgTo);
          drawNoise(ctx, W, H, 1 - fadeT * 0.8);
        }

        // 镜头呼吸感：轻微缩放通过globalAlpha模拟
        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, W, H);
          drawImageCover(imgTo);
          setTransitioning(false);
        }
      };
      setTransitioning(true);
      rafRef.current = requestAnimationFrame(animate);
    });
  }, [roll]);

  // 绘制噪点层（密度 30%，像素大小 1-3px，黑白灰随机）
  const drawNoise = (ctx: CanvasRenderingContext2D, W: number, H: number, opacity: number) => {
    if (opacity <= 0.02) return;
    const totalPixels = Math.floor((W * H) / 4); // 降采样提高性能
    const count = Math.floor(totalPixels * NOISE_DENSITY);
    ctx.save();
    ctx.globalAlpha = opacity;
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * W);
      const y = Math.floor(Math.random() * H);
      const size = 1 + Math.floor(Math.random() * 3); // 1-3px
      const shade = Math.floor(Math.random() * 256);
      // 黑白灰概率混合
      const v = Math.random() < 0.7 ? shade : (shade > 128 ? 255 : 0);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  };

  const goNext = () => {
    if (!roll || transitioning) return;
    const next = index + 1;
    if (next >= roll.photos.length) {
      setEnded(true);
      setStarted(false);
      return;
    }
    const from = index;
    setIndex(next);
    runTransition(from, next);
  };
  const goPrev = () => {
    if (!roll || transitioning) return;
    if (index <= 0) return;
    const next = index - 1;
    const from = index;
    setIndex(next);
    runTransition(from, next);
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    if (transitioning || !roll) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      goPrev();
    } else {
      goNext();
    }
  };

  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startPlayback = () => {
    if (!roll || roll.photos.length === 0) return;
    setEnded(false);
    setIndex(0);
    setStarted(true);
  };

  const replay = () => {
    startPlayback();
  };

  // 初始loading
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="spinner-half" style={{ width: 48, height: 48 }} />
      </div>
    );
  }

  if (!roll || roll.photos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white">
        <p className="text-white/60 mb-4">胶卷不存在或已被删除</p>
        <button className="btn-gold px-6 py-3" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black z-50 select-none"
      onMouseEnter={() => {
        setHovering(true);
        if (!transitioning && started) pause();
      }}
      onMouseLeave={() => {
        setHovering(false);
        if (!transitioning && started) resume();
      }}
      onClick={handleScreenClick}
    >
      {/* canvas 覆盖整屏做噪点过渡 */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* 未开始前的首图展示 */}
      {!started && !ended && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={roll.photos[0].url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onLoad={(e) => {
              const canvas = canvasRef.current;
              if (canvas) {
                const parent = canvas.parentElement;
                if (parent) {
                  canvas.width = parent.clientWidth;
                  canvas.height = parent.clientHeight;
                }
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  const img = e.currentTarget;
                  const iw = img.naturalWidth;
                  const ih = img.naturalHeight;
                  const W = canvas.width;
                  const H = canvas.height;
                  const scale = Math.max(W / iw, H / ih);
                  const dw = iw * scale;
                  const dh = ih * scale;
                  const dx = (W - dw) / 2;
                  const dy = (H - dh) / 2;
                  ctx.drawImage(img, dx, dy, dw, dh);
                }
              }
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              startPlayback();
            }}
            className="absolute bottom-12 btn-gold px-8 py-4 flex items-center gap-2 text-xl"
            style={{ fontSize: 20 }}
          >
            <Play size={24} />
            开始播放
          </button>
        </div>
      )}

      {/* 播放中的便签浮层（右下角） */}
      {started && !transitioning && !ended && (
        <div
          className="absolute rounded-xl"
          style={{
            right: 32,
            bottom: 80,
            width: 220,
            background: 'rgba(255,255,255,0.8)',
            padding: 12,
            maxHeight: '40%',
            overflow: 'hidden',
            animation: 'noteFadeIn 0.4s ease',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 24 }}>{roll.photos[index].emoji || '❤️'}</div>
          {roll.photos[index].note && (
            <p className="mt-1" style={{ color: '#333', fontSize: 14, lineHeight: 1.5 }}>
              {roll.photos[index].note}
            </p>
          )}
        </div>
      )}

      {/* 进度条 & 指示点 */}
      {started && !ended && (
        <>
          <div
            className="absolute left-1/2 -translate-x-1/2 flex gap-2"
            style={{ bottom: 32, pointerEvents: 'none' }}
          >
            {roll.photos.map((_, i) => (
              <div
                key={i}
                className={`dot-indicator rounded-full ${i === index ? 'active' : ''}`}
                style={{
                  width: 8,
                  height: 8,
                  background: i === index ? 'white' : 'rgba(255,255,255,0.3)',
                  transform: i === index ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
          {hovering && (
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded overflow-hidden"
              style={{
                bottom: 56,
                width: '40%',
                height: 4,
                background: 'rgba(255,255,255,0.25)',
              }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: '100%',
                  background: 'white',
                  transition: 'width 0.08s linear',
                }}
              />
            </div>
          )}
          {hovering && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm pointer-events-none">
              鼠标悬停已暂停 · 移开 1 秒后继续播放
            </div>
          )}
        </>
      )}

      {/* 结束画面 */}
      {ended && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="ending-text text-white font-light" style={{ fontSize: 32, opacity: 0.7 }}>
            本卷完
          </div>
          <div className="flex gap-4 mt-8" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={replay}
              className="btn-gold px-6 py-3 flex items-center gap-2"
            >
              <RotateCcw size={20} />
              重新播放
            </button>
            <button
              onClick={() => {
                const r = roll;
                // 通过 id 跳转编辑页做只读展示（这里直接跳编辑页）
                navigate(`/edit/${r.id}`);
              }}
              className="px-6 py-3 rounded-full flex items-center gap-2 text-white"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <List size={20} />
              查看详情
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Player;
export { Player };
