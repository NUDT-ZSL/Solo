import { useRef, useEffect, useCallback, useState } from 'react';
import type { CanvasData } from '../utils/exportUtils';

interface PixelCanvasProps {
  canvasData: CanvasData;
  gridSize: number;
  cellSize: number;
  onPixelDraw: (x: number, y: number) => void;
  onBatchPixelDraw: (pixels: Array<{ x: number; y: number }>) => void;
}

interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;

  while (true) {
    points.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
  return points;
}

export default function PixelCanvas({
  canvasData,
  gridSize,
  cellSize,
  onPixelDraw,
  onBatchPixelDraw,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<ViewState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const lastCellRef = useRef<{ x: number; y: number } | null>(null);
  const viewStateRef = useRef(viewState);
  const canvasDataRef = useRef(canvasData);

  viewStateRef.current = viewState;
  canvasDataRef.current = canvasData;

  const totalPixelSize = gridSize * cellSize;

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;
      const vs = viewStateRef.current;
      const gridX = Math.floor((canvasX - vs.offsetX) / (cellSize * vs.scale));
      const gridY = Math.floor((canvasY - vs.offsetY) / (cellSize * vs.scale));
      if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
        return { x: gridX, y: gridY };
      }
      return null;
    },
    [cellSize, gridSize]
  );

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vs = viewStateRef.current;
    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    ctx.save();
    ctx.translate(vs.offsetX, vs.offsetY);
    ctx.scale(vs.scale, vs.scale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalPixelSize, totalPixelSize);

    canvasDataRef.current.forEach((color, key) => {
      const [xStr, yStr] = key.split(',');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      ctx.fillStyle = color;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    });

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5 / vs.scale;
    ctx.beginPath();
    for (let i = 0; i <= gridSize; i++) {
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, totalPixelSize);
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(totalPixelSize, i * cellSize);
    }
    ctx.stroke();

    ctx.restore();
  }, [gridSize, cellSize, totalPixelSize]);

  useEffect(() => {
    const rafId = requestAnimationFrame(drawCanvas);
    return () => cancelAnimationFrame(rafId);
  }, [drawCanvas, canvasData, viewState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      drawCanvas();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [drawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vs = viewStateRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(4, Math.max(0.5, vs.scale * zoomFactor));

      const worldX = (mouseX - vs.offsetX) / vs.scale;
      const worldY = (mouseY - vs.offsetY) / vs.scale;

      setViewState({
        scale: newScale,
        offsetX: mouseX - worldX * newScale,
        offsetY: mouseY - worldY * newScale,
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener('contextmenu', handleContextMenu);
    return () => canvas.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 2) {
        isPanningRef.current = true;
        lastPanRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      if (e.button === 0) {
        isDrawingRef.current = true;
        const cell = getCellFromEvent(e);
        if (cell) {
          lastCellRef.current = cell;
          onPixelDraw(cell.x, cell.y);
        }
      }
    },
    [getCellFromEvent, onPixelDraw]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const vs = viewStateRef.current;
        setViewState({
          ...vs,
          offsetX: vs.offsetX + (e.clientX - lastPanRef.current.x),
          offsetY: vs.offsetY + (e.clientY - lastPanRef.current.y),
        });
        lastPanRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (isDrawingRef.current) {
        const fakeEvent = { clientX: e.clientX, clientY: e.clientY } as React.MouseEvent<HTMLCanvasElement>;
        const cell = getCellFromEvent(fakeEvent as unknown as MouseEvent);
        if (cell) {
          const last = lastCellRef.current;
          if (last) {
            if (last.x !== cell.x || last.y !== cell.y) {
              const points = bresenhamLine(last.x, last.y, cell.x, cell.y);
              const newPixels = points.filter(
                (p) => p.x !== last.x || p.y !== last.y
              );
              if (newPixels.length > 0) {
                onBatchPixelDraw(newPixels);
              }
              lastCellRef.current = cell;
            }
          } else {
            lastCellRef.current = cell;
            onPixelDraw(cell.x, cell.y);
          }
        }
      }
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
      isPanningRef.current = false;
      lastCellRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getCellFromEvent, onPixelDraw, onBatchPixelDraw]);

  const cursorStyle = isPanningRef.current ? 'grabbing' : 'crosshair';

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        style={{
          display: 'block',
          cursor: cursorStyle,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
