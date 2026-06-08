import { Grid } from './grid.js';
import type { ParticleType } from './particle.js';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PIXEL_SIZE = 2;
const GRID_WIDTH = CANVAS_WIDTH / PIXEL_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / PIXEL_SIZE;

const canvas = document.getElementById('sandbox') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const grid = new Grid(GRID_WIDTH, GRID_HEIGHT);

let currentType: ParticleType = 'sand';
let brushSize: number = 3;
let isPaused: boolean = false;
let isDrawing: boolean = false;
let isErasing: boolean = false;
let lastMouseX: number = -1;
let lastMouseY: number = -1;

const toolButtons = document.querySelectorAll<HTMLButtonElement>('.tool-btn');
const brushSizeButtons = document.querySelectorAll<HTMLButtonElement>('.brush-btn');
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
const particleCountEl = document.getElementById('particleCount') as HTMLSpanElement;
const fpsEl = document.getElementById('fps') as HTMLSpanElement;

toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    toolButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentType = btn.dataset.type as ParticleType;
  });
});

brushSizeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    brushSizeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    brushSize = parseInt(btn.dataset.size!, 10);
  });
});

clearBtn.addEventListener('click', () => {
  grid.clear();
});

pauseBtn.addEventListener('click', () => {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? '▶ 继续' : '⏸ 暂停';
  pauseBtn.classList.toggle('paused', isPaused);
});

function getGridPos(e: MouseEvent | Touch): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const px = (e.clientX - rect.left) * scaleX;
  const py = (e.clientY - rect.top) * scaleY;
  if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return null;
  return {
    x: Math.floor(px / PIXEL_SIZE),
    y: Math.floor(py / PIXEL_SIZE),
  };
}

function drawLine(x0: number, y0: number, x1: number, y1: number): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (true) {
    if (isErasing) {
      grid.removeAt(x, y, brushSize);
    } else {
      grid.spawnParticle(currentType, x, y, brushSize);
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  if (e.button === 2) {
    isErasing = true;
  } else {
    isDrawing = true;
  }
  const pos = getGridPos(e);
  if (pos) {
    lastMouseX = pos.x;
    lastMouseY = pos.y;
    if (isErasing) {
      grid.removeAt(pos.x, pos.y, brushSize);
    } else {
      grid.spawnParticle(currentType, pos.x, pos.y, brushSize);
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  const pos = getGridPos(e);
  if (!pos) return;
  if ((isDrawing || isErasing) && (lastMouseX !== -1 || lastMouseY !== -1)) {
    drawLine(lastMouseX, lastMouseY, pos.x, pos.y);
  }
  lastMouseX = pos.x;
  lastMouseY = pos.y;
});

canvas.addEventListener('mouseup', () => {
  isDrawing = false;
  isErasing = false;
});

canvas.addEventListener('mouseleave', () => {
  isDrawing = false;
  isErasing = false;
  lastMouseX = -1;
  lastMouseY = -1;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isDrawing = true;
  const touch = e.touches[0];
  const pos = getGridPos(touch);
  if (pos) {
    lastMouseX = pos.x;
    lastMouseY = pos.y;
    grid.spawnParticle(currentType, pos.x, pos.y, brushSize);
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const pos = getGridPos(touch);
  if (!pos) return;
  if (isDrawing && (lastMouseX !== -1 || lastMouseY !== -1)) {
    drawLine(lastMouseX, lastMouseY, pos.x, pos.y);
  }
  lastMouseX = pos.x;
  lastMouseY = pos.y;
}, { passive: false });

canvas.addEventListener('touchend', () => {
  isDrawing = false;
  lastMouseX = -1;
  lastMouseY = -1;
});

let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;
let currentFps = 60;

function gameLoop(now: number): void {
  const dt = now - lastTime;
  lastTime = now;
  frameCount++;
  fpsTimer += dt;

  if (fpsTimer >= 500) {
    currentFps = Math.round((frameCount * 1000) / fpsTimer);
    frameCount = 0;
    fpsTimer = 0;
    fpsEl.textContent = String(currentFps);
    fpsEl.className = '';
    if (currentFps >= 50) fpsEl.classList.add('fps-good');
    else if (currentFps >= 30) fpsEl.classList.add('fps-mid');
    else fpsEl.classList.add('fps-bad');
    particleCountEl.textContent = String(grid.particleCount);
  }

  if (!isPaused) {
    grid.updateAll();
  }

  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  grid.render(ctx, canvas.width, canvas.height, PIXEL_SIZE);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
