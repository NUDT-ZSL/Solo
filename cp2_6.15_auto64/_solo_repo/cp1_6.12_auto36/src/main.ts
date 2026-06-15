import { CelestialBody, SimulationState, Vec2 } from './entities';
import { updatePhysics, computeTotalEnergy } from './gravity';
import { render, resizeCanvas } from './renderer';
import { getUIPanel, bindUI, updateBodyInfo, getAsteroidParams, selectBody, findBodyAtPosition } from './ui';

const SUN_MASS = 10000;
const EARTH_MASS = 1.0;
const JUPITER_MASS = 318.0;
const MARS_MASS = 0.107;

function createInitialState(canvasWidth: number, canvasHeight: number): SimulationState {
  const state = new SimulationState();
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  const star = new CelestialBody(
    '恒星',
    SUN_MASS,
    { x: cx, y: cy },
    { x: 0, y: 0 },
    22,
    '#ffcc00',
    true
  );
  state.addBody(star);

  const planets = [
    { name: '地球', mass: EARTH_MASS, color: '#2196F3', radius: 8, orbitRadius: 160 },
    { name: '木星', mass: JUPITER_MASS, color: '#FF9800', radius: 14, orbitRadius: 280 },
    { name: '火星', mass: MARS_MASS, color: '#e57373', radius: 6, orbitRadius: 220 },
  ];

  for (const p of planets) {
    const angle = Math.random() * Math.PI * 2;
    const px = cx + Math.cos(angle) * p.orbitRadius;
    const py = cy + Math.sin(angle) * p.orbitRadius;

    const orbitalSpeed = Math.sqrt(state.G * SUN_MASS / p.orbitRadius);
    const vx = -Math.sin(angle) * orbitalSpeed;
    const vy = Math.cos(angle) * orbitalSpeed;

    const planet = new CelestialBody(
      p.name,
      p.mass,
      { x: px, y: py },
      { x: vx, y: vy },
      p.radius,
      p.color
    );
    state.addBody(planet);
  }

  state.cameraPos = { x: 0, y: 0 };

  return state;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

let canvasW = 0;
let canvasH = 0;

function updateCamera(state: SimulationState, now: number): Vec2 {
  if (state.cameraTarget && !state.cameraTarget.isStar) {
    const elapsed = now - state.cameraTransitionStart;
    const duration = state.cameraTransitionDuration;
    const t = Math.min(1, elapsed / duration);
    const eased = easeInOutCubic(t);

    const targetCamX = -state.cameraTarget.pos.x + (canvasW / 2);
    const targetCamY = -state.cameraTarget.pos.y + (canvasH / 2);

    if (t < 1) {
      state.cameraPos.x = state.cameraFrom.x + (targetCamX - state.cameraFrom.x) * eased;
      state.cameraPos.y = state.cameraFrom.y + (targetCamY - state.cameraFrom.y) * eased;
    } else {
      state.cameraPos.x = targetCamX;
      state.cameraPos.y = targetCamY;
    }
  } else {
    const star = state.bodies.find((b) => b.isStar);
    if (star) {
      const targetCamX = -star.pos.x + (canvasW / 2);
      const targetCamY = -star.pos.y + (canvasH / 2);
      state.cameraPos.x += (targetCamX - state.cameraPos.x) * 0.1;
      state.cameraPos.y += (targetCamY - state.cameraPos.y) * 0.1;
    }
  }

  return state.cameraPos;
}

function screenToWorld(sx: number, sy: number, camOffset: Vec2): Vec2 {
  return {
    x: sx - camOffset.x,
    y: sy - camOffset.y,
  };
}

function main(): void {
  const canvas = document.getElementById('simCanvas') as HTMLCanvasElement;
  const container = document.getElementById('canvas-container') as HTMLElement;
  const ctx = canvas.getContext('2d')!;

  if (!canvas || !container || !ctx) {
    console.error('Failed to get required DOM elements');
    return;
  }

  let isDragging = false;
  let dragStart: Vec2 | null = null;
  let dragEnd: Vec2 | null = null;
  let lastTime = performance.now();
  let totalTime = 0;
  let frameCount = 0;
  let fpsTime = 0;
  let currentFps = 60;
  let initialEnergy = 0;
  let lastDriftPercent = 0;
  let wasCorrected = false;

  canvasW = Math.max(container.clientWidth, 800);
  canvasH = Math.floor(canvasW * 9 / 16);
  canvas.width = canvasW;
  canvas.height = canvasH;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';

  const state = createInitialState(canvasW, canvasH);
  const ui = getUIPanel();
  bindUI(ui, state);

  initialEnergy = computeTotalEnergy(state.bodies, state.G);

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorld(sx, sy, state.cameraPos);

    const clickedBody = findBodyAtPosition(state, worldPos.x, worldPos.y);
    if (clickedBody) {
      selectBody(state, clickedBody, performance.now());
      return;
    }

    const star = state.bodies.find((b) => b.isStar);
    if (star) {
      const dx = worldPos.x - star.pos.x;
      const dy = worldPos.y - star.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < star.radius + 20) {
        isDragging = true;
        dragStart = { x: star.pos.x, y: star.pos.y };
        dragEnd = { x: worldPos.x, y: worldPos.y };
      }
    }
  });

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorld(sx, sy, state.cameraPos);
    dragEnd = { x: worldPos.x, y: worldPos.y };
  });

  canvas.addEventListener('mouseup', () => {
    if (isDragging && dragStart && dragEnd) {
      const dx = dragEnd.x - dragStart.x;
      const dy = dragEnd.y - dragStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        const params = getAsteroidParams(ui);
        const angle = Math.atan2(dy, dx);
        const vel: Vec2 = {
          x: Math.cos(angle) * params.speed,
          y: Math.sin(angle) * params.speed,
        };

        const asteroid = new CelestialBody(
          '小行星',
          params.mass,
          { x: dragStart.x, y: dragStart.y },
          vel,
          params.radius,
          '#88ccff',
          false,
          true
        );
        asteroid.maxTrailLen = state.trailLength;
        state.addBody(asteroid);
        initialEnergy = computeTotalEnergy(state.bodies, state.G);
      }
    }

    isDragging = false;
    dragStart = null;
    dragEnd = null;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    dragStart = null;
    dragEnd = null;
  });

  window.addEventListener('resize', () => {
    const sz = resizeCanvas(canvas, container);
    canvasW = sz.width;
    canvasH = sz.height;
  });

  function loop(now: number): void {
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    totalTime += dt * state.timeScale;

    frameCount++;
    fpsTime += rawDt;
    if (fpsTime >= 1.0) {
      currentFps = frameCount / fpsTime;
      frameCount = 0;
      fpsTime = 0;
    }

    const physicsResult = updatePhysics(state, dt, totalTime, initialEnergy);
    lastDriftPercent = physicsResult.driftPercent;
    wasCorrected = physicsResult.corrected;

    if (wasCorrected) {
      initialEnergy = computeTotalEnergy(state.bodies, state.G);
    }

    const camOffset = updateCamera(state, now);

    render(ctx, state, canvasW, canvasH, totalTime, camOffset, dragStart, dragEnd);

    updateBodyInfo(ui, state);

    if (currentFps > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`FPS: ${currentFps.toFixed(0)}`, 10, 20);
    }

    ctx.fillStyle = lastDriftPercent > 1.0 ? 'rgba(255,150,150,0.6)' : 'rgba(255,255,255,0.3)';
    ctx.fillText(`能量偏移: ${lastDriftPercent.toFixed(2)}%${wasCorrected ? ' [已校正]' : ''}`, 10, 36);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`天体数: ${state.bodies.length}`, 10, 52);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
