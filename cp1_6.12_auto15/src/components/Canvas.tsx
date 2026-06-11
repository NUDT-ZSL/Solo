import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { network, type DrawPayload, type Point } from '@/utils/network';
import { v4 as uuidv4 } from 'uuid';

const MAX_POINTS_PER_STROKE = 1000;
const GRID_SIZE = 50;

export interface CanvasHandle {
  redrawAll: () => void;
  clearAll: () => void;
  undoStroke: (strokeId: string) => void;
}

interface CanvasProps {
  currentColor: string;
  brushSize: number;
  userId: string;
  onlineCount: number;
  isClearing: boolean;
  onStrokeEnd: (stroke: DrawPayload) => void;
  strokesRef: React.MutableRefObject<DrawPayload[]>;
  undoneStrokesRef: React.MutableRefObject<Set<string>>;
}

interface ActiveStroke {
  strokeId: string;
  color: string;
  size: number;
  points: Point[];
  isOwn: boolean;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { currentColor, brushSize, userId, onlineCount, isClearing, onStrokeEnd, strokesRef, undoneStrokesRef },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef<number>(1);
  const isDrawingRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<ActiveStroke | null>(null);
  const pendingPointsRef = useRef<Point[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCoordinates = useCallback((e: MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.round(clientX - rect.left);
    const y = Math.round(clientY - rect.top);
    return { x, y };
  }, []);

  const parseColor = useCallback((colorHex: string): { r: number; g: number; b: number } => {
    const hex = colorHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += GRID_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += GRID_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawStrokeSegment = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      color: string,
      size: number,
      points: Point[],
      withTrail: boolean = false
    ) => {
      if (points.length < 2) {
        if (points.length === 1) {
          const p = points[0];
          ctx.save();
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        return;
      }

      const { r, g, b } = parseColor(color);
      const totalPoints = points.length;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = size;

      for (let i = 1; i < totalPoints; i++) {
        const start = points[i - 1];
        const end = points[i];
        const alpha = withTrail ? Math.min(1, i / Math.min(20, totalPoints)) : 1;

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }

      ctx.restore();
    },
    [parseColor]
  );

  const fullRedraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const width = canvas.width / dprRef.current;
    const height = canvas.height / dprRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, width, height);

    const active = activeStrokeRef.current;

    for (const stroke of strokesRef.current) {
      if (undoneStrokesRef.current.has(stroke.strokeId)) continue;
      drawStrokeSegment(ctx, stroke.color, stroke.size, stroke.points, false);
    }

    if (active) {
      drawStrokeSegment(ctx, active.color, active.size, active.points, active.isOwn);
    }
  }, [drawGrid, drawStrokeSegment, strokesRef, undoneStrokesRef]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctxRef.current = ctx;
    dprRef.current = dpr;

    fullRedraw();
  }, [fullRedraw]);

  const sendStrokeChunk = useCallback(() => {
    rafIdRef.current = null;
    const active = activeStrokeRef.current;
    const pending = pendingPointsRef.current;
    if (!active || pending.length === 0) return;

    const toSend = pending.slice();
    pendingPointsRef.current = [];

    if (active.points.length >= MAX_POINTS_PER_STROKE) return;

    const spaceLeft = MAX_POINTS_PER_STROKE - active.points.length;
    const chunk = toSend.slice(0, spaceLeft);
    active.points.push(...chunk);

    network.send({
      type: 'DRAW',
      payload: {
        strokeId: active.strokeId,
        userId,
        color: active.color,
        size: active.size,
        points: chunk,
      },
    });

    fullRedraw();
  }, [userId, fullRedraw]);

  const queuePoints = useCallback(
    (point: Point) => {
      const active = activeStrokeRef.current;
      if (!active) return;
      pendingPointsRef.current.push(point);

      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(sendStrokeChunk);
      }
    },
    [sendStrokeChunk]
  );

  const handlePointerDown = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (isClearing) return;
      const point = getCoordinates(e);
      if (!point) return;

      e.preventDefault();

      const strokeId = uuidv4();
      const active: ActiveStroke = {
        strokeId,
        color: currentColor,
        size: brushSize,
        points: [],
        isOwn: true,
      };
      activeStrokeRef.current = active;
      isDrawingRef.current = true;
      pendingPointsRef.current = [];

      queuePoints(point);
    },
    [currentColor, brushSize, isClearing, getCoordinates, queuePoints]
  );

  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      const point = getCoordinates(e);
      if (!point) return;

      e.preventDefault();
      queuePoints(point);
    },
    [getCoordinates, queuePoints]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;

    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const active = activeStrokeRef.current;
    if (active && pendingPointsRef.current.length > 0) {
      const spaceLeft = MAX_POINTS_PER_STROKE - active.points.length;
      const chunk = pendingPointsRef.current.slice(0, spaceLeft);
      active.points.push(...chunk);

      if (chunk.length > 0) {
        network.send({
          type: 'DRAW',
          payload: {
            strokeId: active.strokeId,
            userId,
            color: active.color,
            size: active.size,
            points: chunk,
          },
        });
      }
    }

    if (active && active.points.length > 0) {
      const completed: DrawPayload = {
        strokeId: active.strokeId,
        userId,
        color: active.color,
        size: active.size,
        points: active.points,
      };
      onStrokeEnd(completed);
    }

    isDrawingRef.current = false;
    activeStrokeRef.current = null;
    pendingPointsRef.current = [];
    fullRedraw();
  }, [userId, onStrokeEnd, fullRedraw]);

  useImperativeHandle(
    ref,
    (): CanvasHandle => ({
      redrawAll: () => fullRedraw(),
      clearAll: () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        const width = canvas.width / dprRef.current;
        const height = canvas.height / dprRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid(ctx, width, height);
      },
      undoStroke: () => {
        fullRedraw();
      },
    }),
    [fullRedraw, drawGrid]
  );

  useEffect(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
    }
    const el = indicatorRef.current;
    if (el) {
      el.classList.add('fading');
      fadeTimerRef.current = setTimeout(() => {
        el.classList.remove('fading');
        fadeTimerRef.current = null;
      }, 250);
    }
  }, [onlineCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();

    const onResize = () => resizeCanvas();
    const onMouseDown = (e: MouseEvent) => handlePointerDown(e);
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e);
    const onMouseUp = () => handlePointerUp();
    const onTouchStart = (e: TouchEvent) => handlePointerDown(e);
    const onTouchMove = (e: TouchEvent) => handlePointerMove(e);
    const onTouchEnd = () => handlePointerUp();

    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, [resizeCanvas, handlePointerDown, handlePointerMove, handlePointerUp]);

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <canvas ref={canvasRef} className="canvas-element" />
      <div ref={indicatorRef} className="online-indicator">
        <span className="online-dot" />
        <span>
          {onlineCount} 人在线
        </span>
      </div>
      {isClearing && (
        <div className="clear-overlay">
          <div className="progress-ring-container">
            <svg className="progress-ring" width="100" height="100" viewBox="0 0 100 100">
              <circle className="progress-ring-circle" cx="50" cy="50" r="42" />
              <circle className="progress-ring-circle-inner" cx="50" cy="50" r="42" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
