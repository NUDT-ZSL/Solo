import React, { useRef, useEffect, useCallback } from 'react';
import type { PhysicsState, CelestialBody, Vec2 } from '../physics/GravityEngine';

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
  isDragging: boolean;
  dragStart: Vec2 | null;
  dragEnd: Vec2 | null;
  gameView: 'menu' | 'playing' | 'victory';
  explosionActive: boolean;
  explosionPos: Vec2 | null;
  victoryActive: boolean;
}

export default function GameCanvas({
  physicsState,
  predictedTrajectory,
  isDragging,
  dragStart,
  dragEnd,
  gameView,
  explosionActive,
  explosionPos,
  victoryActive,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<StarParticle[]>([]);
  const explosionParticlesRef = useRef<ExplosionParticle[]>([]);
  const victoryParticlesRef = useRef<VictoryParticle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const canvasWidthRef = useRef(0);
  const canvasHeightRef = useRef(0);

  const physicsStateRef = useRef(physicsState);
  const predictedTrajectoryRef = useRef(predictedTrajectory);
  const isDraggingRef = useRef(isDragging);
  const dragStartRef = useRef(dragStart);
  const dragEndRef = useRef(dragEnd);
  const gameViewRef = useRef(gameView);
  const victoryActiveRef = useRef(victoryActive);

  useEffect(() => { physicsStateRef.current = physicsState; }, [physicsState]);
  useEffect(() => { predictedTrajectoryRef.current = predictedTrajectory; }, [predictedTrajectory]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  useEffect(() => { dragStartRef.current = dragStart; }, [dragStart]);
  useEffect(() => { dragEndRef.current = dragEnd; }, [dragEnd]);
  useEffect(() => { gameViewRef.current = gameView; }, [gameView]);
  useEffect(() => { victoryActiveRef.current = victoryActive; }, [victoryActive]);

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

  const handleResize = useCallback(() => {
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
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

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
          y: h + Math.random() * 100 + Math.random() * h * 0.5,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -2 - Math.random() * 1.5,
          age: Math.random() * 0.5,
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

    let starRotation = 0;

    const drawStars = (dt: number) => {
      const w = canvasWidthRef.current;
      const h = canvasHeightRef.current;
      starRotation += dt * 0.02;
      const cx = w / 2;
      const cy = h / 2;
      ctx.fillStyle = '#ffffff';
      for (const star of starsRef.current) {
        const a = star.angle + starRotation;
        const sx = cx + Math.cos(a) * star.dist;
        const sy = cy + Math.sin(a) * star.dist;
        if (sx < 0 || sx > w || sy < 0 || sy > h) continue;
        ctx.globalAlpha = 0.6 + Math.random() * 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawGravityRings = (body: CelestialBody) => {
      const rings = 4;
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

      const outerGlow = ctx.createRadialGradient(
        0, 0, wormhole.radius * 0.3,
        0, 0, wormhole.radius * 2
      );
      outerGlow.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
      outerGlow.addColorStop(0.5, 'rgba(139, 92, 246, 0.15)');
      outerGlow.addColorStop(1, 'rgba(109, 40, 217, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, wormhole.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      ctx.rotate(wormhole.rotation);

      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 / 3) * i);
        ctx.beginPath();
        for (let t = 0; t < Math.PI * 3; t += 0.08) {
          const r = (t / (Math.PI * 3)) * wormhole.radius * 1.2;
          const sx = Math.cos(t) * r;
          const sy = Math.sin(t) * r;
          if (t === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = `rgba(216, 180, 254, ${0.7 - i * 0.2})`;
        ctx.lineWidth = 2 - i * 0.5;
        ctx.stroke();
        ctx.restore();
      }

      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, wormhole.radius);
      coreGrad.addColorStop(0, 'rgba(233, 213, 255, 0.9)');
      coreGrad.addColorStop(0.3, 'rgba(192, 132, 252, 0.7)');
      coreGrad.addColorStop(0.6, 'rgba(139, 92, 246, 0.5)');
      coreGrad.addColorStop(1, 'rgba(109, 40, 217, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, wormhole.radius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      ctx.restore();
    };

    const drawProbe = (probe: PhysicsState['probe']) => {
      if (!probe.alive) return;
      for (let i = 0; i < probe.trail.length; i++) {
        const t = probe.trail[i];
        const alpha = i / probe.trail.length;
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
      const traj = predictedTrajectoryRef.current;
      if (traj.length < 2) return;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(traj[0].x, traj[0].y);
      for (let i = 1; i < traj.length; i++) {
        ctx.lineTo(traj[i].x, traj[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawDragArrow = () => {
      const ds = dragStartRef.current;
      const de = dragEndRef.current;
      if (!isDraggingRef.current || !ds || !de) return;
      const dx = ds.x - de.x;
      const dy = ds.y - de.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag < 10) return;
      ctx.beginPath();
      ctx.moveTo(ds.x, ds.y);
      ctx.lineTo(ds.x + dx, ds.y + dy);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(ds.x + dx, ds.y + dy);
      ctx.lineTo(
        ds.x + dx - 10 * Math.cos(angle - 0.4),
        ds.y + dy - 10 * Math.sin(angle - 0.4)
      );
      ctx.moveTo(ds.x + dx, ds.y + dy);
      ctx.lineTo(
        ds.x + dx - 10 * Math.cos(angle + 0.4),
        ds.y + dy - 10 * Math.sin(angle + 0.4)
      );
      ctx.stroke();
    };

    const updateExplosion = (dt: number) => {
      const particles = explosionParticlesRef.current;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.age += dt;
      }
      explosionParticlesRef.current = particles.filter((p) => p.age < p.maxAge);
    };

    const drawExplosion = () => {
      for (const p of explosionParticlesRef.current) {
        const alpha = 1 - p.age / p.maxAge;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 + 2 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    };

    const updateVictory = (dt: number) => {
      const particles = victoryParticlesRef.current;
      const h = canvasHeightRef.current;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.age += dt;
        if (p.y < -10) {
          p.y = h + 20;
          p.age = 0;
          p.x = Math.random() * canvasWidthRef.current;
        }
      }
      victoryParticlesRef.current = particles.filter((p) => p.age < p.maxAge);
    };

    const drawVictory = () => {
      const w = canvasWidthRef.current;
      const h = canvasHeightRef.current;
      for (const p of victoryParticlesRef.current) {
        const alpha = Math.min(1, (p.age / 0.5) * (1 - p.age / p.maxAge));
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0, alpha)})`;
        ctx.fill();
      }
      ctx.save();
      ctx.font = 'bold 2.5rem sans-serif';
      ctx.textAlign = 'center';
      const grad = ctx.createLinearGradient(w / 2 - 100, 0, w / 2 + 100, 0);
      grad.addColorStop(0, '#fbbf24');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 20;
      ctx.fillText('通关！', w / 2, h / 2);
      ctx.restore();
    };

    const drawMenu = () => {
      const w = canvasWidthRef.current;
      const h = canvasHeightRef.current;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.font = 'bold 3rem sans-serif';
      ctx.textAlign = 'center';
      const titleGrad = ctx.createLinearGradient(w / 2 - 140, 0, w / 2 + 140, 0);
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
      const dt = lastTimeRef.current
        ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
        : 0.016;
      lastTimeRef.current = timestamp;

      const w = canvasWidthRef.current;
      const h = canvasHeightRef.current;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      drawStars(dt);

      const gv = gameViewRef.current;

      if (gv === 'menu') {
        drawMenu();
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const state = physicsStateRef.current;
      if (state) {
        for (const body of state.bodies) {
          if (body.type === 'planet') drawPlanet(body);
          else drawAsteroid(body);
        }
        drawWormhole(state.wormhole);

        if (!state.probe.launched && isDraggingRef.current) {
          drawPredictedTrajectory();
        }

        drawTrajectory(state.probe.trajectory);
        drawProbe(state.probe);
        drawDragArrow();
      }

      updateExplosion(dt);
      drawExplosion();

      if (victoryActiveRef.current) {
        updateVictory(dt);
        drawVictory();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: gameView === 'playing' ? 'crosshair' : 'pointer',
        minWidth: 800,
      }}
    />
  );
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return `rgb(${r},${g},${b})`;
}
