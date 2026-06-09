import React, { useEffect, useRef } from 'react';
import { DiaryEntry, EmotionStat } from '../shared/types';

interface EmotionStatsProps {
  diaries: DiaryEntry[];
}

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const COLORS = {
  positive: '#FFB347',
  neutral: '#B0C4DE',
  negative: '#9B72AA',
};

function getMonthlyStats(diaries: DiaryEntry[]): EmotionStat {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats: EmotionStat = { positive: 0, neutral: 0, negative: 0 };

  for (const diary of diaries) {
    const diaryDate = new Date(diary.date);
    if (diaryDate.getMonth() === currentMonth && diaryDate.getFullYear() === currentYear) {
      stats[diary.tendency]++;
    }
  }

  return stats;
}

const EmotionStats: React.FC<EmotionStatsProps> = ({ diaries }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SIZE = 240;
    const DPR = window.devicePixelRatio || 1;
    canvas.width = SIZE * DPR;
    canvas.height = SIZE * DPR;
    canvas.style.width = '120px';
    canvas.style.height = '120px';
    ctx.scale(DPR, DPR);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const outerRadius = 100;
    const innerRadius = outerRadius - 16;
    const strokeWidth = 8;

    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 12, 0, Math.PI * 2);
    const bgGradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius + 20);
    bgGradient.addColorStop(0, '#FFF8E7');
    bgGradient.addColorStop(1, '#FFE4B5');
    ctx.fillStyle = bgGradient;
    ctx.fill();
    ctx.shadowColor = 'rgba(139, 90, 43, 0.25)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.strokeStyle = 'rgba(222, 184, 135, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const stats = getMonthlyStats(diaries);
    const total = stats.positive + stats.neutral + stats.negative;

    const startAngle = -Math.PI / 2;

    if (total === 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#D7CCC8';
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
      ctx.restore();
    } else {
      const segments: { angle: number; color: string }[] = [
        { angle: (stats.positive / total) * Math.PI * 2, color: COLORS.positive },
        { angle: (stats.neutral / total) * Math.PI * 2, color: COLORS.neutral },
        { angle: (stats.negative / total) * Math.PI * 2, color: COLORS.negative },
      ];

      let currentAngle = startAngle;

      for (const seg of segments) {
        if (seg.angle <= 0) continue;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, (outerRadius + innerRadius) / 2, currentAngle, currentAngle + seg.angle);
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        currentAngle += seg.angle;
      }
    }

    ctx.save();
    ctx.font = 'bold 16px "Poppins", sans-serif';
    ctx.fillStyle = '#5D4037';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const currentMonth = new Date().getMonth();
    ctx.fillText(MONTH_NAMES[currentMonth], cx, cy - 10);

    ctx.font = '11px "Roboto Mono", monospace';
    ctx.fillStyle = '#8D6E63';
    ctx.fillText(`${total}篇`, cx, cy + 14);
    ctx.restore();

    if (total > 0) {
      const legendData = [
        { label: '积极', count: stats.positive, color: COLORS.positive },
        { label: '中性', count: stats.neutral, color: COLORS.neutral },
        { label: '消极', count: stats.negative, color: COLORS.negative },
      ];

      let legendY = cy + 38;
      ctx.font = '10px "Roboto Mono", monospace';
      ctx.textAlign = 'center';

      for (const item of legendData) {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(cx - 40, legendY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6D4C41';
        ctx.fillText(`${item.label} ${pct}%`, cx + 6, legendY);
        legendY += 13;
      }
    }
  }, [diaries]);

  return (
    <div className="emotion-stats-card">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default EmotionStats;
