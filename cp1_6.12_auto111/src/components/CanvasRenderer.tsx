import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#F5F1E8';
    ctx.fillRect(0, 0, width, height);

    const cellWidth = width / gridCols;
    const cellHeight = height / gridRows;

    ctx.strokeStyle = '#D6CCC2';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    for (let i = 1; i < gridCols; i++) {
      const x = i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let j = 1; j < gridRows; j++) {
      const y = j * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = '#D6CCC2';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
  }, [width, height, gridCols, gridRows, dialogs]);

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
        cursor: 'crosshair'
      }}
    />
  );
}
