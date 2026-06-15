import { useRef, useEffect } from 'react';
import type { Rating, CategoryStats } from './shared/types';
import { CATEGORIES } from './shared/types';

interface Props {
  ratings: Rating[];
  stats: CategoryStats[];
}

function getScoreColor(score: number): string {
  const ratio = (score - 1) / 4;
  const r = Math.round(30 + (255 - 30) * ratio);
  const g = Math.round(144 + (69 - 144) * ratio);
  const b = Math.round(255 + (0 - 255) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default function Heatmap({ stats }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statsRef = useRef(stats);
  const refreshTimeRef = useRef(Date.now());
  const animIdRef = useRef(0);

  useEffect(() => {
    statsRef.current = stats;
    refreshTimeRef.current = Date.now();
  }, [stats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    };

    resize();
    window.addEventListener('resize', resize);

    const BOUNCE_DURATION = 300;

    const animate = (time: number) => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const currentStats = statsRef.current;
      const elapsed = Date.now() - refreshTimeRef.current;
      const bounceProgress = Math.min(elapsed / BOUNCE_DURATION, 1);
      const easedBounce = 1 - Math.pow(1 - bounceProgress, 3);

      const cellSize = Math.min(120, width / 5 - 20);
      const gap = 16;

      CATEGORIES.forEach((category, i) => {
        const stat = currentStats.find(s => s.category === category);
        const average = stat?.average || 0;
        const displayAvg = average || 3;
        const cellColor = getScoreColor(displayAvg);

        const x = i * (cellSize + gap) + gap;
        const y = 40;

        const bounceScale = 1.05 - 0.05 * easedBounce;
        const pulse = 1 + Math.sin(time * 0.003 + i * 1.2) * 0.015;
        const scale = bounceProgress < 1 ? bounceScale : pulse;

        const scaledW = cellSize * scale;
        const scaledH = cellSize * scale;
        const offsetX = (cellSize - scaledW) / 2;
        const offsetY = (cellSize - scaledH) / 2;

        ctx.save();
        ctx.shadowColor = cellColor;
        ctx.shadowBlur = 15;
        ctx.fillStyle = cellColor;
        drawRoundRect(ctx, x + offsetX, y + offsetY, scaledW, scaledH, 12);
        ctx.fill();
        ctx.restore();

        if (stat && stat.count > 0) {
          const particleCount = Math.min(stat.count * 2, 30);
          for (let p = 0; p < particleCount; p++) {
            const seed = p * 137.5 + i * 97.3;
            const px = x + offsetX + ((seed * 0.618) % 1) * scaledW;
            const py = y + offsetY + ((seed * 0.382) % 1) * scaledH;
            const size = 1 + (seed % 3);
            const opacity = 0.3 + ((seed * 0.7) % 0.3);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(category, x + cellSize / 2, y - 10);

        if (stat && stat.count > 0) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(average.toFixed(1), x + cellSize / 2, y + cellSize / 2 + 7);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('暂无', x + cellSize / 2, y + cellSize / 2 + 5);
        }

        if (stat && stat.count > 0) {
          const barHeight = Math.max(5, Math.min(30, stat.volatility * 15));
          const barX = x + cellSize + 6;
          const barY = y + cellSize / 2 - barHeight / 2;
          const barWidth = 6;

          if (stat.volatility > 1.5) {
            const flash = Math.sin(time * 0.008) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + flash * 0.5})`;
          } else {
            ctx.fillStyle = 'rgba(136, 136, 136, 0.6)';
          }
          ctx.fillRect(barX, barY, barWidth, barHeight);
        }
      });

      animIdRef.current = requestAnimationFrame(animate);
    };

    animIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="heatmap-container">
      <h3>热力图仪表板</h3>
      <canvas ref={canvasRef} style={{ width: '100%', height: '240px' }} />
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
