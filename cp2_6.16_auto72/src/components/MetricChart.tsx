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
  const prevDataKeyRef = useRef<string>('');
  const prevMouseRef = useRef<string>('');

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);

      const chartW = canvasWidth - PADDING_LEFT - PADDING_RIGHT;
      const chartH = canvasHeight - PADDING_TOP - PADDING_BOTTOM;

      ctx.fillStyle = '#0f172a';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(0, 0, canvasWidth, canvasHeight, 8);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      const yTicks = [0, 25, 50, 75, 100];
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 0; i < yTicks.length; i++) {
        const y = PADDING_TOP + chartH * (1 - yTicks[i] / 100);
        ctx.beginPath();
        ctx.moveTo(PADDING_LEFT, y);
        ctx.lineTo(canvasWidth - PADDING_RIGHT, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#475569';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      for (let i = 0; i < yTicks.length; i++) {
        const val = yTicks[yTicks.length - 1 - i];
        const y = PADDING_TOP + (chartH / (yTicks.length - 1)) * i;
        ctx.fillText(val.toString(), PADDING_LEFT - 6, y + 3);
      }

      if (data.length < 2) {
        ctx.restore();
        return;
      }

      const visibleCount = Math.min(data.length, 60);
      const visibleData = data.slice(-visibleCount);
      const xStep = chartW / (visibleCount - 1);

      ctx.fillStyle = '#64748b';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const lastTimestamp = visibleData[visibleData.length - 1].timestamp;
      const xAxisY = canvasHeight - PADDING_BOTTOM + 12;
      for (let i = 0; i < visibleCount; i++) {
        const secAgo = Math.round((lastTimestamp - visibleData[i].timestamp) / 1000);
        if (secAgo % 10 === 0 && secAgo >= 0 && secAgo <= 50) {
          const x = PADDING_LEFT + i * xStep;
          ctx.fillText(`-${secAgo}s`, x, xAxisY);
        }
      }

      const points = visibleData.map((pt, i) => ({
        x: PADDING_LEFT + i * xStep,
        y: PADDING_TOP + chartH * (1 - pt.value / 100),
      }));

      const gradient = ctx.createLinearGradient(0, PADDING_TOP, 0, PADDING_TOP + chartH);
      gradient.addColorStop(0, hexToRgba(color, 0.2));
      gradient.addColorStop(1, hexToRgba(color, 0));

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

        if (
          mx >= PADDING_LEFT &&
          mx <= canvasWidth - PADDING_RIGHT &&
          my >= PADDING_TOP &&
          my <= PADDING_TOP + chartH
        ) {
          const idx = Math.round((mx - PADDING_LEFT) / xStep);
          const clampedIdx = Math.max(0, Math.min(points.length - 1, idx));
          const pt = points[clampedIdx];

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
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          const text = `${visibleData[clampedIdx].value.toFixed(1)}%`;
          const textMetrics = ctx.measureText(text);
          const textWidth = textMetrics.width + 12;
          const textHeight = 20;
          let textX = pt.x + 10;
          let textY = pt.y - 16;
          if (textX + textWidth > canvasWidth - PADDING_RIGHT) {
            textX = pt.x - textWidth - 10;
          }
          if (textY < PADDING_TOP) {
            textY = pt.y + 16;
          }

          ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(textX - 4, textY - 14, textWidth, textHeight, 4);
            ctx.fill();
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, textX + 2, textY);
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

    const dataKey = data.map((d) => `${d.timestamp}:${d.value}`).join('|');
    const mouseKey = mousePos ? `${mousePos.x},${mousePos.y}` : 'null';
    if (dataKey === prevDataKeyRef.current && mouseKey === prevMouseRef.current) return;
    prevDataKeyRef.current = dataKey;
    prevMouseRef.current = mouseKey;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, rect.width * dpr);
    canvas.height = Math.max(1, CHART_HEIGHT * dpr);
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
      style={{
        width: '100%',
        height: CHART_HEIGHT,
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#0f172a',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: CHART_HEIGHT }} />
    </div>
  );
});

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

MetricChart.displayName = 'MetricChart';

export default MetricChart;
