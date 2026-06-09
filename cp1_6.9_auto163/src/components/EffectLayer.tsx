import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import type { WeatherType, RGB } from '../types';

interface Raindrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  sway: number;
  swaySpeed: number;
  opacity: number;
}

interface LightParticle {
  x: number;
  y: number;
  size: number;
  brightness: number;
  phase: number;
  speed: number;
}

interface EffectLayerProps {
  imageData: string;
  width: number;
  height: number;
  weather: WeatherType;
  timeOfDay: number;
  timeColor: { rgb: RGB; alpha: number; brightness: number };
  dominantColor: RGB;
}

export interface EffectLayerRef {
  captureStaticFrame: () => string | null;
  getCanvas: () => HTMLCanvasElement | null;
}

const RAIN_ANGLE = Math.PI / 6;
const RAIN_DENSITY_PER_SEC = 80;
const BASE_RAIN_COUNT = 150;
const BASE_SNOW_COUNT = 120;
const BASE_LIGHT_PARTICLES = 50;

function drawSnowflakeShape(ctx: CanvasRenderingContext2D, size: number): void {
  const arms = 6;
  ctx.beginPath();
  for (let i = 0; i < arms; i++) {
    const angle = (i * 2 * Math.PI) / arms;
    const endX = Math.cos(angle) * size;
    const endY = Math.sin(angle) * size;
    ctx.moveTo(0, 0);
    ctx.lineTo(endX, endY);
    const midX = (endX * 2) / 3;
    const midY = (endY * 2) / 3;
    const branchAngle = Math.PI / 6;
    const branchLen = size / 3;
    ctx.moveTo(midX, midY);
    ctx.lineTo(
      midX + Math.cos(angle - branchAngle) * branchLen,
      midY + Math.sin(angle - branchAngle) * branchLen
    );
    ctx.moveTo(midX, midY);
    ctx.lineTo(
      midX + Math.cos(angle + branchAngle) * branchLen,
      midY + Math.sin(angle + branchAngle) * branchLen
    );
  }
  ctx.stroke();
}

const EffectLayer = forwardRef<EffectLayerRef, EffectLayerProps>(
  ({ imageData, width, height, weather, timeOfDay, timeColor, dominantColor }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const animFrameRef = useRef<number>(0);
    const raindropsRef = useRef<Raindrop[]>([]);
    const snowflakesRef = useRef<Snowflake[]>([]);
    const lightParticlesRef = useRef<LightParticle[]>([]);
    const lastTimeRef = useRef<number>(0);
    const fpsTimesRef = useRef<number[]>([]);
    const particleScaleRef = useRef<number>(1);
    const fogOffsetRef = useRef<number>(0);
    const [imageLoaded, setImageLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
      captureStaticFrame: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tctx = tempCanvas.getContext('2d');
        if (!tctx) return null;
        tctx.drawImage(canvas, 0, 0);
        return tempCanvas.toDataURL('image/png');
      },
      getCanvas: () => canvasRef.current,
    }));

    const initRaindrops = useCallback((count: number, w: number, h: number) => {
      const drops: Raindrop[] = [];
      for (let i = 0; i < count; i++) {
        drops.push({
          x: Math.random() * (w + h * Math.tan(RAIN_ANGLE)),
          y: Math.random() * h,
          length: 15 + Math.random() * 20,
          speed: 8 + Math.random() * 6,
          opacity: 0.2 + Math.random() * 0.4,
        });
      }
      raindropsRef.current = drops;
    }, []);

    const initSnowflakes = useCallback((count: number, w: number, h: number) => {
      const flakes: Snowflake[] = [];
      for (let i = 0; i < count; i++) {
        flakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 3 + Math.random() * 6,
          speed: 0.5 + Math.random() * 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
          sway: Math.random() * Math.PI * 2,
          swaySpeed: 0.01 + Math.random() * 0.02,
          opacity: 0.5 + Math.random() * 0.5,
        });
      }
      snowflakesRef.current = flakes;
    }, []);

    const initLightParticles = useCallback((count: number, w: number, h: number) => {
      const particles: LightParticle[] = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: h * 0.3 + Math.random() * h * 0.7,
          size: 1 + Math.random() * 3,
          brightness: 0.3 + Math.random() * 0.7,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 1.5,
        });
      }
      lightParticlesRef.current = particles;
    }, []);

    useEffect(() => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
        const scaled = particleScaleRef.current;
        initRaindrops(Math.floor(BASE_RAIN_COUNT * scaled), width, height);
        initSnowflakes(Math.floor(BASE_SNOW_COUNT * scaled), width, height);
        initLightParticles(Math.floor(BASE_LIGHT_PARTICLES * scaled), width, height);
      };
      img.src = imageData;
      return () => {
        imageRef.current = null;
      };
    }, [imageData, width, height, initRaindrops, initSnowflakes, initLightParticles]);

    useEffect(() => {
      if (imageLoaded) {
        const scaled = particleScaleRef.current;
        initRaindrops(Math.floor(BASE_RAIN_COUNT * scaled), width, height);
        initSnowflakes(Math.floor(BASE_SNOW_COUNT * scaled), width, height);
        initLightParticles(Math.floor(BASE_LIGHT_PARTICLES * scaled), width, height);
      }
    }, [weather, imageLoaded, width, height, initRaindrops, initSnowflakes, initLightParticles]);

    const render = useCallback(
      (timestamp: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = imageRef.current;
        if (!canvas || !ctx || !img) {
          animFrameRef.current = requestAnimationFrame(render);
          return;
        }

        const W = canvas.width;
        const H = canvas.height;

        if (lastTimeRef.current === 0) {
          lastTimeRef.current = timestamp;
        }
        const delta = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        fpsTimesRef.current.push(delta);
        if (fpsTimesRef.current.length > 30) {
          fpsTimesRef.current.shift();
        }
        const avgDelta =
          fpsTimesRef.current.reduce((a, b) => a + b, 0) / fpsTimesRef.current.length;
        const currentFps = 1000 / avgDelta;
        if (fpsTimesRef.current.length === 30) {
          if (currentFps < 50 && particleScaleRef.current > 0.5) {
            particleScaleRef.current = Math.max(0.5, particleScaleRef.current - 0.1);
            const scaled = particleScaleRef.current;
            initRaindrops(Math.floor(BASE_RAIN_COUNT * scaled), W, H);
            initSnowflakes(Math.floor(BASE_SNOW_COUNT * scaled), W, H);
            initLightParticles(Math.floor(BASE_LIGHT_PARTICLES * scaled), W, H);
            fpsTimesRef.current = [];
          } else if (currentFps > 58 && particleScaleRef.current < 1) {
            particleScaleRef.current = Math.min(1, particleScaleRef.current + 0.05);
            const scaled = particleScaleRef.current;
            initRaindrops(Math.floor(BASE_RAIN_COUNT * scaled), W, H);
            initSnowflakes(Math.floor(BASE_SNOW_COUNT * scaled), W, H);
            initLightParticles(Math.floor(BASE_LIGHT_PARTICLES * scaled), W, H);
            fpsTimesRef.current = [];
          }
        }

        ctx.clearRect(0, 0, W, H);

        const brightness = timeColor.brightness;
        if (brightness !== 1) {
          ctx.filter = `brightness(${brightness}) contrast(${1 + (1 - brightness) * 0.2})`;
        }
        ctx.drawImage(img, 0, 0, W, H);
        ctx.filter = 'none';

        const { rgb, alpha } = timeColor;
        if (alpha > 0) {
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
          ctx.fillRect(0, 0, W, H);
        }

        switch (weather) {
          case 'rain':
            renderRain(ctx, W, H, delta);
            break;
          case 'snow':
            renderSnow(ctx, W, H, delta);
            break;
          case 'fog':
            renderFog(ctx, W, H, delta);
            break;
          case 'sunset':
            renderSunset(ctx, W, H, delta);
            break;
        }

        animFrameRef.current = requestAnimationFrame(render);
      },
      [imageLoaded, weather, timeColor, initRaindrops, initSnowflakes, initLightParticles]
    );

    const renderRain = (ctx: CanvasRenderingContext2D, W: number, H: number, delta: number) => {
      const drops = raindropsRef.current;
      const speedFactor = delta / 16.67;
      const dx = Math.sin(RAIN_ANGLE);
      const dy = Math.cos(RAIN_ANGLE);

      ctx.strokeStyle = 'rgba(200, 220, 240, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        ctx.globalAlpha = d.opacity;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - dx * d.length, d.y - dy * d.length);
        ctx.stroke();

        d.x += dx * d.speed * speedFactor;
        d.y += dy * d.speed * speedFactor;

        if (d.y > H + d.length || d.x > W + d.length) {
          d.x = Math.random() * (W + H * Math.tan(RAIN_ANGLE)) - H * Math.tan(RAIN_ANGLE);
          d.y = -d.length;
          d.length = 15 + Math.random() * 20;
          d.speed = 8 + Math.random() * 6;
          d.opacity = 0.2 + Math.random() * 0.4;
        }
      }
      ctx.globalAlpha = 1;
    };

    const renderSnow = (ctx: CanvasRenderingContext2D, W: number, H: number, delta: number) => {
      const flakes = snowflakesRef.current;
      const speedFactor = delta / 16.67;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1;

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        ctx.save();
        ctx.globalAlpha = f.opacity;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        drawSnowflakeShape(ctx, f.size);
        ctx.restore();

        f.sway += f.swaySpeed * speedFactor;
        f.x += Math.sin(f.sway) * 0.5 * speedFactor;
        f.y += f.speed * speedFactor;
        f.rotation += f.rotationSpeed * speedFactor;

        if (f.y > H + f.size) {
          f.y = -f.size;
          f.x = Math.random() * W;
          f.size = 3 + Math.random() * 6;
          f.speed = 0.5 + Math.random() * 1;
          f.opacity = 0.5 + Math.random() * 0.5;
        }
        if (f.x < -f.size) f.x = W + f.size;
        if (f.x > W + f.size) f.x = -f.size;
      }
      ctx.globalAlpha = 1;
    };

    const renderFog = (ctx: CanvasRenderingContext2D, W: number, H: number, delta: number) => {
      fogOffsetRef.current += (delta / 16.67) * 0.3;
      const offset = fogOffsetRef.current;
      const baseOpacity = 0.15 + 0.15 * (Math.sin(offset * 0.01) + 1) / 2;

      for (let layer = 0; layer < 3; layer++) {
        const layerOpacity = baseOpacity * (0.5 + layer * 0.25);
        const waveAmplitude = 20 + layer * 10;
        const waveFrequency = 0.01 + layer * 0.003;
        const layerOffset = offset * (0.5 + layer * 0.3);

        ctx.fillStyle = `rgba(255, 255, 255, ${layerOpacity})`;
        ctx.beginPath();
        ctx.moveTo(0, H);

        for (let x = 0; x <= W; x += 5) {
          const y =
            H * (0.3 + layer * 0.15) +
            Math.sin(x * waveFrequency + layerOffset) * waveAmplitude +
            Math.sin(x * waveFrequency * 2.3 + layerOffset * 1.7) * (waveAmplitude * 0.4);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      }
    };

    const renderSunset = (ctx: CanvasRenderingContext2D, W: number, H: number, delta: number) => {
      const glowEndY = H * 0.4;
      const gradient = ctx.createLinearGradient(0, H, 0, glowEndY);
      gradient.addColorStop(0, 'rgba(255, 140, 0, 0.5)');
      gradient.addColorStop(0.4, 'rgba(255, 140, 0, 0.25)');
      gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, glowEndY, W, H - glowEndY);

      const particles = lightParticlesRef.current;
      const time = delta / 1000;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.phase += time * p.speed;
        const pulse = 0.6 + 0.4 * Math.sin(p.phase * 2);
        const size = p.size * pulse;

        const radial = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
        radial.addColorStop(0, `rgba(255, 220, 150, ${0.8 * pulse})`);
        radial.addColorStop(0.4, `rgba(255, 180, 80, ${0.3 * pulse})`);
        radial.addColorStop(1, 'rgba(255, 140, 0, 0)');

        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
        ctx.fill();

        p.y -= 0.2;
        if (p.y < H * 0.3) {
          p.y = H * 0.95;
          p.x = Math.random() * W;
        }
      }
    };

    useEffect(() => {
      if (!imageLoaded) return;
      lastTimeRef.current = 0;
      fpsTimesRef.current = [];
      animFrameRef.current = requestAnimationFrame(render);
      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }, [imageLoaded, render]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          maxWidth: `${width}px`,
        }}
      />
    );
  }
);

EffectLayer.displayName = 'EffectLayer';

export default EffectLayer;
