import { Spectrum } from './spectrum';
import { Renderer } from './render';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const blockCountEl = document.getElementById('blockCount') as HTMLElement;
const speedEl = document.getElementById('speed') as HTMLElement;
const fpsEl = document.getElementById('fps') as HTMLElement;

let dpr = window.devicePixelRatio || 1;
let width = window.innerWidth;
let height = window.innerHeight;

function resizeCanvas(): void {
  dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  if (spectrum) {
    spectrum.setSize(width, height);
  }
}

function getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

resizeCanvas();

const renderer = new Renderer(ctx, dpr);
const spectrum = new Spectrum(renderer, width, height);

let lastTime = performance.now();
let frameCount = 0;
let fpsLastTime = performance.now();
let currentFps = 0;

function animate(time: number): void {
  const dt = Math.min(50, time - lastTime);
  lastTime = time;

  frameCount++;
  if (time - fpsLastTime >= 500) {
    currentFps = Math.round((frameCount * 1000) / (time - fpsLastTime));
    frameCount = 0;
    fpsLastTime = time;
  }

  spectrum.update(time, dt);

  renderer.drawBackground(width, height);
  renderer.drawTrailOverlay(width, height, 0.08);
  spectrum.render();

  blockCountEl.textContent = spectrum.getBlockCount().toString();
  speedEl.textContent = Math.round(spectrum.getSpeed()).toString();
  fpsEl.textContent = currentFps.toString();

  requestAnimationFrame(animate);
}

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const pos = getCanvasPos(e.clientX, e.clientY);
  spectrum.onMouseMove(pos.x, pos.y, performance.now());
});

canvas.addEventListener('mousedown', () => {
  spectrum.onMouseDown();
});

canvas.addEventListener('mouseup', () => {
  spectrum.onMouseUp();
});

canvas.addEventListener('mouseenter', (e: MouseEvent) => {
  const pos = getCanvasPos(e.clientX, e.clientY);
  spectrum.onMouseEnter(pos.x, pos.y, performance.now());
});

canvas.addEventListener('mouseleave', () => {
  spectrum.onMouseLeave();
});

canvas.addEventListener('click', () => {
});

window.addEventListener('resize', () => {
  resizeCanvas();
});

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault();
  }
});

requestAnimationFrame(animate);
