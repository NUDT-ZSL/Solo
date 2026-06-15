import { useEffect, useRef, useState } from 'react';

interface Particle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  color: string;
  createdAt: number;
}

interface ParticleExplosionProps {
  trigger: number;
  x: number;
  y: number;
  onComplete?: () => void;
}

const DURATION = 1000;
const PARTICLE_COUNT = 40;

const ParticleExplosion = ({ trigger, x, y, onComplete }: ParticleExplosionProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [displayX, setDisplayX] = useState(0);
  const [displayY, setDisplayY] = useState(0);
  const lastTriggerRef = useRef(trigger);
  const timersRef = useRef<number[]>([]);

  const colors = [
    '#3b82f6',
    '#ef4444',
    '#22c55e',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
    '#6366f1',
    '#10b981',
  ];

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    if (trigger === 0 || trigger === lastTriggerRef.current) return;
    lastTriggerRef.current = trigger;

    if (x === 0 && y === 0) return;

    clearAllTimers();

    setDisplayX(x);
    setDisplayY(y);

    const newParticles: Particle[] = [];
    const now = performance.now();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
      const distance = 60 + Math.random() * 100;
      const size = 4 + Math.random() * 8;

      newParticles.push({
        id: now + i,
        startX: x,
        startY: y,
        endX: x + Math.cos(angle) * distance,
        endY: y + Math.sin(angle) * distance,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        createdAt: now,
      });
    }

    setParticles(newParticles);

    const removeTimer = window.setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, DURATION + 50);

    timersRef.current.push(removeTimer);

    return () => {
      clearAllTimers();
    };
  }, [trigger, x, y, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{ left: 0, top: 0, width: 0, height: 0 }}
    >
      {particles.map((particle) => {
        const dx = particle.endX - particle.startX;
        const dy = particle.endY - particle.startY;

        return (
          <div
            key={particle.id}
            style={{
              position: 'fixed',
              left: particle.startX,
              top: particle.startY,
              width: particle.size,
              height: particle.size,
              borderRadius: '50%',
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
              animation: `particle-explode-${particle.id} ${DURATION}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              ['--tx' as any]: `${dx}px`,
              ['--ty' as any]: `${dy}px`,
            }}
          >
            <style>
              {`
                @keyframes particle-explode-${particle.id} {
                  0% {
                    opacity: 1;
                    transform: translate(0, 0) scale(1);
                  }
                  50% {
                    opacity: 0.9;
                    transform: translate(calc(var(--tx) * 0.6), calc(var(--ty) * 0.6)) scale(1.3);
                  }
                  100% {
                    opacity: 0;
                    transform: translate(var(--tx), var(--ty)) scale(0);
                  }
                }
              `}
            </style>
          </div>
        );
      })}

      <div
        style={{
          position: 'fixed',
          left: displayX,
          top: displayY,
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: -20,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(59,130,246,0.4) 40%, transparent 70%)',
          animation: `shockwave-${trigger} ${DURATION}ms ease-out forwards`,
          pointerEvents: 'none',
        }}
      >
        <style>
          {`
            @keyframes shockwave-${trigger} {
              0% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(0.5);
                width: 40px;
                height: 40px;
              }
              100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(4);
                width: 120px;
                height: 120px;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default ParticleExplosion;
