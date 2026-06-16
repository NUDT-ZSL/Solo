import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { getMeteorSpeed, getMeteorSpawnInterval } from '../logic/gameLogic';

export interface MeteorShowerHandle {
  start: () => void;
  stop: () => void;
  reset: () => void;
}

interface MeteorShowerProps {
  level: number;
  getPanelRect: () => DOMRect | null;
  onMeteorDestroyed: () => void;
  onMeteorHit: () => void;
  disabled?: boolean;
}

interface Meteor {
  id: number;
  letter: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  destroyed: boolean;
  startX: number;
  startY: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  life: number;
}

const METEOR_SIZE = 42;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PARTICLE_COUNT = 8;

let meteorIdCounter = 0;
let particleIdCounter = 0;

const MeteorShower = forwardRef<MeteorShowerHandle, MeteorShowerProps>((
  { level, getPanelRect, onMeteorDestroyed, onMeteorHit, disabled = false },
  ref
) => {
  const [, forceRender] = useState(0);
  const meteorsRef = useRef<Meteor[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const runningRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const spawnMeteor = useCallback(() => {
    if (!runningRef.current || disabled) return;

    const panelRect = getPanelRect();
    if (!panelRect) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const edge = Math.floor(Math.random() * 4);

    let startX: number, startY: number;
    const margin = METEOR_SIZE;

    switch (edge) {
      case 0:
        startX = Math.random() * w;
        startY = -margin;
        break;
      case 1:
        startX = w + margin;
        startY = Math.random() * h;
        break;
      case 2:
        startX = Math.random() * w;
        startY = h + margin;
        break;
      default:
        startX = -margin;
        startY = Math.random() * h;
        break;
    }

    const targetX = panelRect.left + panelRect.width / 2 + (Math.random() - 0.5) * panelRect.width * 0.6;
    const targetY = panelRect.top + panelRect.height / 2 + (Math.random() - 0.5) * panelRect.height * 0.6;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const speed = getMeteorSpeed(level);

    const angleOffset = (Math.random() - 0.5) * 0.3;
    const baseAngle = Math.atan2(dy, dx);
    const angle = baseAngle + angleOffset;

    const meteor: Meteor = {
      id: meteorIdCounter++,
      letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: METEOR_SIZE,
      destroyed: false,
      startX,
      startY
    };

    meteorsRef.current.push(meteor);
    forceRender(n => n + 1);

    scheduleNextSpawn();
  }, [level, getPanelRect, disabled]);

  const scheduleNextSpawn = useCallback(() => {
    if (!runningRef.current) return;
    const [min, max] = getMeteorSpawnInterval(level);
    const delay = min + Math.random() * (max - min);
    spawnTimerRef.current = window.setTimeout(spawnMeteor, delay);
  }, [level, spawnMeteor]);

  const createParticles = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.5;
      const speed = 100 + Math.random() * 80;
      newParticles.push({
        id: particleIdCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 3 + Math.random() * 3,
        life: 0.3
      });
    }
    particlesRef.current.push(...newParticles);
  }, []);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!runningRef.current || disabled) return;
    const key = e.key.toUpperCase();
    if (!LETTERS.includes(key)) return;

    const meteors = meteorsRef.current;
    for (let i = 0; i < meteors.length; i++) {
      if (!meteors[i].destroyed && meteors[i].letter === key) {
        const meteor = meteors[i];
        meteor.destroyed = true;
        createParticles(meteor.x, meteor.y);
        onMeteorDestroyed();
        meteorsRef.current = meteors.filter((_, idx) => idx !== i);
        forceRender(n => n + 1);
        break;
      }
    }
  }, [disabled, createParticles, onMeteorDestroyed]);

  const checkCollision = useCallback((meteor: Meteor): boolean => {
    const panelRect = getPanelRect();
    if (!panelRect) return false;

    const mx = meteor.x;
    const my = meteor.y;
    const ms = meteor.size / 2;

    return (
      mx + ms > panelRect.left &&
      mx - ms < panelRect.right &&
      my + ms > panelRect.top &&
      my - ms < panelRect.bottom
    );
  }, [getPanelRect]);

  const animate = useCallback((timestamp: number) => {
    if (!runningRef.current) return;

    const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016;
    lastTimeRef.current = timestamp;

    const meteors = meteorsRef.current;
    const hitMeteorIds: number[] = [];

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * deltaTime;
      m.y += m.vy * deltaTime;

      if (checkCollision(m)) {
        hitMeteorIds.push(m.id);
        meteors.splice(i, 1);
        onMeteorHit();
        continue;
      }

      if (m.x < -200 || m.x > window.innerWidth + 200 ||
          m.y < -200 || m.y > window.innerHeight + 200) {
        meteors.splice(i, 1);
      }
    }

    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / 0.3);
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    forceRender(n => n + 1);
    animationRef.current = requestAnimationFrame(animate);
  }, [checkCollision, onMeteorHit]);

  useImperativeHandle(ref, () => ({
    start: () => {
      if (runningRef.current) return;
      runningRef.current = true;
      lastTimeRef.current = 0;
      window.addEventListener('keydown', handleKeyPress);
      scheduleNextSpawn();
      animationRef.current = requestAnimationFrame(animate);
    },
    stop: () => {
      runningRef.current = false;
      window.removeEventListener('keydown', handleKeyPress);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (spawnTimerRef.current !== null) {
        clearTimeout(spawnTimerRef.current);
        spawnTimerRef.current = null;
      }
    },
    reset: () => {
      meteorsRef.current = [];
      particlesRef.current = [];
      forceRender(n => n + 1);
    }
  }));

  useEffect(() => {
    return () => {
      runningRef.current = false;
      window.removeEventListener('keydown', handleKeyPress);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      if (spawnTimerRef.current !== null) {
        clearTimeout(spawnTimerRef.current);
      }
    };
  }, [handleKeyPress]);

  return (
    <>
      <style>{`
        @keyframes meteorPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(69, 162, 158, 0.6), inset 0 0 10px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 25px rgba(69, 162, 158, 0.9), inset 0 0 15px rgba(255,255,255,0.2); }
        }
        .meteor-block {
          position: fixed;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #45A29E;
          color: #FFFFFF;
          border-radius: 8px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 22px;
          font-weight: bold;
          animation: meteorPulse 1.5s ease-in-out infinite;
          pointer-events: none;
          user-select: none;
          z-index: 10;
        }
        .particle {
          position: fixed;
          background: #66FCF1;
          border-radius: 50%;
          pointer-events: none;
          z-index: 11;
          box-shadow: 0 0 6px #66FCF1;
        }
      `}</style>
      <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0 }}>
        {meteorsRef.current.map(m => (
          <div
            key={m.id}
            className="meteor-block"
            style={{
              width: `${m.size}px`,
              height: `${m.size}px`,
              left: `${m.x - m.size / 2}px`,
              top: `${m.y - m.size / 2}px`
            }}
          >
            {m.letter}
          </div>
        ))}
        {particlesRef.current.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.x - p.size / 2}px`,
              top: `${p.y - p.size / 2}px`,
              opacity: p.alpha
            }}
          />
        ))}
      </div>
    </>
  );
});

MeteorShower.displayName = 'MeteorShower';

export default MeteorShower;
