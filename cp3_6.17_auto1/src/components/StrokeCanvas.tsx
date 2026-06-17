import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

export interface Stroke {
  id: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
  direction: string;
  control?: { x: number; y: number };
}

interface StrokeCanvasProps {
  strokes: Stroke[];
  speed: 'slow' | 'medium' | 'fast';
  isPlaying: boolean;
  onComplete: () => void;
  onStrokeChange: (current: number, total: number) => void;
}

const SPEED_MAP = {
  slow: 0.8,
  medium: 0.5,
  fast: 0.3,
};

const MAIN_WIDTH = 640;
const MAIN_HEIGHT = 480;
const THUMB_SIZE = 80;

const StrokeCanvas: React.FC<StrokeCanvasProps> = ({
  strokes,
  speed,
  isPlaying,
  onComplete,
  onStrokeChange,
}) => {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const currentStrokeRef = useRef<number>(0);
  const strokeProgressRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const speedRef = useRef<number>(SPEED_MAP[speed]);
  const strokesRef = useRef<Stroke[]>(strokes);

  const [hoveredStroke, setHoveredStroke] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const pathCache = useMemo(() => {
    const cache: Map<number, Path2D> = new Map();
    strokes.forEach((stroke) => {
      const path = new Path2D();
      path.moveTo(stroke.start.x, stroke.start.y);
      if (stroke.control) {
        path.quadraticCurveTo(
          stroke.control.x,
          stroke.control.y,
          stroke.end.x,
          stroke.end.y
        );
      } else {
        path.lineTo(stroke.end.x, stroke.end.y);
      }
      cache.set(stroke.id, path);
    });
    return cache;
  }, [strokes]);

  const hitTestCache = useMemo(() => {
    return strokes.map((stroke, index) => {
      const hitPath = new Path2D();
      hitPath.moveTo(stroke.start.x, stroke.start.y);
      if (stroke.control) {
        hitPath.quadraticCurveTo(
          stroke.control.x,
          stroke.control.y,
          stroke.end.x,
          stroke.end.y
        );
      } else {
        hitPath.lineTo(stroke.end.x, stroke.end.y);
      }
      return {
        path: hitPath,
        index,
        stroke,
      };
    });
  }, [strokes]);

  useEffect(() => {
    speedRef.current = SPEED_MAP[speed];
  }, [speed]);

  useEffect(() => {
    strokesRef.current = strokes;
    currentStrokeRef.current = 0;
    strokeProgressRef.current = 0;
  }, [strokes]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (!isPlaying) {
      lastTimeRef.current = 0;
    }
  }, [isPlaying]);

  const getPointOnStroke = useCallback(
    (stroke: Stroke, t: number): { x: number; y: number } => {
      if (stroke.control) {
        const x =
          Math.pow(1 - t, 2) * stroke.start.x +
          2 * (1 - t) * t * stroke.control.x +
          Math.pow(t, 2) * stroke.end.x;
        const y =
          Math.pow(1 - t, 2) * stroke.start.y +
          2 * (1 - t) * t * stroke.control.y +
          Math.pow(t, 2) * stroke.end.y;
        return { x, y };
      } else {
        return {
          x: stroke.start.x + (stroke.end.x - stroke.start.x) * t,
          y: stroke.start.y + (stroke.end.y - stroke.start.y) * t,
        };
      }
    },
    []
  );

  const drawMainCanvas = useCallback(
    (currentStrokeIndex: number, progress: number) => {
      const canvas = mainCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, MAIN_WIDTH, MAIN_HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, MAIN_WIDTH, MAIN_HEIGHT);

      ctx.shadowColor = '#e0d8c8';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillRect(4, 4, MAIN_WIDTH - 8, MAIN_HEIGHT - 8);
      ctx.shadowColor = 'transparent';

      for (let i = 0; i < currentStrokeIndex; i++) {
        const stroke = strokesRef.current[i];
        const path = pathCache.get(stroke.id);
        if (path) {
          ctx.strokeStyle = '#9e9e9e';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke(path);
        }
      }

      if (currentStrokeIndex < strokesRef.current.length) {
        const stroke = strokesRef.current[currentStrokeIndex];
        const currentPoint = getPointOnStroke(stroke, progress);

        const animPath = new Path2D();
        animPath.moveTo(stroke.start.x, stroke.start.y);
        if (stroke.control) {
          const t = progress;
          const cp1x = stroke.start.x + (stroke.control.x - stroke.start.x) * t;
          const cp1y = stroke.start.y + (stroke.control.y - stroke.start.y) * t;
          const cp2x = stroke.control.x + (stroke.end.x - stroke.control.x) * t;
          const cp2y = stroke.control.y + (stroke.end.y - stroke.control.y) * t;
          const midX = cp1x + (cp2x - cp1x) * t;
          const midY = cp1y + (cp2y - cp1y) * t;

          const tempPath = new Path2D();
          tempPath.moveTo(stroke.start.x, stroke.start.y);
          tempPath.quadraticCurveTo(cp1x, cp1y, midX, midY);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke(tempPath);
        } else {
          const tempPath = new Path2D();
          tempPath.moveTo(stroke.start.x, stroke.start.y);
          tempPath.lineTo(currentPoint.x, currentPoint.y);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke(tempPath);
        }

        ctx.beginPath();
        ctx.arc(stroke.start.x, stroke.start.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#1565c0';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(currentStrokeIndex + 1), stroke.start.x, stroke.start.y);
      }
    },
    [pathCache, getPointOnStroke]
  );

  const drawThumbnail = useCallback(
    (currentStrokeIndex: number) => {
      const canvas = thumbCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);

      const scaleX = THUMB_SIZE / MAIN_WIDTH;
      const scaleY = THUMB_SIZE / MAIN_HEIGHT;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (THUMB_SIZE - MAIN_WIDTH * scale) / 2;
      const offsetY = (THUMB_SIZE - MAIN_HEIGHT * scale) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      strokesRef.current.forEach((stroke, index) => {
        const path = pathCache.get(stroke.id);
        if (path) {
          ctx.strokeStyle = index < currentStrokeIndex ? '#9e9e9e' : '#000000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke(path);
        }
      });

      ctx.restore();
    },
    [pathCache]
  );

  const animate = useCallback(
    (timestamp: number) => {
      if (!isPlayingRef.current) {
        animationRef.current = null;
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const strokeDuration = speedRef.current;
      strokeProgressRef.current += deltaTime / strokeDuration;

      let currentStroke = currentStrokeRef.current;

      while (strokeProgressRef.current >= 1 && currentStroke < strokesRef.current.length) {
        strokeProgressRef.current -= 1;
        currentStroke++;
        currentStrokeRef.current = currentStroke;
        onStrokeChange(currentStroke, strokesRef.current.length);
      }

      if (currentStroke >= strokesRef.current.length) {
        drawMainCanvas(strokesRef.current.length, 1);
        drawThumbnail(strokesRef.current.length);
        onComplete();
        animationRef.current = null;
        return;
      }

      drawMainCanvas(currentStroke, Math.min(strokeProgressRef.current, 1));
      drawThumbnail(currentStroke);

      animationRef.current = requestAnimationFrame(animate);
    },
    [drawMainCanvas, drawThumbnail, onComplete, onStrokeChange]
  );

  useEffect(() => {
    if (isPlaying) {
      if (currentStrokeRef.current >= strokesRef.current.length) {
        currentStrokeRef.current = 0;
        strokeProgressRef.current = 0;
        onStrokeChange(0, strokesRef.current.length);
      }
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, animate, onStrokeChange, strokes.length]);

  useEffect(() => {
    if (!isPlaying) {
      drawMainCanvas(currentStrokeRef.current, strokeProgressRef.current);
      drawThumbnail(currentStrokeRef.current);
    }
  }, [isPlaying, drawMainCanvas, drawThumbnail]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPlaying) return;

      const canvas = mainCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = MAIN_WIDTH / rect.width;
      const scaleY = MAIN_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let found = false;
      for (let i = 0; i <= currentStrokeRef.current && i < hitTestCache.length; i++) {
        ctx.lineWidth = 10;
        if (ctx.isPointInStroke(hitTestCache[i].path, x, y)) {
          setHoveredStroke(i);
          setTooltipPos({ x: e.clientX, y: e.clientY });
          found = true;
          break;
        }
      }
      if (!found) {
        setHoveredStroke(null);
      }
    },
    [isPlaying, hitTestCache]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredStroke(null);
  }, []);

  return (
    <div style={{ display: 'inline-block', position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative' }}>
          <canvas
            ref={mainCanvasRef}
            width={MAIN_WIDTH}
            height={MAIN_HEIGHT}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              display: 'block',
              margin: '0 auto',
              maxWidth: '96%',
              height: 'auto',
              boxShadow: 'inset 0 0 8px #e0d8c8',
              backgroundColor: '#ffffff',
            }}
          />
          {hoveredStroke !== null && (
            <div
              style={{
                position: 'fixed',
                left: tooltipPos.x + 10,
                top: tooltipPos.y - 30,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                transform: hoveredStroke !== null ? 'scale(1)' : 'scale(0.8)',
                opacity: hoveredStroke !== null ? 1 : 0,
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                pointerEvents: 'none',
              }}
            >
              第 {hoveredStroke + 1} 笔 - {strokes[hoveredStroke]?.direction || ''}
            </div>
          )}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: -THUMB_SIZE - 20,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <canvas
            ref={thumbCanvasRef}
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            style={{
              display: 'block',
              backgroundColor: '#f5f5f5',
            }}
          />
          <div
            style={{
              fontSize: '14px',
              color: '#424242',
              fontWeight: 500,
            }}
          >
            第 {Math.min(currentStrokeRef.current + 1, strokes.length)} 笔 / 共 {strokes.length} 笔
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrokeCanvas;
