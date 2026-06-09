import React, { useRef, useEffect, useCallback } from 'react';
import type { FloatingBottle } from '../types';

interface OceanProps {
  floatingBottles: FloatingBottle[];
}

interface WaveLayer {
  amplitude: number;
  wavelength: number;
  speed: number;
  phase: number;
  color: string;
  alpha: number;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  vx: number;
  vy: number;
  updateAt: number;
}

const Ocean: React.FC<OceanProps> = ({ floatingBottles }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const sparklesRef = useRef<Sparkle[]>([]);
  const lastFrameRef = useRef<number>(performance.now());
  const fpsAccumRef = useRef<{ frames: number; time: number }>({ frames: 0, time: 0 });

  const getWaveY = useCallback((x: number, width: number, layers: WaveLayer[], time: number): number => {
    let y = 0;
    for (const layer of layers) {
      const k = (2 * Math.PI) / layer.wavelength;
      y += layer.amplitude * Math.sin(k * x + layer.speed * time + layer.phase);
    }
    return y;
  }, []);

  const initSparkles = useCallback((width: number, height: number, horizonY: number) => {
    const sparkles: Sparkle[] = [];
    const count = Math.floor((width * height) / 15000);
    for (let i = 0; i < Math.min(count, 60); i++) {
      sparkles.push({
        x: Math.random() * width,
        y: horizonY + Math.random() * (height - horizonY) * 0.4,
        size: 2 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        updateAt: performance.now() + Math.random() * 1000
      });
    }
    sparklesRef.current = sparkles;
  }, []);

  const hexToRgb = useCallback((hex: string): { r: number; g: number; b: number } => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }, []);

  const drawBottle = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    scale: number = 1,
    rotation: number = 0
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    const w = 60;
    const h = 100;

    const rgb = hexToRgb(color);

    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.75)`);
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.95)`);

    ctx.beginPath();
    ctx.moveTo(-8, -h / 2);
    ctx.lineTo(8, -h / 2);
    ctx.lineTo(8, -h / 2 + 15);
    ctx.bezierCurveTo(20, -h / 2 + 25, w / 2, -h / 2 + 30, w / 2, -h / 2 + 45);
    ctx.bezierCurveTo(w / 2 + 5, 0, w / 2 - 5, h / 2 - 10, w / 3, h / 2);
    ctx.lineTo(-w / 3, h / 2);
    ctx.bezierCurveTo(-w / 2 + 5, h / 2 - 10, -w / 2 - 5, 0, -w / 2, -h / 2 + 45);
    ctx.bezierCurveTo(-w / 2, -h / 2 + 30, -20, -h / 2 + 25, -8, -h / 2 + 15);
    ctx.closePath();

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,0.4)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-w / 3, -h / 2 + 50);
    ctx.bezierCurveTo(-w / 4, -h / 2 + 55, -w / 6, -h / 2 + 52, 0, -h / 2 + 58);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-w / 4, -h / 2 + 40, 6, 15, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(-14, -h / 2 - 8, 28, 10, 3);
    ctx.fillStyle = `rgba(${rgb.r * 0.7},${rgb.g * 0.7},${rgb.b * 0.7},0.9)`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }, [hexToRgb]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      const horizonY = height * 0.28;
      initSparkles(width, height, horizonY);
    };
    resize();
    window.addEventListener('resize', resize);

    const layers: WaveLayer[] = [
      { amplitude: 8, wavelength: 200, speed: 0.3, phase: 0, color: '#4FC3F7', alpha: 0.7 },
      { amplitude: 5, wavelength: 150, speed: 0.5, phase: Math.PI / 3, color: '#29B6F6', alpha: 0.8 },
      { amplitude: 3, wavelength: 100, speed: 0.7, phase: Math.PI / 2, color: '#0288D1', alpha: 0.9 }
    ];

    const render = (now: number) => {
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;
      timeRef.current += delta * 0.001;
      const time = timeRef.current;

      fpsAccumRef.current.frames++;
      fpsAccumRef.current.time += delta;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const horizonY = height * 0.28;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
      skyGrad.addColorStop(0, '#81D4FA');
      skyGrad.addColorStop(0.5, '#B3E5FC');
      skyGrad.addColorStop(1, '#81D4FA');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, horizonY + 40);

      const oceanGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      oceanGrad.addColorStop(0, 'rgba(179, 229, 252, 0.95)');
      oceanGrad.addColorStop(0.2, 'rgba(79, 195, 247, 0.95)');
      oceanGrad.addColorStop(0.5, 'rgba(3, 169, 244, 0.95)');
      oceanGrad.addColorStop(0.8, 'rgba(1, 87, 155, 0.98)');
      oceanGrad.addColorStop(1, '#01579B');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, horizonY, width, height - horizonY);

      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        ctx.beginPath();
        ctx.moveTo(0, horizonY + 30);
        for (let x = 0; x <= width; x += 3) {
          const k = (2 * Math.PI) / layer.wavelength;
          const y = horizonY + 30 + layer.amplitude * Math.sin(k * x + layer.speed * time + layer.phase) + (layers.length - 1 - i) * 6;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, horizonY + 80);
        ctx.lineTo(0, horizonY + 80);
        ctx.closePath();
        ctx.fillStyle = layer.color;
        ctx.globalAlpha = layer.alpha * 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.moveTo(0, horizonY + 30);
      for (let x = 0; x <= width; x += 2) {
        const y = horizonY + 30 + getWaveY(x, width, layers, time);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, horizonY + 80);
      ctx.lineTo(0, horizonY + 80);
      ctx.closePath();
      const surfaceGrad = ctx.createLinearGradient(0, horizonY, 0, horizonY + 60);
      surfaceGrad.addColorStop(0, 'rgba(179, 229, 252, 0.6)');
      surfaceGrad.addColorStop(1, 'rgba(79, 195, 247, 0.3)');
      ctx.fillStyle = surfaceGrad;
      ctx.fill();

      const sparkles = sparklesRef.current;
      for (const s of sparkles) {
        if (now > s.updateAt) {
          s.x += s.vx * 30 + (Math.random() - 0.5) * 20;
          s.y += s.vy * 20 + (Math.random() - 0.5) * 10;
          if (s.x < 0) s.x = width;
          if (s.x > width) s.x = 0;
          if (s.y < horizonY + 10) s.y = horizonY + 10 + Math.random() * 50;
          if (s.y > horizonY + 150) s.y = horizonY + 10 + Math.random() * 80;
          s.alpha = 0.2 + Math.random() * 0.6;
          s.updateAt = now + 800 + Math.random() * 1200;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        const sparkleGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
        sparkleGrad.addColorStop(0, `rgba(255, 255, 255, ${s.alpha})`);
        sparkleGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = sparkleGrad;
        ctx.fill();
      }

      const bottomGrad = ctx.createRadialGradient(
        width / 2, height + 50, 50,
        width / 2, height + 50, height * 0.8
      );
      bottomGrad.addColorStop(0, 'rgba(0, 30, 60, 0.95)');
      bottomGrad.addColorStop(0.5, 'rgba(0, 50, 100, 0.6)');
      bottomGrad.addColorStop(1, 'rgba(1, 87, 155, 0)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, height * 0.6, width, height * 0.4);

      const currentTime = now;
      for (const bottle of floatingBottles) {
        const elapsed = (currentTime - bottle.startTime) / 1000;
        let scale = 1;
        let opacity = 1;
        let offsetY = 0;
        let rotation = 0;

        if (elapsed < 1.2) {
          const t = elapsed / 1.2;
          const easeT = t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
          offsetY = (1 - easeT) * height;
          scale = 0.6 + easeT * 0.4;
          opacity = Math.min(1, t * 1.5);
        } else if (elapsed < 11) {
          const bobTime = (elapsed - 1.2) / 2.4 * Math.PI * 2;
          offsetY = Math.sin(bobTime) * 8;
          rotation = Math.sin(bobTime * 0.7) * 0.04;
          opacity = 1;
          scale = 1;
        } else if (elapsed < 14) {
          const t = (elapsed - 11) / 3;
          opacity = 1 - t;
          offsetY = t * 300;
          scale = 1 + t * 0.15;
        } else {
          continue;
        }

        ctx.globalAlpha = opacity;
        const bottleY = horizonY + 100 + offsetY + (Math.sin(bottle.startTime * 0.001) * 40);
        drawBottle(ctx, bottle.x, bottleY, bottle.color, scale * 0.75, rotation);
        ctx.globalAlpha = 1;
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [floatingBottles, getWaveY, drawBottle, initSparkles]);

  return (
    <canvas
      ref={canvasRef}
      className="ocean-canvas"
    />
  );
};

export default Ocean;
