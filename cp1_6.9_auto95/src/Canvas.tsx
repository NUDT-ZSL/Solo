import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import type { WeaveRule } from './App';
import { INITIAL_COLORS } from './App';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  baseOpacity: number;
  velocityX: number;
  velocityY: number;
  life: number;
}

interface FuzzParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  angle: number;
  length: number;
  drift: number;
}

interface Line {
  id: number;
  direction: 'warp' | 'weft';
  particles: Particle[];
  index: number;
  color: string;
  pressure: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface CanvasProps {
  weaveRule: WeaveRule;
  onLineAdded: () => void;
  onPressureChange: (pressure: number) => void;
}

export interface CanvasRef {
  reset: () => void;
  exportPNG: () => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const EXPORT_WIDTH = 1920;
const EXPORT_HEIGHT = 1080;

const perlin = {
  permutation: new Uint8Array(512),
  init() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.permutation[i] = p[i & 255];
  },
  fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  },
  lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
  },
  grad(hash: number, x: number, y: number) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  },
  noise(x: number, y: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;
    return this.lerp(
      this.lerp(
        this.grad(this.permutation[A], x, y),
        this.grad(this.permutation[B], x - 1, y),
        u
      ),
      this.lerp(
        this.grad(this.permutation[A + 1], x, y - 1),
        this.grad(this.permutation[B + 1], x - 1, y - 1),
        u
      ),
      v
    );
  },
};

perlin.init();

function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${((1 << 24) | (lr << 16) | (lg << 8) | lb).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function getWeaveInterval(rule: WeaveRule): number {
  switch (rule) {
    case 'plain':
      return 2;
    case 'twill':
      return 3;
    case 'satin':
      return 5;
  }
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(
  ({ weaveRule, onLineAdded, onPressureChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const linesRef = useRef<Line[]>([]);
    const fuzzRef = useRef<FuzzParticle[]>([]);
    const warpCountRef = useRef(0);
    const weftCountRef = useRef(0);
    const lineIdRef = useRef(0);

    const isDrawingRef = useRef(false);
    const currentParticlesRef = useRef<Particle[]>([]);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const accumulatedDistanceRef = useRef(0);
    const pressStartTimeRef = useRef(0);
    const currentColorRef = useRef(INITIAL_COLORS[0]);
    const currentPressureRef = useRef(0);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);

    const weaveRuleRef = useRef(weaveRule);
    const intersectionCacheRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
      weaveRuleRef.current = weaveRule;
      intersectionCacheRef.current.clear();
    }, [weaveRule]);

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);

      const rule = weaveRuleRef.current;
      const interval = getWeaveInterval(rule);
      const noiseScale = 0.1;
      const noiseAmp = 0.05;

      const noiseCanvas = document.createElement('canvas');
      noiseCanvas.width = w;
      noiseCanvas.height = h;
      const noiseCtx = noiseCanvas.getContext('2d');
      if (noiseCtx) {
        const imgData = noiseCtx.createImageData(w, h);
        const data = imgData.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const n = perlin.noise(x * noiseScale, y * noiseScale);
            const v = 255 - Math.floor(Math.abs(n) * 255 * noiseAmp * 2);
            data[idx] = v;
            data[idx + 1] = v;
            data[idx + 2] = v;
            data[idx + 3] = 255;
          }
        }
        noiseCtx.putImageData(imgData, 0, 0);
      }

      const sortedLines = [...linesRef.current].sort((a, b) => a.id - b.id);

      sortedLines.forEach((line) => {
        line.particles.forEach((p) => {
          const dx = Math.sin(p.life * 0.02 + p.x * 0.01) * 0.3;
          const dy = Math.cos(p.life * 0.015 + p.y * 0.01) * 0.3;
          p.x += dx + p.velocityX;
          p.y += dy + p.velocityY;
          p.velocityX *= 0.98;
          p.velocityY *= 0.98;
          p.life++;
        });
      });

      const allParticles: (Particle & { lineId: number; direction: 'warp' | 'weft'; lineIndex: number })[] = [];
      sortedLines.forEach((line) => {
        line.particles.forEach((p) => {
          allParticles.push({
            ...p,
            lineId: line.id,
            direction: line.direction,
            lineIndex: line.index,
          });
        });
      });

      const getIntersectionOpacity = (p1: Particle, p2: Particle, idx1: number, idx2: number, dir1: 'warp' | 'weft', dir2: 'warp' | 'weft'): number | null => {
        if (dir1 === dir2) return null;
        const cacheKey = `${idx1}-${idx2}-${dir1}-${dir2}`;
        const cached = intersectionCacheRef.current.get(cacheKey);
        if (cached !== undefined) return cached;

        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        if (dist > (p1.size + p2.size) * 0.8) return null;

        const warpIdx = dir1 === 'warp' ? idx1 : idx2;
        const weftIdx = dir1 === 'weft' ? idx1 : idx2;
        const isWarpOnTop = ((warpIdx + weftIdx) % interval) < Math.floor(interval / 2);
        const result = isWarpOnTop ? (dir1 === 'warp' ? 1 : 0.8) : (dir1 === 'weft' ? 1 : 0.8);
        intersectionCacheRef.current.set(cacheKey, result);
        return result;
      };

      const cellSize = 20;
      const grid: Map<string, typeof allParticles> = new Map();
      allParticles.forEach((p) => {
        const gx = Math.floor(p.x / cellSize);
        const gy = Math.floor(p.y / cellSize);
        const key = `${gx},${gy}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(p);
      });

      allParticles.forEach((p) => {
        let finalOpacity = p.baseOpacity;
        const gx = Math.floor(p.x / cellSize);
        const gy = Math.floor(p.y / cellSize);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighbors = grid.get(`${gx + dx},${gy + dy}`);
            if (!neighbors) continue;
            for (const np of neighbors) {
              if (np.lineId === p.lineId) continue;
              const op = getIntersectionOpacity(p, np, p.lineIndex, np.lineIndex, p.direction, np.direction);
              if (op !== null && op < finalOpacity) {
                finalOpacity = op;
              }
            }
          }
        }
        p.opacity = finalOpacity;
      });

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      sortedLines.forEach((line) => {
        const avgPressure = line.pressure;
        line.particles.forEach((p) => {
          const rgb = hexToRgb(p.color);
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${p.opacity * (0.8 + avgPressure * 0.2)})`);
          gradient.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${p.opacity * 0.4 * (0.7 + avgPressure * 0.3)})`);
          gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      ctx.restore();

      fuzzRef.current.forEach((f) => {
        f.x += Math.sin(f.angle + f.drift) * 0.1;
        f.y += Math.cos(f.angle + f.drift) * 0.1;
        f.drift += 0.02;

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        const rgb = hexToRgb(f.color);
        const grad = ctx.createLinearGradient(0, 0, f.length, 0);
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${f.opacity})`);
        grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = f.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(f.length, 0);
        ctx.stroke();
        ctx.restore();
      });

      ctx.globalAlpha = 0.06;
      ctx.drawImage(noiseCanvas, 0, 0);
      ctx.globalAlpha = 1;

      if (isDrawingRef.current && currentParticlesRef.current.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pressure = currentPressureRef.current;
        currentParticlesRef.current.forEach((p) => {
          const rgb = hexToRgb(p.color);
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${p.baseOpacity * (0.8 + pressure * 0.2)})`);
          gradient.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${p.baseOpacity * 0.4})`);
          gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(render);
    }, []);

    useEffect(() => {
      animationRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(animationRef.current);
    }, [render]);

    const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const generateFuzzParticles = (line: Line) => {
      const count = 50 + Math.floor(Math.random() * 51);
      const lightColor = lightenColor(line.color, 0.3);
      const particles = line.particles;
      if (particles.length < 2) return;

      for (let i = 0; i < count; i++) {
        const t = Math.random();
        const idx = Math.floor(t * (particles.length - 1));
        const p1 = particles[idx];
        const p2 = particles[Math.min(idx + 1, particles.length - 1)];
        const localT = Math.random();
        const baseX = p1.x + (p2.x - p1.x) * localT;
        const baseY = p1.y + (p2.y - p1.y) * localT;

        const lineAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const perpendicularAngle = lineAngle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        const offset = (Math.random() - 0.5) * 8;

        fuzzRef.current.push({
          x: baseX + Math.cos(perpendicularAngle) * offset,
          y: baseY + Math.sin(perpendicularAngle) * offset,
          size: 0.5 + Math.random() * 1,
          color: lightColor,
          opacity: 0.2 + Math.random() * 0.2,
          angle: perpendicularAngle + (Math.random() - 0.5) * 0.8,
          length: 1 + Math.random() * 4,
          drift: Math.random() * Math.PI * 2,
        });
      }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDrawingRef.current = true;
      pressStartTimeRef.current = Date.now();
      currentPressureRef.current = 0;
      currentParticlesRef.current = [];
      accumulatedDistanceRef.current = 0;

      const pos = getCanvasCoords(e);
      lastPointRef.current = pos;
      startPointRef.current = pos;
      currentColorRef.current = INITIAL_COLORS[Math.floor(Math.random() * INITIAL_COLORS.length)];

      const sizePressureFactor = 1 + currentPressureRef.current * 0.5;
      currentParticlesRef.current.push({
        x: pos.x,
        y: pos.y,
        size: (2 + Math.random() * 3) * sizePressureFactor,
        color: currentColorRef.current,
        opacity: 1,
        baseOpacity: 0.8 + currentPressureRef.current * 0.2,
        velocityX: 0,
        velocityY: 0,
        life: 0,
      });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || !lastPointRef.current) return;

      const pos = getCanvasCoords(e);
      const last = lastPointRef.current;
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const elapsed = Date.now() - pressStartTimeRef.current;
      const pressure = Math.min(100, elapsed / 20) / 100;
      currentPressureRef.current = pressure;
      onPressureChange(Math.round(pressure * 100));

      accumulatedDistanceRef.current += distance;

      const speed = distance;
      const baseSpacing = 5;
      const maxSpacing = 12;
      const spacingFactor = Math.min(speed / 30, 1);
      const currentSpacing = baseSpacing + (maxSpacing - baseSpacing) * spacingFactor;

      while (accumulatedDistanceRef.current >= currentSpacing) {
        const t = currentSpacing / distance;
        const newX = last.x + dx * t;
        const newY = last.y + dy * t;

        const sizePressureFactor = 1 + pressure * 0.5;
        const speedSizeFactor = 1 - spacingFactor * 0.3;
        const particle: Particle = {
          x: newX,
          y: newY,
          size: (2 + Math.random() * 3) * sizePressureFactor * speedSizeFactor,
          color: currentColorRef.current,
          opacity: 1,
          baseOpacity: 0.75 + pressure * 0.25,
          velocityX: (Math.random() - 0.5) * 0.3 * spacingFactor,
          velocityY: (Math.random() - 0.5) * 0.3 * spacingFactor,
          life: 0,
        };
        currentParticlesRef.current.push(particle);

        lastPointRef.current = { x: newX, y: newY };
        accumulatedDistanceRef.current -= currentSpacing;
      }

      lastPointRef.current = pos;
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (currentParticlesRef.current.length > 3 && startPointRef.current) {
        const start = startPointRef.current;
        const last = currentParticlesRef.current[currentParticlesRef.current.length - 1];
        const lineDx = last.x - start.x;
        const lineDy = last.y - start.y;
        const isWeft = Math.abs(lineDx) >= Math.abs(lineDy);

        const line: Line = {
          id: lineIdRef.current++,
          direction: isWeft ? 'weft' : 'warp',
          particles: [...currentParticlesRef.current],
          index: isWeft ? weftCountRef.current++ : warpCountRef.current++,
          color: currentColorRef.current,
          pressure: currentPressureRef.current,
          startX: start.x,
          startY: start.y,
          endX: last.x,
          endY: last.y,
        };

        linesRef.current.push(line);
        generateFuzzParticles(line);
        intersectionCacheRef.current.clear();
        onLineAdded();
      }

      currentParticlesRef.current = [];
      lastPointRef.current = null;
      startPointRef.current = null;
      accumulatedDistanceRef.current = 0;
    };

    const handleMouseLeave = () => {
      if (isDrawingRef.current) {
        handleMouseUp();
      }
    };

    const reset = useCallback(() => {
      linesRef.current = [];
      fuzzRef.current = [];
      warpCountRef.current = 0;
      weftCountRef.current = 0;
      lineIdRef.current = 0;
      intersectionCacheRef.current.clear();
      onPressureChange(0);
    }, [onPressureChange]);

    const exportPNG = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = EXPORT_WIDTH;
      exportCanvas.height = EXPORT_HEIGHT;
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) return;

      const scaleX = EXPORT_WIDTH / canvas.width;
      const scaleY = EXPORT_HEIGHT / canvas.height;

      exportCtx.fillStyle = '#FFFFFF';
      exportCtx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

      const noiseScale = 0.1;
      const noiseAmp = 0.05;
      const noiseCanvas = document.createElement('canvas');
      noiseCanvas.width = EXPORT_WIDTH;
      noiseCanvas.height = EXPORT_HEIGHT;
      const noiseCtx = noiseCanvas.getContext('2d');
      if (noiseCtx) {
        const imgData = noiseCtx.createImageData(EXPORT_WIDTH, EXPORT_HEIGHT);
        const data = imgData.data;
        for (let y = 0; y < EXPORT_HEIGHT; y++) {
          for (let x = 0; x < EXPORT_WIDTH; x++) {
            const idx = (y * EXPORT_WIDTH + x) * 4;
            const n = perlin.noise(x * noiseScale / scaleX, y * noiseScale / scaleY);
            const v = 255 - Math.floor(Math.abs(n) * 255 * noiseAmp * 2);
            data[idx] = v;
            data[idx + 1] = v;
            data[idx + 2] = v;
            data[idx + 3] = 255;
          }
        }
        noiseCtx.putImageData(imgData, 0, 0);
      }

      exportCtx.save();
      exportCtx.scale(scaleX, scaleY);
      exportCtx.drawImage(canvas, 0, 0);
      exportCtx.restore();

      exportCtx.globalAlpha = 0.06;
      exportCtx.drawImage(noiseCanvas, 0, 0);
      exportCtx.globalAlpha = 1;

      const link = document.createElement('a');
      link.download = `光流织机_${Date.now()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    }, []);

    useImperativeHandle(ref, () => ({ reset, exportPNG }), [reset, exportPNG]);

    return (
      <div className="canvas-frame">
        <div className="canvas-container">
          <div className="canvas-controls">
            <button className="btn-reset" onClick={reset}>
              重置
            </button>
            <button className="btn-export" onClick={exportPNG}>
              导出PNG
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ width: '100%', maxWidth: `${CANVAS_WIDTH}px`, height: 'auto' }}
          />
        </div>
      </div>
    );
  }
);

Canvas.displayName = 'Canvas';

export default Canvas;
