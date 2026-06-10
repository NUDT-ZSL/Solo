import { useEffect, useState } from 'react';
import { EMOTION_COLORS, EmotionType } from '../types';

interface RippleEffectProps {
  active: boolean;
  emotion: EmotionType;
  onComplete?: () => void;
}

export default function RippleEffect({ active, emotion, onComplete }: RippleEffectProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    if (active) {
      const color = EMOTION_COLORS[emotion];
      const newParticles = Array.from({ length: 30 }, (_, i) => {
        const angle = (i / 30) * Math.PI * 2;
        const radius = 60 + Math.random() * 40;
        return {
          id: Date.now() + i,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          delay: Math.random() * 0.2,
          size: 4 + Math.random() * 4
        };
      });
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [active, emotion, onComplete]);

  if (particles.length === 0) return null;

  const color = EMOTION_COLORS[emotion];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 5
      }}
    >
      {particles.map(p => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
            animation: `ripple-expand 1.5s ease-out ${p.delay}s forwards`,
            opacity: 0
          }}
        />
      ))}
    </div>
  );
}
