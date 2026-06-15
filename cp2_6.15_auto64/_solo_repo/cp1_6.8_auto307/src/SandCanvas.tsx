import { useRef, useEffect, useCallback } from 'react';
import {
  Particle,
  ParticleSystemConfig,
  createParticles,
  updateParticles,
  resetParticles,
  getParticleDensity,
} from './utils/particleSystem';

interface SandCanvasProps {
  text: string;
  speed: number;
  dispersalIntensity: number;
  isAnimating: boolean;
  onResetComplete?: () => void;
}

export default function SandCanvas({
  text,
  speed,
  dispersalIntensity,
  isAnimating,
  onResetComplete,
}: SandCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const configRef = useRef<ParticleSystemConfig>({
    speed,
    dispersalIntensity,
    particleDensity: 1,
    trailLength: 5,
  });
  const textRef = useRef(text);
  const isAnimatingRef = useRef(isAnimating);
  const isResetRef = useRef(false);

  useEffect(() => {
    configRef.current.speed = speed;
    configRef.current.dispersalIntensity = dispersalIntensity;
  }, [speed, dispersalIntensity]);

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const initParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const density = getParticleDensity(rect.width, rect.height);
    configRef.current.particleDensity = density;

    particlesRef.current = createParticles(text, rect.width, rect.height, configRef.current);
    elapsedRef.current = 0;
    lastTimeRef.current = 0;
  }, [text]);

  useEffect(() => {
    initParticles();
  }, [initParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      if (textRef.current) {
        const density = getParticleDensity(rect.width, rect.height);
        configRef.current.particleDensity = density;
        particlesRef.current = createParticles(
          textRef.current,
          rect.width,
          rect.height,
          configRef.current,
        );
        elapsedRef.current = 0;
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      if (isAnimatingRef.current && !isResetRef.current) {
        elapsedRef.current += deltaTime;
        particlesRef.current = updateParticles(
          particlesRef.current,
          deltaTime,
          configRef.current,
          elapsedRef.current,
        );
      }

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (const p of particlesRef.current) {
        if (p.alpha <= 0.01) continue;

        if (p.trail.length > 0) {
          for (let i = p.trail.length - 1; i >= 0; i--) {
            const tr = p.trail[i];
            if (tr.alpha < 0.02) continue;
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, p.size * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${tr.alpha * 0.5})`;
            ctx.fill();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha})`;
        ctx.fill();

        if (p.shimmer > 0.1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (2 + p.shimmer * 2), 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(
            p.x, p.y, p.size * 0.5,
            p.x, p.y, p.size * (2 + p.shimmer * 2),
          );
          gradient.addColorStop(0, `hsla(${p.hue + 10}, 100%, 80%, ${p.shimmer * 0.6})`);
          gradient.addColorStop(1, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0)`);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleReset = useCallback(() => {
    isResetRef.current = true;
    particlesRef.current = resetParticles(particlesRef.current);
    elapsedRef.current = 0;

    requestAnimationFrame(() => {
      isResetRef.current = false;
      onResetComplete?.();
    });
  }, [onResetComplete]);

  useEffect(() => {
    if (!isAnimating && particlesRef.current.length > 0) {
      handleReset();
    }
  }, [isAnimating, handleReset]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
