import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface ParticleEffectProps {
  active: boolean;
  x: number;
  y: number;
  type?: 'chest' | 'hit' | 'heal' | 'damage';
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

const ParticleEffect: React.FC<ParticleEffectProps> = ({
  active,
  x,
  y,
  type = 'chest',
  count = 15,
  duration = 800,
  onComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors: Record<string, string[]> = {
      chest: ['#ffd700', '#ffec8b', '#fff68f', '#ffff00'],
      hit: ['#ff0000', '#ff4444', '#ff6666', '#ff8888'],
      heal: ['#4ade80', '#86efac', '#bbf7d0', '#22c55e'],
      damage: ['#ef4444', '#f87171', '#fca5a5', '#dc2626']
    };

    const particleColors = colors[type] || colors.chest;

    particlesRef.current = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      particlesRef.current.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        maxLife: duration,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        size: 2 + Math.random() * 4
      });
    }

    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = elapsed / duration;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allDead = true;
      particlesRef.current.forEach(particle => {
        if (particle.life > 0) {
          allDead = false;
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.1;
          particle.life = Math.max(0, 1 - progress);

          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          ctx.fillRect(
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size
          );
        }
      });

      ctx.globalAlpha = 1;

      if (!allDead && progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (onComplete) {
          onComplete();
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, type, count, duration, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      style={{
        position: 'absolute',
        left: x - 32,
        top: y - 32,
        pointerEvents: 'none',
        zIndex: 50,
        imageRendering: 'pixelated'
      }}
    />
  );
};

export default ParticleEffect;
