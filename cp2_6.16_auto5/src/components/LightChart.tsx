import React, { useRef, useEffect, useState } from 'react';
import type { PlantLog } from '../types';

interface LightChartProps {
  logs: PlantLog[];
}

interface ChartBar {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  date: string;
}

const LightChart: React.FC<LightChartProps> = ({ logs }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<ChartBar[]>([]);
  const [hoveredBar, setHoveredBar] = useState<ChartBar | null>(null);

  useEffect(() => {
    drawChart();
  }, [logs, hoveredBar]);

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
    
    const last30Days: { date: string; lightHours: number }[] = [];
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
        lightHours: log ? log.lightHours : 0
      });
    }

    const maxLight = 12;
    
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
    for (let i = 0; i <= maxLight; i += 3) {
      const y = height - padding.bottom - (i / maxLight) * chartHeight;
      ctx.fillText(`${i}h`, padding.left - 10, y);
      
      ctx.strokeStyle = '#e8f5e9';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const slotWidth = chartWidth / last30Days.length;
    const barWidth = slotWidth - 3;
    const bars: ChartBar[] = [];
    
    last30Days.forEach((day, index) => {
      const x = padding.left + index * slotWidth + 1.5;
      const barHeight = Math.max(1, (day.lightHours / maxLight) * chartHeight);
      const y = height - padding.bottom - barHeight;
      bars.push({ x, y, width: barWidth, height: barHeight, value: day.lightHours, date: day.date });

      const isHovered = hoveredBar &&
        hoveredBar.x === x &&
        hoveredBar.y === y;

      const gradient = ctx.createLinearGradient(x, y, x, height - padding.bottom);
      
      if (isHovered) {
        gradient.addColorStop(0, '#ffeb3b');
        gradient.addColorStop(1, '#ffc107');
      } else {
        gradient.addColorStop(0, '#ffc107');
        gradient.addColorStop(1, '#ff9800');
      }
      
      const drawX = isHovered ? x - 1 : x;
      const drawY = isHovered ? y - 2 : y;
      const drawWidth = isHovered ? barWidth + 2 : barWidth;
      const drawHeight = isHovered ? barHeight + 2 : barHeight;
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      const r = isHovered ? 4 : 2;
      ctx.moveTo(drawX + r, drawY);
      ctx.lineTo(drawX + drawWidth - r, drawY);
      ctx.quadraticCurveTo(drawX + drawWidth, drawY, drawX + drawWidth, drawY + r);
      ctx.lineTo(drawX + drawWidth, drawY + drawHeight);
      ctx.lineTo(drawX, drawY + drawHeight);
      ctx.lineTo(drawX, drawY + r);
      ctx.quadraticCurveTo(drawX, drawY, drawX + r, drawY);
      ctx.fill();
      
      ctx.strokeStyle = isHovered ? '#f57c00' : '#ff9800';
      ctx.lineWidth = isHovered ? 1.5 : 1;
      ctx.stroke();

      if (isHovered) {
        const lineX = x + barWidth / 2;
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(lineX, padding.top);
        ctx.lineTo(lineX, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        const lineY = y;
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(padding.left, lineY);
        ctx.lineTo(width - padding.right, lineY);
        ctx.stroke();

        const labelText = `${day.date}  ${day.lightHours.toFixed(1)}小时`;
        ctx.font = 'bold 12px sans-serif';
        const metrics = ctx.measureText(labelText);
        const labelWidth = metrics.width + 16;
        const labelHeight = 28;
        let labelX = lineX - labelWidth / 2;
        let labelY = y - labelHeight - 12;

        if (labelX < padding.left) labelX = padding.left;
        if (labelX + labelWidth > width - padding.right) labelX = width - padding.right - labelWidth;
        if (labelY < 0) labelY = y + 16;

        ctx.fillStyle = 'rgba(33, 33, 33, 0.9)';
        ctx.beginPath();
        const lr = 6;
        ctx.moveTo(labelX + lr, labelY);
        ctx.lineTo(labelX + labelWidth - lr, labelY);
        ctx.quadraticCurveTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + lr);
        ctx.lineTo(labelX + labelWidth, labelY + labelHeight - lr);
        ctx.quadraticCurveTo(labelX + labelWidth, labelY + labelHeight, labelX + labelWidth - lr, labelY + labelHeight);
        ctx.lineTo(labelX + lr, labelY + labelHeight);
        ctx.quadraticCurveTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - lr);
        ctx.lineTo(labelX, labelY + lr);
        ctx.quadraticCurveTo(labelX, labelY, labelX + lr, labelY);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + labelWidth / 2, labelY + labelHeight / 2);
      }
    });
    barsRef.current = bars;

    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < last30Days.length; i += 5) {
      const x = padding.left + i * slotWidth + slotWidth / 2;
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

      let foundBar: ChartBar | null = null;
      for (const bar of barsRef.current) {
        if (mouseX >= bar.x && mouseX <= bar.x + bar.width &&
            mouseY >= bar.y - 5 && mouseY <= bar.y + bar.height + 5) {
          foundBar = bar;
          break;
        }
      }

      setHoveredBar(foundBar);
    };

    canvas.onmouseleave = () => {
      setHoveredBar(null);
    };
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">光照时长（近30天）</h3>
      <canvas
        ref={canvasRef}
        width={600}
        height={250}
        className="chart-canvas"
      />
    </div>
  );
};

export default LightChart;
