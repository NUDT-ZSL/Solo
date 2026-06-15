import React, { useEffect, useRef, useCallback } from 'react';

interface CelebrationProps {
  active: boolean;
  duration?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  isCircle: boolean;
  alpha: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  phase: 'enter' | 'fall';
  enterProgress: number;
}

const Celebration: React.FC<CelebrationProps> = ({ active, duration = 2000 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const createParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const count = 100;
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      let startX: number, startY: number;

      switch (side) {
        case 0:
          startX = Math.random() * width;
          startY = -30;
          break;
        case 1:
          startX = width + 30;
          startY = Math.random() * height;
          break;
        case 2:
          startX = Math.random() * width;
          startY = height + 30;
          break;
        default:
          startX = -30;
          startY = Math.random() * height;
          break;
      }

      const targetX = centerX + (Math.random() - 0.5) * width * 0.85;
      const targetY = centerY + (Math.random() - 0.5) * height * 0.85;

      const isCircle = Math.random() > 0.5;
      const size = Math.random() * 6 + 6;
      const colorRatio = Math.random();
      const r = Math.round(255);
      const g = Math.round(215 + (140 - 215) * colorRatio);
      const b = Math.round(0 + (0 - 0) * colorRatio);
      const color = `rgb(${r}, ${g}, ${b})`;

      particles.push({
        x: startX,
        y: startY,
        startX,
        startY,
        targetX,
        targetY,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2.5 + 1,
        size,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        color,
        isCircle,
        alpha: 1,
        phase: 'enter',
        enterProgress: 0,
      });
    }

    return particles;
  }, []);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    window.addEventListener('resize', resize);

    particlesRef.current = createParticles(canvas.width, canvas.height);
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        if (p.phase === 'enter') {
          p.enterProgress += 0.04;
          if (p.enterProgress >= 1) {
            p.enterProgress = 1;
            p.phase = 'fall';
          }
          const t = p.enterProgress;
          const ease = 1 - Math.pow(1 - t, 3);
          p.x = p.startX + (p.targetX - p.startX) * ease;
          p.y = p.startY + (p.targetY - p.startY) * ease;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
        }

        p.rotation += p.rotationSpeed;

        const fadeStart = 0.7;
        if (progress > fadeStart) {
          p.alpha = 1 - (progress - fadeStart) / (1 - fadeStart);
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0.3)');

        ctx.fillStyle = gradient;

        if (p.isCircle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }

        ctx.restore();
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, duration, createParticles]);

  if (!active) return null;

  return (
    <div className="celebration-overlay" ref={containerRef}>
      <canvas ref={canvasRef} className="celebration-canvas" />
    </div>
  );
};

export default Celebration;
