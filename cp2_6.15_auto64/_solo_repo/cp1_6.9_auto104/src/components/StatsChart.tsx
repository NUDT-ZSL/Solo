import { useRef, useEffect, useState } from 'react';
import type { WeeklyStat } from '../types';

export default function StatsChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<WeeklyStat[]>([]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats/weekly');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('获取统计数据失败:', e);
    }
  };

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

    const W = rect.width;
    const H = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    ctx.clearRect(0, 0, W, H);

    if (stats.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', W / 2, H / 2);
      return;
    }

    const counts = stats.map((s) => s.count);
    const maxCount = Math.max(...counts, 1);

    const yStep = Math.ceil(maxCount / 5) || 1;
    const yMax = yStep * 5;

    const yCount = 5;
    for (let i = 0; i <= yCount; i++) {
      const y = padding.top + chartH - (i / yCount) * chartH;
      const value = Math.round((i / yCount) * yMax);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), padding.left - 8, y);
    }

    const points: { x: number; y: number; count: number }[] = [];
    const stepX = chartW / (stats.length - 1 || 1);

    stats.forEach((stat, i) => {
      const x = padding.left + i * stepX;
      const yRatio = yMax > 0 ? stat.count / yMax : 0;
      const y = padding.top + chartH - yRatio * chartH;
      points.push({ x, y, count: stat.count });

      ctx.fillStyle = '#888';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(stat.day, x, H - padding.bottom + 12);
    });

    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(padding.left, 0, W - padding.right, 0);
      gradient.addColorStop(0, '#4A90D9');
      gradient.addColorStop(1, '#7B61FF');

      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();

      const fillGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      fillGradient.addColorStop(0, 'rgba(123, 97, 255, 0.25)');
      fillGradient.addColorStop(1, 'rgba(123, 97, 255, 0)');
      ctx.fillStyle = fillGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx1 = prev.x + (curr.x - prev.x) / 2;
        const cpx2 = prev.x + (curr.x - prev.x) / 2;
        ctx.bezierCurveTo(cpx1, prev.y, cpx2, curr.y, curr.x, curr.y);
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    points.forEach((p) => {
      const pointGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
      pointGradient.addColorStop(0, '#7B61FF');
      pointGradient.addColorStop(1, '#4A90D9');

      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#16213E';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = pointGradient;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#7B61FF';
      ctx.fill();

      if (p.count > 0) {
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(p.count.toString(), p.x, p.y - 10);
      }
    });
  }, [stats]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
