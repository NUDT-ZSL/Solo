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
  halfW: number;
  halfH: number;
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
const THEME_TRANSITION_MS = 500;

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
  const dimsRef = useRef<{ w: number; h: number }>({ w: width, h: height });
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const fpsFramesRef = useRef<number[]>([]);
  const fpsDisplayRef = useRef<number>(0);
  const fpsOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { themeRef.current = colorTheme; }, [colorTheme]);
  useEffect(() => { prevThemeRef.current = colorTheme; themeProgressRef.current = 1; }, []);
  useEffect(() => {
    if (prevThemeRef.current.name !== colorTheme.name) {
      prevThemeRef.current = { ...themeRef.current };
      themeProgressRef.current = 0;
    }
    themeRef.current = colorTheme;
  }, [colorTheme]);
  useEffect(() => { maxFontRef.current = maxFontSize; }, [maxFontSize]);
  useEffect(() => { speedRef.current = speedLevel; }, [speedLevel]);
  useEffect(() => { dimsRef.current = { w: width, h: height }; }, [width, height]);

  const measureText = useCallback((text: string, size: number): { halfW: number; halfH: number } => {
    if (!measureCtxRef.current) {
      const off = document.createElement('canvas');
      measureCtxRef.current = off.getContext('2d');
    }
    const ctx = measureCtxRef.current!;
    ctx.font = '900 ' + size + 'px "ZCOOL KuaiLe", "Noto Sans SC", sans-serif';
    const m = ctx.measureText(text);
    const w = m.width;
    const h = size * 1.1;
    return { halfW: w / 2 + 4, halfH: h / 2 + 2 };
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
    const { halfW, halfH } = measureText(text, size);

    const particle: Keyword = {
      id: nextIdRef.current++,
      text,
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      size,
      targetSize: size,
      opacity: 1,
      birthTime: performance.now(),
      lifetime: lifetimeFromSpeed(speedRef.current),
      scale: 0.8,
      rotation: (Math.random() - 0.5) * 0.15,
      halfW,
      halfH,
    };

    const arr = particlesRef.current;
    if (arr.length >= MAX_PARTICLES) {
      let minRemain = Infinity;
      let minIdx = 0;
      const now = performance.now();
      for (let i = 0; i < arr.length; i++) {
        const remain = arr[i].lifetime - (now - arr[i].birthTime);
        if (remain < minRemain || (remain === minRemain && arr[i].birthTime < arr[minIdx].birthTime)) {
          minRemain = remain;
          minIdx = i;
        }
      }
      arr.splice(minIdx, 1);
    }
    arr.push(particle);
  }, [measureText]);

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

      fpsFramesRef.current.push(t);
      while (fpsFramesRef.current.length > 0 && fpsFramesRef.current[0] < t - 1000) {
        fpsFramesRef.current.shift();
      }
      fpsDisplayRef.current = fpsFramesRef.current.length;
      if (fpsOverlayRef.current) {
        fpsOverlayRef.current.textContent = fpsDisplayRef.current + ' FPS | ' + particlesRef.current.length + ' particles';
      }

      if (themeProgressRef.current < 1) {
        themeProgressRef.current = Math.min(1, themeProgressRef.current + dt / THEME_TRANSITION_MS);
      }

      stepParticles(t, dt);
      render(ctx, t);

      rafRef.current = requestAnimationFrame(loop);
    };

    const buildCorners = (p: Keyword, c: number, s: number): [number, number][] => {
      const hw = p.halfW * p.scale;
      const hh = p.halfH * p.scale;
      return [
        [p.x + (-hw * c + hh * s), p.y + (-hw * s - hh * c)],
        [p.x + (hw * c + hh * s), p.y + (hw * s - hh * c)],
        [p.x + (hw * c - hh * s), p.y + (hw * s + hh * c)],
        [p.x + (-hw * c - hh * s), p.y + (-hw * s + hh * c)],
      ];
    };

    const projectOnAxis = (corners: [number, number][], ax: number, ay: number): [number, number] => {
      let min = Infinity;
      let max = -Infinity;
      for (let k = 0; k < 4; k++) {
        const d = corners[k][0] * ax + corners[k][1] * ay;
        if (d < min) min = d;
        if (d > max) max = d;
      }
      return [min, max];
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
          p.scale = 0.8 + 0.2 * (age / POP_ANIM_MS);
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

        if (p.targetSize !== maxFontRef.current && p.targetSize > maxFontRef.current) {
          p.targetSize = maxFontRef.current;
          const m = measureText(p.text, p.targetSize);
          p.halfW = m.halfW;
          p.halfH = m.halfH;
        }
      }

      const cosArr = new Float64Array(parts.length);
      const sinArr = new Float64Array(parts.length);
      const cornersArr: [number, number][][] = new Array(parts.length);
      for (let k = 0; k < parts.length; k++) {
        const p = parts[k];
        const c = Math.cos(p.rotation);
        const s = Math.sin(p.rotation);
        cosArr[k] = c;
        sinArr[k] = s;
        cornersArr[k] = buildCorners(p, c, s);
      }

      for (let i = 0; i < parts.length; i++) {
        const pi = parts[i];
        const ci = cornersArr[i];
        const cosI = cosArr[i];
        const sinI = sinArr[i];

        for (let j = i + 1; j < parts.length; j++) {
          const pj = parts[j];
          const dx = pj.x - pi.x;
          const dy = pj.y - pi.y;
          const spanI = Math.max(pi.halfW, pi.halfH) * pi.scale;
          const spanJ = Math.max(pj.halfW, pj.halfH) * pj.scale;
          if (Math.abs(dx) > (spanI + spanJ) * 2.2 || Math.abs(dy) > (spanI + spanJ) * 2.2) continue;

          const cj = cornersArr[j];
          const cosJ = cosArr[j];
          const sinJ = sinArr[j];

          const axesX0 = cosI;
          const axesY0 = sinI;
          const axesX1 = -sinI;
          const axesY1 = cosI;
          const axesX2 = cosJ;
          const axesY2 = sinJ;
          const axesX3 = -sinJ;
          const axesY3 = cosJ;

          let colliding = true;
          const ovs = [0, 0, 0, 0];
          for (let k = 0; k < 4; k++) {
            const ax = k === 0 ? axesX0 : k === 1 ? axesX1 : k === 2 ? axesX2 : axesX3;
            const ay = k === 0 ? axesY0 : k === 1 ? axesY1 : k === 2 ? axesY2 : axesY3;
            const [minAI, maxAI] = projectOnAxis(ci, ax, ay);
            const [minBJ, maxBJ] = projectOnAxis(cj, ax, ay);
            const ov = Math.min(maxAI - minBJ, maxBJ - minAI);
            if (ov <= 0) { colliding = false; break; }
            ovs[k] = ov;
          }
          if (!colliding) continue;

          const dotX = dx * cosI + dy * sinI;
          const dotY = -dx * sinI + dy * cosI;
          const pushLocalX = ovs[0] * (dotX >= 0 ? 1 : -1);
          const pushLocalY = ovs[1] * (dotY >= 0 ? 1 : -1);
          const pushWX = pushLocalX * cosI - pushLocalY * sinI;
          const pushWY = pushLocalX * sinI + pushLocalY * cosI;

          const pushMag = Math.hypot(pushWX, pushWY);
          if (pushMag < 0.001) continue;

          const sumDim = Math.max(1, pi.halfW * pi.scale + pj.halfW * pj.scale)
                       + Math.max(1, pi.halfH * pi.scale + pj.halfH * pj.scale);
          const severity = pushMag / sumDim;
          const strength = 0.8 * severity * (1 + severity * 2);

          const nx = pushWX / pushMag;
          const ny = pushWY / pushMag;
          const fx = strength * nx;
          const fy = strength * ny;

          pi.vx -= fx * 0.5;
          pi.vy -= fy * 0.5;
          pj.vx += fx * 0.5;
          pj.vy += fy * 0.5;
        }
      }

      for (const p of parts) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const nr2 = (dx * dx) / (a * a) + (dy * dy) / (b * b);
        if (nr2 > 1.15) {
          const pull = 0.015 * (nr2 - 1.15);
          p.vx -= dx * pull;
          p.vy -= dy * pull;
        }

        const margin = 20;
        if (p.x < margin) p.vx += 0.3;
        if (p.x > w - margin) p.vx -= 0.3;
        if (p.y < margin) p.vy += 0.3;
        if (p.y > h - margin) p.vy -= 0.3;

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

        p.x = Math.max(p.halfW, Math.min(w - p.halfW, p.x));
        p.y = Math.max(p.halfH, Math.min(h - p.halfH, p.y));
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
      return 'rgb(' + Math.round(lerp(r1, r2, t)) + ',' + Math.round(lerp(g1, g2, t)) + ',' + Math.round(lerp(b1, b2, t)) + ')';
    };
    const mixShadow = (s1: string, s2: string, t: number): string => {
      const p = /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/;
      const m1 = s1.match(p);
      const m2 = s2.match(p);
      if (!m1 || !m2) return s1;
      const r = Math.round(lerp(+m1[1], +m2[1], t));
      const g = Math.round(lerp(+m1[2], +m2[2], t));
      const b = Math.round(lerp(+m1[3], +m2[3], t));
      const a = lerp(+(m1[4] ?? '1'), +(m2[4] ?? '1'), t);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(2) + ')';
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
        ctx.font = '900 ' + displaySize + 'px "ZCOOL KuaiLe", "Noto Sans SC", "system-ui", sans-serif';
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
  }, [measureText]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
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
      <div
        ref={fpsOverlayRef}
        style={{
          position: 'absolute',
          bottom: 8,
          left: 10,
          fontSize: '11px',
          fontFamily: 'monospace',
          color: 'rgba(255,255,255,0.35)',
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        0 FPS | 0 particles
      </div>
    </div>
  );
});

export default CloudCanvas;
