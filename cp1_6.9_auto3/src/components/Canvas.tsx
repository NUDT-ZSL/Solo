import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import {
  GeometricShape,
  Particle,
  GeometricConfig,
  generateShapes,
  updateColorsForTheme,
  findShapeAtPoint,
  createExplosionParticles,
  addParticlesWithLimit,
  triggerReassemble,
  easeInOut,
  lerp,
  interpolateHSL,
  cloneHSL,
  cubicBezierPoint,
  hslToString,
  drawShapeOnContext,
  getExportDimensions,
  generateShareDataURI,
  THEME_PALETTES
} from '../utils/geometry';

interface CanvasProps {
  config: GeometricConfig;
  configVersion: number;
  onExportRequest?: () => void;
  onExportResult?: (data: { pngDataUrl: string; shareDataUri: string }) => void;
  exportTriggerVersion?: number;
}

const LOGICAL_W = 1600;
const LOGICAL_H = 900;
const GRID_SPACING = 50;
const HOVER_DURATION = 300;

const GeometryCanvas: React.FC<CanvasProps> = ({ config, configVersion, onExportRequest, onExportResult, exportTriggerVersion }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<GeometricShape[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastThemeRef = useRef(config.colorTheme);
  const lastDensityRef = useRef(config.density);
  const lastShapesRef = useRef(config.shapeTypes.slice().sort().join(','));
  const hoveredIdRef = useRef<string | null>(null);
  const gridOpacityRef = useRef(0.05);
  const gridOpacityTargetRef = useRef(0.05);
  const gridFadeUntilRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const [, force] = useState(0);

  const forceUpdate = useCallback(() => force(n => n + 1), []);

  const scaleRef = useRef({ x: 1, y: 1, offsetX: 0, offsetY: 0 });

  const convertClientToLogical = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    const { offsetX, offsetY, x, y } = scaleRef.current;
    const px = sx * LOGICAL_W;
    const py = sy * LOGICAL_H;
    return { x: (px - offsetX) / x, y: (py - offsetY) / y };
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth;
    const cssH = container.clientHeight;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const scaleX = cssW / LOGICAL_W;
    const scaleY = cssH / LOGICAL_H;
    const use = Math.min(scaleX, scaleY);
    const offX = (LOGICAL_W - LOGICAL_W * use / use) / 2;
    const offY = (LOGICAL_H - LOGICAL_H * use / use) / 2;
    scaleRef.current = { x: 1, y: 1, offsetX: offX, offsetY: offY };
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr * (cssW / LOGICAL_W), 0, 0, dpr * (cssH / LOGICAL_H), 0, 0);
    }
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => {
    const shapes = shapesRef.current;
    const now = performance.now();
    if (shapes.length === 0) {
      shapesRef.current = generateShapes(config, LOGICAL_W, LOGICAL_H);
    } else {
      const curShapesKey = config.shapeTypes.slice().sort().join(',');
      if (config.density !== lastDensityRef.current || curShapesKey !== lastShapesRef.current) {
        shapesRef.current = generateShapes(config, LOGICAL_W, LOGICAL_H);
      } else if (config.colorTheme !== lastThemeRef.current) {
        updateColorsForTheme(shapesRef.current, config.colorTheme, now);
      }
    }
    lastThemeRef.current = config.colorTheme;
    lastDensityRef.current = config.density;
    lastShapesRef.current = config.shapeTypes.slice().sort().join(',');
  }, [configVersion, config]);

  useEffect(() => {
    if (!exportTriggerVersion || !onExportResult) return;
    const { w: expW, h: expH } = getExportDimensions();
    const temp = document.createElement('canvas');
    temp.width = expW;
    temp.height = expH;
    const tctx = temp.getContext('2d');
    if (!tctx) return;
    tctx.fillStyle = '#0D0D0D';
    tctx.fillRect(0, 0, expW, expH);
    const sx = expW / LOGICAL_W;
    const sy = expH / LOGICAL_H;
    tctx.save();
    tctx.scale(sx, sy);
    shapesRef.current.forEach(s => {
      const col = { h: s.targetColor.h, s: s.targetColor.s, l: s.targetColor.l, a: 1 };
      drawShapeOnContext(tctx, s, s.baseX, s.baseY, s.baseRotation, col);
    });
    tctx.restore();
    const png = temp.toDataURL('image/png');
    const share = generateShareDataURI(shapesRef.current, config);
    onExportResult({ pngDataUrl: png, shareDataUri: share });
  }, [exportTriggerVersion, onExportResult, config]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = convertClientToLogical(e.clientX, e.clientY);
    const now = performance.now();
    const shape = findShapeAtPoint(x, y, shapesRef.current);
    const newId = shape ? shape.id : null;
    if (newId !== hoveredIdRef.current) {
      shapesRef.current.forEach(s => {
        if (s.id === hoveredIdRef.current && !s.isExploded) {
          s.isHovered = false;
        }
        if (s.id === newId && !s.isExploded) {
          s.isHovered = true;
          s.hoverStartTime = now;
        }
      });
      hoveredIdRef.current = newId;
    }
    gridOpacityTargetRef.current = 0.2;
    gridFadeUntilRef.current = now + 500;
  }, [convertClientToLogical]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = convertClientToLogical(e.clientX, e.clientY);
    const now = performance.now();
    const shape = findShapeAtPoint(x, y, shapesRef.current);
    if (shape && !shape.isExploded) {
      shape.isExploded = true;
      shape.isHovered = false;
      const ps = createExplosionParticles(shape, now);
      particlesRef.current = addParticlesWithLimit(particlesRef.current, ps);
      if (hoveredIdRef.current === shape.id) hoveredIdRef.current = null;
      gridOpacityTargetRef.current = 0.2;
      gridFadeUntilRef.current = now + 500;
    }
  }, [convertClientToLogical]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = convertClientToLogical(e.clientX, e.clientY);
    const now = performance.now();
    const shape = findShapeAtPoint(x, y, shapesRef.current);
    if (!shape) {
      const res = triggerReassemble(shapesRef.current, particlesRef.current, now);
      shapesRef.current = res.shapes;
      if (res.removedIds.size > 0) {
        particlesRef.current = particlesRef.current.filter(p => !res.removedIds.has(p.id));
      }
      gridOpacityTargetRef.current = 0.2;
      gridFadeUntilRef.current = now + 800;
    }
  }, [convertClientToLogical]);

  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animFrameRef.current = requestAnimationFrame(render);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(render);
      return;
    }

    const shapes = shapesRef.current;
    const particles = particlesRef.current;

    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    if (now > gridFadeUntilRef.current) {
      gridOpacityTargetRef.current = 0.05;
    }
    gridOpacityRef.current = lerp(gridOpacityRef.current, gridOpacityTargetRef.current, 0.1);

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${gridOpacityRef.current})`;
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= LOGICAL_W; gx += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, LOGICAL_H);
      ctx.stroke();
    }
    for (let gy = 0; gy <= LOGICAL_H; gy += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(LOGICAL_W, gy);
      ctx.stroke();
    }
    ctx.restore();

    shapes.forEach(s => {
      if (s.colorTransitionDuration > 0 && s.colorTransitionStart > 0) {
        const t = Math.min(1, (now - s.colorTransitionStart) / s.colorTransitionDuration);
        const et = easeInOut(t);
        s.currentColor = interpolateHSL(s.baseColor, s.targetColor, et);
        if (t >= 1) {
          s.baseColor = cloneHSL(s.targetColor);
          s.colorTransitionDuration = 0;
          s.colorTransitionStart = 0;
        }
      }

      let drawX = s.currentX;
      let drawY = s.currentY;
      let drawRot = s.rotation;
      let drawColor = s.currentColor;

      if (s.reassembling) {
        const delay = Math.max(0, s.reassembleStartTime - now);
        if (delay > 0) {
          drawX = s.reassembleFromX;
          drawY = s.reassembleFromY;
          drawRot = s.reassembleFromRotation;
        } else {
          const localNow = now - s.reassembleStartTime;
          const t = Math.min(1, localNow / s.reassembleDuration);
          const et = easeInOut(t);
          const c1x = s.reassembleFromX + (s.baseX - s.reassembleFromX) * 0.2 - 40;
          const c1y = s.reassembleFromY + (s.baseY - s.reassembleFromY) * 0.2 - 60;
          const c2x = s.reassembleFromX + (s.baseX - s.reassembleFromX) * 0.8 + 40;
          const c2y = s.reassembleFromY + (s.baseY - s.reassembleFromY) * 0.8 + 30;
          const pt = cubicBezierPoint(s.reassembleFromX, s.reassembleFromY, c1x, c1y, c2x, c2y, s.baseX, s.baseY, et);
          drawX = pt.x;
          drawY = pt.y;
          drawRot = lerp(s.reassembleFromRotation, s.baseRotation, et);
          s.currentX = drawX;
          s.currentY = drawY;
          s.rotation = drawRot;
          if (t >= 1) {
            s.reassembling = false;
            s.currentX = s.baseX;
            s.currentY = s.baseY;
            s.rotation = s.baseRotation;
          }
        }
      } else if (!s.isExploded) {
        if (s.isHovered && s.hoverStartTime > 0) {
          const t = Math.min(1, (now - s.hoverStartTime) / HOVER_DURATION);
          const et = easeInOut(t);
          const dx = (drawX - LOGICAL_W / 2);
          const dy = (drawY - LOGICAL_H / 2);
          const len = Math.hypot(dx, dy) || 1;
          const pushAway = 18 * et;
          drawX = s.baseX + (dx / len) * pushAway;
          drawY = s.baseY + (dy / len) * pushAway;
          const rotAngle = (15 + Math.random() * 15) * (Math.PI / 180) * et;
          const dir = (s.gridX + s.gridY) % 2 === 0 ? 1 : -1;
          drawRot = s.baseRotation + rotAngle * dir;
          const satBoost = 20 * et;
          drawColor = {
            h: s.currentColor.h,
            s: Math.min(100, s.currentColor.s + satBoost),
            l: s.currentColor.l,
            a: s.currentColor.a
          };
          s.currentX = drawX;
          s.currentY = drawY;
          s.rotation = drawRot;
        } else if (hoveredIdRef.current !== s.id) {
          if (Math.abs(s.currentX - s.baseX) > 0.1 || Math.abs(s.currentY - s.baseY) > 0.1 || Math.abs(s.rotation - s.baseRotation) > 0.001) {
            const returnStart = (s as GeometricShape & { _returnStart?: number })._returnStart;
            if (!returnStart) {
              (s as GeometricShape & { _returnStart?: number })._returnStart = now;
            }
            const st = (s as GeometricShape & { _returnStart?: number })._returnStart!;
            const t = Math.min(1, (now - st) / HOVER_DURATION);
            const et = easeInOut(t);
            drawX = lerp(s.currentX, s.baseX, et);
            drawY = lerp(s.currentY, s.baseY, et);
            drawRot = lerp(s.rotation, s.baseRotation, et);
            s.currentX = drawX;
            s.currentY = drawY;
            s.rotation = drawRot;
            if (t >= 1) (s as GeometricShape & { _returnStart?: number })._returnStart = undefined;
          }
        }
      }

      if (!s.isExploded) {
        drawShapeOnContext(ctx, s, drawX, drawY, drawRot, drawColor);
      }
    });

    const keep: Particle[] = [];
    for (const p of particles) {
      const elapsed = now - p.startTime;
      if (elapsed >= p.duration) continue;
      const dtMs = 16.6;
      p.x += p.vx * (dtMs / 1000);
      p.y += p.vy * (dtMs / 1000);
      p.vx *= 0.992;
      p.vy *= 0.992;
      const t = elapsed / p.duration;
      const alpha = Math.max(0, 1 - t);
      const col = { h: p.color.h, s: p.color.s, l: p.color.l, a: alpha };
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = hslToString(col);
      ctx.fill();
      keep.push(p);
    }
    if (keep.length !== particles.length) particlesRef.current = keep;

    animFrameRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    if (shapesRef.current.length === 0) {
      shapesRef.current = generateShapes(config, LOGICAL_W, LOGICAL_H);
    }
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render, config]);

  useEffect(() => {
    forceUpdate();
  }, [forceUpdate, onExportRequest]);

  const palette = THEME_PALETTES[config.colorTheme];
  const _unused = palette;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{ display: 'block', cursor: hoveredIdRef.current ? 'pointer' : 'crosshair' }}
      />
    </div>
  );
};

export default GeometryCanvas;
