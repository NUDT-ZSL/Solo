import { useRef, useEffect, useCallback } from 'react';
import { SCENT_CONFIG, type ScentType } from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  angle: number;
  rotationSpeed: number;
}

interface OlfactoryCloudProps {
  scentType: ScentType;
  active: boolean;
  width?: number;
  height?: number;
}

function createParticle(cx: number, cy: number, shape: string): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.3 + Math.random() * 1.5;
  const maxLife = 120 + Math.random() * 180;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;
  if (shape === 'scatter') {
    vx *= 2.2;
    vy *= 2.2;
  } else if (shape === 'triangle') {
    vx *= 0.8;
    vy *= 0.8;
  }
  return {
    x: cx + (Math.random() - 0.5) * 20,
    y: cy + (Math.random() - 0.5) * 20,
    vx,
    vy,
    size: 2 + Math.random() * 4,
    alpha: 0.6 + Math.random() * 0.4,
    life: 0,
    maxLife,
    angle: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.04,
  };
}

export default function OlfactoryCloud({ scentType, active, width = 400, height = 400 }: OlfactoryCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const config = SCENT_CONFIG[scentType];

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, p: Particle, color: string, shape: string) => {
    const lifeRatio = p.life / p.maxLife;
    const fadeAlpha = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1;
    const alpha = p.alpha * fadeAlpha;
    ctx.globalAlpha = alpha;

    const s = p.size * (1 + lifeRatio * 0.5);

    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        break;
      case 'triangle':
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(-s * 0.866, s * 0.5);
        ctx.lineTo(s * 0.866, s * 0.5);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
        break;
      case 'star':
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? s : s * 0.4;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          const a2 = a + Math.PI / 5;
          const r2 = i % 2 === 0 ? s * 0.4 : s;
          ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
        break;
      case 'diamond':
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.2);
        ctx.lineTo(s * 0.6, 0);
        ctx.lineTo(0, s * 1.2);
        ctx.lineTo(-s * 0.6, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
        break;
      case 'scatter':
        ctx.beginPath();
        ctx.arc(p.x, p.y, s * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(p.x + (Math.random() - 0.5) * s, p.y + (Math.random() - 0.5) * s, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.globalAlpha = 1;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;
    const shape = config.particleShape;
    const color = config.color;
    const maxParticles = 500;

    particlesRef.current = [];

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      if (active && particlesRef.current.length < maxParticles) {
        const batchSize = Math.min(8, maxParticles - particlesRef.current.length);
        for (let i = 0; i < batchSize; i++) {
          particlesRef.current.push(createParticle(cx, cy, shape));
        }
      }

      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life++;
        if (p.life > p.maxLife) continue;

        p.angle += p.rotationSpeed;

        if (shape === 'scatter') {
          p.vx += (Math.random() - 0.5) * 0.1;
          p.vy += (Math.random() - 0.5) * 0.1;
        } else {
          const dx = cx - p.x;
          const dy = cy - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const targetDist = 60 + Math.sin(p.life * 0.02) * 30;
          if (dist > 0) {
            const force = (dist - targetDist) * 0.0005;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
          p.vx *= 0.995;
          p.vy *= 0.995;
        }

        p.x += p.vx;
        p.y += p.vy;
        drawParticle(ctx, p, color, shape);
        alive.push(p);
      }
      particlesRef.current = alive;

      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      ctx.arc(cx, cy, 50, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      particlesRef.current = [];
    };
  }, [scentType, active, width, height, config, drawParticle]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        display: 'block',
        borderRadius: 16,
      }}
    />
  );
}
