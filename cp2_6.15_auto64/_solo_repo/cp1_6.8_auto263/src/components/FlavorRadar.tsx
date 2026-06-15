import { useRef, useEffect } from 'react';
import type { Taste } from '@/types';

interface FlavorRadarProps {
  taste: Taste;
  size?: number;
}

const AXES: { key: keyof Taste; label: string }[] = [
  { key: 'sweet', label: '甜' },
  { key: 'salty', label: '咸' },
  { key: 'sour', label: '酸' },
  { key: 'bitter', label: '苦' },
  { key: 'umami', label: '鲜' },
  { key: 'spicy', label: '辣' },
];

const GRID_LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0];
const COLOR_GRID = '#E8DDD3';
const COLOR_AXIS = '#C4B5A5';
const COLOR_FILL = 'rgba(212, 132, 90, 0.3)';
const COLOR_STROKE = '#D4845A';
const COLOR_LABEL = '#6B4C3B';

function getPoint(cx: number, cy: number, radius: number, index: number, count: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export default function FlavorRadar({ taste, size = 280 }: FlavorRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size * 0.36;
    const count = AXES.length;

    ctx.clearRect(0, 0, size, size);

    for (const level of GRID_LEVELS) {
      const r = maxRadius * level;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const { x, y } = getPoint(cx, cy, r, i, count);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = COLOR_GRID;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < count; i++) {
      const { x, y } = getPoint(cx, cy, maxRadius, i, count);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = COLOR_AXIS;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const value = taste[AXES[i].key];
      const r = maxRadius * (Math.min(Math.max(value, 0), 10) / 10);
      const { x, y } = getPoint(cx, cy, r, i, count);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = COLOR_FILL;
    ctx.fill();
    ctx.strokeStyle = COLOR_STROKE;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '13px sans-serif';
    ctx.fillStyle = COLOR_LABEL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < count; i++) {
      const { x, y } = getPoint(cx, cy, maxRadius + 20, i, count);
      ctx.fillText(AXES[i].label, x, y);
    }
  }, [taste, size]);

  return <canvas ref={canvasRef} />;
}
