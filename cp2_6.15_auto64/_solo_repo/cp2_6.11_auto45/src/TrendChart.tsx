import { useRef, useEffect } from 'react';
import type { Rating } from './shared/types';

interface Props {
  recentRatings: Rating[];
}

function getScoreColor(score: number): string {
  const ratio = (score - 1) / 4;
  const r = Math.round(30 + (255 - 30) * ratio);
  const g = Math.round(144 + (69 - 144) * ratio);
  const b = Math.round(255 + (0 - 255) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function TrendChart({ recentRatings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef(recentRatings);
  const animStartRef = useRef(Date.now());
  const animIdRef = useRef(0);

  useEffect(() => {
    dataRef.current = recentRatings;
    animStartRef.current = Date.now();
  }, [recentRatings]);

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

    const ANIM_DURATION = 300;

    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const data = dataRef.current;
      const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp).slice(-10);

      const padding = { top: 24, right: 20, bottom: 44, left: 40 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((5 - i).toString(), padding.left - 8, y + 4);
      }

      if (sorted.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        animIdRef.current = requestAnimationFrame(animate);
        return;
      }

      const barSlotW = chartW / sorted.length;
      const barW = barSlotW * 0.6;
      const barGapW = barSlotW * 0.4;

      const elapsed = Date.now() - animStartRef.current;
      const progress = Math.min(elapsed / ANIM_DURATION, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      sorted.forEach((rating, i) => {
        const x = padding.left + barSlotW * i + barGapW / 2;
        const targetH = (rating.score / 5) * chartH;
        const currentH = targetH * easedProgress;
        const y = padding.top + chartH - currentH;
        const color = getScoreColor(rating.score);

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;

        const r = Math.min(4, barW / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, padding.top + chartH);
        ctx.lineTo(x, padding.top + chartH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (progress >= 0.7) {
          const labelOpacity = Math.min((progress - 0.7) / 0.3, 1);
          ctx.fillStyle = `rgba(255,255,255,${labelOpacity})`;
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(rating.score.toString(), x + barW / 2, y - 6);
        }

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const shortCat = rating.category.substring(0, 2);
        ctx.fillText(shortCat, x + barW / 2, padding.top + chartH + 16);

        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '9px sans-serif';
        const timeStr = new Date(rating.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        ctx.fillText(timeStr, x + barW / 2, padding.top + chartH + 30);
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
    <div className="trend-container">
      <h3>评价趋势（最近10次）</h3>
      <canvas ref={canvasRef} style={{ width: '100%', height: '220px' }} />
    </div>
  );
}
