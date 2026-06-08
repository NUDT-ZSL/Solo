import { useRef, useEffect, useCallback } from 'react';
import type { WallpaperConfig, PatternType } from '../App';

interface WallpaperCanvasProps {
  config: WallpaperConfig;
  transitioning: boolean;
  prevPattern: PatternType;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  colorIndex: number;
  angle: number;
  angularVel: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function createParticles(count: number, w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1,
      life: Math.random() * 200 + 100,
      maxLife: 300,
      colorIndex: Math.floor(Math.random() * 4),
      angle: Math.random() * Math.PI * 2,
      angularVel: (Math.random() - 0.5) * 0.02,
    });
  }
  return particles;
}

function renderKaleidoscope(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  particles: Particle[],
  colors: string[],
  time: number,
  speed: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const segments = 12;
  const angleStep = (Math.PI * 2) / segments;
  const speedFactor = speed / 50;
  const globalAngle = time * 0.0003 * speedFactor;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const rgb = hexToRgb(colors[p.colorIndex % colors.length]);
    const alpha = 0.6 * (1 - p.life / p.maxLife);

    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const baseAngle = Math.atan2(dy, dx);

    for (let s = 0; s < segments; s++) {
      const segAngle = s * angleStep + globalAngle;
      const mirrorFactor = s % 2 === 0 ? 1 : -1;
      const drawAngle = segAngle + baseAngle * mirrorFactor;

      const px = cx + Math.cos(drawAngle) * dist;
      const py = cy + Math.sin(drawAngle) * dist;

      const size = p.size * (1 + 0.3 * Math.sin(time * 0.002 * speedFactor + i));

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.fill();

      if (dist > 20) {
        const innerSize = size * 0.6;
        const ix = cx + Math.cos(drawAngle) * dist * 0.6;
        const iy = cy + Math.sin(drawAngle) * dist * 0.6;
        ctx.beginPath();
        ctx.arc(ix, iy, innerSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.5})`;
        ctx.fill();
      }
    }
  }

  const glowRgb = hexToRgb(colors[0]);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.1);
  gradient.addColorStop(0, `rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.3)`);
  gradient.addColorStop(1, `rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function renderRipple(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  particles: Particle[],
  colors: string[],
  time: number,
  speed: number,
) {
  const speedFactor = speed / 50;
  const rippleCenters = particles.slice(0, Math.min(particles.length, 8));

  for (const center of rippleCenters) {
    const cx = center.x;
    const cy = center.y;
    const rgb = hexToRgb(colors[center.colorIndex % colors.length]);
    const maxRings = 6;

    for (let ring = 1; ring <= maxRings; ring++) {
      const baseRadius = ring * 60 + Math.sin(time * 0.001 * speedFactor + ring) * 20;
      const radius = baseRadius + time * 0.03 * speedFactor;
      const alpha = Math.max(0, 0.4 - ring * 0.06) * (1 - (radius % 400) / 400);

      if (alpha <= 0) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, radius % 400, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.lineWidth = 2 + Math.sin(time * 0.003 * speedFactor + ring) * 1;
      ctx.stroke();
    }
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const rgb = hexToRgb(colors[p.colorIndex % colors.length]);
    const alpha = 0.5 * (1 - p.life / p.maxLife);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.3})`;
    ctx.fill();
  }
}

function renderSmoke(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  particles: Particle[],
  colors: string[],
  time: number,
  speed: number,
) {
  const speedFactor = speed / 50;

  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const rgb = hexToRgb(colors[p.colorIndex % colors.length]);
    const lifeRatio = p.life / p.maxLife;
    const alpha = 0.15 * Math.sin(lifeRatio * Math.PI);

    const size = p.size * 8 * (1 + 0.5 * Math.sin(time * 0.001 * speedFactor + i * 0.5));
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);

    gradient.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
    gradient.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);

    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
}

const RENDERERS: Record<PatternType, typeof renderKaleidoscope> = {
  kaleidoscope: renderKaleidoscope,
  ripple: renderRipple,
  smoke: renderSmoke,
};

function updateParticles(
  particles: Particle[],
  w: number,
  h: number,
  pattern: PatternType,
  speed: number,
  density: number,
  dt: number,
) {
  const speedFactor = speed / 50;

  for (const p of particles) {
    p.life -= dt * 0.01 * speedFactor;
    p.angle += p.angularVel * speedFactor;

    if (pattern === 'kaleidoscope') {
      p.x += Math.cos(p.angle) * p.vx * speedFactor * 0.8;
      p.y += Math.sin(p.angle) * p.vy * speedFactor * 0.8;
      const dx = p.x - w / 2;
      const dy = p.y - h / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.min(w, h) * 0.45;
      if (dist > maxDist) {
        p.angle += Math.PI * 0.5;
        p.vx *= -0.8;
        p.vy *= -0.8;
      }
    } else if (pattern === 'ripple') {
      p.x += p.vx * speedFactor * 0.3;
      p.y += p.vy * speedFactor * 0.3;
    } else {
      const noiseX = Math.sin(p.angle * 3 + p.y * 0.005) * 0.5;
      const noiseY = Math.cos(p.angle * 2 + p.x * 0.005) * 0.5;
      p.x += (p.vx + noiseX) * speedFactor * 0.4;
      p.y += (p.vy + noiseY) * speedFactor * 0.4 - 0.2 * speedFactor;
    }

    if (p.life <= 0 || p.x < -50 || p.x > w + 50 || p.y < -50 || p.y > h + 50) {
      p.x = Math.random() * w;
      p.y = pattern === 'smoke' ? h + Math.random() * 50 : Math.random() * h;
      p.vx = (Math.random() - 0.5) * 2;
      p.vy = (Math.random() - 0.5) * 2;
      p.size = Math.random() * 3 + 1;
      p.life = Math.random() * 200 + 100;
      p.colorIndex = Math.floor(Math.random() * 4);
      p.angle = Math.random() * Math.PI * 2;
      p.angularVel = (Math.random() - 0.5) * 0.02;
    }
  }

  const targetCount = Math.floor(50 + (density / 100) * 250);
  while (particles.length < targetCount) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1,
      life: Math.random() * 200 + 100,
      maxLife: 300,
      colorIndex: Math.floor(Math.random() * 4),
      angle: Math.random() * Math.PI * 2,
      angularVel: (Math.random() - 0.5) * 0.02,
    });
  }
  while (particles.length > targetCount) {
    particles.pop();
  }
}

export default function WallpaperCanvas({ config, transitioning, prevPattern }: WallpaperCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const animRef = useRef(0);
  const transitionAlphaRef = useRef(0);
  const configRef = useRef(config);
  const transitioningRef = useRef(transitioning);
  const prevPatternRef = useRef(prevPattern);

  configRef.current = config;
  transitioningRef.current = transitioning;
  prevPatternRef.current = prevPattern;

  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = lastFrameRef.current ? timestamp - lastFrameRef.current : 16;
    lastFrameRef.current = timestamp;
    timeRef.current += dt;

    const w = canvas.width;
    const h = canvas.height;
    const currentConfig = configRef.current;

    updateParticles(
      particlesRef.current,
      w,
      h,
      currentConfig.pattern,
      currentConfig.speed,
      currentConfig.density,
      dt,
    );

    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, w, h);

    if (transitioningRef.current) {
      transitionAlphaRef.current = Math.min(1, transitionAlphaRef.current + 0.05);

      ctx.save();
      ctx.globalAlpha = 1 - transitionAlphaRef.current;
      const prevRenderer = RENDERERS[prevPatternRef.current];
      prevRenderer(
        ctx, w, h, particlesRef.current, currentConfig.colorScheme.colors,
        timeRef.current, currentConfig.speed,
      );
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = transitionAlphaRef.current;
      const currentRenderer = RENDERERS[currentConfig.pattern];
      currentRenderer(
        ctx, w, h, particlesRef.current, currentConfig.colorScheme.colors,
        timeRef.current, currentConfig.speed,
      );
      ctx.restore();
    } else {
      transitionAlphaRef.current = 0;
      const renderer = RENDERERS[currentConfig.pattern];
      renderer(
        ctx, w, h, particlesRef.current, currentConfig.colorScheme.colors,
        timeRef.current, currentConfig.speed,
      );
    }

    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    particlesRef.current = createParticles(
      Math.floor(50 + (configRef.current.density / 100) * 250),
      window.innerWidth,
      window.innerHeight,
    );

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.fillStyle = '#000000';
    if (ctx) ctx.fillRect(0, 0, canvas.width, canvas.height);

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  );
}
