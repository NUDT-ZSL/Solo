import { Point } from './flower.js';
import { Garden, HoverResult } from './garden.js';

const canvas: HTMLCanvasElement = document.getElementById('gardenCanvas') as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;
const wrapper: HTMLDivElement = document.getElementById('canvasWrapper') as HTMLDivElement;
const body: HTMLBodyElement = document.body;
const themeBtn: HTMLButtonElement = document.getElementById('themeBtn') as HTMLButtonElement;
const themeIcon: SVGPathElement = document.getElementById('themeIcon') as SVGPathElement;
const clearToast: HTMLDivElement = document.getElementById('clearToast') as HTMLDivElement;

const MOON_PATH = 'M21,12.79A9,9 0 1,1 11.21,3 7,7 0 0,0 21,12.79Z';
const SUN_PATH = 'M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.49C5.52,9.2 5.25,9.97 5.15,10.76L3.34,7M20.65,7L18.85,10.76C18.74,9.97 18.47,9.2 18.05,8.49C17.63,7.78 17.09,7.16 16.5,6.63L20.65,7M19,12L20.66,17L16.5,17.35C17.1,16.83 17.63,16.2 18.05,15.5C18.47,14.79 18.74,14.02 18.85,13.23L19,12M5,12L5.15,13.23C5.26,14.02 5.53,14.79 5.95,15.5C6.37,16.21 6.91,16.84 7.5,17.36L3.34,17L5,12M12,22L9.61,18.58C10.35,18.85 11.16,19 12,19C12.84,19 13.65,18.85 14.39,18.58L12,22Z';

let width: number = 0;
let height: number = 0;
let dpr: number = 1;

const garden: Garden = new Garden();

let isDrawing: boolean = false;
let currentPath: Point[] = [];
let lastMouseX: number = -1;
let lastMouseY: number = -1;

let rafId: number = 0;
let lastTime: number = 0;

let hoverResult: HoverResult = { id: null, name: null, position: null };

const flowerTooltip: HTMLDivElement = document.createElement('div');
flowerTooltip.style.cssText = `
  position: fixed;
  pointer-events: none;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.95);
  font-size: 15px;
  font-family: 'Caveat', cursive;
  font-weight: 500;
  border-radius: 8px;
  letter-spacing: 1px;
  z-index: 100;
  opacity: 0;
  transition: opacity 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.12);
`;
document.body.appendChild(flowerTooltip);

function resize(): void {
  dpr = window.devicePixelRatio || 1;
  const rect = wrapper.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getCanvasPoint(e: MouseEvent | TouchEvent): Point {
  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;
  if ('touches' in e) {
    clientX = (e as TouchEvent).touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0]?.clientX ?? 0;
    clientY = (e as TouchEvent).touches[0]?.clientY ?? (e as TouchEvent).changedTouches[0]?.clientY ?? 0;
  } else {
    clientX = (e as MouseEvent).clientX;
    clientY = (e as MouseEvent).clientY;
  }
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function startDraw(p: Point): void {
  isDrawing = true;
  currentPath = [p];
  lastMouseX = p.x;
  lastMouseY = p.y;
}

function continueDraw(p: Point): void {
  if (!isDrawing) return;
  const last = currentPath[currentPath.length - 1];
  const dx = p.x - last.x;
  const dy = p.y - last.y;
  if (dx * dx + dy * dy >= 4) {
    currentPath.push(p);
  }
  lastMouseX = p.x;
  lastMouseY = p.y;
}

function endDraw(): void {
  if (!isDrawing) return;
  isDrawing = false;
  if (currentPath.length >= 2) {
    garden.addBranch(currentPath);
  }
  currentPath = [];
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  lastMouseX = e.clientX - rect.left;
  lastMouseY = e.clientY - rect.top;
  if (isDrawing) {
    continueDraw({ x: lastMouseX, y: lastMouseY });
  }
  if (hoverResult.name) {
    flowerTooltip.style.left = `${e.clientX + 16}px`;
    flowerTooltip.style.top = `${e.clientY + 16}px`;
  }
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  const p = getCanvasPoint(e);
  lastMouseX = p.x;
  lastMouseY = p.y;
  startDraw(p);
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  const p = getCanvasPoint(e);
  continueDraw(p);
}

function handleTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  endDraw();
}

function handleKeyDown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    garden.undo();
  }
  if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
    garden.clear();
    showClearToast();
  }
}

function showClearToast(): void {
  clearToast.classList.add('show');
  setTimeout(() => clearToast.classList.remove('show'), 1500);
}

function toggleTheme(): void {
  garden.toggleTheme();
  body.classList.toggle('theme-morning');
  const isMorning = body.classList.contains('theme-morning');
  themeIcon.setAttribute('d', isMorning ? SUN_PATH : MOON_PATH);
  wrapper.classList.remove('canvas-fade');
  void wrapper.offsetWidth;
  wrapper.classList.add('canvas-fade');
}

function renderTemporaryStroke(): void {
  if (!isDrawing || currentPath.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(currentPath[0].x, currentPath[0].y);
  for (let i = 1; i < currentPath.length; i++) {
    ctx.lineTo(currentPath[i].x, currentPath[i].y);
  }
  ctx.strokeStyle = garden.theme === 'night' ? 'rgba(125, 206, 160, 0.7)' : 'rgba(46, 125, 50, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.restore();
}

function updateTooltip(h: HoverResult): void {
  if (h.name && h.position) {
    flowerTooltip.textContent = h.name;
    flowerTooltip.style.opacity = '1';
    const isMorning = body.classList.contains('theme-morning');
    flowerTooltip.style.background = isMorning ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.15)';
    flowerTooltip.style.color = isMorning ? '#fff' : 'rgba(255, 255, 255, 0.95)';
  } else {
    flowerTooltip.style.opacity = '0';
  }
}

function loop(now: number): void {
  if (!lastTime) lastTime = now;
  const dt = Math.min(1 / 30, (now - lastTime) / 1000);
  lastTime = now;

  const mx = lastMouseX >= 0 ? lastMouseX : -9999;
  const my = lastMouseY >= 0 ? lastMouseY : -9999;
  garden.update(dt, mx, my);
  hoverResult = garden.getHoverResult();
  updateTooltip(hoverResult);

  ctx.clearRect(0, 0, width, height);
  garden.render(ctx, width, height);
  renderTemporaryStroke();

  rafId = requestAnimationFrame(loop);
}

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  const p = getCanvasPoint(e);
  startDraw(p);
});
canvas.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseleave', () => {
  lastMouseX = -9999;
  lastMouseY = -9999;
});

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

window.addEventListener('keydown', handleKeyDown);
themeBtn.addEventListener('click', toggleTheme);
window.addEventListener('resize', resize);

resize();
rafId = requestAnimationFrame(loop);
