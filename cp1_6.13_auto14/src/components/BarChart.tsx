import { useEffect, useRef } from 'react';
import type { VoteOption } from '../types';

interface BarChartProps {
  options: VoteOption[];
  width?: number;
  height?: number;
}

export default function BarChart({ options, width = 600, height = 450 }: BarChartProps) {
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

    ctx.clearRect(0, 0, width, height);

    const maxVotes = Math.max(...options.map((o) => o.votes), 1);
    const padding = { top: 60, right: 40, bottom: 80, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = 40;
    const gap = (chartWidth - options.length * barWidth) / (options.length + 1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const value = Math.round((maxVotes / gridLines) * (gridLines - i));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(value), padding.left - 12, y);
    }

    options.forEach((option, index) => {
      const x = padding.left + gap + index * (barWidth + gap);
      const barHeight = (option.votes / maxVotes) * chartHeight;
      const y = padding.top + chartHeight - barHeight;

      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, option.color + 'dd');
      gradient.addColorStop(1, option.color + '88');

      const radius = 6;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barHeight);
      ctx.lineTo(x, y + barHeight);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
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
      ctx.fillText(String(option.votes), x + barWidth / 2, y - 10);

      const labelMaxWidth = barWidth + gap;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      let displayText = option.text;
      let fontSize = 13;
      ctx.font = `${fontSize}px sans-serif`;
      while (ctx.measureText(displayText).width > labelMaxWidth - 8 && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `${fontSize}px sans-serif`;
      }
      if (ctx.measureText(displayText).width > labelMaxWidth - 8) {
        while (ctx.measureText(displayText + '…').width > labelMaxWidth - 8 && displayText.length > 1) {
          displayText = displayText.slice(0, -1);
        }
        displayText = displayText + '…';
      }
      ctx.fillText(displayText, x + barWidth / 2, padding.top + chartHeight + 16);

      const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
      const pct = totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(0) : '0';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${pct}%`, x + barWidth / 2, padding.top + chartHeight + 36);
    });

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(width - padding.right, padding.top + chartHeight);
    ctx.stroke();
  }, [options, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    />
  );
}
