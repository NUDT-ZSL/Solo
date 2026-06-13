import React, { useRef, useEffect, useCallback } from 'react';
import type { PhysicsState, CelestialBody, TrailPoint, Vec2 } from '../physics/GravityEngine';

interface StarParticle {
  x: number;
  y: number;
  size: number;
  angle: number;
  dist: number;
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
}

interface VictoryParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
}

export interface GameCanvasProps {
  physicsState: PhysicsState | null;
  predictedTrajectory: Vec2[];
  gravityVectors: { body: CelestialBody; fx: number; fy: number; mag: number }[];
  isDragging: boolean;
  dragStart: Vec2 | null;
  dragEnd: Vec2 | null;
  levelNumber: number;
  elapsedTime: number;
  explosionActive: boolean;
  explosionPos: Vec2 | null;
  victoryActive: boolean;
  gameView: 'menu' | 'playing' | 'victory';
  onReset: () => void;
  onMenu: () => void;
  onLaunch: (vx: number, vy: number) => void;
}

export default function GameCanvas({
  physicsState,
  predictedTrajectory,
  gravityVectors,
  isDragging,
  dragStart,
  dragEnd,
  levelNumber,
  elapsedTime,
  explosionActive,
  explosionPos,
  victoryActive,
  gameView,
  onReset,
  onMenu,
  onLaunch,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<StarParticle[]>([]);
  const explosionParticlesRef = useRef<ExplosionParticle[]>([]);
  const victoryParticlesRef = useRef<VictoryParticle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const mouseDownRef = useRef(false);
  const dragStartRef = useRef<Vec2 | null>(null);
  const dragEndRef = useRef<Vec2 | null>(null);
  const canvasWidthRef = useRef(0);
  const canvasHeightRef = useRef(0);

  const initStars = useCallback((w: number, h: number) => {
    const stars: StarParticle[] = [];
    const cx = w / 2;
    const cy = h / 2;
    for (let i = 0; i < 500; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.max(w, h) * 0.7;
      stars.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        size: 1 + Math.random() * 2,
        angle,
        dist,
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvasWidthRef.current = canvas.width;
    canvasHeightRef.current = canvas.height;
    initStars(canvas.width, canvas.height);
  }, [initStars]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvasWidthRef.current = canvas.width;
      canvasHeightRef.current = canvas.height;
      initStars(canvas.width, canvas.height);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initStars]);

  const getCanvasPos = useCallback((e: MouseEvent): Vec2 => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      if (gameView !== 'playing') return;
      const pos = getCanvasPos(e);
      mouseDownRef.current = true;
      dragStartRef.current = pos;
      dragEndRef.current = pos;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDownRef.current) return;
      dragEndRef.current = getCanvasPos(e);
    };
    const onMouseUp = () => {
      if (!mouseDownRef.current) return;
      mouseDownRef.current = false;
      if (dragStartRef.current && dragEndRef.current) {
        const dx = dragStartRef.current.x - dragEndRef.current.x;
        const dy = dragStartRef.current.y - dragEndRef.current.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 10) {
          const speed = Math.min(mag * 1.5, 400);
          onLaunch((dx / mag) * speed, (dy / mag) * speed);
        }
      }
      dragStartRef.current = null;
      dragEndRef.current = null;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
    };
  }, [gameView, onLaunch, getCanvasPos]);

  useEffect(() => {
    if (explosionActive && explosionPos) {
      const particles: ExplosionParticle[] = [];
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 / 30) * i + Math.random() * 0.3;
        const speed = 50 + Math.random() * 100;
        particles.push({
          x: explosionPos.x,
          y: explosionPos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          maxAge: 1,
        });
      }
      explosionParticlesRef.current = particles;
    }
  }, [explosionActive, explosionPos]);

  useEffect(() => {
    if (victoryActive) {
      const particles: VictoryParticle[] = [];
      const w = canvasWidthRef.current;
      const h = canvasHeightRef.current;
      for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * w,
          y: h + Math.random() * 50,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -2,
          age: 0,
          maxAge: 3,
        });
      }
      victoryParticlesRef.current = particles;
    }
  }, [victoryActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvasWidthRef.current;
    const h = canvasHeightRef.current;

    let starRotation = 0;

    const drawStars = (dt: number) => {
      starRotation += dt * 0.02;
      const cx = w / 2;
      const cy = h / 2;
      ctx.fillStyle = '#ffffff';
      for (const star of starsRef.current) {
        const a = star.angle + starRotation;
        const sx = cx + Math.cos(a) * star.dist;
        const sy = cy + Math.sin(a) * star.dist;
        if (sx < 0 || sx > w || sy < 0 || sy > h) continue;
        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawGravityRings = (body: CelestialBody) => {
      const rings = 3;
      for (let i = rings; i >= 1; i--) {
        const r = body.gravityRadius * (i / rings);
        ctx.beginPath();
        ctx.arc(body.x, body.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = body.color;
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const drawPlanet = (body: CelestialBody) => {
      drawGravityRings(body);
      const grad = ctx.createRadialGradient(
        body.x - body.radius * 0.3,
        body.y - body.radius * 0.3,
        body.radius * 0.1,
        body.x,
        body.y,
        body.radius
      );
      grad.addColorStop(0, body.color);
      grad.addColorStop(1, shadeColor(body.color, -40));
      ctx.beginPath();
      ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    };

    const drawAsteroid = (body: CelestialBody) => {
      ctx.beginPath();
      ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawWormhole = (wormhole: { x: number; y: number; radius: number; rotation: number }) => {
      ctx.save();
      ctx.translate(wormhole.x, wormhole.y);
      ctx.rotate(wormhole.rotation);
      for (let i = 0; i < 4; i++) {
        const r = wormhole.radius * (1 - i * 0.2);
        const alpha = 0.4 - i * 0.08;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
        ctx.lineWidth = 2 + i;
        ctx.stroke();
      }
      const spiralGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, wormhole.radius);
      spiralGrad.addColorStop(0, 'rgba(192, 132, 252, 0.8)');
      spiralGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
      spiralGrad.addColorStop(1, 'rgba(109, 40, 217, 0.0)');
      ctx.beginPath();
      ctx.arc(0, 0, wormhole.radius, 0, Math.PI * 2);
      ctx.fillStyle = spiralGrad;
      ctx.fill();
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 4; t += 0.1) {
        const sr = (t / (Math.PI * 4)) * wormhole.radius;
        const sx = Math.cos(t) * sr;
        const sy = Math.sin(t) * sr;
        if (t === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    };

    const drawProbe = (probe: PhysicsState['probe']) => {
      if (!probe.alive) return;
      for (let i = 0; i < probe.trail.length; i++) {
        const t = probe.trail[i];
        const alpha = 1 - (i / probe.trail.length);
        const size = 3 * alpha;
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.fill();
      }
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(probe.x, probe.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const drawTrajectory = (trajectory: Vec2[]) => {
      if (trajectory.length < 2) return;
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(trajectory[0].x, trajectory[0].y);
      for (let i = 1; i < trajectory.length; i++) {
        ctx.lineTo(trajectory[i].x, trajectory[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawPredictedTrajectory = () => {
      if (predictedTrajectory.length < 2) return;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(predictedTrajectory[0].x, predictedTrajectory[0].y);
      for (let i = 1; i < predictedTrajectory.length; i++) {
        ctx.lineTo(predictedTrajectory[i].x, predictedTrajectory[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawDragArrow = () => {
      if (!isDragging || !dragStart || !dragEnd) return;
      const dx = dragStart.x - dragEnd.x;
      const dy = dragStart.y - dragEnd.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag < 10) return;
      ctx.beginPath();
      ctx.moveTo(dragStart.x, dragStart.y);
      ctx.lineTo(dragStart.x + dx, dragStart.y + dy);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(dragStart.x + dx, dragStart.y + dy);
      ctx.lineTo(
        dragStart.x + dx - 10 * Math.cos(angle - 0.4),
        dragStart.y + dy - 10 * Math.sin(angle - 0.4)
      );
      ctx.moveTo(dragStart.x + dx, dragStart.y + dy);
      ctx.lineTo(
        dragStart.x + dx - 10 * Math.cos(angle + 0.4),
        dragStart.y + dy - 10 * Math.sin(angle + 0.4)
      );
      ctx.stroke();
    };

    const drawFuelBar = (fuel: number, maxFuel: number) => {
      const bx = 20;
      const by = 20;
      const bw = 180;
      const bh = 14;
      const ratio = Math.max(fuel / maxFuel, 0);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill();
      const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(1, '#eab308');
      ctx.fillStyle = grad;
      ctx.beginPath();
      roundRect(ctx, bx + 2, by + 2, (bw - 4) * ratio, bh - 4, 3);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`燃料: ${Math.ceil(fuel)}`, bx + bw + 10, by + 11);
    };

    const drawLevelInfo = () => {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`关卡 ${levelNumber}`, w - 20, 32);
      const mins = Math.floor(elapsedTime / 60);
      const secs = Math.floor(elapsedTime % 60);
      ctx.fillText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`, w - 20, 52);
    };

    const drawInfoPanel = () => {
      const px = 12;
      const py = 50;
      const pw = 240;
      const ph = 60 + gravityVectors.length * 28;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      roundRect(ctx, px, py, pw, ph, 12);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('引力数据', px + 16, py + 24);
      gravityVectors.forEach((gv, i) => {
        const gy = py + 48 + i * 28;
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px sans-serif';
        ctx.fillText(`${gv.body.type === 'planet' ? '行星' : '小行星'} ${gv.body.id}`, px + 16, gy);
        ctx.fillStyle = '#64748b';
        ctx.fillText(`引力: ${gv.mag.toFixed(1)}`, px + 100, gy);
        const arrowLen = Math.min(gv.mag * 30, 40);
        const angle = Math.atan2(gv.fy, gv.fx);
        const ax = px + 190;
        const ay = gy - 4;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + Math.cos(angle) * arrowLen, ay + Math.sin(angle) * arrowLen);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        const tipX = ax + Math.cos(angle) * arrowLen;
        const tipY = ay + Math.sin(angle) * arrowLen;
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - 6 * Math.cos(angle - 0.5), tipY - 6 * Math.sin(angle - 0.5));
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - 6 * Math.cos(angle + 0.5), tipY - 6 * Math.sin(angle + 0.5));
        ctx.stroke();
      });
    };

    const drawButtons = () => {
      const bx = 12;
      const by = 60 + gravityVectors.length * 28 + 60;
      const bw = 105;
      const bh = 32;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      roundRect(ctx, bx, by, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('重置关卡', bx + bw / 2, by + 21);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      roundRect(ctx, bx + bw + 10, by, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('返回菜单', bx + bw + 10 + bw / 2, by + 21);
    };

    const updateExplosion = (dt: number) => {
      const particles = explosionParticlesRef.current;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.age += dt;
      }
      explosionParticlesRef.current = particles.filter(p => p.age < p.maxAge);
    };

    const drawExplosion = () => {
      for (const p of explosionParticlesRef.current) {
        const alpha = 1 - p.age / p.maxAge;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    };

    const updateVictory = (dt: number) => {
      const particles = victoryParticlesRef.current;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.age += dt;
      }
      victoryParticlesRef.current = particles.filter(p => p.age < p.maxAge);
    };

    const drawVictory = () => {
      for (const p of victoryParticlesRef.current) {
        const alpha = 1 - p.age / p.maxAge;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
        ctx.fill();
      }
      ctx.save();
      ctx.font = '2.5rem sans-serif';
      ctx.textAlign = 'center';
      const grad = ctx.createLinearGradient(w / 2 - 80, 0, w / 2 + 80, 0);
      grad.addColorStop(0, '#fbbf24');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
      ctx.fillText('通关！', w / 2, h / 2);
      ctx.restore();
    };

    const drawMenu = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.font = '3rem sans-serif';
      ctx.textAlign = 'center';
      const titleGrad = ctx.createLinearGradient(w / 2 - 120, 0, w / 2 + 120, 0);
      titleGrad.addColorStop(0, '#38bdf8');
      titleGrad.addColorStop(1, '#fbbf24');
      ctx.fillStyle = titleGrad;
      ctx.fillText('GravityRift', w / 2, h / 2 - 40);
      ctx.font = '1rem sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('拖拽发射探测器，利用引力弹射穿越虫洞', w / 2, h / 2 + 10);
      ctx.font = '1.2rem sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('点击任意位置开始', w / 2, h / 2 + 60);
      ctx.restore();
    };

    const render = (timestamp: number) => {
      const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05) : 0.016;
      lastTimeRef.current = timestamp;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      drawStars(dt);

      if (gameView === 'menu') {
        drawMenu();
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      if (physicsState) {
        for (const body of physicsState.bodies) {
          if (body.type === 'planet') drawPlanet(body);
          else drawAsteroid(body);
        }
        drawWormhole(physicsState.wormhole);

        if (!physicsState.probe.launched && isDragging) {
          drawPredictedTrajectory();
        }

        drawTrajectory(physicsState.probe.trajectory);
        drawProbe(physicsState.probe);
        drawDragArrow();

        if (physicsState.probe.launched && physicsState.probe.alive) {
          drawFuelBar(physicsState.probe.fuel, physicsState.probe.maxFuel);
        }
      }

      drawLevelInfo();
      drawInfoPanel();
      drawButtons();

      updateExplosion(dt);
      drawExplosion();

      if (victoryActive) {
        updateVictory(dt);
        drawVictory();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [physicsState, predictedTrajectory, gravityVectors, isDragging, dragStart, dragEnd, levelNumber, elapsedTime, explosionActive, explosionPos, victoryActive, gameView]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: gameView === 'playing' ? 'crosshair' : 'pointer', minWidth: 800 }}
    />
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 0) return;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return `rgb(${r},${g},${b})`;
}
