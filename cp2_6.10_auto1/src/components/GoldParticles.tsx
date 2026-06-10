import React, { useEffect, useRef } from 'react';

interface GoldParticlesProps {
  active: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

const PARTICLE_COUNT = 200;
const GRAVITY = 0.15;
const MAX_LIFE = 120;

export const GoldParticles: React.FC<GoldParticlesProps> = ({
  active,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const wasActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const createParticles = () => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const particles: Particle[] = [];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          radius: Math.random() * 3 + 1,
          alpha: 1,
          life: MAX_LIFE,
          maxLife: MAX_LIFE,
        });
      }

      particlesRef.current = particles;
    };

    const goldColors = [
      'rgba(255, 215, 0, {alpha})',
      'rgba(255, 193, 7, {alpha})',
      'rgba(255, 235, 59, {alpha})',
      'rgba(255, 167, 38, {alpha})',
      'rgba(255, 223, 0, {alpha})',
    ];

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const particles = particlesRef.current;
      let hasAlive = false;

      for (const p of particles) {
        if (p.life <= 0) continue;

        hasAlive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY;
        p.vx *= 0.99;
        p.life -= 1;
        p.alpha = Math.max(0, p.life / p.maxLife);

        const colorIndex = Math.floor(Math.random() * goldColors.length);
        const color = goldColors[colorIndex].replace('{alpha}', p.alpha.toString());

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = goldColors[colorIndex].replace('{alpha}', (p.alpha * 0.3).toString());
        ctx.fill();
      }

      if (hasAlive) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    if (active && !wasActiveRef.current) {
      createParticles();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animate();
    }

    wasActiveRef.current = active;

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
};
