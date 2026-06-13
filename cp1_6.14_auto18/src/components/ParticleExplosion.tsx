import { useRef, useEffect, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  tx: number;
  ty: number;
}

interface ParticleExplosionProps {
  trigger: number;
  x: number;
  y: number;
  onComplete?: () => void;
}

const ParticleExplosion = ({ trigger, x, y, onComplete }: ParticleExplosionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTriggerRef = useRef(trigger);

  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

  const createParticles = useCallback(
    (centerX: number, centerY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const particleCount = 30;
      const newParticles: Particle[] = [];

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const distance = 50 + Math.random() * 80;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        const particle: Particle = {
          id: Date.now() + i,
          x: centerX,
          y: centerY,
          color: colors[Math.floor(Math.random() * colors.length)],
          tx,
          ty,
        };

        newParticles.push(particle);
      }

      particlesRef.current = newParticles;
      container.innerHTML = '';

      newParticles.forEach((particle) => {
        const el = document.createElement('div');
        el.className = 'particle';
        el.style.left = `${particle.x}px`;
        el.style.top = `${particle.y}px`;
        el.style.backgroundColor = particle.color;
        el.style.setProperty('--tx', `${particle.tx}px`);
        el.style.setProperty('--ty', `${particle.ty}px`);
        el.style.boxShadow = `0 0 6px ${particle.color}`;
        container.appendChild(el);
      });

      setTimeout(() => {
        if (container) {
          container.innerHTML = '';
        }
        particlesRef.current = [];
        onComplete?.();
      }, 1000);
    },
    [onComplete]
  );

  useEffect(() => {
    if (trigger !== lastTriggerRef.current) {
      lastTriggerRef.current = trigger;
      if (x !== 0 && y !== 0) {
        createParticles(x, y);
      }
    }
  }, [trigger, x, y, createParticles]);

  return (
    <div
      ref={containerRef}
      className="fixed pointer-events-none z-50"
      style={{ left: 0, top: 0, width: '100%', height: '100%' }}
    />
  );
};

export default ParticleExplosion;
