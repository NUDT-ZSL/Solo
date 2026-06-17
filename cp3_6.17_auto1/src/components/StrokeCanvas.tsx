import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stroke, getAllStrokes } from '../utils/strokeData';

interface StrokeCanvasProps {
  characters: string;
  speed: 'slow' | 'medium' | 'fast';
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
}

const speedMap = {
  slow: 800,
  medium: 500,
  fast: 300,
};

const COLOR_ACTIVE = '#000000';
const COLOR_COMPLETED = '#9e9e9e';
const COLOR_DOT = '#1565c0';
const THUMBNAIL_SIZE = 80;
const THUMBNAIL_BG = '#f5f5f5';

const StrokeCanvas: React.FC<StrokeCanvasProps> = ({
  characters,
  speed,
  isPlaying,
  onTogglePlay,
  onReset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbnailRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const strokeProgressRef = useRef<number>(0);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [hoveredStroke, setHoveredStroke] = useState<number | null>(null);

  const strokes: Stroke[] = getAllStrokes(characters);
  const strokeDuration = speedMap[speed];

  const drawStroke = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      stroke: Stroke,
      progress: number,
      color: string,
      lineWidth: number = 3
    ) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.startX, stroke.startY);

      if (stroke.type === 'curve' && stroke.controlX !== undefined && stroke.controlY !== undefined) {
        const t = progress;
        const cx = stroke.controlX;
        const cy = stroke.controlY;
        const x = stroke.startX + (cx - stroke.startX) * t * 2 * (1 - t) + (stroke.endX - stroke.startX) * t * t;
        const y = stroke.startY + (cy - stroke.startY) * t * 2 * (1 - t) + (stroke.endY - stroke.startY) * t * t;
        
        if (progress < 0.5) {
          const t1 = progress * 2;
          const x1 = stroke.startX + (cx - stroke.startX) * t1;
          const y1 = stroke.startY + (cy - stroke.startY) * t1;
          ctx.quadraticCurveTo(cx, cy, x1, y1);
        } else {
          ctx.quadraticCurveTo(cx, cy, x, y);
        }
      } else {
        const currentX = stroke.startX + (stroke.endX - stroke.startX) * progress;
        const currentY = stroke.startY + (stroke.endY - stroke.startY) * progress;
        ctx.lineTo(currentX, currentY);
      }

      ctx.stroke();
      ctx.restore();
    },
    []
  );

  const drawDot = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, label: string, scale: number = 1) => {
      ctx.save();
      ctx.fillStyle = COLOR_DOT;
      ctx.beginPath();
      ctx.arc(x, y, 8 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${11 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5 * scale);
      ctx.restore();
    },
    []
  );

  const drawAll = useCallback(
    (activeIndex: number, activeProgress: number, hoverIdx: number | null = null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      strokes.forEach((stroke, index) => {
        let color = COLOR_COMPLETED;
        let progress = 1;
        let scale = 1;

        if (index === activeIndex) {
          color = COLOR_ACTIVE;
          progress = activeProgress;
        } else if (index > activeIndex) {
          color = 'rgba(0,0,0,0.08)';
          progress = 1;
        }

        if (hoverIdx === index) {
          color = '#1565c0';
          scale = 1.2;
        }

        drawStroke(ctx, stroke, progress, color, 3 * scale);

        if (index <= activeIndex || hoverIdx === index) {
          drawDot(ctx, stroke.startX, stroke.startY, String(stroke.id), scale);
        }
      });

      const thumbnail = thumbnailRef.current;
      if (thumbnail) {
        const tctx = thumbnail.getContext('2d');
        if (tctx) {
          tctx.clearRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
          tctx.fillStyle = THUMBNAIL_BG;
          tctx.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

          const scaleX = THUMBNAIL_SIZE / 640;
          const scaleY = THUMBNAIL_SIZE / 480;

          strokes.forEach((stroke, index) => {
            const adjusted: Stroke = {
              ...stroke,
              startX: stroke.startX * scaleX,
              startY: stroke.startY * scaleY,
              endX: stroke.endX * scaleX,
              endY: stroke.endY * scaleY,
              controlX: stroke.controlX !== undefined ? stroke.controlX * scaleX : undefined,
              controlY: stroke.controlY !== undefined ? stroke.controlY * scaleY : undefined,
            };

            let color = '#e0e0e0';
            let progress = 1;
            if (index < activeIndex) {
              color = '#8d6e63';
            } else if (index === activeIndex) {
              color = '#8d6e63';
              progress = activeProgress;
            }
            drawStroke(tctx, adjusted, progress, color, 1.5);
          });
        }
      }
    },
    [strokes, drawStroke, drawDot]
  );

  const animate = useCallback(
    (timestamp: number) => {
      if (!isPlaying) {
        lastTimeRef.current = timestamp;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      strokeProgressRef.current += delta / strokeDuration;

      if (strokeProgressRef.current >= 1) {
        strokeProgressRef.current = 0;
        setCurrentStrokeIndex((prev) => {
          const next = prev + 1;
          if (next >= strokes.length) {
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
              animationRef.current = null;
            }
            drawAll(strokes.length - 1, 1);
            return prev;
          }
          return next;
        });
      }

      drawAll(currentStrokeIndex, Math.min(strokeProgressRef.current, 1));

      if (animationRef.current === null && currentStrokeIndex < strokes.length - 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (currentStrokeIndex < strokes.length || strokeProgressRef.current < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    },
    [isPlaying, strokeDuration, strokes.length, currentStrokeIndex, drawAll]
  );

  useEffect(() => {
    setCurrentStrokeIndex(0);
    strokeProgressRef.current = 0;
    lastTimeRef.current = 0;
  }, [characters]);

  useEffect(() => {
    if (strokes.length === 0) return;

    if (isPlaying) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      drawAll(currentStrokeIndex, strokeProgressRef.current, hoveredStroke);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, animate, strokes.length, currentStrokeIndex, drawAll, hoveredStroke]);

  useEffect(() => {
    drawAll(currentStrokeIndex, strokeProgressRef.current, hoveredStroke);
  }, [characters, drawAll, currentStrokeIndex, hoveredStroke]);

  const getStrokeAtPosition = (x: number, y: number): number | null => {
    const threshold = 15;
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      const dx = s.endX - s.startX;
      const dy = s.endY - s.startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) continue;

      const t = Math.max(0, Math.min(1, ((x - s.startX) * dx + (y - s.startY) * dy) / (length * length)));
      const px = s.startX + t * dx;
      const py = s.startY + t * dy;
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

      if (dist < threshold) return i;
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isPlaying) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const idx = getStrokeAtPosition(x, y);
    setHoveredStroke(idx);
  };

  const handleMouseLeave = () => {
    setHoveredStroke(null);
  };

  const totalStrokes = strokes.length;
  const displayCurrent = Math.min(currentStrokeIndex + 1, totalStrokes);
  const hoveredStrokeData = hoveredStroke !== null ? strokes[hoveredStroke] : null;

  return (
    <div className="canvas-wrapper">
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: isPlaying ? 'default' : 'pointer' }}
        />
        <div className="thumbnail-container">
          <canvas ref={thumbnailRef} width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} />
          <div className="stroke-info">
            <div className="stroke-count" style={{ fontSize: '14px', color: '#424242' }}>
              第 {displayCurrent} 笔 / 共 {totalStrokes} 笔
            </div>
            {hoveredStrokeData && (
              <div className="hover-tip" style={{ fontSize: '13px', color: '#1565c0', marginTop: '4px' }}>
                第{hoveredStrokeData.id}笔：{hoveredStrokeData.name}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="controls">
        <button className="ctrl-btn" onClick={onTogglePlay}>
          {isPlaying ? '暂停' : currentStrokeIndex >= totalStrokes - 1 && strokeProgressRef.current >= 1 ? '重新播放' : '继续'}
        </button>
        <button className="ctrl-btn" onClick={onReset}>
          重置
        </button>
      </div>
      <style>{`
        .canvas-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .canvas-container {
          position: relative;
          width: 640px;
          max-width: 96%;
          background: #ffffff;
          box-shadow: inset 0 0 0 8px #e0d8c8;
          border-radius: 4px;
        }
        .canvas-container canvas {
          display: block;
          width: 100%;
          height: auto;
        }
        .thumbnail-container {
          position: absolute;
          left: 16px;
          bottom: 16px;
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }
        .thumbnail-container canvas {
          width: ${THUMBNAIL_SIZE}px;
          height: ${THUMBNAIL_SIZE}px;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .stroke-info {
          background: rgba(255,255,255,0.9);
          padding: 6px 10px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .hover-tip {
          transition: all 0.2s ease;
          transform: scale(1);
        }
        .controls {
          display: flex;
          gap: 12px;
        }
        .ctrl-btn {
          padding: 8px 20px;
          border-radius: 6px;
          border: none;
          background: #8d6e63;
          color: #ffffff;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .ctrl-btn:hover {
          background: #6d4c41;
        }
        @media (max-width: 768px) {
          .canvas-container {
            width: 96%;
          }
        }
      `}</style>
    </div>
  );
};

export default StrokeCanvas;
