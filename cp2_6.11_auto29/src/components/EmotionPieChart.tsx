import { useEffect, useRef } from 'react';
import { EmotionType, EMOTION_COLORS, EMOTION_LABELS } from '../types';

interface Props {
  data: Record<EmotionType, number>;
  size?: number;
}

export default function EmotionPieChart({ data, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const list = Object.entries(data).filter(([, v]) => v > 0) as [EmotionType, number][];
    const total = list.reduce((s, [, v]) => s + v, 0);

    let t0 = 0;
    const dur = 500;
    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = now - start;
      t0 = Math.min(elapsed / dur, 1);
      const ease = 1 - Math.pow(1 - t0, 3);

      ctx.clearRect(0, 0, size, size);

      if (total === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px "Noto Sans SC"';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', size / 2, size / 2);
        return;
      }

      let startAngle = -Math.PI / 2;
      list.forEach(([emotion, value]) => {
        const angle = (value / total) * Math.PI * 2 * ease;
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

      if (t0 < 1) rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, size]);

  const list = Object.entries(data).filter(([, v]) => v > 0) as [EmotionType, number][];
  const total = list.reduce((s, [, v]) => s + v, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      {total > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {list.map(([e, c]) => (
            <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: EMOTION_COLORS[e], display: 'inline-block'
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                {EMOTION_LABELS[e]} {Math.round((c / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
