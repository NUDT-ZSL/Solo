import { useEffect, useRef, useState } from 'react';
import { ecoSimulator, WarningEvent } from './EcoSimulator';

interface Organism {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  type: 'algae' | 'daphnia' | 'snail';
}

const COLORS = {
  algae: '#4CAF50',
  daphnia: '#FF9800',
  snail: '#8D6E63',
};

const BOTTLE_PADDING = 40;
const BOTTLE_RADIUS = 20;
const MAX_ORGANISMS_PER_TYPE = 30;

function generateOrganisms(
  type: 'algae' | 'daphnia' | 'snail',
  count: number,
  bottleWidth: number,
  bottleHeight: number,
  existing: Organism[]
): Organism[] {
  const organisms: Organism[] = [];
  const displayCount = Math.min(MAX_ORGANISMS_PER_TYPE, Math.max(0, Math.round(count)));

  const existingOfType = existing.filter((o) => o.type === type);

  for (let i = 0; i < displayCount; i++) {
    if (i < existingOfType.length) {
      organisms.push(existingOfType[i]);
    } else {
      const size = 5 + (count / 200) * 20;
      const clampedSize = Math.max(5, Math.min(25, size));
      organisms.push({
        x: BOTTLE_PADDING + Math.random() * (bottleWidth - 2 * BOTTLE_PADDING - clampedSize),
        y: BOTTLE_PADDING + Math.random() * (bottleHeight - 2 * BOTTLE_PADDING - clampedSize),
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: clampedSize,
        type,
      });
    }
  }

  return organisms;
}

export default function EcoVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const organismsRef = useRef<Organism[]>([]);
  const animationRef = useRef<number>(0);
  const [warnings, setWarnings] = useState<WarningEvent[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [hasDanger, setHasDanger] = useState(false);
  const pulseRef = useRef(0);

  useEffect(() => {
    const updateState = () => {
      const w = ecoSimulator.getWarnings();
      setWarnings(w);
      setHasDanger(ecoSimulator.hasDangerWarning());
      setShowWarning(w.length > 0);
    };

    updateState();
    const unsubscribe = ecoSimulator.subscribe(updateState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    let lastTime = 0;

    const animate = (time: number) => {
      const delta = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;
      pulseRef.current += delta * 0.05;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const bottleWidth = width - 40;
      const bottleHeight = height - 60;
      const bottleX = 20;
      const bottleY = 30;

      const species = ecoSimulator.getSpecies();

      let allOrganisms: Organism[] = [];
      allOrganisms = allOrganisms.concat(
        generateOrganisms('algae', species.algae, bottleWidth, bottleHeight, organismsRef.current)
      );
      allOrganisms = allOrganisms.concat(
        generateOrganisms('daphnia', species.daphnia, bottleWidth, bottleHeight, organismsRef.current)
      );
      allOrganisms = allOrganisms.concat(
        generateOrganisms('snail', species.snail, bottleWidth, bottleHeight, organismsRef.current)
      );

      for (const org of allOrganisms) {
        org.x += org.vx * delta;
        org.y += org.vy * delta;

        const minX = bottleX + BOTTLE_PADDING - 20;
        const maxX = bottleX + bottleWidth - BOTTLE_PADDING + 20 - org.size;
        const minY = bottleY + BOTTLE_PADDING - 20;
        const maxY = bottleY + bottleHeight - BOTTLE_PADDING + 20 - org.size;

        if (org.x < minX) {
          org.x = minX;
          org.vx = Math.abs(org.vx);
        }
        if (org.x > maxX) {
          org.x = maxX;
          org.vx = -Math.abs(org.vx);
        }
        if (org.y < minY) {
          org.y = minY;
          org.vy = Math.abs(org.vy);
        }
        if (org.y > maxY) {
          org.y = maxY;
          org.vy = -Math.abs(org.vy);
        }

        if (Math.random() < 0.01) {
          org.vx += (Math.random() - 0.5) * 0.2;
          org.vy += (Math.random() - 0.5) * 0.2;
          const speed = Math.sqrt(org.vx * org.vx + org.vy * org.vy);
          const maxSpeed = 1.2;
          if (speed > maxSpeed) {
            org.vx = (org.vx / speed) * maxSpeed;
            org.vy = (org.vy / speed) * maxSpeed;
          }
        }
      }

      organismsRef.current = allOrganisms;

      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
      bgGradient.addColorStop(0, '#1B3B2D');
      bgGradient.addColorStop(1, '#0D1B2A');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      const bottleGradient = ctx.createLinearGradient(bottleX, bottleY, bottleX, bottleY + bottleHeight);
      bottleGradient.addColorStop(0, 'rgba(100, 200, 255, 0.1)');
      bottleGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.15)');
      bottleGradient.addColorStop(1, 'rgba(80, 160, 220, 0.2)');

      ctx.fillStyle = bottleGradient;
      ctx.beginPath();
      ctx.roundRect(bottleX, bottleY, bottleWidth, bottleHeight, BOTTLE_RADIUS);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bottleX, bottleY, bottleWidth, bottleHeight, BOTTLE_RADIUS);
      ctx.stroke();

      const waterGradient = ctx.createLinearGradient(bottleX, bottleY + bottleHeight * 0.15, bottleX, bottleY + bottleHeight);
      waterGradient.addColorStop(0, 'rgba(100, 180, 220, 0.25)');
      waterGradient.addColorStop(1, 'rgba(60, 120, 180, 0.35)');
      ctx.fillStyle = waterGradient;
      ctx.beginPath();
      ctx.roundRect(
        bottleX + 4,
        bottleY + bottleHeight * 0.15,
        bottleWidth - 8,
        bottleHeight * 0.85 - 4,
        [0, 0, BOTTLE_RADIUS - 4, BOTTLE_RADIUS - 4]
      );
      ctx.fill();

      for (const org of allOrganisms) {
        const color = COLORS[org.type];

        const glowGradient = ctx.createRadialGradient(
          org.x + org.size / 2,
          org.y + org.size / 2,
          0,
          org.x + org.size / 2,
          org.y + org.size / 2,
          org.size
        );
        glowGradient.addColorStop(0, color + '60');
        glowGradient.addColorStop(1, color + '00');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(org.x + org.size / 2, org.y + org.size / 2, org.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(org.x + org.size / 2, org.y + org.size / 2, org.size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(org.x + org.size / 3, org.y + org.size / 3, org.size / 6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (hasDanger) {
        const pulse = (Math.sin(pulseRef.current) + 1) / 2;
        const alpha = 0.15 + pulse * 0.2;
        ctx.fillStyle = `rgba(255, 82, 82, ${alpha})`;
        ctx.fillRect(0, 0, width, height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [hasDanger]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {hasDanger && (
        <div className="skull-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <ellipse cx="40" cy="35" rx="28" ry="26" fill="white" opacity="0.95" />
            <rect x="25" y="48" width="30" height="22" rx="2" fill="white" opacity="0.95" />
            <ellipse cx="30" cy="32" rx="6" ry="7" fill="#1B3B2D" />
            <ellipse cx="50" cy="32" rx="6" ry="7" fill="#1B3B2D" />
            <ellipse cx="40" cy="44" rx="2.5" ry="4" fill="#1B3B2D" />
            <rect x="29" y="60" width="3" height="8" rx="1" fill="#1B3B2D" />
            <rect x="35" y="60" width="3" height="8" rx="1" fill="#1B3B2D" />
            <rect x="41" y="60" width="3" height="8" rx="1" fill="#1B3B2D" />
            <rect x="47" y="60" width="3" height="8" rx="1" fill="#1B3B2D" />
          </svg>
        </div>
      )}

      {showWarning && warnings.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1E1E2E',
            borderRadius: '8px',
            padding: '16px 24px',
            color: 'white',
            fontSize: '14px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.3s ease-out',
            maxWidth: '80%',
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              color: '#FF5252',
              marginBottom: '8px',
              fontSize: '16px',
            }}
          >
            ⚠️ 生态预警
          </div>
          {warnings.map((w) => (
            <div key={w.id} style={{ marginBottom: '6px' }}>
              <div style={{ color: '#FFD54F', marginBottom: '2px' }}>{w.message}</div>
              <div style={{ color: '#B0BEC5', fontSize: '12px' }}>建议：{w.suggestion}</div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes skullPulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.85;
            filter: drop-shadow(0 0 10px rgba(255, 82, 82, 0.5));
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 1;
            filter: drop-shadow(0 0 25px rgba(255, 82, 82, 0.9));
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.85;
            filter: drop-shadow(0 0 10px rgba(255, 82, 82, 0.5));
          }
        }

        .skull-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: skullPulse 1.2s ease-in-out infinite;
          z-index: 5;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
