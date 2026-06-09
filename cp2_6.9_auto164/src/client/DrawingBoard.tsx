import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ShapeData, ShapeType } from '../types';
import { drawShape, createShapeFromDrag } from './utils/drawingUtils';

interface DrawingBoardProps {
  onSubmit: (shape: ShapeData) => Promise<void>;
}

const SHAPE_TYPES: { type: ShapeType; label: string }[] = [
  { type: 'rectangle', label: '矩形' },
  { type: 'circle', label: '圆形' },
  { type: 'triangle', label: '三角形' },
  { type: 'star', label: '星形' }
];

const DrawingBoard: React.FC<DrawingBoardProps> = ({ onSubmit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [previewShape, setPreviewShape] = useState<ShapeData | null>(null);
  const [newShapeAnimation, setNewShapeAnimation] = useState<string | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    redrawAll();
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(15, 52, 96, 0.3)';
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    shapes.forEach((shape) => {
      drawShape(ctx, shape);
    });

    if (previewShape) {
      ctx.globalAlpha = 0.6;
      drawShape(ctx, previewShape);
      ctx.globalAlpha = 1;
    }
  }, [shapes, previewShape]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(redrawAll);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [redrawAll]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoords(e);
    startPosRef.current = pos;
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPosRef.current) return;
    const pos = getCanvasCoords(e);
    const preview = createShapeFromDrag(
      selectedShape,
      startPosRef.current.x,
      startPosRef.current.y,
      pos.x,
      pos.y
    );
    setPreviewShape(preview);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPosRef.current) return;
    const pos = getCanvasCoords(e);

    const shape = createShapeFromDrag(
      selectedShape,
      startPosRef.current.x,
      startPosRef.current.y,
      pos.x,
      pos.y
    );

    setShapes((prev) => [...prev, shape]);
    setNewShapeAnimation(shape.id);
    setTimeout(() => setNewShapeAnimation(null), 300);

    setIsDrawing(false);
    setPreviewShape(null);
    startPosRef.current = null;
  };

  const handleSubmit = async () => {
    if (shapes.length === 0) return;
    const lastShape = shapes[shapes.length - 1];
    await onSubmit(lastShape);
    setShapes([]);
  };

  const handleClear = () => {
    setShapes([]);
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.shapeSelector}>
          {SHAPE_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setSelectedShape(type)}
              style={{
                ...styles.shapeButton,
                ...(selectedShape === type ? styles.shapeButtonActive : {})
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={styles.actions}>
          <button onClick={handleClear} style={styles.clearButton}>
            清空
          </button>
          <button
            onClick={handleSubmit}
            style={{
              ...styles.submitButton,
              ...(shapes.length === 0 ? styles.submitButtonDisabled : {})
            }}
            disabled={shapes.length === 0}
          >
            提交灵感
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {newShapeAnimation && (
        <style>{`
          @keyframes shapeEnter {
            from { transform: scale(0.5); opacity: 0.5; }
            to { transform: scale(1); opacity: 0.8; }
          }
        `}</style>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e',
    position: 'relative'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #0f3460'
  },
  shapeSelector: {
    display: 'flex',
    gap: '8px'
  },
  shapeButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#e0e0e0',
    border: '1px solid #0f3460',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  shapeButtonActive: {
    backgroundColor: '#0f3460',
    borderColor: '#0f3460',
    color: '#ffffff'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  clearButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#e94560',
    border: '1px solid #e94560',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  submitButton: {
    padding: '8px 20px',
    backgroundColor: '#0f3460',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  canvas: {
    flex: 1,
    display: 'block',
    cursor: 'crosshair'
  }
};

export default DrawingBoard;
