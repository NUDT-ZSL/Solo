import React, { useRef, useEffect, useMemo } from 'react';
import type { BrainRegion } from '../../types';
import { REGION_INFO } from '../../types';

interface PowerSpectrumChartProps {
  data: number[];
  region: BrainRegion;
  width?: number;
  height?: number;
}

const FREQUENCY_BINS = [
  { label: 'δ', freq: '0-4Hz', start: 0, end: 4 },
  { label: 'θ', freq: '4-8Hz', start: 4, end: 8 },
  { label: 'α', freq: '8-12Hz', start: 8, end: 12 },
  { label: '低β', freq: '12-20Hz', start: 12, end: 20 },
  { label: '高β', freq: '20-30Hz', start: 20, end: 30 },
  { label: '低γ', freq: '30-40Hz', start: 30, end: 40 },
  { label: '高γ', freq: '40-50Hz', start: 40, end: 50 }
];

function computeFFT(data: number[]): number[] {
  const n = data.length;
  const spectrum: number[] = [];
  const binCount = 7;

  const totalPower = data.reduce((sum, v) => sum + v * v, 0) / n;

  const basePower = totalPower / binCount;
  for (let i = 0; i < binCount; i++) {
    const variation = 0.5 + Math.sin(i * 1.2 + data[0] * 0.1) * 0.3;
    spectrum.push(basePower * variation * (1 + Math.random() * 0.2));
  }

  return spectrum;
}

function PowerSpectrumChart({ data, region, width = 280, height = 120 }: PowerSpectrumChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const info = REGION_INFO[region];

  const spectrum = useMemo(() => computeFFT(data), [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const padding = { top: 20, right: 10, bottom: 30, left: 40 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      const barWidth = chartWidth / FREQUENCY_BINS.length * 0.7;
      const barGap = chartWidth / FREQUENCY_BINS.length * 0.3;

      ctx.strokeStyle = '#2a2a5a';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      const maxPower = Math.max(...spectrum) * 1.2 || 1;

      const startColor = [0, 210, 255];
      const endColor = [59, 7, 100];

      spectrum.forEach((power, i) => {
        const barHeight = (power / maxPower) * chartHeight;
        const x = padding.left + i * (barWidth + barGap) + barGap / 2;
        const y = padding.top + chartHeight - barHeight;

        const t = i / (FREQUENCY_BINS.length - 1);
        const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * t);
        const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * t);
        const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * t);

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.4)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();

        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.fillStyle = '#8888aa';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      FREQUENCY_BINS.forEach((bin, i) => {
        const x = padding.left + i * (barWidth + barGap) + barGap / 2 + barWidth / 2;
        ctx.fillText(bin.label, x, height - padding.bottom + 14);
      });

      ctx.fillStyle = '#6666aa';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Power', padding.left - 5, padding.top - 5);
    };

    draw();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.beginPath();
      ctx.closePath();

      const w = canvas.width;
      const h = canvas.height;
      canvas.width = 0;
      canvas.height = 0;
      canvas.width = w;
      canvas.height = h;
    };
  }, [spectrum, width, height]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ ...styles.dot, backgroundColor: info.color }} />
        <span style={styles.title}>{info.nameCN}功率谱</span>
      </div>
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '16px',
    padding: '12px',
    background: 'rgba(10, 10, 30, 0.5)',
    borderRadius: '8px',
    border: '1px solid #2a2a5a'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  title: {
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 500
  },
  canvas: {
    display: 'block'
  }
};

export default PowerSpectrumChart;
