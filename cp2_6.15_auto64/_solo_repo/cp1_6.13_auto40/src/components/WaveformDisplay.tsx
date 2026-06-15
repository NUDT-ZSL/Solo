import React, { useRef, useEffect, memo, useCallback } from 'react';
import type { AudioEngine, WaveformData } from '../core/AudioEngine';

interface WaveformDisplayProps {
  engine: AudioEngine | null;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ engine, currentTime, duration, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const waveformDataRef = useRef<WaveformData | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, width, height);

    const waveformHeight = height * 0.55;
    const spectrumHeight = height * 0.3;
    const progressHeight = height * 0.08;
    const spectrumY = waveformHeight + 10;
    const progressY = spectrumY + spectrumHeight + 10;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (engine) {
      waveformDataRef.current = engine.getWaveformData();
    }
    const data = waveformDataRef.current;

    if (data) {
      drawWaveform(ctx, data.timeData, width, waveformHeight);
      drawSpectrum(ctx, data.freqData, width, spectrumHeight, spectrumY);
    }

    drawProgressBar(ctx, currentTime, duration, width, progressY, progressHeight);

    animationRef.current = requestAnimationFrame(draw);
  }, [engine, currentTime, duration]);

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    timeData: Float32Array,
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const centerY = height / 2;
    const sliceWidth = width / timeData.length;

    let x = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i];
      const y = centerY + v * centerY * 0.8;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, centerY - 20, 0, centerY + 20);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.1)');
    gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.1)');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    x = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i];
      const y = centerY + v * centerY * 0.8;
      ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(width, centerY);
    ctx.closePath();
    ctx.fill();
  };

  const drawSpectrum = (
    ctx: CanvasRenderingContext2D,
    freqData: Uint8Array,
    width: number,
    height: number,
    y: number
  ) => {
    const barCount = 128;
    const barWidth = 4;
    const gap = 2;
    const totalWidth = barCount * (barWidth + gap);
    const startX = (width - totalWidth) / 2;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * freqData.length);
      const value = freqData[dataIndex] || 0;
      const barHeight = (value / 255) * height;
      const x = startX + i * (barWidth + gap);

      const gradient = ctx.createLinearGradient(0, y + height, 0, y + height - barHeight);
      gradient.addColorStop(0, '#38bdf8');
      gradient.addColorStop(1, '#8b5cf6');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y + height - barHeight, barWidth, barHeight);
    }
  };

  const drawProgressBar = (
    ctx: CanvasRenderingContext2D,
    currentTime: number,
    duration: number,
    width: number,
    y: number,
    height: number
  ) => {
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressWidth = width * progress;

    ctx.fillStyle = '#334155';
    ctx.fillRect(0, y, width, height);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, y, progressWidth, height);

    if (progressWidth > 0) {
      const headX = progressWidth;
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(headX, y + height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    onSeek(progress * duration);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <div ref={containerRef} className="waveform-display">
      <canvas ref={canvasRef} className="waveform-canvas" onClick={handleCanvasClick} />
      <div className="time-labels">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default memo(WaveformDisplay);
