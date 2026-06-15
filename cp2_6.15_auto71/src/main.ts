import * as Ocean from './ocean';
import * as Particles from './particles';
import * as Islands from './islands';
import { createControlPanel, updateStats } from './controls';
import type { CurrentMode, Season } from './ocean';

const SEA_WIDTH = 1200;
const SEA_HEIGHT = 800;

const canvas = document.getElementById('oceanCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const app = document.getElementById('app')!;

let rotationAngle = 0;
let zoom = 1;
let isDragging = false;
let lastMouseX = 0;
let releaseRate = 5;
let releaseAccumulator = 0;
let lastTime = 0;
let fpsCounter = 0;
let fpsTimer = 0;
let currentFps = 0;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const panel = createControlPanel({
  onModeChange: (mode: CurrentMode) => {
    Ocean.setMode(mode);
  },
  onSeasonChange: (season: Season) => {
    Ocean.setSeason(season);
  },
  onRateChange: (rate: number) => {
    releaseRate = rate;
  },
});
app.appendChild(panel);

Islands.generateIslands(SEA_WIDTH, SEA_HEIGHT);

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isDragging = true;
    lastMouseX = e.clientX;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const deltaX = e.clientX - lastMouseX;
    rotationAngle += deltaX * 0.5;
    rotationAngle = Math.max(-60, Math.min(60, rotationAngle));
    lastMouseX = e.clientX;
  }
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  const offsetX = canvas.width / 2;
  const offsetY = canvas.height / 2;

  const transformedX = (screenX - offsetX) / zoom;
  const transformedY = (screenY - offsetY) / zoom;

  const rad = (rotationAngle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const worldX = transformedX * cos - transformedY * sin + SEA_WIDTH / 2;
  const worldY = transformedX * sin + transformedY * cos + SEA_HEIGHT / 2;

  if (
    worldX >= 0 &&
    worldX <= SEA_WIDTH &&
    worldY >= 0 &&
    worldY <= SEA_HEIGHT
  ) {
    Particles.addParticles(worldX, worldY, 5);
  }
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.95 : 1.05;
  zoom *= delta;
  zoom = Math.max(0.5, Math.min(3, zoom));
}, { passive: false });

function getCanvasTransform(): { offsetX: number; offsetY: number; scaleX: number; scaleY: number } {
  const offsetX = canvas.width / 2;
  const offsetY = canvas.height / 2;
  const rad = (rotationAngle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { offsetX, offsetY, scaleX: cos * zoom, scaleY: zoom, ...{ cos, sin } };
}

function renderBackground(): void {
  ctx.fillStyle = '#0a0e27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const transform = getCanvasTransform();

  ctx.save();
  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.scale(zoom, zoom);
  const rad = (rotationAngle * Math.PI) / 180;
  ctx.transform(Math.cos(rad), Math.sin(rad), -Math.sin(rad), Math.cos(rad), 0, 0);
  ctx.translate(-SEA_WIDTH / 2, -SEA_HEIGHT / 2);

  ctx.save();
  Ocean.drawFlowField(ctx, SEA_WIDTH, SEA_HEIGHT);
  ctx.restore();

  ctx.save();
  Islands.drawIslands(ctx);
  ctx.restore();

  ctx.save();
  Particles.render(ctx);
  ctx.restore();

  ctx.restore();
}

function update(timestamp: number): void {
  if (lastTime === 0) {
    lastTime = timestamp;
    requestAnimationFrame(update);
    return;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  fpsCounter++;
  fpsTimer += dt;
  if (fpsTimer >= 1) {
    currentFps = fpsCounter;
    fpsCounter = 0;
    fpsTimer -= 1;
    updateStats(Particles.getParticleCount(), currentFps);
  }

  releaseAccumulator += releaseRate * dt;
  while (releaseAccumulator >= 1) {
    Particles.addParticles(SEA_WIDTH / 2, SEA_HEIGHT / 2, 1);
    releaseAccumulator -= 1;
  }

  Particles.update(dt);

  renderBackground();

  requestAnimationFrame(update);
}

requestAnimationFrame(update);
