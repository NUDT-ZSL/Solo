import { useRef, useEffect } from 'react';
import { WaveformData } from '@/types';

interface WaveformPanelProps {
  waveformData: WaveformData[];
  sources: Array<{ id: number; color: string; frequency: number; amplitude: number }>;
}

const WAVE_WIDTH = 240;
const WAVE_HEIGHT = 120;

function SingleWaveform({
  data,
  color,
  frequency,
  amplitude,
}: {
  data: number[];
  color: string;
  frequency: number;
  amplitude: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, WAVE_WIDTH, WAVE_HEIGHT);

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, WAVE_WIDTH, WAVE_HEIGHT);

      const midY = WAVE_HEIGHT / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(WAVE_WIDTH, midY);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const step = WAVE_WIDTH / data.length;
      for (let i = 0; i < data.length; i++) {
        const x = i * step;
        const y = midY - data[i] * (WAVE_HEIGHT / 2.5);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px monospace';
      ctx.fillText(`${frequency}Hz`, 6, 14);
      ctx.fillText(`A:${amplitude.toFixed(1)}`, 6, 28);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [data, color, frequency, amplitude]);

  return (
    <canvas
      ref={canvasRef}
      width={WAVE_WIDTH}
      height={WAVE_HEIGHT}
      style={{
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '4px',
        background: '#1a1a2e',
      }}
    />
  );
}

export function WaveformPanel({ waveformData, sources }: WaveformPanelProps) {
  return (
    <div className="waveform-panel">
      {sources.map((source, idx) => {
        const wfData = waveformData.find((w) => w.sourceId === source.id);
        return (
          <SingleWaveform
            key={source.id}
            data={wfData?.samples || new Array(240).fill(0)}
            color={source.color}
            frequency={source.frequency}
            amplitude={source.amplitude}
          />
        );
      })}
    </div>
  );
}
