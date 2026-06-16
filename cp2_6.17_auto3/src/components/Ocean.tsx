import React, { useEffect, useRef, useCallback } from 'react';
import type { Bottle } from '../api';
import type { SortMode } from '../App';

interface FloatingBottle {
  bottle: Bottle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}

interface OceanProps {
  bottles: Bottle[];
  onBottleClick: (bottle: Bottle) => void;
  onBottlePick: (bottle: Bottle) => void;
  sortMode: SortMode;
}

const WARM_COLORS = ['#f97316', '#ef4444', '#eab308', '#f59e0b', '#fb923c', '#dc2626'];
const MAX_BOTTLES = 50;

function getColorForBottle(bottle: Bottle): string {
  return bottle.color || WARM_COLORS[Math.abs(hashCode(bottle.id)) % WARM_COLORS.length];
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

const Ocean: React.FC<OceanProps> = ({ bottles, onBottleClick, onBottlePick, sortMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floatingRef = useRef<FloatingBottle[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const hoverRef = useRef<string | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const sortModeRef = useRef(sortMode);
  const prevSortModeRef = useRef<SortMode>(sortMode);

  useEffect(() => {
    sortModeRef.current = sortMode;
  }, [sortMode]);

  const syncFloats = useCallback((latestBottles: Bottle[]) => {
    const current = floatingRef.current;
    const mode = sortModeRef.current;
    const switched = prevSortModeRef.current !== mode;

    if (switched) {
      prevSortModeRef.current = mode;
      if (mode === 'random') {
        for (const f of current) {
          f.x = Math.random() * 0.9 + 0.05;
          f.y = Math.random() * 0.3 + 0.35;
          f.vx = (Math.random() - 0.5) * 0.0003;
          f.vy = (Math.random() - 0.5) * 0.0001;
        }
      }
    }

    const currentIds = new Set(current.map((f) => f.bottle.id));
    const sortedBottles = mode === 'hot'
      ? [...latestBottles].sort((a, b) => {
          if (b.likes !== a.likes) return b.likes - a.likes;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }).slice(0, MAX_BOTTLES)
      : latestBottles.slice(0, MAX_BOTTLES);

    const newBottles = sortedBottles.filter((b) => !currentIds.has(b.id));
    for (const b of newBottles) {
      if (current.length >= MAX_BOTTLES) break;
      current.push({
        bottle: b,
        x: Math.random() * 0.9 + 0.05,
        y: Math.random() * 0.3 + 0.35,
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0001,
        phase: Math.random() * Math.PI * 2,
      });
    }

    for (const f of current) {
      const fresh = sortedBottles.find((b) => b.id === f.bottle.id);
      if (fresh) f.bottle = fresh;
    }

    const newIds = new Set(sortedBottles.map((b) => b.id));
    floatingRef.current = current.filter((f) => newIds.has(f.bottle.id));

    if (mode === 'hot') {
      const orderMap = new Map(sortedBottles.map((b, i) => [b.id, i]));
      const total = Math.min(sortedBottles.length, MAX_BOTTLES);
      const cols = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(total * 1.6))));
      const rows = Math.ceil(total / cols);
      const startX = 0.08;
      const endX = 0.92;
      const startY = 0.35;
      const endY = 0.65;
      for (const f of floatingRef.current) {
        const idx = orderMap.get(f.bottle.id);
        if (idx !== undefined && idx < total) {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const tx = total === 1 ? 0.5 : startX + (endX - startX) * (col / (cols - 1));
          const ty = rows === 1 ? 0.5 : startY + (endY - startY) * (row / (rows - 1));
          f.x += (tx - f.x) * 0.12;
          f.y += (ty - f.y) * 0.12;
          f.vx = 0;
          f.vy = 0;
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const tooltip = tooltipRef.current!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const drawWave = (
      t: number,
      baseY: number,
      amplitude: number,
      frequency: number,
      speed: number,
      color: string
    ) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) {
        const y =
          baseY +
          amplitude * Math.sin((x / w) * Math.PI * 2 * frequency + t * speed) +
          amplitude * 0.5 * Math.sin((x / w) * Math.PI * 4 * frequency + t * speed * 1.3);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const drawHeart = (cx: number, cy: number, size: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.25);
      ctx.bezierCurveTo(cx, cy - size * 0.75, cx - size, cy - size * 0.85, cx - size, cy - size * 0.25);
      ctx.bezierCurveTo(cx - size, cy + size * 0.25, cx - size * 0.4, cy + size * 0.6, cx, cy + size);
      ctx.bezierCurveTo(cx + size * 0.4, cy + size * 0.6, cx + size, cy + size * 0.25, cx + size, cy - size * 0.25);
      ctx.bezierCurveTo(cx + size, cy - size * 0.85, cx, cy - size * 0.75, cx, cy - size * 0.25);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    };

    const drawBottle = (
      x: number,
      y: number,
      color: string,
      hovered: boolean,
      scale: number,
      likes: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      const s = hovered ? scale * 1.2 : scale;
      ctx.scale(s, s);

      ctx.beginPath();
      ctx.moveTo(-4, -16);
      ctx.lineTo(-4, -12);
      ctx.lineTo(-12, -8);
      ctx.quadraticCurveTo(-14, 0, -12, 8);
      ctx.lineTo(-10, 14);
      ctx.quadraticCurveTo(0, 18, 10, 14);
      ctx.lineTo(12, 8);
      ctx.quadraticCurveTo(14, 0, 12, -8);
      ctx.lineTo(4, -12);
      ctx.lineTo(4, -16);
      ctx.quadraticCurveTo(0, -18, -4, -16);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.88;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-3, -2, 2, 5, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();

      drawHeart(13, 15, 4);

      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = 2.5;
      ctx.strokeText(String(likes), 19, 15);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(likes), 19, 15);

      ctx.restore();
    };

    const drawLightSpots = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      for (let i = 0; i < 8; i++) {
        const lx = ((Math.sin(t * 0.2 + i * 1.7) + 1) / 2) * w;
        const ly = h * 0.4 + Math.sin(t * 0.3 + i * 2.1) * h * 0.15;
        const radius = 30 + Math.sin(t * 0.5 + i) * 15;
        const gradient = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(lx - radius, ly - radius, radius * 2, radius * 2);
      }
    };

    let lastTime = performance.now();
    const fpsInterval = 1000 / 35;
    let elapsed = 0;
    let frameCount = 0;
    let latestBottlesSnapshot: Bottle[] = bottles;

    const animate = (now: number) => {
      frameCount++;
      const delta = now - lastTime;
      lastTime = now;
      elapsed += delta;

      if (elapsed < fpsInterval) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }
      elapsed -= fpsInterval;

      const w = canvas.width;
      const h = canvas.height;
      timeRef.current += 1 / 60;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#0c4a6e');
      skyGrad.addColorStop(1, '#1e6a9e');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      const waveConfigs = [
        { baseY: h * 0.38, amp: 12, freq: 1.5, speed: Math.PI, color: 'rgba(14, 74, 110, 0.6)' },
        { baseY: h * 0.42, amp: 10, freq: 2, speed: Math.PI * 1.2, color: 'rgba(14, 116, 144, 0.5)' },
        { baseY: h * 0.46, amp: 8, freq: 2.5, speed: Math.PI * 1.4, color: 'rgba(8, 145, 178, 0.5)' },
        { baseY: h * 0.52, amp: 6, freq: 3, speed: Math.PI * 1.6, color: 'rgba(6, 182, 212, 0.4)' },
        { baseY: h * 0.58, amp: 5, freq: 3.5, speed: Math.PI * 1.8, color: 'rgba(34, 211, 238, 0.3)' },
      ];

      for (const wc of waveConfigs) {
        drawWave(t, wc.baseY, wc.amp, wc.freq, wc.speed, wc.color);
      }

      const deepGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
      deepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
      deepGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = deepGrad;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);

      drawLightSpots(t);

      syncFloats(latestBottlesSnapshot);
      const floats = floatingRef.current;
      const mode = sortModeRef.current;
      let hoveredId: string | null = null;

      if (mouseRef.current) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        for (const f of floats) {
          const bx = f.x * w;
          const by = f.y * h;
          if (Math.abs(mx - bx) < 30 && Math.abs(my - by) < 32) {
            hoveredId = f.bottle.id;
            break;
          }
        }
      }

      hoverRef.current = hoveredId;

      for (const f of floats) {
        if (mode === 'random') {
          f.x += f.vx;
          f.y += f.vy;
          if (f.x < 0.05 || f.x > 0.95) f.vx *= -1;
          if (f.y < 0.32 || f.y > 0.63) f.vy *= -1;
          f.x = Math.max(0.05, Math.min(0.95, f.x));
          f.y = Math.max(0.32, Math.min(0.63, f.y));
        }

        const bx = f.x * w;
        const bobY = mode === 'random' ? Math.sin(t * Math.PI + f.phase) * 6 : Math.sin(t * Math.PI * 0.5 + f.phase) * 3;
        const by = f.y * h + bobY;
        const color = getColorForBottle(f.bottle);
        const hovered = f.bottle.id === hoveredId;
        drawBottle(bx, by, color, hovered, 1.6, f.bottle.likes || 0);

        if (hovered) {
          tooltip.style.display = 'block';
          tooltip.style.left = `${Math.min(bx + 28, window.innerWidth - 200)}px`;
          tooltip.style.top = `${Math.max(by - 24, 10)}px`;
          tooltip.textContent = f.bottle.title;
        }
      }

      if (!hoveredId) {
        tooltip.style.display = 'none';
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    const refreshInterval = setInterval(() => {
      latestBottlesSnapshot = bottles;
    }, 200);

    const updateSnapshot = (val: Bottle[]) => {
      latestBottlesSnapshot = val;
    };
    (window as any).__updateBottlesSnapshot = updateSnapshot;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e: MouseEvent) => {
      const mx = e.clientX;
      const my = e.clientY;
      for (const f of floatingRef.current) {
        const bx = f.x * canvas.width;
        const by = f.y * canvas.height;
        if (Math.abs(mx - bx) < 30 && Math.abs(my - by) < 32) {
          onBottleClick(f.bottle);
          onBottlePick(f.bottle);
          break;
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(refreshInterval);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [bottles, onBottleClick, onBottlePick, syncFloats]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'pointer',
        }}
      />
      <div
        ref={tooltipRef}
        style={{
          display: 'none',
          position: 'absolute',
          color: '#ffffff',
          fontSize: '13px',
          padding: '4px 10px',
          borderRadius: '6px',
          background: 'rgba(0,0,0,0.45)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          transition: 'opacity 0.2s',
          zIndex: 10,
        }}
      />
    </div>
  );
};

export default Ocean;
