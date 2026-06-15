import { useRef, useEffect } from 'react';
import { useMouseTrail, type MouseTrailState } from '../hooks/useMouseTrail';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  decay: number;
  type: 'trail' | 'burst';
}

const MAX_PARTICLES = 2000;
const TRAIL_SPAWN_RATE = 3;
const BURST_PARTICLE_COUNT = 60;

function speedToHue(speed: number): number {
  const t = Math.min(speed / 40, 1);
  return 260 - t * 225;
}

function speedToSize(speed: number): number {
  const t = Math.min(speed / 40, 1);
  return 2 + t * 5;
}

function speedToLife(speed: number): number {
  const t = Math.min(speed / 40, 1);
  return 40 + t * 80;
}

function createTrailParticle(state: MouseTrailState): Particle {
  const speed = state.speed;
  const size = speedToSize(speed);
  const life = speedToLife(speed);
  const spreadAngle = state.angle + Math.PI + (Math.random() - 0.5) * 1.2;
  const velocity = 0.3 + Math.random() * 1.5 + speed * 0.04;

  return {
    x: state.x + (Math.random() - 0.5) * 6,
    y: state.y + (Math.random() - 0.5) * 6,
    vx: Math.cos(spreadAngle) * velocity,
    vy: Math.sin(spreadAngle) * velocity,
    life,
    maxLife: life,
    size: size * (0.7 + Math.random() * 0.6),
    hue: speedToHue(speed) + (Math.random() - 0.5) * 20,
    saturation: 80 + Math.random() * 20,
    lightness: 55 + Math.random() * 15,
    alpha: 0.7 + Math.random() * 0.3,
    decay: 0.98,
    type: 'trail',
  };
}

function createBurstParticle(x: number, y: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const velocity = 2 + Math.random() * 8;
  const hue = speedToHue(20 + Math.random() * 30);
  const life = 50 + Math.random() * 60;

  return {
    x,
    y,
    vx: Math.cos(angle) * velocity,
    vy: Math.sin(angle) * velocity,
    life,
    maxLife: life,
    size: 2 + Math.random() * 5,
    hue: hue + (Math.random() - 0.5) * 40,
    saturation: 85 + Math.random() * 15,
    lightness: 55 + Math.random() * 20,
    alpha: 1,
    decay: 0.96,
    type: 'burst',
  };
}

interface ParticleCanvasProps {
  burstId: number;
  burstX: number;
  burstY: number;
}

export default function ParticleCanvas({ burstId, burstX, burstY }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseTrailRef = useMouseTrail();
  const bgHueRef = useRef(220);
  const prevBurstIdRef = useRef(0);

  useEffect(() => {
    if (burstId > 0 && burstId !== prevBurstIdRef.current) {
      prevBurstIdRef.current = burstId;
      const particles = particlesRef.current;
      for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
        if (particles.length < MAX_PARTICLES) {
          particles.push(createBurstParticle(burstX, burstY));
        }
      }
    }
  }, [burstId, burstX, burstY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true })!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let animId: number;

    const animate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const state = mouseTrailRef.current;
      const particles = particlesRef.current;

      if (state.isActive && state.speed > 1) {
        const count = Math.min(Math.ceil(state.speed / 8) + TRAIL_SPAWN_RATE, 10);
        for (let i = 0; i < count; i++) {
          if (particles.length < MAX_PARTICLES) {
            particles.push(createTrailParticle(state));
          }
        }
      }

      const targetHue = 220 + state.normalizedX * 30 - state.speed * 1.5;
      bgHueRef.current += (targetHue - bgHueRef.current) * 0.03;

      const bgSat = 15 + state.speed * 0.4;
      const bgLight = 6 + state.normalizedY * 3 + state.speed * 0.1;

      document.body.style.background = `linear-gradient(135deg, 
        hsl(${bgHueRef.current}, ${bgSat}%, ${bgLight}%) 0%, 
        hsl(${bgHueRef.current + 20}, ${bgSat * 0.7}%, ${bgLight * 0.6}%) 40%, 
        hsl(${bgHueRef.current + 40}, ${bgSat * 0.4}%, ${bgLight * 0.4}%) 100%)`;

      ctx.clearRect(0, 0, w, h);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= p.decay;
        p.vy *= p.decay;
        p.vy += 0.01;
        p.life -= 1;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const lifeRatio = p.life / p.maxLife;
        const alpha = p.alpha * lifeRatio * lifeRatio;
        const currentSize = p.size * (0.3 + lifeRatio * 0.7);

        if (p.type === 'burst') {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 2);
          grad.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha})`);
          grad.addColorStop(0.4, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness * 0.8}%, ${alpha * 0.6})`);
          grad.addColorStop(1, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness * 0.5}%, 0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize * 2, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha})`;
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.life / p.maxLife > 0.6 && p.type === 'burst') {
          const glowSize = p.size * 4;
          const glowAlpha = p.alpha * (p.life / p.maxLife) * 0.15;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness + 10}%, ${glowAlpha})`;
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [mouseTrailRef]);

  return <canvas ref={canvasRef} />;
}
