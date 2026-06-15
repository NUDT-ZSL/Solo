import React, { useEffect, useRef, useCallback } from 'react';
import type { LightParams, LightPath } from '../utils/lightEngine';
import {
  generateFrame,
  drawPathMarkers,
  drawDragPreview,
  lerpParams
} from '../utils/lightEngine';

interface LightCanvasProps {
  paths: LightPath[];
  params: LightParams;
  onRegisterPath: (path: LightPath) => void;
}

const LightCanvas: React.FC<LightCanvasProps> = ({
  paths,
  params,
  onRegisterPath
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const currentParamsRef = useRef<LightParams>({ ...params });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sizeRef.current = { w, h };
  }, []);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameRef.current += 1;
    const { w, h } = sizeRef.current;
    currentParamsRef.current = lerpParams(
      currentParamsRef.current,
      params,
      0.12
    );

    generateFrame(ctx, paths, currentParamsRef.current, frameRef.current, w, h, true);
    drawPathMarkers(ctx, paths, frameRef.current);
    drawDragPreview(
      ctx,
      dragStartRef.current,
      dragCurrentRef.current,
      frameRef.current
    );

    rafRef.current = requestAnimationFrame(loop);
  }, [paths, params]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loop]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let cx: number;
    let cy: number;
    if ('touches' in e) {
      const t = e.touches[0] ?? (e as React.TouchEvent).changedTouches[0];
      cx = t.clientX;
      cy = t.clientY;
    } else {
      cx = (e as React.MouseEvent).clientX;
      cy = (e as React.MouseEvent).clientY;
    }
    return {
      x: cx - rect.left,
      y: cy - rect.top
    };
  };

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    dragStartRef.current = getCanvasPoint(e);
    dragCurrentRef.current = dragStartRef.current;
  };

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStartRef.current) return;
    e.preventDefault();
    dragCurrentRef.current = getCanvasPoint(e);
  };

  const onUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStartRef.current) return;
    const end = getCanvasPoint(e);
    const start = dragStartRef.current;
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    if (dist >= 20) {
      onRegisterPath({
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y
      });
    }
    dragStartRef.current = null;
    dragCurrentRef.current = null;
  };

  return (
    <div ref={wrapRef} className="canvas-wrap">
      <canvas
        ref={canvasRef}
        className="light-canvas"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      />
      <div className="canvas-hint">
        <span className="hint-dot" />
        拖拽画布注册光绘路径
      </div>
    </div>
  );
};

export default LightCanvas;
