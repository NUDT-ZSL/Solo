import { useEffect, useRef } from 'react';
import type { MusicStyle } from '../types';
import { MUSIC_STYLE_PARTICLE_COLORS } from '../types';

interface Props {
  style: MusicStyle;
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

export default function ParticleAnimation({ style, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = MUSIC_STYLE_PARTICLE_COLORS[style];
    const MAX_PARTICLES = 300;

    const createParticle = (w: number, h: number, burst: boolean): Particle => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      if (style === 'calm') {
        return {
          x: burst ? w / 2 + (Math.random() - 0.5) * 100 : Math.random() * w,
          y: burst ? h / 2 + (Math.random() - 0.5) * 50 : -10,
          vx: (Math.random() - 0.5) * 0.3,
          vy: burst ? -Math.random() * 2 - 1 : Math.random() * 1 + 0.5,
          size: Math.random() * 4 + 2,
          color,
          alpha: 1,
          life: 0,
          maxLife: 200 + Math.random() * 100,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05
        };
      } else if (style === 'joyful') {
        return {
          x: burst ? w / 2 + (Math.random() - 0.5) * 100 : Math.random() * w,
          y: burst ? h / 2 + (Math.random() - 0.5) * 50 : h + 10,
          vx: (Math.random() - 0.5) * 2,
          vy: burst ? -Math.random() * 3 - 1 : -(Math.random() * 1.5 + 0.5),
          size: Math.random() * 8 + 4,
          color,
          alpha: 0.8,
          life: 0,
          maxLife: 250 + Math.random() * 100,
          rotation: 0,
          rotationSpeed: 0
        };
      } else if (style === 'nostalgic') {
        return {
          x: burst ? w / 2 + (Math.random() - 0.5) * 100 : Math.random() * w,
          y: burst ? h / 2 + (Math.random() - 0.5) * 50 : Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: burst ? -Math.random() * 2 - 0.5 : -(Math.random() * 0.3 + 0.1),
          size: Math.random() * 3 + 1,
          color,
          alpha: 0.9,
          life: 0,
          maxLife: 300 + Math.random() * 150,
          rotation: 0,
          rotationSpeed: 0
        };
      } else if (style === 'passionate') {
        const angle = Math.random() * Math.PI * 2;
        const speed = burst ? Math.random() * 4 + 2 : Math.random() * 2 + 1;
        return {
          x: w / 2,
          y: h / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (burst ? 0 : 0.5),
          size: Math.random() * 5 + 2,
          color,
          alpha: 1,
          life: 0,
          maxLife: 120 + Math.random() * 80,
          rotation: 0,
          rotationSpeed: 0
        };
      } else {
        return {
          x: burst ? w / 2 + (Math.random() - 0.5) * 100 : Math.random() * w,
          y: burst ? h / 2 + (Math.random() - 0.5) * 50 : Math.random() * h,
          vx: (Math.random() - 0.5) * 1,
          vy: (Math.random() - 0.5) * 1,
          size: Math.random() * 4 + 2,
          color,
          alpha: 0.85,
          life: 0,
          maxLife: 200 + Math.random() * 150,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08
        };
      }
    };

    const drawParticle = (p: Particle) => {
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (style === 'calm') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -p.size);
          ctx.rotate(Math.PI / 3);
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (style === 'joyful') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.fill();
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
      } else if (style === 'nostalgic') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
      } else if (style === 'passionate') {
        ctx.beginPath();
        const flicker = 1 - Math.random() * 0.3;
        ctx.moveTo(p.x, p.y - p.size * flicker);
        ctx.quadraticCurveTo(p.x + p.size, p.y, p.x, p.y + p.size * flicker);
        ctx.quadraticCurveTo(p.x - p.size, p.y, p.x, p.y - p.size * flicker);
        ctx.fill();
      } else {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        const points = 5;
        for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? p.size : p.size * 0.4;
          const a = (i * Math.PI) / points;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    let burstPhase = active ? 60 : 0;

    const animate = (ts: number) => {
      if (!canvas || !ctx) return;

      const delta = Math.min(ts - lastFrameRef.current, 32);
      lastFrameRef.current = ts;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      if (active) {
        if (burstPhase > 0) {
          for (let i = 0; i < 10; i++) {
            if (particlesRef.current.length < MAX_PARTICLES) {
              particlesRef.current.push(createParticle(w, h, true));
            }
          }
          burstPhase--;
        }

        if (Math.random() < 0.4 && particlesRef.current.length < MAX_PARTICLES) {
          particlesRef.current.push(createParticle(w, h, false));
        }

        particlesRef.current = particlesRef.current.filter(p => {
          p.life++;
          p.x += p.vx * (delta / 16);
          p.y += p.vy * (delta / 16);
          p.rotation += p.rotationSpeed * (delta / 16);

          if (style === 'joyful') {
            p.vy -= 0.01 * (delta / 16);
          } else if (style === 'passionate') {
            p.vy += 0.05 * (delta / 16);
          } else if (style === 'nostalgic') {
            p.vx += Math.sin(p.life * 0.02) * 0.01;
          } else if (style === 'mysterious') {
            const cx = w / 2;
            const cy = h / 2;
            const dx = cx - p.x;
            const dy = cy - p.y;
            p.vx += dx * 0.0001;
            p.vy += dy * 0.0001;
          }

          const lifeRatio = p.life / p.maxLife;
          if (lifeRatio > 0.7) {
            p.alpha = Math.max(0, 1 - (lifeRatio - 0.7) / 0.3);
          }

          return (
            p.life < p.maxLife &&
            p.alpha > 0 &&
            p.x > -50 && p.x < w + 50 &&
            p.y > -50 && p.y < h + 50
          );
        });

        particlesRef.current.forEach(drawParticle);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [style, active]);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}
