import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

export type ColorThemeName = 'white' | 'gold' | 'cyan' | 'pink' | 'green' | 'orange';

export interface ColorTheme {
  name: ColorThemeName;
  primary: string;
  shadow: string;
  accent: string;
  gradient: [string, string];
}

export interface Keyword {
  id: number;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  targetSize: number;
  opacity: number;
  birthTime: number;
  lifetime: number;
  scale: number;
  rotation: number;
  measuredWidth?: number;
}

export const COLOR_THEMES: ColorTheme[] = [
  { name: 'white',  primary: '#ffffff', shadow: 'rgba(0,0,0,0.65)', accent: '#f0f0f0', gradient: ['#ffffff','#d9e8ff'] },
  { name: 'gold',   primary: '#ffd76a', shadow: 'rgba(120,70,0,0.55)', accent: '#fff3b0', gradient: ['#ffd76a','#ff9e45'] },
  { name: 'cyan',   primary: '#6ee7ff', shadow: 'rgba(0,60,120,0.55)', accent: '#bff5ff', gradient: ['#6ee7ff','#3a8bff'] },
  { name: 'pink',   primary: '#ff9ac1', shadow: 'rgba(120,20,60,0.55)', accent: '#ffd1e2', gradient: ['#ff9ac1','#ff5d8f'] },
  { name: 'green',  primary: '#8ef0a7', shadow: 'rgba(0,90,40,0.55)', accent: '#cff9d9', gradient: ['#8ef0a7','#35c97a'] },
  { name: 'orange', primary: '#ffb36b', shadow: 'rgba(140,50,0,0.55)', accent: '#ffd9a8', gradient: ['#ffb36b','#ff7730'] },
];

export interface CloudCanvasHandle {
  addKeyword: (text: string) => void;
  clear: () => void;
}

interface CloudCanvasProps {
  colorTheme: ColorTheme;
  speedLevel: number;
  maxFontSize: number;
  width: number;
  height: number;
}

function lifetimeFromSpeed(speedLevel: number): number {
  const v = Math.max(1, Math.min(10, speedLevel));
  return Math.max(2000, 12000 - (v - 1) * 1000);
}
function speedFactor(speedLevel: number): number {
  const v = Math.max(1, Math.min(10, speedLevel));
  return 0.3 + (v - 1) * 0.08;
}

const MAX_PARTICLES = 50;
const POP_ANIM_MS = 200;

const CloudCanvas = forwardRef<CloudCanvasHandle, CloudCanvasProps>(function CloudCanvas(
  { colorTheme, speedLevel, maxFontSize, width, height }, ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Keyword[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const nextIdRef = useRef<number>(1);
  const themeRef = useRef<ColorTheme>(colorTheme);
  const themeProgressRef = useRef<number>(1);
  const prevThemeRef = useRef<ColorTheme>(colorTheme);
  const maxFontRef = useRef<number>(maxFontSize);
  const speedRef = useRef<number>(speedLevel);
  const dimsRef = useRef<{w:number,h:number}>({ w: width, h: height });
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => { themeRef.current = colorTheme; }, [colorTheme]);
  useEffect(() => { prevThemeRef.current = colorTheme; themeProgressRef.current = 1; }, []);
  useEffect(() => {
    if (prevThemeRef.current.name !== colorTheme.name) {
      prevThemeRef.current = themeRef.current;
      themeProgressRef.current = 0;
    }
    themeRef.current = colorTheme;
  }, [colorTheme]);
  useEffect(() => { maxFontRef.current = maxFontSize; }, [maxFontSize]);
  useEffect(() => { speedRef.current = speedLevel; }, [speedLevel]);
  useEffect(() => { dimsRef.current = { w: width, h: height }; }, [width, height]);

  const measureWidth = useCallback((text: string, size: number): number => {
    if (!measureCtxRef.current) {
      const off = document.createElement('canvas');
      measureCtxRef.current = off.getContext('2d');
    }
    const ctx = measureCtxRef.current!;
    ctx.font = `900 ${size}px "ZCOOL KuaiLe", "Noto Sans SC", sans-serif`;
    return ctx.measureText(text).width;
  }, []);

  const addKeyword = useCallback((text: string) => {
    const { w, h } = dimsRef.current;
    if (w <= 0 || h <= 0) return;
    const cx = w / 2;
    const cy = h / 2;
    const curMax = maxFontRef.current;
    const size = Math.max(20, Math.min(curMax, 24 + Math.floor(Math.random() * (curMax - 20))));
    const angle = Math.random() * Math.PI * 2;
    const sp = (0.4 + Math.random() * 0.6) * speedFactor(speedRef.current);
    const particle: Keyword = {
      id: nextIdRef.current++,
      text,
      x: cx,
      y: cy,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      size: size,
      targetSize: size,
      opacity: 1,
      birthTime: performance.now(),
      lifetime: lifetimeFromSpeed(speedRef.current),
      scale: 0.8,
      rotation: (Math.random() - 0.5) * 0.2,
      measuredWidth: measureWidth(text, size),
    };
    const arr = particlesRef.current;
    if (arr.length >= MAX_PARTICLES) {
      arr.sort((a, b) => (a.lifetime - (performance.now() - a.birthTime)) - (b.lifetime - (performance.now() - b.birthTime)));
      arr.shift();
    }
    arr.push(particle);
  }, [measureWidth]);

  const clear = useCallback(() => {
    particlesRef.current = [];
  }, []);

  useImperativeHandle(ref, () => ({ addKeyword, clear }), [addKeyword, clear]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (t: number) => {
      const dt = Math.min(50, lastFrameRef.current ? t - lastFrameRef.current : 16);
      lastFrameRef.current = t;

      if (themeProgressRef.current < 1) {
        themeProgressRef.current = Math.min(1, themeProgressRef.current + dt / 500);
      }

      stepParticles(t, dt);
      render(ctx, t);

      rafRef.current = requestAnimationFrame(loop);
    };

    const stepParticles = (now: number, dt: number) => {
      const parts = particlesRef.current;
      const { w, h } = dimsRef.current;
      const cx = w / 2;
      const cy = h / 2;
      const a = Math.max(80, w * 0.38);
      const b = Math.max(60, h * 0.38);
      const dtN = dt / 16.67;
      const sp = speedFactor(speedRef.current);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const age = now - p.birthTime;
        if (age < POP_ANIM_MS) {
          const r = age / POP_ANIM_MS;
          p.scale = 0.8 + 0.2 * r;
        } else {
          p.scale = 1;
        }
        const lifeRemain = p.lifetime - age;
        if (lifeRemain < 1500) {
          p.opacity = Math.max(0, lifeRemain / 1500);
        } else if (age < 400) {
          p.opacity = Math.min(1, age / 400);
        } else {
          p.opacity = 1;
        }
      }

      for (let i = 0; i < parts.length; i++) {
        const pi = parts[i];
        for (let j = i + 1; j < parts.length; j++) {
          const pj = parts[j];
          const dx = pj.x - pi.x;
          const dy = pj.y - pi.y;
          const d2 = dx * dx + dy * dy + 0.01;
          const ri = (pi.size / 2) * 1.15 + 6;
          const rj = (pj.size / 2) * 1.15 + 6;
          const R = ri + rj;
          if (d2 < R * R) {
            const dist = Math.sqrt(d2);
            const overlap = 1 - dist / R;
            const force = 0.6 * overlap / Math.max(dist, 0.5);
            const fx = force * dx;
            const fy = force * dy;
            pi.vx -= fx * 0.5;
            pi.vy -= fy * 0.5;
            pj.vx += fx * 0.5;
            pj.vy += fy * 0.5;
          }
        }
      }

      for (const p of parts) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const nr2 = (dx * dx) / (a * a) + (dy * dy) / (b * b);
        if (nr2 > 1.15) {
          const pull = 0.012 * (nr2 - 1.15);
          p.vx -= dx * pull;
          p.vy -= dy * pull;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;
        const maxV = 2.2 * sp;
        const vlen = Math.hypot(p.vx, p.vy);
        if (vlen > maxV) {
          p.vx = (p.vx / vlen) * maxV;
          p.vy = (p.vy / vlen) * maxV;
        }
        p.x += p.vx * dtN;
        p.y += p.vy * dtN;
      }

      particlesRef.current = parts.filter(p => (now - p.birthTime) < p.lifetime && p.opacity > 0.02);
    };

    const hexToRgb = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '');
      return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
      ];
    };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const mixColor = (c1: string, c2: string, t: number): string => {
      const [r1, g1, b1] = hexToRgb(c1);
      const [r2, g2, b2] = hexToRgb(c2);
      return `rgb(${Math.round(lerp(r1,r2,t))}, ${Math.round(lerp(g1,g2,t))}, ${Math.round(lerp(b1,b2,t))})`;
    };
    const mixShadow = (s1: string, s2: string, t: number): string => {
      const p = /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/;
      const m1 = s1.match(p); const m2 = s2.match(p);
      if (!m1 || !m2) return s1;
      const r = Math.round(lerp(+m1[1],+m2[1],t));
      const g = Math.round(lerp(+m1[2],+m2[2],t));
      const b = Math.round(lerp(+m1[3],+m2[3],t));
      const a = lerp(+(m1[4] ?? '1'), +(m2[4] ?? '1'), t);
      return `rgba(${r},${g},${b},${a})`;
    };

    const render = (ctx: CanvasRenderingContext2D, _t: number) => {
      const { w, h } = dimsRef.current;
      ctx.clearRect(0, 0, w, h);
      const parts = particlesRef.current;
      if (!parts.length) return;

      const prog = themeProgressRef.current;
      const prev = prevThemeRef.current;
      const cur = themeRef.current;
      const mainColor = prog >= 1 ? cur.primary : mixColor(prev.primary, cur.primary, prog);
      const accentColor = prog >= 1 ? cur.accent : mixColor(prev.accent, cur.accent, prog);
      const shadowColor = prog >= 1 ? cur.shadow : mixShadow(prev.shadow, cur.shadow, prog);

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      parts.sort((a, b) => a.targetSize - b.targetSize);

      for (const p of parts) {
        const alpha = p.opacity;
        if (alpha <= 0.02) continue;
        const displaySize = p.targetSize * p.scale;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `900 ${displaySize}px "ZCOOL KuaiLe", "Noto Sans SC", system-ui, sans-serif`;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;

        try {
          const grad = ctx.createLinearGradient(-displaySize, -displaySize / 2, displaySize, displaySize / 2);
          grad.addColorStop(0, mainColor);
          grad.addColorStop(1, accentColor);
          ctx.fillStyle = grad;
        } catch {
          ctx.fillStyle = mainColor;
        }
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    lastFrameRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
});

export default CloudCanvas;
