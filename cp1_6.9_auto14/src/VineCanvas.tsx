import React, { useRef, useEffect, useCallback } from 'react';
import { useVineDraw, perlinNoise, VinePath, VineNode } from './useVineDraw';

interface VineCanvasProps {
  vineDraw: ReturnType<typeof useVineDraw>;
  onFpsUpdate?: (fps: number) => void;
}

export const VineCanvas: React.FC<VineCanvasProps> = ({ vineDraw, onFpsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });
  const customCursorRef = useRef<HTMLCanvasElement | null>(null);

  const createVineCursor = useCallback((): HTMLCanvasElement => {
    const cursor = document.createElement('canvas');
    cursor.width = 32;
    cursor.height = 32;
    const ctx = cursor.getContext('2d')!;
    const cx = 16, cy = 16;

    ctx.strokeStyle = '#7CB342';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.bezierCurveTo(cx + 6, cy - 8, cx - 4, cy - 2, cx, cy + 6);
    ctx.bezierCurveTo(cx + 3, cy + 10, cx - 2, cy + 14, cx, cy + 14);
    ctx.stroke();

    ctx.strokeStyle = '#9CCC65';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    const tAngle = -0.5;
    const tStart = cx, tStartY = cy - 4;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const len = t * 8;
      const ang = t * Math.PI * 3 + tAngle;
      const r = (1 - t) * 2;
      const px = tStart + Math.cos(ang) * r - Math.sin(tAngle) * len;
      const py = tStartY + Math.sin(ang) * r + Math.cos(tAngle) * len;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy + 2);
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const len = t * 7;
      const ang = t * Math.PI * 3 + 1.5;
      const r = (1 - t) * 1.8;
      const px = cx + Math.cos(ang) * r - Math.sin(2) * len;
      const py = cy + 2 + Math.sin(ang) * r + Math.cos(2) * len;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(124, 179, 66, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy - 6);
    ctx.moveTo(cx, cy + 10);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();

    return cursor;
  }, []);

  useEffect(() => {
    customCursorRef.current = createVineCursor();
  }, [createVineCursor]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const drawBackgroundGlow = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const corners = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h }
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const c of corners) {
      const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 200);
      grd.addColorStop(0, 'rgba(100, 160, 80, 0.15)');
      grd.addColorStop(0.5, 'rgba(80, 130, 60, 0.08)');
      grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }, []);

  const drawVinePath = useCallback((ctx: CanvasRenderingContext2D, path: VinePath) => {
    const pts = path.points;
    if (pts.length < 2) return;

    ctx.save();
    ctx.globalAlpha = path.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = path.color;
    ctx.lineWidth = Math.max(0.5, path.thickness * path.scale);

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    const noiseAlpha = path.noiseIntensity;
    if (noiseAlpha > 0.05) {
      ctx.globalAlpha = path.opacity * noiseAlpha * 0.4;
      ctx.lineWidth = Math.max(0.3, path.thickness * path.scale * 0.7);
      ctx.strokeStyle = shadeColor(path.color, -15);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const noiseVal = perlinNoise(p.x, p.y, 0.08);
        const offX = noiseVal * 1.5;
        const offY = perlinNoise(p.x + 100, p.y + 100, 0.08) * 1.5;
        if (i === 0) ctx.moveTo(p.x + offX, p.y + offY);
        else {
          if (i < pts.length - 1) {
            const xc = (pts[i].x + offX + pts[i + 1].x) / 2;
            const yc = (pts[i].y + offY + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(p.x + offX, p.y + offY, xc, yc);
          }
        }
      }
      ctx.lineTo(last.x, last.y);
      ctx.stroke();

      ctx.globalAlpha = path.opacity * noiseAlpha * 0.3;
      ctx.lineWidth = Math.max(0.2, path.thickness * path.scale * 0.4);
      ctx.strokeStyle = shadeColor(path.color, 20);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const noiseVal = perlinNoise(p.x + 50, p.y + 50, 0.1);
        const offX = noiseVal * 1.2;
        const offY = perlinNoise(p.x + 150, p.y + 150, 0.1) * 1.2;
        if (i === 0) ctx.moveTo(p.x + offX, p.y + offY);
        else {
          if (i < pts.length - 1) {
            const xc = (pts[i].x + offX + pts[i + 1].x) / 2;
            const yc = (pts[i].y + offY + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(p.x + offX, p.y + offY, xc, yc);
          }
        }
      }
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    ctx.globalAlpha = path.opacity * 0.6;
    const highlightColor = shadeColor(path.color, 25);
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(0.3, path.thickness * path.scale * 0.25);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    ctx.restore();
  }, []);

  const drawNode = useCallback((ctx: CanvasRenderingContext2D, node: VineNode) => {
    ctx.save();
    ctx.globalAlpha = node.opacity;
    const rx = node.rx * node.scale;
    const ry = node.ry * node.scale;
    const grd = ctx.createRadialGradient(node.x - rx * 0.3, node.y - ry * 0.3, 0, node.x, node.y, Math.max(rx, ry));
    grd.addColorStop(0, shadeColor(node.color, 30));
    grd.addColorStop(0.6, node.color);
    grd.addColorStop(1, shadeColor(node.color, -20));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(node.x, node.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = node.opacity * 0.4;
    ctx.strokeStyle = shadeColor(node.color, 40);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }, []);

  const shadeColor = (color: string, percent: number): string => {
    let hex = color;
    if (hex.startsWith('rgb')) {
      const m = hex.match(/\d+/g);
      if (m && m.length >= 3) {
        const adj = (v: number) => Math.max(0, Math.min(255, v + (percent / 100) * 255));
        const r = Math.round(adj(parseInt(m[0])));
        const g = Math.round(adj(parseInt(m[1])));
        const b = Math.round(adj(parseInt(m[2])));
        return `rgb(${r},${g},${b})`;
      }
    }
    if (!hex.startsWith('#')) {
      const m2 = hex.match(/\d+/g);
      if (m2 && m2.length >= 3) {
        const adj = (v: number) => Math.max(0, Math.min(255, v + (percent / 100) * 255));
        const r = Math.round(adj(parseInt(m2[0])));
        const g = Math.round(adj(parseInt(m2[1])));
        const b = Math.round(adj(parseInt(m2[2])));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    const adj = (v: number) => Math.max(0, Math.min(255, v + Math.round((percent / 100) * 255)));
    const r = adj(parseInt(hex.slice(1, 3), 16));
    const g = adj(parseInt(hex.slice(3, 5), 16));
    const b = adj(parseInt(hex.slice(5, 7), 16));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#1C261C';
    ctx.fillRect(0, 0, w, h);
    drawBackgroundGlow(ctx, w, h);

    const state = vineDraw.getState();
    const sorted = [...state.paths].sort((a, b) => {
      const aDepth = a.isMain ? 0 : (a.parentId ? 2 : 1);
      const bDepth = b.isMain ? 0 : (b.parentId ? 2 : 1);
      return aDepth - bDepth;
    });

    for (const path of sorted) {
      drawVinePath(ctx, path);
    }

    for (const node of state.nodes) {
      drawNode(ctx, node);
    }

    fpsCounterRef.current.frames++;
    const now = performance.now();
    const elapsed = now - fpsCounterRef.current.lastTime;
    if (elapsed >= 500) {
      const fps = Math.round((fpsCounterRef.current.frames * 1000) / elapsed);
      onFpsUpdate?.(fps);
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.lastTime = now;
    }
  }, [vineDraw, drawBackgroundGlow, drawVinePath, drawNode, onFpsUpdate]);

  const tickLoop = useCallback(() => {
    vineDraw.tickAnimation();
    render();
    rafRef.current = requestAnimationFrame(tickLoop);
  }, [vineDraw, render]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tickLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tickLoop]);

  const getCanvasCoords = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const { x, y } = getCanvasCoords(e);
    mousePosRef.current = { x, y };
    isDrawingRef.current = true;
    vineDraw.startDraw(x, y);
  }, [getCanvasCoords, vineDraw]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    mousePosRef.current = { x, y };
    if (isDrawingRef.current) {
      vineDraw.continueDraw(x, y);
    }
  }, [getCanvasCoords, vineDraw]);

  const handleMouseUp = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      vineDraw.endDraw();
    }
  }, [vineDraw]);

  const handleMouseLeave = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      vineDraw.endDraw();
    }
  }, [vineDraw]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    mousePosRef.current = { x, y };
    isDrawingRef.current = true;
    vineDraw.startDraw(x, y);
    e.preventDefault();
  }, [vineDraw]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    mousePosRef.current = { x, y };
    if (isDrawingRef.current) {
      vineDraw.continueDraw(x, y);
    }
    e.preventDefault();
  }, [vineDraw]);

  const handleTouchEnd = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      vineDraw.endDraw();
    }
  }, [vineDraw]);

  const cursorUrl = customCursorRef.current ? customCursorRef.current.toDataURL() : '';

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        minWidth: 800,
        minHeight: 600,
        cursor: cursorUrl ? `url(${cursorUrl}) 16 16, crosshair` : 'crosshair',
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};
