import { LightEngine } from './lightEngine';
import { CONFIG } from './config';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const pointCountEl = document.getElementById('point-count') as HTMLSpanElement;
const fpsCounterEl = document.getElementById('fps-counter') as HTMLSpanElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const colorSwatches = document.querySelectorAll('.color-swatch') as NodeListOf<HTMLButtonElement>;
const customColorInput = document.getElementById('custom-color-input') as HTMLInputElement;
const customColorBtn = document.getElementById('custom-color') as HTMLDivElement;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const lightEngine = new LightEngine(canvas);

let isDrawing = false;
let currentColor: string = CONFIG.DEFAULT_STROKE_COLOR;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  isDrawing = true;
  lastX = e.clientX;
  lastY = e.clientY;
  lightEngine.addPoint(e.clientX, e.clientY, currentColor);
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!isDrawing) return;

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.floor(distance / 2));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = lastX + dx * t;
    const y = lastY + dy * t;
    lightEngine.addPoint(x, y, currentColor);
  }

  lastX = e.clientX;
  lastY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
  isDrawing = false;
});

canvas.addEventListener('mouseleave', () => {
  isDrawing = false;
});

clearBtn.addEventListener('click', () => {
  lightEngine.clear();
});

colorSwatches.forEach((swatch) => {
  swatch.addEventListener('click', () => {
    colorSwatches.forEach((s) => s.classList.remove('active'));
    swatch.classList.add('active');
    currentColor = swatch.dataset.color!;
    customColorInput.value = currentColor;
  });
});

customColorInput.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  currentColor = target.value;
  colorSwatches.forEach((s) => s.classList.remove('active'));
  customColorBtn.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.8)';
});

customColorBtn.addEventListener('click', () => {
  customColorInput.click();
});

let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 0;

function gameLoop(timestamp: number): void {
  frameCount++;

  if (timestamp - lastFpsUpdate >= 1000) {
    currentFps = Math.round(frameCount * 1000 / (timestamp - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = timestamp;
  }

  lightEngine.update();
  lightEngine.render();

  pointCountEl.textContent = `光迹点: ${lightEngine.getPointCount()}`;
  fpsCounterEl.textContent = `FPS: ${currentFps}`;

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
