import React, { useRef, useEffect } from 'react';
import { audioEngine } from '../audioEngine';

export const Waveform: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      ctx.fillStyle = '#131730';
      ctx.fillRect(0, 0, width, height);

      const data = audioEngine.getWaveformData();
      if (data.length === 0) {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = '#2A2F4A';
        ctx.lineWidth = 1;
        ctx.stroke();
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      const sliceWidth = width / data.length;
      let x = 0;

      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#4ECDC4');
      gradient.addColorStop(0.5, '#AA96DA');
      gradient.addColorStop(1, '#FF6B6B');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div className="waveform-container">
      <canvas ref={canvasRef} className="waveform-canvas" />
    </div>
  );
};
