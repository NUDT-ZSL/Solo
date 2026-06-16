import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ControlPoint } from '../types';
import { getTemperatureColor } from '../utils/colors';

export interface CurveCanvasHandle {
  getCurveImage: () => string;
}

interface CurveCanvasProps {
  controlPoints: ControlPoint[];
  onChange?: (points: ControlPoint[]) => void;
  readOnly?: boolean;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const BG_COLOR = '#f5f5f5';
const GRID_COLOR = '#e0e0e0';
const AXIS_COLOR = '#333333';
const POINT_RADIUS = 8;
const POINT_HIT_RADIUS = 14;
const X_MIN = 50;
const X_MAX = 550;
const Y_MIN = 50;
const Y_MAX = 350;
const TIME_MIN = 0;
const TIME_MAX = 15;
const TEMP_MIN = 100;
const TEMP_MAX = 250;

const timeToX = (time: number): number => {
  return X_MIN + ((time - TIME_MIN) / (TIME_MAX - TIME_MIN)) * (X_MAX - X_MIN);
};

const xToTime = (x: number): number => {
  const clamped = Math.max(X_MIN, Math.min(X_MAX, x));
  return TIME_MIN + ((clamped - X_MIN) / (X_MAX - X_MIN)) * (TIME_MAX - TIME_MIN);
};

const tempToY = (temp: number): number => {
  return Y_MAX - ((temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * (Y_MAX - Y_MIN);
};

const yToTemp = (y: number): number => {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, y));
  return TEMP_MIN + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * (TEMP_MAX - TEMP_MIN);
};

const CurveCanvas = forwardRef<CurveCanvasHandle, CurveCanvasProps>(
  ({ controlPoints, onChange, readOnly = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [points, setPoints] = useState<ControlPoint[]>([]);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
      if (controlPoints && controlPoints.length > 0) {
        setPoints(controlPoints);
      } else {
        const defaultCount = 6;
        const defaultPoints: ControlPoint[] = [];
        for (let i = 0; i < defaultCount; i++) {
          const time = (TIME_MAX / (defaultCount - 1)) * i;
          const temperature = TEMP_MIN + 30 + ((TEMP_MAX - TEMP_MIN - 60) / (defaultCount - 1)) * i;
          defaultPoints.push({ time, temperature });
        }
        setPoints(defaultPoints);
      }
    }, [controlPoints]);

    const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;

      for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      for (let y = 0; y <= CANVAS_HEIGHT; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    }, []);

    const drawAxes = useCallback((ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = AXIS_COLOR;
      ctx.lineWidth = 2;
      ctx.fillStyle = AXIS_COLOR;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';

      ctx.beginPath();
      ctx.moveTo(X_MIN, Y_MIN);
      ctx.lineTo(X_MIN, Y_MAX);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(X_MIN, Y_MAX);
      ctx.lineTo(X_MAX, Y_MAX);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText('时间 (分钟)', (X_MIN + X_MAX) / 2, Y_MAX + 30);

      ctx.save();
      ctx.translate(18, (Y_MIN + Y_MAX) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('温度 (°C)', 0, 0);
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i <= 5; i++) {
        const time = (TIME_MAX / 5) * i;
        const x = timeToX(time);
        ctx.fillText(`${time}`, x, Y_MAX + 8);
      }

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const tempSteps = [100, 130, 160, 190, 220, 250];
      for (const temp of tempSteps) {
        const y = tempToY(temp);
        ctx.fillText(`${temp}`, X_MIN - 8, y);
      }
    }, []);

    const computeBezierPoints = useCallback((pts: ControlPoint[]) => {
      if (pts.length < 2) return null;

      const bezierSegments: {
        p0: { x: number; y: number; temp: number };
        p1: { x: number; y: number };
        p2: { x: number; y: number };
        p3: { x: number; y: number; temp: number };
      }[] = [];

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p3 = pts[i + 1];

        const x0 = timeToX(p0.time);
        const y0 = tempToY(p0.temperature);
        const x3 = timeToX(p3.time);
        const y3 = tempToY(p3.temperature);

        let x1: number, y1: number, x2: number, y2: number;

        if (i === 0) {
          const nextNext = pts[i + 2];
          if (nextNext) {
            const dx = timeToX(nextNext.time) - x0;
            const dy = tempToY(nextNext.temperature) - y0;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const segLen = Math.sqrt((x3 - x0) ** 2 + (y3 - y0) ** 2);
            const factor = (segLen * 0.4) / len;
            x1 = x0 + dx * factor;
            y1 = y0 + dy * factor;
          } else {
            x1 = x0 + (x3 - x0) * 0.33;
            y1 = y0 + (y3 - y0) * 0.33;
          }
        } else {
          const prev = pts[i - 1];
          const next = pts[i + 1];
          const dx = timeToX(next.time) - timeToX(prev.time);
          const dy = tempToY(next.temperature) - tempToY(prev.temperature);
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const segLen = Math.sqrt((x3 - x0) ** 2 + (y3 - y0) ** 2);
          const factor = (segLen * 0.4) / len;
          x1 = x0 + dx * factor;
          y1 = y0 + dy * factor;
        }

        if (i === pts.length - 2) {
          const prevPrev = pts[i - 1];
          if (prevPrev) {
            const dx = x3 - timeToX(prevPrev.time);
            const dy = y3 - tempToY(prevPrev.temperature);
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const segLen = Math.sqrt((x3 - x0) ** 2 + (y3 - y0) ** 2);
            const factor = (segLen * 0.4) / len;
            x2 = x3 - dx * factor;
            y2 = y3 - dy * factor;
          } else {
            x2 = x3 - (x3 - x0) * 0.33;
            y2 = y3 - (y3 - y0) * 0.33;
          }
        } else {
          const nextNext = pts[i + 2];
          const prev = pts[i];
          const dx = timeToX(nextNext.time) - timeToX(prev.time);
          const dy = tempToY(nextNext.temperature) - tempToY(prev.temperature);
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const segLen = Math.sqrt((x3 - x0) ** 2 + (y3 - y0) ** 2);
          const factor = (segLen * 0.4) / len;
          x2 = x3 - dx * factor;
          y2 = y3 - dy * factor;
        }

        bezierSegments.push({
          p0: { x: x0, y: y0, temp: p0.temperature },
          p1: { x: x1, y: y1 },
          p2: { x: x2, y: y2 },
          p3: { x: x3, y: y3, temp: p3.temperature },
        });
      }

      return bezierSegments;
    }, []);

    const sampleBezierAtT = (
      p0: { x: number; y: number },
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      p3: { x: number; y: number },
      t: number
    ): { x: number; y: number } => {
      const mt = 1 - t;
      const x =
        mt * mt * mt * p0.x +
        3 * mt * mt * t * p1.x +
        3 * mt * t * t * p2.x +
        t * t * t * p3.x;
      const y =
        mt * mt * mt * p0.y +
        3 * mt * mt * t * p1.y +
        3 * mt * t * t * p2.y +
        t * t * t * p3.y;
      return { x, y };
    };

    const drawCurve = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        const segments = computeBezierPoints(points);
        if (!segments || segments.length === 0) return;

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const stepsPerSegment = 100;
        for (const seg of segments) {
          for (let i = 0; i < stepsPerSegment; i++) {
            const t1 = i / stepsPerSegment;
            const t2 = (i + 1) / stepsPerSegment;

            const pos1 = sampleBezierAtT(seg.p0, seg.p1, seg.p2, seg.p3, t1);
            const pos2 = sampleBezierAtT(seg.p0, seg.p1, seg.p2, seg.p3, t2);

            const temp1 = yToTemp(pos1.y);
            const temp2 = yToTemp(pos2.y);

            const avgTemp = (temp1 + temp2) / 2;
            ctx.strokeStyle = getTemperatureColor(avgTemp);

            ctx.beginPath();
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            ctx.stroke();
          }
        }
      },
      [points, computeBezierPoints]
    );

    const drawControlPoints = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        points.forEach((point, index) => {
          const x = timeToX(point.time);
          const y = tempToY(point.temperature);

          ctx.beginPath();
          ctx.arc(x, y, POINT_RADIUS + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = getTemperatureColor(point.temperature);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          if (hoverIndex === index || draggingIndex === index) {
            ctx.beginPath();
            ctx.arc(x, y, POINT_RADIUS + 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#1976d2';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });
      },
      [points, hoverIndex, draggingIndex]
    );

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawGrid(ctx);
      drawAxes(ctx);
      drawCurve(ctx);
      drawControlPoints(ctx);
    }, [drawGrid, drawAxes, drawCurve, drawControlPoints]);

    useEffect(() => {
      draw();
    }, [draw]);

    const findPointAtPosition = (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      for (let i = points.length - 1; i >= 0; i--) {
        const point = points[i];
        const px = timeToX(point.time);
        const py = tempToY(point.temperature);
        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        if (dist <= POINT_HIT_RADIUS) {
          return i;
        }
      }
      return null;
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly) return;

      const index = findPointAtPosition(e.clientX, e.clientY);
      if (index !== null) {
        setDraggingIndex(index);
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (draggingIndex !== null && !readOnly) {
        const newTime = xToTime(x);
        const newTemp = yToTemp(y);

        const newPoints = [...points];
        newPoints[draggingIndex] = {
          time: newTime,
          temperature: newTemp,
        };

        if (draggingIndex > 0) {
          newPoints[draggingIndex].time = Math.max(
            newPoints[draggingIndex - 1].time,
            newPoints[draggingIndex].time
          );
        }
        if (draggingIndex < newPoints.length - 1) {
          newPoints[draggingIndex].time = Math.min(
            newPoints[draggingIndex + 1].time,
            newPoints[draggingIndex].time
          );
        }

        setPoints(newPoints);
        if (onChange) {
          onChange(newPoints);
        }
      } else {
        const hoverIdx = findPointAtPosition(e.clientX, e.clientY);
        setHoverIndex(hoverIdx);

        if (hoverIdx !== null) {
          setTooltipPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingIndex(null);
    };

    const handleMouseLeave = () => {
      setDraggingIndex(null);
      setHoverIndex(null);
    };

    useImperativeHandle(ref, () => ({
      getCurveImage: (): string => {
        const canvas = canvasRef.current;
        if (!canvas) return '';
        return canvas.toDataURL('image/png');
      },
    }));

    const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            cursor: readOnly ? 'default' : draggingIndex !== null ? 'grabbing' : 'grab',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              left: tooltipPos.x + 15,
              top: tooltipPos.y - 40,
              padding: '8px 12px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              fontSize: '13px',
              lineHeight: '1.5',
              pointerEvents: 'none',
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}
          >
            <div>
              <span style={{ color: '#666' }}>时间：</span>
              <span style={{ fontWeight: 600, color: '#333' }}>
                {hoveredPoint.time.toFixed(1)} 分钟
              </span>
            </div>
            <div>
              <span style={{ color: '#666' }}>温度：</span>
              <span
                style={{
                  fontWeight: 600,
                  color: getTemperatureColor(hoveredPoint.temperature),
                }}
              >
                {hoveredPoint.temperature.toFixed(1)}°C
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

CurveCanvas.displayName = 'CurveCanvas';

export default CurveCanvas;
