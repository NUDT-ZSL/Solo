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

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const t = (complexity - 1) / 9;
      const shapesPerFrame = Math.round(lerp(1, 8, t));

      for (let i = 0; i < shapesPerFrame; i++) {
        shapesRef.current.push(createShape(complexity, emotionColor));
      }

      shapesRef.current = shapesRef.current.filter(shape => {
        shape.x += shape.vx * speed;
        shape.y += shape.vy * speed;
        shape.rotation += shape.rotationSpeed;
        shape.alpha -= 0.005;
        return shape.alpha > 0;
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
