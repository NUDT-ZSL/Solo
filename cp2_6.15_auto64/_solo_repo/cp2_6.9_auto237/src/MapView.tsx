import { useRef, useEffect, useState, useCallback } from 'react';
import type { Point, SoundType } from './types';
import { SOUND_COLORS } from './types';

interface MapViewProps {
  points: Point[];
  selectedPoint: Point | null;
  onPointClick: (point: Point) => void;
  onMapClick: (x: number, y: number) => void;
  previewPosition: { x: number; y: number } | null;
  viewCenter: { x: number; y: number };
  zoom: number;
  onViewChange: (center: { x: number; y: number }, zoom: number) => void;
}

const MapView = ({
  points,
  selectedPoint,
  onPointClick,
  onMapClick,
  previewPosition,
  viewCenter,
  zoom,
  onViewChange
}: MapViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 640, height: 480 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; centerX: number; centerY: number } | null>(null);
  const animationRef = useRef<number | null>(null);
  const hoveredScaleRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({
          width: Math.max(320, rect.width),
          height: Math.max(320, rect.height)
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const cx = size.width / 2;
    const cy = size.height / 2;
    return {
      x: cx + (wx - viewCenter.x) * zoom,
      y: cy + (wy - viewCenter.y) * zoom
    };
  }, [size, viewCenter, zoom]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const cx = size.width / 2;
    const cy = size.height / 2;
    return {
      x: (sx - cx) / zoom + viewCenter.x,
      y: (sy - cy) / zoom + viewCenter.y
    };
  }, [size, viewCenter, zoom]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(0, 0, size.width, size.height);

    const gridSize = 50 * zoom;
    const offsetX = ((size.width / 2 - viewCenter.x * zoom) % gridSize + gridSize) % gridSize;
    const offsetY = ((size.height / 2 - viewCenter.y * zoom) % gridSize + gridSize) % gridSize;

    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = offsetX; x < size.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.height);
    }
    for (let y = offsetY; y < size.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
    }
    ctx.stroke();

    points.forEach(point => {
      const pos = worldToScreen(point.x, point.y);
      const baseRadius = 15;
      const targetScale = hoveredPointId === point.id || selectedPoint?.id === point.id ? 1.2 : 1;
      const currentScale = hoveredScaleRef.current[point.id] || 1;
      const newScale = currentScale + (targetScale - currentScale) * 0.1;
      hoveredScaleRef.current[point.id] = newScale;
      const radius = baseRadius * newScale;

      if (point.waveform && point.waveform.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = point.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        const segments = point.waveform.length;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const amp = point.waveform[i % segments] || 0;
          const r = radius + 5 + amp * 10;
          const px = pos.x + Math.cos(angle) * r;
          const py = pos.y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = point.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius - 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();

      if (hoveredPointId === point.id) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        const name = point.name.length > 12 ? point.name.slice(0, 12) + '...' : point.name;
        ctx.fillText(name, pos.x, pos.y - radius - 18);
        ctx.fillStyle = '#B0B0B0';
        ctx.fillText(`${point.duration.toFixed(1)}s`, pos.x, pos.y - radius - 4);
      }
    });

    if (previewPosition) {
      const pos = worldToScreen(previewPosition.x, previewPosition.y);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
      ctx.fill();
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [size, viewCenter, zoom, points, hoveredPointId, selectedPoint, previewPosition, worldToScreen]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const findPointAt = (sx: number, sy: number): Point | null => {
    for (let i = points.length - 1; i >= 0; i--) {
      const point = points[i];
      const pos = worldToScreen(point.x, point.y);
      const dx = sx - pos.x;
      const dy = sy - pos.y;
      if (dx * dx + dy * dy <= 18 * 18) {
        return point;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const point = findPointAt(pos.x, pos.y);

    if (point) {
      onPointClick(point);
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      x: pos.x,
      y: pos.y,
      centerX: viewCenter.x,
      centerY: viewCenter.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (isDragging && dragStartRef.current) {
      const dx = (pos.x - dragStartRef.current.x) / zoom;
      const dy = (pos.y - dragStartRef.current.y) / zoom;
      onViewChange(
        {
          x: dragStartRef.current.centerX - dx,
          y: dragStartRef.current.centerY - dy
        },
        zoom
      );
      return;
    }

    const point = findPointAt(pos.x, pos.y);
    setHoveredPointId(point ? point.id : null);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && dragStartRef.current) {
      const pos = getMousePos(e);
      const dx = Math.abs(pos.x - dragStartRef.current.x);
      const dy = Math.abs(pos.y - dragStartRef.current.y);
      if (dx < 5 && dy < 5) {
        const worldPos = screenToWorld(pos.x, pos.y);
        onMapClick(worldPos.x, worldPos.y);
      }
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    setHoveredPointId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));

    const pos = getMousePos(e);
    const worldBefore = screenToWorld(pos.x, pos.y);

    const cx = size.width / 2;
    const cy = size.height / 2;
    const newCenterX = worldBefore.x - (pos.x - cx) / newZoom;
    const newCenterY = worldBefore.y - (pos.y - cy) / newZoom;

    onViewChange({ x: newCenterX, y: newCenterY }, newZoom);
  };

  return (
    <>
      <style>{`
        .map-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          cursor: grab;
        }
        .map-container:active {
          cursor: grabbing;
        }
        .map-canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .map-hint {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(20, 20, 40, 0.9);
          backdrop-filter: blur(10px);
          padding: 8px 16px;
          border-radius: 20px;
          color: #B0B0B0;
          font-size: 13px;
          pointer-events: none;
          border: 1px solid #3A3A3A;
        }
      `}</style>
      <div
        ref={containerRef}
        className="map-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          className="map-canvas"
          style={{ width: size.width, height: size.height }}
        />
        <div className="map-hint">拖拽平移 · 滚轮缩放 · 点击空白处添加点位</div>
      </div>
    </>
  );
};

export default MapView;
