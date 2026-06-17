import React, { useRef, useEffect, useState } from 'react';
import { HealthRecord } from '../utils/api';
import dayjs from 'dayjs';

interface LineChartProps {
  records: HealthRecord[];
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  weight?: number;
  temperature?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ records }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 300;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const padding = { top: 30, right: 40, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    const weightRecords = records
      .filter(r => r.type === 'weight' && r.weight !== undefined && r.temperature !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const thirtyDaysAgo = dayjs().subtract(30, 'day');
    const recentRecords = weightRecords.filter(r => dayjs(r.date).isAfter(thirtyDaysAgo));

    if (recentRecords.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无近30天体重体温数据', width / 2, height / 2);
      return;
    }

    const weights = recentRecords.map(r => r.weight!);
    const temperatures = recentRecords.map(r => r.temperature!);
    const minWeight = Math.floor(Math.min(...weights) - 1);
    const maxWeight = Math.ceil(Math.max(...weights) + 1);
    const minTemp = Math.floor(Math.min(...temperatures) - 0.5);
    const maxTemp = Math.ceil(Math.max(...temperatures) + 0.5);

    const dates = recentRecords.map(r => r.date);
    const firstDate = dayjs(dates[0]);
    const lastDate = dayjs(dates[dates.length - 1]);
    const dateRange = lastDate.diff(firstDate, 'day') || 1;

    const points = recentRecords.map((r, i) => {
      const x = padding.left + (dayjs(r.date).diff(firstDate, 'day') / dateRange) * chartWidth;
      const weightY = padding.top + chartHeight - ((r.weight! - minWeight) / (maxWeight - minWeight)) * chartHeight;
      const tempY = padding.top + chartHeight - ((r.temperature! - minTemp) / (maxTemp - minTemp)) * chartHeight;
      return { x, weightY, tempY, date: r.date, weight: r.weight, temperature: r.temperature };
    });

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#666';
    ctx.font = '12px Roboto, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      const weight = maxWeight - (i / 5) * (maxWeight - minWeight);
      ctx.fillText(weight.toFixed(1) + 'kg', padding.left - 10, y + 4);
    }

    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      const temp = maxTemp - (i / 5) * (maxTemp - minTemp);
      ctx.fillText(temp.toFixed(1) + '℃', padding.left + chartWidth + 10, y + 4);
    }

    ctx.fillStyle = '#888';
    ctx.font = '11px Roboto, sans-serif';
    ctx.textAlign = 'center';
    if (points.length >= 2) {
      const step = Math.ceil(points.length / 5);
      for (let i = 0; i < points.length; i += step) {
        ctx.fillText(dayjs(points[i].date).format('MM/DD'), points[i].x, height - 20);
      }
    }

    ctx.beginPath();
    ctx.strokeStyle = '#43a047';
    ctx.lineWidth = 2;
    points.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.weightY);
      } else {
        ctx.lineTo(p.x, p.weightY);
      }
    });
    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.weightY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#43a047';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.strokeStyle = '#ef5350';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    points.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.tempY);
      } else {
        ctx.lineTo(p.x, p.tempY);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.tempY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#ef5350';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    const legendY = 15;
    ctx.fillStyle = '#43a047';
    ctx.fillRect(padding.left, legendY - 6, 20, 2);
    ctx.fillStyle = '#333';
    ctx.font = '12px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('体重', padding.left + 26, legendY - 2);

    ctx.strokeStyle = '#ef5350';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left + 80, legendY - 5);
    ctx.lineTo(padding.left + 100, legendY - 5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#333';
    ctx.fillText('体温', padding.left + 106, legendY - 2);

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let closest: typeof points[0] | null = null;
      let minDist = Infinity;

      points.forEach(p => {
        const dist = Math.sqrt((mouseX - p.x) ** 2 + (mouseY - p.weightY) ** 2);
        const dist2 = Math.sqrt((mouseX - p.x) ** 2 + (mouseY - p.tempY) ** 2);
        const min = Math.min(dist, dist2);
        if (min < minDist && min < 30) {
          minDist = min;
          closest = p;
        }
      });

      if (closest) {
        setTooltip({
          x: closest.x,
          y: Math.min(closest.weightY, closest.tempY) - 10,
          date: closest.date,
          weight: closest.weight,
          temperature: closest.temperature
        });
      } else {
        setTooltip(null);
      }
    };

    canvas.onmouseleave = () => {
      setTooltip(null);
    };

  }, [records]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '300px',
        backgroundColor: '#fafafa',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '300px' }} />
      
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 50}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
            fontFamily: 'Roboto, sans-serif'
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 500 }}>{tooltip.date}</div>
          {tooltip.weight !== undefined && (
            <div style={{ color: '#a5d6a7' }}>体重: {tooltip.weight} kg</div>
          )}
          {tooltip.temperature !== undefined && (
            <div style={{ color: '#ef9a9a' }}>体温: {tooltip.temperature} ℃</div>
          )}
        </div>
      )}
    </div>
  );
};
