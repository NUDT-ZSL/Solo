import {
  TrajectoryMode,
  Emitter,
  getEmitters,
  getEnemyBullets,
  createEmitter,
  clearEmitters,
  findEmitterAt,
  updateEmitters,
} from './emitter';
import {
  Particle,
  FlashRing,
  getParticles,
  getFlashRings,
  checkCollisions,
  updateParticles,
  clearParticles,
} from './collision';

const CANVAS_W = 1100;
const CANVAS_H = 600;
const GRID_SIZE = 40;

interface PlayerBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPlayer: boolean;
  age: number;
  maxAge: number;
}

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  age: number;
  maxAge: number;
  size: number;
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const bulletCounterEl = document.getElementById('bulletCounter')!;
const fpsDisplayEl = document.getElementById('fpsDisplay')!;
const sceneSummaryEl = document.getElementById('sceneSummary')!;
const emitterControlsEl = document.getElementById('emitterControls')!;
const noSelectionEl = document.getElementById('noSelection')!;
const bulletColorInput = document.getElementById('bulletColor') as HTMLInputElement;
const freqSlider = document.getElementById('freqSlider') as HTMLInputElement;
const freqValueEl = document.getElementById('freqValue')!;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
const speedValueEl = document.getElementById('speedValue')!;
const modeSelect = document.getElementById('modeSelect') as HTMLSelectElement;
const clearBtn = document.getElementById('clearBtn')!;
const resetBtn = document.getElementById('resetBtn')!;
const resetOverlay = document.getElementById('resetOverlay')!;

let gridCanvas: HTMLCanvasElement;

const player = {
  x: CANVAS_W / 2,
  y: CANVAS_H - 80,
  speed: 6,
  size: 24,
  color: '#4FC3F7',
  lastShot: 0,
  shotCooldown: 150,
};

const playerBullets: PlayerBullet[] = [];
const trailParticles: TrailParticle[] = [];
const keys: Record<string, boolean> = {};
let selectedEmitter: Emitter | null = null;
let draggingEmitter: Emitter | null = null;
let offsetX = 0;
let offsetY = 0;

let lastFrameTime = performance.now();
let fpsFrameCount = 0;
let fpsAccum = 0;
let currentFps = 60;
let fpsUpdateTimer = 0;
let frameCount = 0;

function createGridCache(): void {
  gridCanvas = document.createElement('canvas');
  gridCanvas.width = CANVAS_W;
  gridCanvas.height = CANVAS_H;
  const gctx = gridCanvas.getContext('2d')!;
  gctx.fillStyle = '#1A1A2E';
  gctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  gctx.strokeStyle = '#3A3A4A';
  gctx.lineWidth = 1;
  for (let x = 0; x <= CANVAS_W; x += GRID_SIZE) {
    gctx.beginPath();
    gctx.moveTo(x, 0);
    gctx.lineTo(x, CANVAS_H);
    gctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += GRID_SIZE) {
    gctx.beginPath();
    gctx.moveTo(0, y);
    gctx.lineTo(CANVAS_W, y);
    gctx.stroke();
  }
}

function drawBackground(): void {
  ctx.drawImage(gridCanvas, 0, 0);
}

function drawEmitter(e: Emitter): void {
  ctx.save();
  const isHighlighted = e.isDragging || selectedEmitter === e;
  const color = isHighlighted ? '#FFD700' : '#FFAA00';
  ctx.shadowBlur = isHighlighted ? 25 : 12;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(e.x - 8, e.y);
  ctx.lineTo(e.x + 8, e.y);
  ctx.moveTo(e.x, e.y - 8);
  ctx.lineTo(e.x, e.y + 8);
  ctx.stroke();
  if (selectedEmitter === e) {
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(e.x, e.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawBullet(b: { x: number; y: number; radius: number; color: string; isPlayer: boolean }): void {
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = b.color;
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  if (b.isPlayer) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(b.x, b.y - 1, b.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(): void {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowBlur = 15;
  ctx.shadowColor = player.color;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.moveTo(0, -player.size / 2);
  ctx.lineTo(-player.size / 2, player.size / 2);
  ctx.lineTo(player.size / 2, player.size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.moveTo(0, -player.size / 3);
  ctx.lineTo(-player.size / 5, player.size / 4);
  ctx.lineTo(player.size / 5, player.size / 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawParticles(list: Particle[]): void {
  for (const p of list) {
    if (!p.active) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFlashRings(list: FlashRing[]): void {
  for (const r of list) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, r.alpha);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTrailParticles(): void {
  for (const t of trailParticles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.alpha);
    ctx.fillStyle = '#81D4FA';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#4FC3F7';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function firePlayerBullet(): void {
  const now = performance.now();
  if (now - player.lastShot < player.shotCooldown) return;
  if (playerBullets.length >= 10) return;
  player.lastShot = now;
  playerBullets.push({
    x: player.x,
    y: player.y - player.size / 2,
    vx: 0,
    vy: -12,
    radius: 6,
    color: '#FFEB3B',
    isPlayer: true,
    age: 0,
    maxAge: 90,
  });
}

function updatePlayer(now: number): void {
  let dx = 0;
  let dy = 0;
  if (keys['w'] || keys['W']) dy -= 1;
  if (keys['s'] || keys['S']) dy += 1;
  if (keys['a'] || keys['A']) dx -= 1;
  if (keys['d'] || keys['D']) dx += 1;
  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
    player.x += dx * player.speed;
    player.y += dy * player.speed;
    player.x = Math.max(player.size / 2, Math.min(CANVAS_W - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(CANVAS_H - player.size / 2, player.y));
    if (Math.random() < 0.7) {
      trailParticles.push({
        x: player.x + (Math.random() - 0.5) * 6,
        y: player.y + player.size / 2,
        vx: (Math.random() - 0.5) * 1,
        vy: 1 + Math.random() * 1.5,
        alpha: 0.8,
        age: 0,
        maxAge: 20,
        size: 2 + Math.random() * 2,
      });
    }
  }
  if (keys[' ']) firePlayerBullet();
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i];
    b.age++;
    b.x += b.vx;
    b.y += b.vy;
    if (b.age >= b.maxAge || b.y < -20) {
      playerBullets.splice(i, 1);
    }
  }
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const t = trailParticles[i];
    t.age++;
    t.x += t.vx;
    t.y += t.vy;
    t.alpha = 0.8 * (1 - t.age / t.maxAge);
    if (t.age >= t.maxAge) trailParticles.splice(i, 1);
  }
  void now;
}

function updateUI(): void {
  const emitters = getEmitters();
  const enemyBullets = getEnemyBullets();
  const total = playerBullets.length + enemyBullets.length;
  bulletCounterEl.textContent = `子弹总数：${total}`;
  sceneSummaryEl.textContent = `发射器：${emitters.length} | 敌人子弹：${enemyBullets.length} | 玩家子弹：${playerBullets.length}`;
}

function updateSelectedEmitterUI(): void {
  if (selectedEmitter) {
    emitterControlsEl.style.display = 'flex';
    noSelectionEl.style.display = 'none';
    bulletColorInput.value = selectedEmitter.color;
    freqSlider.value = String(selectedEmitter.frequency);
    freqValueEl.textContent = `${selectedEmitter.frequency.toFixed(1)}s`;
    speedSlider.value = String(selectedEmitter.speed);
    speedValueEl.textContent = String(selectedEmitter.speed);
    modeSelect.value = selectedEmitter.mode === 'mixed' ? 'linear' : selectedEmitter.mode;
  } else {
    emitterControlsEl.style.display = 'none';
    noSelectionEl.style.display = 'flex';
  }
}

function render(now: number): void {
  drawBackground();
  for (const e of getEmitters()) drawEmitter(e);
  for (const b of getEnemyBullets()) drawBullet(b);
  for (const b of playerBullets) drawBullet(b);
  drawTrailParticles();
  drawPlayer();
  drawParticles(getParticles());
  drawFlashRings(getFlashRings());
  void now;
}

function gameLoop(timestamp: number): void {
  const dt = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  frameCount++;
  fpsFrameCount++;
  fpsAccum += dt;
  fpsUpdateTimer += dt;
  if (fpsAccum >= 100) {
    currentFps = Math.round((fpsFrameCount * 1000) / fpsAccum);
    fpsFrameCount = 0;
    fpsAccum = 0;
  }
  if (fpsUpdateTimer >= 100) {
    fpsDisplayEl.textContent = String(currentFps);
    fpsUpdateTimer = 0;
  }
  const enemyBullets = getEnemyBullets();
  const totalBullets = playerBullets.length + enemyBullets.length;
  const shouldSkip = totalBullets > 200 && frameCount % 2 === 0;
  if (!shouldSkip) {
    updatePlayer(timestamp);
    updateEmitters(timestamp, dt);
    const result = checkCollisions(playerBullets as any, enemyBullets as any);
    const pSorted = [...result.playerBulletIndices].sort((a, b) => b - a);
    const eSorted = [...result.enemyBulletIndices].sort((a, b) => b - a);
    for (const i of pSorted) playerBullets.splice(i, 1);
    for (const i of eSorted) enemyBullets.splice(i, 1);
    updateParticles();
  }
  render(timestamp);
  updateUI();
  requestAnimationFrame(gameLoop);
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top) * sy,
  };
}

function bindEvents(): void {
  document.querySelectorAll('.emitter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = (btn as HTMLElement).dataset.mode as TrajectoryMode;
      const e = createEmitter(mode);
      if (e) {
        selectedEmitter = e;
        updateSelectedEmitterUI();
      }
    });
  });
  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = getCanvasCoords(e);
    const emitter = findEmitterAt(x, y);
    if (emitter) {
      draggingEmitter = emitter;
      emitter.isDragging = true;
      selectedEmitter = emitter;
      updateSelectedEmitterUI();
      offsetX = x - emitter.x;
      offsetY = y - emitter.y;
    } else {
      selectedEmitter = null;
      updateSelectedEmitterUI();
    }
  });
  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getCanvasCoords(e);
    if (draggingEmitter) {
      draggingEmitter.x = Math.max(10, Math.min(CANVAS_W - 10, x - offsetX));
      draggingEmitter.y = Math.max(10, Math.min(CANVAS_H - 10, y - offsetY));
    }
  });
  window.addEventListener('mouseup', () => {
    if (draggingEmitter) {
      draggingEmitter.isDragging = false;
      draggingEmitter = null;
    }
  });
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });
  bulletColorInput.addEventListener('input', () => {
    if (selectedEmitter) selectedEmitter.color = bulletColorInput.value;
  });
  freqSlider.addEventListener('input', () => {
    if (selectedEmitter) {
      selectedEmitter.frequency = parseFloat(freqSlider.value);
      freqValueEl.textContent = `${selectedEmitter.frequency.toFixed(1)}s`;
    }
  });
  speedSlider.addEventListener('input', () => {
    if (selectedEmitter) {
      selectedEmitter.speed = parseInt(speedSlider.value, 10);
      speedValueEl.textContent = String(selectedEmitter.speed);
    }
  });
  modeSelect.addEventListener('change', () => {
    if (selectedEmitter) {
      selectedEmitter.mode = modeSelect.value as Exclude<TrajectoryMode, 'mixed'>;
    }
  });
  clearBtn.addEventListener('click', () => {
    clearBtn.classList.add('shake');
    setTimeout(() => clearBtn.classList.remove('shake'), 100);
    clearEmitters();
    clearParticles();
    playerBullets.length = 0;
    trailParticles.length = 0;
    selectedEmitter = null;
    updateSelectedEmitterUI();
  });
  resetBtn.addEventListener('click', () => {
    resetOverlay.classList.add('active');
    setTimeout(() => {
      clearEmitters();
      clearParticles();
      playerBullets.length = 0;
      trailParticles.length = 0;
      player.x = CANVAS_W / 2;
      player.y = CANVAS_H - 80;
      selectedEmitter = null;
      updateSelectedEmitterUI();
      setTimeout(() => resetOverlay.classList.remove('active'), 20);
    }, 250);
  });
}

function init(): void {
  createGridCache();
  bindEvents();
  updateSelectedEmitterUI();
  requestAnimationFrame((t) => {
    lastFrameTime = t;
    gameLoop(t);
  });
}

init();
