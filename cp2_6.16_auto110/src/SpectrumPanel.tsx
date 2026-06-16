import { useRef, useEffect } from 'react';
import { SoundSource, calculateFrequencySpectrum, constants } from './utils/soundPhysics';

interface SpectrumPanelProps {
  sources: SoundSource[];
  timeData: number[];
  historyLength?: number;
}

export default function SpectrumPanel({ sources, timeData, historyLength = 200 }: SpectrumPanelProps) {
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const splCanvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[][]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { magnitudes } = calculateFrequencySpectrum(sources, 5, 60);

      historyRef.current.push(magnitudes);
      if (historyRef.current.length > historyLength) {
        historyRef.current.shift();
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      ctx.fillStyle = '#1e272e';
      ctx.fillRect(0, 0, width, height);

      const history = historyRef.current;
      if (history.length === 0) return;

      const barWidth = width / historyLength;

      for (let h = 0; h < history.length; h++) {
        const mags = history[h];
        const x = h * barWidth;

        for (let i = 0; i < mags.length; i++) {
          const yTop = height - (i / mags.length) * height;
          const yBottom = height - ((i + 1) / mags.length) * height;
          const mag = mags[i];

          const t = i / mags.length;
          const r = Math.round(0 + (255 - 0) * t);
          const g = Math.round(210 + (159 - 210) * t);
          const b = Math.round(211 + (243 - 211) * t);

          const intensity = Math.min(mag, 1);
          if (intensity > 0.05) {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${intensity * 0.9})`;
            ctx.fillRect(x, yBottom, barWidth + 1, yTop - yBottom);
          }
        }
      }

      ctx.strokeStyle = '#485460';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, width, height);
    };

    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime > 16) {
        render();
        lastTime = time;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sources, historyLength]);

  useEffect(() => {
    const canvas = splCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, width, height);

    if (timeData.length === 0) return;

    const padding = 10;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;
    const centerY = padding + graphHeight / 2;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(72, 84, 96, 0.5)';
    ctx.lineWidth = 1;
    ctx.moveTo(padding, centerY);
    ctx.lineTo(width - padding, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00d2d3';
    ctx.shadowBlur = 5;

    for (let i = 0; i < timeData.length; i++) {
      const x = padding + (i / (timeData.length - 1)) * graphWidth;
      const y = centerY - timeData[i] * (graphHeight / 2);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#485460';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  }, [timeData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div
          style={{
            color: '#dfe6e9',
            fontSize: '12px',
            marginBottom: '8px',
            opacity: 0.7,
            display: 'flex',
            justifyContent: 'space-between'
          }}
        >
          <span>频谱图</span>
          <span style={{ opacity: 0.5 }}>20Hz - 20kHz</span>
        </div>
        <canvas
          ref={spectrumCanvasRef}
          style={{
            borderRadius: '8px',
            border: '1px solid #485460',
            width: '100%',
            height: '150px',
            display: 'block'
          }}
        />
      </div>

      <div>
        <div
          style={{
            color: '#dfe6e9',
            fontSize: '12px',
            marginBottom: '8px',
            opacity: 0.7
          }}
        >
          声压级曲线
        </div>
        <canvas
          ref={splCanvasRef}
          style={{
            borderRadius: '8px',
            border: '1px solid #485460',
            width: '100%',
            height: '100px',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
}
