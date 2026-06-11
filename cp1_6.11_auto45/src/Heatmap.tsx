import React, { useRef, useEffect, useCallback } from 'react';
import type { CategoryStats, Rating } from './types';

const CATEGORIES = ['技术协作', '创新能力', '响应速度', '文档质量', '沟通效率'];

function lerpColorRGB(t: number): [number, number, number] {
  const r = Math.round(30 + (255 - 30) * t);
  const g = Math.round(144 + (69 - 144) * t);
  const b = Math.round(255 + (0 - 255) * t);
  return [r, g, b];
}

function lerpColor(t: number): string {
  const [r, g, b] = lerpColorRGB(t);
  return `rgb(${r},${g},${b})`;
}

function lerpColorAlpha(t: number, a: number): string {
  const [r, g, b] = lerpColorRGB(t);
  return `rgba(${r},${g},${b},${a})`;
}

function scoreToT(score: number): number {
  return (score - 1) / 4;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface HeatmapProps {
  stats: CategoryStats[];
  ratings: Rating[];
}

const Heatmap: React.FC<HeatmapProps> = ({ stats, ratings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const prevStatsRef = useRef<CategoryStats[]>([]);
  const cellScaleRef = useRef<number[]>(CATEGORIES.map(() => 1.0));
  const barHeightsRef = useRef<number[]>([]);

  const initParticles = useCallback((cellX: number, cellY: number, cellW: number, cellH: number, count: number): Particle[] => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: cellX + Math.random() * cellW,
        y: cellY + Math.random() * cellH,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: Math.random() * 60,
        maxLife: 40 + Math.random() * 40,
        size: 1 + Math.random() * 2,
      });
    }
    return particles;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const isMobile = w < 600;
    const cols = isMobile ? 2 : 5;
    const rows = isMobile ? 3 : 1;
    const cellPad = 8;
    const cellW = (w - cellPad * (cols + 1)) / cols;
    const cellH = isMobile ? Math.min(cellW * 0.8, 100) : Math.min(cellW * 1.2, 180);
    const startY = 10;

    for (let i = 0; i < CATEGORIES.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = cellPad + col * (cellW + cellPad);
      const cy = startY + row * (cellH + cellPad + 30);

      const stat = stats.find((s) => s.category === CATEGORIES[i]) || {
        category: CATEGORIES[i],
        average: 0,
        count: 0,
        volatility: 0,
        recentScores: [],
      };

      const prevStat = prevStatsRef.current.find((s) => s.category === CATEGORIES[i]);
      if (prevStat && prevStat.count !== stat.count) {
        cellScaleRef.current[i] = 1.05;
      }
      cellScaleRef.current[i] += (1.0 - cellScaleRef.current[i]) * 0.1;

      const scale = cellScaleRef.current[i];
      const scx = cx + cellW / 2;
      const scy = cy + cellH / 2;

      ctx.save();
      ctx.translate(scx, scy);
      ctx.scale(scale, scale);
      ctx.translate(-scx, -scy);

      const t = scoreToT(stat.average || 0);
      const baseColor = lerpColor(t);

      ctx.fillStyle = 'rgba(30,30,30,0.8)';
      ctx.strokeStyle = 'rgba(0,200,255,0.1)';
      ctx.lineWidth = 1;
      const radius = 12;
      ctx.beginPath();
      ctx.moveTo(cx + radius, cy);
      ctx.lineTo(cx + cellW - radius, cy);
      ctx.quadraticCurveTo(cx + cellW, cy, cx + cellW, cy + radius);
      ctx.lineTo(cx + cellW, cy + cellH - radius);
      ctx.quadraticCurveTo(cx + cellW, cy + cellH, cx + cellW - radius, cy + cellH);
      ctx.lineTo(cx + radius, cy + cellH);
      ctx.quadraticCurveTo(cx, cy + cellH, cx, cy + cellH - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.quadraticCurveTo(cx, cy, cx + radius, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const grad = ctx.createLinearGradient(cx, cy, cx + cellW, cy + cellH);
      grad.addColorStop(0, lerpColorAlpha(t, 0.25));
      grad.addColorStop(1, lerpColorAlpha(t, 0.08));
      ctx.fillStyle = grad;
      ctx.fill();

      const particleCount = Math.min(20 + stat.count * 5, 80);
      const existingForCell = particlesRef.current.filter(
        (p) => p.x >= cx && p.x <= cx + cellW && p.y >= cy && p.y <= cy + cellH
      );
      if (existingForCell.length < particleCount) {
        const newP = initParticles(cx, cy, cellW, cellH, particleCount - existingForCell.length);
        particlesRef.current.push(...newP);
      }

      for (const p of particlesRef.current) {
        if (p.x < cx || p.x > cx + cellW || p.y < cy || p.y > cy + cellH) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        if (p.life > p.maxLife) {
          p.x = cx + Math.random() * cellW;
          p.y = cy + Math.random() * cellH;
          p.life = 0;
        }
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#e6edf3';
      ctx.font = `bold ${isMobile ? 11 : 14}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(CATEGORIES[i], cx + cellW / 2, cy + 22);

      ctx.fillStyle = baseColor;
      ctx.font = `bold ${isMobile ? 20 : 32}px -apple-system, sans-serif`;
      ctx.fillText(
        stat.count > 0 ? stat.average.toFixed(1) : '--',
        cx + cellW / 2,
        cy + cellH / 2 + 5
      );

      ctx.fillStyle = '#8b949e';
      ctx.font = `${isMobile ? 9 : 12}px -apple-system, sans-serif`;
      ctx.fillText(`${stat.count} 条评分`, cx + cellW / 2, cy + cellH / 2 + 22);

      const volHeight = Math.min(30, Math.max(5, stat.volatility * 15));
      const volX = cx + cellW - 20;
      const volY = cy + cellH - volHeight - 12;
      const isHighVol = stat.volatility > 1.0;

      if (isHighVol) {
        const flash = Math.abs(Math.sin(Date.now() / 150)) * 0.6 + 0.4;
        ctx.fillStyle = `rgba(255,69,0,${flash})`;
        ctx.shadowColor = 'rgba(255, 69, 0, 0.8)';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.shadowBlur = 0;
      }
      ctx.fillRect(volX, volY, 10, volHeight);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    const chartY = startY + (isMobile ? 3 : 1) * (cellH + cellPad + 30) + 15;
    const chartH = h - chartY - 10;
    if (chartH > 30 && ratings.length > 0) {
      const recent = ratings.slice(-10);
      const barW = Math.min(30, (w - 40) / recent.length - 4);
      const chartX = (w - recent.length * (barW + 4)) / 2;

      ctx.fillStyle = '#8b949e';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('最近评分趋势', w / 2, chartY - 3);

      for (let i = 0; i < recent.length; i++) {
        const r = recent[i];
        const t = scoreToT(r.score);
        const barColor = lerpColor(t);
        const targetH = (r.score / 5) * chartH;
        if (barHeightsRef.current[i] === undefined) barHeightsRef.current[i] = 0;
        barHeightsRef.current[i] += (targetH - barHeightsRef.current[i]) * 0.15;
        const bh = barHeightsRef.current[i];
        const bx = chartX + i * (barW + 4);
        const by = chartY + chartH - bh;

        ctx.fillStyle = lerpColorAlpha(t, 0.8);
        ctx.beginPath();
        const br = 3;
        ctx.moveTo(bx + br, by);
        ctx.lineTo(bx + barW - br, by);
        ctx.quadraticCurveTo(bx + barW, by, bx + barW, by + br);
        ctx.lineTo(bx + barW, chartY + chartH);
        ctx.lineTo(bx, chartY + chartH);
        ctx.lineTo(bx, by + br);
        ctx.quadraticCurveTo(bx, by, bx + br, by);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#e6edf3';
        ctx.font = '9px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(r.score), bx + barW / 2, by - 3);

        ctx.fillStyle = '#8b949e';
        ctx.font = '8px -apple-system, sans-serif';
        ctx.fillText(
          r.category.slice(0, 2),
          bx + barW / 2,
          chartY + chartH + 12
        );
      }
    }

    if (ratings.length > 10) {
      barHeightsRef.current = barHeightsRef.current.slice(0, 10);
    }

    prevStatsRef.current = [...stats];
    animFrameRef.current = requestAnimationFrame(draw);
  }, [stats, ratings, initParticles]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <div className="heatmap-wrapper">
      <h2 className="heatmap-title">热力仪表板</h2>
      <canvas
        ref={canvasRef}
        className="heatmap-canvas"
      />
    </div>
  );
};

export default Heatmap;
