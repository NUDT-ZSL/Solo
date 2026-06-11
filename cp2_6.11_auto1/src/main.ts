import { createGameState, initStarParticles, updatePhysics, resetGame } from './physics';
import { render } from './renderer';
import { initInput } from './input';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

canvas.width = 800;
canvas.height = 600;

const state = createGameState();
initStarParticles(state);
initInput(canvas, state);

(state as any)._resetGame = () => {
  resetGame(state);
};

let lastTime = performance.now();

function gameLoop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updatePhysics(state, dt);
  render(ctx, state);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
