import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  Vec2,
  GravityLine,
  Asteroid,
  StarGate,
  Hazard,
  StarFragment,
  Particle,
  vec2,
  vecDist,
  vecLen,
  vecNorm,
  vecSub,
  smoothGravityLine,
  validateGravityLine,
  getPointOnPath,
  isPointNearGravityLine,
  spawnParticles,
  updateParticles,
  moveAsteroidAlongPath,
  moveAsteroidFree,
  applyHazardToAsteroid,
  checkAsteroidGateCollision,
  checkOrbitTypeForHiddenGate,
  checkFragmentCollection,
  GRAVITY_LINE_ENERGY_COST,
  MAX_GRAVITY_LINE_LENGTH,
} from './utils/physics';

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface Nebula {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  color: string;
  alpha: number;
  rotation: number;
}

export interface LevelData {
  id: number;
  name: string;
  asteroids: { id: string; x: number; y: number; radius: number }[];
  starGates: { id: string; x: number; y: number; radius: number; type: 'normal' | 'rare' | 'hidden'; hitsRequired: number; hiddenOrbitType?: 'circular' | 'curved' | null }[];
  hazards: { id: string; x: number; y: number; radius: number; type: 'gravity_interference' | 'blackhole' | 'boost_star'; strength: number }[];
  starFragments: { id: string; x: number; y: number }[];
}

export interface GameState {
  level: number;
  levelName: string;
  energy: number;
  maxEnergy: number;
  gravityLines: GravityLine[];
  asteroids: Asteroid[];
  starGates: StarGate[];
  hazards: Hazard[];
  starFragments: StarFragment[];
  fragmentsCollected: number;
  totalFragments: number;
  particles: Particle[];
  levelComplete: boolean;
  levelStartTime: number;
  starsCollected: number;
  drawing: boolean;
  currentDrawPoints: Vec2[];
  mousePos: Vec2;
}

export function createInitialGameState(levelData: LevelData): GameState {
  return {
    level: levelData.id,
    levelName: levelData.name,
    energy: 100,
    maxEnergy: 100,
    gravityLines: [],
    asteroids: levelData.asteroids.map((a) => ({
      id: a.id,
      pos: vec2(a.x, a.y),
      vel: vec2(0, 0),
      radius: a.radius,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2,
      active: true,
      onGravityLine: false,
      gravityLineId: null,
      gravityLineProgress: 0,
      speed: 120,
      trail: [],
      texture: Array.from({ length: 8 }, () => 0.7 + Math.random() * 0.6),
    })),
    starGates: levelData.starGates.map((g) => ({
      id: g.id,
      pos: vec2(g.x, g.y),
      radius: g.radius,
      type: g.type,
      hitsRequired: g.hitsRequired,
      hits: 0,
      unlocked: false,
      hiddenOrbitType: g.hiddenOrbitType ?? null,
      glowPhase: Math.random() * Math.PI * 2,
    })),
    hazards: levelData.hazards.map((h) => ({
      id: h.id,
      pos: vec2(h.x, h.y),
      radius: h.radius,
      type: h.type,
      strength: h.strength,
      active: true,
    })),
    starFragments: levelData.starFragments.map((f) => ({
      id: f.id,
      pos: vec2(f.x, f.y),
      radius: 10,
      collected: false,
      glowPhase: Math.random() * Math.PI * 2,
      pulseSpeed: 2 + Math.random(),
    })),
    fragmentsCollected: 0,
    totalFragments: levelData.starFragments.length,
    particles: [],
    levelComplete: false,
    levelStartTime: Date.now(),
    starsCollected: 0,
    drawing: false,
    currentDrawPoints: [],
    mousePos: vec2(0, 0),
  };
}

interface GameCanvasProps {
  gameState: GameState;
  onGameStateUpdate: (updater: (prev: GameState) => GameState) => void;
  width: number;
  height: number;
}

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;

export default function GameCanvas({ gameState, onGameStateUpdate, width, height }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgStarsRef = useRef<BackgroundStar[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const stars: BackgroundStar[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: 0.5 + Math.random() * 2.5,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 1 + Math.random() * 3,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
    bgStarsRef.current = stars;

    const nebulae: Nebula[] = [];
    const nebulaColors = [
      'rgba(80, 40, 120, 0.08)',
      'rgba(30, 60, 120, 0.06)',
      'rgba(120, 30, 80, 0.05)',
      'rgba(40, 80, 100, 0.07)',
      'rgba(100, 50, 140, 0.06)',
    ];
    for (let i = 0; i < 5; i++) {
      nebulae.push({
        x: 100 + Math.random() * (GAME_WIDTH - 200),
        y: 100 + Math.random() * (GAME_HEIGHT - 200),
        radiusX: 80 + Math.random() * 150,
        radiusY: 60 + Math.random() * 120,
        color: nebulaColors[i],
        alpha: 0.05 + Math.random() * 0.1,
        rotation: Math.random() * Math.PI,
      });
    }
    nebulaeRef.current = nebulae;
    setCanvasReady(true);
  }, []);

  const getCanvasPos = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const canvas = canvasRef.current;
      if (!canvas) return vec2(0, 0);
      const rect = canvas.getBoundingClientRect();
      const scaleX = GAME_WIDTH / rect.width;
      const scaleY = GAME_HEIGHT / rect.height;
      return vec2((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e.clientX, e.clientY);
      if (gameState.energy < GRAVITY_LINE_ENERGY_COST) return;
      if (gameState.levelComplete) return;
      onGameStateUpdate((prev) => ({
        ...prev,
        drawing: true,
        currentDrawPoints: [pos],
        mousePos: pos,
      }));
    },
    [gameState.energy, gameState.levelComplete, getCanvasPos, onGameStateUpdate],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e.clientX, e.clientY);
      onGameStateUpdate((prev) => {
        if (!prev.drawing) return { ...prev, mousePos: pos };
        const newPoints = [...prev.currentDrawPoints, pos];
        const smoothed = smoothGravityLine(newPoints);
        const validation = validateGravityLine(smoothed);
        if (!validation.valid) return { ...prev, mousePos: pos };
        let totalLen = 0;
        for (let i = 1; i < smoothed.length; i++) {
          totalLen += vecDist(smoothed[i - 1], smoothed[i]);
        }
        const energyCost = (totalLen / MAX_GRAVITY_LINE_LENGTH) * GRAVITY_LINE_ENERGY_COST;
        if (prev.energy < energyCost) return { ...prev, mousePos: pos };
        return { ...prev, currentDrawPoints: newPoints, mousePos: pos };
      });
    },
    [getCanvasPos, onGameStateUpdate],
  );

  const handleMouseUp = useCallback(() => {
    onGameStateUpdate((prev) => {
      if (!prev.drawing) return prev;
      const smoothed = smoothGravityLine(prev.currentDrawPoints);
      if (smoothed.length < 2) return { ...prev, drawing: false, currentDrawPoints: [] };
      let totalLen = 0;
      for (let i = 1; i < smoothed.length; i++) {
        totalLen += vecDist(smoothed[i - 1], smoothed[i]);
      }
      const energyCost = (totalLen / MAX_GRAVITY_LINE_LENGTH) * GRAVITY_LINE_ENERGY_COST;
      const newLine: GravityLine = {
        id: `line_${Date.now()}`,
        points: smoothed.map((p, i) => ({ pos: p, time: i })),
        maxCurvature: 0.8,
        maxLength: MAX_GRAVITY_LINE_LENGTH,
        energyCost,
      };
      let asteroids = prev.asteroids.map((a) => {
        if (!a.active || a.onGravityLine) return a;
        if (isPointNearGravityLine(a.pos, smoothed, a.radius + 15)) {
          return { ...a, onGravityLine: true, gravityLineId: newLine.id, gravityLineProgress: 0 };
        }
        return a;
      });
      return {
        ...prev,
        drawing: false,
        currentDrawPoints: [],
        gravityLines: [...prev.gravityLines, newLine],
        energy: Math.max(0, prev.energy - energyCost),
        asteroids,
      };
    });
  }, [onGameStateUpdate]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = getCanvasPos(touch.clientX, touch.clientY);
      if (gameState.energy < GRAVITY_LINE_ENERGY_COST) return;
      if (gameState.levelComplete) return;
      onGameStateUpdate((prev) => ({
        ...prev,
        drawing: true,
        currentDrawPoints: [pos],
        mousePos: pos,
      }));
    },
    [gameState.energy, gameState.levelComplete, getCanvasPos, onGameStateUpdate],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent);
    },
    [handleMouseMove],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleMouseUp();
    },
    [handleMouseUp],
  );

  useEffect(() => {
    if (!canvasReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      onGameStateUpdate((prev) => {
        if (prev.levelComplete) return prev;

        let newEnergy = Math.min(prev.maxEnergy, prev.energy + 5 * dt);
        let newAsteroids = [...prev.asteroids];
        let newGravityLines = [...prev.gravityLines];
        let newStarGates = [...prev.starGates];
        let newStarFragments = [...prev.starFragments];
        let newParticles = [...prev.particles];
        let fragmentsCollected = prev.fragmentsCollected;

        for (let i = 0; i < newAsteroids.length; i++) {
          const a = newAsteroids[i];
          if (!a.active) continue;

          if (a.onGravityLine && a.gravityLineId) {
            const line = newGravityLines.find((l) => l.id === a.gravityLineId);
            if (line) {
              const linePoints = line.points.map((p) => p.pos);
              const moved = moveAsteroidAlongPath(a, linePoints, dt);
              newAsteroids[i] = moved;
              if (moved.gravityLineProgress >= 1) {
                const dir = linePoints.length >= 2
                  ? vecNorm(vecSub(linePoints[linePoints.length - 1], linePoints[linePoints.length - 2]))
                  : vec2(1, 0);
                newAsteroids[i] = {
                  ...moved,
                  onGravityLine: false,
                  gravityLineId: null,
                  vel: vecScale(dir, moved.speed),
                };
              }
            } else {
              newAsteroids[i] = { ...a, onGravityLine: false, gravityLineId: null };
            }
          } else {
            newAsteroids[i] = moveAsteroidFree(a, dt);
          }

          for (const hazard of prev.hazards) {
            newAsteroids[i] = applyHazardToAsteroid(newAsteroids[i], hazard, dt);
          }
        }

        for (let i = 0; i < newAsteroids.length; i++) {
          const a = newAsteroids[i];
          if (!a.active) continue;
          for (let j = 0; j < newStarGates.length; j++) {
            const g = newStarGates[j];
            if (g.unlocked) continue;
            if (checkAsteroidGateCollision(a, g)) {
              const orbitValid = checkOrbitTypeForHiddenGate(a.trail, g);
              if (orbitValid) {
                newStarGates[j] = { ...g, hits: g.hits + 1 };
                newParticles = [
                  ...newParticles,
                  ...spawnParticles(a.pos, 15, g.type === 'rare' ? '#ff66ff' : g.type === 'hidden' ? '#66ffcc' : '#66ccff', 80),
                ];
                newAsteroids[i] = { ...a, active: false, vel: vec2(0, 0) };
                if (newStarGates[j].hits >= g.hitsRequired) {
                  newStarGates[j] = { ...newStarGates[j], unlocked: true };
                  newParticles = [
                    ...newParticles,
                    ...spawnParticles(g.pos, 30, '#ffdd44', 120),
                  ];
                }
              }
            }
          }
        }

        for (let i = 0; i < newAsteroids.length; i++) {
          const a = newAsteroids[i];
          if (!a.active) continue;
          for (let j = 0; j < newStarFragments.length; j++) {
            const f = newStarFragments[j];
            if (f.collected) continue;
            if (checkFragmentCollection(a, f)) {
              newStarFragments[j] = { ...f, collected: true };
              fragmentsCollected++;
              newParticles = [
                ...newParticles,
                ...spawnParticles(f.pos, 12, '#ffdd44', 60),
              ];
            }
          }
        }

        for (const a of newAsteroids) {
          if (!a.active) continue;
          if (a.pos.x < -50 || a.pos.x > GAME_WIDTH + 50 || a.pos.y < -50 || a.pos.y > GAME_HEIGHT + 50) {
            const idx = newAsteroids.indexOf(a);
            newAsteroids[idx] = { ...a, active: false };
          }
        }

        newParticles = updateParticles(newParticles, dt);

        const allGatesUnlocked = newStarGates.every((g) => g.unlocked);
        const activeAsteroids = newAsteroids.filter((a) => a.active);
        const asteroidsOnLines = activeAsteroids.filter((a) => a.onGravityLine);
        const levelComplete = allGatesUnlocked && asteroidsOnLines.length === 0;

        return {
          ...prev,
          energy: newEnergy,
          asteroids: newAsteroids,
          gravityLines: newGravityLines,
          starGates: newStarGates,
          starFragments: newStarFragments,
          particles: newParticles,
          fragmentsCollected,
          levelComplete,
        };
      });

      const gs = gameState;
      const time = timestamp / 1000;

      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      drawBackground(ctx, time);
      drawNebulae(ctx, time);
      drawBackgroundStars(ctx, time);
      drawGravityInterference(ctx, gs.hazards, time);
      drawBlackHoles(ctx, gs.hazards, time);
      drawBoostStars(ctx, gs.hazards, time);
      drawGravityLines(ctx, gs.gravityLines, time);
      drawCurrentDrawLine(ctx, gs.currentDrawPoints, time);
      drawStarGates(ctx, gs.starGates, time);
      drawStarFragments(ctx, gs.starFragments, time);
      drawAsteroids(ctx, gs.asteroids, time);
      drawParticles(ctx, gs.particles);
      drawMouseGlow(ctx, gs.mousePos, gs.drawing, time);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasReady, onGameStateUpdate, gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: gameState.drawing ? 'crosshair' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}

function drawBackground(ctx: CanvasRenderingContext2D, time: number) {
  const gradient = ctx.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);
  gradient.addColorStop(0, '#0a0a2e');
  gradient.addColorStop(0.5, '#0d0825');
  gradient.addColorStop(1, '#150a30');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawNebulae(ctx: CanvasRenderingContext2D, _time: number) {
  const nebulae: Nebula[] = [
    { x: 200, y: 150, radiusX: 180, radiusY: 120, color: 'rgba(80,40,120,0.06)', alpha: 0.06, rotation: 0.3 },
    { x: 800, y: 500, radiusX: 150, radiusY: 100, color: 'rgba(30,60,120,0.05)', alpha: 0.05, rotation: -0.5 },
    { x: 500, y: 350, radiusX: 200, radiusY: 130, color: 'rgba(120,30,80,0.04)', alpha: 0.04, rotation: 0.8 },
    { x: 1000, y: 200, radiusX: 120, radiusY: 90, color: 'rgba(40,80,100,0.05)', alpha: 0.05, rotation: -0.2 },
    { x: 350, y: 600, radiusX: 160, radiusY: 110, color: 'rgba(100,50,140,0.05)', alpha: 0.05, rotation: 1.2 },
  ];
  for (const n of nebulae) {
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rotation);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, n.radiusX);
    grad.addColorStop(0, n.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.scale(1, n.radiusY / n.radiusX);
    ctx.beginPath();
    ctx.arc(0, 0, n.radiusX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBackgroundStars(ctx: CanvasRenderingContext2D, time: number) {
  const stars = getOrInitBgStars();
  for (const star of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
    const alpha = star.brightness * twinkle;
    ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
    if (star.size > 1.8) {
      ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

let cachedBgStars: BackgroundStar[] | null = null;
function getOrInitBgStars(): BackgroundStar[] {
  if (cachedBgStars) return cachedBgStars;
  cachedBgStars = [];
  for (let i = 0; i < 200; i++) {
    cachedBgStars.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: 0.5 + Math.random() * 2.5,
      brightness: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 1 + Math.random() * 3,
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
  return cachedBgStars;
}

function drawGravityLines(ctx: CanvasRenderingContext2D, lines: GravityLine[], time: number) {
  for (const line of lines) {
    if (line.points.length < 2) continue;
    const pts = line.points.map((p) => p.pos);
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.15)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(100, 180, 255, 0.4)';
    ctx.shadowBlur = 20;
    drawSmoothPath(ctx, pts);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(120, 200, 255, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(120, 200, 255, 0.8)';
    ctx.shadowBlur = 10;
    drawSmoothPath(ctx, pts);
    ctx.stroke();

    for (let i = 0; i < pts.length; i += 3) {
      const progress = i / pts.length;
      const offset = Math.sin(time * 3 + progress * 10) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(180, 220, 255, ${0.3 + offset * 0.5})`;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 1.5 + offset, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCurrentDrawLine(ctx: CanvasRenderingContext2D, points: Vec2[], time: number) {
  if (points.length < 2) return;
  const smoothed = smoothGravityLine(points);
  if (smoothed.length < 2) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(150, 220, 255, 0.2)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(150, 220, 255, 0.5)';
  ctx.shadowBlur = 25;
  drawSmoothPath(ctx, smoothed);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(180, 240, 255, 0.8)';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(180, 240, 255, 0.9)';
  ctx.shadowBlur = 12;
  drawSmoothPath(ctx, smoothed);
  ctx.stroke();

  for (let i = 0; i < smoothed.length; i += 2) {
    const pulse = Math.sin(time * 5 + i * 0.5) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(200, 240, 255, ${0.4 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(smoothed[i].x, smoothed[i].y, 2 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSmoothPath(ctx: CanvasRenderingContext2D, points: Vec2[]) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

function drawStarGates(ctx: CanvasRenderingContext2D, gates: StarGate[], time: number) {
  for (const gate of gates) {
    const { pos, radius, type, hits, hitsRequired, unlocked, glowPhase } = gate;
    const baseColor = type === 'normal' ? [100, 180, 255] : type === 'rare' ? [200, 100, 255] : [100, 255, 200];
    const pulse = 0.7 + 0.3 * Math.sin(time * 2 + glowPhase);

    ctx.save();

    if (unlocked) {
      const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2.5);
      glow.addColorStop(0, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.3)`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.6)`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.8)`;
      ctx.shadowBlur = 15;
      drawStarGateShape(ctx, pos, radius * 1.3, time, type);
      ctx.stroke();
    } else {
      const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2);
      glow.addColorStop(0, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.1 * pulse})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.6 * pulse})`;
      ctx.shadowBlur = 10;
      drawStarGateShape(ctx, pos, radius, time, type);
      ctx.stroke();

      const innerGlow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 0.6);
      innerGlow.addColorStop(0, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.15 * pulse})`);
      innerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      if (hitsRequired > 1) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.9)`;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${hits}/${hitsRequired}`, pos.x, pos.y);
      }
    }
    ctx.restore();
  }
}

function drawStarGateShape(ctx: CanvasRenderingContext2D, pos: Vec2, radius: number, time: number, type: StarGate['type']) {
  ctx.beginPath();
  if (type === 'hidden') {
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 / sides) * i + time * 0.3;
      const r = radius * (1 + 0.1 * Math.sin(time * 2 + i));
      const x = pos.x + Math.cos(angle) * r;
      const y = pos.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (type === 'rare') {
    const sides = 5;
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 / sides) * i - Math.PI / 2 + time * 0.2;
      const outerR = radius;
      const innerR = radius * 0.5;
      const x1 = pos.x + Math.cos(angle) * outerR;
      const y1 = pos.y + Math.sin(angle) * outerR;
      const nextAngle = angle + Math.PI / sides;
      const x2 = pos.x + Math.cos(nextAngle) * innerR;
      const y2 = pos.y + Math.sin(nextAngle) * innerR;
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
  } else {
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  }
}

function drawAsteroids(ctx: CanvasRenderingContext2D, asteroids: Asteroid[], _time: number) {
  for (const asteroid of asteroids) {
    if (!asteroid.active) continue;

    if (asteroid.trail.length > 1) {
      ctx.save();
      for (let i = 1; i < asteroid.trail.length; i++) {
        const alpha = (i / asteroid.trail.length) * 0.3;
        const size = asteroid.radius * 0.3 * (i / asteroid.trail.length);
        ctx.fillStyle = `rgba(180, 200, 220, ${alpha})`;
        ctx.beginPath();
        ctx.arc(asteroid.trail[i].x, asteroid.trail[i].y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(asteroid.pos.x, asteroid.pos.y);
    ctx.rotate(asteroid.rotation);

    const grad = ctx.createRadialGradient(-3, -3, 0, 0, 0, asteroid.radius);
    grad.addColorStop(0, '#9a8a7a');
    grad.addColorStop(0.5, '#6a5a4a');
    grad.addColorStop(1, '#3a2a1a');
    ctx.fillStyle = grad;

    ctx.beginPath();
    const segments = asteroid.texture.length;
    for (let i = 0; i < segments; i++) {
      const angle = (Math.PI * 2 / segments) * i;
      const r = asteroid.radius * asteroid.texture[i];
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(50, 40, 30, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(150, 130, 110, 0.3)';
    ctx.beginPath();
    ctx.arc(-asteroid.radius * 0.2, -asteroid.radius * 0.2, asteroid.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(asteroid.radius * 0.15, asteroid.radius * 0.1, asteroid.radius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    const glowGrad = ctx.createRadialGradient(
      asteroid.pos.x,
      asteroid.pos.y,
      asteroid.radius,
      asteroid.pos.x,
      asteroid.pos.y,
      asteroid.radius * 2,
    );
    glowGrad.addColorStop(0, 'rgba(180, 200, 220, 0.08)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(asteroid.pos.x, asteroid.pos.y, asteroid.radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStarFragments(ctx: CanvasRenderingContext2D, fragments: StarFragment[], time: number) {
  for (const frag of fragments) {
    if (frag.collected) continue;
    const pulse = 0.6 + 0.4 * Math.sin(time * frag.pulseSpeed + frag.glowPhase);
    const size = frag.radius * (0.9 + 0.1 * Math.sin(time * 3 + frag.glowPhase));

    ctx.save();
    const outerGlow = ctx.createRadialGradient(frag.pos.x, frag.pos.y, 0, frag.pos.x, frag.pos.y, size * 3);
    outerGlow.addColorStop(0, `rgba(255, 220, 80, ${0.15 * pulse})`);
    outerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(frag.pos.x, frag.pos.y, size * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 230, 100, ${0.7 * pulse})`;
    ctx.shadowColor = 'rgba(255, 220, 50, 0.8)';
    ctx.shadowBlur = 12;
    drawStar(ctx, frag.pos.x, frag.pos.y, 4, size, size * 0.4);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 200, ${0.9 * pulse})`;
    ctx.beginPath();
    ctx.arc(frag.pos.x, frag.pos.y, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawGravityInterference(ctx: CanvasRenderingContext2D, hazards: Hazard[], time: number) {
  for (const h of hazards) {
    if (h.type !== 'gravity_interference') continue;
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.5);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 150, 50, ${0.2 + 0.15 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = time * 30;
    ctx.beginPath();
    ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
    ctx.stroke();

    const grad = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, h.radius);
    grad.addColorStop(0, `rgba(255, 150, 50, ${0.05 * pulse})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 180, 80, ${0.3 * pulse})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const angle = time * 0.5 + (i * Math.PI * 2) / 3;
      const r = h.radius * 0.6;
      ctx.beginPath();
      ctx.arc(h.pos.x + Math.cos(angle) * r, h.pos.y + Math.sin(angle) * r, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawBlackHoles(ctx: CanvasRenderingContext2D, hazards: Hazard[], time: number) {
  for (const h of hazards) {
    if (h.type !== 'blackhole') continue;
    ctx.save();
    const grad = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, h.radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    grad.addColorStop(0.6, 'rgba(20, 0, 40, 0.5)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(140, 80, 200, ${0.3 + 0.2 * Math.sin(time * 2)})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(140, 80, 200, 0.6)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(h.pos.x, h.pos.y, h.radius * 1.3, h.radius * 0.4, time * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(100, 60, 180, ${0.2 + 0.1 * Math.sin(time * 3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(h.pos.x, h.pos.y, h.radius * 1.1, h.radius * 0.35, -time * 0.2 + 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBoostStars(ctx: CanvasRenderingContext2D, hazards: Hazard[], time: number) {
  for (const h of hazards) {
    if (h.type !== 'boost_star') continue;
    const pulse = 0.7 + 0.3 * Math.sin(time * 3);
    ctx.save();
    const glow = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, h.radius * 1.5);
    glow.addColorStop(0, `rgba(50, 255, 150, ${0.15 * pulse})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(h.pos.x, h.pos.y, h.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(80, 255, 170, ${0.5 * pulse})`;
    ctx.shadowColor = 'rgba(80, 255, 170, 0.7)';
    ctx.shadowBlur = 8;
    drawStar(ctx, h.pos.x, h.pos.y, 4, h.radius * 0.6, h.radius * 0.25);
    ctx.fill();

    for (let i = 0; i < 4; i++) {
      const angle = time * 2 + (i * Math.PI) / 2;
      const dist = h.radius * (0.7 + 0.2 * Math.sin(time * 4 + i));
      const px = h.pos.x + Math.cos(angle) * dist;
      const py = h.pos.y + Math.sin(angle) * dist;
      ctx.fillStyle = `rgba(120, 255, 200, ${0.4 * pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, Math.max(0.5, p.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawMouseGlow(ctx: CanvasRenderingContext2D, pos: Vec2, drawing: boolean, time: number) {
  if (pos.x === 0 && pos.y === 0) return;
  const pulse = drawing ? 0.6 + 0.4 * Math.sin(time * 6) : 0.3 + 0.1 * Math.sin(time * 2);
  const size = drawing ? 18 : 10;
  ctx.save();
  const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size);
  glow.addColorStop(0, `rgba(150, 220, 255, ${0.3 * pulse})`);
  glow.addColorStop(0.5, `rgba(150, 220, 255, ${0.1 * pulse})`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
  ctx.fill();

  if (drawing) {
    ctx.strokeStyle = `rgba(180, 240, 255, ${0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
