import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import {
  StrokeData,
  StrokePoint,
  sampleStrokePath,
} from '../utils/strokeData';

interface StrokeCanvasProps {
  strokes: StrokeData[];
  speed: number;
  onSpeedChange: (speed: number) => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
}

type HighlightState = {
  strokeIndex: number;
  startTime: number;
  duration: number;
} | null;

const StrokeCanvas: React.FC<StrokeCanvasProps> = ({
  strokes,
  speed,
  onSpeedChange,
  isPlaying,
  onPlayingChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbnailRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const currentStrokeRef = useRef<number>(0);
  const strokeProgressRef = useRef<number>(0);
  const highlightRef = useRef<HighlightState>(null);

  const [hoveredStroke, setHoveredStroke] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [completedStrokes, setCompletedStrokes] = useState<number>(0);
  const [currentStrokeNum, setCurrentStrokeNum] = useState<number>(0);

  const strokePaths = useMemo(() => {
    return strokes.map((s) => sampleStrokePath(s, 80));
  }, [strokes]);

  const strokeBounds = useMemo(() => {
    return strokePaths.map((points) => {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const p of points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      return { minX, maxX, minY, maxY };
    });
  }, [strokePaths]);

  const getCanvasCoords = useCallback((normX: number, normY: number, ctx: CanvasRenderingContext2D) => {
    const padding = 48;
    const size = Math.min(ctx.canvas.width, ctx.canvas.height) - padding * 2;
    const offsetX = (ctx.canvas.width - size) / 2;
    const offsetY = (ctx.canvas.height - size) / 2;
    return {
      x: offsetX + normX * size,
      y: offsetY + normY * size,
    };
  }, []);

  const drawStrokePath = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      points: StrokePoint[],
      progress: number,
      color: string,
      lineWidth: number = 3,
    ) => {
      if (points.length < 2) return;

      const totalPoints = points.length;
      const endIdx = Math.min(Math.floor(progress * totalPoints), totalPoints - 1);
      if (endIdx < 1) return;

      const partialProgress = (progress * totalPoints) - endIdx;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const start = getCanvasCoords(points[0].x, points[0].y, ctx);
      ctx.moveTo(start.x, start.y);

      for (let i = 1; i <= endIdx; i++) {
        const p = getCanvasCoords(points[i].x, points[i].y, ctx);
        ctx.lineTo(p.x, p.y);
      }

      if (partialProgress > 0 && endIdx < totalPoints - 1) {
        const curr = points[endIdx];
        const next = points[endIdx + 1];
        const cx = getCanvasCoords(
          curr.x + (next.x - curr.x) * partialProgress,
          curr.y + (next.y - curr.y) * partialProgress,
          ctx,
        );
        ctx.lineTo(cx.x, cx.y);
      }

      ctx.stroke();
    },
    [getCanvasCoords],
  );

  const drawDot = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      label: string,
      scale: number = 1,
      alpha: number = 1,
    ) => {
      const pos = getCanvasCoords(x, y, ctx);
      const baseRadius = 10;
      const radius = baseRadius * scale;

      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.fillStyle = '#1565c0';
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(11 * scale)}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pos.x, pos.y + 0.5);

      ctx.restore();
    },
    [getCanvasCoords],
  );

  const renderScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (strokes.length === 0) {
      ctx.fillStyle = '#9e9e9e';
      ctx.font = '18px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请在上方输入简体汉字', canvas.width / 2, canvas.height / 2);
      return;
    }

    const currentHighlight = highlightRef.current;
    const now = performance.now();

    for (let i = 0; i < strokes.length; i++) {
      const path = strokePaths[i];
      if (!path || path.length === 0) continue;

      let color = '#9e9e9e';
      let lineWidth = 3;

      if (i < currentStrokeRef.current) {
        if (currentHighlight && currentHighlight.strokeIndex === i) {
          const elapsed = now - currentHighlight.startTime;
          const t = elapsed / currentHighlight.duration;
          if (t < 1) {
            const pulse = Math.sin(t * Math.PI) * 0.6 + 0.4;
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            drawStrokePath(ctx, path, 1, `rgba(187, 222, 251, ${pulse})`, 14);
            ctx.restore();
            color = '#1976d2';
            lineWidth = 4;
          }
        }
      } else if (i === currentStrokeRef.current) {
        color = '#212121';
        lineWidth = 3;
        drawStrokePath(ctx, path, strokeProgressRef.current, color, lineWidth);

        const startPoint = strokes[i].segments[0].from;
        const scale = hoveredStroke === i ? 1.2 : 1;
        drawDot(ctx, startPoint.x, startPoint.y, String(i + 1), scale);

        continue;
      } else {
        color = '#212121';
        lineWidth = 3;
      }

      drawStrokePath(ctx, path, 1, color, lineWidth);

      if (i < currentStrokeRef.current) {
        const startPoint = strokes[i].segments[0].from;
        const scale = hoveredStroke === i ? 1.2 : 1;
        const alpha = hoveredStroke === i ? 1 : 0.85;
        drawDot(ctx, startPoint.x, startPoint.y, String(i + 1), scale, alpha);
      }
    }
  }, [strokes, strokePaths, hoveredStroke, drawStrokePath, drawDot]);

  const renderThumbnail = useCallback(() => {
    const canvas = thumbnailRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (strokes.length === 0) return;

    const padding = 6;
    const size = Math.min(canvas.width, canvas.height) - padding * 2;
    const offsetX = (canvas.width - size) / 2;
    const offsetY = (canvas.height - size) / 2;

    const getPos = (normX: number, normY: number) => ({
      x: offsetX + normX * size,
      y: offsetY + normY * size,
    });

    for (let i = 0; i < strokes.length; i++) {
      const path = strokePaths[i];
      if (!path || path.length < 2) continue;

      let color: string;
      let lineWidth: number;

      if (i < currentStrokeRef.current) {
        color = '#9e9e9e';
        lineWidth = 2;
      } else if (i === currentStrokeRef.current && isPlaying) {
        color = '#212121';
        lineWidth = 2;
      } else {
        color = '#e0e0e0';
        lineWidth = 2;
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const start = getPos(path[0].x, path[0].y);
      ctx.moveTo(start.x, start.y);

      const totalPoints = path.length;
      const endIdx = i === currentStrokeRef.current && isPlaying
        ? Math.min(Math.floor(strokeProgressRef.current * totalPoints), totalPoints - 1)
        : totalPoints - 1;

      for (let j = 1; j <= endIdx; j++) {
        const p = getPos(path[j].x, path[j].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }, [strokes, strokePaths, isPlaying]);

  const renderFull = useCallback(() => {
    renderScene();
    renderThumbnail();
  }, [renderScene, renderThumbnail]);

  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    const now = performance.now();
    const currentHighlight = highlightRef.current;
    if (currentHighlight && now - currentHighlight.startTime >= currentHighlight.duration) {
      highlightRef.current = null;
    }

    if (isPlaying && strokes.length > 0) {
      const speedMs = speed * 1000;
      const progressDelta = delta / speedMs;
      strokeProgressRef.current += progressDelta;

      if (strokeProgressRef.current >= 1) {
        highlightRef.current = {
          strokeIndex: currentStrokeRef.current,
          startTime: now,
          duration: 300,
        };

        strokeProgressRef.current = 0;
        currentStrokeRef.current++;
        setCompletedStrokes(currentStrokeRef.current);

        if (currentStrokeRef.current >= strokes.length) {
          currentStrokeRef.current = strokes.length;
          strokeProgressRef.current = 0;
          setCompletedStrokes(strokes.length);
          onPlayingChange(false);
          setCurrentStrokeNum(0);
          renderFull();
          return;
        }
        setCurrentStrokeNum(currentStrokeRef.current + 1);
      }
    }

    renderFull();

    if (isPlaying || highlightRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, strokes, speed, onPlayingChange, renderFull]);

  const resetAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    currentStrokeRef.current = 0;
    strokeProgressRef.current = 0;
    highlightRef.current = null;
    lastTimeRef.current = 0;
    setCompletedStrokes(0);
    setCurrentStrokeNum(0);
    setHoveredStroke(null);
    setTooltipVisible(false);
  }, []);

  useEffect(() => {
    resetAnimation();
    if (strokes.length > 0) {
      setCurrentStrokeNum(1);
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      renderFull();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [strokes]);

  useEffect(() => {
    if (strokes.length === 0) return;

    if (isPlaying) {
      lastTimeRef.current = 0;
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      renderFull();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying && !highlightRef.current) {
      renderFull();
    }
  }, [hoveredStroke, speed]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPlaying || strokes.length === 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const padding = 48;
      const size = Math.min(canvas.width, canvas.height) - padding * 2;
      const offsetX = (canvas.width - size) / 2;
      const offsetY = (canvas.height - size) / 2;

      const hitRadius = 16;
      let found: number | null = null;

      for (let i = strokes.length - 1; i >= 0; i--) {
        const bounds = strokeBounds[i];
        if (!bounds) continue;

        const bx1 = offsetX + bounds.minX * size - hitRadius;
        const by1 = offsetY + bounds.minY * size - hitRadius;
        const bx2 = offsetX + bounds.maxX * size + hitRadius;
        const by2 = offsetY + bounds.maxY * size + hitRadius;

        if (mouseX < bx1 || mouseX > bx2 || mouseY < by1 || mouseY > by2) continue;

        const path = strokePaths[i];
        if (!path) continue;

        for (const point of path) {
          const px = offsetX + point.x * size;
          const py = offsetY + point.y * size;
          const dx = mouseX - px;
          const dy = mouseY - py;
          if (dx * dx + dy * dy <= hitRadius * hitRadius) {
            found = i;
            break;
          }
        }
        if (found !== null) break;
      }

      if (found !== hoveredStroke) {
        setHoveredStroke(found);
      }

      if (found !== null) {
        setTooltipPos({ x: e.clientX + 14, y: e.clientY + 14 });
        setTooltipVisible(true);
      } else {
        setTooltipVisible(false);
      }
    },
    [isPlaying, strokes, strokePaths, strokeBounds, hoveredStroke],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredStroke(null);
    setTooltipVisible(false);
  }, []);

  const handleRestart = useCallback(() => {
    resetAnimation();
    if (strokes.length > 0) {
      setCurrentStrokeNum(1);
      onPlayingChange(true);
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [strokes, resetAnimation, onPlayingChange, animate]);

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSpeedChange(parseFloat(e.target.value));
    },
    [onSpeedChange],
  );

  const displayStrokeNum = isPlaying
    ? currentStrokeNum
    : completedStrokes >= strokes.length && strokes.length > 0
    ? strokes.length
    : completedStrokes > 0
    ? completedStrokes
    : 0;

  return (
    <div className="canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="main-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      <div className="thumbnail-panel">
        <div className="thumbnail-box">
          <canvas ref={thumbnailRef} width={80} height={80} className="thumbnail-canvas" />
        </div>
        {strokes.length > 0 && (
          <div className="progress-text">
            第 {displayStrokeNum || completedStrokes} 笔
            <br />
            共 {strokes.length} 笔
          </div>
        )}
      </div>

      <div className="control-panel">
        <div className="speed-control">
          <span className="speed-label">书写速度</span>
          <input
            type="range"
            min="0.3"
            max="1.0"
            step="0.1"
            value={speed}
            onChange={handleSpeedChange}
            className="speed-slider"
          />
          <span className="speed-value">{speed.toFixed(1)} 秒/笔</span>
        </div>
        <div className="button-group">
          <button
            className="control-btn"
            onClick={() => onPlayingChange(!isPlaying)}
            disabled={strokes.length === 0 || currentStrokeRef.current >= strokes.length}
          >
            {isPlaying ? (
              <>
                <Pause size={16} />
                暂停
              </>
            ) : (
              <>
                <Play size={16} />
                继续
              </>
            )}
          </button>
          <button
            className="secondary-btn"
            onClick={handleRestart}
            disabled={strokes.length === 0}
          >
            <RotateCcw size={14} />
            重新
          </button>
        </div>
      </div>

      <div
        className={`tooltip ${tooltipVisible && hoveredStroke !== null && strokes[hoveredStroke] ? 'visible' : ''}`}
        style={{ left: tooltipPos.x, top: tooltipPos.y }}
      >
        {hoveredStroke !== null && strokes[hoveredStroke] && (
          <>
            <span className="tooltip-stroke-number">{hoveredStroke + 1}</span>
            {strokes[hoveredStroke].direction}
          </>
        )}
      </div>
    </div>
  );
};

export default StrokeCanvas;
