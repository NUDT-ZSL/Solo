import { generateCave, Point, WallSegment, CaveMap } from './environment.js';

interface Bat {
  x: number;
  y: number;
  wingPhase: number;
  wingFrequency: number;
  isHit: boolean;
  hitTimer: number;
}

interface WaveRay {
  x: number;
  y: number;
  dx: number;
  dy: number;
  remainingDist: number;
  bouncesLeft: number;
  pathPoints: Point[];
  active: boolean;
}

interface SoundWave {
  centerX: number;
  centerY: number;
  rays: WaveRay[];
  maxRadius: number;
  bornAt: number;
  life: number;
}

interface Bug {
  x: number;
  y: number;
  vx: number;
  vy: number;
  directionTimer: number;
  isCaptured: boolean;
  captureProgress: number;
  lastUpdateTime: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SpatialGrid {
  cellSize: number;
  cols: number;
  rows: number;
  cells: WallSegment[][];
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const NUM_RAYS = 72;
const WAVE_SPEED = 5;
const WAVE_MAX_RADIUS = 200;
const MAX_WAVES = 3;
const MAX_BOUNCES = 2;
const GRID_COLS = 8;
const GRID_ROWS = 8;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let caveMap: CaveMap;
let grid: SpatialGrid;

const bat: Bat = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
  wingPhase: 0,
  wingFrequency: 10,
  isHit: false,
  hitTimer: 0
};

let soundWaves: SoundWave[] = [];
let bugs: Bug[] = [];
let particles: Particle[] = [];
let score = 0;
let startTime = 0;
let lastBugSpawnTime = 0;
let flashTimer = 0;
let lastFrameTime = 0;
let lastMouseX = CANVAS_WIDTH / 2;
let lastMouseY = CANVAS_HEIGHT / 2;
let mouseSpeed = 0;
let mouseX = CANVAS_WIDTH / 2;
let mouseY = CANVAS_HEIGHT / 2;
let gameRunning = false;

function buildSpatialGrid(walls: WallSegment[]): SpatialGrid {
  const cellWidth = CANVAS_WIDTH / GRID_COLS;
  const cellHeight = CANVAS_HEIGHT / GRID_ROWS;
  const cellSize = Math.max(cellWidth, cellHeight);
  const cells: WallSegment[][] = [];
  const total = GRID_COLS * GRID_ROWS;
  for (let i = 0; i < total; i++) cells[i] = [];

  for (const w of walls) {
    const minX = Math.min(w.x1, w.x2);
    const maxX = Math.max(w.x1, w.x2);
    const minY = Math.min(w.y1, w.y2);
    const maxY = Math.max(w.y1, w.y2);

    const startCol = Math.max(0, Math.floor(minX / cellWidth));
    const endCol = Math.min(GRID_COLS - 1, Math.floor(maxX / cellWidth));
    const startRow = Math.max(0, Math.floor(minY / cellHeight));
    const endRow = Math.min(GRID_ROWS - 1, Math.floor(maxY / cellHeight));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        cells[r * GRID_COLS + c].push(w);
      }
    }
  }
  return { cellSize, cols: GRID_COLS, rows: GRID_ROWS, cells };
}

function getNearbyWalls(x: number, y: number): WallSegment[] {
  const cellWidth = CANVAS_WIDTH / GRID_COLS;
  const cellHeight = CANVAS_HEIGHT / GRID_ROWS;
  const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x / cellWidth)));
  const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y / cellHeight)));
  const result: WallSegment[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
        result.push(...grid.cells[nr * GRID_COLS + nc]);
      }
    }
  }
  return result;
}

function raySegmentIntersect(
  rx: number, ry: number, rdx: number, rdy: number,
  x1: number, y1: number, x2: number, y2: number
): { t: number; u: number; px: number; py: number } | null {
  const v1x = rx - x1;
  const v1y = ry - y1;
  const v2x = x2 - x1;
  const v2y = y2 - y1;
  const v3x = -rdy;
  const v3y = rdx;

  const dot = v2x * v3x + v2y * v3y;
  if (Math.abs(dot) < 1e-6) return null;

  const t = (v2x * v1y - v2y * v1x) / dot;
  const u = (v1x * v3x + v1y * v3y) / dot;

  if (t >= 0 && u >= 0 && u <= 1) {
    return { t, u, px: rx + rdx * t, py: ry + rdy * t };
  }
  return null;
}

function createSoundWave(x: number, y: number): SoundWave {
  const rays: WaveRay[] = [];
  for (let i = 0; i < NUM_RAYS; i++) {
    const angle = (i / NUM_RAYS) * Math.PI * 2;
    rays.push({
      x,
      y,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      remainingDist: WAVE_MAX_RADIUS,
      bouncesLeft: MAX_BOUNCES,
      pathPoints: [{ x, y }],
      active: true
    });
  }
  return {
    centerX: x,
    centerY: y,
    rays,
    maxRadius: WAVE_MAX_RADIUS,
    bornAt: performance.now(),
    life: 0
  };
}

function spawnBug(): Bug | null {
  for (let attempt = 0; attempt < 30; attempt++) {
    const spawn = caveMap.bugSpawnPoints[Math.floor(Math.random() * caveMap.bugSpawnPoints.length)];
    const dx = spawn.x - bat.x;
    const dy = spawn.y - bat.y;
    if (Math.sqrt(dx * dx + dy * dy) >= 100) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 15;
      return {
        x: spawn.x,
        y: spawn.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        directionTimer: 0,
        isCaptured: false,
        captureProgress: 0,
        lastUpdateTime: performance.now()
      };
    }
  }
  return null;
}

function emitParticles(x: number, y: number, color: string, count: number, maxLife: number): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 100 + 30;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      color,
      size: Math.random() * 3 + 1
    });
  }
}

function initGame(): void {
  caveMap = generateCave(CANVAS_WIDTH, CANVAS_HEIGHT);
  grid = buildSpatialGrid(caveMap.walls);

  bat.x = CANVAS_WIDTH / 2;
  bat.y = CANVAS_HEIGHT / 2;
  bat.wingPhase = 0;
  bat.wingFrequency = 10;
  bat.isHit = false;
  bat.hitTimer = 0;

  soundWaves = [];
  particles = [];
  score = 0;
  startTime = performance.now();
  lastBugSpawnTime = startTime;
  flashTimer = 0;

  bugs = [];
  for (let i = 0; i < 6; i++) {
    const bug = spawnBug();
    if (bug) bugs.push(bug);
  }

  gameRunning = true;
}

function updateWave(wave: SoundWave, dt: number): void {
  const stepDist = WAVE_SPEED;
  wave.life += dt;

  for (const ray of wave.rays) {
    if (!ray.active) continue;

    let distToTravel = stepDist;
    while (distToTravel > 0 && ray.active && ray.remainingDist > 0) {
      const travel = Math.min(distToTravel, ray.remainingDist);
      let nearestHit: { t: number; px: number; py: number; wall: WallSegment } | null = null;

      const nearbyWalls = getNearbyWalls(ray.x, ray.y);
      for (const wall of nearbyWalls) {
        const hit = raySegmentIntersect(ray.x, ray.y, ray.dx, ray.dy, wall.x1, wall.y1, wall.x2, wall.y2);
        if (hit && hit.t > 0.001 && hit.t <= travel) {
          if (!nearestHit || hit.t < nearestHit.t) {
            nearestHit = { t: hit.t, px: hit.px, py: hit.py, wall };
          }
        }
      }

      if (nearestHit) {
        ray.x = nearestHit.px;
        ray.y = nearestHit.py;
        ray.pathPoints.push({ x: nearestHit.px, y: nearestHit.py });
        ray.remainingDist -= nearestHit.t;
        distToTravel -= nearestHit.t;

        if (ray.bouncesLeft > 0) {
          const wall = nearestHit.wall;
          const wdx = wall.x2 - wall.x1;
          const wdy = wall.y2 - wall.y1;
          const wlen = Math.sqrt(wdx * wdx + wdy * wdy);
          const nx = -wdy / wlen;
          const ny = wdx / wlen;
          const dot = ray.dx * nx + ray.dy * ny;
          ray.dx = ray.dx - 2 * dot * nx;
          ray.dy = ray.dy - 2 * dot * ny;
          ray.bouncesLeft--;
          ray.x += ray.dx * 0.5;
          ray.y += ray.dy * 0.5;
        } else {
          ray.active = false;
        }
      } else {
        ray.x += ray.dx * travel;
        ray.y += ray.dy * travel;
        ray.remainingDist -= travel;
        distToTravel = 0;
      }
    }

    if (ray.remainingDist <= 0) {
      ray.active = false;
      if (ray.pathPoints.length > 0) {
        ray.pathPoints.push({ x: ray.x, y: ray.y });
      }
    }
  }
}

function checkWaveBugCollisions(wave: SoundWave): void {
  for (const ray of wave.rays) {
    if (!ray.active) continue;
    for (const bug of bugs) {
      if (bug.isCaptured) continue;
      const dx = bug.x - ray.x;
      const dy = bug.y - ray.y;
      if (dx * dx + dy * dy < 64) {
        captureBug(bug);
      }
    }
  }
}

function captureBug(bug: Bug): void {
  if (bug.isCaptured) return;
  bug.isCaptured = true;
  bug.captureProgress = 0;
  score += 10;
  emitParticles(bug.x, bug.y, '#4ADE80', 10, 300);
}

function checkBatCollision(): void {
  const testR = 18;
  for (const wall of caveMap.walls) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const lenSq = dx * dx + dy * dy;
    let t = ((bat.x - wall.x1) * dx + (bat.y - wall.y1) * dy) / (lenSq || 1);
    t = Math.max(0, Math.min(1, t));
    const px = wall.x1 + dx * t;
    const py = wall.y1 + dy * t;
    const distSq = (bat.x - px) ** 2 + (bat.y - py) ** 2;
    if (distSq < testR * testR) {
      bat.isHit = true;
      bat.hitTimer = 150;
      return;
    }
  }
}

function updateBugs(dt: number, now: number): void {
  for (const bug of bugs) {
    if (bug.isCaptured) {
      bug.captureProgress += dt / 200;
      continue;
    }

    const dx = bug.x - bat.x;
    const dy = bug.y - bat.y;
    const distToBat = Math.sqrt(dx * dx + dy * dy);

    if (distToBat < 15) {
      captureBug(bug);
      continue;
    }

    const needsUpdate = distToBat < 200 || (now - bug.lastUpdateTime) > 500;
    if (!needsUpdate) continue;
    bug.lastUpdateTime = now;

    bug.directionTimer += dt;
    if (bug.directionTimer > 1000) {
      bug.directionTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 15;
      bug.vx = Math.cos(angle) * speed;
      bug.vy = Math.sin(angle) * speed;
    }

    bug.x += bug.vx * dt / 1000;
    bug.y += bug.vy * dt / 1000;

    bug.x = Math.max(50, Math.min(CANVAS_WIDTH - 50, bug.x));
    bug.y = Math.max(100, Math.min(CANVAS_HEIGHT - 100, bug.y));
  }

  bugs = bugs.filter(b => !(b.isCaptured && b.captureProgress >= 1));
}

function updateParticles(dt: number): void {
  for (const p of particles) {
    p.x += p.vx * dt / 1000;
    p.y += p.vy * dt / 1000;
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);
}

function updateBat(dt: number, now: number): void {
  bat.x = Math.max(30, Math.min(CANVAS_WIDTH - 30, mouseX));
  bat.y = Math.max(30, Math.min(CANVAS_HEIGHT - 30, mouseY));

  const frameInterval = Math.max(dt, 1);
  const instSpeed = Math.sqrt((bat.x - lastMouseX) ** 2 + (bat.y - lastMouseY) ** 2) * (1000 / frameInterval);
  mouseSpeed = mouseSpeed * 0.8 + instSpeed * 0.2;
  lastMouseX = bat.x;
  lastMouseY = bat.y;

  const clampedSpeed = Math.min(500, Math.max(0, mouseSpeed));
  bat.wingFrequency = 10 + (clampedSpeed / 500) * 10;
  bat.wingPhase += (bat.wingFrequency * Math.PI * 2 * dt) / 1000;

  if (bat.hitTimer > 0) {
    bat.hitTimer -= dt;
    if (bat.hitTimer <= 0) bat.isHit = false;
  }

  checkBatCollision();

  if (now - lastBugSpawnTime > 2000 && bugs.filter(b => !b.isCaptured).length < 8) {
    const newBug = spawnBug();
    if (newBug) {
      bugs.push(newBug);
      lastBugSpawnTime = now;
    }
  }
}

function drawBackground(): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#0A0A1A');
  gradient.addColorStop(1, '#1A1A2A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawCave(): void {
  ctx.strokeStyle = '#4A5A6A';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  if (caveMap.topCurve.length > 0) {
    ctx.moveTo(caveMap.topCurve[0].x, caveMap.topCurve[0].y);
    for (let i = 1; i < caveMap.topCurve.length; i++) {
      ctx.lineTo(caveMap.topCurve[i].x, caveMap.topCurve[i].y);
    }
  }
  ctx.stroke();

  ctx.beginPath();
  if (caveMap.bottomCurve.length > 0) {
    ctx.moveTo(caveMap.bottomCurve[0].x, caveMap.bottomCurve[0].y);
    for (let i = 1; i < caveMap.bottomCurve.length; i++) {
      ctx.lineTo(caveMap.bottomCurve[i].x, caveMap.bottomCurve[i].y);
    }
  }
  ctx.stroke();

  ctx.fillStyle = '#3A4A5A';
  ctx.strokeStyle = '#3A4A5A';
  ctx.lineWidth = 2;
  for (const s of caveMap.stalactites) {
    ctx.beginPath();
    const halfW = s.baseWidth / 2;
    if (s.isTop) {
      ctx.moveTo(s.x - halfW, s.y);
      ctx.lineTo(s.x, s.y + s.height);
      ctx.lineTo(s.x + halfW, s.y);
    } else {
      ctx.moveTo(s.x - halfW, s.y);
      ctx.lineTo(s.x, s.y - s.height);
      ctx.lineTo(s.x + halfW, s.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawBat(): void {
  ctx.save();
  ctx.translate(bat.x, bat.y);

  const wingOffset = Math.sin(bat.wingPhase) * 15;
  const color = bat.isHit ? '#FF4444' : '#FFFFFF';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(-20, 5 + wingOffset);
  ctx.lineTo(-5, 5);
  ctx.lineTo(0, 15);
  ctx.lineTo(5, 5);
  ctx.lineTo(20, 5 - wingOffset);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawSoundWaves(): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const wave of soundWaves) {
    const progress = Math.min(1, wave.life / 1500);
    const alpha = 0.6 * (1 - progress);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 2;

    for (const ray of wave.rays) {
      if (ray.pathPoints.length < 2 && !ray.active) continue;
      ctx.beginPath();
      const points = [...ray.pathPoints];
      if (ray.active) points.push({ x: ray.x, y: ray.y });
      if (points.length < 2) continue;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }
  }
}

function drawBugs(): void {
  for (const bug of bugs) {
    const size = bug.isCaptured ? 6 * (1 - bug.captureProgress) : 6;
    if (size <= 0) continue;

    ctx.save();
    ctx.translate(bug.x, bug.y);
    ctx.rotate(Math.PI / 4);

    ctx.fillStyle = '#4ADE80';
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 1;
    ctx.fillRect(-size / 2, -size / 2, size, size);

    ctx.restore();
  }
}

function drawParticles(): void {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRadar(): void {
  const radarX = bat.x - 50;
  const radarY = bat.y - 50;
  const radarR = 30;
  const radarRange = 150;

  ctx.save();
  ctx.beginPath();
  ctx.arc(radarX, radarY, radarR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.clip();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  for (const wall of caveMap.walls) {
    const x1 = radarX + ((wall.x1 - bat.x) / radarRange) * radarR;
    const y1 = radarY + ((wall.y1 - bat.y) / radarRange) * radarR;
    const x2 = radarX + ((wall.x2 - bat.x) / radarRange) * radarR;
    const y2 = radarY + ((wall.y2 - bat.y) / radarRange) * radarR;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.fillStyle = '#4ADE80';
  for (const bug of bugs) {
    if (bug.isCaptured) continue;
    const dx = bug.x - bat.x;
    const dy = bug.y - bat.y;
    if (dx * dx + dy * dy <= radarRange * radarRange) {
      const bx = radarX + (dx / radarRange) * radarR;
      const by = radarY + (dy / radarRange) * radarR;
      ctx.beginPath();
      ctx.arc(bx, by, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(radarX, radarY, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHUD(elapsed: number): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`得分: ${score}`, 20, 20);
  ctx.fillText(`时间: ${Math.floor(elapsed / 1000)}s`, 20, 48);

  const dotY = 30;
  const dotSpacing = 20;
  const availableDots = MAX_WAVES - soundWaves.length;
  for (let i = 0; i < MAX_WAVES; i++) {
    const dotX = CANVAS_WIDTH - 20 - i * dotSpacing;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    if (i < availableDots) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawFlash(): void {
  if (flashTimer <= 0) return;
  const alpha = (flashTimer / 100) * 0.2;
  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}

function gameLoop(now: number): void {
  if (!lastFrameTime) lastFrameTime = now;
  const dt = Math.min(33, now - lastFrameTime);
  lastFrameTime = now;

  if (!gameRunning) {
    requestAnimationFrame(gameLoop);
    return;
  }

  updateBat(dt, now);

  for (const wave of soundWaves) {
    updateWave(wave, dt);
    checkWaveBugCollisions(wave);
  }
  soundWaves = soundWaves.filter(w => w.life < 2000);

  updateBugs(dt, now);
  updateParticles(dt);

  if (flashTimer > 0) flashTimer -= dt;

  const elapsed = now - startTime;

  drawBackground();
  drawCave();
  drawBugs();
  drawSoundWaves();
  drawBat();
  drawParticles();
  drawRadar();
  drawHUD(elapsed);
  drawFlash();

  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = (e.clientY - rect.top) * scaleY;
});

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Space' && gameRunning) {
    e.preventDefault();
    if (soundWaves.length < MAX_WAVES) {
      soundWaves.push(createSoundWave(bat.x, bat.y));
      flashTimer = 100;
    }
  }
});

function resizeCanvas(): void {
  const windowRatio = window.innerWidth / window.innerHeight;
  const gameRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
  let displayWidth: number;
  let displayHeight: number;

  if (windowRatio > gameRatio) {
    displayHeight = window.innerHeight;
    displayWidth = displayHeight * gameRatio;
  } else {
    displayWidth = window.innerWidth;
    displayHeight = displayWidth / gameRatio;
  }

  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
}

window.addEventListener('resize', resizeCanvas);

initGame();
resizeCanvas();
requestAnimationFrame(gameLoop);
