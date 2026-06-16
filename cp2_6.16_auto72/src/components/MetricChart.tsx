import React, { useRef, useEffect, useCallback, useState } from 'react';
import { MetricPoint } from '../types';

interface MetricChartProps {
  title: string;
  data: MetricPoint[];
  color: string;
  width?: number;
  height?: number;
}

const CHART_HEIGHT = 120;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 24;

export const MetricChart: React.FC<MetricChartProps> = React.memo(({ data, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);
  const prevDataRef = useRef<string>('');

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);

      const chartW = canvasWidth - PADDING_LEFT - PADDING_RIGHT;
      const chartH = canvasHeight - PADDING_TOP - PADDING_BOTTOM;

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasWidth, canvasHeight, 8);
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = PADDING_TOP + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(PADDING_LEFT, y);
        ctx.lineTo(canvasWidth - PADDING_RIGHT, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#475569';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= 4; i++) {
        const val = 100 - i * 25;
        const y = PADDING_TOP + (chartH / 4) * i;
        ctx.fillText(val.toString(), PADDING_LEFT - 6, y);
      }

      if (data.length < 2) {
        ctx.restore();
        return;
      }

      const visibleCount = Math.min(data.length, 60);
      const visibleData = data.slice(-visibleCount);
      const xStep = chartW / (visibleCount - 1);

      ctx.fillStyle = '#64748b';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const lastTimestamp = visibleData[visibleData.length - 1].timestamp;
      for (let i = 0; i < visibleCount; i++) {
        const secAgo = Math.round((lastTimestamp - visibleData[i].timestamp) / 1000);
        if (secAgo % 10 === 0 && secAgo <= 50) {
          const x = PADDING_LEFT + (visibleCount - 1 - i) * xStep;
          ctx.fillText(`-${secAgo}s`, x, canvasHeight - PADDING_BOTTOM + 8);
        }
      }

      const points = visibleData.map((pt, i) => ({
        x: PADDING_LEFT + i * xStep,
        y: PADDING_TOP + chartH * (1 - pt.value / 100),
      }));

      const gradient = ctx.createLinearGradient(0, PADDING_TOP, 0, PADDING_TOP + chartH);
      gradient.addColorStop(0, color + '33');
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.moveTo(points[0].x, PADDING_TOP + chartH);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
      }
      ctx.lineTo(points[points.length - 1].x, PADDING_TOP + chartH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (mousePos !== null) {
        const mx = mousePos.x;
        const my = mousePos.y;

        if (mx >= PADDING_LEFT && mx <= canvasWidth - PADDING_RIGHT && my >= PADDING_TOP && my <= PADDING_TOP + chartH) {
          const idx = Math.round((mx - PADDING_LEFT) / xStep);
          if (idx >= 0 && idx < points.length) {
            const pt = points[idx];

            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(pt.x, PADDING_TOP);
            ctx.lineTo(pt.x, PADDING_TOP + chartH);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(PADDING_LEFT, pt.y);
            ctx.lineTo(canvasWidth - PADDING_RIGHT, pt.y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            const text = `${visibleData[idx].value.toFixed(1)}%`;
            const textX = pt.x + 8 > canvasWidth - PADDING_RIGHT - 40 ? pt.x - 50 : pt.x + 8;
            const textY = pt.y - 8 < PADDING_TOP ? pt.y + 20 : pt.y - 8;
            ctx.fillText(text, textX, textY);
          }
        }
      }

      ctx.restore();
    },
    [data, color, mousePos]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dataKey = data.map((d) => d.value).join(',');
    if (dataKey === prevDataRef.current && mousePos === null) return;
    prevDataRef.current = dataKey;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${CHART_HEIGHT}px`;

    cancelAnimationFrame(rafRef.current);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      rafRef.current = requestAnimationFrame(() => {
        draw(ctx, rect.width, CHART_HEIGHT);
      });
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [data, color, mousePos, draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: CHART_HEIGHT, position: 'relative', borderRadius: 8, overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
});

MetricChart.displayName = 'MetricChart';

export default MetricChart;
