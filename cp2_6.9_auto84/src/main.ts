import { createGame, updateGame, setGravity, resetGame, GameState, getMazeTotalSize } from './game';
import { render, calculateLayout, Layout } from './renderer';

const COLS = 10;
const ROWS = 8;
const CELL_SIZE = 35;
const GAP = 2;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let game: GameState;
let layout: Layout;
let lastTime = 0;
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const container = document.getElementById('game-container') as HTMLDivElement;
  const width = container.clientWidth;
  const height = container.clientHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const mazeSize = getMazeTotalSize(game);
  layout = calculateLayout(width, height, mazeSize.width, mazeSize.height);
}

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d', { alpha: true })!;

  game = createGame(COLS, ROWS, CELL_SIZE, GAP);

  resizeCanvas();
  bindEvents();

  lastTime = performance.now();
  gameLoop(lastTime);
}

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 1 / 30);
  lastTime = currentTime;

  updateGame(game, dt, currentTime);

  const rect = canvas.getBoundingClientRect();
  render(ctx, game, layout, rect.width, rect.height, currentTime);

  requestAnimationFrame(gameLoop);
}

function bindEvents(): void {
  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('touchcancel', handleTouchEnd);

  canvas.addEventListener('click', handleCanvasClick);

  const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
  restartBtn.addEventListener('click', (e) => {
    createButtonRipple(restartBtn, e);
    resetGame(game);
  });
  restartBtn.addEventListener('mousedown', (e) => {
    createButtonRipple(restartBtn, e);
  });
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function handlePointerDown(e: MouseEvent): void {
  isDragging = true;
  const coords = getCanvasCoords(e);
  lastPointerX = coords.x;
  lastPointerY = coords.y;
}

function handlePointerMove(e: MouseEvent): void {
  if (!isDragging) return;
  const coords = getCanvasCoords(e);
  const dx = coords.x - lastPointerX;
  const dy = coords.y - lastPointerY;

  const gravityScale = 20;
  setGravity(game, dx * gravityScale, dy * gravityScale);

  lastPointerX = coords.x;
  lastPointerY = coords.y;
}

function handlePointerUp(): void {
  if (isDragging) {
    isDragging = false;
    setGravity(game, game.gravityX * 0.5, game.gravityY * 0.5);
  }
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    isDragging = true;
    const coords = getCanvasCoords(e.touches[0]);
    lastPointerX = coords.x;
    lastPointerY = coords.y;
  }
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (!isDragging || e.touches.length === 0) return;
  const coords = getCanvasCoords(e.touches[0]);
  const dx = coords.x - lastPointerX;
  const dy = coords.y - lastPointerY;

  const gravityScale = 20;
  setGravity(game, dx * gravityScale, dy * gravityScale);

  lastPointerX = coords.x;
  lastPointerY = coords.y;
}

function handleTouchEnd(): void {
  if (isDragging) {
    isDragging = false;
    setGravity(game, game.gravityX * 0.5, game.gravityY * 0.5);
  }
}

function handleCanvasClick(e: MouseEvent): void {
  const coords = getCanvasCoords(e);
  createCanvasRipple(coords.x, coords.y);
}

function createCanvasRipple(x: number, y: number): void {
  const duration = 300;
  const maxRadius = 50;
  const startTime = performance.now();
  const dpr = window.devicePixelRatio || 1;

  function animateRipple(now: number): void {
    const elapsed = now - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) return;

    const radius = maxRadius * progress;
    const alpha = 0.4 * (1 - progress);

    const rect = canvas.getBoundingClientRect();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    requestAnimationFrame(animateRipple);
  }

  requestAnimationFrame(animateRipple);
}

function createButtonRipple(button: HTMLElement, event: Event): void {
  const rect = button.getBoundingClientRect();
  let clientX = 0;
  let clientY = 0;

  if (event instanceof MouseEvent) {
    clientX = event.clientX;
    clientY = event.clientY;
  } else {
    clientX = rect.left + rect.width / 2;
    clientY = rect.top + rect.height / 2;
  }

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';

  const size = 100;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x - size / 2}px`;
  ripple.style.top = `${y - size / 2}px`;

  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 300);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
