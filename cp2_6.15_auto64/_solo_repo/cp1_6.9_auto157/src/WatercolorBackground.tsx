import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { ColorScheme, WatercolorBlob, Decoration } from './types';
import { generateDecorations } from './ThemeEngine';

export interface WatercolorBackgroundHandle {
  getCanvas: () => HTMLCanvasElement | null;
  drawToExport: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

interface WatercolorBackgroundProps {
  scheme: ColorScheme;
  width: number;
  height: number;
  transitionDuration?: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  blob: WatercolorBlob,
  w: number,
  h: number,
  opacity: number,
  time: number
) {
  const cx = blob.x * w;
  const cy = blob.y * h;
  const rx = blob.radius * (0.85 + 0.15 * Math.sin(time / 1200 + blob.breathPhase));
  const ry = blob.radius * (0.9 + 0.1 * Math.cos(time / 1800 + blob.breathPhase)) * 0.75;
  const angle = blob.angle + Math.sin(time / 3000 + blob.breathPhase) * 0.08;

  const { r, g, b } = hexToRgb(blob.color);
  const alpha = Math.max(0, Math.min(1, blob.baseOpacity * opacity + 0.05 * Math.sin(time / (blob.breathPeriod * 500) + blob.breathPhase)));

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`);
  gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  for (let s = 0; s < 2; s++) {
    const off = 0.35 + s * 0.25;
    const ox = cx + Math.cos(blob.angle + s * 1.5) * blob.radius * off;
    const oy = cy + Math.sin(blob.angle + s * 1.5) * blob.radius * off * 0.7;
    const sr = blob.radius * (0.22 + s * 0.12);
    const subAlpha = alpha * 0.55;
    const sub = ctx.createRadialGradient(ox, oy, 0, ox, oy, sr);
    sub.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${subAlpha})`);
    sub.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = sub;
    ctx.beginPath();
    ctx.arc(ox, oy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBase(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  const { r, g, b } = hexToRgb(color);
  const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.75);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.75, `rgba(${r + 5}, ${g + 3}, ${b - 5}, 0.98)`);
  gradient.addColorStop(1, `rgba(${r - 10}, ${g - 8}, ${b - 15}, 0.95)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawDecoration(ctx: CanvasRenderingContext2D, d: Decoration, w: number, h: number) {
  const x = d.x * w;
  const y = d.y * h;
  const { r, g, b } = hexToRgb(d.color);
  ctx.save();
  ctx.globalAlpha = d.opacity;
  ctx.translate(x, y);
  ctx.rotate(d.rotation);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${d.opacity})`;
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${d.opacity})`;

  switch (d.type) {
    case 'circle': {
      ctx.beginPath();
      ctx.arc(0, 0, d.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'line': {
      ctx.lineWidth = Math.max(1, d.size * 0.15);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-d.size, 0);
      ctx.quadraticCurveTo(0, -d.size * 0.3, d.size, 0);
      ctx.stroke();
      break;
    }
    case 'leaf': {
      ctx.beginPath();
      ctx.moveTo(0, -d.size);
      ctx.quadraticCurveTo(d.size * 0.8, -d.size * 0.3, d.size * 0.4, d.size);
      ctx.quadraticCurveTo(0, d.size * 0.7, -d.size * 0.4, d.size);
      ctx.quadraticCurveTo(-d.size * 0.8, -d.size * 0.3, 0, -d.size);
      ctx.fill();
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -d.size * 0.9);
      ctx.lineTo(0, d.size * 0.9);
      ctx.globalAlpha = d.opacity * 0.6;
      ctx.strokeStyle = `rgba(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}, ${d.opacity})`;
      ctx.stroke();
      break;
    }
    case 'flower': {
      const petals = 5;
      for (let i = 0; i < petals; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / petals);
        ctx.beginPath();
        ctx.ellipse(0, -d.size * 0.7, d.size * 0.38, d.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, d.size * 0.3, 0, Math.PI * 2);
      const centerRgb = { r: Math.min(255, r + 60), g: Math.min(255, g + 40), b: Math.max(0, b - 20) };
      ctx.fillStyle = `rgba(${centerRgb.r}, ${centerRgb.g}, ${centerRgb.b}, ${d.opacity})`;
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

const WatercolorBackground = forwardRef<WatercolorBackgroundHandle, WatercolorBackgroundProps>(function WatercolorBackground(
  { scheme, width, height, transitionDuration = 1500 },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevSchemeRef = useRef<ColorScheme | null>(null);
  const transitionStartRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const decorations = useMemo(() => generateDecorations(scheme), [scheme]);
  const prevDecorationsRef = useRef<Decoration[]>([]);

  const getCanvas = () => canvasRef.current;

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bg: ColorScheme,
    decos: Decoration[],
    opacity: number,
    time: number
  ) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    drawBase(ctx, w, h, bg.baseColor);
    for (const blob of bg.blobs) {
      drawBlob(ctx, blob, w, h, opacity, time);
    }
    for (const d of decos) {
      drawDecoration(ctx, d, w, h);
    }
    ctx.restore();
  };

  useImperativeHandle(ref, () => ({
    getCanvas,
    drawToExport: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const now = performance.now();
      drawScene(ctx, w, h, scheme, decorations, 1, now);
    }
  }), [scheme, decorations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isTransition = prevSchemeRef.current !== null;
    transitionStartRef.current = performance.now();
    if (isTransition) {
      prevDecorationsRef.current = decorations;
    }

    const loop = (now: number) => {
      const ctx2 = canvas.getContext('2d');
      if (!ctx2) return;
      ctx2.clearRect(0, 0, width, height);

      const elapsed = now - transitionStartRef.current;
      let newOpacity = 1;
      let oldOpacity = 0;

      if (isTransition && elapsed < transitionDuration) {
        const t = elapsed / transitionDuration;
        const eased = 1 - Math.pow(1 - t, 3);
        newOpacity = eased;
        oldOpacity = 1 - eased;
      }

      if (prevSchemeRef.current && oldOpacity > 0) {
        drawScene(ctx2, width, height, prevSchemeRef.current, prevDecorationsRef.current, oldOpacity, now);
      }

      drawScene(ctx2, width, height, scheme, decorations, newOpacity, now);

      if (isTransition && elapsed < transitionDuration + 100) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = requestAnimationFrame(breathLoop);
      }
    };

    const breathLoop = (now: number) => {
      const ctx2 = canvas.getContext('2d');
      if (!ctx2) return;
      ctx2.clearRect(0, 0, width, height);
      drawScene(ctx2, width, height, scheme, decorations, 1, now);
      rafRef.current = requestAnimationFrame(breathLoop);
    };

    rafRef.current = requestAnimationFrame(loop);

    prevSchemeRef.current = scheme;

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [scheme, width, height, decorations, transitionDuration]);

  return (
    <canvas
      ref={canvasRef}
      className="watercolor-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '16px',
        pointerEvents: 'none',
        width: `${width}px`,
        height: `${height}px`
      }}
    />
  );
});

export default WatercolorBackground;
