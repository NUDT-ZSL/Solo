import './style.css';
import { WatercolorEngine, PaperTexture, RGB, PALETTE } from './watercolor';
import { Controls } from './controls';

const canvasContainer = document.getElementById('canvas-container') as HTMLDivElement;
const watercolorCanvas = document.getElementById('watercolor-canvas') as HTMLCanvasElement;
const paperCanvas = document.getElementById('paper-canvas') as HTMLCanvasElement;
const fpsCounter = document.getElementById('fps-counter') as HTMLDivElement;
const watercolorCtx = watercolorCanvas.getContext('2d')!;

let canvasWidth = 800;
let canvasHeight = 600;

const paper = new PaperTexture(canvasWidth, canvasHeight);
const engine = new WatercolorEngine();

let currentColor: RGB = PALETTE[0].rgb;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lastMoveTime = 0;
let clickStartTime = 0;
let clickCount = 0;
let clickTimer: number | null = null;

let lastFrameTime = performance.now();
let frameCount = 0;
let fpsTime = 0;
let currentFps = 60;

const controls = new Controls({
  onColorSelect: (color) => {
    currentColor = color;
  },
  onDiffusionSpeedChange: (speed) => {
    engine.setDiffusionSpeed(speed);
  },
  onOpacityChange: (opacity) => {
    engine.setBaseOpacity(opacity);
  },
  onPaperIntensityChange: (intensity) => {
    paper.setIntensity(intensity);
  },
  onClear: () => {
    canvasContainer.classList.add('wave-clearing');
    setTimeout(() => {
      engine.clear();
      watercolorCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      canvasContainer.classList.remove('wave-clearing');
    }, 1000);
  },
  onSave: () => {
    saveAsPNG();
  },
});

function resizeCanvases(): void {
  const containerRect = canvasContainer.getBoundingClientRect();
  const maxWidth = containerRect.width - 40;
  const maxHeight = containerRect.height - 40;
  const aspectRatio = 4 / 3;

  if (maxWidth / maxHeight > aspectRatio) {
    canvasHeight = Math.min(maxHeight, 900);
    canvasWidth = canvasHeight * aspectRatio;
  } else {
    canvasWidth = Math.min(maxWidth, 1200);
    canvasHeight = canvasWidth / aspectRatio;
  }

  canvasWidth = Math.floor(canvasWidth);
  canvasHeight = Math.floor(canvasHeight);

  watercolorCanvas.width = canvasWidth;
  watercolorCanvas.height = canvasHeight;
  watercolorCanvas.style.width = `${canvasWidth}px`;
  watercolorCanvas.style.height = `${canvasHeight}px`;

  paperCanvas.width = canvasWidth;
  paperCanvas.height = canvasHeight;
  paperCanvas.style.width = `${canvasWidth}px`;
  paperCanvas.style.height = `${canvasHeight}px`;

  paper.resize(canvasWidth, canvasHeight);
  paper.render();

  const paperCtx = paperCanvas.getContext('2d')!;
  paperCtx.drawImage(paper.getCanvas(), 0, 0);
}

function getCanvasPos(e: MouseEvent): { x: number; y: number } {
  const rect = watercolorCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvasWidth / rect.width),
    y: (e.clientY - rect.top) * (canvasHeight / rect.height),
  };
}

function handleMouseDown(e: MouseEvent): void {
  const pos = getCanvasPos(e);
  isDrawing = true;
  lastX = pos.x;
  lastY = pos.y;
  lastMoveTime = performance.now();
  clickStartTime = performance.now();
  clickCount++;

  if (clickTimer) {
    clearTimeout(clickTimer);
  }

  clickTimer = window.setTimeout(() => {
    clickCount = 0;
  }, 300);

  engine.addDrop(pos.x, pos.y, currentColor);
}

function handleMouseMove(e: MouseEvent): void {
  if (!isDrawing) return;

  const pos = getCanvasPos(e);
  const now = performance.now();
  const dt = Math.max(1, now - lastMoveTime);
  const dx = pos.x - lastX;
  const dy = pos.y - lastY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = (distance / dt) * 1000;

  if (distance > 1) {
    engine.addStroke(lastX, lastY, pos.x, pos.y, speed, currentColor);
    lastX = pos.x;
    lastY = pos.y;
    lastMoveTime = now;
  }
}

function handleMouseUp(e: MouseEvent): void {
  const now = performance.now();
  const pressDuration = now - clickStartTime;
  const pos = getCanvasPos(e);

  if (pressDuration < 200 && clickCount >= 2) {
    engine.addExplosion(pos.x, pos.y, currentColor);
    clickCount = 0;
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }
  } else if (pressDuration < 200 && clickCount === 1) {
    if (clickTimer) {
      clearTimeout(clickTimer);
    }
    clickTimer = window.setTimeout(() => {
      if (clickCount === 1) {
        engine.addClickSplash(pos.x, pos.y, currentColor);
      }
      clickCount = 0;
      clickTimer = null;
    }, 200);
  }

  isDrawing = false;
}

function handleMouseLeave(): void {
  isDrawing = false;
}

function saveAsPNG(): void {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvasWidth;
  exportCanvas.height = canvasHeight;
  const ctx = exportCanvas.getContext('2d')!;

  ctx.drawImage(paper.getCanvas(), 0, 0);
  ctx.drawImage(watercolorCanvas, 0, 0);

  const link = document.createElement('a');
  link.download = `watercolor-${Date.now()}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

function updateFps(deltaTime: number): void {
  frameCount++;
  fpsTime += deltaTime;
  if (fpsTime >= 500) {
    currentFps = Math.round((frameCount * 1000) / fpsTime);
    frameCount = 0;
    fpsTime = 0;
    fpsCounter.textContent = `FPS: ${currentFps}`;
    if (currentFps >= 55) {
      fpsCounter.style.color = '#8bc34a';
    } else if (currentFps >= 45) {
      fpsCounter.style.color = '#ffc107';
    } else {
      fpsCounter.style.color = '#f44336';
    }
  }
}

function renderLoop(timestamp: number): void {
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  const particleCount = engine.getActiveParticleCount();
  const clampedDelta = particleCount > 1500 ? Math.min(deltaTime, 32) : deltaTime;

  paper.update(clampedDelta);
  engine.update(clampedDelta);

  const paperCtx = paperCanvas.getContext('2d')!;
  paper.render();
  paperCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  paperCtx.drawImage(paper.getCanvas(), 0, 0);

  watercolorCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  engine.render(watercolorCtx, canvasWidth, canvasHeight);

  updateFps(deltaTime);

  requestAnimationFrame(renderLoop);
}

window.addEventListener('resize', resizeCanvases);
watercolorCanvas.addEventListener('mousedown', handleMouseDown);
watercolorCanvas.addEventListener('mousemove', handleMouseMove);
watercolorCanvas.addEventListener('mouseup', handleMouseUp);
watercolorCanvas.addEventListener('mouseleave', handleMouseLeave);

resizeCanvases();
engine.setBaseOpacity(0.7);
requestAnimationFrame(renderLoop);
