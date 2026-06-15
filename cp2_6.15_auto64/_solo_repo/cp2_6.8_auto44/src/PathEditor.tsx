import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PathPoint, AnimationParams } from './types';
import { interpolatePaths } from './utils/pathUtils';
import { getEasingFunction } from './utils/animationUtils';

interface PathEditorProps {
  pathPoints: PathPoint[];
  morphTargetPoints?: PathPoint[];
  animationParams: AnimationParams;
  onChange: (points: PathPoint[]) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

type DraggablePoint =
  | { type: 'anchor'; index: number }
  | { type: 'control1'; index: number }
  | { type: 'control2'; index: number };

const HANDLE_RADIUS = 6;
const HANDLE_HOVER_SCALE = 1.2;
const TANGENT_LINE_LENGTH = 40;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const PathEditor: React.FC<PathEditorProps> = ({
  pathPoints,
  morphTargetPoints,
  animationParams,
  onChange,
  onEditStart,
  onEditEnd
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<DraggablePoint | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<DraggablePoint | null>(null);
  const animFrameRef = useRef<number>();
  const animStartTimeRef = useRef<number>(0);
  const flowOffsetRef = useRef<number>(0);

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const findHandleAtPoint = useCallback((x: number, y: number): DraggablePoint | null => {
    for (let i = 0; i < pathPoints.length; i++) {
      const point = pathPoints[i];
      const radius = HANDLE_RADIUS * 1.5;

      if (Math.hypot(point.x - x, point.y - y) <= radius) {
        return { type: 'anchor', index: i };
      }

      if ((point.command === 'C' || point.command === 'Q') && point.x1 !== undefined && point.y1 !== undefined) {
        if (Math.hypot(point.x1 - x, point.y1 - y) <= radius) {
          return { type: 'control1', index: i };
        }
      }

      if (point.command === 'C' && point.x2 !== undefined && point.y2 !== undefined) {
        if (Math.hypot(point.x2 - x, point.y2 - y) <= radius) {
          return { type: 'control2', index: i };
        }
      }
    }
    return null;
  }, [pathPoints]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#1a1a3a';
    ctx.lineWidth = 1;
    const gridSize = 40;

    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  }, []);

  const drawPath = useCallback((
    ctx: CanvasRenderingContext2D,
    points: PathPoint[],
    strokeStyle: string | CanvasGradient,
    lineWidth: number = 3,
    dashOffset: number = 0,
    dashArray: number[] = []
  ) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(dashArray);
    ctx.lineDashOffset = dashOffset;

    const first = points[0];
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      switch (point.command) {
        case 'C':
          if (point.x1 !== undefined && point.y1 !== undefined &&
              point.x2 !== undefined && point.y2 !== undefined) {
            ctx.bezierCurveTo(point.x1, point.y1, point.x2, point.y2, point.x, point.y);
          }
          break;
        case 'Q':
          if (point.x1 !== undefined && point.y1 !== undefined) {
            ctx.quadraticCurveTo(point.x1, point.y1, point.x, point.y);
          }
          break;
        case 'L':
        case 'Z':
        case 'M':
        default:
          ctx.lineTo(point.x, point.y);
          break;
      }
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const drawControlLines = useCallback((ctx: CanvasRenderingContext2D, points: PathPoint[]) => {
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const prev = i > 0 ? points[i - 1] : point;

      ctx.strokeStyle = 'rgba(233, 69, 96, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      if ((point.command === 'C' || point.command === 'Q') && point.x1 !== undefined && point.y1 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(point.x1, point.y1);
        ctx.stroke();
      }

      if (point.command === 'C' && point.x2 !== undefined && point.y2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(point.x2, point.y2);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }
  }, []);

  const drawTangentLine = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    cx: number, cy: number,
    alpha: number = 0.4
  ) => {
    const dx = cx - x;
    const dy = cy - y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const ux = dx / len;
    const uy = dy / len;
    const endX = x + ux * TANGENT_LINE_LENGTH;
    const endY = y + uy * TANGENT_LINE_LENGTH;

    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const drawHandles = useCallback((ctx: CanvasRenderingContext2D, points: PathPoint[]) => {
    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      if ((point.command === 'C' || point.command === 'Q') && point.x1 !== undefined && point.y1 !== undefined) {
        const isHovered = hoveredHandle?.type === 'control1' && hoveredHandle.index === i;
        const radius = HANDLE_RADIUS * (isHovered ? HANDLE_HOVER_SCALE : 1);
        
        drawTangentLine(ctx, points[i > 0 ? i - 1 : i].x, points[i > 0 ? i - 1 : i].y, point.x1, point.y1);
        
        ctx.fillStyle = isHovered ? '#ffd700' : 'rgba(255, 99, 71, 0.8)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x1, point.y1, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (point.command === 'C' && point.x2 !== undefined && point.y2 !== undefined) {
        const isHovered = hoveredHandle?.type === 'control2' && hoveredHandle.index === i;
        const radius = HANDLE_RADIUS * (isHovered ? HANDLE_HOVER_SCALE : 1);
        
        drawTangentLine(ctx, point.x, point.y, point.x2, point.y2);
        
        ctx.fillStyle = isHovered ? '#ffd700' : 'rgba(255, 99, 71, 0.8)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x2, point.y2, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      const isAnchorHovered = hoveredHandle?.type === 'anchor' && hoveredHandle.index === i;
      const isDraggingAnchor = isDragging && dragTarget?.type === 'anchor' && dragTarget.index === i;
      const radius = HANDLE_RADIUS * (isAnchorHovered || isDraggingAnchor ? HANDLE_HOVER_SCALE : 1);

      ctx.fillStyle = isDraggingAnchor ? '#ffd700' : (isAnchorHovered ? '#ff6347' : '#e94560');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [hoveredHandle, isDragging, dragTarget, drawTangentLine]);

  const createFlowGradient = useCallback((ctx: CanvasRenderingContext2D, offset: number) => {
    const gradient = ctx.createLinearGradient(
      0 + offset, 0,
      600 + offset, 0
    );
    gradient.addColorStop(0, '#ff6347');
    gradient.addColorStop(0.5, '#ffd700');
    gradient.addColorStop(1, '#ff6347');
    return gradient;
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawGrid(ctx);

    let displayPoints = pathPoints;
    let progress = 0;

    if (animationParams.isPlaying || animationParams.progress > 0) {
      const easing = getEasingFunction(animationParams.easing);
      progress = easing(animationParams.progress);

      if (animationParams.type === 'morph' && morphTargetPoints &&
          pathPoints.length === morphTargetPoints.length) {
        displayPoints = interpolatePaths(pathPoints, morphTargetPoints, progress);
      }
    }

    drawPath(ctx, displayPoints, 'rgba(233, 69, 96, 0.2)', 6);

    if (animationParams.type === 'stroke' && (animationParams.isPlaying || animationParams.progress > 0)) {
      const totalLength = displayPoints.reduce((acc, _, i) => {
        if (i === 0) return acc;
        const prev = displayPoints[i - 1];
        const curr = displayPoints[i];
        return acc + Math.hypot(curr.x - prev.x, curr.y - prev.y);
      }, 0);
      
      const visibleLength = totalLength * progress;
      const dashArray = [visibleLength, totalLength];
      
      flowOffsetRef.current += 2;
      const gradient = createFlowGradient(ctx, flowOffsetRef.current);
      drawPath(ctx, displayPoints, gradient, 4, 0, dashArray);
    } else if (animationParams.isPlaying) {
      flowOffsetRef.current += 2;
      const gradient = createFlowGradient(ctx, flowOffsetRef.current);
      drawPath(ctx, displayPoints, gradient, 4);
    } else {
      drawPath(ctx, displayPoints, '#e94560', 3);
    }

    if (animationParams.type === 'morph' && morphTargetPoints && !animationParams.isPlaying) {
      drawPath(ctx, morphTargetPoints, 'rgba(15, 52, 96, 0.6)', 2, 0, [5, 5]);
    }

    drawControlLines(ctx, displayPoints);
    drawHandles(ctx, displayPoints);
  }, [
    pathPoints, morphTargetPoints, animationParams,
    drawGrid, drawPath, drawControlLines, drawHandles, createFlowGradient
  ]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    let lastTime = performance.now();
    const animate = (time: number) => {
      if (time - lastTime >= 16) {
        render();
        lastTime = time;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    const handle = findHandleAtPoint(coords.x, coords.y);
    
    if (handle) {
      setIsDragging(true);
      setDragTarget(handle);
      onEditStart?.();
    }
  }, [getCanvasCoords, findHandleAtPoint, onEditStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (!isDragging) {
      const handle = findHandleAtPoint(coords.x, coords.y);
      setHoveredHandle(handle);
      return;
    }

    if (!dragTarget) return;

    const newPoints = pathPoints.map(p => ({ ...p }));
    const point = newPoints[dragTarget.index];

    switch (dragTarget.type) {
      case 'anchor':
        const dx = coords.x - point.x;
        const dy = coords.y - point.y;
        point.x = coords.x;
        point.y = coords.y;
        
        if (point.command === 'C' && point.x1 !== undefined && point.y1 !== undefined) {
          point.x1 += dx;
          point.y1 += dy;
        }
        if (point.command === 'C' && point.x2 !== undefined && point.y2 !== undefined) {
          point.x2 += dx;
          point.y2 += dy;
        }
        if (point.command === 'Q' && point.x1 !== undefined && point.y1 !== undefined) {
          point.x1 += dx;
          point.y1 += dy;
        }
        break;
      case 'control1':
        point.x1 = coords.x;
        point.y1 = coords.y;
        break;
      case 'control2':
        point.x2 = coords.x;
        point.y2 = coords.y;
        break;
    }

    onChange(newPoints);
  }, [isDragging, dragTarget, pathPoints, getCanvasCoords, findHandleAtPoint, onChange]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragTarget(null);
      onEditEnd?.();
    }
  }, [isDragging, onEditEnd]);

  const handleMouseLeave = useCallback(() => {
    setHoveredHandle(null);
    if (isDragging) {
      setIsDragging(false);
      setDragTarget(null);
      onEditEnd?.();
    }
  }, [isDragging, onEditEnd]);

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: '100%',
          maxWidth: `${CANVAS_WIDTH}px`,
          height: 'auto',
          aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`,
          cursor: isDragging ? 'grabbing' : (hoveredHandle ? 'grab' : 'crosshair'),
          touchAction: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default PathEditor;
