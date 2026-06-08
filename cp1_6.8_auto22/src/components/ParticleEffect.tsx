import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ParticleEffectProps {
  active: boolean;
  x: number;
  y: number;
  color: string;
  onComplete?: () => void;
}

const ParticleEffect: React.FC<ParticleEffectProps> = ({
  active,
  x,
  y,
  color,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  const createParticles = useCallback(
    (cx: number, cy: number) => {
      const particles: Particle[] = [];
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
        const speed = Math.random() * 3 + 1.5;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3 + 1,
          life: 1,
          maxLife: 0.6 + Math.random() * 0.4,
          color,
        });
      }
      return particles;
    },
    [color]
  );

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;

    particlesRef.current = createParticles(canvasX, canvasY);
    let elapsed = 0;

    const animate = () => {
      elapsed += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allDead = true;
      for (const p of particlesRef.current) {
        p.life -= 0.016 / p.maxLife;
        if (p.life <= 0) continue;
        allDead = false;

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.vy += 0.05;

        const alpha = p.life * 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life * 2, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(')', `, ${alpha * 0.3})`).replace('rgb', 'rgba');
        ctx.fill();
      }

      if (allDead || elapsed > 2) {
        onComplete?.();
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [active, x, y, color, createParticles, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 100 }}
    />
  );
};

export default ParticleEffect;
