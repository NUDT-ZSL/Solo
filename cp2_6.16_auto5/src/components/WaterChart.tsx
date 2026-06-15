import React, { useRef, useEffect, useState } from 'react';
import type { PlantLog } from '../types';

interface WaterChartProps {
  logs: PlantLog[];
}

const WaterChart: React.FC<WaterChartProps> = ({ logs }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: boolean; date: string } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    drawChart();
  }, [logs]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const last30Days: { date: string; watered: boolean }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const log = sortedLogs.find(l => l.date === dateStr);
      last30Days.push({
        date: dateStr,
        watered: log ? log.watered : false
      });
    }

    ctx.strokeStyle = '#7cb342';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('是', padding.left - 10, padding.top + 20);
    ctx.fillText('否', padding.left - 10, height - padding.bottom - 5);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + 20);
    ctx.lineTo(width - padding.right, padding.top + 20);
    ctx.moveTo(padding.left, height - padding.bottom - 5);
    ctx.lineTo(width - padding.right, height - padding.bottom - 5);
    ctx.stroke();

    const points: { x: number; y: number; value: boolean; date: string }[] = [];
    const stepX = chartWidth / (last30Days.length - 1);
    
    last30Days.forEach((day, index) => {
      const x = padding.left + index * stepX;
      const y = day.watered ? padding.top + 20 : height - padding.bottom - 5;
      points.push({ x, y, value: day.watered, date: day.date });
    });

    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    points.forEach((point) => {
      const isHovered = hoveredPoint && 
        hoveredPoint.x === point.x && 
        hoveredPoint.y === point.y;
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, isHovered ? 8 : 4, 0, Math.PI * 2);
      ctx.fillStyle = point.value ? '#4caf50' : '#f44336';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < last30Days.length; i += 5) {
      const x = padding.left + i * stepX;
      const date = new Date(last30Days[i].date);
      ctx.fillText(
        `${date.getMonth() + 1}/${date.getDate()}`,
        x,
        height - padding.bottom + 20
      );
    }

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let foundPoint = null;
      for (const point of points) {
        const distance = Math.sqrt(
          Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
        );
        if (distance < 15) {
          foundPoint = point;
          break;
        }
      }

      setHoveredPoint(foundPoint);
      if (foundPoint) {
        setTooltip({
          x: e.clientX,
          y: e.clientY,
          text: `${foundPoint.date}: ${foundPoint.value ? '已浇水' : '未浇水'}`
        });
      } else {
        setTooltip(null);
      }
      drawChart();
    };

    canvas.onmouseleave = () => {
      setHoveredPoint(null);
      setTooltip(null);
      drawChart();
    };
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">浇水频率（近30天）</h3>
      <canvas
        ref={canvasRef}
        width={600}
        height={250}
        className="chart-canvas"
      />
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 30
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default WaterChart;
