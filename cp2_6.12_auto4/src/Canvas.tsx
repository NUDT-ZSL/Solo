import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { ToolType, DrawAction, Point, StrokeShape } from './types';

interface CanvasProps {
  tool: ToolType;
  color: string;
  lineWidth: number;
  actions: DrawAction[];
  userId: string;
  userName: string;
  onDrawComplete: (action: DrawAction) => void;
  undoingIds: Set<string>;
  redoingIds: Set<string>;
}

interface DrawingState {
  isDrawing: boolean;
  points: Point[];
  shape: StrokeShape | null;
  textPosition: Point | null;
  currentColor: string;
  currentLineWidth: number;
  currentTool: ToolType;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CANVAS_W = 1920;
const CANVAS_H = 1080;

const Canvas = forwardRef<unknown, CanvasProps>(function Canvas(
  { tool, color, lineWidth, actions, userId, userName, onDrawComplete, undoingIds, redoingIds },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<DrawingState>({
    isDrawing: false,
    points: [],
    shape: null,
    textPosition: null,
    currentColor: color,
    currentLineWidth: lineWidth,
    currentTool: tool,
  });
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    value: string;
    fontSize: number;
    color: string;
  }>({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, value: '', fontSize: 16, color });
  const [scale, setScale] = useState(1);
  const animFrameRef = useRef<number>();

  useImperativeHandle(ref, () => ({}));

  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / CANVAS_W, vh / CANVAS_H, 1);
      setScale(s);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent | MouseEvent | Touch | React.TouchEvent): Point => {
      const rect = canvasRef.current!.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        const touch = (e as React.TouchEvent).touches[0] || (e as React.TouchEvent).changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else if ('clientX' in e) {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      } else {
        const t = e as Touch;
        clientX = t.clientX;
        clientY = t.clientY;
      }
      return {
        x: (clientX - rect.left) * (CANVAS_W / rect.width),
        y: (clientY - rect.top) * (CANVAS_H / rect.height),
        timestamp: performance.now(),
      };
    },
    []
  );

  const drawBrushStroke = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      points: Point[],
      strokeColor: string,
      width: number,
      baseOpacity: number = 1
    ) => {
      if (points.length < 2) {
        if (points.length === 1) {
          ctx.fillStyle = hexToRgba(strokeColor, baseOpacity * 0.85);
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = hexToRgba(strokeColor, baseOpacity * 0.9);
      ctx.lineWidth = width;
      ctx.shadowColor = hexToRgba(strokeColor, baseOpacity * 0.3);
      ctx.shadowBlur = width * 0.5;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      if (points.length >= 2) {
        const last = points[points.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();

      if (width >= 3) {
        ctx.shadowBlur = 0;
        for (let i = 1; i < points.length; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];
          const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          const speedFactor = Math.min(1, 30 / Math.max(dist, 1));
          const inkR = width * (0.15 + speedFactor * 0.2);
          const inkAlpha = baseOpacity * 0.08 * speedFactor;
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          const grd = ctx.createRadialGradient(midX, midY, 0, midX, midY, inkR);
          grd.addColorStop(0, hexToRgba(strokeColor, inkAlpha));
          grd.addColorStop(1, hexToRgba(strokeColor, 0));
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(midX, midY, inkR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    []
  );

  const drawShape = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      shape: StrokeShape,
      strokeColor: string,
      width: number,
      shapeType: 'rectangle' | 'circle' | 'eraser',
      baseOpacity: number = 1
    ) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = width;
      ctx.strokeStyle =
        shapeType === 'eraser'
          ? `rgba(255,255,255,${baseOpacity})`
          : hexToRgba(strokeColor, baseOpacity * 0.92);

      if (shapeType === 'rectangle') {
        ctx.shadowColor = hexToRgba(strokeColor, baseOpacity * 0.2);
        ctx.shadowBlur = width * 0.3;
        ctx.strokeRect(
          Math.min(shape.startX, shape.endX),
          Math.min(shape.startY, shape.endY),
          Math.abs(shape.endX - shape.startX),
          Math.abs(shape.endY - shape.startY)
        );
      } else if (shapeType === 'circle' || shapeType === 'eraser') {
        ctx.beginPath();
        const cx = (shape.startX + shape.endX) / 2;
        const cy = (shape.startY + shape.endY) / 2;
        const rx = Math.abs(shape.endX - shape.startX) / 2;
        const ry = Math.abs(shape.endY - shape.startY) / 2;
        if (shapeType === 'circle') {
          const r = Math.max(rx, ry);
          ctx.shadowColor = hexToRgba(strokeColor, baseOpacity * 0.2);
          ctx.shadowBlur = width * 0.3;
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = 'white';
          ctx.fillRect(
            Math.min(shape.startX, shape.endX),
            Math.min(shape.startY, shape.endY),
            Math.abs(shape.endX - shape.startX),
            Math.abs(shape.endY - shape.startY)
          );
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    },
    []
  );

  const drawText = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      text: string,
      position: Point,
      strokeColor: string,
      baseOpacity: number = 1
    ) => {
      ctx.font = `600 ${18}px -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = hexToRgba(strokeColor, baseOpacity);
      ctx.fillText(text, position.x, position.y);
    },
    []
  );

  const renderAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = 'rgba(220, 225, 235, 0.45)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_W; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
    }
    for (let y = 0; y <= CANVAS_H; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
    }
    ctx.stroke();

    for (const action of actions) {
      const isUndoing = undoingIds.has(action.id);
      const isRedoing = redoingIds.has(action.id);
      const baseOpacity = isUndoing || isRedoing ? 0.4 : action.opacity;

      if (isUndoing) {
        ctx.save();
        ctx.globalAlpha = 0;
      }
      if (isRedoing) {
        ctx.save();
      }

      if (action.tool === 'brush' && action.points) {
        drawBrushStroke(ctx, action.points, action.color, action.lineWidth, baseOpacity);
      } else if ((action.tool === 'rectangle' || action.tool === 'circle' || action.tool === 'eraser') && action.shape) {
        drawShape(ctx, action.shape, action.color, action.lineWidth, action.tool, baseOpacity);
      } else if (action.tool === 'text' && action.text && action.textPosition) {
        drawText(ctx, action.text, action.textPosition, action.color, baseOpacity);
      }

      if (isUndoing || isRedoing) {
        ctx.restore();
      }
    }

    const ds = drawingRef.current;
    if (ds.isDrawing) {
      if ((ds.currentTool === 'brush' || ds.currentTool === 'eraser') && ds.points.length > 0) {
        drawBrushStroke(ctx, ds.points, ds.currentColor, ds.currentLineWidth, 0.85);
      } else if (
        (ds.currentTool === 'rectangle' || ds.currentTool === 'circle') &&
        ds.shape
      ) {
        drawShape(ctx, ds.shape, ds.currentColor, ds.currentLineWidth, ds.currentTool, 0.85);
      }
    }
  }, [actions, undoingIds, redoingIds, drawBrushStroke, drawShape, drawText]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      renderAll();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderAll]);

  const completeStroke = useCallback(() => {
    const ds = drawingRef.current;
    if (!ds.isDrawing) return;
    ds.isDrawing = false;

    if (ds.currentTool === 'text') return;

    const hasContent =
      (ds.currentTool === 'brush' || ds.currentTool === 'eraser'
        ? ds.points.length > 1
        : ds.shape !== null);

    if (!hasContent) {
      ds.points = [];
      ds.shape = null;
      return;
    }

    const action: DrawAction = {
      id: generateId(),
      userId,
      userName,
      tool: ds.currentTool,
      color: ds.currentColor,
      lineWidth: ds.currentLineWidth,
      points: ds.currentTool === 'brush' || ds.currentTool === 'eraser' ? [...ds.points] : undefined,
      shape:
        ds.currentTool === 'rectangle' || ds.currentTool === 'circle'
          ? (ds.shape as StrokeShape)
          : undefined,
      opacity: 1,
      createdAt: Date.now(),
    };

    onDrawComplete(action);
    ds.points = [];
    ds.shape = null;
  }, [userId, userName, onDrawComplete]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (tool === 'text') return;
      const p = getCanvasPoint(e);
      const ds = drawingRef.current;
      ds.isDrawing = true;
      ds.currentTool = tool;
      ds.currentColor = tool === 'eraser' ? '#ffffff' : color;
      ds.currentLineWidth = lineWidth;
      ds.points = [p];
      ds.shape = { startX: p.x, startY: p.y, endX: p.x, endY: p.y };
    },
    [tool, color, lineWidth, getCanvasPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const ds = drawingRef.current;
      if (!ds.isDrawing) return;
      const p = getCanvasPoint(e);

      if (ds.currentTool === 'brush' || ds.currentTool === 'eraser') {
        const last = ds.points[ds.points.length - 1];
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.5) {
          ds.points.push(p);
        }
      } else {
        ds.shape = {
          startX: ds.shape!.startX,
          startY: ds.shape!.startY,
          endX: p.x,
          endY: p.y,
        };
      }
    },
    [getCanvasPoint]
  );

  const handleMouseUp = useCallback(() => {
    completeStroke();
  }, [completeStroke]);

  const handleTextClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool !== 'text') return;
      const p = getCanvasPoint(e);
      const rect = canvasRef.current!.getBoundingClientRect();
      setTextInput({
        visible: true,
        x: rect.left + (p.x / CANVAS_W) * rect.width,
        y: rect.top + (p.y / CANVAS_H) * rect.height,
        canvasX: p.x,
        canvasY: p.y,
        value: '',
        fontSize: 18,
        color,
      });
      setTimeout(() => {
        const input = document.getElementById('text-input-overlay') as HTMLInputElement | null;
        input?.focus();
      }, 0);
    },
    [tool, color, getCanvasPoint]
  );

  const commitText = useCallback(() => {
    if (!textInput.value.trim()) {
      setTextInput((t) => ({ ...t, visible: false, value: '' }));
      return;
    }
    const action: DrawAction = {
      id: generateId(),
      userId,
      userName,
      tool: 'text',
      color: textInput.color,
      lineWidth,
      text: textInput.value,
      textPosition: { x: textInput.canvasX, y: textInput.canvasY, timestamp: Date.now() },
      opacity: 1,
      createdAt: Date.now(),
    };
    onDrawComplete(action);
    setTextInput((t) => ({ ...t, visible: false, value: '' }));
  }, [textInput, userId, userName, lineWidth, onDrawComplete]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (tool === 'text') {
        handleTextClick(e as unknown as React.MouseEvent);
        return;
      }
      const p = getCanvasPoint(e);
      const ds = drawingRef.current;
      ds.isDrawing = true;
      ds.currentTool = tool;
      ds.currentColor = tool === 'eraser' ? '#ffffff' : color;
      ds.currentLineWidth = lineWidth;
      ds.points = [p];
      ds.shape = { startX: p.x, startY: p.y, endX: p.x, endY: p.y };
    },
    [tool, color, lineWidth, getCanvasPoint, handleTextClick]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleMouseMove(e as unknown as React.MouseEvent);
    },
    [handleMouseMove]
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  }, [handleMouseUp]);

  const canvasStyle = useMemo(
    () => ({
      width: CANVAS_W * scale,
      height: CANVAS_H * scale,
      touchAction: 'none',
      cursor:
        tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair',
    }),
    [scale, tool]
  );

  return (
    <div className="canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="canvas-whiteboard"
        style={canvasStyle}
        onMouseDown={(e) => {
          handleMouseDown(e);
          handleTextClick(e);
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {textInput.visible && (
        <input
          id="text-input-overlay"
          className="text-input-overlay"
          style={{
            left: textInput.x,
            top: textInput.y,
            fontSize: textInput.fontSize * scale,
            color: textInput.color,
            width: 'auto',
            maxWidth: 400,
            fontWeight: 600,
          }}
          value={textInput.value}
          onChange={(e) => setTextInput((t) => ({ ...t, value: e.target.value }))}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText();
            if (e.key === 'Escape') setTextInput((t) => ({ ...t, visible: false, value: '' }));
          }}
          autoFocus
        />
      )}
    </div>
  );
});

export default Canvas;
