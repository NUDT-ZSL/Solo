import { useEffect, useRef } from 'react';
import type { CategoryStats } from './shared/types';
import { CATEGORIES } from './shared/types';

interface Props {
  stats: CategoryStats[];
}

export default function TrendChart({ stats }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((5 - i).toString(), padding.left - 10, y + 4);
    }

    const colors = [
      '#1E90FF',
      '#00CC66',
      '#FFD700',
      '#FF6B6B',
      '#9B59B6',
    ];

    const maxDataPoints = 10;

    stats.forEach((stat, statIndex) => {
      const dataPoints = stat.recentScores.length > 0 
        ? [...stat.recentScores].reverse()
        : [];
      
      if (dataPoints.length === 0) return;

      const points: { x: number; y: number }[] = [];
      const step = chartWidth / (maxDataPoints - 1);

      dataPoints.forEach((score, i) => {
        const x = padding.left + step * i;
        const y = padding.top + chartHeight - ((score - 1) / 4) * chartHeight;
        points.push({ x, y });
      });

      ctx.beginPath();
      ctx.strokeStyle = colors[statIndex % colors.length];
      ctx.lineWidth = 2;
      ctx.shadowColor = colors[statIndex % colors.length];
      ctx.shadowBlur = 10;

      points.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();

      ctx.shadowBlur = 0;
      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = colors[statIndex % colors.length];
        ctx.fill();
      });
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < maxDataPoints; i++) {
      const x = padding.left + (chartWidth / (maxDataPoints - 1)) * i;
      ctx.fillText(`T${i + 1}`, x, height - padding.bottom + 20);
    }
  }, [stats]);

  return (
    <div className="trend-container">
      <h2>趋势图表</h2>
      <div className="trend-legend">
        {CATEGORIES.map((cat, i) => (
          <div key={cat} className="legend-item">
            <span 
              className="legend-dot" 
              style={{ 
                backgroundColor: ['#1E90FF', '#00CC66', '#FFD700', '#FF6B6B', '#9B59B6'][i % 5] 
              }}
            ></span>
            <span>{cat}</span>
          </div>
        ))}
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height: '250px' }}></canvas>
    </div>
  );
}
