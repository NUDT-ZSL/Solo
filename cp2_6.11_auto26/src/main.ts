import { GamePhase, BOARD_SIZE, CELL_SIZE, CELL_GAP } from './types';
import { createInitialState, updateGameState, handleClick, handleHover } from './gameLogic';
import { render } from './gameUI';
import type { GameState } from './types';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let state: GameState = createInitialState();
let lastTime = performance.now();
let boardOriginX = 0;
let boardOriginY = 0;

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const boardW = BOARD_SIZE * (CELL_SIZE + CELL_GAP);
  const boardH = BOARD_SIZE * (CELL_SIZE + CELL_GAP);
  boardOriginX = Math.floor((canvas.width - boardW) / 2);
  boardOriginY = Math.floor((canvas.height - boardH) / 2) + 15;
}

function gameLoop(currentTime: number): void {
  const dt = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;

  updateGameState(state, dt);
  render(ctx, state, dt, currentTime, boardOriginX, boardOriginY);

  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (state.phase === GamePhase.GAME_OVER) {
    state = createInitialState();
    resize();
    return;
  }

  handleClick(x, y, state, boardOriginX, boardOriginY);
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  handleHover(x, y, state, boardOriginX, boardOriginY);
});

window.addEventListener('resize', resize);

resize();
requestAnimationFrame(gameLoop);
