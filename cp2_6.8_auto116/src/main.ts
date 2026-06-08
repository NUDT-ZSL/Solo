import { initControls, handleResponsiveCanvas } from './controls';
import { createInitialState, GameState, createStars } from './entities';
import { updateGame } from './gameLogic';
import { render, invalidateBackgroundCache } from './renderer';

let gameState: GameState;
let ctx: CanvasRenderingContext2D;
let lastFrameTime = 0;
let fps = 60;
let fpsAccumulator = 0;
let fpsFrameCount = 0;

function resetGame(): void {
  handleResponsiveCanvas();
  gameState = createInitialState();
  invalidateBackgroundCache();
  if (gameState.stars.length === 0) {
    gameState.stars = createStars(40);
  }
}

function gameLoop(timestamp: number): void {
  if (lastFrameTime === 0) lastFrameTime = timestamp;
  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  fpsAccumulator += delta;
  fpsFrameCount++;
  if (fpsAccumulator >= 500) {
    fps = Math.round((fpsFrameCount * 1000) / fpsAccumulator);
    fpsAccumulator = 0;
    fpsFrameCount = 0;
  }

  updateGame(gameState);
  render(ctx, gameState, fps);

  requestAnimationFrame(gameLoop);
}

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    console.error('Cannot get 2D context');
    return;
  }
  ctx = context;
  ctx.imageSmoothingEnabled = false;

  initControls(() => {
    resetGame();
    invalidateBackgroundCache();
  });

  resetGame();

  window.addEventListener('resize', () => {
    handleResponsiveCanvas();
    invalidateBackgroundCache();
    if (gameState) {
      gameState.stars = createStars(40);
    }
  });

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
