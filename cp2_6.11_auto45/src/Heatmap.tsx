import React, { useRef, useState, useEffect } from 'react';
import { Rating, CategoryStats, CATEGORIES } from './shared/types';

interface Props {
  ratings: Rating[];
  stats: CategoryStats[];
}

export default function Heatmap({ ratings, stats }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationTimeRef = useRef(0);
  const [refreshedKeys, setRefreshedKeys] = useState<Set<string>>(new Set());
  const refreshStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const allCategories = new Set(CATEGORIES);
    setRefreshedKeys(allCategories);
    refreshStartTimeRef.current = Date.now();
    const timer = setTimeout(() => {
      setRefreshedKeys(new Set());
    }, 300);
    return () => clearTimeout(timer);
  }, [stats]);

  function getScoreColor(score: number): string {
    const ratio = (score - 1) / 4;
    const r = Math.round(30 + (255 - 30) * ratio);
    const g = Math.round(144 + (69 - 144) * ratio);
    const b = Math.round(255 + (0 - 255) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }

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
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    let animationId: number;

    const drawRoundRect = (
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    const animate = (time: number) => {
      animationTimeRef.current = time;

      const cellSize = Math.min(120, canvas.width / dpr / 5 - 20);
      const gap = 16;

      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      CATEGORIES.forEach((category, i) => {
        const stat = stats.find((s) => s.category === category);
        const average = stat?.average || 3;
        const cellColor = getScoreColor(average);

        const x = i * (cellSize + gap) + gap;
        const y = 40;

        const isRefreshed = refreshedKeys.has(category);
        let scale: number;

        if (isRefreshed) {
          const elapsed = Date.now() - refreshStartTimeRef.current;
          scale = 1.05 - (Math.min(elapsed, 300) / 300) * 0.05;
        } else {
          scale = 1 + Math.sin(animationTimeRef.current * 0.003 + i) * 0.015;
        }

        const scaledWidth = cellSize * scale;
        const scaledHeight = cellSize * scale;
        const offsetX = (cellSize - scaledWidth) / 2;
        const offsetY = (cellSize - scaledHeight) / 2;

        ctx.save();
        ctx.shadowColor = cellColor;
        ctx.shadowBlur = 15;
        ctx.fillStyle = cellColor;
        drawRoundRect(x + offsetX, y + offsetY, scaledWidth, scaledHeight, 12);
        ctx.fill();
        ctx.restore();

        if (stat) {
          const particleCount = Math.min(stat.count * 2, 30);
          for (let p = 0; p < particleCount; p++) {
            const px = x + offsetX + Math.random() * scaledWidth;
            const py = y + offsetY + Math.random() * scaledHeight;
            const size = 1 + Math.random() * 2;
            const opacity = 0.3 + Math.random() * 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = '#333';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(category, x + cellSize / 2, y - 10);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(average.toFixed(1), x + cellSize / 2, y + cellSize / 2 + 8);

        if (stat) {
          const barHeight = Math.max(5, Math.min(30, stat.volatility * 15));
          const barX = x + cellSize + 8;
          const barY = y + cellSize / 2 - barHeight / 2;
          const barWidth = 6;

          let barColor = '#888';
          if (stat.volatility > 1.5) {
            const flash = Math.sin(time * 0.01) * 0.5 + 0.5;
            barColor = `rgba(255, 0, 0, ${0.5 + flash * 0.5})`;
          }

          ctx.fillStyle = barColor;
          ctx.fillRect(barX, barY, barWidth, barHeight);
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [stats, refreshedKeys]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="heatmap-container">
      <h3>热力图仪表板</h3>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '240px' }}
      />
      <div className="legend">
        <span>图例：</span>
        <span className="legend-item">
          <span className="legend-color" style={{ backgroundColor: getScoreColor(1) }}></span>
          低分
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ backgroundColor: getScoreColor(3) }}></span>
          中等
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ backgroundColor: getScoreColor(5) }}></span>
          高分
        </span>
        <span className="legend-item">
          <span className="legend-bar" style={{ backgroundColor: '#888' }}></span>
          波动性
        </span>
      </div>
    </div>
  );
}
