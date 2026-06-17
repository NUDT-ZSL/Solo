import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CharacterStrokes, Stroke } from '../utils/strokeData';

interface StrokeCanvasProps {
  characters: CharacterStrokes[];
  speed: 'slow' | 'medium' | 'fast';
  isPlaying: boolean;
  onComplete: () => void;
  onRestart: () => void;
}

interface AnimationState {
  charIndex: number;
  strokeIndex: number;
  progress: number;
}

interface HoverInfo {
  charIndex: number;
  strokeIndex: number;
  x: number;
  y: number;
}

const SPEED_MAP = {
  slow: 0.8,
  medium: 0.5,
  fast: 0.3
};

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const THUMBNAIL_SIZE = 80;

const StrokeCanvas: React.FC<StrokeCanvasProps> = ({
  characters,
  speed,
  isPlaying,
  onComplete,
  onRestart
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState>({
    charIndex: 0,
    strokeIndex: 0,
    progress: 0
  });

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const parsedPathsRef = useRef<Map<string, Path2D>>(new Map());

  const getTotalStrokes = useCallback(() => {
    return characters.reduce((sum, c) => sum + c.strokes.length, 0);
  }, [characters]);

  const getCurrentStrokeNumber = useCallback(() => {
    let count = 0;
    for (let i = 0; i < animationState.charIndex; i++) {
      count += characters[i]?.strokes.length || 0;
    }
    return count + animationState.strokeIndex + 1;
  }, [animationState, characters]);

  const parseSvgPath = useCallback((pathStr: string, offsetX: number, offsetY: number, scale: number): Path2D => {
    const key = `${pathStr}-${offsetX}-${offsetY}-${scale}`;
    if (parsedPathsRef.current.has(key)) {
      return parsedPathsRef.current.get(key)!;
    }

    const path = new Path2D();
    const commands = pathStr.match(/[MLQC][^MLQC]*/gi) || [];

    for (const cmd of commands) {
      const type = cmd[0].toUpperCase();
      const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

      switch (type) {
        case 'M':
          path.moveTo(coords[0] * scale + offsetX, coords[1] * scale + offsetY);
          break;
        case 'L':
          path.lineTo(coords[0] * scale + offsetX, coords[1] * scale + offsetY);
          break;
        case 'Q':
          path.quadraticCurveTo(
            coords[0] * scale + offsetX, coords[1] * scale + offsetY,
            coords[2] * scale + offsetX, coords[3] * scale + offsetY
          );
          break;
        case 'C':
          path.bezierCurveTo(
            coords[0] * scale + offsetX, coords[1] * scale + offsetY,
            coords[2] * scale + offsetX, coords[3] * scale + offsetY,
            coords[4] * scale + offsetX, coords[5] * scale + offsetY
          );
          break;
      }
    }

    parsedPathsRef.current.set(key, path);
    return path;
  }, []);

  const getPointOnPath = useCallback((stroke: Stroke, offsetX: number, offsetY: number, scale: number, t: number): { x: number; y: number } => {
    const sp = stroke.startPoint;
    const ep = stroke.endPoint;
    const cp = stroke.controlPoints || [];

    const sx = sp.x * scale + offsetX;
    const sy = sp.y * scale + offsetY;
    const ex = ep.x * scale + offsetX;
    const ey = ep.y * scale + offsetY;

    if (cp.length === 0) {
      return {
        x: sx + (ex - sx) * t,
        y: sy + (ey - sy) * t
      };
    } else if (cp.length === 1) {
      const cpx = cp[0].x * scale + offsetX;
      const cpy = cp[0].y * scale + offsetY;
      const mt = 1 - t;
      return {
        x: mt * mt * sx + 2 * mt * t * cpx + t * t * ex,
        y: mt * mt * sy + 2 * mt * t * cpy + t * t * ey
      };
    } else if (cp.length >= 2) {
      const cp1x = cp[0].x * scale + offsetX;
      const cp1y = cp[0].y * scale + offsetY;
      const cp2x = cp[1].x * scale + offsetX;
      const cp2y = cp[1].y * scale + offsetY;
      const mt = 1 - t;
      return {
        x: mt * mt * mt * sx + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * ex,
        y: mt * mt * mt * sy + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * ey
      };
    }

    return { x: sx, y: sy };
  }, []);

  const createPartialPath = useCallback((stroke: Stroke, offsetX: number, offsetY: number, scale: number, progress: number): Path2D => {
    const path = new Path2D();
    const steps = Math.max(2, Math.ceil(progress * 50));

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * progress;
      const point = getPointOnPath(stroke, offsetX, offsetY, scale, t);
      if (i === 0) {
        path.moveTo(point.x, point.y);
      } else {
        path.lineTo(point.x, point.y);
      }
    }

    return path;
  }, [getPointOnPath]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (characters.length === 0) {
      ctx.fillStyle = '#9e9e9e';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('请输入汉字开始演示', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      return;
    }

    const charWidth = characters.length > 0 ? CANVAS_WIDTH / Math.min(characters.length, 4) : CANVAS_WIDTH;

    characters.forEach((charData, charIdx) => {
      const offsetX = charIdx * charWidth + (charWidth - 320) / 2;
      const offsetY = charData.offsetY;
      const scale = charData.scale;

      charData.strokes.forEach((stroke, strokeIdx) => {
        const fullPath = parseSvgPath(stroke.path, offsetX, offsetY, scale);

        let strokeColor = '#000000';
        let lineWidth = 3;

        if (charIdx < animationState.charIndex) {
          strokeColor = '#9e9e9e';
        } else if (charIdx === animationState.charIndex) {
          if (strokeIdx < animationState.strokeIndex) {
            strokeColor = '#9e9e9e';
          } else if (strokeIdx === animationState.strokeIndex) {
            if (animationState.progress > 0) {
              const partialPath = createPartialPath(stroke, offsetX, offsetY, scale, animationState.progress);
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = lineWidth;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.stroke(partialPath);

              const startPoint = getPointOnPath(stroke, offsetX, offsetY, scale, 0);
              ctx.fillStyle = '#1565c0';
              ctx.beginPath();
              ctx.arc(startPoint.x, startPoint.y, 8, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 10px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(stroke.id.toString(), startPoint.x, startPoint.y);
            }
            return;
          } else {
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke(fullPath);
            ctx.setLineDash([]);
            return;
          }
        } else {
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke(fullPath);
          ctx.setLineDash([]);
          return;
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(fullPath);

        if (charIdx < animationState.charIndex || 
            (charIdx === animationState.charIndex && strokeIdx < animationState.strokeIndex)) {
          const startPoint = getPointOnPath(stroke, offsetX, offsetY, scale, 0);
          ctx.fillStyle = '#1565c0';
          ctx.beginPath();
          ctx.arc(startPoint.x, startPoint.y, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(stroke.id.toString(), startPoint.x, startPoint.y);
        }

        if (hoverInfo && !isPlaying && 
            hoverInfo.charIndex === charIdx && hoverInfo.strokeIndex === strokeIdx) {
          ctx.save();
          ctx.strokeStyle = '#1565c0';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke(fullPath);
          ctx.restore();
        }
      });
    });

    drawThumbnail(ctx);
  }, [characters, animationState, hoverInfo, isPlaying, parseSvgPath, createPartialPath, getPointOnPath]);

  const drawThumbnail = useCallback((ctx: CanvasRenderingContext2D) => {
    const thumbX = 20;
    const thumbY = CANVAS_HEIGHT - THUMBNAIL_SIZE - 20;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(thumbX, thumbY, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

    if (characters.length === 0) return;

    const totalStrokes = getTotalStrokes();
    const completedStrokes = getCurrentStrokeNumber() - 1;
    const progress = totalStrokes > 0 ? completedStrokes / totalStrokes : 0;

    const thumbScale = THUMBNAIL_SIZE / Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);
    const charWidth = characters.length > 0 ? THUMBNAIL_SIZE / Math.min(characters.length, 4) : THUMBNAIL_SIZE;

    characters.forEach((charData, charIdx) => {
      const offsetX = thumbX + charIdx * charWidth + (charWidth - THUMBNAIL_SIZE / 2) / 2;
      const offsetY = thumbY + 10;
      const scale = charData.scale * thumbScale * 0.8;

      charData.strokes.forEach((stroke, strokeIdx) => {
        const fullPath = parseSvgPath(stroke.path, offsetX, offsetY, scale);
        let isCompleted = false;

        if (charIdx < animationState.charIndex) {
          isCompleted = true;
        } else if (charIdx === animationState.charIndex) {
          isCompleted = strokeIdx < animationState.strokeIndex;
        }

        ctx.strokeStyle = isCompleted ? '#8d6e63' : '#e0d8c8';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(fullPath);
      });
    });

    ctx.fillStyle = '#424242';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const currentStrokeNum = Math.min(getCurrentStrokeNumber(), totalStrokes);
    ctx.fillText(`第 ${currentStrokeNum} 笔 / 共 ${totalStrokes} 笔`, thumbX + THUMBNAIL_SIZE + 12, thumbY + 20);

    ctx.fillStyle = '#9e9e9e';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${Math.round(progress * 100)}% 完成`, thumbX + THUMBNAIL_SIZE + 12, thumbY + 42);
  }, [characters, animationState, getTotalStrokes, getCurrentStrokeNumber, parseSvgPath]);

  const animate = useCallback((timestamp: number) => {
    if (!isPlaying || characters.length === 0) return;

    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    const strokeDuration = SPEED_MAP[speed];
    const progressIncrement = deltaTime / strokeDuration;

    setAnimationState(prev => {
      let newProgress = prev.progress + progressIncrement;
      let newStrokeIndex = prev.strokeIndex;
      let newCharIndex = prev.charIndex;

      while (newProgress >= 1) {
        newProgress -= 1;
        newStrokeIndex++;

        if (characters[newCharIndex] && newStrokeIndex >= characters[newCharIndex].strokes.length) {
          newStrokeIndex = 0;
          newCharIndex++;
        }

        if (newCharIndex >= characters.length) {
          onComplete();
          return {
            charIndex: characters.length - 1,
            strokeIndex: characters[characters.length - 1].strokes.length - 1,
            progress: 1
          };
        }
      }

      return {
        charIndex: newCharIndex,
        strokeIndex: newStrokeIndex,
        progress: newProgress
      };
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, speed, characters, onComplete]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  useEffect(() => {
    setAnimationState({
      charIndex: 0,
      strokeIndex: 0,
      progress: 0
    });
    parsedPathsRef.current.clear();
  }, [characters, onRestart]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying || characters.length === 0) {
      setHoverInfo(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const charWidth = characters.length > 0 ? CANVAS_WIDTH / Math.min(characters.length, 4) : CANVAS_WIDTH;
    let found = false;

    for (let charIdx = 0; charIdx < characters.length; charIdx++) {
      const charData = characters[charIdx];
      const offsetX = charIdx * charWidth + (charWidth - 320) / 2;
      const offsetY = charData.offsetY;
      const scale = charData.scale;

      for (let strokeIdx = 0; strokeIdx < charData.strokes.length; strokeIdx++) {
        const stroke = charData.strokes[strokeIdx];
        const path = parseSvgPath(stroke.path, offsetX, offsetY, scale);

        ctx.lineWidth = 10;
        if (ctx.isPointInStroke(path, x, y)) {
          setHoverInfo({ charIndex: charIdx, strokeIndex: strokeIdx, x: e.clientX, y: e.clientY });
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      setHoverInfo(null);
    }
  }, [isPlaying, characters, parseSvgPath]);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          boxShadow: 'inset 0 0 8px #e0d8c8',
          cursor: !isPlaying && characters.length > 0 ? 'pointer' : 'default',
          maxWidth: '96%',
          height: 'auto'
        }}
      />
      {hoverInfo && !isPlaying && characters[hoverInfo.charIndex] && (
        <div
          style={{
            position: 'fixed',
            left: hoverInfo.x + 10,
            top: hoverInfo.y + 10,
            backgroundColor: 'rgba(21, 101, 192, 0.95)',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            pointerEvents: 'none',
            zIndex: 100,
            transform: 'scale(1)',
            transition: 'transform 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          <strong>第 {characters[hoverInfo.charIndex].strokes[hoverInfo.strokeIndex].id} 笔</strong>
          <br />
          {characters[hoverInfo.charIndex].strokes[hoverInfo.strokeIndex].direction}
        </div>
      )}
    </div>
  );
};

export default StrokeCanvas;
