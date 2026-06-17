import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { getStrokesForText, Stroke } from '../utils/strokeData';

interface StrokeCanvasProps {
  text: string;
  speed: 'slow' | 'medium' | 'fast';
  isPaused: boolean;
  onComplete?: () => void;
}

const SPEED_MAP = {
  slow: 800,
  medium: 500,
  fast: 300,
};

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const THUMBNAIL_SIZE = 80;

interface CharStrokeData {
  char: string;
  strokes: Stroke[];
}

const StrokeCanvas: React.FC<StrokeCanvasProps> = ({ text, speed, isPaused, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentStrokeProgressRef = useRef<number>(0);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [hoveredStrokeId, setHoveredStrokeId] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const charStrokes = useMemo<CharStrokeData[]>(() => {
    return getStrokesForText(text);
  }, [text]);

  const allStrokes = useMemo(() => {
    return charStrokes.flatMap(cs => cs.strokes);
  }, [charStrokes]);

  const totalStrokes = allStrokes.length;

  const charLayouts = useMemo(() => {
    if (charStrokes.length === 0) return [];
    const charCount = charStrokes.length;
    const padding = 40;
    const totalWidth = CANVAS_WIDTH - padding * 2;
    const charSize = Math.min(totalWidth / charCount - 20, CANVAS_HEIGHT - 100);
    const startX = (CANVAS_WIDTH - (charSize * charCount + 20 * (charCount - 1))) / 2;
    const centerY = CANVAS_HEIGHT / 2;

    return charStrokes.map((_, i) => ({
      x: startX + i * (charSize + 20),
      y: centerY - charSize / 2,
      size: charSize,
    }));
  }, [charStrokes.length]);

  const resetAnimation = useCallback(() => {
    setCurrentStrokeIndex(0);
    currentStrokeProgressRef.current = 0;
    setIsCompleted(false);
    lastTimeRef.current = 0;
  }, []);

  useEffect(() => {
    resetAnimation();
  }, [text, resetAnimation]);

  const getPointOnPath = useCallback((stroke: Stroke, progress: number) => {
    const points = stroke.points;
    if (points.length < 2) return points[0] || { x: 0, y: 0 };

    const totalSegments = points.length - 1;
    const segmentProgress = progress * totalSegments;
    const segmentIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1);
    const localProgress = segmentProgress - segmentIndex;

    const p1 = points[segmentIndex];
    const p2 = points[segmentIndex + 1];

    return {
      x: p1.x + (p2.x - p1.x) * localProgress,
      y: p1.y + (p2.y - p1.y) * localProgress,
    };
  }, []);

  const drawStrokePartial = useCallback((
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    offsetX: number,
    offsetY: number,
    scale: number,
    progress: number,
    color: string,
    lineWidth: number
  ) => {
    if (progress <= 0) return;

    const points = stroke.points;
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const totalSegments = points.length - 1;
    const segmentProgress = progress * totalSegments;
    const fullSegments = Math.min(Math.floor(segmentProgress), totalSegments);

    for (let i = 0; i < fullSegments; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (i === 0) {
        ctx.moveTo(offsetX + p1.x * scale, offsetY + p1.y * scale);
      }
      ctx.lineTo(offsetX + p2.x * scale, offsetY + p2.y * scale);
    }

    if (fullSegments < totalSegments) {
      const localProgress = segmentProgress - fullSegments;
      const p1 = points[fullSegments];
      const p2 = points[fullSegments + 1];
      const interpX = p1.x + (p2.x - p1.x) * localProgress;
      const interpY = p1.y + (p2.y - p1.y) * localProgress;

      if (fullSegments === 0) {
        ctx.moveTo(offsetX + p1.x * scale, offsetY + p1.y * scale);
      }
      ctx.lineTo(offsetX + interpX * scale, offsetY + interpY * scale);
    }

    ctx.stroke();
  }, []);

  const drawStrokeFull = useCallback((
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    offsetX: number,
    offsetY: number,
    scale: number,
    color: string,
    lineWidth: number
  ) => {
    const points = stroke.points;
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(offsetX + points[0].x * scale, offsetY + points[0].y * scale);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(offsetX + points[i].x * scale, offsetY + points[i].y * scale);
    }

    ctx.stroke();
  }, []);

  const drawStrokeNumber = useCallback((
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    offsetX: number,
    offsetY: number,
    scale: number,
    isHovered: boolean
  ) => {
    const startPoint = stroke.points[0];
    const x = offsetX + startPoint.x * scale;
    const y = offsetY + startPoint.y * scale;
    const radius = isHovered ? 13 : 11;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? '#1976d2' : '#1565c0';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = isHovered ? 'bold 11px sans-serif' : 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(stroke.id), x, y);
  }, []);

  const drawThumbnail = useCallback((
    ctx: CanvasRenderingContext2D,
    charStrokesData: CharStrokeData[],
    completedCount: number
  ) => {
    const thumbX = 16;
    const thumbY = CANVAS_HEIGHT - THUMBNAIL_SIZE - 16;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(thumbX, thumbY, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

    if (charStrokesData.length === 0) return;

    const thumbPadding = 6;
    const thumbCharSize = (THUMBNAIL_SIZE - thumbPadding * 2) / Math.min(charStrokesData.length, 2);
    const cols = Math.min(charStrokesData.length, 2);
    const rows = Math.ceil(charStrokesData.length / cols);
    const actualThumbCharSize = Math.min(
      (THUMBNAIL_SIZE - thumbPadding * 2) / cols,
      (THUMBNAIL_SIZE - thumbPadding * 2) / rows
    );

    let strokeCounter = 0;

    charStrokesData.forEach((charData, charIndex) => {
      const col = charIndex % cols;
      const row = Math.floor(charIndex / cols);
      const offsetX = thumbX + thumbPadding + col * actualThumbCharSize + (actualThumbCharSize - actualThumbCharSize * 0.85) / 2;
      const offsetY = thumbY + thumbPadding + row * actualThumbCharSize + (actualThumbCharSize - actualThumbCharSize * 0.85) / 2;
      const scale = (actualThumbCharSize * 0.85) / 100;

      charData.strokes.forEach((stroke) => {
        const isCompleted = strokeCounter < completedCount;
        const color = isCompleted ? '#424242' : '#e0e0e0';
        drawStrokeFull(ctx, stroke, offsetX, offsetY, scale, color, 1.5);
        strokeCounter++;
      });
    });

    const progressText = `${Math.min(completedCount, allStrokes.length)} / ${allStrokes.length}`;
    ctx.fillStyle = '#424242';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `第 ${Math.min(completedCount, allStrokes.length)} 笔`,
      thumbX + THUMBNAIL_SIZE + 12,
      thumbY + THUMBNAIL_SIZE / 2 - 10
    );
    ctx.fillText(
      `共 ${allStrokes.length} 笔`,
      thumbX + THUMBNAIL_SIZE + 12,
      thumbY + THUMBNAIL_SIZE / 2 + 10
    );
  }, [allStrokes.length, drawStrokeFull]);

  const draw = useCallback((currentStrokeIdx: number, strokeProgress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (charStrokes.length === 0) {
      ctx.fillStyle = '#9e9e9e';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请输入支持的汉字', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      return;
    }

    let globalStrokeIndex = 0;

    charStrokes.forEach((charData, charIndex) => {
      const layout = charLayouts[charIndex];
      if (!layout) return;

      const offsetX = layout.x + (layout.size - layout.size * 0.85) / 2;
      const offsetY = layout.y + (layout.size - layout.size * 0.85) / 2;
      const scale = (layout.size * 0.85) / 100;
      const lineWidth = Math.max(2, scale * 3);

      charData.strokes.forEach((stroke) => {
        const isHovered = isPaused && hoveredStrokeId === stroke.id && globalStrokeIndex < currentStrokeIdx;

        if (globalStrokeIndex < currentStrokeIdx) {
          drawStrokeFull(ctx, stroke, offsetX, offsetY, scale, '#9e9e9e', lineWidth);
          if (isPaused) {
            drawStrokeNumber(ctx, stroke, offsetX, offsetY, scale, isHovered);
          }
        } else if (globalStrokeIndex === currentStrokeIdx) {
          drawStrokePartial(ctx, stroke, offsetX, offsetY, scale, strokeProgress, '#000000', lineWidth);
          if (strokeProgress > 0.1) {
            drawStrokeNumber(ctx, stroke, offsetX, offsetY, scale, false);
          }
        } else {
          if (isPaused) {
            drawStrokeFull(ctx, stroke, offsetX, offsetY, scale, '#eeeeee', lineWidth);
            drawStrokeNumber(ctx, stroke, offsetX, offsetY, scale, false);
          }
        }

        globalStrokeIndex++;
      });
    });

    drawThumbnail(ctx, charStrokes, currentStrokeIdx + (strokeProgress > 0 ? 1 : 0));
  }, [charStrokes, charLayouts, isPaused, hoveredStrokeId, drawStrokeFull, drawStrokePartial, drawStrokeNumber, drawThumbnail]);

  useEffect(() => {
    if (totalStrokes === 0) {
      draw(0, 0);
      return;
    }

    const strokeDuration = SPEED_MAP[speed];

    const animate = (timestamp: number) => {
      if (isPaused || isCompleted) {
        draw(currentStrokeIndex, currentStrokeProgressRef.current);
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      let newProgress = currentStrokeProgressRef.current + deltaTime / strokeDuration;
      let newStrokeIndex = currentStrokeIndex;

      while (newProgress >= 1 && newStrokeIndex < totalStrokes - 1) {
        newProgress -= 1;
        newStrokeIndex++;
      }

      if (newStrokeIndex >= totalStrokes - 1 && newProgress >= 1) {
        newProgress = 1;
        setIsCompleted(true);
        if (onComplete) {
          onComplete();
        }
      }

      currentStrokeProgressRef.current = newProgress;
      setCurrentStrokeIndex(newStrokeIndex);

      draw(newStrokeIndex, newProgress);

      if (!(newStrokeIndex >= totalStrokes - 1 && newProgress >= 1)) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (!isPaused && !isCompleted) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      draw(currentStrokeIndex, currentStrokeProgressRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [text, speed, isPaused, isCompleted, totalStrokes, currentStrokeIndex, draw, onComplete]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaused || charStrokes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    let foundStroke: number | null = null;

    let globalStrokeIndex = 0;

    for (let charIndex = 0; charIndex < charStrokes.length; charIndex++) {
      const charData = charStrokes[charIndex];
      const layout = charLayouts[charIndex];
      if (!layout) continue;

      const offsetX = layout.x + (layout.size - layout.size * 0.85) / 2;
      const offsetY = layout.y + (layout.size - layout.size * 0.85) / 2;
      const scale = (layout.size * 0.85) / 100;

      for (const stroke of charData.strokes) {
        if (globalStrokeIndex >= currentStrokeIndex) {
          globalStrokeIndex++;
          continue;
        }

        const startPoint = stroke.points[0];
        const x = offsetX + startPoint.x * scale;
        const y = offsetY + startPoint.y * scale;
        const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

        if (distance < 20) {
          foundStroke = stroke.id;
          break;
        }

        globalStrokeIndex++;
      }

      if (foundStroke !== null) break;
    }

    setHoveredStrokeId(foundStroke);
  }, [isPaused, charStrokes, charLayouts, currentStrokeIndex]);

  const handleMouseLeave = useCallback(() => {
    setHoveredStrokeId(null);
  }, []);

  const getHoveredStrokeInfo = useCallback(() => {
    if (hoveredStrokeId === null) return null;

    for (const charData of charStrokes) {
      const stroke = charData.strokes.find(s => s.id === hoveredStrokeId);
      if (stroke) {
        return { id: stroke.id, direction: stroke.direction };
      }
    }
    return null;
  }, [hoveredStrokeId, charStrokes]);

  const hoveredInfo = getHoveredStrokeInfo();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: '100%',
          maxWidth: '640px',
          height: 'auto',
          aspectRatio: '640/480',
          backgroundColor: '#ffffff',
          boxShadow: 'inset 0 0 8px #e0d8c8',
          borderRadius: '4px',
          cursor: isPaused ? 'pointer' : 'default',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hoveredInfo && isPaused && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '8px 12px',
            backgroundColor: 'rgba(21, 101, 192, 0.9)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            transform: 'scale(1)',
            pointerEvents: 'none',
          }}
        >
          第 {hoveredInfo.id} 笔：{hoveredInfo.direction}
        </div>
      )}
    </div>
  );
};

export default StrokeCanvas;
