import { useEffect, useRef, useState } from 'react';
import type { Bottle, Emotion } from '../utils/api';

interface OceanProps {
  bottles: Bottle[];
  onBottleClick: (bottle: Bottle) => void;
  newlyCreatedId: string | null;
}

const EMOTION_COLORS: Record<Emotion, string> = {
  happy: '#FFD93D',
  sad: '#9B59B6',
  calm: '#3498DB',
  wild: '#FF6B35',
};

interface BottleRender {
  id: string;
  bottle: Bottle;
  baseX: number;
  baseY: number;
  phase: number;
  phaseSpeed: number;
  driftSpeedX: number;
  driftAmpX: number;
  driftAmpY: number;
  currentX: number;
  currentY: number;
  rotPhase: number;
  rotAmp: number;
  isNew: boolean;
  birthTime: number;
}

const MAX_BOTTLES = 100;
const DISPLAY_COUNT = 20;

export default function Ocean({ bottles, onBottleClick, newlyCreatedId }: OceanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const bottleCanvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const rendersRef = useRef<Map<string, BottleRender>>(new Map());
  const bubblesRef = useRef<
    Array<{ x: number; y: number; vy: number; r: number; alpha: number; life: number; maxLife: number }>
  >([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerSize = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 初始化或更新瓶子渲染数据
  useEffect(() => {
    const displayBottles = bottles.slice(0, DISPLAY_COUNT);
    const existing = rendersRef.current;
    const newMap = new Map<string, BottleRender>();
    const W = containerSize.current.w || window.innerWidth;
    const H = containerSize.current.h || window.innerHeight;
    const oceanTop = isMobile ? H - 180 : H * 0.5;

    displayBottles.forEach((b, idx) => {
      if (existing.has(b.id)) {
        const r = existing.get(b.id)!;
        if (b.id === newlyCreatedId) {
          r.isNew = true;
          r.birthTime = performance.now();
        }
        newMap.set(b.id, r);
      } else {
        const colCount = 5;
        const rowCount = 4;
        const col = idx % colCount;
        const row = Math.floor(idx / colCount);
        const marginX = W * 0.08;
        const usableW = W - marginX * 2;
        const spacingX = usableW / (colCount - 1 || 1);
        const oceanH = H - oceanTop;
        const spacingY = (oceanH * 0.7) / (rowCount - 1 || 1);

        newMap.set(b.id, {
          id: b.id,
          bottle: b,
          baseX: marginX + col * spacingX + (Math.random() - 0.5) * 30,
          baseY: oceanTop + 30 + row * spacingY + (Math.random() - 0.5) * 20,
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: 0.0008 + Math.random() * 0.0006,
          driftSpeedX: 0.0003 + Math.random() * 0.0004,
          driftAmpX: 15 + Math.random() * 25,
          driftAmpY: 6 + Math.random() * 10,
          currentX: 0,
          currentY: 0,
          rotPhase: Math.random() * Math.PI * 2,
          rotAmp: 0.05 + Math.random() * 0.08,
          isNew: b.id === newlyCreatedId,
          birthTime: b.id === newlyCreatedId ? performance.now() : 0,
        });
      }
    });

    rendersRef.current = newMap;
  }, [bottles, newlyCreatedId, isMobile]);

  // 主渲染循环
  useEffect(() => {
    const setupCanvas = () => {
      const container = containerRef.current;
      if (!container) return;
      const dpr = window.devicePixelRatio || 1;
      const W = container.clientWidth;
      const H = container.clientHeight;
      containerSize.current = { w: W, h: H };
      [waveCanvasRef, bottleCanvasRef, bubbleCanvasRef].forEach((ref) => {
        const c = ref.current;
        if (!c) return;
        c.width = W * dpr;
        c.height = H * dpr;
        c.style.width = `${W}px`;
        c.style.height = `${H}px`;
        const ctx = c.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    };

    setupCanvas();
    const onResize = () => {
      setupCanvas();
    };
    window.addEventListener('resize', onResize);

    const WAVES = [
      { amp: 22, freq: 0.008, speed: 0.0015, offset: 0, color: '#0d2847' },
      { amp: 18, freq: 0.011, speed: 0.002, offset: 1.2, color: '#123557' },
      { amp: 14, freq: 0.014, speed: 0.0025, offset: 2.5, color: '#174268' },
      { amp: 10, freq: 0.018, speed: 0.003, offset: 3.8, color: '#1d4f7a' },
      { amp: 7, freq: 0.022, speed: 0.0035, offset: 5.0, color: '#225c8b' },
    ];

    const drawWaves = (W: number, H: number, time: number) => {
      const ctx = waveCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const oceanTop = isMobile ? H - 180 : H * 0.5;

      // 天空到海洋的渐变底色
      const bgGrad = ctx.createLinearGradient(0, oceanTop - 100, 0, H);
      bgGrad.addColorStop(0, 'rgba(10, 22, 40, 0.9)');
      bgGrad.addColorStop(0.3, '#0a1f3a');
      bgGrad.addColorStop(0.6, '#0f344f');
      bgGrad.addColorStop(1, '#1a4a3f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, oceanTop - 60, W, H - oceanTop + 60);

      // 多层波浪
      WAVES.forEach((w, i) => {
        ctx.beginPath();
        ctx.moveTo(0, H);
        const baseY = oceanTop + i * 15;
        for (let x = 0; x <= W; x += 2) {
          let y = 0;
          // 正弦波叠加
          y += Math.sin(x * w.freq + time * w.speed + w.offset) * w.amp;
          y += Math.sin(x * w.freq * 1.7 + time * w.speed * 1.3 + w.offset * 0.7) * w.amp * 0.4;
          y += Math.sin(x * w.freq * 0.5 + time * w.speed * 0.8) * w.amp * 0.5;
          ctx.lineTo(x, baseY + y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - 30, 0, H);
        const alpha = 0.35 + (i / WAVES.length) * 0.5;
        grad.addColorStop(0, hexToRgba(w.color, alpha));
        grad.addColorStop(1, hexToRgba('#0a1f15', 0.95));
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // 波浪高光
      WAVES.slice(0, 3).forEach((w, i) => {
        ctx.beginPath();
        const baseY = oceanTop + i * 15;
        for (let x = 0; x <= W; x += 3) {
          let y = 0;
          y += Math.sin(x * w.freq + time * w.speed + w.offset) * w.amp;
          y += Math.sin(x * w.freq * 1.7 + time * w.speed * 1.3 + w.offset * 0.7) * w.amp * 0.4;
          y += Math.sin(x * w.freq * 0.5 + time * w.speed * 0.8) * w.amp * 0.5;
          if (x === 0) ctx.moveTo(x, baseY + y - 1);
          else ctx.lineTo(x, baseY + y - 1);
        }
        ctx.strokeStyle = `rgba(150, 220, 255, ${0.12 - i * 0.03})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 月亮倒影
      const moonX = W * 0.85;
      const moonReflectTop = oceanTop + 10;
      const moonGrad = ctx.createLinearGradient(moonX - 40, moonReflectTop, moonX + 40, H);
      moonGrad.addColorStop(0, 'rgba(255, 251, 230, 0.25)');
      moonGrad.addColorStop(0.5, 'rgba(255, 251, 230, 0.08)');
      moonGrad.addColorStop(1, 'rgba(255, 251, 230, 0)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      const shimmer = Math.sin(time * 0.003) * 8;
      for (let x = -60; x <= 60; x += 2) {
        const t = (x + 60) / 120;
        const ripple = Math.sin(x * 0.1 + time * 0.005) * 3 + Math.sin(x * 0.25 + time * 0.008) * 1.5;
        const y = moonReflectTop + ripple + t * (H - moonReflectTop) * 0.8 + shimmer * t;
        const w = 18 * (1 - t) * (1 - Math.abs(x) / 60) + 2;
        ctx.ellipse(moonX + x * 0.5, y, Math.max(0, w), 1.5, 0, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    const drawBottles = (W: number, H: number, time: number) => {
      const ctx = bottleCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      rendersRef.current.forEach((r) => {
        // 计算弹性入场
        let entryScale = 1;
        let entryOffset = 0;
        if (r.isNew) {
          const elapsed = time - r.birthTime;
          const DURATION = 500;
          if (elapsed < DURATION) {
            const t = elapsed / DURATION;
            // 弹簧效果
            const s = spring(t);
            entryScale = 0.3 + s * 0.7;
            entryOffset = (1 - s) * (H - r.baseY + 100);

            // 生成气泡
            if (t > 0.4 && Math.random() < 0.3) {
              spawnBubbles(r.baseX, r.baseY + entryOffset, EMOTION_COLORS[r.bottle.emotion]);
            }
          } else {
            r.isNew = false;
          }
        }

        // 随波漂移：贝塞尔式缓动
        r.phase += r.phaseSpeed * 16;
        r.rotPhase += 0.002 * 16;

        const driftX =
          Math.sin(r.phase * 1.1) * r.driftAmpX +
          Math.sin(r.phase * 0.7 + r.id.charCodeAt(0)) * r.driftAmpX * 0.4;
        const driftY =
          Math.sin(r.phase * 0.9 + 1.2) * r.driftAmpY +
          Math.sin(r.phase * 1.3) * r.driftAmpY * 0.5;

        const x = r.baseX + driftX;
        const y = r.baseY + driftY + entryOffset;
        const rot = Math.sin(r.rotPhase) * r.rotAmp + Math.sin(r.phase * 0.5) * 0.03;
        r.currentX = x;
        r.currentY = y;

        const isHovered = hoveredId === r.id;
        const scale = entryScale * (isHovered ? 1.2 : 1);

        const color = EMOTION_COLORS[r.bottle.emotion];

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(scale, scale);

        // 脉动发光
        const pulsePhase = (time * 0.002 + r.phase) % (Math.PI * 2);
        const pulse = 0.5 + 0.5 * Math.sin(pulsePhase);
        const glowSize = 35 + pulse * 15;
        const glowAlpha = 0.15 + pulse * 0.2;

        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        glow.addColorStop(0, hexToRgba(color, glowAlpha + 0.1));
        glow.addColorStop(0.5, hexToRgba(color, glowAlpha * 0.5));
        glow.addColorStop(1, hexToRgba(color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // 瓶身（半圆形）
        const bottleW = 38;
        const bottleH = 44;

        // 瓶身阴影
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        // 瓶身主体 - 半圆 + 矩形
        ctx.beginPath();
        ctx.moveTo(-bottleW / 2, 0);
        ctx.quadraticCurveTo(-bottleW / 2 - 2, bottleH * 0.1, -bottleW / 2, bottleH * 0.2);
        ctx.lineTo(-bottleW / 2, bottleH * 0.6);
        ctx.quadraticCurveTo(-bottleW / 2, bottleH, 0, bottleH);
        ctx.quadraticCurveTo(bottleW / 2, bottleH, bottleW / 2, bottleH * 0.6);
        ctx.lineTo(bottleW / 2, bottleH * 0.2);
        ctx.quadraticCurveTo(bottleW / 2 + 2, bottleH * 0.1, bottleW / 2, 0);
        ctx.closePath();

        const bodyGrad = ctx.createLinearGradient(-bottleW / 2, 0, bottleW / 2, bottleH);
        bodyGrad.addColorStop(0, hexToRgba(color, 0.35));
        bodyGrad.addColorStop(0.3, hexToRgba(color, 0.2));
        bodyGrad.addColorStop(1, hexToRgba(color, 0.08));
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.restore();

        // 瓶身边框
        ctx.strokeStyle = hexToRgba(color, 0.7 + pulse * 0.3);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 瓶颈
        ctx.beginPath();
        const neckW = 14;
        const neckH = 12;
        ctx.moveTo(-neckW / 2, 0);
        ctx.lineTo(-neckW / 2 - 2, -neckH);
        ctx.quadraticCurveTo(-neckW / 2 - 2, -neckH - 4, -neckW / 2, -neckH - 2);
        ctx.lineTo(neckW / 2, -neckH - 2);
        ctx.quadraticCurveTo(neckW / 2 + 2, -neckH - 4, neckW / 2 + 2, -neckH);
        ctx.lineTo(neckW / 2, 0);
        ctx.closePath();

        const neckGrad = ctx.createLinearGradient(0, -neckH - 4, 0, 0);
        neckGrad.addColorStop(0, hexToRgba(color, 0.25));
        neckGrad.addColorStop(1, hexToRgba(color, 0.4));
        ctx.fillStyle = neckGrad;
        ctx.fill();
        ctx.strokeStyle = hexToRgba(color, 0.7);
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // 瓶塞
        ctx.beginPath();
        const corkW = neckW + 4;
        const corkH = 8;
        ctx.roundRect
          ? ctx.roundRect(-corkW / 2, -neckH - corkH - 2, corkW, corkH, 2)
          : ctx.rect(-corkW / 2, -neckH - corkH - 2, corkW, corkH);
        const corkGrad = ctx.createLinearGradient(0, -neckH - corkH - 2, 0, -neckH - 2);
        corkGrad.addColorStop(0, '#8B6F47');
        corkGrad.addColorStop(1, '#5D4A32');
        ctx.fillStyle = corkGrad;
        ctx.fill();
        ctx.strokeStyle = '#3d2f1e';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 高光
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(-bottleW / 2 + 6, bottleH * 0.15);
        ctx.quadraticCurveTo(-bottleW / 2 + 4, bottleH * 0.4, -bottleW / 2 + 7, bottleH * 0.65);
        ctx.stroke();

        // 瓶内小光点
        const innerDotAlpha = 0.5 + 0.3 * Math.sin(time * 0.004 + r.phase * 2);
        ctx.beginPath();
        ctx.fillStyle = hexToRgba(color, innerDotAlpha);
        ctx.arc(3, bottleH * 0.35, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = hexToRgba('#ffffff', innerDotAlpha * 0.8);
        ctx.arc(-5, bottleH * 0.55, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    };

    const drawBubbles = (W: number, H: number, _time: number) => {
      const ctx = bubbleCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      bubblesRef.current = bubblesRef.current.filter((b) => {
        b.y += b.vy;
        b.life -= 1;
        b.vy *= 0.98;
        const alpha = Math.max(0, (b.life / b.maxLife) * b.alpha);
        if (alpha <= 0) return false;

        ctx.beginPath();
        ctx.fillStyle = `rgba(180, 230, 255, ${alpha})`;
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = `rgba(220, 245, 255, ${alpha * 0.7})`;
        ctx.lineWidth = 0.5;
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        return true;
      });
    };

    const loop = (t: number) => {
      timeRef.current = t;
      const { w: W, h: H } = containerSize.current;
      if (W > 0 && H > 0) {
        drawWaves(W, H, t);
        drawBottles(W, H, t);
        drawBubbles(W, H, t);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [isMobile, hoveredId]);

  const spawnBubbles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 3; i++) {
      bubblesRef.current.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 20,
        vy: -0.8 - Math.random() * 1.5,
        r: 1.5 + Math.random() * 3,
        alpha: 0.4 + Math.random() * 0.4,
        life: 60 + Math.random() * 40,
        maxLife: 100,
      });
      color;
    }
    if (bubblesRef.current.length > 200) {
      bubblesRef.current.splice(0, 50);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = bottleCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: string | null = null;
    rendersRef.current.forEach((r) => {
      const dx = mx - r.currentX;
      const dy = my - r.currentY;
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        found = r.id;
      }
    });

    if (found !== hoveredId) {
      setHoveredId(found);
    }
    if (found) {
      setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHoverPos(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = bottleCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    rendersRef.current.forEach((r) => {
      const dx = mx - r.currentX;
      const dy = my - r.currentY;
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        onBottleClick(r.bottle);
      }
    });
  };

  const hoveredBottle = hoveredId ? rendersRef.current.get(hoveredId) : null;

  // 手机端布局：垂直滚动列表
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 230,
            flexShrink: 0,
          }}
        >
          <canvas
            ref={waveCanvasRef}
            className="ocean-wave-canvas"
            style={{
              position: 'absolute',
              inset: 0,
              height: '150px !important',
            }}
          />
          <canvas
            ref={bottleCanvasRef}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          />
          <canvas ref={bubbleCanvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'linear-gradient(180deg, rgba(15, 40, 60, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
          }}
        >
          {bottles.slice(0, MAX_BOTTLES).map((b, i) => {
            const color = EMOTION_COLORS[b.emotion];
            return (
              <div
                key={b.id}
                onClick={() => onBottleClick(b)}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  borderLeft: `4px solid ${color}`,
                  background: `linear-gradient(135deg, rgba(42, 58, 90, 0.85), rgba(26, 42, 74, 0.85))`,
                  boxShadow: `0 4px 20px ${color}22`,
                  animation: `fadeIn 0.3s ease ${Math.min(i, 20) * 0.03}s both`,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    color: '#e0f0ff',
                    fontSize: 15,
                    lineHeight: 1.6,
                    marginBottom: 10,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {b.content}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 10,
                      border: `1px solid ${color}`,
                      color,
                      fontSize: 12,
                      boxShadow: `0 0 10px ${color}44`,
                    }}
                  >
                    {
                      { happy: '开心', sad: '忧郁', calm: '平静', wild: '狂想' }[b.emotion]
                    }
                  </span>
                  <span style={{ color: '#8ab4d8', fontSize: 12 }}>
                    🍾 接力 {b.relays.length}
                  </span>
                </div>
              </div>
            );
          })}
          {bottles.length === 0 && (
            <div style={{ color: '#8ab4d8', textAlign: 'center', padding: 40 }}>
              🌊 海面上还没有漂流瓶，点击右下角投放第一个吧！
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, cursor: hoveredId ? 'pointer' : 'default' }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      <canvas ref={waveCanvasRef} style={{ position: 'absolute', inset: 0 }} />
      <canvas
        ref={bottleCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
        }}
      />
      <canvas ref={bubbleCanvasRef} style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none' }} />

      {/* 悬浮预览 */}
      {hoveredBottle && hoverPos && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hoverPos.x + 20, (containerSize.current.w || window.innerWidth) - 260),
            top: Math.min(hoverPos.y - 70, (containerSize.current.h || window.innerHeight) - 100),
            zIndex: 20,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(10, 22, 40, 0.92)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${EMOTION_COLORS[hoveredBottle.bottle.emotion]}66`,
            maxWidth: 240,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            style={{
              color: '#e0f0ff',
              fontSize: 13,
              lineHeight: 1.5,
              marginBottom: 6,
            }}
          >
            {hoveredBottle.bottle.content.slice(0, 20)}
            {hoveredBottle.bottle.content.length > 20 ? '...' : ''}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '1px 7px',
                borderRadius: 8,
                border: `1px solid ${EMOTION_COLORS[hoveredBottle.bottle.emotion]}`,
                color: EMOTION_COLORS[hoveredBottle.bottle.emotion],
                fontSize: 10,
              }}
            >
              {{ happy: '开心', sad: '忧郁', calm: '平静', wild: '狂想' }[hoveredBottle.bottle.emotion]}
            </span>
            <span style={{ color: '#8ab4d8', fontSize: 11 }}>接力 {hoveredBottle.bottle.relays.length}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function spring(t: number): number {
  // 弹性效果: overshoot + settle
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    t -= 1.5 / 2.75;
    return 7.5625 * t * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    t -= 2.25 / 2.75;
    return 7.5625 * t * t + 0.9375;
  } else {
    t -= 2.625 / 2.75;
    return 7.5625 * t * t + 0.984375;
  }
  void c2;
}
