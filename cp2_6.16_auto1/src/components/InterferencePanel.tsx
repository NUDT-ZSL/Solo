import { useRef, useEffect } from 'react';
import { InterferenceData } from '@/types';

interface InterferencePanelProps {
  interferenceData: InterferenceData;
}

const INTERFERENCE_WIDTH = 960;
const INTERFERENCE_HEIGHT = 200;

export function InterferencePanel({ interferenceData }: InterferencePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { combined, constructiveRegions, destructiveRegions } = interferenceData;

      ctx.clearRect(0, 0, INTERFERENCE_WIDTH, INTERFERENCE_HEIGHT);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, INTERFERENCE_WIDTH, INTERFERENCE_HEIGHT);

      const midY = INTERFERENCE_HEIGHT / 2;

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(INTERFERENCE_WIDTH, midY);
      ctx.stroke();

      for (const region of constructiveRegions) {
        const startX = (region.start / combined.length) * INTERFERENCE_WIDTH;
        const endX = (region.end / combined.length) * INTERFERENCE_WIDTH;
        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.fillRect(startX, 0, endX - startX, INTERFERENCE_HEIGHT);
      }

      for (const region of destructiveRegions) {
        const startX = (region.start / combined.length) * INTERFERENCE_WIDTH;
        const endX = (region.end / combined.length) * INTERFERENCE_WIDTH;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.fillRect(startX, 0, endX - startX, INTERFERENCE_HEIGHT);
      }

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const step = INTERFERENCE_WIDTH / combined.length;
      for (let i = 0; i < combined.length; i++) {
        const x = i * step;
        const y = midY - combined[i] * (INTERFERENCE_HEIGHT / 6);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.font = '11px monospace';
      ctx.fillText('■ 相长干涉', INTERFERENCE_WIDTH - 170, 16);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.fillText('■ 相消干涉', INTERFERENCE_WIDTH - 80, 16);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [interferenceData]);

  return (
    <div className="interference-panel">
      <canvas
        ref={canvasRef}
        width={INTERFERENCE_WIDTH}
        height={INTERFERENCE_HEIGHT}
        style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '4px',
          background: '#0d1117',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
