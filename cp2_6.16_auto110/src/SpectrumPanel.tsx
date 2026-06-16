import { useRef, useEffect } from 'react';
import { SoundSource, calculateFrequencySpectrum, constants } from './utils/soundPhysics';

interface SpectrumPanelProps {
  sources: SoundSource[];
  timeData: number[];
}

export default function SpectrumPanel({ sources, timeData }: SpectrumPanelProps) {
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const splCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumHistoryRef = useRef<number[][]>([]);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const HISTORY_LENGTH = 300;

    const renderSpectrum = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = 256;
      const displayHeight = 400;

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      ctx.scale(dpr, dpr);

      const { magnitudes } = calculateFrequencySpectrum(sources, 5, 60);

      spectrumHistoryRef.current.push([...magnitudes]);
      if (spectrumHistoryRef.current.length > HISTORY_LENGTH) {
        spectrumHistoryRef.current.shift();
      }

      ctx.fillStyle = '#1e272e';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      const history = spectrumHistoryRef.current;
      if (history.length === 0) return;

      const barWidth = displayWidth / HISTORY_LENGTH;

      for (let h = 0; h < history.length; h++) {
        const mags = history[h];
        const x = h * barWidth;

        for (let i = 0; i < mags.length; i++) {
          const yTop = displayHeight - (i / mags.length) * displayHeight;
          const yBottom = displayHeight - ((i + 1) / mags.length) * displayHeight;
          const mag = mags[i];

          const t = i / mags.length;
          const c1 = { r: 0, g: 210, b: 211 };
          const c2 = { r: 255, g: 159, b: 243 };
          const r = Math.round(c1.r + (c2.r - c1.r) * t);
          const g = Math.round(c1.g + (c2.g - c1.g) * t);
          const b = Math.round(c1.b + (c2.b - c1.b) * t);

          const intensity = Math.min(mag, 1);
          if (intensity > 0.02) {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${intensity})`;
            ctx.fillRect(x, yBottom, barWidth + 1, yTop - yBottom);
          }
        }
      }

      ctx.strokeStyle = '#485460';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, displayWidth, displayHeight);

      ctx.fillStyle = 'rgba(223, 230, 233, 0.5)';
      ctx.font = '10px sans-serif';
      ctx.fillText('时间 →', displayWidth - 40, displayHeight - 5);
      ctx.save();
      ctx.translate(12, displayHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('频率 ↑', -20, 0);
      ctx.restore();
    };

    const animate = (time: number) => {
      if (time - lastUpdateRef.current >= 16.67) {
        renderSpectrum();
        lastUpdateRef.current = time;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sources]);

  useEffect(() => {
    const canvas = splCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const displayWidth = 256;
    const displayHeight = 100;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    if (timeData.length === 0) return;

    const padding = 12;
    const graphWidth = displayWidth - padding * 2;
    const graphHeight = displayHeight - padding * 2;
    const centerY = padding + graphHeight / 2;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(72, 84, 96, 0.5)';
    ctx.lineWidth = 1;
    ctx.moveTo(padding, centerY);
    ctx.lineTo(displayWidth - padding, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00d2d3';
    ctx.shadowBlur = 4;

    for (let i = 0; i < timeData.length; i++) {
      const x = padding + (i / (timeData.length - 1)) * graphWidth;
      const y = centerY - timeData[i] * (graphHeight / 2) * 0.8;

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
    ctx.strokeRect(0, 0, displayWidth, displayHeight);
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
            width: '256px',
            height: '400px',
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
            width: '256px',
            height: '100px',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
}
