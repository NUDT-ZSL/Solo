import { useRef, useEffect, useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { Point, Stroke } from './App';

interface CanvasProps {
  userId: string;
  color: string;
  thickness: number;
  strokes: Stroke[];
  onStrokeStart: (stroke: Stroke) => void;
  onStrokePoint: (strokeId: string, point: Point) => void;
  onStrokeEnd: (strokeId: string) => void;
  isPlaying: boolean;
  playbackProgress: number;
}

function Canvas({
  userId,
  color,
  thickness,
  strokes,
  onStrokeStart,
  onStrokePoint,
  onStrokeEnd,
  isPlaying,
  playbackProgress,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const currentStrokeId = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, timestamp: Date.now() };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
      timestamp: Date.now(),
    };
  }, []);

  const drawLine = useCallback((
    ctx: CanvasRenderingContext2D,
    points: Point[],
    strokeColor: string,
    strokeThickness: number,
    alpha: string,
  ) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = strokeColor + alpha;
    ctx.lineWidth = strokeThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    if (points.length === 2) {
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
    ctx.stroke();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let startTime = Infinity;
    let endTime = 0;
    for (const s of strokes) {
      if (s.startTime < startTime) startTime = s.startTime;
      if (s.endTime > endTime) endTime = s.endTime;
    }

    const totalDuration = endTime - startTime;

    if (isPlaying && totalDuration > 0 && strokes.length > 0) {
      const targetTime = startTime + totalDuration * playbackProgress;
      const targetTime2x = startTime + totalDuration * playbackProgress * 2;
      const actualTarget = Math.min(targetTime2x, endTime);

      for (const stroke of strokes) {
        const alpha = stroke.userId === userId ? '66' : '33';
        let visiblePoints: Point[] = [];
        for (const pt of stroke.points) {
          if (pt.timestamp <= actualTarget) {
            visiblePoints.push(pt);
          } else {
            break;
          }
        }
        if (visiblePoints.length >= 1 && stroke.points.indexOf(visiblePoints[0]) === 0) {
          if (visiblePoints.length === 1) {
            visiblePoints = [visiblePoints[0], visiblePoints[0]];
          }
          drawLine(ctx, visiblePoints, stroke.color, stroke.thickness, alpha);
        }
      }
    } else {
      for (const stroke of strokes) {
        const alpha = stroke.userId === userId ? '66' : '33';
        if (stroke.points.length >= 1) {
          const pts = stroke.points.length === 1
            ? [stroke.points[0], stroke.points[0]]
            : stroke.points;
          drawLine(ctx, pts, stroke.color, stroke.thickness, alpha);
        }
      }
    }

    animationFrameRef.current = null;
  }, [strokes, userId, isPlaying, playbackProgress, drawLine]);

  useEffect(() => {
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(render);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [render]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDrawing = useCallback((x: number, y: number) => {
    if (isPlaying) return;
    setDrawing(true);
    const id = nanoid();
    currentStrokeId.current = id;
    const startPoint = getCanvasPoint(x, y);
    const stroke: Stroke = {
      id,
      userId,
      color,
      thickness,
      points: [startPoint],
      startTime: startPoint.timestamp,
      endTime: startPoint.timestamp,
    };
    onStrokeStart(stroke);
  }, [isPlaying, userId, color, thickness, getCanvasPoint, onStrokeStart]);

  const continueDrawing = useCallback((x: number, y: number) => {
    if (!drawing || !currentStrokeId.current || isPlaying) return;
    const point = getCanvasPoint(x, y);
    onStrokePoint(currentStrokeId.current, point);
  }, [drawing, isPlaying, getCanvasPoint, onStrokePoint]);

  const stopDrawing = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    if (currentStrokeId.current) {
      onStrokeEnd(currentStrokeId.current);
      currentStrokeId.current = null;
    }
  }, [drawing, onStrokeEnd]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startDrawing(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    continueDrawing(e.clientX, e.clientY);
  };

  const handleMouseUp = () => stopDrawing();
  const handleMouseLeave = () => stopDrawing();

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      startDrawing(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      continueDrawing(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    stopDrawing();
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 80,
        right: 0,
        bottom: 80,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isPlaying ? 'default' : 'crosshair',
          touchAction: 'none',
        }}
      />
    </div>
  );
}

export default Canvas;
