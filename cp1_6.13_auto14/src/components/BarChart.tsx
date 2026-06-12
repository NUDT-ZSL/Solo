import { useEffect, useRef, useCallback } from 'react';
import type { VoteOption } from '../types';

interface BarChartProps {
  options: VoteOption[];
  width?: number;
  height?: number;
}

export default function BarChart({ options, width = 600, height = 450 }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const draw = useCallback((canvasWidth: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvasWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, height);

    const maxVotes = Math.max(...options.map((o) => o.votes), 1);
    const padding = { top: 50, right: 30, bottom: 80, left: 50 };
    const chartWidth = w - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxBarWidth = 40;
    const minGap = 24;
    const numBars = options.length;
    let barWidth: number;
    let gap: number;

    const availableForBarsAndGaps = chartWidth - minGap * (numBars + 1);
    if (availableForBarsAndGaps / numBars <= maxBarWidth) {
      barWidth = Math.max(16, availableForBarsAndGaps / numBars);
      gap = minGap;
    } else {
      barWidth = maxBarWidth;
      gap = (chartWidth - numBars * barWidth) / (numBars + 1);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const value = Math.round((maxVotes / gridLines) * (gridLines - i));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(value), padding.left - 10, y);
    }

    options.forEach((option, index) => {
      const x = padding.left + gap + index * (barWidth + gap);
      const barHeight = (option.votes / maxVotes) * chartHeight;
      const barTop = padding.top + chartHeight - barHeight;

      const gradient = ctx.createLinearGradient(x, barTop, x, barTop + barHeight);
      gradient.addColorStop(0, option.color + 'dd');
      gradient.addColorStop(1, option.color + '88');

      const radius = Math.min(6, barWidth / 4);
      ctx.beginPath();
      if (barHeight > radius) {
        ctx.moveTo(x + radius, barTop);
        ctx.lineTo(x + barWidth - radius, barTop);
        ctx.quadraticCurveTo(x + barWidth, barTop, x + barWidth, barTop + radius);
        ctx.lineTo(x + barWidth, barTop + barHeight);
        ctx.lineTo(x, barTop + barHeight);
        ctx.lineTo(x, barTop + radius);
        ctx.quadraticCurveTo(x, barTop, x + radius, barTop);
      } else {
        ctx.rect(x, barTop, barWidth, barHeight);
      }
      ctx.closePath();

      ctx.shadowColor = option.color + '44';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(option.votes), x + barWidth / 2, barTop - 8);

      const labelMaxWidth = barWidth + gap;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      let displayText = option.text;
      let fontSize = 13;
      ctx.font = `${fontSize}px sans-serif`;
      while (ctx.measureText(displayText).width > labelMaxWidth - 4 && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `${fontSize}px sans-serif`;
      }
      if (ctx.measureText(displayText).width > labelMaxWidth - 4) {
        while (ctx.measureText(displayText + '…').width > labelMaxWidth - 4 && displayText.length > 1) {
          displayText = displayText.slice(0, -1);
        }
        displayText = displayText + '…';
      }
      ctx.fillText(displayText, x + barWidth / 2, padding.top + chartHeight + 14);

      const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
      const pct = totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(0) : '0';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${pct}%`, x + barWidth / 2, padding.top + chartHeight + 34);
    });

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(w - padding.right, padding.top + chartHeight);
    ctx.stroke();
  }, [options, height]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const initialWidth = container.clientWidth || width;
    draw(initialWidth);

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (newWidth > 0) {
          draw(newWidth);
        }
      }
    });
    resizeObserverRef.current.observe(container);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [draw, width]);

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
