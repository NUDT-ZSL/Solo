import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, update, startDrawing, continueDrawing, finishDrawing, cancelDrawing } from './GameLogic';
import { Vec2, GAME_WIDTH, GAME_HEIGHT } from './levels';

interface GameCanvasProps {
  gameState: GameState;
  onStateUpdate: (state: GameState) => void;
}

interface Star {
  x: number;
  y: number;
  size: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  brightness: number;
}

function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: 0.5 + Math.random() * 2,
      twinkleSpeed: 1 + Math.random() * 3,
      twinkleOffset: Math.random() * Math.PI * 2,
      brightness: 0.3 + Math.random() * 0.7,
    });
  }
  return stars;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0a0a2e');
  grad.addColorStop(0.5, '#0d0825');
  grad.addColorStop(1, '#050510');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], time: number, sx: number, sy: number) {
  for (const star of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
    const alpha = star.brightness * twinkle;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(star.x * sx, star.y * sy, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawNebulae(ctx: CanvasRenderingContext2D, nebulae: GameState['nebulae'], sx: number, sy: number) {
  for (const neb of nebulae) {
    const grad = ctx.createRadialGradient(
      neb.pos.x * sx, neb.pos.y * sy, 0,
      neb.pos.x * sx, neb.pos.y * sy, neb.radius * Math.max(sx, sy)
    );
    const baseColor = neb.color;
    grad.addColorStop(0, baseColor + '30');
    grad.addColorStop(0.4, baseColor + '18');
    grad.addColorStop(1, baseColor + '00');
    ctx.globalAlpha = neb.opacity * 3;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(neb.pos.x * sx, neb.pos.y * sy, neb.radius * Math.max(sx, sy), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayerPlanet(ctx: CanvasRenderingContext2D, pos: Vec2, time: number, sx: number, sy: number) {
  const cx = pos.x * sx;
  const cy = pos.y * sy;
  const r = 14 * Math.min(sx, sy);

  const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 3);
  glowGrad.addColorStop(0, 'rgba(100,180,255,0.3)');
  glowGrad.addColorStop(0.5, 'rgba(100,180,255,0.1)');
  glowGrad.addColorStop(1, 'rgba(100,180,255,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 3, 0, Math.PI * 2);
  ctx.fill();

  const pulse = 1 + 0.05 * Math.sin(time * 3);
  const bodyGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r * pulse);
  bodyGrad.addColorStop(0, '#a0d4ff');
  bodyGrad.addColorStop(0.5, '#4a9eff');
  bodyGrad.addColorStop(1, '#1a5faa');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(160,212,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: GameState['asteroids'][0], sx: number, sy: number) {
  if (!asteroid.alive) return;
  const cx = asteroid.pos.x * sx;
  const cy = asteroid.pos.y * sy;
  const r = asteroid.radius * Math.min(sx, sy);

  ctx.save();
  const bodyGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
  bodyGrad.addColorStop(0, '#b0a898');
  bodyGrad.addColorStop(0.6, '#7a7068');
  bodyGrad.addColorStop(1, '#4a4440');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  const seed = asteroid.textureSeed;
  const segments = 10;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const noise = 0.85 + 0.15 * Math.sin(seed * 13.7 + angle * 3.1) * Math.cos(seed * 7.3 + angle * 2.7);
    const px = cx + Math.cos(angle) * r * noise;
    const py = cy + Math.sin(angle) * r * noise;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,170,160,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const crAngle = (seed * (i + 1) * 17) % (Math.PI * 2);
    const crDist = r * 0.3 * ((seed * (i + 1) * 31) % 100) / 100;
    const crX = cx + Math.cos(crAngle) * crDist;
    const crY = cy + Math.sin(crAngle) * crDist;
    const crR = r * 0.12 + r * 0.08 * Math.sin(seed * i);
    ctx.fillStyle = 'rgba(60,55,50,0.5)';
    ctx.beginPath();
    ctx.arc(crX, crY, crR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAsteroidTrail(ctx: CanvasRenderingContext2D, trail: Vec2[], sx: number, sy: number) {
  if (trail.length < 2) return;
  for (let i = 1; i < trail.length; i++) {
    const alpha = (i / trail.length) * 0.4;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#8888aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x * sx, trail[i - 1].y * sy);
    ctx.lineTo(trail[i].x * sx, trail[i].y * sy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawGravityLine(ctx: CanvasRenderingContext2D, points: Vec2[], age: number, sx: number, sy: number) {
  if (points.length < 2) return;

  const fadeAlpha = Math.max(0.3, 1 - age * 0.1);

  ctx.save();
  ctx.shadowColor = 'rgba(80,180,255,0.6)';
  ctx.shadowBlur = 12 * Math.min(sx, sy);
  ctx.strokeStyle = `rgba(80,180,255,${0.7 * fadeAlpha})`;
  ctx.lineWidth = 3 * Math.min(sx, sy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x * sx, points[0].y * sy);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * sx, points[i].y * sy);
  }
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(160,220,255,${0.4 * fadeAlpha})`;
  ctx.lineWidth = 1.5 * Math.min(sx, sy);
  ctx.beginPath();
  ctx.moveTo(points[0].x * sx, points[0].y * sy);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * sx, points[i].y * sy);
  }
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < points.length; i += 3) {
    const p = points[i];
    const glowAlpha = (0.3 + 0.2 * Math.sin(age * 4 + i * 0.5)) * fadeAlpha;
    const grad = ctx.createRadialGradient(
      p.x * sx, p.y * sy, 0,
      p.x * sx, p.y * sy, 6 * Math.min(sx, sy)
    );
    grad.addColorStop(0, `rgba(120,200,255,${glowAlpha})`);
    grad.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x * sx, p.y * sy, 6 * Math.min(sx, sy), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStarGate(ctx: CanvasRenderingContext2D, gate: GameState['starGates'][0], sx: number, sy: number) {
  const cx = gate.pos.x * sx;
  const cy = gate.pos.y * sy;
  const r = gate.radius * Math.min(sx, sy);
  const pulse = gate.unlocked ? 0 : (0.8 + 0.2 * Math.sin(gate.pulsePhase));

  ctx.save();

  if (!gate.unlocked) {
    const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.5);
    outerGlow.addColorStop(0, gate.color + '40');
    outerGlow.addColorStop(1, gate.color + '00');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 0; ring < 3; ring++) {
      const ringR = r * (0.6 + ring * 0.2) * pulse;
      ctx.strokeStyle = gate.color;
      ctx.globalAlpha = 0.5 - ring * 0.15;
      ctx.lineWidth = (3 - ring) * Math.min(sx, sy);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
    innerGrad.addColorStop(0, gate.color + '60');
    innerGrad.addColorStop(1, gate.color + '10');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    if (gate.hitsRequired > 1) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${12 * Math.min(sx, sy)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${gate.hitsRequired - gate.currentHits}`, cx, cy);
    }
  } else {
    const unlockGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
    unlockGlow.addColorStop(0, gate.color + '50');
    unlockGlow.addColorStop(0.5, gate.color + '20');
    unlockGlow.addColorStop(1, gate.color + '00');
    ctx.fillStyle = unlockGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = gate.color + '80';
    ctx.lineWidth = 2 * Math.min(sx, sy);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#44ff88';
    ctx.font = `bold ${14 * Math.min(sx, sy)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', cx, cy);
  }
  ctx.restore();
}

function drawBlackHole(ctx: CanvasRenderingContext2D, bh: GameState['blackHoles'][0], time: number, sx: number, sy: number) {
  const cx = bh.pos.x * sx;
  const cy = bh.pos.y * sy;
  const r = bh.radius * Math.min(sx, sy);
  const pullR = bh.pullRadius * Math.min(sx, sy);

  ctx.save();

  const pullGrad = ctx.createRadialGradient(cx, cy, r, cx, cy, pullR);
  pullGrad.addColorStop(0, 'rgba(20,0,40,0.5)');
  pullGrad.addColorStop(0.5, 'rgba(20,0,40,0.2)');
  pullGrad.addColorStop(1, 'rgba(20,0,40,0)');
  ctx.fillStyle = pullGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, pullR, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const angle = time * (0.8 + i * 0.3) + i * 2.1;
    const spiralR = r * (1.5 + i * 0.5);
    ctx.strokeStyle = `rgba(100,50,150,${0.15 - i * 0.04})`;
    ctx.lineWidth = (2 - i * 0.5) * Math.min(sx, sy);
    ctx.beginPath();
    ctx.arc(cx, cy, spiralR, angle, angle + Math.PI * 1.5);
    ctx.stroke();
  }

  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  coreGrad.addColorStop(0, '#000000');
  coreGrad.addColorStop(0.7, '#0a0015');
  coreGrad.addColorStop(1, '#1a0030');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(140,80,200,0.4)';
  ctx.lineWidth = 1.5 * Math.min(sx, sy);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawInterferenceZone(ctx: CanvasRenderingContext2D, zone: GameState['interferenceZones'][0], time: number, sx: number, sy: number) {
  const cx = zone.pos.x * sx;
  const cy = zone.pos.y * sy;
  const r = zone.radius * Math.min(sx, sy);

  ctx.save();

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(255,100,50,0.08)');
  grad.addColorStop(0.5, 'rgba(255,80,40,0.05)');
  grad.addColorStop(1, 'rgba(255,60,30,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,100,50,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const arrowLen = 15 * Math.min(sx, sy);
  const dir = zone.direction;
  const angle = Math.atan2(dir.y, dir.x) + time * 0.5;
  for (let i = 0; i < 4; i++) {
    const a = angle + (i * Math.PI) / 2;
    const ax = cx + Math.cos(a) * r * 0.5;
    const ay = cy + Math.sin(a) * r * 0.5;
    ctx.strokeStyle = 'rgba(255,120,60,0.2)';
    ctx.lineWidth = 1.5 * Math.min(sx, sy);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + Math.cos(a) * arrowLen, ay + Math.sin(a) * arrowLen);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStarFragment(ctx: CanvasRenderingContext2D, fragment: GameState['starFragments'][0], sx: number, sy: number) {
  if (fragment.collected) return;
  const cx = fragment.pos.x * sx;
  const cy = fragment.pos.y * sy;
  const r = fragment.radius * Math.min(sx, sy);
  const pulse = 1 + 0.15 * Math.sin(fragment.pulsePhase);

  ctx.save();

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3 * pulse);
  glow.addColorStop(0, 'rgba(255,221,68,0.4)');
  glow.addColorStop(0.5, 'rgba(255,221,68,0.1)');
  glow.addColorStop(1, 'rgba(255,221,68,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 3 * pulse, 0, Math.PI * 2);
  ctx.fill();

  const starPoints = 4;
  ctx.fillStyle = '#ffdd44';
  ctx.beginPath();
  for (let i = 0; i < starPoints * 2; i++) {
    const angle = (i * Math.PI) / starPoints - Math.PI / 2;
    const dist = i % 2 === 0 ? r * pulse : r * 0.4 * pulse;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,240,150,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: GameState['particles'], sx: number, sy: number) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life) * 0.8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x * sx, p.pos.y * sy, p.size * Math.min(sx, sy), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGateHitEffect(ctx: CanvasRenderingContext2D, effect: { pos: Vec2; age: number; color: string }, sx: number, sy: number) {
  const progress = effect.age / 1.0;
  const r = 20 + progress * 60;
  const alpha = 1 - progress;
  ctx.save();
  ctx.strokeStyle = effect.color;
  ctx.globalAlpha = alpha * 0.6;
  ctx.lineWidth = 3 * Math.min(sx, sy) * (1 - progress);
  ctx.beginPath();
  ctx.arc(effect.pos.x * sx, effect.pos.y * sy, r * Math.min(sx, sy), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCollectEffect(ctx: CanvasRenderingContext2D, effect: { pos: Vec2; age: number }, sx: number, sy: number) {
  const progress = effect.age / 0.8;
  const alpha = 1 - progress;
  const r = 10 + progress * 40;
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  const grad = ctx.createRadialGradient(
    effect.pos.x * sx, effect.pos.y * sy, 0,
    effect.pos.x * sx, effect.pos.y * sy, r * Math.min(sx, sy)
  );
  grad.addColorStop(0, 'rgba(255,221,68,0.6)');
  grad.addColorStop(1, 'rgba(255,221,68,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(effect.pos.x * sx, effect.pos.y * sy, r * Math.min(sx, sy), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCurrentDrawing(ctx: CanvasRenderingContext2D, points: Vec2[] | null, sx: number, sy: number) {
  if (!points || points.length < 2) return;

  ctx.save();
  ctx.shadowColor = 'rgba(80,180,255,0.8)';
  ctx.shadowBlur = 15 * Math.min(sx, sy);
  ctx.strokeStyle = 'rgba(80,180,255,0.8)';
  ctx.lineWidth = 3 * Math.min(sx, sy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x * sx, points[0].y * sy);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * sx, points[i].y * sy);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  const last = points[points.length - 1];
  const grad = ctx.createRadialGradient(
    last.x * sx, last.y * sy, 0,
    last.x * sx, last.y * sy, 20 * Math.min(sx, sy)
  );
  grad.addColorStop(0, 'rgba(120,200,255,0.6)');
  grad.addColorStop(0.5, 'rgba(80,180,255,0.2)');
  grad.addColorStop(1, 'rgba(80,180,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(last.x * sx, last.y * sy, 20 * Math.min(sx, sy), 0, Math.PI * 2);
  ctx.fill();

  const ringR = 12 * Math.min(sx, sy);
  ctx.strokeStyle = 'rgba(120,200,255,0.5)';
  ctx.lineWidth = 2 * Math.min(sx, sy);
  ctx.beginPath();
  ctx.arc(last.x * sx, last.y * sy, ringR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onStateUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>(generateStars(200));
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const stateRef = useRef<GameState>(gameState);
  const mousePosRef = useRef<Vec2 | null>(null);

  stateRef.current = gameState;

  const canvasToGame = useCallback((canvasX: number, canvasY: number, canvas: HTMLCanvasElement): Vec2 => {
    const rect = canvas.getBoundingClientRect();
    const x = (canvasX / rect.width) * GAME_WIDTH;
    const y = (canvasY / rect.height) * GAME_HEIGHT;
    return { x, y };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const handlePointerDown = (e: PointerEvent) => {
      const gamePos = canvasToGame(e.clientX, e.clientY, canvas);
      const newState = startDrawing(stateRef.current, gamePos);
      onStateUpdate(newState);
      mousePosRef.current = gamePos;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const gamePos = canvasToGame(e.clientX, e.clientY, canvas);
      mousePosRef.current = gamePos;
      if (stateRef.current.phase === 'drawing') {
        const newState = continueDrawing(stateRef.current, gamePos);
        onStateUpdate(newState);
      }
    };

    const handlePointerUp = () => {
      if (stateRef.current.phase === 'drawing') {
        const newState = finishDrawing(stateRef.current);
        onStateUpdate(newState);
      }
      mousePosRef.current = null;
    };

    const handlePointerCancel = () => {
      if (stateRef.current.phase === 'drawing') {
        const newState = cancelDrawing(stateRef.current);
        onStateUpdate(newState);
      }
      mousePosRef.current = null;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);

    lastTimeRef.current = performance.now();

    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      const currentState = stateRef.current;
      const newState = update(currentState, dt);
      if (newState !== currentState) {
        onStateUpdate(newState);
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const sx = w / GAME_WIDTH;
      const sy = h / GAME_HEIGHT;

      ctx.clearRect(0, 0, w, h);

      drawBackground(ctx, w, h);
      drawStars(ctx, starsRef.current, newState.time, sx, sy);
      drawNebulae(ctx, newState.nebulae, sx, sy);

      for (const zone of newState.interferenceZones) {
        drawInterferenceZone(ctx, zone, newState.time, sx, sy);
      }

      for (const bh of newState.blackHoles) {
        drawBlackHole(ctx, bh, newState.time, sx, sy);
      }

      for (const gate of newState.starGates) {
        drawStarGate(ctx, gate, sx, sy);
      }

      for (const fragment of newState.starFragments) {
        drawStarFragment(ctx, fragment, sx, sy);
      }

      for (const line of newState.gravityLines) {
        drawGravityLine(ctx, line.points, line.age, sx, sy);
      }

      drawCurrentDrawing(ctx, newState.currentDrawing, sx, sy);

      for (const asteroid of newState.asteroids) {
        drawAsteroidTrail(ctx, asteroid.trail, sx, sy);
      }
      for (const asteroid of newState.asteroids) {
        drawAsteroid(ctx, asteroid, sx, sy);
      }

      drawPlayerPlanet(ctx, newState.playerPlanet, newState.time, sx, sy);

      drawParticles(ctx, newState.particles, sx, sy);

      for (const effect of newState.gateHitEffects) {
        drawGateHitEffect(ctx, effect, sx, sy);
      }
      for (const effect of newState.collectEffects) {
        drawCollectEffect(ctx, effect, sx, sy);
      }

      if (mousePosRef.current && newState.phase === 'drawing') {
        const mp = mousePosRef.current;
        const grad = ctx.createRadialGradient(
          mp.x * sx, mp.y * sy, 0,
          mp.x * sx, mp.y * sy, 25 * Math.min(sx, sy)
        );
        grad.addColorStop(0, 'rgba(120,200,255,0.4)');
        grad.addColorStop(0.5, 'rgba(120,200,255,0.1)');
        grad.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mp.x * sx, mp.y * sy, 25 * Math.min(sx, sy), 0, Math.PI * 2);
        ctx.fill();

        const ringPhase = newState.time * 5;
        const ringR = (8 + 4 * Math.sin(ringPhase)) * Math.min(sx, sy);
        ctx.strokeStyle = 'rgba(120,200,255,0.6)';
        ctx.lineWidth = 1.5 * Math.min(sx, sy);
        ctx.beginPath();
        ctx.arc(mp.x * sx, mp.y * sy, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      cancelAnimationFrame(rafRef.current);
    };
  }, [canvasToGame, onStateUpdate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: gameState.phase === 'drawing' ? 'crosshair' : 'default',
        touchAction: 'none',
      }}
    />
  );
};

export default GameCanvas;
