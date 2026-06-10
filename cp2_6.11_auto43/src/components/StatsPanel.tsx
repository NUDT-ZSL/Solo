import { useRef, useEffect, useCallback } from 'react';
import type { StatsData } from '../../../shared/types';

interface Props {
  stats: StatsData;
}

export default function StatsPanel({ stats }: Props) {
  const pieRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);

  const drawPie = useCallback(() => {
    const canvas = pieRef.current;
    if (!canvas || stats.monthlyDistribution.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 200 * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    const cx = 100, cy = 100, r = 70;
    let startAngle = -Math.PI / 2;

    stats.monthlyDistribution.forEach((item) => {
      const sliceAngle = (item.percentage / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      startAngle += sliceAngle;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
  }, [stats.monthlyDistribution]);

  const drawLine = useCallback(() => {
    const canvas = lineRef.current;
    if (!canvas || stats.weeklyTrend.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 260 * dpr;
    canvas.height = 140 * dpr;
    ctx.scale(dpr, dpr);

    const W = 260, H = 140;
    const padL = 30, padR = 10, padT = 10, padB = 25;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const data = stats.weeklyTrend;
    const maxVal = Math.max(...data.map((d) => d.intensity), 5);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }

    if (data.length > 1) {
      const gradient = ctx.createLinearGradient(padL, 0, W - padR, 0);
      data.forEach((d, i) => {
        gradient.addColorStop(i / (data.length - 1), d.color);
      });

      ctx.beginPath();
      data.forEach((d, i) => {
        const x = padL + (i / (data.length - 1)) * plotW;
        const y = padT + plotH - (d.intensity / maxVal) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else {
          const prevX = padL + ((i - 1) / (data.length - 1)) * plotW;
          const cpX = (prevX + x) / 2;
          const prevD = data[i - 1];
          const prevY = padT + plotH - (prevD.intensity / maxVal) * plotH;
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
      });
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      data.forEach((d, i) => {
        const x = padL + (i / (data.length - 1)) * plotW;
        const y = padT + plotH - (d.intensity / maxVal) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
      });
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const x = padL + (i / Math.max(data.length - 1, 1)) * plotW;
      ctx.fillText(d.date.slice(5), x, H - 5);
    });
  }, [stats.weeklyTrend]);

  useEffect(() => {
    drawPie();
  }, [drawPie]);

  useEffect(() => {
    drawLine();
  }, [drawLine]);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        width: '280px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.25)',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      <h3 className="text-sm font-semibold text-white/80 mb-3">情绪统计</h3>

      <div className="mb-4">
        <div className="text-xs text-white/60 mb-2">本月情绪分布</div>
        <div className="flex items-center gap-3">
          <canvas ref={pieRef} style={{ width: '100px', height: '100px' }} />
          <div className="flex flex-col gap-1">
            {stats.monthlyDistribution.slice(0, 5).map((item) => (
              <div key={item.color} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-white/70">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs text-white/60 mb-2">本周情绪趋势</div>
        <canvas ref={lineRef} style={{ width: '260px', height: '140px' }} />
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 text-center">
        <span className="text-2xl font-bold text-white">{stats.totalDays}</span>
        <span className="text-sm text-white/60 ml-1">天</span>
      </div>
    </div>
  );
}
