import {
  type CelestialBody,
  type Particle,
  type BackgroundStar,
  type Vec2,
  createBody,
  drawCelestialBody,
  drawParticle,
  drawBackgroundStars,
  generateBackgroundStars,
} from './entities';
import {
  stepPhysics,
  computeKineticEnergy,
  updateParticles,
} from './physics';

const PLANET_MASS = 10;
const STAR_MASS = 1000;

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const bodyCountEl = document.getElementById('bodyCount')!;
const kineticEnergyEl = document.getElementById('kineticEnergy')!;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
const speedValueEl = document.getElementById('speedValue')!;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const controlPanel = document.getElementById('controlPanel') as HTMLDivElement;

let bodies: CelestialBody[] = [];
let particles: Particle[] = [];
let backgroundStars: BackgroundStar[] = [];

let camera = {
  x: 0,
  y: 0,
  targetScale: 1,
  currentScale: 1,
  scaleVelocity: 0,
  targetX: 0,
  targetY: 0,
};

let speedMultiplier = 1;

let selectedBodyId: number | null = null;

let isDragging = false;
let dragStart: Vec2 = { x: 0, y: 0 };
let cameraStart: Vec2 = { x: 0, y: 0 };
let dragMoved = false;

let resetting = false;
let resetOpacity = 1;

const ZOOM_EASE = 1 / 0.15;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const starCount = Math.floor((window.innerWidth * window.innerHeight) / 8000);
  backgroundStars = generateBackgroundStars(window.innerWidth, window.innerHeight, starCount);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function screenToWorld(sx: number, sy: number): Vec2 {
  return {
    x: (sx - window.innerWidth / 2) / camera.currentScale - camera.x,
    y: (sy - window.innerHeight / 2) / camera.currentScale - camera.y,
  };
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0 || e.button === 2) {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    cameraStart = { x: camera.x, y: camera.y };
    dragMoved = false;
  }

  if (e.button === 0) {
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = findBodyAt(world.x, world.y);
    selectedBodyId = hit ? hit.id : null;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    dragMoved = true;
  }

  camera.targetX = cameraStart.x + dx / camera.currentScale;
  camera.targetY = cameraStart.y + dy / camera.currentScale;
  camera.x = camera.targetX;
  camera.y = camera.targetY;
});

canvas.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;

  if (!dragMoved && !resetting) {
    const world = screenToWorld(e.clientX, e.clientY);

    if (e.button === 0) {
      const hit = findBodyAt(world.x, world.y);
      if (!hit) {
        const body = createBody(PLANET_MASS, world, { x: 0, y: 0 }, false);
        bodies.push(body);
      }
    } else if (e.button === 2) {
      const body = createBody(STAR_MASS, world, { x: 0, y: 0 }, true);
      bodies.push(body);
    }
  }
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const newTargetScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.targetScale * zoomFactor));

  const worldBefore = screenToWorld(e.clientX, e.clientY);
  camera.targetScale = newTargetScale;
  camera.scaleVelocity = (camera.targetScale - camera.currentScale) * ZOOM_EASE;

  const worldAfter = screenToWorldWithScale(e.clientX, e.clientY, camera.targetScale);
  camera.targetX += worldAfter.x - worldBefore.x;
  camera.targetY += worldAfter.y - worldBefore.y;
}, { passive: false });

function screenToWorldWithScale(sx: number, sy: number, scale: number): Vec2 {
  return {
    x: (sx - window.innerWidth / 2) / scale - camera.x,
    y: (sy - window.innerHeight / 2) / scale - camera.y,
  };
}

function findBodyAt(wx: number, wy: number): CelestialBody | null {
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i];
    if (b.isDeleting) continue;
    const dx = b.position.x - wx;
    const dy = b.position.y - wy;
    const r = Math.max(b.radius, 8);
    if (dx * dx + dy * dy <= r * r) {
      return b;
    }
  }
  return null;
}

window.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBodyId !== null) {
    const body = bodies.find(b => b.id === selectedBodyId);
    if (body && !body.isDeleting) {
      body.isDeleting = true;
      body.deleteProgress = 0;
      selectedBodyId = null;
    }
  }
});

speedSlider.addEventListener('input', () => {
  speedMultiplier = parseFloat(speedSlider.value);
  speedValueEl.textContent = speedMultiplier.toFixed(1) + '×';
  speedValueEl.classList.remove('flash');
  void speedValueEl.offsetWidth;
  speedValueEl.classList.add('flash');
  setTimeout(() => {
    speedValueEl.classList.remove('flash');
  }, 100);
});

resetBtn.addEventListener('click', () => {
  if (resetting) return;
  resetting = true;
  resetOpacity = 1;
  controlPanel.classList.add('fading');

  for (const b of bodies) {
    b.isDeleting = true;
  }
  selectedBodyId = null;

  setTimeout(() => {
    bodies = [];
    particles = [];
    resetting = false;
    resetOpacity = 1;
    controlPanel.classList.remove('fading');
  }, 500);
});

let lastTime = performance.now();

function loop(now: number): void {
  const rawDt = (now - lastTime) / 1000;
  const dt = Math.min(rawDt, 1 / 30);
  lastTime = now;

  updateCamera(dt);

  if (!resetting) {
    const result = stepPhysics(bodies, dt, speedMultiplier);
    bodies = result.bodies;
    for (const p of result.newParticles) {
      particles.push(p);
    }
  } else {
    for (const b of bodies) {
      if (!b.isDeleting) b.isDeleting = true;
      b.deleteProgress += dt / 0.5;
      if (b.deleteProgress > 1) b.deleteProgress = 1;
    }
  }

  particles = updateParticles(particles, dt);

  bodies = bodies.filter(b => !(b.isDeleting && b.deleteProgress >= 1));

  render(now);
  updateStats();

  requestAnimationFrame(loop);
}

function updateCamera(dt: number): void {
  const scaleDiff = camera.targetScale - camera.currentScale;
  camera.scaleVelocity += scaleDiff * ZOOM_EASE * ZOOM_EASE * dt;
  camera.scaleVelocity *= Math.pow(0.001, dt);
  camera.currentScale += camera.scaleVelocity * dt;

  if (Math.abs(camera.targetScale - camera.currentScale) < 0.001 && Math.abs(camera.scaleVelocity) < 0.01) {
    camera.currentScale = camera.targetScale;
    camera.scaleVelocity = 0;
  }

  camera.currentScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.currentScale));

  camera.x += (camera.targetX - camera.x) * Math.min(1, dt * 10);
  camera.y += (camera.targetY - camera.y) * Math.min(1, dt * 10);
}

function render(now: number): void {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.fillStyle = '#0B0B1A';
  ctx.fillRect(0, 0, w, h);

  if (resetting) {
    resetOpacity = Math.max(0, resetOpacity - dt * 2);
  }

  drawBackgroundStars(ctx, backgroundStars, now);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(camera.currentScale, camera.currentScale);
  ctx.translate(camera.x, camera.y);

  if (selectedBodyId !== null) {
    const sel = bodies.find(b => b.id === selectedBodyId);
    if (sel && !sel.isDeleting) {
      ctx.save();
      ctx.strokeStyle = 'rgba(110, 168, 255, 0.6)';
      ctx.lineWidth = 2 / camera.currentScale;
      ctx.setLineDash([6 / camera.currentScale, 4 / camera.currentScale]);
      ctx.beginPath();
      ctx.arc(sel.position.x, sel.position.y, sel.radius * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  const sortedBodies = [...bodies].sort((a, b) => (a.isStar ? 1 : 0) - (b.isStar ? 1 : 0));
  for (const body of sortedBodies) {
    drawCelestialBody(ctx, body, now);
  }

  for (const p of particles) {
    drawParticle(ctx, p);
  }

  ctx.restore();
}

function updateStats(): void {
  const activeCount = bodies.filter(b => !b.isDeleting).length;
  bodyCountEl.textContent = String(activeCount);

  const ke = computeKineticEnergy(bodies);
  if (ke >= 1000) {
    kineticEnergyEl.textContent = ke.toExponential(2);
  } else {
    kineticEnergyEl.textContent = ke.toFixed(1);
  }
}

requestAnimationFrame(loop);
