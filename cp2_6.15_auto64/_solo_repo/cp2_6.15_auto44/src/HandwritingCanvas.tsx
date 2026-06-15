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
    const loadingPosRef = useRef<{ x: number; y: number } | null>(null);
    const loaderAnimRef = useRef<number | null>(null);
    const loaderAngleRef = useRef(0);
    const lastPointRef = useRef<StrokePoint | null>(null);

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

    const drawStroke = useCallback((ctx: CanvasRenderingContext2D, points: StrokePoint[]) => {
      if (points.length === 0) return;

      if (points.length === 1) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, STROKE_WIDTH / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      const n = points.length;
      const fadeStartIdx = Math.floor(n * (1 - FADE_RATIO));
      const fadeCount = n - fadeStartIdx;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (fadeCount <= 1 || n < 4) {
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < n; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        return;
      }

      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i <= fadeStartIdx; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      for (let i = fadeStartIdx + 1; i < n; i++) {
        const t = (i - fadeStartIdx) / fadeCount;
        const alpha = 1 - t;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
        ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
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

      if (!isRecognizing || !loadingPosRef.current) {
        loaderAnimRef.current = null;
        return;
      }

      const { x, y } = loadingPosRef.current;
      const radius = 10;
      const lineWidth = 3;
      const offsetY = -radius - 14;

      loaderAngleRef.current += 0.14;

      ctx.save();
      ctx.translate(x, y + offsetY);
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
      if (isRecognizing && loadingPosRef.current) {
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
        lastPointRef.current = pendingPointRef.current;
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
      lastPointRef.current = pt;
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
        lastPointRef.current = pendingPointRef.current;
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
        lastPointRef.current = pendingPointRef.current;
        pendingPointRef.current = null;
      }

      if (currentStrokeRef.current.length > 0) {
        strokesRef.current.push({ points: [...currentStrokeRef.current] });
      }
      currentStrokeRef.current = [];
      setIsDrawing(false);
      redraw();

      if (strokesRef.current.length > 0 && lastPointRef.current) {
        const lastPt = lastPointRef.current;
        loadingPosRef.current = { x: lastPt.x, y: lastPt.y };

        if (recognizeTimerRef.current !== null) {
          clearTimeout(recognizeTimerRef.current);
        }
        recognizeTimerRef.current = window.setTimeout(() => {
          recognizeTimerRef.current = null;
          const data = strokesRef.current.map(s => ({ points: [...s.points] }));
          onRecognitionStart({ x: lastPt.x, y: lastPt.y });
          onRecognitionComplete('', data);
        }, 200);
      }
    }, [isDrawing, redraw, onRecognitionStart, onRecognitionComplete]);

    const clear = useCallback(() => {
      strokesRef.current = [];
      currentStrokeRef.current = [];
      pendingPointRef.current = null;
      loadingPosRef.current = null;
      lastPointRef.current = null;
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
