import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import type { PaceEntry } from '../types';
import { formatPace } from '../utils/format';

interface PaceChartProps {
  paceData: PaceEntry[];
  currentKm: number;
  onPaceChange: (km: number, newPace: number) => void;
  disabled?: boolean;
}

interface Point {
  x: number;
  y: number;
  km: number;
  pace: number;
}

const CHART_WIDTH = 700;
const CHART_HEIGHT = 300;
const PADDING_LEFT = 60;
const PADDING_RIGHT = 20;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 40;
const CONTROL_RADIUS = 6;

const PaceChart: React.FC<PaceChartProps> = memo(function PaceChart({
  paceData,
  currentKm,
  onPaceChange,
  disabled = false
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dirtyRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const paceRangeRef = useRef<{ min: number; max: number }>({ min: 0, max: 0 });

  const calculatePoints = useCallback(() => {
    if (paceData.length === 0) return;

    const actualPaces = paceData.map(p => p.actualPace);
    const recommendedPaces = paceData.map(p => p.recommendedPace);
    const allPaces = [...actualPaces, ...recommendedPaces];
    const minPace = Math.min(...allPaces) - 10;
    const maxPace = Math.max(...allPaces) + 10;

    paceRangeRef.current = { min: minPace, max: maxPace };

    const chartWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    const points: Point[] = paceData.map((entry, index) => ({
      x: PADDING_LEFT + (index / (paceData.length - 1)) * chartWidth,
      y: PADDING_TOP + chartHeight - ((entry.actualPace - minPace) / (maxPace - minPace)) * chartHeight,
      km: entry.km,
      pace: entry.actualPace
    }));

    pointsRef.current = points;
    dirtyRectRef.current = { x: 0, y: 0, w: CHART_WIDTH, h: CHART_HEIGHT };
  }, [paceData]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = dirtyRectRef.current || { x: 0, y: 0, w: CHART_WIDTH, h: CHART_HEIGHT };

    ctx.save();

    ctx.imageSmoothingEnabled = true;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (dirtyRectRef.current) {
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
    }

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);

    const { min: minPace, max: maxPace } = paceRangeRef.current;
    const chartWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const y = PADDING_TOP + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(PADDING_LEFT, y);
      ctx.lineTo(CHART_WIDTH - PADDING_RIGHT, y);
      ctx.stroke();

      const paceValue = maxPace - (i / 5) * (maxPace - minPace);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatPace(paceValue), PADDING_LEFT - 8, y + 4);
    }

    for (let i = 0; i <= 7; i++) {
      const km = (i / 7) * 42;
      const x = PADDING_LEFT + (km / 42.2) * chartWidth;
      ctx.fillStyle = '#64748b';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(km)}`, x, CHART_HEIGHT - PADDING_BOTTOM + 18);
    }

    if (paceData.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      paceData.forEach((entry, index) => {
        const x = PADDING_LEFT + (index / (paceData.length - 1)) * chartWidth;
        const y = PADDING_TOP + chartHeight - ((entry.recommendedPace - minPace) / (maxPace - minPace)) * chartHeight;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      pointsRef.current.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      pointsRef.current.forEach((point, index) => {
        const isCompleted = paceData[index].km <= currentKm;
        const isIntersection = Math.abs(
          paceData[index].actualPace - paceData[index].recommendedPace
        ) < 2;

        ctx.beginPath();
        ctx.arc(point.x, point.y, CONTROL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = isCompleted ? '#ffffff' : '#cbd5e1';
        ctx.fill();
        ctx.strokeStyle = isIntersection ? '#3b82f6' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (isDragging && draggedIndex === index) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, CONTROL_RADIUS + 3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(PADDING_LEFT, PADDING_TOP, chartWidth, chartHeight);

    ctx.fillStyle = '#475569';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('公里数', CHART_WIDTH / 2, CHART_HEIGHT - 8);

    ctx.save();
    ctx.translate(16, CHART_HEIGHT / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('配速 (分钟/公里)', 0, 0);
    ctx.restore();

    ctx.restore();
    dirtyRectRef.current = null;
  }, [paceData, currentKm, isDragging, draggedIndex]);

  const scheduleDraw = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      draw();
      animationFrameRef.current = null;
    });
  }, [draw]);

  const expandDirtyRect = useCallback((x: number, y: number, radius: number) => {
    const newRect = {
      x: x - radius,
      y: y - radius,
      w: radius * 2,
      h: radius * 2
    };

    if (dirtyRectRef.current) {
      const existing = dirtyRectRef.current;
      const minX = Math.min(existing.x, newRect.x);
      const minY = Math.min(existing.y, newRect.y);
      const maxX = Math.max(existing.x + existing.w, newRect.x + newRect.w);
      const maxY = Math.max(existing.y + existing.h, newRect.y + newRect.h);
      dirtyRectRef.current = {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
      };
    } else {
      dirtyRectRef.current = newRect;
    }
  }, []);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = CHART_WIDTH / rect.width;
    const scaleY = CHART_HEIGHT / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const findNearestPoint = useCallback((x: number, y: number): number | null => {
    let nearestIndex: number | null = null;
    let minDist = Infinity;

    pointsRef.current.forEach((point, index) => {
      const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      if (dist < minDist && dist < CONTROL_RADIUS + 10) {
        minDist = dist;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    const { x, y } = getCanvasCoords(e);
    const index = findNearestPoint(x, y);

    if (index !== null) {
      setIsDragging(true);
      setDraggedIndex(index);
      const point = pointsRef.current[index];
      expandDirtyRect(point.x, point.y, CONTROL_RADIUS + 20);
      scheduleDraw();
    }
  }, [disabled, getCanvasCoords, findNearestPoint, expandDirtyRect, scheduleDraw]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || draggedIndex === null) return;

    const { y } = getCanvasCoords(e);
    const { min: minPace, max: maxPace } = paceRangeRef.current;
    const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    let newY = Math.max(PADDING_TOP, Math.min(CHART_HEIGHT - PADDING_BOTTOM, y));
    const newPace = maxPace - ((newY - PADDING_TOP) / chartHeight) * (maxPace - minPace);
    const clampedPace = Math.max(180, Math.min(600, Math.round(newPace * 10) / 10));

    const point = pointsRef.current[draggedIndex];
    expandDirtyRect(point.x, point.y, CONTROL_RADIUS + 20);

    pointsRef.current[draggedIndex] = {
      ...point,
      y: newY,
      pace: clampedPace
    };

    expandDirtyRect(point.x, newY, CONTROL_RADIUS + 20);

    const entry = paceData[draggedIndex];
    if (entry) {
      onPaceChange(entry.km, clampedPace);
    }

    scheduleDraw();
  }, [isDragging, draggedIndex, getCanvasCoords, expandDirtyRect, scheduleDraw, paceData, onPaceChange]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && draggedIndex !== null) {
      const point = pointsRef.current[draggedIndex];
      expandDirtyRect(point.x, point.y, CONTROL_RADIUS + 20);
    }
    setIsDragging(false);
    setDraggedIndex(null);
    scheduleDraw();
  }, [isDragging, draggedIndex, expandDirtyRect, scheduleDraw]);

  useEffect(() => {
    calculatePoints();
  }, [calculatePoints]);

  useEffect(() => {
    dirtyRectRef.current = { x: 0, y: 0, w: CHART_WIDTH, h: CHART_HEIGHT };
    scheduleDraw();
  }, [currentKm, scheduleDraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = CHART_WIDTH * devicePixelRatio;
    canvas.height = CHART_HEIGHT * devicePixelRatio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    dirtyRectRef.current = { x: 0, y: 0, w: CHART_WIDTH, h: CHART_HEIGHT };
    scheduleDraw();
  }, [scheduleDraw]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="card">
      <h3 style={{ marginBottom: '16px', color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>
        配速曲线图
      </h3>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: `${CHART_WIDTH}px`
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          style={{
            width: '100%',
            height: 'auto',
            cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '2px', backgroundColor: '#3b82f6' }}></div>
          <span style={{ color: '#64748b' }}>推荐配速</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '2px', backgroundColor: '#ef4444', borderStyle: 'dashed' }}></div>
          <span style={{ color: '#64748b' }}>实际配速</span>
        </div>
      </div>
    </div>
  );
});

export default PaceChart;
