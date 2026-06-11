import { AudioProcessor, type AudioParams } from './audioProcessor';
import { Creature } from './creature';
import { Maze } from './maze';
import { Renderer } from './renderer';

type GamePhase = 'idle' | 'playing' | 'over';

interface Game {
  audio: AudioProcessor;
  creature: Creature;
  maze: Maze;
  renderer: Renderer;
  phase: GamePhase;
  startAt: number;
  lastFrame: number;
  rafId: number | null;
}

declare global {
  interface Window {
    __mazeRef?: Maze;
  }
}

const game: Game = {
  audio: new AudioProcessor(),
  creature: new Creature(),
  maze: new Maze(),
  renderer: null as unknown as Renderer,
  phase: 'idle',
  startAt: 0,
  lastFrame: 0,
  rafId: null,
};

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function showError(msg: string): void {
  const el = $('error-msg');
  el.textContent = msg;
  if (msg) {
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  }
}

function hideLoading(): void {
  $('loading-layer').classList.add('hidden');
}

function showGameOver(): void {
  const evo = game.creature.state.evolutionLevel;
  const food = game.maze.state.totalFoodCollected;
  $('stat-food').textContent = String(food);
  $('stat-evo').textContent = `Lv. ${evo}`;
  $('gameover-modal').classList.add('show');
  game.phase = 'over';
}

function hideGameOver(): void {
  $('gameover-modal').classList.remove('show');
}

function resetGame(): void {
  game.creature.reset();
  game.maze.reset();
  window.__mazeRef = game.maze;
  game.phase = 'playing';
  game.startAt = performance.now();
  game.lastFrame = game.startAt;
  hideGameOver();
}

async function handleMicClick(): Promise<void> {
  showError('');
  const ok = await game.audio.requestMicrophone((success, err) => {
    if (!success) showError(err ?? '授权失败');
  });
  if (!ok) return;
  resetGame();
  hideLoading();
  startLoop();
}

function handleRestart(): void {
  resetGame();
}

function handleResize(): void {
  game.renderer.resize();
}

function tick(now: number): void {
  const rawDt = (now - game.lastFrame) / 1000;
  const dt = Math.min(0.05, Math.max(0, rawDt));
  game.lastFrame = now;

  if (game.phase === 'playing') {
    update(dt, now);
  }
  render(now);

  game.rafId = requestAnimationFrame(tick);
}

function startLoop(): void {
  if (game.rafId != null) cancelAnimationFrame(game.rafId);
  game.lastFrame = performance.now();
  game.rafId = requestAnimationFrame(tick);
}

function update(dt: number, now: number): void {
  void now;
  const params: AudioParams = game.audio.getParams();

  const prevGx = game.creature.state.x;
  const prevGy = game.creature.state.y;

  game.maze.update(dt, params, prevGx, prevGy);

  game.creature.update(dt, params, game.maze);

  const cgx = Math.round(game.creature.state.x);
  const cgy = Math.round(game.creature.state.y);
  const result = game.maze.checkCollision(prevGx, prevGy, game.creature.state.x, game.creature.state.y);

  if (result.hitWall) {
    game.renderer.notifyShake();
  }

  if (result.ateFood) {
    game.creature.onAteFood(result.ateFood.color);
    void cgx; void cgy;
  }

  if (game.creature.state.hp <= 0) {
    showGameOver();
  }
}

function render(now: number): void {
  const elapsed = (now - game.startAt) / 1000;
  game.renderer.render({
    audio: game.audio.getParams(),
    creature: game.creature.state,
    maze: game.maze.state,
    mazeRef: game.maze,
    elapsed,
  });
}

function bindEvents(): void {
  $('mic-btn').addEventListener('click', handleMicClick);
  $('restart-btn').addEventListener('click', handleRestart);
  window.addEventListener('resize', handleResize);
}

function boot(): void {
  const canvas = $('game') as HTMLCanvasElement;
  game.renderer = new Renderer(canvas);
  window.__mazeRef = game.maze;
  bindEvents();
  startLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
