import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { Stroke, StrokePoint } from './RecognitionWorker';

export interface HandwritingCanvasHandle {
  clear: () => void;
}

interface HandwritingCanvasProps {
  onRecognitionStart: (center: { x: number; y: number }) => void;
  onRecognitionComplete: (latex: string, strokes: Stroke[]) => void;
  isRecognizing: boolean;
}

const CANVAS_WIDTH = 440;
const CANVAS_HEIGHT = 320;
const STROKE_WIDTH = 4;
const FADE_RATIO = 0.18;

const HandwritingCanvas = forwardRef<HandwritingCanvasHandle, HandwritingCanvasProps>(
  ({ onRecognitionStart, onRecognitionComplete, isRecognizing }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const strokesRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<StrokePoint[]>([]);
    const drawTimerRef = useRef<number | null>(null);
    const recognizeTimerRef = useRef<number | null>(null);
    const pendingPointRef = useRef<StrokePoint | null>(null);
    const loadingCenterRef = useRef<{ x: number; y: number } | null>(null);
    const loaderAnimRef = useRef<number | null>(null);
    const loaderAngleRef = useRef(0);

    const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent): StrokePoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
        timestamp: performance.now()
      };
    }, []);

    const computeStrokePathLength = (points: StrokePoint[]): number => {
      let len = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
      }
      return len;
    };

    const drawStroke = useCallback((ctx: CanvasRenderingContext2D, points: StrokePoint[]) => {
      if (points.length < 2) {
        if (points.length === 1) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, STROKE_WIDTH / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      const totalLength = computeStrokePathLength(points);
      const fadeLength = totalLength * FADE_RATIO;
      let accumulated = 0;

      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const segLen = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
        const segStart = accumulated;
        const segEnd = accumulated + segLen;
        const fadeStart = totalLength - fadeLength;

        if (segEnd <= fadeStart || fadeLength < 1) {
          ctx.strokeStyle = `rgba(255, 255, 255, 1)`;
          ctx.lineWidth = STROKE_WIDTH;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        } else {
          const steps = Math.max(2, Math.ceil(segLen / 2));
          for (let s = 0; s < steps; s++) {
            const t0 = s / steps;
            const t1 = (s + 1) / steps;
            const d0 = segStart + segLen * t0;
            const d1 = segStart + segLen * t1;
            const alpha0 = d0 < fadeStart ? 1 : Math.max(0, 1 - (d0 - fadeStart) / fadeLength);
            const alpha1 = d1 < fadeStart ? 1 : Math.max(0, 1 - (d1 - fadeStart) / fadeLength);
            const alpha = (alpha0 + alpha1) / 2;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = STROKE_WIDTH;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(p0.x + (p1.x - p0.x) * t0, p0.y + (p1.y - p0.y) * t0);
            ctx.lineTo(p0.x + (p1.x - p0.x) * t1, p0.y + (p1.y - p0.y) * t1);
            ctx.stroke();
          }
        }
        accumulated += segLen;
      }
    }, []);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      strokesRef.current.forEach(stroke => {
        drawStroke(ctx, stroke.points);
      });

      if (currentStrokeRef.current.length > 0) {
        drawStroke(ctx, currentStrokeRef.current);
      }
    }, [drawStroke]);

    const drawLoadingSpinner = useCallback(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, overlay.width, overlay.height);

      if (!isRecognizing || !loadingCenterRef.current) {
        loaderAnimRef.current = null;
        return;
      }

      const { x, y } = loadingCenterRef.current;
      const radius = 10;
      const lineWidth = 3;
      const spinY = -radius - 12;

      loaderAngleRef.current += 0.12;

      ctx.save();
      ctx.translate(x, y + spinY);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = 'rgba(0, 220, 220, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 220, 220, 1)';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, radius, loaderAngleRef.current, loaderAngleRef.current + Math.PI * 1.3);
      ctx.stroke();
      ctx.restore();

      loaderAnimRef.current = requestAnimationFrame(drawLoadingSpinner);
    }, [isRecognizing]);

    useEffect(() => {
      if (isRecognizing && loadingCenterRef.current) {
        if (!loaderAnimRef.current) {
          loaderAnimRef.current = requestAnimationFrame(drawLoadingSpinner);
        }
      } else {
        const overlay = overlayRef.current;
        if (overlay) {
          const ctx = overlay.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
        }
      }
      return () => {
        if (loaderAnimRef.current) {
          cancelAnimationFrame(loaderAnimRef.current);
          loaderAnimRef.current = null;
        }
      };
    }, [isRecognizing, drawLoadingSpinner]);

    const flushPendingPoint = useCallback(() => {
      if (pendingPointRef.current) {
        currentStrokeRef.current.push(pendingPointRef.current);
        pendingPointRef.current = null;
        redraw();
      }
      drawTimerRef.current = null;
    }, [redraw]);

    const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if (isRecognizing) return;
      e.preventDefault();

      if (recognizeTimerRef.current !== null) {
        clearTimeout(recognizeTimerRef.current);
        recognizeTimerRef.current = null;
      }

      const pt = getCoords(e);
      if (!pt) return;

      setIsDrawing(true);
      currentStrokeRef.current = [pt];
      pendingPointRef.current = null;
      redraw();
    }, [getCoords, isRecognizing, redraw]);

    const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();

      const pt = getCoords(e);
      if (!pt) return;

      if (drawTimerRef.current !== null) {
        clearTimeout(drawTimerRef.current);
      }

      if (pendingPointRef.current) {
        currentStrokeRef.current.push(pendingPointRef.current);
      }
      pendingPointRef.current = pt;
      redraw();
      drawTimerRef.current = window.setTimeout(flushPendingPoint, 50);
    }, [isDrawing, getCoords, redraw, flushPendingPoint]);

    const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();

      if (drawTimerRef.current !== null) {
        clearTimeout(drawTimerRef.current);
        drawTimerRef.current = null;
      }
      if (pendingPointRef.current) {
        currentStrokeRef.current.push(pendingPointRef.current);
        pendingPointRef.current = null;
      }

      if (currentStrokeRef.current.length > 0) {
        strokesRef.current.push({ points: [...currentStrokeRef.current] });
      }
      currentStrokeRef.current = [];
      setIsDrawing(false);
      redraw();

      if (strokesRef.current.length > 0) {
        const allPoints: StrokePoint[] = [];
        strokesRef.current.forEach(s => allPoints.push(...s.points));
        const minX = Math.min(...allPoints.map(p => p.x));
        const maxX = Math.max(...allPoints.map(p => p.x));
        const minY = Math.min(...allPoints.map(p => p.y));
        const center = { x: (minX + maxX) / 2, y: minY };
        loadingCenterRef.current = center;

        if (recognizeTimerRef.current !== null) {
          clearTimeout(recognizeTimerRef.current);
        }
        recognizeTimerRef.current = window.setTimeout(() => {
          recognizeTimerRef.current = null;
          const data = strokesRef.current.map(s => ({ points: [...s.points] }));
          onRecognitionStart(center);
          onRecognitionComplete('', data);
        }, 200);
      }
    }, [isDrawing, redraw, onRecognitionStart, onRecognitionComplete]);

    const clear = useCallback(() => {
      strokesRef.current = [];
      currentStrokeRef.current = [];
      pendingPointRef.current = null;
      loadingCenterRef.current = null;
      if (drawTimerRef.current !== null) {
        clearTimeout(drawTimerRef.current);
        drawTimerRef.current = null;
      }
      if (recognizeTimerRef.current !== null) {
        clearTimeout(recognizeTimerRef.current);
        recognizeTimerRef.current = null;
      }
      redraw();
    }, [redraw]);

    useImperativeHandle(ref, () => ({ clear }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      redraw();
    }, [redraw]);

    useEffect(() => {
      return () => {
        if (drawTimerRef.current !== null) clearTimeout(drawTimerRef.current);
        if (recognizeTimerRef.current !== null) clearTimeout(recognizeTimerRef.current);
        if (loaderAnimRef.current) cancelAnimationFrame(loaderAnimRef.current);
      };
    }, []);

    return (
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          borderRadius: 16,
          backgroundColor: '#1e1e1e',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'crosshair',
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        <canvas
          ref={overlayRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
      </div>
    );
  }
);

HandwritingCanvas.displayName = 'HandwritingCanvas';

export default HandwritingCanvas;
