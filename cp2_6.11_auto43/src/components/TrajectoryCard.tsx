import { useRef, useEffect, useCallback, useState } from 'react';
import type { EmotionRecord } from '../../../shared/types';

interface Props {
  records: EmotionRecord[];
  onBlobReady?: (blob: Blob | null) => void;
}

export default function TrajectoryCard({ records, onBlobReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(true);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 800;
    const H = 500;
    canvas.width = W;
    canvas.height = H;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#FADDC6');
    grad.addColorStop(1, '#E8D0F0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (records.length === 0) return;

    const dayWidth = (W - 120) / Math.max(records.length - 1, 1);
    const centerY = H / 2;
    const positions = records.map((record, i) => ({
      record,
      x: 60 + i * dayWidth,
      y: centerY + Math.sin(i * 0.8) * 30 - (record.intensity - 3) * 8,
    }));

    for (let i = 0; i < positions.length - 1; i++) {
      const p0 = positions[i];
      const p1 = positions[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.4;
      const cp1y = p0.y;
      const cp2x = p1.x - (p1.x - p0.x) * 0.4;
      const cp2y = p1.y;

      const gradient = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      gradient.addColorStop(0, p0.record.color + 'B3');
      gradient.addColorStop(1, p1.record.color + 'B3');

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    positions.forEach((pos) => {
      const r = 8 + pos.record.intensity * 2;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(pos.x, pos.y, r, pos.x, pos.y, r + 4);
      glow.addColorStop(0, pos.record.color + '30');
      glow.addColorStop(1, pos.record.color + '00');
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = pos.record.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(120,100,140,0.5)';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('情绪轨迹图', W - 24, 36);

    ctx.font = '12px system-ui';
    ctx.fillStyle = 'rgba(120,100,140,0.3)';
    ctx.fillText(new Date().toLocaleDateString('zh-CN'), W - 24, 54);

    requestAnimationFrame(() => {
      setGenerating(false);
      if (onBlobReady && canvas) {
        canvas.toBlob(
          (blob) => {
            onBlobReady(blob);
          },
          'image/png',
          0.95
        );
      }
    });
  }, [records, onBlobReady]);

  useEffect(() => {
    let rafId: number;
    const run = () => {
      rafId = requestAnimationFrame(draw);
    };
    Promise.resolve().then(run);
    return () => cancelAnimationFrame(rafId);
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: '800px',
          maxWidth: '100%',
          backdropFilter: 'blur(12px)',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: '500px', willChange: 'transform', transform: 'translateZ(0)' }}
        />
        {generating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm">
            <div className="text-white/70 text-sm">正在生成分享卡片...</div>
          </div>
        )}
      </div>
    </div>
  );
}
