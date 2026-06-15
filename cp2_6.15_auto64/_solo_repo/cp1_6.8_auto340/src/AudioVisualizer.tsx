import { useRef, useEffect, useCallback } from 'react';
import { useStore, THEME_COLORS, COLOR_SPEED_MAP, BRIGHTNESS_MAP } from '@/store';
import type { AudioProcessor, AudioAnalysisData } from '@/utils/audioProcessor';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colorIdx: number;
  angle: number;
}

interface Ripple {
  radius: number;
  maxRadius: number;
  opacity: number;
  colorIdx: number;
  lineWidth: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ];
}

interface Props {
  audioProcessor: AudioProcessor | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function AudioVisualizer({ audioProcessor, canvasRef }: Props) {
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const timeRef = useRef(0);
  const colorOffsetRef = useRef(0);
  const prevAnalysisRef = useRef<AudioAnalysisData | null>(null);

  const currentTheme = useStore((s) => s.currentTheme);
  const visualizationMode = useStore((s) => s.visualizationMode);
  const particleDensity = useStore((s) => s.particleDensity);
  const particleSize = useStore((s) => s.particleSize);
  const colorSpeed = useStore((s) => s.colorSpeed);
  const backgroundBrightness = useStore((s) => s.backgroundBrightness);

  const getThemeColor = useCallback(
    (idx: number, offset: number): [number, number, number] => {
      const colors = THEME_COLORS[currentTheme].map(hexToRgb);
      const totalColors = colors.length;
      const pos = ((idx + offset) % totalColors + totalColors) % totalColors;
      const i = Math.floor(pos);
      const t = pos - i;
      const c1 = colors[i % totalColors];
      const c2 = colors[(i + 1) % totalColors];
      return lerpColor(c1, c2, t);
    },
    [currentTheme],
  );

  const spawnParticles = useCallback(
    (cx: number, cy: number, count: number, data: AudioAnalysisData) => {
      const particles = particlesRef.current;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 1 + data.bassEnergy * 6 + Math.random() * 2;
        const life = 40 + Math.random() * 60;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - data.bassEnergy * 3,
          life,
          maxLife: life,
          size: (particleSize / 10) * (2 + Math.random() * 3),
          colorIdx: i * 0.3 + colorOffsetRef.current,
          angle,
        });
      }
    },
    [particleSize],
  );

  const spawnRipple = useCallback(
    (cx: number, cy: number, data: AudioAnalysisData) => {
      ripplesRef.current.push({
        radius: 10,
        maxRadius: 100 + data.bassEnergy * 300,
        opacity: 0.8,
        colorIdx: colorOffsetRef.current,
        lineWidth: 1 + data.bassEnergy * 4,
      });
    },
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const data = audioProcessor?.getAnalysisData() ?? {
      frequencyData: new Uint8Array(1024),
      timeDomainData: new Uint8Array(1024),
      amplitude: 0,
      bassEnergy: 0,
      midEnergy: 0,
      highEnergy: 0,
      isBeat: false,
      beatIntensity: 0,
    };
    prevAnalysisRef.current = data;

    const brightness = BRIGHTNESS_MAP[backgroundBrightness];
    ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + (1 - brightness) * 0.15})`;
    ctx.fillRect(0, 0, w, h);

    const speedMultiplier = COLOR_SPEED_MAP[colorSpeed];
    colorOffsetRef.current += 0.01 * speedMultiplier;
    timeRef.current += 0.016;

    if (data.isBeat || data.beatIntensity > 0.5) {
      if (visualizationMode === 'fountain') {
        spawnParticles(cx, cy, Math.floor(particleDensity / 8), data);
      }
      if (visualizationMode === 'ripple') {
        spawnRipple(cx, cy, data);
      }
    }

    if (visualizationMode === 'ripple') {
      drawRipples(ctx, cx, cy, w, h, data);
    } else if (visualizationMode === 'fountain') {
      drawFountain(ctx, cx, cy, w, h, data);
    } else if (visualizationMode === 'spectrum') {
      drawSpectrum(ctx, cx, cy, w, h, data);
    }

    drawAmbientParticles(ctx, w, h, data);
    drawCenterGlow(ctx, cx, cy, data);

    animFrameRef.current = requestAnimationFrame(draw);
  }, [audioProcessor, canvasRef, visualizationMode, particleDensity, particleSize, colorSpeed, backgroundBrightness, currentTheme, spawnParticles, spawnRipple, getThemeColor]);

  const drawRipples = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, _w: number, _h: number, data: AudioAnalysisData) => {
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 2 + data.bassEnergy * 4;
        r.opacity -= 0.012;
        if (r.opacity <= 0 || r.radius > r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }
        const [cr, cg, cb] = getThemeColor(r.colorIdx, colorOffsetRef.current);
        ctx.beginPath();
        ctx.arc(cx, cy, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${r.opacity})`;
        ctx.lineWidth = r.lineWidth * r.opacity;
        ctx.stroke();
      }

      const baseRadius = 30 + data.bassEnergy * 80;
      for (let ring = 0; ring < 5; ring++) {
        const radius = baseRadius + ring * 40 + Math.sin(timeRef.current * 2 + ring) * 10;
        const opacity = 0.4 - ring * 0.06;
        if (opacity <= 0) continue;
        const [cr, cg, cb] = getThemeColor(ring, colorOffsetRef.current);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, radius), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${opacity})`;
        ctx.lineWidth = 1.5 + data.bassEnergy * 2;
        ctx.stroke();
      }
    },
    [getThemeColor],
  );

  const drawFountain = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, _w: number, _h: number, data: AudioAnalysisData) => {
      const particles = particlesRef.current;
      const gravity = 0.06;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += gravity;
        p.vx *= 0.99;
        p.life--;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const lifeRatio = p.life / p.maxLife;
        const alpha = lifeRatio * 0.9;
        const [cr, cg, cb] = getThemeColor(p.colorIdx, colorOffsetRef.current);
        const sz = p.size * (0.5 + lifeRatio * 0.5) * (particleSize / 5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, sz), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${alpha})`;
        ctx.fill();

        if (sz > 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${alpha * 0.15})`;
          ctx.fill();
        }
      }

      while (particles.length > particleDensity * 3) {
        particles.shift();
      }
    },
    [getThemeColor, particleSize, particleDensity],
  );

  const drawSpectrum = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, data: AudioAnalysisData) => {
      const freqData = data.frequencyData;
      const barCount = 128;
      const step = Math.floor(freqData.length / barCount);
      const barWidth = w / barCount;

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i * step] / 255;
        const barHeight = val * h * 0.6;
        const [cr, cg, cb] = getThemeColor(i * 0.04, colorOffsetRef.current);

        const x = i * barWidth;
        const y = h - barHeight;

        const grad = ctx.createLinearGradient(x, h, x, y);
        grad.addColorStop(0, `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, 0.8)`);
        grad.addColorStop(1, `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, 0.2)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth - 1, barHeight);

        const reflectionGrad = ctx.createLinearGradient(x, h, x, h + barHeight * 0.3);
        reflectionGrad.addColorStop(0, `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, 0.15)`);
        reflectionGrad.addColorStop(1, `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, 0)`);
        ctx.fillStyle = reflectionGrad;
        ctx.fillRect(x, h, barWidth - 1, barHeight * 0.3);
      }

      const circularCount = 64;
      const circularStep = Math.floor(freqData.length / circularCount);
      const baseR = 80 + data.bassEnergy * 40;
      for (let i = 0; i < circularCount; i++) {
        const val = freqData[i * circularStep] / 255;
        const angle = (Math.PI * 2 * i) / circularCount - Math.PI / 2;
        const r = baseR + val * 120;
        const [cr, cg, cb] = getThemeColor(i * 0.08, colorOffsetRef.current);
        const x1 = cx + Math.cos(angle) * baseR;
        const y1 = cy + Math.sin(angle) * baseR;
        const x2 = cx + Math.cos(angle) * r;
        const y2 = cy + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${0.5 + val * 0.5})`;
        ctx.lineWidth = 2 + val * 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    },
    [getThemeColor],
  );

  const drawAmbientParticles = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, data: AudioAnalysisData) => {
      const count = Math.floor(particleDensity / 4);
      for (let i = 0; i < count; i++) {
        const seed = i * 7919;
        const x = ((seed * 13) % w);
        const y = ((seed * 17) % h);
        const drift = Math.sin(timeRef.current * 0.5 + seed * 0.001) * 20;
        const px = x + drift;
        const py = y + Math.cos(timeRef.current * 0.3 + seed * 0.002) * 15;
        const [cr, cg, cb] = getThemeColor(i * 0.5, colorOffsetRef.current);
        const alpha = 0.15 + data.amplitude * 0.3;
        const sz = (particleSize / 5) * (1 + data.amplitude * 2);
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.5, sz), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${alpha})`;
        ctx.fill();
      }
    },
    [particleDensity, particleSize, getThemeColor],
  );

  const drawCenterGlow = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, data: AudioAnalysisData) => {
      const [cr, cg, cb] = getThemeColor(0, colorOffsetRef.current);
      const glowRadius = 60 + data.bassEnergy * 100 + data.beatIntensity * 50;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      grad.addColorStop(0, `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${0.1 + data.bassEnergy * 0.2})`);
      grad.addColorStop(0.5, `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${0.03 + data.bassEnergy * 0.05})`);
      grad.addColorStop(1, `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    },
    [getThemeColor],
  );

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

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [canvasRef, draw]);

  return null;
}
