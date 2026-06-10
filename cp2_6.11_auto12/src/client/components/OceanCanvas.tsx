import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Bottle, Ripple } from '../../shared/types';

interface OceanParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  gridX: number;
  gridY: number;
}

interface OceanCanvasProps {
  bottles: Bottle[];
  onBottleClick: (bottle: Bottle, x: number, y: number) => void;
}

const GRID_COLS = 8;
const GRID_ROWS = 6;
const FPS = 30;
const FRAME_INTERVAL = 1000 / FPS;

function generateBaseField(w: number, h: number): { x: number; y: number }[][] {
  const field: { x: number; y: number }[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: { x: number; y: number }[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const angle = (c / GRID_COLS) * Math.PI * 2 + (r / GRID_ROWS) * Math.PI;
      row.push({
        x: Math.cos(angle) * 0.5,
        y: Math.sin(angle) * 0.5
      });
    }
    field.push(row);
  }
  return field;
}

function bilinearSample(
  px: number, py: number,
  field: { x: number; y: number }[][],
  w: number, h: number
): { x: number; y: number } {
  const gx = (px / w) * (GRID_COLS - 1);
  const gy = (py / h) * (GRID_ROWS - 1);

  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(GRID_COLS - 1, x0 + 1);
  const y1 = Math.min(GRID_ROWS - 1, y0 + 1);

  const fx = gx - x0;
  const fy = gy - y0;

  const v00 = field[y0][x0];
  const v10 = field[y0][x1];
  const v01 = field[y1][x0];
  const v11 = field[y1][x1];

  const topX = v00.x * (1 - fx) + v10.x * fx;
  const topY = v00.y * (1 - fx) + v10.y * fx;
  const botX = v01.x * (1 - fx) + v11.x * fx;
  const botY = v01.y * (1 - fx) + v11.y * fx;

  return {
    x: topX * (1 - fy) + botX * fy,
    y: topY * (1 - fy) + botY * fy
  };
}

export const OceanCanvas: React.FC<OceanCanvasProps> = ({ bottles, onBottleClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<OceanParticle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const hoveredBottleRef = useRef<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const fieldRef = useRef<{ x: number; y: number }[][]>([]);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  const initParticles = useCallback((w: number, h: number) => {
    const particles: OceanParticle[] = [];
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        baseAlpha: 0.2 + Math.random() * 0.3,
        gridX: Math.floor((x / w) * GRID_COLS),
        gridY: Math.floor((y / h) * GRID_ROWS)
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    fieldRef.current = generateBaseField(size.w, size.h);
  }, [size.w, size.h]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onResize = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      setSize({ w, h });
      initParticles(w, h);
      fieldRef.current = generateBaseField(w, h);
    };

    onResize();

    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    window.addEventListener('resize', onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [initParticles]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;

    let found: string | null = null;
    for (const b of bottles) {
      const dx = b.x - mouseRef.current.x;
      const dy = b.y - mouseRef.current.y;
      if (dx * dx + dy * dy < 100) {
        found = b.id;
        break;
      }
    }
    hoveredBottleRef.current = found;
  }, [bottles]);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -9999, y: -9999 };
    hoveredBottleRef.current = null;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const b of bottles) {
      const dx = b.x - x;
      const dy = b.y - y;
      if (dx * dx + dy * dy < 144) {
        ripplesRef.current.push({
          x: b.x,
          y: b.y,
          startTime: performance.now(),
          bottleId: b.id
        });
        onBottleClick(b, e.clientX, e.clientY);
        return;
      }
    }
  }, [bottles, onBottleClick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const delta = time - lastFrameRef.current;
      if (delta < FRAME_INTERVAL) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameRef.current = time - (delta % FRAME_INTERVAL);

      const w = size.w;
      const h = size.h;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const hoveredId = hoveredBottleRef.current;
      const field = fieldRef.current;

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#003366');
      grad.addColorStop(1, '#66B2FF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        const vec = bilinearSample(p.x, p.y, field, w, h);
        p.vx = p.vx * 0.9 + vec.x * 0.5;
        p.vy = p.vy * 0.9 + vec.y * 0.5;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x += w;
        if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        if (p.y > h) p.y -= h;

        const ddx = p.x - mx;
        const ddy = p.y - my;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const influence = Math.max(0, 1 - dist / 200);
        const alpha = Math.min(0.8, p.baseAlpha + influence * 0.6);

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 200, 255, ${alpha})`;
        ctx.fill();
      }

      const now = performance.now();
      ripplesRef.current = ripplesRef.current.filter((r) => now - r.startTime < 500);
      for (const r of ripplesRef.current) {
        const t = (now - r.startTime) / 500;
        const radius = 4 + t * 40;
        const alpha = 1 - t;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      for (const b of bottles) {
        if (b.trajectory && b.trajectory.length > 1) {
          for (let i = 1; i < b.trajectory.length; i++) {
            const prev = b.trajectory[i - 1];
            const cur = b.trajectory[i];
            const t = i / b.trajectory.length;
            const alpha = t * 0.6;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(cur.x, cur.y);
            ctx.strokeStyle = b.collected
              ? `rgba(255, 215, 0, ${alpha})`
              : `rgba(102, 255, 200, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        const isHovered = hoveredId === b.id;
        const radius = isHovered ? 20 : b.collected ? 6 : 8;

        const bottleGrad = ctx.createRadialGradient(
          b.x - radius * 0.3,
          b.y - radius * 0.3,
          0,
          b.x,
          b.y,
          radius
        );
        if (b.collected) {
          bottleGrad.addColorStop(0, '#FFF8DC');
          bottleGrad.addColorStop(0.5, '#FFD700');
          bottleGrad.addColorStop(1, '#B8860B');
        } else {
          bottleGrad.addColorStop(0, '#A0E8D0');
          bottleGrad.addColorStop(0.5, '#40C0A0');
          bottleGrad.addColorStop(1, '#008080');
        }

        ctx.beginPath();
        ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = bottleGrad;
        ctx.shadowColor = b.collected ? 'rgba(255, 215, 0, 0.6)' : 'rgba(102, 178, 255, 0.5)';
        ctx.shadowBlur = isHovered ? 20 : 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isHovered) {
          ctx.font = '11px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.textAlign = 'center';
          const label = `#${b.id.slice(0, 6)} (${b.x.toFixed(0)}, ${b.y.toFixed(0)})`;
          const tw = ctx.measureText(label).width + 12;
          ctx.fillStyle = 'rgba(0, 30, 60, 0.75)';
          const bx = b.x - tw / 2;
          const by = b.y - radius - 22;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(bx, by, tw, 18, 6);
          } else {
            ctx.rect(bx, by, tw, 18);
          }
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(label, b.x, by + 13);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [size, bottles]);

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
    </div>
  );
};
