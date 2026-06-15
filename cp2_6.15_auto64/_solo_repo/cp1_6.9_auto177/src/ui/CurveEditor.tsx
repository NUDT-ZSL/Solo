import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ControlPoint } from '../types';

interface CurveEditorProps {
  label: string;
  points: ControlPoint[];
  onChange: (points: ControlPoint[]) => void;
  yRange?: [number, number];
}

const CANVAS_SIZE = 200;
const PADDING = 20;
const POINT_RADIUS = 8;

const CurveEditor: React.FC<CurveEditorProps> = ({
  label,
  points,
  onChange,
  yRange = [0, 1]
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const toCanvasX = useCallback((x: number) => {
    return PADDING + x * (CANVAS_SIZE - 2 * PADDING);
  }, []);

  const toCanvasY = useCallback((y: number) => {
    return CANVAS_SIZE - PADDING - y * (CANVAS_SIZE - 2 * PADDING);
  }, []);

  const fromCanvasX = useCallback((x: number) => {
    return (x - PADDING) / (CANVAS_SIZE - 2 * PADDING);
  }, []);

  const fromCanvasY = useCallback((y: number) => {
    return (CANVAS_SIZE - PADDING - y) / (CANVAS_SIZE - 2 * PADDING);
  }, []);

  const bernstein = (n: number, i: number, t: number) => {
    const binomial = (a: number, b: number) => {
      let result = 1;
      for (let k = 0; k < b; k++) {
        result = result * (a - k) / (k + 1);
      }
      return result;
    };
    return binomial(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
  };

  const getBezierPoint = useCallback((t: number): { x: number; y: number } => {
    const n = points.length - 1;
    let x = 0, y = 0;
    for (let i = 0; i <= n; i++) {
      const b = bernstein(n, i, t);
      x += points[i].x * b;
      y += points[i].y * b;
    }
    return { x, y };
  }, [points]);

  const getWaveValue = useCallback((t: number): number => {
    const clamped = Math.max(0, Math.min(1, t));
    return getBezierPoint(clamped).y;
  }, [getBezierPoint]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridCount = 5;
    const step = (CANVAS_SIZE - 2 * PADDING) / gridCount;
    for (let i = 0; i <= gridCount; i++) {
      const x = PADDING + i * step;
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, CANVAS_SIZE - PADDING);
      ctx.stroke();
      const y = PADDING + i * step;
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(CANVAS_SIZE - PADDING, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PADDING, PADDING, CANVAS_SIZE - 2 * PADDING, CANVAS_SIZE - 2 * PADDING);
  }, []);

  const drawCurve = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.strokeStyle = '#00BFFF';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 8;
    const start = getBezierPoint(0);
    ctx.moveTo(toCanvasX(start.x), toCanvasY(start.y));
    for (let t = 0; t <= 1; t += 0.01) {
      const p = getBezierPoint(t);
      ctx.lineTo(toCanvasX(p.x), toCanvasY(p.y));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [getBezierPoint, toCanvasX, toCanvasY]);

  const drawControlLines = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i < points.length - 1; i++) {
      ctx.moveTo(toCanvasX(points[i].x), toCanvasY(points[i].y));
      ctx.lineTo(toCanvasX(points[i + 1].x), toCanvasY(points[i + 1].y));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, [points, toCanvasX, toCanvasY]);

  const drawControlPoints = useCallback((ctx: CanvasRenderingContext2D) => {
    points.forEach((p, i) => {
      const x = toCanvasX(p.x);
      const y = toCanvasY(p.y);
      ctx.beginPath();
      if (draggingIndex === i || hoverIndex === i) {
        ctx.fillStyle = '#00BFFF';
        ctx.shadowColor = '#00BFFF';
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 4;
      }
      ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [points, draggingIndex, hoverIndex, toCanvasX, toCanvasY]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawGrid(ctx);
    drawControlLines(ctx);
    drawCurve(ctx);
    drawControlPoints(ctx);
  }, [drawGrid, drawControlLines, drawCurve, drawControlPoints]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const findPointAt = (mouseX: number, mouseY: number): number => {
    for (let i = 0; i < points.length; i++) {
      const px = toCanvasX(points[i].x);
      const py = toCanvasY(points[i].y);
      const dx = mouseX - px;
      const dy = mouseY - py;
      if (Math.sqrt(dx * dx + dy * dy) <= POINT_RADIUS + 4) {
        return i;
      }
    }
    return -1;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const idx = findPointAt(pos.x, pos.y);
    if (idx >= 0) {
      setDraggingIndex(idx);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    if (draggingIndex !== null) {
      const newPoints = [...points];
      let newX = fromCanvasX(pos.x);
      let newY = fromCanvasY(pos.y);
      if (draggingIndex === 0) {
        newX = 0;
      } else if (draggingIndex === points.length - 1) {
        newX = 1;
      }
      newX = Math.max(0, Math.min(1, newX));
      newY = Math.max(0, Math.min(1, newY));
      newPoints[draggingIndex] = {
        x: newX,
        y: newY
      };
      onChange(newPoints);
    } else {
      const idx = findPointAt(pos.x, pos.y);
      setHoverIndex(idx >= 0 ? idx : null);
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const handleMouseLeave = () => {
    setDraggingIndex(null);
    setHoverIndex(null);
  };

  const [yMin, yMax] = yRange;
  const previewValue = (getWaveValue(0.5) * (yMax - yMin) + yMin).toFixed(2);

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={canvasStyle}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        <div style={rangeLabelStyle}>
          <span>{yMin}</span>
          <span style={{ color: '#00BFFF' }}>中点: {previewValue}</span>
          <span>{yMax}</span>
        </div>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  marginBottom: '16px'
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.85)',
  fontSize: '13px',
  fontWeight: 500,
  marginBottom: '8px',
  letterSpacing: '0.5px'
};

const canvasStyle: React.CSSProperties = {
  display: 'block',
  borderRadius: '8px',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  cursor: 'crosshair',
  transition: 'border-color 0.2s ease'
};

const rangeLabelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '6px',
  fontSize: '11px',
  color: 'rgba(255, 255, 255, 0.5)'
};

export default CurveEditor;
