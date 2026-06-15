import {
  GameState, createPlayer, createCovers, createCore,
  ARENA_X, ARENA_Y, ARENA_SIZE
} from './entities';
import {
  updatePlayer, updateBullets, updateCore, updateParticles, spawnBullet
} from './collision';
import { render } from './renderer';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function centeredArena() {
  const ax = (canvas.width - ARENA_SIZE) / 2;
  const ay = ARENA_Y;
  return { x: ax, y: ay, w: ARENA_SIZE, h: ARENA_SIZE };
}

function createInitialState(): GameState {
  const arena = centeredArena();
  return {
    players: [
      createPlayer(1, arena.x, arena.y, arena.w),
      createPlayer(2, arena.x, arena.y, arena.w)
    ],
    bullets: [],
    particles: [],
    covers: createCovers(arena.x, arena.y, arena.w),
    core: createCore(arena.x, arena.y, arena.w),
    arena,
    keys: new Set<string>(),
    gameOver: false,
    winner: 0,
    roundTime: 0,
    bulletIdCounter: 0
  };
}

let state = createInitialState();

window.addEventListener('keydown', (e) => {
  const preventKeys = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'];
  if (preventKeys.includes(e.key)) e.preventDefault();
  state.keys.add(e.key);

  if (e.key === ' ' && !e.repeat) {
    spawnBullet(state, state.players[0]);
  }
  if (e.key === 'Enter' && !e.repeat) {
    spawnBullet(state, state.players[1]);
  }
  if ((e.key === 'r' || e.key === 'R') && state.gameOver) {
    state = createInitialState();
  }
});

window.addEventListener('keyup', (e) => {
  state.keys.delete(e.key);
});

window.addEventListener('blur', () => {
  state.keys.clear();
});

let lastTime = performance.now();

function frame(now: number): void {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  if (!state.gameOver) {
    state.roundTime += dt;
    for (const p of state.players) updatePlayer(state, p, dt);
    updateBullets(state, dt);
    updateCore(state, dt);
  }
  updateParticles(state, dt);

  render(ctx, state, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
