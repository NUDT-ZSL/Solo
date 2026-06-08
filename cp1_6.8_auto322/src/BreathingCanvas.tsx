import React, { useRef, useEffect, useCallback } from 'react';
import {
  BreathingState,
  getPhaseColor,
  colorToRgba,
  PhaseColor,
} from './utils/breathingUtils';

interface BreathingCanvasProps {
  breathingState: BreathingState;
  glassBlurStrength: number;
}

interface WavePoint {
  time: number;
  scale: number;
  color: PhaseColor;
}

export default React.memo(function BreathingCanvas({
  breathingState,
  glassBlurStrength,
}: BreathingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveHistoryRef = useRef<WavePoint[]>([]);
  const animFrameRef = useRef<number>(0);
  const prevStateRef = useRef<BreathingState>(breathingState);
  const particleRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number; color: PhaseColor;
  }>>([]);

  const spawnParticles = useCallback((cx: number, cy: number, radius: number, color: PhaseColor, count: number) => {
    const particles = particleRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.8 + Math.random() * 0.4);
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        size: 1 + Math.random() * 2,
        color,
      });
    }
    if (particles.length > 200) {
      particles.splice(0, particles.length - 200);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const { phase, phaseProgress } = breathingState;
      const currentColor = getPhaseColor(phase, phaseProgress);

      const cx = w / 2;
      const cy = h * 0.4;
      const baseRadius = Math.min(w, h) * 0.2;
      const haloScale = phase === 'idle'
        ? 0.5 + Math.sin(Date.now() * 0.002) * 0.05
        : getHaloScaleFromState(breathingState);
      const radius = baseRadius * haloScale;

      waveHistoryRef.current.push({
        time: Date.now(),
        scale: haloScale,
        color: currentColor,
      });
      if (waveHistoryRef.current.length > 300) {
        waveHistoryRef.current.splice(0, waveHistoryRef.current.length - 300);
      }

      const prevState = prevStateRef.current;
      if (prevState.phase !== breathingState.phase && breathingState.phase !== 'idle') {
        spawnParticles(cx, cy, radius, currentColor, 15);
      }
      prevStateRef.current = breathingState;

      drawOuterGlow(ctx, cx, cy, radius, currentColor, glassBlurStrength);
      drawHalo(ctx, cx, cy, radius, currentColor);
      drawInnerRing(ctx, cx, cy, radius, currentColor);
      drawParticles(ctx);
      drawWaveCurve(ctx, w, h, waveHistoryRef.current);
      drawPhaseText(ctx, cx, cy, radius, phase, phaseProgress);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [breathingState, glassBlurStrength, spawnParticles]);

  function getHaloScaleFromState(state: BreathingState): number {
    const { phase, phaseProgress } = state;
    const t = easeInOutSine(phaseProgress);
    switch (phase) {
      case 'inhale': return 0.5 + 0.5 * t;
      case 'hold': return 1.0;
      case 'exhale': return 1.0 - 0.5 * t;
      default: return 0.5;
    }
  }

  function easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function drawOuterGlow(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, radius: number,
    color: PhaseColor, blur: number
  ) {
    const layers = 5;
    for (let i = layers; i >= 1; i--) {
      const r = radius + i * (20 + blur * 0.5);
      const alpha = 0.04 * (layers - i + 1) / layers;
      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, r);
      gradient.addColorStop(0, colorToRgba(color, alpha * 2));
      gradient.addColorStop(0.5, colorToRgba(color, alpha));
      gradient.addColorStop(1, colorToRgba(color, 0));
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  function drawHalo(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, radius: number,
    color: PhaseColor
  ) {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, colorToRgba(color, 0.35));
    gradient.addColorStop(0.4, colorToRgba(color, 0.2));
    gradient.addColorStop(0.8, colorToRgba(color, 0.08));
    gradient.addColorStop(1, colorToRgba(color, 0));

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function drawInnerRing(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, radius: number,
    color: PhaseColor
  ) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = colorToRgba(color, 0.4);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = colorToRgba(color, 0.15);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawParticles(ctx: CanvasRenderingContext2D) {
    const particles = particleRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life += 1;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      const alpha = 1 - p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = colorToRgba(p.color, alpha * 0.6);
      ctx.fill();
    }
  }

  function drawWaveCurve(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    history: WavePoint[]
  ) {
    if (history.length < 2) return;

    const waveY = h * 0.75;
    const waveHeight = h * 0.08;
    const waveWidth = w * 0.8;
    const startX = w * 0.1;
    const count = Math.min(history.length, 200);
    const startIdx = history.length - count;

    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const pt = history[startIdx + i];
      const x = startX + (i / count) * waveWidth;
      const y = waveY - (pt.scale - 0.5) * waveHeight * 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = colorToRgba(history[history.length - 1].color, 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();

    const fillGradient = ctx.createLinearGradient(0, waveY - waveHeight, 0, waveY + waveHeight);
    fillGradient.addColorStop(0, colorToRgba(history[history.length - 1].color, 0.1));
    fillGradient.addColorStop(1, colorToRgba(history[history.length - 1].color, 0));
    ctx.lineTo(startX + waveWidth, waveY + waveHeight);
    ctx.lineTo(startX, waveY + waveHeight);
    ctx.closePath();
    ctx.fillStyle = fillGradient;
    ctx.fill();
  }

  function drawPhaseText(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, radius: number,
    phase: string, progress: number
  ) {
    const label = phase === 'inhale' ? '吸 气' : phase === 'hold' ? '屏 息' : phase === 'exhale' ? '呼 气' : '准 备';
    ctx.font = `300 ${Math.max(16, radius * 0.2)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(220, 220, 240, 0.85)';
    ctx.fillText(label, cx, cy);

    if (phase !== 'idle') {
      ctx.font = `200 ${Math.max(12, radius * 0.12)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.fillStyle = 'rgba(180, 180, 200, 0.6)';
      ctx.fillText(`${Math.round(progress * 100)}%`, cx, cy + radius * 0.2);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
});
