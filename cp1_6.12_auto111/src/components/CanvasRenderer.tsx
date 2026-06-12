import { useEffect, useRef, useCallback, useState } from 'react';
import type { Dialog } from '../types';

interface CanvasRendererProps {
  width: number;
  height: number;
  gridCols: number;
  gridRows: number;
  dialogs: Dialog[];
  showGrid?: boolean;
  onDoubleClick: (x: number, y: number) => void;
  onResize?: (scale: number) => void;
}

export default function CanvasRenderer({
  width,
  height,
  gridCols,
  gridRows,
  dialogs,
  showGrid = true,
  onDoubleClick,
  onResize
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [scale, setScale] = useState(1);
  const renderStateRef = useRef({
    needsRender: false,
    width,
    height,
    gridCols,
    gridRows,
    dialogs,
    showGrid,
    scale: 1,
    dpr: window.devicePixelRatio || 1
  });

  const updateScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const newScale = Math.min(1, containerWidth / width);
    setScale(newScale);
    renderStateRef.current.scale = newScale;
    renderStateRef.current.dpr = window.devicePixelRatio || 1;
    renderStateRef.current.needsRender = true;
    requestRender();
    onResize?.(newScale);
  }, [width, onResize]);

  useEffect(() => {
    updateScale();

    const handleWindowResize = () => {
      updateScale();
    };

    window.addEventListener('resize', handleWindowResize);

    if (containerRef.current && 'ResizeObserver' in window) {
      resizeObserverRef.current = new ResizeObserver(() => {
        updateScale();
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [updateScale]);

  useEffect(() => {
    renderStateRef.current = {
      ...renderStateRef.current,
      needsRender: true,
      width,
      height,
      gridCols,
      gridRows,
      dialogs,
      showGrid
    };
    requestRender();
  }, [width, height, gridCols, gridRows, dialogs, showGrid]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.time('canvas_render');

    const state = renderStateRef.current;
    const { dpr, scale } = state;

    const displayWidth = state.width * scale;
    const displayHeight = state.height * scale;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr * scale, dpr * scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = '#F5E8E1';
    ctx.fillRect(0, 0, state.width, state.height);

    if (state.showGrid) {
      const cellWidth = state.width / state.gridCols;
      const cellHeight = state.height / state.gridRows;

      ctx.strokeStyle = '#D6CCC2';
      ctx.lineWidth = 1 / scale;
      ctx.setLineDash([5 / scale, 5 / scale]);

      for (let i = 1; i < state.gridCols; i++) {
        const x = i * cellWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, state.height);
        ctx.stroke();
      }

      for (let j = 1; j < state.gridRows; j++) {
        const y = j * cellHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(state.width, y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
      ctx.strokeStyle = '#D6CCC2';
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(0, 0, state.width, state.height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.font = `${12 / scale}px sans-serif`;
      for (let row = 0; row < state.gridRows; row++) {
        for (let col = 0; col < state.gridCols; col++) {
          const x = col * cellWidth;
          const y = row * cellHeight;
          ctx.fillText(`${row + 1}-${col + 1}`, x + 8 / scale, y + 20 / scale);
        }
      }
    }

    renderStateRef.current.needsRender = false;

    console.timeEnd('canvas_render');
  }, []);

  const requestRender = useCallback(() => {
    if (renderStateRef.current.needsRender && animationFrameRef.current !== null) {
      return;
    }
    renderStateRef.current.needsRender = true;

    const renderLoop = () => {
      if (renderStateRef.current.needsRender) {
        const start = performance.now();
        render();
        const elapsed = performance.now() - start;
        if (elapsed > 16) {
          console.warn(`Canvas render took ${elapsed.toFixed(2)}ms, may cause frame drop`);
        }
      }
      animationFrameRef.current = null;
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [render]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    onDoubleClick(x, y);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        onDoubleClick={handleDoubleClick}
        style={{
          position: 'relative',
          cursor: 'crosshair',
          borderRadius: 8,
          display: 'block'
        }}
      />
    </div>
  );
}
