import { useEffect, useRef, useMemo } from 'react';
import { FlavorRating, FLAVOR_AXES, FLAVOR_LABELS } from '../types';

interface RadarChartProps {
  data: FlavorRating;
  labels?: string[];
  size?: number;
}

export default function RadarChart({ data, labels, size = 400 }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRef = useRef<FlavorRating>({ spicy: 0, sweet: 0, salty: 0, sour: 0, umami: 0 });
  const targetRef = useRef<FlavorRating>(data);
  const startTimeRef = useRef<number>(0);
  const highlightRef = useRef<string>('');

  const axes = useMemo(() => FLAVOR_AXES, []);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.38;
  const animationDuration = 500;

  useEffect(() => {
    const grainCanvas = document.createElement('canvas');
    const gSize = size;
    grainCanvas.width = gSize;
    grainCanvas.height = gSize;
    const gCtx = grainCanvas.getContext('2d')!;
    const bgGrad = gCtx.createRadialGradient(gSize / 2, gSize / 2, 0, gSize / 2, gSize / 2, gSize * 0.55);
    bgGrad.addColorStop(0, 'rgba(20, 18, 16, 0.94)');
    bgGrad.addColorStop(0.35, 'rgba(25, 22, 20, 0.91)');
    bgGrad.addColorStop(0.7, 'rgba(32, 28, 25, 0.88)');
    bgGrad.addColorStop(1, 'rgba(45, 40, 36, 0.85)');
    gCtx.fillStyle = bgGrad;
    gCtx.fillRect(0, 0, gSize, gSize);
    const imgData = gCtx.getImageData(0, 0, gSize, gSize);
    const cx = gSize / 2;
    const cy = gSize / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < gSize; y += 2) {
      for (let x = 0; x < gSize; x += 2) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > gSize * 0.52) continue;
        const distFactor = 1 - dist / maxDist;
        const noiseVal = Math.random();
        const threshold = 0.025 + distFactor * 0.035;
        if (noiseVal < threshold) {
          const idx = (y * gSize + x) * 4;
          const brightness = 245 + Math.floor(Math.random() * 10);
          const alpha = 0.05 + Math.random() * 0.11 + distFactor * 0.06;
          imgData.data[idx] = brightness;
          imgData.data[idx + 1] = brightness;
          imgData.data[idx + 2] = brightness - 2;
          imgData.data[idx + 3] = Math.floor(alpha * 255);
        }
      }
    }
    gCtx.putImageData(imgData, 0, 0);
    grainCanvasRef.current = grainCanvas;
  }, [size]);

  useEffect(() => {
    targetRef.current = data;
    startTimeRef.current = performance.now();
    let maxAxis = '';
    let maxVal = -1;
    for (const key of axes) {
      if (data[key] > maxVal) {
        maxVal = data[key];
        maxAxis = key;
      }
    }
    highlightRef.current = maxAxis;
    startAnimation();
  }, [data, axes]);

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  function startAnimation() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);
      const t = easeOutCubic(progress);
      for (const key of axes) {
        currentRef.current[key] = lerp(currentRef.current[key], targetRef.current[key], t);
      }
      draw(progress);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }

  function draw(progress: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.45, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    if (grainCanvasRef.current) {
      ctx.drawImage(grainCanvasRef.current, 0, 0, size, size);
    } else {
      const fallbackGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
      fallbackGrad.addColorStop(0, 'rgba(20, 18, 16, 0.94)');
      fallbackGrad.addColorStop(0.7, 'rgba(32, 28, 25, 0.88)');
      fallbackGrad.addColorStop(1, 'rgba(45, 40, 36, 0.85)');
      ctx.fillStyle = fallbackGrad;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.restore();

    const levels = 5;
    for (let lv = 1; lv <= levels; lv++) {
      const r = (radius / levels) * lv;
      ctx.beginPath();
      for (let i = 0; i < axes.length; i++) {
        const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < axes.length; i++) {
      const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const points: { x: number; y: number; axis: string; val: number }[] = [];
    for (let i = 0; i < axes.length; i++) {
      const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
      const val = Math.min(Math.max(currentRef.current[axes[i]], 0), 10);
      const r = radius * (val / 10);
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      points.push({ x, y, axis: axes[i], val });
    }

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const areaGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    areaGrad.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
    areaGrad.addColorStop(1, 'rgba(249, 115, 22, 0.15)');
    ctx.fillStyle = areaGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const highlightIndex = axes.indexOf(highlightRef.current as keyof FlavorRating);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const isHighlight = i === highlightIndex && progress >= 0.9;
      ctx.beginPath();
      const dotRadius = isHighlight ? 7 : 4.5;
      ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
      const pulse = isHighlight ? 1 + Math.sin(performance.now() / 200) * 0.2 : 1;
      ctx.fillStyle = isHighlight ? '#fbbf24' : '#f97316';
      ctx.shadowColor = isHighlight ? 'rgba(251, 191, 36, 0.8)' : 'rgba(249, 115, 22, 0.5)';
      ctx.shadowBlur = isHighlight ? 15 * pulse : 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

    for (let i = 0; i < axes.length; i++) {
      const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
      const labelR = radius * 1.22;
      const x = centerX + Math.cos(angle) * labelR;
      const y = centerY + Math.sin(angle) * labelR;
      const isHighlight = axes[i] === highlightRef.current;

      const axisLabel = FLAVOR_LABELS[axes[i]];
      const displayLabel = labels && labels[i] ? labels[i] : axisLabel;
      
      const isHighlightFinal = isHighlight && progress >= 0.98;
      ctx.fillStyle = isHighlightFinal ? '#fbbf24' : 'rgba(255, 255, 255, 0.92)';
      if (isHighlightFinal) {
        ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
        ctx.shadowBlur = 8;
      }
      ctx.fillText(displayLabel, x, y);
      ctx.shadowBlur = 0;

      const valY = y + 18;
      const val = Math.round(currentRef.current[axes[i]] * 10) / 10;
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(val.toFixed(0) + '/10', x, valY);
      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    }

    if (progress < 1) {
      animRef.current = requestAnimationFrame(() => draw(progress));
    }
  }

  useEffect(() => {
    draw(1);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        borderRadius: '16px',
        maxWidth: '100%',
        height: 'auto',
      }}
    />
  );
}
