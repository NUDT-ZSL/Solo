import { Game } from './game';
import { Renderer, PauseUIState } from './renderer';
import { Direction } from './rhythm';

let canvas: HTMLCanvasElement;
let game: Game;
let renderer: Renderer;
let lastTime: number = 0;
let animationFrameId: number = 0;
let pauseUIState: PauseUIState = { hovered: false };
let started = false;

const keyToDirection: Record<string, Direction> = {
  'ArrowUp': 'up',
  'ArrowDown': 'down',
  'ArrowLeft': 'left',
  'ArrowRight': 'right',
  'w': 'up',
  'W': 'up',
  's': 'down',
  'S': 'down',
  'a': 'left',
  'A': 'left',
  'd': 'right',
  'D': 'right'
};

function init(): void {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('找不到game-container元素');
  const canvasEl = document.getElementById('game-canvas');
  if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
    throw new Error('找不到game-canvas元素');
  }
  canvas = canvasEl;

  const w = window.innerWidth;
  const h = window.innerHeight;

  game = new Game(w, h);
  renderer = new Renderer(canvas);
  renderer.resize(w, h);
  game.resize(w, h);

  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function ensureStarted(): void {
  if (!started) {
    started = true;
    game.start(performance.now());
  }
}

function handleResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.resize(w, h);
  game.resize(w, h);
}

function handleKeyDown(e: KeyboardEvent): void {
  ensureStarted();
  const key = e.key;
  if (key === ' ' || key === 'Spacebar' || key === 'Escape') {
    e.preventDefault();
    game.togglePause();
    return;
  }
  const dir = keyToDirection[key];
  if (dir) {
    e.preventDefault();
    game.handleKeyPress(dir, performance.now());
  }
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const pauseRect = game.getPauseButtonRect();
  const dx = x - pauseRect.x;
  const dy = y - pauseRect.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const hovered = dist <= pauseRect.r;
  pauseUIState.hovered = hovered;
  game.setPauseHovered(hovered);
}

function handleClick(e: MouseEvent): void {
  ensureStarted();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const pauseRect = game.getPauseButtonRect();
  const dx = x - pauseRect.x;
  const dy = y - pauseRect.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= pauseRect.r) {
    game.togglePause();
    return;
  }
  handleDirectionTap(x, y);
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  ensureStarted();
  const touch = e.touches[0];
  if (!touch) return;
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  const pauseRect = game.getPauseButtonRect();
  const dx = x - pauseRect.x;
  const dy = y - pauseRect.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= pauseRect.r + 10) {
    game.togglePause();
    return;
  }
  handleDirectionTap(x, y);
}

function handleDirectionTap(x: number, y: number): void {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = x - cx;
  const dy = y - cy;
  let dir: Direction;
  if (Math.abs(dx) > Math.abs(dy)) {
    dir = dx > 0 ? 'right' : 'left';
  } else {
    dir = dy > 0 ? 'down' : 'up';
  }
  game.handleKeyPress(dir, performance.now());
}

function loop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (started) {
    game.update(now, dt);
  } else {
    game.state.pulsePhase = (game.state.pulsePhase + dt) % 1.0;
  }
  renderer.render(game.state, pauseUIState);
  animationFrameId = requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', init);
