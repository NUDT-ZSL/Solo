import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Frame, Stroke, ToolState, User, ToolType, Point } from './types';

interface CanvasProps {
  frame: Frame;
  activeLayerId: string | null;
  toolState: ToolState;
  remoteUsers: User[];
  currentUserId: string;
  onStrokeComplete: (stroke: Stroke) => void;
  onCursorMove: (x: number, y: number) => void;
  onColorPicked: (color: string) => void;
}

const GRID_SIZE = 40;
const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 3000;

const generateId = () => Math.random().toString(36).substring(2, 11);

const drawStrokeOnCanvas = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
  if (stroke.points.length < 1) return;
  const sortedLayers = [...stroke.points].sort((a, b) => a.timestamp - b.timestamp);
  
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = stroke.opacity;

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.shadowColor = stroke.color;
    ctx.shadowBlur = stroke.size * 1.5;
  }

  ctx.beginPath();
  ctx.moveTo(sortedLayers[0].x, sortedLayers[0].y);

  for (let i = 1; i < sortedLayers.length; i++) {
    const p0 = sortedLayers[i - 1];
    const p1 = sortedLayers[i];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
  }
  ctx.stroke();
  ctx.restore();
};

const Canvas: React.FC<CanvasProps> = ({
  frame,
  activeLayerId,
  toolState,
  remoteUsers,
  currentUserId,
  onStrokeComplete,
  onCursorMove,
  onColorPicked
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const cursorTimeoutRef = useRef<number | null>(null);

  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(51, 51, 51, 0.3)';
    ctx.lineWidth = 1;

    const startX = -offset.x % (GRID_SIZE * scale);
    const startY = -offset.y % (GRID_SIZE * scale);

    ctx.beginPath();
    for (let x = startX; x < canvas.width; x += GRID_SIZE * scale) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = startY; y < canvas.height; y += GRID_SIZE * scale) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
  }, [scale, offset]);

  const redrawLayer = useCallback((layerId: string, strokes: Stroke[]) => {
    const canvas = layerCanvasRefs.current.get(layerId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(stroke => drawStrokeOnCanvas(ctx, stroke));
  }, []);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  useEffect(() => {
    frame.layers.forEach(layer => {
      redrawLayer(layer.id, layer.strokes);
    });
  }, [frame, redrawLayer]);

  useEffect(() => {
    const handleResize = () => drawGrid();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawGrid]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number): Point => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return { x: 0, y: 0, timestamp: Date.now() };
    const rect = wrapper.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale,
      timestamp: Date.now()
    };
  }, [offset, scale]);

  const pickColor = useCallback((x: number, y: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const visibleLayers = [...frame.layers].reverse().filter(l => l.visible);
    visibleLayers.forEach(layer => {
      layer.strokes.forEach(stroke => drawStrokeOnCanvas(ctx, stroke));
    });

    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    if (pixel[3] > 0) {
      const hex = '#' + [pixel[0], pixel[1], pixel[2]]
        .map(c => c.toString(16).padStart(2, '0'))
        .join('');
      onColorPicked(hex);
    }
  }, [frame.layers, onColorPicked]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y
      };
      return;
    }

    if (e.button !== 0 || !activeLayerId) return;

    const point = getCanvasCoords(e.clientX, e.clientY);

    if (toolState.tool === 'picker') {
      pickColor(point.x, point.y);
      return;
    }

    setIsDrawing(true);
    currentStrokeRef.current = {
      id: generateId(),
      userId: currentUserId,
      points: [point],
      color: toolState.color,
      size: toolState.size,
      opacity: toolState.opacity,
      tool: toolState.tool as ToolType
    };
  }, [activeLayerId, toolState, getCanvasCoords, pickColor, currentUserId, offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getCanvasCoords(e.clientX, e.clientY);
    onCursorMove(point.x, point.y);

    if (isPanning) {
      setOffset({
        x: panStartRef.current.offsetX + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.offsetY + (e.clientY - panStartRef.current.y)
      });
      return;
    }

    if (!isDrawing || !currentStrokeRef.current) return;

    currentStrokeRef.current.points.push(point);

    const canvas = activeCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const pts = currentStrokeRef.current.points;
        if (pts.length >= 2) {
          const p0 = pts[pts.length - 2];
          const p1 = pts[pts.length - 1];
          ctx.save();
          ctx.strokeStyle = currentStrokeRef.current.color;
          ctx.lineWidth = currentStrokeRef.current.size;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = currentStrokeRef.current.opacity;
          
          if (currentStrokeRef.current.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
          } else {
            ctx.shadowColor = currentStrokeRef.current.color;
            ctx.shadowBlur = currentStrokeRef.current.size * 1.5;
          }
          
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }, [isDrawing, isPanning, getCanvasCoords, onCursorMove]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && currentStrokeRef.current) {
      onStrokeComplete(currentStrokeRef.current);
      const canvas = activeCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      currentStrokeRef.current = null;
    }
    setIsDrawing(false);
  }, [isDrawing, isPanning, onStrokeComplete]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, scale * delta));
    setScale(newScale);
  }, [scale]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      const cx = wrapper.clientWidth / 2 - (CANVAS_WIDTH / 2) * scale;
      const cy = wrapper.clientHeight / 2 - (CANVAS_HEIGHT / 2) * scale;
      setOffset({ x: cx, y: cy });
    }
  }, []);

  const sortedLayers = [...frame.layers].sort((a, b) => a.order - b.order);

  return (
    <div
      ref={wrapperRef}
      className="canvas-wrapper"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isPanning ? 'grabbing' : toolState.tool === 'picker' ? 'crosshair' : 'crosshair' }}
    >
      <canvas ref={gridCanvasRef} className="canvas-grid" />
      
      <div
        className="canvas-container"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
        }}
      >
        {sortedLayers.map(layer => (
          <canvas
            key={layer.id}
            ref={el => {
              if (el) layerCanvasRefs.current.set(layer.id, el);
            }}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="layer-canvas"
            style={{
              opacity: layer.visible ? 1 : 0,
              pointerEvents: 'none'
            }}
          />
        ))}
        <canvas
          ref={activeCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="layer-canvas"
          style={{ pointerEvents: 'none', zIndex: 10 }}
        />
      </div>

      {remoteUsers.map(user => (
        <div
          key={user.id}
          className="remote-cursor"
          style={{
            left: user.x * scale + offset.x,
            top: user.y * scale + offset.y
          }}
        >
          <div
            className="remote-cursor-dot"
            style={{ backgroundColor: user.color, color: user.color }}
          />
          <div className="remote-cursor-label">{user.name}</div>
        </div>
      ))}
    </div>
  );
};

export default Canvas;
