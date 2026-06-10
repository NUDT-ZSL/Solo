import { useRef, useEffect } from 'react';
import { EmotionType, EMOTION_COLORS, EMOTION_LABELS } from '../types';

interface EmotionPieChartProps {
  data: Record<EmotionType, number>;
  size?: number;
}

export default function EmotionPieChart({ data, size = 200 }: EmotionPieChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const emotions = Object.entries(data).filter(([, v]) => v > 0) as [EmotionType, number][];
    const total = emotions.reduce((sum, [, v]) => sum + v, 0);

    let progress = 0;
    const duration = 500;
    const startTime = performance.now();

    function draw(currentTime: number) {
      const elapsed = currentTime - startTime;
      progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      ctx.clearRect(0, 0, size, size);

      if (total === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', size / 2, size / 2);
        return;
      }

      let startAngle = -Math.PI / 2;

      emotions.forEach(([emotion, value]) => {
        const angle = (value / total) * Math.PI * 2 * easeProgress;
        const endAngle = startAngle + angle;

        ctx.beginPath();
        ctx.moveTo(size / 2, size / 2);
        ctx.arc(size / 2, size / 2, size / 2 - 10, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = EMOTION_COLORS[emotion];
        ctx.shadowColor = EMOTION_COLORS[emotion];
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        startAngle = endAngle;
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(draw);
      }
    }

    animationRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationRef.current);
  }, [data, size]);

  const emotions = Object.entries(data).filter(([, v]) => v > 0) as [EmotionType, number][];
  const total = emotions.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
      />
      {total > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {emotions.map(([emotion, count]) => (
            <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: EMOTION_COLORS[emotion],
                  display: 'inline-block'
                }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>
                {EMOTION_LABELS[emotion]} {Math.round((count / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
