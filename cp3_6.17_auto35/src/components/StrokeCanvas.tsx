import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { CharacterStrokes, Stroke, StrokePoint } from '../utils/strokeData';

interface StrokeCanvasProps {
  characters: CharacterStrokes[];
  speed: number;
  isPaused: boolean;
  onProgressChange?: (currentStroke: number, totalStrokes: number) => void;
}

interface HoverInfo {
  strokeNumber: number;
  direction: string;
  x: number;
  y: number;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const THUMBNAIL_SIZE = 80;

function getPointOnPath(points: StrokePoint[], progress: number): StrokePoint {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  if (progress <= 0) return points[0];
  if (progress >= 1) return points[points.length - 1];

  let totalLength = 0;
  const segmentLengths: number[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const length = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(length);
    totalLength += length;
  }

  const targetLength = totalLength * progress;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulated + segmentLengths[i] >= targetLength) {
      const segmentProgress = (targetLength - accumulated) / segmentLengths[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segmentProgress,
        y: points[i].y + (points[i + 1].y - points[i].y) * segmentProgress
      };
    }
    accumulated += segmentLengths[i];
  }

  return points[points.length - 1];
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  progress: number,
  color: string,
  lineWidth: number
) {
  if (stroke.points.length < 2) return;

  const drawProgress = Math.max(0, Math.min(1, progress));
  const totalSegments = stroke.points.length - 1;
  const segmentsToDraw = Math.floor(drawProgress * totalSegments);
  const lastSegmentProgress = (drawProgress * totalSegments) - segmentsToDraw;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let i = 0; i <= segmentsToDraw && i < totalSegments; i++) {
    if (i < segmentsToDraw) {
      ctx.lineTo(stroke.points[i + 1].x, stroke.points[i + 1].y);
    } else {
      const endX = stroke.points[i].x + (stroke.points[i + 1].x - stroke.points[i].x) * lastSegmentProgress;
      const endY = stroke.points[i].y + (stroke.points[i + 1].y - stroke.points[i].y) * lastSegmentProgress;
      ctx.lineTo(endX, endY);
    }
  }

  ctx.stroke();
}

function isPointNearStroke(px: number, py: number, stroke: Stroke, threshold: number): boolean {
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const x1 = stroke.points[i].x;
    const y1 = stroke.points[i].y;
    const x2 = stroke.points[i + 1].x;
    const y2 = stroke.points[i + 1].y;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      const dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
      if (dist <= threshold) return true;
      continue;
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);

    if (dist <= threshold) return true;
  }
  return false;
}

export default function StrokeCanvas({ characters, speed, isPaused, onProgressChange }: StrokeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [strokeProgress, setStrokeProgress] = useState(0);

  const allStrokes = useMemo(() => {
    const strokes: Stroke[] = [];
    for (const char of characters) {
      strokes.push(...char.strokes);
    }
    return strokes;
  }, [characters]);

  const totalStrokes = allStrokes.length;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let i = 0; i < allStrokes.length; i++) {
      const stroke = allStrokes[i];

      if (i < currentStrokeIndex) {
        drawStroke(ctx, stroke, 1, '#9e9e9e', 3);
      } else if (i === currentStrokeIndex) {
        drawStroke(ctx, stroke, strokeProgress, '#000000', 3);
      }
    }

    for (let i = 0; i < allStrokes.length; i++) {
      const stroke = allStrokes[i];
      const startPoint = stroke.points[0];

      if (i <= currentStrokeIndex) {
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#1565c0';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(stroke.strokeNumber), startPoint.x, startPoint.y);
      }
    }

    const thumbnailX = 20;
    const thumbnailY = CANVAS_HEIGHT - THUMBNAIL_SIZE - 20;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(thumbnailX, thumbnailY, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

    const scaleX = THUMBNAIL_SIZE / CANVAS_WIDTH;
    const scaleY = THUMBNAIL_SIZE / CANVAS_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = thumbnailX + (THUMBNAIL_SIZE - CANVAS_WIDTH * scale) / 2;
    const offsetY = thumbnailY + (THUMBNAIL_SIZE - CANVAS_HEIGHT * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    for (let i = 0; i < allStrokes.length; i++) {
      const stroke = allStrokes[i];
      if (i < currentStrokeIndex) {
        drawStroke(ctx, stroke, 1, '#8d6e63', 8);
      } else if (i === currentStrokeIndex) {
        drawStroke(ctx, stroke, strokeProgress, '#8d6e63', 8);
      } else {
        drawStroke(ctx, stroke, 1, '#e0d8c8', 8);
      }
    }

    ctx.restore();

    if (hoverInfo && isPaused) {
      const padding = 8;
      const text1 = `第 ${hoverInfo.strokeNumber} 笔`;
      const text2 = hoverInfo.direction;

      ctx.font = '14px sans-serif';
      const width1 = ctx.measureText(text1).width;
      const width2 = ctx.measureText(text2).width;
      const boxWidth = Math.max(width1, width2) + padding * 2;
      const boxHeight = 48;

      let boxX = hoverInfo.x + 15;
      let boxY = hoverInfo.y - boxHeight / 2;

      if (boxX + boxWidth > CANVAS_WIDTH) {
        boxX = hoverInfo.x - boxWidth - 15;
      }
      if (boxY < 0) boxY = 0;
      if (boxY + boxHeight > CANVAS_HEIGHT) boxY = CANVAS_HEIGHT - boxHeight;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text1, boxX + padding, boxY + 6);

      ctx.font = '14px sans-serif';
      ctx.fillText(text2, boxX + padding, boxY + 26);
    }
  }, [allStrokes, currentStrokeIndex, strokeProgress, hoverInfo, isPaused]);

  useEffect(() => {
    if (allStrokes.length === 0) {
      setCurrentStrokeIndex(0);
      setStrokeProgress(0);
      if (onProgressChange) onProgressChange(0, 0);
      render();
      return;
    }

    if (isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current - pausedTimeRef.current;
      const strokeDuration = speed * 1000;

      const totalElapsedStrokes = elapsed / strokeDuration;
      const newStrokeIndex = Math.min(Math.floor(totalElapsedStrokes), allStrokes.length - 1);
      const newStrokeProgress = Math.min(totalElapsedStrokes - newStrokeIndex, 1);

      if (newStrokeIndex !== currentStrokeIndex || newStrokeProgress !== strokeProgress) {
        setCurrentStrokeIndex(newStrokeIndex);
        setStrokeProgress(newStrokeProgress);
        if (onProgressChange) {
          onProgressChange(newStrokeIndex + 1, allStrokes.length);
        }
      }

      if (totalElapsedStrokes < allStrokes.length) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [allStrokes, speed, isPaused, currentStrokeIndex, strokeProgress, onProgressChange, render]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    setCurrentStrokeIndex(0);
    setStrokeProgress(0);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
    setHoverInfo(null);
    if (onProgressChange) {
      onProgressChange(totalStrokes > 0 ? 1 : 0, totalStrokes);
    }
  }, [characters, totalStrokes, onProgressChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaused || allStrokes.length === 0) {
      setHoverInfo(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let found: HoverInfo | null = null;

    for (let i = allStrokes.length - 1; i >= 0; i--) {
      if (isPointNearStroke(x, y, allStrokes[i], 12)) {
        found = {
          strokeNumber: allStrokes[i].strokeNumber,
          direction: allStrokes[i].direction,
          x: (e.clientX - rect.left),
          y: (e.clientY - rect.top)
        };
        break;
      }
    }

    setHoverInfo(found);
  }, [isPaused, allStrokes]);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        maxWidth: '640px',
        height: 'auto',
        backgroundColor: '#ffffff',
        boxShadow: 'inset 0 0 8px #e0d8c8',
        cursor: isPaused ? 'pointer' : 'default',
        display: 'block'
      }}
    />
  );
}
