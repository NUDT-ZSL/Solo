import React, { useEffect, useRef } from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, size = 140 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 2;
    const innerR = outerR - 14;
    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const totalAngle = endAngle - startAngle;

    const start = performance.now();
    const target = Math.max(0, Math.min(100, score));
    const duration = 1200;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const draw = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const progress = easeOutCubic(t);
      animatedRef.current = target * progress;

      ctx.clearRect(0, 0, size, size);

      ctx.beginPath();
      ctx.arc(cx, cy, (outerR + innerR) / 2, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = outerR - innerR;
      ctx.lineCap = 'round';
      ctx.stroke();

      const scoreRatio = animatedRef.current / 100;
      const currentEnd = startAngle + totalAngle * scoreRatio;

      const segments = 120;
      for (let i = 0; i < segments; i++) {
        const segStartRatio = i / segments;
        const segEndRatio = (i + 1) / segments;
        const midRatio = (segStartRatio + segEndRatio) / 2;
        if (midRatio > scoreRatio) break;

        const a1 = startAngle + totalAngle * segStartRatio;
        const a2 = startAngle + totalAngle * segEndRatio;
        const color = getColorForRatio(midRatio);

        ctx.beginPath();
        ctx.arc(cx, cy, (outerR + innerR) / 2, a1, a2);
        ctx.strokeStyle = color;
        ctx.lineWidth = outerR - innerR - 2;
        ctx.lineCap = 'butt';
        ctx.stroke();
      }

      if (currentEnd > startAngle) {
        const glowColor = getColorForRatio(scoreRatio);
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = glowColor;
        ctx.beginPath();
        const tipAngle = currentEnd;
        const tipX = cx + Math.cos(tipAngle) * (outerR + innerR) / 2;
        const tipY = cy + Math.sin(tipAngle) * (outerR + innerR) / 2;
        ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();
        ctx.restore();
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
    />
  );
};

function getColorForRatio(ratio: number): string {
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [255, 71, 87]],
    [0.4, [255, 159, 67]],
    [0.6, [255, 230, 109]],
    [0.8, [78, 205, 196]],
    [1.0, [46, 213, 115]]
  ];
  let i = 0;
  while (i < stops.length - 1 && ratio > stops[i + 1][0]) i++;
  const [r0, c0] = stops[i];
  const [r1, c1] = stops[Math.min(i + 1, stops.length - 1)];
  const span = r1 - r0 || 1;
  const t = (ratio - r0) / span;
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
  return `rgb(${r},${g},${b})`;
}

export default ScoreGauge;
