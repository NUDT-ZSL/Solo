import React, { useEffect, useRef, useState } from 'react';
import type { LanguageName } from '../utils/algorithmRunner';
import { LANGUAGE_COLORS } from '../utils/algorithmRunner';

export interface RaceTrackData {
  language: LanguageName;
  timeMs: number;
  status: 'idle' | 'running' | 'completed';
  progress: number;
}

interface RaceTrackProps {
  tracks: RaceTrackData[];
  maxTime: number;
}

const TRACK_HEIGHT = 56;
const TRACK_GAP = 8;

const RaceTrack: React.FC<RaceTrackProps> = ({ tracks, maxTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [fps, setFps] = useState<number>(60);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsAccumRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const totalHeight = tracks.length * (TRACK_HEIGHT + TRACK_GAP) + 20;
    const width = canvas.parentElement?.clientWidth || 800;

    canvas.width = width * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${totalHeight}px`;
    ctx.scale(dpr, dpr);

    const draw = (timestamp: number) => {
      if (lastFrameTimeRef.current > 0) {
        const delta = timestamp - lastFrameTimeRef.current;
        fpsAccumRef.current += delta;
        frameCountRef.current++;
        if (fpsAccumRef.current >= 500) {
          const currentFps = Math.round((frameCountRef.current / fpsAccumRef.current) * 1000);
          setFps(currentFps);
          frameCountRef.current = 0;
          fpsAccumRef.current = 0;
        }
      }
      lastFrameTimeRef.current = timestamp;

      ctx.clearRect(0, 0, width, totalHeight);

      const barMaxWidth = width - 200;
      const labelWidth = 120;
      const barStartX = labelWidth + 10;

      tracks.forEach((track, index) => {
        const y = index * (TRACK_HEIGHT + TRACK_GAP) + 10;
        const barHeight = TRACK_HEIGHT - 8;

        ctx.fillStyle = LANGUAGE_COLORS[track.language];
        ctx.font = 'bold 14px "Segoe UI", "PingFang SC", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(track.language, labelWidth, y + barHeight / 2);

        ctx.fillStyle = '#1A1A2E';
        ctx.strokeStyle = '#2A2A4A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barStartX, y, barMaxWidth, barHeight, 6);
        ctx.fill();
        ctx.stroke();

        if (track.progress > 0) {
          const barWidth = Math.max(2, (track.progress / 100) * barMaxWidth);
          const gradient = ctx.createLinearGradient(barStartX, 0, barStartX + barWidth, 0);
          gradient.addColorStop(0, '#1A1A40');
          gradient.addColorStop(1, '#00FF88');

          ctx.beginPath();
          ctx.roundRect(barStartX, y, barWidth, barHeight, 6);
          ctx.fillStyle = gradient;
          ctx.fill();

          const glowColor = track.status === 'completed' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(102, 252, 241, 0.2)';
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.roundRect(barStartX, y, barWidth, barHeight, 6);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#66FCF1';
        ctx.font = '12px "Segoe UI", "PingFang SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (track.status === 'running') {
          ctx.fillText('运行中', barStartX + barMaxWidth + 10, y + barHeight / 2);
        } else if (track.status === 'completed') {
          ctx.fillStyle = '#00FF88';
          ctx.fillText(`耗时: ${track.timeMs.toFixed(2)}ms`, barStartX + barMaxWidth + 10, y + barHeight / 2);
        }

        if (index < tracks.length - 1) {
          const lineY = y + TRACK_HEIGHT + TRACK_GAP / 2;
          const glow = ctx.createLinearGradient(barStartX, 0, barStartX + barMaxWidth, 0);
          glow.addColorStop(0, 'rgba(69, 162, 158, 0)');
          glow.addColorStop(0.5, 'rgba(69, 162, 158, 0.4)');
          glow.addColorStop(1, 'rgba(69, 162, 158, 0)');
          ctx.strokeStyle = glow;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(barStartX, lineY);
          ctx.lineTo(barStartX + barMaxWidth, lineY);
          ctx.stroke();
        }
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [tracks, maxTime]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'rgba(11, 12, 16, 0.8)',
          border: '1px solid #2A2A4A',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 11,
          color: fps >= 55 ? '#00FF88' : '#FF6B6B',
          fontFamily: 'monospace',
          zIndex: 1,
        }}
      >
        {fps} FPS
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default RaceTrack;
