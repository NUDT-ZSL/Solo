import { InkEngine } from './ink';
import './styles.css';

const canvas = document.getElementById('inkCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const dpr = window.devicePixelRatio || 1;

function resizeCanvas(): void {
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  inkEngine.resize(cssW, cssH, dpr);
}

const inkEngine = new InkEngine(canvas, dpr);
resizeCanvas();

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lastTime = 0;
const MIN_SAMPLE_DISTANCE = 2;
const MIN_SAMPLE_TIME_MS = 8;

let rafId: number;

window.addEventListener('resize', resizeCanvas);

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y };
}

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button !== 0) return;
  isDrawing = true;
  const { x, y } = getCanvasCoords(e);
  lastX = x;
  lastY = y;
  lastTime = performance.now();
  inkEngine.beginStroke(lastTime);
  inkEngine.addPoint(x, y, 0, lastTime);
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (!isDrawing) return;
  const now = performance.now();
  const { x, y } = getCanvasCoords(e);
  const dx = x - lastX;
  const dy = y - lastY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dt = now - lastTime;

  if (dist < MIN_SAMPLE_DISTANCE && dt < MIN_SAMPLE_TIME_MS) {
    return;
  }

  const dtSec = dt > 0 ? dt / 1000 : 0.016;
  const speed = dist / dtSec;

  interpolatePoints(lastX, lastY, x, y, speed, lastTime, now);

  lastX = x;
  lastY = y;
  lastTime = now;
});

canvas.addEventListener('mouseup', () => {
  if (!isDrawing) return;
  isDrawing = false;
  inkEngine.endStroke(performance.now());
});

canvas.addEventListener('mouseleave', () => {
  if (!isDrawing) return;
  isDrawing = false;
  inkEngine.endStroke(performance.now());
});

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Backspace') {
    e.preventDefault();
    inkEngine.undo();
  }
});

function interpolatePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  speed: number,
  t0: number,
  t1: number
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const step = 3;
  const numSteps = Math.max(1, Math.floor(dist / step));
  const dt = (t1 - t0) / numSteps;

  for (let i = 1; i <= numSteps; i++) {
    const t = i / numSteps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    const pt = t0 + dt * i;
    inkEngine.addPoint(px, py, speed, pt);
  }
}

function loop(): void {
  const now = performance.now();
  inkEngine.update(now);
  inkEngine.render();
  rafId = requestAnimationFrame(loop);
}

rafId = requestAnimationFrame(loop);
