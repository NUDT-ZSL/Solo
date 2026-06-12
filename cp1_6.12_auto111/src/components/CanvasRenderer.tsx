import { useEffect, useRef, useCallback } from 'react';
import type { Dialog } from '../types';

interface CanvasRendererProps {
  width: number;
  height: number;
  gridCols: number;
  gridRows: number;
  dialogs: Dialog[];
  onDoubleClick: (x: number, y: number) => void;
}

export default function CanvasRenderer({
  width,
  height,
  gridCols,
  gridRows,
  dialogs,
  onDoubleClick
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const renderStateRef = useRef({
    needsRender: false,
    width,
    height,
    gridCols,
    gridRows,
    dialogs
  });

  useEffect(() => {
    renderStateRef.current = {
      needsRender: true,
      width,
      height,
      gridCols,
      gridRows,
      dialogs
    };
    requestRender();
  }, [width, height, gridCols, gridRows, dialogs]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = renderStateRef.current;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = state.width * dpr;
    canvas.height = state.height * dpr;
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#F5E8E1';
    ctx.fillRect(0, 0, state.width, state.height);

    const cellWidth = state.width / state.gridCols;
    const cellHeight = state.height / state.gridRows;

    ctx.strokeStyle = '#D6CCC2';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

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
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, state.width, state.height);

    for (let row = 0; row < state.gridRows; row++) {
      for (let col = 0; col < state.gridCols; col++) {
        const x = col * cellWidth;
        const y = row * cellHeight;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${row + 1}-${col + 1}`, x + 8, y + 20);
      }
    }

    renderStateRef.current.needsRender = false;
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onDoubleClick(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: 'crosshair',
        borderRadius: 8
      }}
    />
  );
}
