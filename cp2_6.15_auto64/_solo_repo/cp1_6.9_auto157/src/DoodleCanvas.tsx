import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo
} from 'react';
import type { Point, Stroke, ClearParticle } from './types';

export interface DoodleCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  undo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  drawToExport: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

interface DoodleCanvasProps {
  width: number;
  height: number;
  inkColor: string;
  onChange?: (strokes: Stroke[]) => void;
}

const MIN_WIDTH = 2;
const MAX_WIDTH = 6;
const SPEED_THRESHOLD = 1.2;
const DRY_DURATION = 500;
const SPREAD_MIN = 1;
const SPREAD_MAX = 3;
const CLEAR_PARTICLE_DURATION = 1200;
const MAX_UNDO = 5;

function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function widthFromSpeed(speed: number): number {
  const t = Math.min(1, speed / SPEED_THRESHOLD);
  return MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * t;
}

function drawStrokeSegment(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  startIndex: number,
  dryOpacity: number
) {
  const points = stroke.points;
  if (points.length - startIndex < 2) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = hexToRgba(stroke.color, dryOpacity);

  for (let i = Math.max(1, startIndex + 1); i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dt = Math.max(1, p1.timestamp - p0.timestamp);
    const dist = distance(p0, p1);
    const speed = dist / dt;
    const w = widthFromSpeed(speed) * (0.5 + p0.pressure * 0.5);

    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

function drawInkSpread(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  progress: number
) {
  if (progress <= 0 || stroke.points.length < 2) return;
  const spread = stroke.spreadRadius * progress;
  const alpha = 0.25 + 0.4 * progress;

  for (let i = 1; i < stroke.points.length; i += 2) {
    const p0 = stroke.points[i - 1];
    const p1 = stroke.points[i];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
    const nx = -dy / len;
    const ny = dx / len;
    const seed = (i * 13.37 + p0.x * 0.7 + p0.y * 0.3) % 1;
    const offsetA = (seed - 0.5) * spread * 2;
    const offsetB = ((seed * 7.13) - 0.5) * spread * 2;

    ctx.fillStyle = hexToRgba(stroke.color, alpha);
    ctx.beginPath();
    ctx.arc(mx + nx * offsetA, my + ny * offsetA, spread * (0.35 + seed * 0.35), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx - nx * offsetB * 0.7, my - ny * offsetB * 0.7, spread * (0.25 + (1 - seed) * 0.25), 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  now: number
) {
  for (const s of strokes) {
    let dryOpacity = 1;
    let spreadProgress = 0;

    if (s.isDry) {
      dryOpacity = 0.85;
      spreadProgress = 1;
    } else if (s.completedAt > 0) {
      const elapsed = now - s.completedAt;
      const t = Math.min(1, elapsed / DRY_DURATION);
      const eased = 1 - Math.pow(1 - t, 2);
      dryOpacity = 1 - (1 - 0.85) * eased;
      spreadProgress = eased;
    }

    if (spreadProgress > 0) {
      drawInkSpread(ctx, s, spreadProgress);
    }
    drawStrokeSegment(ctx, s, 0, dryOpacity);
  }
}

const DoodleCanvas = forwardRef<DoodleCanvasHandle, DoodleCanvasProps>(function DoodleCanvas(
  { width, height, inkColor, onChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const undoStackRef = useRef<Stroke[][]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const renderingRef = useRef<number>(0);
  const lastDrawnIndexRef = useRef<Map<string, number>>(new Map());
  const isDrawingRef = useRef(false);

  const clearParticlesRef = useRef<ClearParticle[]>([]);
  const clearAnimStartRef = useRef<number>(0);
  const isClearingRef = useRef(false);
  const preClearSnapshotRef = useRef<ImageData | null>(null);

  const rafIdRef = useRef<number>(0);

  const notifyChange = useCallback(() => {
    if (onChange) {
      onChange([...strokesRef.current]);
    }
  }, [onChange]);

  const fullRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    renderAllStrokes(ctx, strokesRef.current, performance.now());
    ctx.restore();
  }, [width, height]);

  const spawnClearParticles = useCallback(() => {
    const particles: ClearParticle[] = [];
    const allPoints: Point[] = [];
    for (const s of strokesRef.current) {
      for (let i = 0; i < s.points.length; i += Math.max(1, Math.floor(s.points.length / 40))) {
        allPoints.push(s.points[i]);
      }
    }
    const target = Math.min(500, Math.max(200, allPoints.length * 2));
    if (allPoints.length === 0) {
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        particles.push({
          x: width / 2 + (Math.random() - 0.5) * width * 0.5,
          y: height / 2 + (Math.random() - 0.5) * height * 0.5,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 2,
          color: inkColor,
          size: 2 + Math.random() * 4,
          life: 1,
          maxLife: 1,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.3
        });
      }
    } else {
      for (let i = 0; i < target; i++) {
        const p = allPoints[Math.floor(Math.random() * allPoints.length)];
        const strokeIdx = Math.floor(Math.random() * strokesRef.current.length);
        const stroke = strokesRef.current[strokeIdx];
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 5;
        const colorRand = Math.random();
        let col = stroke?.color || inkColor;
        if (colorRand < 0.2) {
          const palette = ['#FFD3A5', '#C8A2C8', '#A2D2DF', '#F7D9C4', '#FFAFBD'];
          col = palette[Math.floor(Math.random() * palette.length)];
        }
        particles.push({
          x: p.x + (Math.random() - 0.5) * 6,
          y: p.y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 1.5,
          color: col,
          size: 2 + Math.random() * 3.5,
          life: 1,
          maxLife: 1,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.35
        });
      }
    }
    clearParticlesRef.current = particles;
  }, [width, height, inkColor]);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const now = performance.now();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (isClearingRef.current) {
      const elapsed = now - clearAnimStartRef.current;
      const t = Math.min(1, elapsed / CLEAR_PARTICLE_DURATION);
      const eased = 1 - Math.pow(1 - t, 2);

      if (preClearSnapshotRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - eased * 1.3);
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = preClearSnapshotRef.current.width;
        tmpCanvas.height = preClearSnapshotRef.current.height;
        const tmpCtx = tmpCanvas.getContext('2d');
        if (tmpCtx) {
          tmpCtx.putImageData(preClearSnapshotRef.current, 0, 0);
          ctx.drawImage(tmpCanvas, 0, 0, width, height);
        }
        ctx.restore();
      }

      const decay = 1 / (60 * CLEAR_PARTICLE_DURATION / 1000);
      const particles = clearParticlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 0.12;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        p.life = Math.max(0, p.life - decay);
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.5 + p.life * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (t >= 1 && particles.length === 0) {
        isClearingRef.current = false;
        preClearSnapshotRef.current = null;
        clearParticlesRef.current = [];
      }
    } else {
      renderAllStrokes(ctx, strokesRef.current, now);
    }

    ctx.restore();
    rafIdRef.current = requestAnimationFrame(renderFrame);
  }, [width, height]);

  const getEventPoint = useCallback((e: PointerEvent | React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5, timestamp: performance.now() };
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const native = 'nativeEvent' in e ? e.nativeEvent : e;
    const pressure = native.pressure != null && native.pressure > 0 ? native.pressure : 0.5;
    return {
      x: (native.clientX - rect.left) * scaleX,
      y: (native.clientY - rect.top) * scaleY,
      pressure,
      timestamp: performance.now()
    };
  }, [width, height]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isClearingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    isDrawingRef.current = true;
    renderingRef.current++;

    const point = getEventPoint(e);
    const stroke: Stroke = {
      id: uid('stroke_'),
      points: [point],
      color: inkColor,
      isDry: false,
      dryProgress: 0,
      spreadRadius: SPREAD_MIN + Math.random() * (SPREAD_MAX - SPREAD_MIN),
      completedAt: 0
    };
    currentStrokeRef.current = stroke;
    strokesRef.current.push(stroke);
    lastDrawnIndexRef.current.set(stroke.id, 0);
  }, [inkColor, getEventPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const point = getEventPoint(e);
    const stroke = currentStrokeRef.current;
    const last = stroke.points[stroke.points.length - 1];
    if (!last || distance(last, point) > 0.8) {
      stroke.points.push(point);
    }
  }, [getEventPoint]);

  const finalizeCurrentStroke = useCallback(() => {
    if (!currentStrokeRef.current) return;
    const stroke = currentStrokeRef.current;
    stroke.completedAt = performance.now();
    setTimeout(() => {
      stroke.isDry = true;
      notifyChange();
    }, DRY_DURATION + 50);

    undoStackRef.current.push(strokesRef.current.map(s => ({ ...s, points: [...s.points] })));
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }

    currentStrokeRef.current = null;
    isDrawingRef.current = false;
    notifyChange();
  }, [notifyChange]);

  const handlePointerUp = useCallback(() => {
    finalizeCurrentStroke();
  }, [finalizeCurrentStroke]);

  const handlePointerLeave = useCallback(() => {
    if (isDrawingRef.current) {
      finalizeCurrentStroke();
    }
  }, [finalizeCurrentStroke]);

  const undo = useCallback(() => {
    if (isClearingRef.current) return;
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop();
    if (prev) {
      strokesRef.current = prev;
      lastDrawnIndexRef.current.clear();
      notifyChange();
      fullRender();
    }
  }, [notifyChange, fullRender]);

  const clear = useCallback(() => {
    if (isClearingRef.current) return;
    if (strokesRef.current.length === 0) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        preClearSnapshotRef.current = ctx.getImageData(0, 0, Math.floor(width * dpr), Math.floor(height * dpr));
      }
    }

    undoStackRef.current.push(strokesRef.current.map(s => ({ ...s, points: [...s.points] })));
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }

    strokesRef.current = [];
    spawnClearParticles();
    clearAnimStartRef.current = performance.now();
    isClearingRef.current = true;
    notifyChange();
  }, [width, height, notifyChange, spawnClearParticles]);

  const canUndo = useCallback(() => {
    return undoStackRef.current.length > 0;
  }, []);

  const getCanvas = useCallback(() => canvasRef.current, []);

  const drawToExport = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const scaleX = w / width;
    const scaleY = h / height;
    ctx.save();
    ctx.scale(scaleX, scaleY);
    renderAllStrokes(ctx, strokesRef.current, performance.now() + DRY_DURATION);
    ctx.restore();
  }, [width, height]);

  useImperativeHandle(ref, () => ({
    getCanvas,
    undo,
    clear,
    canUndo,
    drawToExport
  }), [getCanvas, undo, clear, canUndo, drawToExport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    fullRender();
  }, [width, height, fullRender]);

  useEffect(() => {
    rafIdRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [renderFrame]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  const style: React.CSSProperties = useMemo(() => ({
    position: 'absolute',
    inset: 0,
    borderRadius: '16px',
    cursor: 'crosshair',
    touchAction: 'none',
    width: `${width}px`,
    height: `${height}px`
  }), [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="doodle-canvas"
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  );
});

export default DoodleCanvas;
