import React, { useRef, useEffect, useState } from 'react';
import type { PlantLog } from '../types';

interface LightChartProps {
  logs: PlantLog[];
}

const LightChart: React.FC<LightChartProps> = ({ logs }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBar, setHoveredBar] = useState<{ x: number; y: number; value: number; date: string } | null>(null);
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
    
    const last30Days: { date: string; lightHours: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const log = sortedLogs.find(l => l.date === dateStr);
      last30Days.push({
        date: dateStr,
        lightHours: log ? log.lightHours : 0
      });
    }

    const maxLight = 12;
    
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
    for (let i = 0; i <= maxLight; i += 3) {
      const y = height - padding.bottom - (i / maxLight) * chartHeight;
      ctx.fillText(`${i}h`, padding.left - 10, y + 4);
      
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    const barWidth = chartWidth / last30Days.length - 2;
    const bars: { x: number; y: number; width: number; height: number; value: number; date: string }[] = [];
    
    last30Days.forEach((day, index) => {
      const x = padding.left + index * (chartWidth / last30Days.length) + 1;
      const barHeight = (day.lightHours / maxLight) * chartHeight;
      const y = height - padding.bottom - barHeight;
      bars.push({ x, y, width: barWidth, height: barHeight, value: day.lightHours, date: day.date });

      const isHovered = hoveredBar && 
        hoveredBar.x === x && 
        hoveredBar.y === y;

      const gradient = ctx.createLinearGradient(x, y, x, height - padding.bottom);
      gradient.addColorStop(0, '#ffc107');
      gradient.addColorStop(1, '#ff9800');
      
      ctx.fillStyle = isHovered ? '#ffeb3b' : gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      ctx.strokeStyle = '#f57c00';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
    });

    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < last30Days.length; i += 5) {
      const x = padding.left + i * (chartWidth / last30Days.length) + barWidth / 2;
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

      let foundBar = null;
      for (const bar of bars) {
        if (mouseX >= bar.x && mouseX <= bar.x + bar.width &&
            mouseY >= bar.y && mouseY <= bar.y + bar.height) {
          foundBar = bar;
          break;
        }
      }

      setHoveredBar(foundBar);
      if (foundBar) {
        setTooltip({
          x: e.clientX,
          y: e.clientY,
          text: `${foundBar.date}: ${foundBar.value}小时`
        });
      } else {
        setTooltip(null);
      }
      drawChart();
    };

    canvas.onmouseleave = () => {
      setHoveredBar(null);
      setTooltip(null);
      drawChart();
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

export default LightChart;
