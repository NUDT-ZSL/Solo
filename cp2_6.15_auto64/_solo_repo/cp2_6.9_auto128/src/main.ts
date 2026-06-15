import { DiffusionEngine } from './diffusionEngine';
import { UIController, UIState } from './uiController';
import { getPalette, getRandomColor } from './colorManager';

const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const initialState: UIState = {
  currentColor: getPalette()[0],
  brushSize: 15,
  diffusionSpeed: 0.3,
};

const diffusionEngine = new DiffusionEngine();

const uiController = new UIController(
  initialState,
  (state) => {
    if (state.currentColor !== undefined) initialState.currentColor = state.currentColor;
    if (state.brushSize !== undefined) initialState.brushSize = state.brushSize;
    if (state.diffusionSpeed !== undefined) initialState.diffusionSpeed = state.diffusionSpeed;
  },
  () => {
    const rect = canvas.getBoundingClientRect();
    diffusionEngine.clearWithAnimation(rect.width / 2, rect.height / 2);
  }
);

diffusionEngine.setBlobCountCallback((count) => {
  uiController.updateBlobCount(count);
});

function resizeCanvas(): void {
  const wrapper = canvas.parentElement!;
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  const cw = Math.floor(w * 0.9);
  const ch = Math.floor(h * 0.9);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  diffusionEngine.setCanvasSize(cw, ch);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lastBlobTime = 0;
const BLOB_INTERVAL = 30;

function getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function addBlobAt(x: number, y: number): void {
  const color = initialState.currentColor;
  diffusionEngine.addBlob(x, y, color, initialState.brushSize, initialState.diffusionSpeed);
  uiController.addTimelineEvent(color);
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  isDrawing = true;
  const pos = getCanvasPos(e);
  lastX = pos.x;
  lastY = pos.y;
  lastBlobTime = performance.now();
  addBlobAt(pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const pos = getCanvasPos(e);
  const now = performance.now();
  const dx = pos.x - lastX;
  const dy = pos.y - lastY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const spacing = Math.max(4, initialState.brushSize * 0.4);
  if (dist >= spacing || now - lastBlobTime >= BLOB_INTERVAL) {
    addBlobAt(pos.x, pos.y);
    lastX = pos.x;
    lastY = pos.y;
    lastBlobTime = now;
  }
});

window.addEventListener('mouseup', () => {
  isDrawing = false;
});

function getRipplePosition(key: string): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const margin = 80;
  switch (key) {
    case '1': return { x: margin, y: margin };
    case '2': return { x: w / 2, y: margin };
    case '3': return { x: w - margin, y: margin };
    case '4': return { x: margin, y: h / 2 };
    case '5': return { x: w / 2, y: h / 2 };
    case '6': return { x: w - margin, y: h / 2 };
    case '7': return { x: margin, y: h - margin };
    case '8': return { x: w / 2, y: h - margin };
    default: return null;
  }
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
    const pos = getRipplePosition(e.key);
    if (pos) {
      const color = getRandomColor();
      diffusionEngine.addRipple(pos.x, pos.y, color);
      uiController.addTimelineEvent(color);
    }
  }
});

let lastRenderTime = performance.now();
let frameCount = 0;
let fps = 60;

function renderLoop(now: number): void {
  const delta = now - lastRenderTime;
  frameCount++;
  if (delta >= 1000) {
    fps = Math.round((frameCount * 1000) / delta);
    frameCount = 0;
    lastRenderTime = now;
  }

  diffusionEngine.updateDiffusion();

  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = '#F5F0E1';
  ctx.fillRect(0, 0, rect.width, rect.height);
  drawPaperTexture(ctx, rect.width, rect.height);

  diffusionEngine.render(ctx);

  void fps;
  requestAnimationFrame(renderLoop);
}

function drawPaperTexture(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.save();
  c.globalAlpha = 0.04;
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 1.5 + 0.5;
    c.fillStyle = Math.random() > 0.5 ? '#8B7355' : '#A0522D';
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

requestAnimationFrame(renderLoop);
