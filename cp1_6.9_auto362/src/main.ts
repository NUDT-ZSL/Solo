import { Spirit } from './entity/Spirit.js';
import { Island } from './entity/Island.js';
import { Fragment } from './entity/Fragment.js';

interface ScreenFlash {
  active: boolean;
  progress: number;
  duration: number;
  color: string;
  startAlpha: number;
}

interface EdgeGlow {
  active: boolean;
  progress: number;
  duration: number;
}

interface CornerStar {
  x: number;
  y: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

const MAX_ISLANDS = 6;
const MIN_FRAGMENT_INTERVAL = 2 * 1000;
const MAX_FRAGMENT_INTERVAL = 3 * 1000;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let spirit: Spirit;
let islands: Island[] = [];
let fragments: Fragment[] = [];
let cornerStars: CornerStar[] = [];

let canvasWidth: number;
let canvasHeight: number;
let scaleFactor: number;

let fragmentCount = 0;
let lastFragmentSpawn = 0;
let nextFragmentInterval: number;
let lastIslandSpawn = 0;

let screenFlash: ScreenFlash = {
  active: false,
  progress: 0,
  duration: 0.1 * 60,
  color: '#ffffff',
  startAlpha: 0.3,
};

let edgeGlow: EdgeGlow = {
  active: false,
  progress: 0,
  duration: 0.2 * 60,
};

let lastTime = 0;
let fpsCounter = 0;
let fpsTimer = 0;
let currentFps = 60;

let rafId: number | null = null;
let mouseX: number;
let mouseY: number;

function initCanvas(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) {
    throw new Error('Cannot get 2D context');
  }
  ctx = ctx2d;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas(): void {
  const container = document.getElementById('game-container');
  if (!container) return;

  const cw = container.clientWidth;
  const ch = container.clientHeight;

  let displayW: number;
  let displayH: number;

  if (cw / ch > ASPECT_RATIO) {
    displayH = ch;
    displayW = ch * ASPECT_RATIO;
  } else {
    displayW = cw;
    displayH = cw / ASPECT_RATIO;
  }

  displayW = Math.floor(displayW);
  displayH = Math.floor(displayH);

  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';

  const dpr = window.devicePixelRatio || 1;
  canvasWidth = BASE_WIDTH;
  canvasHeight = BASE_HEIGHT;
  scaleFactor = displayW / BASE_WIDTH;

  canvas.width = Math.floor(canvasWidth * dpr);
  canvas.height = Math.floor(canvasHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  initCornerStars();
}

function initCornerStars(): void {
  cornerStars = [];
  const corners = [
    { x: 0, y: 0 },
    { x: canvasWidth, y: 0 },
    { x: 0, y: canvasHeight },
    { x: canvasWidth, y: canvasHeight },
  ];
  for (let i = 0; i < 4; i++) {
    const corner = corners[i];
    const starsPerCorner = 10;
    for (let j = 0; j < starsPerCorner; j++) {
      const angle = i * Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const dist = 30 + Math.random() * 120;
      cornerStars.push({
        x: corner.x + Math.cos(angle) * dist,
        y: corner.y + Math.sin(angle) * dist,
        size: 1 + Math.random(),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
      });
    }
  }
}

function initEntities(): void {
  spirit = new Spirit(canvasWidth, canvasHeight);
  islands = [];
  fragments = [];
  fragmentCount = 0;
  lastFragmentSpawn = Date.now();
  nextFragmentInterval = MIN_FRAGMENT_INTERVAL + Math.random() * (MAX_FRAGMENT_INTERVAL - MIN_FRAGMENT_INTERVAL);
  lastIslandSpawn = Date.now();

  for (let i = 0; i < 3; i++) {
    spawnIsland();
  }
}

function spawnIsland(): void {
  if (islands.length >= MAX_ISLANDS) return;

  const newIsland = new Island(canvasWidth, canvasHeight);
  let attempts = 0;
  while (attempts < 10) {
    let valid = true;
    for (const existing of islands) {
      if (!newIsland.isFarEnoughFrom(existing, 350)) {
        valid = false;
        break;
      }
    }
    if (valid) break;
    newIsland.baseX = newIsland.baseX + (Math.random() - 0.5) * 200;
    newIsland.baseY = newIsland.baseY + (Math.random() - 0.5) * 200;
    attempts++;
  }
  islands.push(newIsland);
}

function trySpawnFragment(): void {
  const now = Date.now();
  if (now - lastFragmentSpawn < nextFragmentInterval) return;
  if (islands.length < 2) return;

  const gaps: Array<{ x: number; y: number; tx: number; ty: number }> = [];
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const a = islands[i];
      const b = islands[j];
      const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      if (dist > 200 && dist < 600) {
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const dirX = (b.x - a.x) / dist;
        const dirY = (b.y - a.y) / dist;
        const offset = (Math.random() - 0.5) * 60;
        gaps.push({
          x: midX + (-dirY) * offset,
          y: midY + dirX * offset,
          tx: midX + (b.x - a.x) * 0.3,
          ty: midY + (b.y - a.y) * 0.3,
        });
      }
    }
  }

  if (gaps.length === 0) return;

  const gap = gaps[Math.floor(Math.random() * gaps.length)];
  fragments.push(new Fragment(gap.x, gap.y, gap.tx, gap.ty));
  lastFragmentSpawn = now;
  nextFragmentInterval = MIN_FRAGMENT_INTERVAL + Math.random() * (MAX_FRAGMENT_INTERVAL - MIN_FRAGMENT_INTERVAL);
}

function triggerScreenFlash(): void {
  screenFlash.active = true;
  screenFlash.progress = 0;
}

function triggerEdgeGlow(): void {
  edgeGlow.active = true;
  edgeGlow.progress = 0;
}

function handleInput(): void {
  const rect = canvas.getBoundingClientRect();
  const localX = (mouseX - rect.left) / scaleFactor;
  const localY = (mouseY - rect.top) / scaleFactor;
  spirit.setTarget(localX, localY);
}

function update(): void {
  handleInput();

  const now = Date.now();
  if (now - lastIslandSpawn > 3000 && islands.length < MAX_ISLANDS) {
    spawnIsland();
    lastIslandSpawn = now;
  }

  islands = islands.filter((island) => {
    const alive = island.update(canvasWidth, canvasHeight);
    return alive;
  });

  trySpawnFragment();

  fragments = fragments.filter((frag) => {
    if (!frag.picked && frag.checkCollision(spirit.x, spirit.y, 20)) {
      frag.pickUp();
      const addCount = frag.getParticleCount();
      spirit.addParticles(addCount, frag.x, frag.y);
      if (spirit.particleCount >= 256 && fragmentCount < 8) {
      }
      fragmentCount++;
      triggerScreenFlash();
      triggerEdgeGlow();
      spirit.checkFormTransition(fragmentCount);
    }
    return frag.update(canvasWidth, canvasHeight);
  });

  spirit.update(canvasWidth, canvasHeight);

  if (screenFlash.active) {
    screenFlash.progress++;
    if (screenFlash.progress >= screenFlash.duration) {
      screenFlash.active = false;
    }
  }

  if (edgeGlow.active) {
    edgeGlow.progress++;
    if (edgeGlow.progress >= edgeGlow.duration) {
      edgeGlow.active = false;
    }
  }
}

function drawBackground(): void {
  const gradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight / 2,
    0,
    canvasWidth / 2,
    canvasHeight / 2,
    canvasWidth * 0.7
  );
  gradient.addColorStop(0, '#1a1a3e');
  gradient.addColorStop(1, '#0b0b2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const time = Date.now() / 1000;
  for (const star of cornerStars) {
    const alpha = 0.3 + 0.4 * (Math.sin(time * star.twinkleSpeed + star.twinklePhase) + 1) / 2;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVignette(): void {
  const gradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight / 2,
    canvasWidth * 0.25,
    canvasWidth / 2,
    canvasHeight / 2,
    canvasWidth * 0.65
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

function drawEdgeGlow(): void {
  if (!edgeGlow.active) return;
  const t = edgeGlow.progress / edgeGlow.duration;
  const alpha = (1 - t) * 0.6;

  const colors = [
    { x0: 0, y0: canvasHeight / 2, x1: 60, y1: canvasHeight / 2, angle: 0 },
    { x0: canvasWidth, y0: canvasHeight / 2, x1: canvasWidth - 60, y1: canvasHeight / 2, angle: 0 },
    { x0: canvasWidth / 2, y0: 0, x1: canvasWidth / 2, y1: 60, angle: 0 },
    { x0: canvasWidth / 2, y0: canvasHeight, x1: canvasWidth / 2, y1: canvasHeight - 60, angle: 0 },
  ];

  for (const c of colors) {
    const g = ctx.createLinearGradient(c.x0, c.y0, c.x1, c.y1);
    g.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
    g.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
}

function drawScreenFlash(): void {
  if (!screenFlash.active) return;
  const t = screenFlash.progress / screenFlash.duration;
  const alpha = screenFlash.startAlpha * (1 - t);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

function drawUI(): void {
  ctx.save();
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`✦ 星辉碎片: ${fragmentCount}`, 20, 20);

  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = spirit.getCurrentFormColor();
  ctx.shadowColor = spirit.getCurrentFormColor();
  ctx.shadowBlur = 8;
  ctx.fillText(spirit.getCurrentFormName(), canvasWidth - 20, canvasHeight - 20);
  ctx.restore();
}

function render(): void {
  drawBackground();

  for (const island of islands) {
    island.render(ctx);
  }

  for (const frag of fragments) {
    frag.render(ctx);
  }

  spirit.render(ctx);

  drawVignette();
  drawEdgeGlow();
  drawScreenFlash();
  drawUI();
}

function gameLoop(timestamp: number): void {
  if (!lastTime) lastTime = timestamp;
  const elapsed = timestamp - lastTime;
  lastTime = timestamp;

  fpsCounter++;
  fpsTimer += elapsed;
  if (fpsTimer >= 1000) {
    currentFps = fpsCounter;
    fpsCounter = 0;
    fpsTimer = 0;
  }

  if (elapsed < FRAME_DURATION * 2) {
    const steps = Math.max(1, Math.round(elapsed / FRAME_DURATION));
    for (let i = 0; i < steps; i++) {
      update();
    }
  } else {
    update();
  }

  render();
  rafId = requestAnimationFrame(gameLoop);
}

function setupEventListeners(): void {
  const container = document.getElementById('game-container');
  if (!container) return;

  container.addEventListener('mousemove', (e: MouseEvent) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  container.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 0) {
      spirit.boost();
    }
  });

  container.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      mouseX = touch.clientX;
      mouseY = touch.clientY;
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      mouseX = touch.clientX;
      mouseY = touch.clientY;
      spirit.boost();
    }
  });

  mouseX = window.innerWidth / 2;
  mouseY = window.innerHeight / 2;
}

function start(): void {
  try {
    initCanvas();
    initEntities();
    setupEventListeners();
    rafId = requestAnimationFrame(gameLoop);
  } catch (e) {
    console.error('Failed to start game:', e);
  }
}

start();
