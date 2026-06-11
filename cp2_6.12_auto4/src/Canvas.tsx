import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { ToolType, DrawAction, Point, StrokeShape, ConnectedUser } from './types';

interface CanvasProps {
  tool: ToolType;
  color: string;
  lineWidth: number;
  actions: DrawAction[];
  users: ConnectedUser[];
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
  dirty: boolean;
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

const USER_COLOR_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f43f5e', '#f59e0b',
  '#10b981', '#0ea5e9', '#8b5cf6', '#e11d48',
];

function userIdToColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  return USER_COLOR_PALETTE[hash % USER_COLOR_PALETTE.length];
}

function resolveActionColor(action: DrawAction, users: ConnectedUser[], localUserId: string): string {
  if (action.userId) {
    if (action.userId === localUserId && action.color) return action.color;
    const matched = users.find((u) => u.id === action.userId);
    if (matched && matched.color) return matched.color;
    return action.color || userIdToColor(action.userId);
  }
  return action.color || '#3b82f6';
}

const Canvas = forwardRef<unknown, CanvasProps>(function Canvas(
  { tool, color, lineWidth, actions, users, userId, userName, onDrawComplete, undoingIds, redoingIds },
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
    dirty: false,
  });
  const actionsRef = useRef<DrawAction[]>(actions);
  const usersRef = useRef<ConnectedUser[]>(users);
  const undoingRef = useRef<Set<string>>(undoingIds);
  const redoingRef = useRef<Set<string>>(redoingIds);
  const animProgressRef = useRef<Map<string, number>>(new Map());

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
  const lastFrameRef = useRef<number>(performance.now());

  useEffect(() => { actionsRef.current = actions; }, [actions]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { undoingRef.current = undoingIds; }, [undoingIds]);
  useEffect(() => { redoingRef.current = redoingIds; }, [redoingIds]);

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
      baseOpacity: number = 1,
      tailFadeRatio: number = 0
    ) => {
      if (points.length <= 0) return;
      const fadeLen = Math.min(points.length, Math.max(3, Math.floor(points.length * tailFadeRatio)));
      if (points.length < 2) {
        const alpha = baseOpacity * 0.85 * (tailFadeRatio > 0 && fadeLen >= 1 ? 0.25 : 1);
        ctx.fillStyle = hexToRgba(strokeColor, alpha);
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      const drawSegment = (pts: Point[], opacity: number) => {
        if (pts.length < 2) return;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = hexToRgba(strokeColor, opacity * 0.9);
        ctx.lineWidth = width;
        ctx.shadowColor = hexToRgba(strokeColor, opacity * 0.25);
        ctx.shadowBlur = width * 0.45;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      };

      if (fadeLen >= 3 && points.length - fadeLen >= 1) {
        drawSegment(points.slice(0, points.length - fadeLen + 1), baseOpacity);
        const layers = 5;
        for (let l = 0; l < layers; l++) {
          const a = (layers - l) / layers;
          const op = baseOpacity * 0.9 * a;
          const start = Math.max(0, points.length - fadeLen - 1);
          const end = points.length - Math.floor((l / layers) * fadeLen);
          const seg = points.slice(start, Math.max(start + 2, end));
          if (seg.length >= 2) {
            drawSegment(seg, op);
          }
        }
      } else {
        drawSegment(points, baseOpacity);
      }

      if (width >= 3 && points.length >= 4) {
        ctx.shadowBlur = 0;
        const step = Math.max(1, Math.floor(points.length / 80));
        const limit = tailFadeRatio > 0 ? Math.max(4, points.length - fadeLen) : points.length;
        for (let i = step; i < limit; i += step) {
          const p0 = points[i - step];
          const p1 = points[i];
          const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          const speedFactor = Math.min(1, 30 / Math.max(dist, 1));
          const proximity = tailFadeRatio > 0 ? Math.max(0, 1 - (i / points.length)) : 1;
          const inkR = width * (0.15 + speedFactor * 0.2);
          const inkAlpha = baseOpacity * 0.07 * speedFactor * proximity;
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
        if (shapeType === 'circle') {
          const rx = Math.abs(shape.endX - shape.startX) / 2;
          const ry = Math.abs(shape.endY - shape.startY) / 2;
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

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

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

    const currentActions = actionsRef.current;
    const currentUsers = usersRef.current;
    const undoing = undoingRef.current;
    const redoing = redoingRef.current;
    const now = performance.now();

    for (const action of currentActions) {
      const isUndoing = undoing.has(action.id);
      const isRedoing = redoing.has(action.id);
      const isAnimating = isUndoing || isRedoing;

      let opacity = action.opacity;
      let visiblePointRatio = 1;
      let tailFade = 0;

      if (isAnimating) {
        if (!animProgressRef.current.has(action.id)) {
          animProgressRef.current.set(action.id, now);
        }
        const startedAt = animProgressRef.current.get(action.id)!;
        const elapsed = now - startedAt;
        const totalDuration = 550;
        const t = Math.min(1, elapsed / totalDuration);

        if (isUndoing) {
          const eased = easeOutCubic(t);
          opacity = Math.max(0, 1 - eased * 0.92);
          visiblePointRatio = Math.max(0, 1 - eased);
          tailFade = Math.min(0.45, eased);
        } else {
          const eased = easeOutCubic(t);
          opacity = Math.min(1, eased);
          visiblePointRatio = Math.min(1, eased);
          tailFade = 0;
        }
        if (t >= 1) {
          animProgressRef.current.delete(action.id);
        }
      } else {
        if (animProgressRef.current.has(action.id)) {
          animProgressRef.current.delete(action.id);
        }
      }

      if (opacity <= 0.01) continue;

      const resolvedColor = resolveActionColor(action, currentUsers, userId);

      if (action.tool === 'brush' && action.points) {
        if (visiblePointRatio <= 0) continue;
        const total = action.points.length;
        const count = isRedoing
          ? Math.max(2, Math.floor(total * visiblePointRatio))
          : Math.max(0, Math.floor(total * visiblePointRatio));
        if (count <= 0) continue;
        const visible = isRedoing
          ? action.points.slice(0, count)
          : action.points.slice(0, count);
        const actualTailFade = isUndoing ? tailFade : (isRedoing ? 0.2 : 0);
        drawBrushStroke(ctx, visible, resolvedColor, action.lineWidth, opacity, actualTailFade);
      } else if ((action.tool === 'rectangle' || action.tool === 'circle' || action.tool === 'eraser') && action.shape) {
        drawShape(ctx, action.shape, resolvedColor, action.lineWidth, action.tool, opacity);
      } else if (action.tool === 'text' && action.text && action.textPosition) {
        drawText(ctx, action.text, action.textPosition, resolvedColor, opacity);
      }
    }

    const ds = drawingRef.current;
    if (ds.isDrawing) {
      if ((ds.currentTool === 'brush' || ds.currentTool === 'eraser') && ds.points.length > 0) {
        drawBrushStroke(ctx, ds.points, ds.currentColor, ds.currentLineWidth, 0.9, 0);
      } else if (
        (ds.currentTool === 'rectangle' || ds.currentTool === 'circle') &&
        ds.shape
      ) {
        drawShape(ctx, ds.shape, ds.currentColor, ds.currentLineWidth, ds.currentTool, 0.9);
      }
    }
  }, [drawBrushStroke, drawShape, drawText, userId]);

  useEffect(() => {
    let running = true;
    let fpsCounter = 0;
    let fpsTimer = performance.now();
    const loop = () => {
      if (!running) return;
      const now = performance.now();
      if (now - lastFrameRef.current >= 16) {
        renderAll();
        lastFrameRef.current = now;
        fpsCounter++;
        if (now - fpsTimer > 1000) {
          fpsTimer = now;
          fpsCounter = 0;
        }
      }
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
      ds.dirty = true;
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
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 0.8) {
          ds.points.push(p);
          ds.dirty = true;
        }
      } else {
        ds.shape = {
          startX: ds.shape!.startX,
          startY: ds.shape!.startY,
          endX: p.x,
          endY: p.y,
        };
        ds.dirty = true;
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
      ds.dirty = true;
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
