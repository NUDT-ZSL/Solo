import { useEffect, useRef } from 'react';
import { MusicStyle } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  rotation?: number;
  rotationSpeed?: number;
}

interface ParticleAnimationProps {
  style: MusicStyle;
  active: boolean;
}

const TARGET_FPS = 60;
const LOW_FPS_THRESHOLD = 30;
const FPS_SAMPLE_SIZE = 30;
const MIN_PARTICLES = 50;
const MAX_PARTICLES = 300;
const DEFAULT_TARGET_PARTICLES = 150;

const ParticleAnimation = ({ style, active }: ParticleAnimationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const targetCountRef = useRef(DEFAULT_TARGET_PARTICLES);
  const fpsHistoryRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const getParticleColor = (): string => {
      switch (style) {
        case 'calm':
          const blueShades = ['#B3E5FC', '#81D4FA', '#4FC3F7', '#E1F5FE'];
          return blueShades[Math.floor(Math.random() * blueShades.length)];
        case 'joyful':
          const colorful = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8C94', '#A8E6CF'];
          return colorful[Math.floor(Math.random() * colorful.length)];
        case 'nostalgic':
          const brown = ['#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63'];
          return brown[Math.floor(Math.random() * brown.length)];
        case 'energetic':
          const red = ['#FF8A80', '#FF5252', '#FF1744', '#FFD180'];
          return red[Math.floor(Math.random() * red.length)];
        case 'mysterious':
          const purple = ['#CE93D8', '#BA68C8', '#AB47BC', '#E1BEE7', '#FFFFFF'];
          return purple[Math.floor(Math.random() * purple.length)];
        default:
          return '#FFFFFF';
      }
    };

    const createParticle = (): Particle => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const baseParticle: Particle = {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        size: Math.random() * 4 + 2,
        opacity: Math.random() * 0.5 + 0.5,
        color: getParticleColor(),
        life: 0,
        maxLife: Math.random() * 120 + 60,
      };

      switch (style) {
        case 'calm':
          return { ...baseParticle, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 1 + 0.5, size: Math.random() * 3 + 2 };
        case 'joyful':
          return { ...baseParticle, vx: (Math.random() - 0.5) * 1.5, vy: -Math.random() * 1 - 0.5, size: Math.random() * 8 + 4 };
        case 'nostalgic':
          return { ...baseParticle, vx: Math.random() * 1 - 0.3, vy: Math.random() * 0.8 + 0.2, size: Math.random() * 6 + 3, rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.05 };
        case 'energetic':
          return { ...baseParticle, x: width / 2 + (Math.random() - 0.5) * 100, y: height / 2 + (Math.random() - 0.5) * 100, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, size: Math.random() * 3 + 1 };
        case 'mysterious':
          return { ...baseParticle, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, size: Math.random() * 2 + 1 };
        default:
          return baseParticle;
      }
    };

    const drawParticle = (p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.opacity * (1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;

      switch (style) {
        case 'calm':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'joyful':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.globalAlpha = p.opacity * (1 - p.life / p.maxLife) * 0.6;
          ctx.fill();
          ctx.globalAlpha = p.opacity * (1 - p.life / p.maxLife);
          ctx.beginPath();
          ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fill();
          break;
        case 'nostalgic':
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation || 0);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'energetic':
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x + p.size * 0.5, p.y);
          ctx.lineTo(p.x, p.y + p.size);
          ctx.lineTo(p.x - p.size * 0.5, p.y);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          break;
        case 'mysterious':
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const outerX = p.x + Math.cos(angle) * p.size;
            const outerY = p.y + Math.sin(angle) * p.size;
            const innerAngle = angle + Math.PI / 5;
            const innerX = p.x + Math.cos(innerAngle) * p.size * 0.4;
            const innerY = p.y + Math.sin(innerAngle) * p.size * 0.4;
            if (i === 0) { ctx.moveTo(outerX, outerY); } else { ctx.lineTo(outerX, outerY); }
            ctx.lineTo(innerX, innerY);
          }
          ctx.closePath();
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fill();
          break;
      }
      ctx.restore();
    };

    const adjustParticleCount = (currentFps: number) => {
      fpsHistoryRef.current.push(currentFps);
      if (fpsHistoryRef.current.length > FPS_SAMPLE_SIZE) {
        fpsHistoryRef.current.shift();
      }

      if (fpsHistoryRef.current.length < FPS_SAMPLE_SIZE) return;

      const avgFps = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;

      if (avgFps < LOW_FPS_THRESHOLD) {
        targetCountRef.current = Math.max(MIN_PARTICLES, Math.floor(targetCountRef.current * 0.8));
      } else if (avgFps > TARGET_FPS * 0.85 && targetCountRef.current < DEFAULT_TARGET_PARTICLES) {
        targetCountRef.current = Math.min(DEFAULT_TARGET_PARTICLES, Math.floor(targetCountRef.current * 1.1));
      }
    };

    const animate = (timestamp: number) => {
      if (lastFrameTimeRef.current > 0) {
        const delta = timestamp - lastFrameTimeRef.current;
        if (delta > 0) {
          const currentFps = 1000 / delta;
          adjustParticleCount(currentFps);
        }
      }
      lastFrameTimeRef.current = timestamp;

      if (!active) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      const target = targetCountRef.current;
      while (particlesRef.current.length < target) {
        particlesRef.current.push(createParticle());
      }
      while (particlesRef.current.length > MAX_PARTICLES) {
        particlesRef.current.shift();
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
          p.rotation += p.rotationSpeed;
        }
        if (style === 'joyful') p.vy -= 0.005;
        if (style === 'energetic') { p.vx *= 0.99; p.vy *= 0.99; }

        if (p.life >= p.maxLife || p.x < -50 || p.x > canvas.offsetWidth + 50 || p.y < -50 || p.y > canvas.offsetHeight + 50) {
          return false;
        }

        drawParticle(p);
        return true;
      });

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

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};

export default ParticleAnimation;
