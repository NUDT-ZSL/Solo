import { useEffect, useRef } from 'react';
import useActivityStore from '@/store';
import { playGlassBreak } from '@/lib/audio';

const EMOJI_MAP: Record<string, string[]> = {
  '❤️': ['❤️', '💕', '💖', '💗'],
  '🎉': ['🎉', '🎊', '🥳', '✨'],
  '🔥': ['🔥', '💥', '⚡', '🌟'],
};

interface Particle {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  scale: number;
  opacity: number;
  rotation: number;
  rotSpeed: number;
}

export default function EmojiRain() {
  const { emojiRainType, resetEmojiRain } = useActivityStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);

  useEffect(() => {
    if (!emojiRainType) return;

    playGlassBreak();
    startTimeRef.current = Date.now();
    spawnTimerRef.current = Date.now();
    particlesRef.current = [];

    const emojis = EMOJI_MAP[emojiRainType] || [emojiRainType];

    const createParticle = (): Particle => {
      const w = window.innerWidth;
      return {
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: Math.random() * w,
        y: -30,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 1.5 + 0.5,
        gravity: 0.03 + Math.random() * 0.02,
        scale: 1 + Math.random() * 0.8,
        opacity: 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 4,
      };
    };

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;

      if (now - spawnTimerRef.current > 80 && elapsed < 12000) {
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push(createParticle());
        }
        spawnTimerRef.current = now;
      }

      const container = containerRef.current;
      if (container) {
        const children = container.children;
        while (children.length < particlesRef.current.length) {
          const el = document.createElement('div');
          el.style.position = 'absolute';
          el.style.fontSize = '28px';
          el.style.pointerEvents = 'none';
          el.style.willChange = 'transform, opacity';
          container.appendChild(el);
        }
        while (children.length > particlesRef.current.length) {
          container.removeChild(container.lastChild!);
        }

        for (let i = 0; i < particlesRef.current.length; i++) {
          const p = particlesRef.current[i];
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotSpeed;

          const lifePct = elapsed / 15000;
          if (lifePct > 0.7) {
            p.opacity = Math.max(1 - (lifePct - 0.7) / 0.3, 0);
          }
          if (lifePct > 0.5) {
            p.scale *= 0.999;
          }

          const el = children[i] as HTMLElement;
          el.textContent = p.emoji;
          el.style.left = `${p.x}px`;
          el.style.top = `${p.y}px`;
          el.style.opacity = String(p.opacity);
          el.style.transform = `scale(${p.scale}) rotate(${p.rotation}deg)`;
        }
      }

      particlesRef.current = particlesRef.current.filter(
        (p) => p.y < window.innerHeight + 50 && p.opacity > 0.01
      );

      if (elapsed < 15000 && (particlesRef.current.length > 0 || elapsed < 12000)) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        resetEmojiRain();
        if (container) {
          container.innerHTML = '';
        }
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [emojiRainType, resetEmojiRain]);

  if (!emojiRainType) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ pointerEvents: 'none' }}
    />
  );
}
