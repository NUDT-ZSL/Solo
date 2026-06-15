import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { randomRange, FrameRateMonitor, FrameMetrics } from './utils';

interface ParticleEffectProps {
  colors: string[];
}

export interface ParticleEffectHandle {
  trigger: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

const GRAVITY = 50;
const PARTICLE_COUNT = 500;
const DURATION = 2;
const INITIAL_SPEED_MIN = 200;
const INITIAL_SPEED_MAX = 400;

const ParticleEffect = forwardRef<ParticleEffectHandle, ParticleEffectProps>(({ colors }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(performance.now());
  const isActiveRef = useRef(false);
  const fpsMonitorRef = useRef<FrameRateMonitor | null>(null);

  useEffect(() => {
    fpsMonitorRef.current = new FrameRateMonitor((metrics: FrameMetrics) => {
      if (isActiveRef.current) {
        console.debug(`[Perf] 粒子礼花帧率: ${metrics.fps}fps, 每帧: ${metrics.frameTime.toFixed(2)}ms, 粒子数: ${particlesRef.current.length}`);
      }
    });

    return () => {
      fpsMonitorRef.current?.stop();
    };
  }, []);

  const createParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / (window.devicePixelRatio || 1) / 2;
    const centerY = canvas.height / (window.devicePixelRatio || 1) / 2;

    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(INITIAL_SPEED_MIN, INITIAL_SPEED_MAX);
      const vyOffset = randomRange(-100, 150);

      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + vyOffset,
        size: randomRange(3, 6),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: DURATION,
        maxLife: DURATION,
        rotation: randomRange(0, Math.PI * 2),
        rotationSpeed: randomRange(-5, 5)
      });
    }

    particlesRef.current = particles;
  }, [colors]);

  const updateParticles = useCallback((deltaSeconds: number) => {
    const particles = particlesRef.current;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.vy += GRAVITY * deltaSeconds;

      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;

      p.rotation += p.rotationSpeed * deltaSeconds;

      p.life -= deltaSeconds;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0 || p.alpha <= 0.01) {
        particles.splice(i, 1);
      }
    }
  }, []);

  const drawParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const particles = particlesRef.current;

    for (const p of particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      const sides = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const radius = i % 2 === 0 ? p.size : p.size * 0.5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }, []);

  const animate = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    const deltaSeconds = Math.min(deltaTime / 1000, 0.033);

    updateParticles(deltaSeconds);
    drawParticles();

    fpsMonitorRef.current?.tick();

    if (particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      isActiveRef.current = false;
      fpsMonitorRef.current?.stop();
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        }
      }
    }
  }, [updateParticles, drawParticles]);

  const trigger = useCallback(() => {
    if (isActiveRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    const start = performance.now();

    createParticles();
    
    isActiveRef.current = true;
    lastFrameTimeRef.current = performance.now();
    fpsMonitorRef.current?.start();

    const createDuration = performance.now() - start;
    console.debug(`[Perf] 粒子创建耗时: ${createDuration.toFixed(2)}ms, 粒子数: ${PARTICLE_COUNT}, 时间复杂度: O(n)`);

    animationRef.current = requestAnimationFrame(animate);

    setTimeout(() => {
      if (isActiveRef.current && animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        isActiveRef.current = false;
        fpsMonitorRef.current?.stop();
        particlesRef.current = [];

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          const dpr = window.devicePixelRatio || 1;
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
          }
        }
      }
    }, DURATION * 1000 + 500);
  }, [createParticles, animate]);

  useImperativeHandle(ref, () => ({
    trigger
  }), [trigger]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
    />
  );
});

ParticleEffect.displayName = 'ParticleEffect';

export default React.memo(ParticleEffect);
