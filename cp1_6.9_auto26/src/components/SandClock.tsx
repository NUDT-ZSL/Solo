import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { ParticleEngine, EngineStats, Geometry } from './ParticleEngine';

export interface SandClockHandle {
  start: () => void;
  stop: () => void;
  reset: () => void;
  getStats: () => EngineStats;
  setBlocked: (ms: number) => void;
  setSpeedBoost: (ms: number) => void;
  setTilt: (angle: number, ms: number) => void;
  addRipple: (x: number, y: number) => void;
}

interface SandClockProps {
  wishText: string;
  onComplete: () => void;
  onStatsChange: (stats: EngineStats) => void;
  isComplete: boolean;
  completePhase: number;
}

export const SandClock = forwardRef<SandClockHandle, SandClockProps>(({ wishText, onComplete, onStatsChange, isComplete, completePhase }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const rafRenderRef = useRef<number | null>(null);
  const dprRef = useRef(1);
  const [size, setSize] = useState({ w: 600, h: 800 });

  const gestureRef = useRef<{
    startX: number; startY: number; startTime: number; active: boolean; lastX: number; lastY: number;
  }>({ startX: 0, startY: 0, startTime: 0, active: false, lastX: 0, lastY: 0 });

  const textParticlesRef = useRef<Array<{
    x: number; y: number; startX: number; startY: number; targetX: number; targetY: number;
    phase: 'rising' | 'floating' | 'fading';
    phaseStart: number; r: number; color: string; alpha: number;
    driftX: number; driftY: number;
  }>>([]);

  const haloParticlesRef = useRef<Array<{
    angle: number; dist: number; speed: number; r: number; alpha: number; phase: number;
  }>>([]);

  const buildTextParticles = useCallback((text: string, geom: Geometry) => {
    const chars = text.split('');
    if (chars.length === 0) return;
    const particles: typeof textParticlesRef.current = [];
    const letterSpacing = chars.length * 0.08;
    const totalWidth = Math.min(geom.width * 0.8, 500);
    const perLetter = Math.max(20, Math.min(30, Math.floor(600 / chars.length)));
    const letterWidth = totalWidth / chars.length;
    const startX = geom.centerX - totalWidth / 2 + letterWidth / 2;
    const targetBaseY = geom.bottomY - 150;
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = Math.ceil(letterWidth);
    offscreenCanvas.height = 60;
    const octx = offscreenCanvas.getContext('2d')!;
    octx.font = 'bold 48px "Poppins", "Montserrat", sans-serif';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';

    chars.forEach((ch, idx) => {
      octx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      octx.fillStyle = '#fff';
      octx.fillText(ch, offscreenCanvas.width / 2, 30);
      const data = octx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height).data;
      const points: Array<[number, number]> = [];
      for (let py = 0; py < offscreenCanvas.height; py += 3) {
        for (let px = 0; px < offscreenCanvas.width; px += 3) {
          const a = data[(py * offscreenCanvas.width + px) * 4 + 3];
          if (a > 128) points.push([px, py]);
        }
      }
      const chosen: Array<[number, number]> = [];
      if (points.length > 0) {
        for (let i = 0; i < perLetter; i++) {
          chosen.push(points[Math.floor(Math.random() * points.length)]);
        }
      } else {
        for (let i = 0; i < perLetter; i++) {
          chosen.push([Math.random() * offscreenCanvas.width, Math.random() * offscreenCanvas.height]);
        }
      }
      const letterCenterX = startX + idx * letterWidth;
      chosen.forEach(([px, py]) => {
        const targetX = letterCenterX + (px - offscreenCanvas.width / 2);
        const targetY = targetBaseY + (py - 30);
        particles.push({
          x: geom.centerX + (Math.random() - 0.5) * 50,
          y: geom.bottomY - 10 + Math.random() * 20,
          startX: geom.centerX + (Math.random() - 0.5) * 50,
          startY: geom.bottomY - 10 + Math.random() * 20,
          targetX,
          targetY,
          phase: 'rising',
          phaseStart: performance.now() + idx * 120,
          r: 2 + Math.random() * 2,
          color: Math.random() < 0.5 ? '#ffd700' : '#ffeb7a',
          alpha: 0,
          driftX: (Math.random() - 0.5) * 0.5,
          driftY: (Math.random() - 0.5) * 0.5,
        });
      });
    });
    textParticlesRef.current = particles;
  }, []);

  const buildHaloParticles = useCallback((geom: Geometry) => {
    const arr: typeof haloParticlesRef.current = [];
    const count = 180;
    for (let i = 0; i < count; i++) {
      arr.push({
        angle: (i / count) * Math.PI * 2,
        dist: 50 + Math.random() * 80,
        speed: 0.3 + Math.random() * 0.5,
        r: 2 + Math.random() * 3,
        alpha: 0,
        phase: Math.random() * Math.PI * 2
      });
    }
    haloParticlesRef.current = arr;
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    if (isComplete) {
      const geom = engineRef.current.getGeometry();
      buildTextParticles(wishText || '时光永驻', geom);
      buildHaloParticles(geom);
    }
  }, [isComplete, wishText, buildTextParticles, buildHaloParticles]);

  useImperativeHandle(ref, () => ({
    start: () => engineRef.current?.start(),
    stop: () => engineRef.current?.stop(),
    reset: () => {
      engineRef.current?.reset();
      textParticlesRef.current = [];
      haloParticlesRef.current = [];
    },
    getStats: () => engineRef.current?.getStats() || { topCount: 0, bottomCount: 0, elapsedSeconds: 0, isComplete: false },
    setBlocked: (ms) => engineRef.current?.setBlocked(ms),
    setSpeedBoost: (ms) => engineRef.current?.setSpeedBoost(ms),
    setTilt: (angle, ms) => engineRef.current?.setTilt(angle, ms),
    addRipple: (x, y) => engineRef.current?.addRipple(x, y),
  }));

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let w = rect.width;
      let h = rect.height;
      if (w / h > 3 / 4) w = h * 3 / 4;
      else h = w * 4 / 3;
      setSize({ w, h });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    canvas.width = Math.floor(size.w * dpr);
    canvas.height = Math.floor(size.h * dpr);
    canvas.style.width = size.w + 'px';
    canvas.style.height = size.h + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!engineRef.current) {
      engineRef.current = new ParticleEngine(size.w, size.h);
    } else {
      engineRef.current.resize(size.w, size.h);
    }
    engineRef.current.setOnStatsChange(onStatsChange);
    engineRef.current.setOnComplete(onComplete);

    const render = () => {
      ctx.clearRect(0, 0, size.w, size.h);
      engineRef.current?.render(ctx);
      renderHalo(ctx);
      renderTextParticles(ctx);
      rafRenderRef.current = requestAnimationFrame(render);
    };
    rafRenderRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRenderRef.current) cancelAnimationFrame(rafRenderRef.current);
    };
  }, [size, onStatsChange, onComplete]);

  const renderHalo = (ctx: CanvasRenderingContext2D) => {
    const now = performance.now();
    if (!engineRef.current) return;
    const geom = engineRef.current.getGeometry();
    const cx = geom.centerX;
    const cy = (geom.topY + geom.bottomY) / 2;
    const arr = haloParticlesRef.current;
    if (arr.length === 0) return;
    const t = Math.min(1, completePhase / 2500);
    const expansion = t * 300;
    const baseAlpha = Math.min(1, completePhase / 600) * Math.max(0, 1 - (completePhase - 2000) / 3000);
    for (const p of arr) {
      const d = p.dist + expansion * p.speed;
      const x = cx + Math.cos(p.angle + now * 0.0003) * d;
      const y = cy + Math.sin(p.angle + now * 0.0002) * d;
      const alpha = baseAlpha * (0.4 + 0.6 * Math.sin(now * 0.003 + p.phase));
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(x, y, p.r * (1 + t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (t > 0.1) {
      ctx.save();
      const ringAlpha = Math.max(0, Math.sin(t * Math.PI)) * 0.4 * baseAlpha;
      ctx.strokeStyle = `rgba(255, 215, 0, ${ringAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 50 + expansion * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  const renderTextParticles = (ctx: CanvasRenderingContext2D) => {
    const arr = textParticlesRef.current;
    if (arr.length === 0) return;
    const now = performance.now();
    for (const p of arr) {
      const since = now - p.phaseStart;
      if (since < 0) continue;
      if (p.phase === 'rising') {
        const t = Math.min(1, since / 1800);
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        p.x = p.startX + (p.targetX - p.startX) * easeT;
        p.y = p.startY + (p.targetY - p.startY) * easeT;
        p.alpha = easeT;
        if (t >= 1) {
          p.phase = 'floating';
          p.phaseStart = now;
        }
      } else if (p.phase === 'floating') {
        p.x = p.targetX + Math.sin(now * 0.002 + p.targetX) * 1.5 + p.driftX;
        p.y = p.targetY + Math.cos(now * 0.0025 + p.targetY) * 1.5 + p.driftY;
        p.alpha = 1;
        if (since > 3000) {
          p.phase = 'fading';
          p.phaseStart = now;
          p.driftX = (Math.random() - 0.5) * 4;
          p.driftY = -1 - Math.random() * 3;
        }
      } else if (p.phase === 'fading') {
        const t = Math.min(1, since / 2000);
        p.x += p.driftX;
        p.y += p.driftY;
        p.alpha = 1 - t;
      }
      if (p.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    gestureRef.current = {
      startX: x, startY: y, startTime: performance.now(),
      active: true, lastX: x, lastY: y
    };
    engineRef.current?.addRipple(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!gestureRef.current.active) return;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const g = gestureRef.current;
    const dx = x - g.lastX;
    const dy = y - g.lastY;
    if (Math.abs(dx) > 5) {
      const angle = Math.max(-5, Math.min(5, (dx / 30) * 5));
      engineRef.current?.setTilt(angle, 400);
    }
    g.lastX = x;
    g.lastY = y;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!gestureRef.current.active) return;
    const g = gestureRef.current;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const dx = x - g.startX;
    const dy = y - g.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDy > absDx && absDy > 30) {
      if (dy < 0) {
        engineRef.current?.setBlocked(1000);
      } else {
        engineRef.current?.setSpeedBoost(3000);
      }
    } else if (absDx > absDy && absDx > 30) {
      const angle = dx < 0 ? -5 : 5;
      engineRef.current?.setTilt(angle, 1500);
    }
    gestureRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          cursor: 'pointer',
          borderRadius: 8,
        }}
      />
    </div>
  );
});

SandClock.displayName = 'SandClock';
