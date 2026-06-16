import React, { useEffect, useRef, useCallback } from 'react';
import type { Bottle } from '../api';

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

const Ocean: React.FC<OceanProps> = ({ bottles, onBottleClick, onBottlePick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floatingRef = useRef<FloatingBottle[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const hoverRef = useRef<string | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const bottlesRef = useRef(bottles);

  useEffect(() => {
    bottlesRef.current = bottles;
  }, [bottles]);

  const syncFloats = useCallback(() => {
    const current = floatingRef.current;
    const currentIds = new Set(current.map((f) => f.bottle.id));
    const newBottles = bottlesRef.current.filter((b) => !currentIds.has(b.id));

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

    const newIds = new Set(bottlesRef.current.map((b) => b.id));
    floatingRef.current = current.filter((f) => newIds.has(f.bottle.id));
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

    const drawBottle = (
      x: number,
      y: number,
      color: string,
      hovered: boolean,
      scale: number
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
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-3, -2, 2, 5, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();

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

    const animate = (now: number) => {
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

      syncFloats();
      const floats = floatingRef.current;
      let hoveredId: string | null = null;

      if (mouseRef.current) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        for (const f of floats) {
          const bx = f.x * w;
          const by = f.y * h;
          if (Math.abs(mx - bx) < 18 && Math.abs(my - by) < 20) {
            hoveredId = f.bottle.id;
            break;
          }
        }
      }

      hoverRef.current = hoveredId;

      for (const f of floats) {
        f.x += f.vx;
        f.y += f.vy;
        if (f.x < 0.02 || f.x > 0.98) f.vx *= -1;
        if (f.y < 0.3 || f.y > 0.65) f.vy *= -1;
        f.x = Math.max(0.02, Math.min(0.98, f.x));
        f.y = Math.max(0.3, Math.min(0.65, f.y));

        const bx = f.x * w;
        const by = f.y * h + Math.sin(t * Math.PI + f.phase) * 6;
        const color = getColorForBottle(f.bottle);
        const hovered = f.bottle.id === hoveredId;
        drawBottle(bx, by, color, hovered, 1);

        if (hovered) {
          tooltip.style.display = 'block';
          tooltip.style.left = `${bx + 20}px`;
          tooltip.style.top = `${by - 20}px`;
          tooltip.textContent = f.bottle.title;
        }
      }

      if (!hoveredId) {
        tooltip.style.display = 'none';
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e: MouseEvent) => {
      const mx = e.clientX;
      const my = e.clientY;
      for (const f of floatingRef.current) {
        const bx = f.x * canvas.width;
        const by = f.y * canvas.height;
        if (Math.abs(mx - bx) < 18 && Math.abs(my - by) < 20) {
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
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [onBottleClick, onBottlePick, syncFloats]);

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
