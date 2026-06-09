import { useEffect, useRef, useCallback } from 'react';
import type { Particle, ThemeData, PoemData } from '@/types';
import { randomColorInRange, rgba } from '@/utils/colorUtils';

interface UseParticleEngineOptions {
  canvas: HTMLCanvasElement | null;
  poem: PoemData;
  theme: ThemeData;
  width: number;
  height: number;
  autoplay?: boolean;
  onAnimationComplete?: () => void;
}

interface ParticleEngineState {
  particles: Particle[];
  startTime: number;
  animationFrame: number;
  rotationAngle: number;
  lastTimestamp: number;
  isComplete: boolean;
}

const LINE_ENTRY_DELAY = 0.3;
const PARTICLE_ANIMATION_DURATION = 0.8;
const PARTICLES_PER_CHAR = 6;
const BG_ROTATION_PERIOD = 2000;
const BG_CONCENTRIC_COUNT = 5;
const BG_ALPHA = 0.15;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function useParticleEngine(options: UseParticleEngineOptions) {
  const { canvas, poem, theme, width, height, autoplay = true, onAnimationComplete } = options;
  const stateRef = useRef<ParticleEngineState>({
    particles: [],
    startTime: 0,
    animationFrame: 0,
    rotationAngle: 0,
    lastTimestamp: 0,
    isComplete: false,
  });
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const initParticles = useCallback(() => {
    const particles: Particle[] = [];
    const lines = poem.lines;
    const lineCount = lines.length;
    const paddingX = width * 0.1;
    const paddingTop = height * 0.22;
    const lineHeight = (height * 0.55) / Math.max(lineCount, 4);
    const fontSize = Math.min(32, Math.max(20, lineHeight * 0.55));

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = `${fontSize}px "Noto Serif SC", serif`;

    lines.forEach((line, lineIndex) => {
      const charCount = line.length;
      const textWidth = tempCtx.measureText(line).width;
      const startX = (width - textWidth) / 2;
      const baseY = paddingTop + lineIndex * lineHeight + fontSize / 2;

      for (let charIndex = 0; charIndex < charCount; charIndex++) {
        const char = line[charIndex];
        const charMetrics = tempCtx.measureText(line.substring(0, charIndex + 1));
        const prevMetrics = tempCtx.measureText(line.substring(0, charIndex));
        const charCenterX = startX + (prevMetrics.width + charMetrics.width) / 2;

        for (let p = 0; p < PARTICLES_PER_CHAR; p++) {
          const baseColor = Math.random() > 0.5 ? theme.accentColor : theme.gradientEnd;
          particles.push({
            x: -50 - Math.random() * 100,
            y: baseY,
            startX: -50 - Math.random() * 100,
            targetX: charCenterX + (Math.random() - 0.5) * 6,
            targetY: baseY + (Math.random() - 0.5) * 4,
            color: randomColorInRange(baseColor, 15),
            size: 2 + Math.random() * 3,
            alpha: 0,
            progress: 0,
            delay: lineIndex * LINE_ENTRY_DELAY + (charIndex / Math.max(charCount, 1)) * 0.15,
            lineIndex,
            charIndex: p,
          });
        }
        void char;
      }
    });

    stateRef.current.particles = particles;
  }, [poem, theme, width, height]);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, theme.gradientStart);
    gradient.addColorStop(1, theme.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.max(width, height) * 0.6;
    const angle = (time / BG_ROTATION_PERIOD) * Math.PI * 2;

    for (let i = 0; i < BG_CONCENTRIC_COUNT; i++) {
      const radius = maxRadius * ((i + 1) / BG_CONCENTRIC_COUNT);
      const ringGradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.8,
        centerX, centerY, radius * 1.1
      );
      const t = i / BG_CONCENTRIC_COUNT;
      ringGradient.addColorStop(0, 'transparent');
      ringGradient.addColorStop(0.5, rgba(theme.accentColor, BG_ALPHA * (1 - t * 0.6)));
      ringGradient.addColorStop(1, 'transparent');

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle * (i % 2 === 0 ? 1 : -1));
      ctx.translate(-centerX, -centerY);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = ringGradient;
      ctx.fill();
      ctx.restore();
    }

    stateRef.current.rotationAngle = angle;
  }, [theme, width, height]);

  const drawHeader = useCallback((ctx: CanvasRenderingContext2D) => {
    const paddingX = width * 0.1;

    ctx.save();
    ctx.font = `600 ${Math.min(36, width * 0.055)}px "Noto Serif SC", serif`;
    ctx.fillStyle = theme.accentColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = rgba(theme.accentColor, 0.5);
    ctx.shadowBlur = 15;
    ctx.fillText(poem.title, width / 2, height * 0.12);
    ctx.restore();

    ctx.save();
    ctx.font = `400 ${Math.min(18, width * 0.028)}px "Noto Serif SC", serif`;
    ctx.fillStyle = rgba(theme.accentColor, 0.8);
    ctx.textAlign = 'center';
    ctx.fillText(`—— ${poem.author}`, width / 2, height * 0.17);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = rgba(theme.accentColor, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingX, height * 0.195);
    ctx.lineTo(width - paddingX, height * 0.195);
    ctx.stroke();
    ctx.restore();
  }, [poem, theme, width, height]);

  const drawFooter = useCallback((ctx: CanvasRenderingContext2D) => {
    const themeName = theme.name;
    ctx.save();
    ctx.font = `12px "Noto Sans SC", sans-serif`;
    ctx.fillStyle = rgba(theme.accentColor, 0.5);
    ctx.textAlign = 'left';
    ctx.fillText(`主题 · ${themeName}`, width * 0.08, height * 0.94);
    ctx.restore();

    ctx.save();
    ctx.font = `12px "Noto Sans SC", sans-serif`;
    ctx.fillStyle = rgba(theme.accentColor, 0.5);
    ctx.textAlign = 'right';
    ctx.fillText(`读诗·流光书签`, width * 0.92, height * 0.94);
    ctx.restore();
  }, [theme, width, height]);

  const renderFrame = useCallback((timestamp: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (stateRef.current.startTime === 0) {
      stateRef.current.startTime = timestamp;
    }

    const elapsedSeconds = (timestamp - stateRef.current.startTime) / 1000;
    stateRef.current.lastTimestamp = timestamp;

    drawBackground(ctx, timestamp);
    drawHeader(ctx);
    drawFooter(ctx);

    let allComplete = true;

    for (const particle of stateRef.current.particles) {
      const effectiveTime = elapsedSeconds - particle.delay;

      if (effectiveTime >= 0) {
        const rawProgress = Math.min(effectiveTime / PARTICLE_ANIMATION_DURATION, 1);
        particle.progress = rawProgress;

        const progress = easeOutCubic(rawProgress);
        const alphaProgress = easeInOutQuad(rawProgress);

        particle.x = particle.startX + (particle.targetX - particle.startX) * progress;
        particle.y = particle.targetY + Math.sin(rawProgress * Math.PI) * -8;
        particle.alpha = alphaProgress;

        if (rawProgress < 1) {
          allComplete = false;
        }
      } else {
        allComplete = false;
      }

      const shimmerOffset = Math.sin((timestamp / 500) + particle.lineIndex * 0.5 + particle.charIndex * 0.2) * 0.1;

      ctx.save();
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.alpha + shimmerOffset));
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.alpha > 0.5 ? 8 : 4;
      ctx.fill();
      ctx.restore();
    }

    if (allComplete && !stateRef.current.isComplete) {
      stateRef.current.isComplete = true;
      onAnimationComplete?.();
    } else if (!allComplete) {
      stateRef.current.isComplete = false;
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, [drawBackground, drawHeader, drawFooter, onAnimationComplete]);

  const start = useCallback(() => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    stateRef.current.startTime = 0;
    stateRef.current.isComplete = false;
    initParticles();

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, [canvas, width, height, initParticles, renderFrame]);

  const restart = useCallback(() => {
    stateRef.current.startTime = 0;
    stateRef.current.isComplete = false;
    initParticles();
  }, [initParticles]);

  useEffect(() => {
    if (canvas && autoplay) {
      start();
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [canvas, autoplay, start]);

  return { start, restart };
}
