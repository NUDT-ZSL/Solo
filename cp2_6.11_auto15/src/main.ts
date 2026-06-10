import { GameManager } from './GameManager';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const game = new GameManager();

let lastTime = 0;
let animFrameId = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.initialize(window.innerWidth, window.innerHeight);
}

function gameLoop(timestamp: number) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  game.update(dt, window.innerWidth, window.innerHeight);

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  game.draw(ctx, window.innerWidth, window.innerHeight);

  animFrameId = requestAnimationFrame(gameLoop);
}

function getEventPos(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

let lastClickTime = 0;
let lastClickPos = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  const pos = getEventPos(e);
  const now = performance.now();

  const isDoubleClick =
    now - lastClickTime < 350 &&
    Math.abs(pos.x - lastClickPos.x) < 20 &&
    Math.abs(pos.y - lastClickPos.y) < 20;

  if (isDoubleClick) {
    game.handleDoubleClick(pos.x, pos.y);
    lastClickTime = 0;
  } else {
    lastClickTime = now;
    lastClickPos = pos;
    game.handleClick(pos.x, pos.y);
  }

  game.handleMouseDown(pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e) => {
  const pos = getEventPos(e);
  game.handleMouseMove(pos.x, pos.y);
});

canvas.addEventListener('mouseup', (e) => {
  const pos = getEventPos(e);
  game.handleMouseUp(pos.x, pos.y);
});

let touchStartTime = 0;
let touchStartPos = { x: 0, y: 0 };
let lastTapTime = 0;
let lastTapPos = { x: 0, y: 0 };

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (e.touches.length === 0) return;
  const touch = e.touches[0];
  const pos = getEventPos(touch);
  const now = performance.now();

  touchStartTime = now;
  touchStartPos = pos;

  const isDoubleTap =
    now - lastTapTime < 350 &&
    Math.abs(pos.x - lastTapPos.x) < 30 &&
    Math.abs(pos.y - lastTapPos.y) < 30;

  if (isDoubleTap) {
    game.handleDoubleClick(pos.x, pos.y);
    lastTapTime = 0;
  } else {
    lastTapTime = now;
    lastTapPos = pos;
  }

  game.handleMouseDown(pos.x, pos.y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (e.touches.length === 0) return;
  const pos = getEventPos(e.touches[0]);
  game.handleMouseMove(pos.x, pos.y);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const now = performance.now();
  const duration = now - touchStartTime;

  if (duration < 250) {
    game.handleClick(touchStartPos.x, touchStartPos.y);
  }

  game.handleMouseUp(touchStartPos.x, touchStartPos.y);
}, { passive: false });

canvas.addEventListener('click', (e) => {
  const bounds = game.getReplayButtonBounds(window.innerWidth);
  const pos = getEventPos(e);
  if (
    pos.x >= bounds.x && pos.x <= bounds.x + bounds.w &&
    pos.y >= bounds.y && pos.y <= bounds.y + bounds.h
  ) {
    game.startReplay();
  }
});

window.addEventListener('resize', () => {
  resize();
});

window.addEventListener('beforeunload', () => {
  game.saveGame();
});

resize();
lastTime = performance.now();
animFrameId = requestAnimationFrame(gameLoop);
