import { useEffect, useRef } from 'react';
import type { Emotion } from '../utils/api';

interface Shape {
  x: number;
  y: number;
  size: number;
  type: 'circle' | 'polygon' | 'curve';
  color: string;
  alpha: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  sides?: number;
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
  decay: number;
  type?: 'sparkle' | 'glow' | 'trail';
}

interface ParticleBehavior {
  speedRange: [number, number];
  hueRange: [number, number];
  sizeRange: [number, number];
  decayRange: [number, number];
  particleType: 'sparkle' | 'glow' | 'trail';
  spawnMode: 'center' | 'random' | 'top';
  colorBase: string;
}

const emotionParticleBehaviors: Record<Emotion, ParticleBehavior> = {
  happy: {
    speedRange: [2, 4],
    hueRange: [-30, 30],
    sizeRange: [2, 6],
    decayRange: [0.01, 0.02],
    particleType: 'glow',
    spawnMode: 'center',
    colorBase: '#FFD700',
  },
  sad: {
    speedRange: [0.5, 1.5],
    hueRange: [-20, 20],
    sizeRange: [3, 8],
    decayRange: [0.005, 0.01],
    particleType: 'trail',
    spawnMode: 'top',
    colorBase: '#4A90D9',
  },
  angry: {
    speedRange: [4, 8],
    hueRange: [-15, 15],
    sizeRange: [2, 10],
    decayRange: [0.02, 0.04],
    particleType: 'sparkle',
    spawnMode: 'random',
    colorBase: '#E74C3C',
  },
  calm: {
    speedRange: [0.3, 0.8],
    hueRange: [-10, 10],
    sizeRange: [4, 8],
    decayRange: [0.003, 0.008],
    particleType: 'glow',
    spawnMode: 'random',
    colorBase: '#2ECC71',
  },
  anxious: {
    speedRange: [3, 6],
    hueRange: [-25, 25],
    sizeRange: [2, 5],
    decayRange: [0.015, 0.03],
    particleType: 'sparkle',
    spawnMode: 'random',
    colorBase: '#9B59B6',
  },
};

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360 / 360;
  s /= 100;
  l /= 100;

  if (s === 0) {
    const val = Math.round(l * 255).toString(16).padStart(2, '0');
    return `#${val}${val}${val}`;
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function applyHueOffset(color: string, hueOffset: number): string {
  const { h, s, l } = hexToHsl(color);
  return hslToHex(h + hueOffset, s, l);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function useCanvasAnimation(
  speed: number,
  hueOffset: number,
  complexity: number,
  emotionColor: string,
  emotion: Emotion
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef<Shape[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const createShape = (complexityVal: number, baseColor: string): Shape => {
      const types: Array<'circle' | 'polygon' | 'curve'> = ['circle', 'polygon', 'curve'];
      const type = types[Math.floor(Math.random() * types.length)];
      const t = (complexityVal - 1) / 9;
      const maxSize = lerp(40, 120, t);
      const size = 10 + Math.random() * (maxSize - 10);
      const rect = canvas.getBoundingClientRect();

      const baseHsl = hexToHsl(baseColor);
      const colorVariation = (Math.random() - 0.5) * 30;
      const color = hslToHex(baseHsl.h + colorVariation, baseHsl.s, baseHsl.l);

      const angle = Math.random() * Math.PI * 2;
      const velocity = 0.5 + Math.random() * 1.5;

      return {
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size,
        type,
        color,
        alpha: 0.3 + Math.random() * 0.5,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        sides: type === 'polygon' ? 3 + Math.floor(Math.random() * 5) : undefined,
      };
    };

    const createParticle = (
      complexityVal: number,
      baseColor: string,
      emotionVal: Emotion,
      canvasRect: DOMRect
    ): Particle => {
      const behavior = emotionParticleBehaviors[emotionVal];
      const t = (complexityVal - 1) / 9;

      const size = lerp(
        behavior.sizeRange[0],
        behavior.sizeRange[1],
        t
      ) * (0.5 + Math.random() * 1);

      const baseHsl = hexToHsl(baseColor);
      const hueVariation = lerp(
        behavior.hueRange[0],
        behavior.hueRange[1],
        Math.random()
      );
      const color = hslToHex(
        baseHsl.h + hueVariation,
        baseHsl.s,
        baseHsl.l
      );

      const speed = lerp(
        behavior.speedRange[0],
        behavior.speedRange[1],
        t
      ) * (0.8 + Math.random() * 0.4);

      const decay = lerp(
        behavior.decayRange[0],
        behavior.decayRange[1],
        Math.random()
      );

      let x: number, y: number, vx: number, vy: number;

      switch (behavior.spawnMode) {
        case 'center':
          x = canvasRect.width / 2;
          y = canvasRect.height / 2;
          const angle = Math.random() * Math.PI * 2;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          break;
        case 'top':
          x = Math.random() * canvasRect.width;
          y = 0;
          vx = (Math.random() - 0.5) * speed * 0.5;
          vy = speed;
          break;
        case 'random':
        default:
          x = Math.random() * canvasRect.width;
          y = Math.random() * canvasRect.height;
          const randomAngle = Math.random() * Math.PI * 2;
          vx = Math.cos(randomAngle) * speed;
          vy = Math.sin(randomAngle) * speed;
          break;
      }

      return {
        x,
        y,
        vx,
        vy,
        size,
        color,
        alpha: 1,
        life: 1,
        decay,
        type: behavior.particleType,
      };
    };

    const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape, offset: number) => {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.rotation);
      ctx.globalAlpha = shape.alpha;
      ctx.fillStyle = applyHueOffset(shape.color, offset);

      switch (shape.type) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, shape.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'polygon': {
          const sides = shape.sides || 3;
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * shape.size / 2;
            const y = Math.sin(angle) * shape.size / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'curve': {
          ctx.beginPath();
          ctx.moveTo(-shape.size / 2, 0);
          ctx.bezierCurveTo(
            -shape.size / 2, -shape.size / 2,
            shape.size / 2, -shape.size / 2,
            shape.size / 2, 0
          );
          ctx.bezierCurveTo(
            shape.size / 2, shape.size / 2,
            -shape.size / 2, shape.size / 2,
            -shape.size / 2, 0
          );
          ctx.fill();
          break;
        }
      }

      ctx.restore();
    };

    const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle, offset: number) => {
      const color = applyHueOffset(particle.color, offset);
      const hsl = hexToHsl(color);

      ctx.save();
      ctx.globalAlpha = particle.alpha;

      switch (particle.type) {
        case 'glow': {
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
          );
          gradient.addColorStop(0, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`);
          gradient.addColorStop(0.4, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.6)`);
          gradient.addColorStop(1, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'sparkle': {
          const sparkleAlpha = Math.sin(particle.life * Math.PI * 4) * 0.5 + 0.5;
          ctx.globalAlpha = particle.alpha * sparkleAlpha;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particle.x - particle.size, particle.y);
          ctx.lineTo(particle.x + particle.size, particle.y);
          ctx.moveTo(particle.x, particle.y - particle.size);
          ctx.lineTo(particle.x, particle.y + particle.size);
          ctx.stroke();
          break;
        }
        case 'trail': {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = particle.alpha * 0.3;
          ctx.beginPath();
          ctx.arc(particle.x - particle.vx * 3, particle.y - particle.vy * 3, particle.size * 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = particle.alpha * 0.15;
          ctx.beginPath();
          ctx.arc(particle.x - particle.vx * 6, particle.y - particle.vy * 6, particle.size * 0.2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        default: {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }

      ctx.restore();
    };

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const t = (complexity - 1) / 9;
      const shapesPerFrame = Math.round(lerp(1, 8, t));
      const particlesPerFrame = Math.round(lerp(5, 30, t));

      for (let i = 0; i < shapesPerFrame; i++) {
        shapesRef.current.push(createShape(complexity, emotionColor));
      }

      for (let i = 0; i < particlesPerFrame; i++) {
        particlesRef.current.push(createParticle(complexity, emotionColor, emotion, rect));
      }

      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx * speed;
        particle.y += particle.vy * speed;
        particle.life -= particle.decay;
        particle.alpha = particle.life;

        if (emotion === 'anxious') {
          particle.vx += (Math.random() - 0.5) * 0.5;
          particle.vy += (Math.random() - 0.5) * 0.5;
        }

        if (emotion === 'sad') {
          particle.vy += 0.02;
        }

        if (emotion === 'calm') {
          particle.vx += Math.sin(particle.life * 10) * 0.02;
          particle.vy += Math.cos(particle.life * 8) * 0.02;
        }

        return particle.life > 0;
      });

      shapesRef.current = shapesRef.current.filter(shape => {
        shape.x += shape.vx * speed;
        shape.y += shape.vy * speed;
        shape.rotation += shape.rotationSpeed;
        shape.alpha -= 0.005;
        return shape.alpha > 0;
      });

      particlesRef.current.forEach(particle => {
        drawParticle(ctx, particle, hueOffset);
      });

      shapesRef.current.forEach(shape => {
        drawShape(ctx, shape, hueOffset);
      });

      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        console.log(`FPS: ${frameCountRef.current}`);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [speed, hueOffset, complexity, emotionColor, emotion]);

  return canvasRef;
}
