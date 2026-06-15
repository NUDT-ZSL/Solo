import { forwardRef, useEffect, useRef, useState, useImperativeHandle, useCallback } from 'react';
import {
  BrushPreset,
  Particle,
  TextureParams,
  generateTextMask,
  generateParticles,
  interpolateParticles,
  renderParticles,
  TextMaskPoint
} from '../utils/textureEngine';

export interface CanvasRendererProps {
  text: string;
  fontFamily: string;
  preset: BrushPreset;
  customParams: Partial<TextureParams>;
  transitionDuration?: number;
  onRedrawStart?: () => void;
  onRedrawEnd?: () => void;
}

export interface CanvasRendererHandle {
  exportHighRes: (width: number, height: number) => Promise<Blob | null>;
}

interface DriftParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

const CanvasRenderer = forwardRef<CanvasRendererHandle, CanvasRendererProps>((
  { text, fontFamily, preset, customParams, transitionDuration = 2000, onRedrawStart, onRedrawEnd },
  ref
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const targetParticlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const transitionStartRef = useRef<number>(0);
  const isTransitioningRef = useRef(false);
  const driftParticlesRef = useRef<DriftParticle[]>([]);
  const driftStartRef = useRef<number>(0);
  const isDriftingRef = useRef(false);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const panRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const maskPointsRef = useRef<TextMaskPoint[]>([]);
  const lastRenderKeyRef = useRef('');

  const getFontSize = useCallback((canvasW: number, canvasH: number, t: string) => {
    const maxW = canvasW * 0.78;
    const maxH = canvasH * 0.45;
    const len = Math.max(t.length, 1);
    let size = Math.floor(Math.min(maxW / len * 1.6, maxH * 1.8));
    return Math.max(32, Math.min(size, 280));
  }, []);

  const getMaskCanvas = useCallback(() => {
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }
    return maskCanvasRef.current;
  }, []);

  const computeMaskAndParticles = useCallback((w: number, h: number, isExport = false) => {
    const mask = getMaskCanvas();
    mask.width = w;
    mask.height = h;
    const fontSize = isExport
      ? Math.floor(Math.min(w * 0.78 / Math.max(text.length, 1) * 1.6, h * 0.45 * 1.8))
      : getFontSize(w, h, text);
    const points = generateTextMask(mask, text || ' ', fontFamily, fontSize);
    maskPointsRef.current = points;
    return generateParticles(points, preset, customParams);
  }, [text, fontFamily, preset, customParams, getFontSize, getMaskCanvas]);

  const drawFrame = useCallback((timestamp: number, showDrift = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(panRef.current.x, panRef.current.y);

    let particles: Particle[];
    if (isTransitioningRef.current) {
      const elapsed = timestamp - transitionStartRef.current;
      const progress = Math.min(elapsed / transitionDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      particles = interpolateParticles(particlesRef.current, targetParticlesRef.current, eased);
      if (progress >= 1) {
        isTransitioningRef.current = false;
        particlesRef.current = [...targetParticlesRef.current];
        onRedrawEnd?.();
      }
    } else {
      particles = particlesRef.current;
    }

    let driftForRender: typeof driftParticlesRef.current = [];
    if (isDriftingRef.current && showDrift) {
      const elapsed = timestamp - driftStartRef.current;
      const progress = Math.min(elapsed / 1000, 1);
      for (const d of driftParticlesRef.current) {
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.96;
        d.vy *= 0.96;
        d.life = d.maxLife * (1 - progress);
        d.opacity = Math.max(0, (d.life / d.maxLife) * 0.6);
      }
      driftForRender = driftParticlesRef.current.filter(d => d.opacity > 0.02);
      if (progress >= 1) {
        isDriftingRef.current = false;
      }
    }

    renderParticles(ctx, particles, driftForRender);
    ctx.restore();

    if (isTransitioningRef.current || (isDriftingRef.current && showDrift)) {
      animationRef.current = requestAnimationFrame(ts => drawFrame(ts, showDrift));
    }
  }, [transitionDuration, onRedrawEnd]);

  const startDrift = useCallback((timestamp: number) => {
    const count = 80;
    const particles = particlesRef.current.length > 0
      ? particlesRef.current
      : targetParticlesRef.current;
    if (particles.length === 0) return;

    const drift: DriftParticle[] = [];
    const colors = preset.colorPalette;
    for (let i = 0; i < count; i++) {
      const src = particles[Math.floor(Math.random() * particles.length)];
      if (!src) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      drift.push({
        x: src.x,
        y: src.y,
        size: Math.random() * 2.5 + 0.5,
        opacity: 0.5 + Math.random() * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1000,
        maxLife: 1000
      });
    }
    driftParticlesRef.current = drift;
    driftStartRef.current = timestamp;
    isDriftingRef.current = true;
  }, [preset]);

  useEffect(() => {
    const handleResize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const w = Math.max(400, Math.floor(rect.width));
      const h = Math.max(300, Math.floor(rect.height));
      setSize({ w, h });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = size.w + 'px';
    canvas.style.height = size.h + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const key = `${text}|${fontFamily}|${preset.id}|${JSON.stringify(customParams)}|${size.w}x${size.h}`;
    if (key !== lastRenderKeyRef.current) {
      lastRenderKeyRef.current = key;
      onRedrawStart?.();
      try {
        const newParticles = computeMaskAndParticles(size.w, size.h);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        if (particlesRef.current.length === 0) {
          particlesRef.current = newParticles;
          targetParticlesRef.current = newParticles;
          isTransitioningRef.current = false;
          const now = performance.now();
          startDrift(now);
          animationRef.current = requestAnimationFrame(ts => drawFrame(ts));
          onRedrawEnd?.();
        } else {
          targetParticlesRef.current = newParticles;
          transitionStartRef.current = performance.now();
          isTransitioningRef.current = true;
          animationRef.current = requestAnimationFrame(ts => drawFrame(ts));
          setTimeout(() => {
            if (!isTransitioningRef.current) {
              const t = performance.now();
              startDrift(t);
              if (animationRef.current) cancelAnimationFrame(animationRef.current);
              animationRef.current = requestAnimationFrame(ts => drawFrame(ts));
            }
          }, transitionDuration);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(ts => drawFrame(ts));
    }
  }, [text, fontFamily, preset, customParams, size, computeMaskAndParticles, drawFrame, startDrift, transitionDuration, onRedrawStart, onRedrawEnd]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    panRef.current = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y };
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(ts => drawFrame(ts));
  };
  const handleMouseUp = () => { draggingRef.current = false; };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      draggingRef.current = true;
      dragStartRef.current = { x: t.clientX - panRef.current.x, y: t.clientY - panRef.current.y };
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    panRef.current = { x: t.clientX - dragStartRef.current.x, y: t.clientY - dragStartRef.current.y };
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(ts => drawFrame(ts));
  };
  const handleTouchEnd = () => { draggingRef.current = false; };

  useImperativeHandle(ref, () => ({
    exportHighRes: async (width: number, height: number): Promise<Blob | null> => {
      return new Promise((resolve) => {
        try {
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = width;
          exportCanvas.height = height;
          const ectx = exportCanvas.getContext('2d');
          if (!ectx) { resolve(null); return; }
          ectx.clearRect(0, 0, width, height);

          const mask = document.createElement('canvas');
          mask.width = width;
          mask.height = height;
          const fontSize = Math.floor(Math.min(width * 0.78 / Math.max(text.length, 1) * 1.6, height * 0.45 * 1.8));
          const pts = generateTextMask(mask, text || ' ', fontFamily, fontSize);
          const parts = generateParticles(pts, preset, customParams);
          ectx.translate(width / 2 - size.w / 2, height / 2 - size.h / 2);
          renderParticles(ectx, parts, undefined);

          exportCanvas.toBlob(
            blob => resolve(blob),
            'image/png'
          );
        } catch {
          resolve(null);
        }
      });
    }
  }));

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas
        ref={canvasRef}
        className="preview-canvas"
        width={size.w}
        height={size.h}
      />
      <div className="canvas-hint">拖拽画布可平移查看纹理细节</div>
    </div>
  );
});

CanvasRenderer.displayName = 'CanvasRenderer';

export default CanvasRenderer;
