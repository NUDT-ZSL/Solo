import { JellyfishManager } from './JellyfishManager';
import { Renderer } from './Renderer';
import { NUTRIENT_COLORS, NUTRIENT_COLOR_KEYS, NutrientColor, Vec2 } from './types';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let width = window.innerWidth;
let height = window.innerHeight;

function resizeCanvas(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  manager.resize(width, height);
  renderer.resize(width, height);
}

const manager = new JellyfishManager(width, height);
const renderer = new Renderer(ctx, width, height);
resizeCanvas();

let isDragging = false;
let dragStart: Vec2 | null = null;
let dragPoints: Vec2[] = [];
let lastDragPoint: Vec2 | null = null;

function getCanvasPos(e: MouseEvent | TouchEvent): Vec2 {
  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;
  if ('touches' in e) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function hitTestColorButton(pos: Vec2): { index: number; color: NutrientColor } | null {
  for (let i = 0; i < NUTRIENT_COLOR_KEYS.length; i++) {
    const b = renderer.getColorBallBounds(i);
    const dx = pos.x - b.x;
    const dy = pos.y - b.y;
    if (dx * dx + dy * dy <= (b.r + 5) * (b.r + 5)) {
      return { index: i, color: NUTRIENT_COLOR_KEYS[i] };
    }
  }
  return null;
}

function isInBottomPanel(pos: Vec2): boolean {
  const p = renderer.getBottomPanelBounds();
  return pos.x >= p.x && pos.x <= p.x + p.w && pos.y >= p.y && pos.y <= p.y + p.h;
}

function onPointerDown(e: MouseEvent): void {
  const pos = getCanvasPos(e);

  if (renderer.isPointInCollapsedIcon(pos.x, pos.y)) {
    renderer.togglePanel();
    return;
  }

  const hit = hitTestColorButton(pos);
  if (hit) {
    const ball = renderer.getColorBallBounds(hit.index);
    renderer.setSelectedColor(hit.color);
    renderer.triggerColorPress(hit.color, ball.x, ball.y);
    return;
  }

  const selected = renderer.getSelectedColor();
  if (selected && !isInBottomPanel(pos)) {
    manager.spawnNutrient(pos.x, pos.y, NUTRIENT_COLORS[selected]);
    return;
  }

  isDragging = true;
  dragStart = pos;
  dragPoints = [pos];
  lastDragPoint = pos;
}

function onPointerMove(e: MouseEvent): void {
  if (!isDragging) return;
  const pos = getCanvasPos(e);
  dragPoints.push(pos);
  if (dragPoints.length > 50) dragPoints.shift();
  lastDragPoint = pos;
}

function onPointerUp(_e: MouseEvent): void {
  if (isDragging && lastDragPoint && dragStart) {
    const dx = lastDragPoint.x - dragStart.x;
    const dy = lastDragPoint.y - dragStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 10) {
      const dir: Vec2 = { x: dx / len, y: dy / len };
      manager.addDisturbance(dragPoints, dir);
    }
  }
  isDragging = false;
  dragStart = null;
  dragPoints = [];
  lastDragPoint = null;
}

canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('mouseleave', onPointerUp);

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  onPointerDown(e as unknown as MouseEvent);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  onPointerMove(e as unknown as MouseEvent);
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  onPointerUp(e as unknown as MouseEvent);
}, { passive: false });

window.addEventListener('resize', resizeCanvas);

let lastTime = performance.now();

function gameLoop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  manager.update(dt);
  renderer.updateAnimations(dt);
  renderer.render(manager);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
