import React, { useRef, useEffect, useState } from 'react';
import type { PlantLog } from '../types';

interface WaterChartProps {
  logs: PlantLog[];
}

interface ChartPoint {
  x: number;
  y: number;
  value: boolean;
  date: string;
}

const WaterChart: React.FC<WaterChartProps> = ({ logs }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<ChartPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  useEffect(() => {
    drawChart();
  }, [logs, hoveredPoint]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 40, bottom: 50, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const last30Days: { date: string; watered: boolean }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const log = sortedLogs.find(l => l.date === dateStr);
      last30Days.push({
        date: dateStr,
        watered: log ? log.watered : false
      });
    }

    ctx.strokeStyle = '#7cb342';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yYes = padding.top + chartHeight * 0.25;
    const yNo = padding.top + chartHeight * 0.75;
    ctx.fillText('是', padding.left - 10, yYes);
    ctx.fillText('否', padding.left - 10, yNo);

    ctx.strokeStyle = '#e8f5e9';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, yYes);
    ctx.lineTo(width - padding.right, yYes);
    ctx.moveTo(padding.left, yNo);
    ctx.lineTo(width - padding.right, yNo);
    ctx.stroke();
    ctx.setLineDash([]);

    const points: ChartPoint[] = [];
    const stepX = chartWidth / (last30Days.length - 1);
    
    last30Days.forEach((day, index) => {
      const x = padding.left + index * stepX;
      const y = day.watered ? yYes : yNo;
      points.push({ x, y, value: day.watered, date: day.date });
    });
    pointsRef.current = points;

    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    if (hoveredPoint) {
      ctx.strokeStyle = 'rgba(46, 125, 50, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoveredPoint.x, padding.top);
      ctx.lineTo(hoveredPoint.x, height - padding.bottom);
      ctx.moveTo(padding.left, hoveredPoint.y);
      ctx.lineTo(width - padding.right, hoveredPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    points.forEach((point) => {
      const isHovered = hoveredPoint && 
        hoveredPoint.x === point.x && 
        hoveredPoint.y === point.y;
      
      const baseRadius = 4;
      const radius = isHovered ? 10 : baseRadius;
      const innerRadius = isHovered ? 6 : 2;
      
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = point.value ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = point.value ? '#4caf50' : '#f44336';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(point.x, point.y, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      if (isHovered) {
        const labelText = `${point.date}  ${point.value ? '已浇水' : '未浇水'}`;
        ctx.font = 'bold 12px sans-serif';
        const metrics = ctx.measureText(labelText);
        const labelWidth = metrics.width + 16;
        const labelHeight = 28;
        let labelX = point.x - labelWidth / 2;
        let labelY = point.y - labelHeight - 12;

        if (labelX < padding.left) labelX = padding.left;
        if (labelX + labelWidth > width - padding.right) labelX = width - padding.right - labelWidth;
        if (labelY < 0) labelY = point.y + 16;

        ctx.fillStyle = 'rgba(33, 33, 33, 0.9)';
        ctx.beginPath();
        const r = 6;
        ctx.moveTo(labelX + r, labelY);
        ctx.lineTo(labelX + labelWidth - r, labelY);
        ctx.quadraticCurveTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + r);
        ctx.lineTo(labelX + labelWidth, labelY + labelHeight - r);
        ctx.quadraticCurveTo(labelX + labelWidth, labelY + labelHeight, labelX + labelWidth - r, labelY + labelHeight);
        ctx.lineTo(labelX + r, labelY + labelHeight);
        ctx.quadraticCurveTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - r);
        ctx.lineTo(labelX, labelY + r);
        ctx.quadraticCurveTo(labelX, labelY, labelX + r, labelY);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + labelWidth / 2, labelY + labelHeight / 2);
      }
    });

    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < last30Days.length; i += 5) {
      const x = padding.left + i * stepX;
      const dateParts = last30Days[i].date.split('-');
      ctx.fillText(
        `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`,
        x,
        height - padding.bottom + 10
      );
    }

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      let foundPoint: ChartPoint | null = null;
      let minDistance = 25;
      for (const point of pointsRef.current) {
        const distance = Math.sqrt(
          Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          foundPoint = point;
        }
      }

      setHoveredPoint(foundPoint);
    };

    canvas.onmouseleave = () => {
      setHoveredPoint(null);
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
    </div>
  );
};

export default WaterChart;
