import { Game, Player } from './game';
import { Renderer } from './renderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const roundDisplay = document.getElementById('round-display') as HTMLDivElement;
const p1Score = document.getElementById('p1-score') as HTMLSpanElement;
const p1Remaining = document.getElementById('p1-remaining') as HTMLSpanElement;
const p2Score = document.getElementById('p2-score') as HTMLSpanElement;
const p2Remaining = document.getElementById('p2-remaining') as HTMLSpanElement;
const player1Row = document.getElementById('player1-row') as HTMLDivElement;
const player2Row = document.getElementById('player2-row') as HTMLDivElement;
const gameStatus = document.getElementById('game-status') as HTMLDivElement;

if (!canvas) throw new Error('Canvas element not found');

const game = new Game();
const renderer = new Renderer(canvas, game);

let lastTime = performance.now();
let animationId: number | null = null;

function updateUI(): void {
  const state = game.getState();

  roundDisplay.textContent = state.round.toString();
  p1Score.textContent = state.scores[Player.PLAYER1].toString();
  p1Remaining.textContent = state.remainingPieces[Player.PLAYER1].toString();
  p2Score.textContent = state.scores[Player.PLAYER2].toString();
  p2Remaining.textContent = state.remainingPieces[Player.PLAYER2].toString();

  if (state.currentPlayer === Player.PLAYER1) {
    player1Row.classList.add('active');
    player2Row.classList.remove('active');
  } else {
    player1Row.classList.remove('active');
    player2Row.classList.add('active');
  }

  if (!state.isStarted) {
    gameStatus.textContent = '点击「开始游戏」开始对战';
    gameStatus.classList.remove('winner');
  } else if (state.isGameOver) {
    gameStatus.classList.add('winner');
    if (state.winner === Player.PLAYER1) {
      gameStatus.textContent = '🎉 蓝色浪花 获胜！';
    } else if (state.winner === Player.PLAYER2) {
      gameStatus.textContent = '🎉 金色漩涡 获胜！';
    } else {
      gameStatus.textContent = '🤝 平局！';
    }
  } else {
    const playerName = state.currentPlayer === Player.PLAYER1 ? '蓝色浪花' : '金色漩涡';
    gameStatus.textContent = `${playerName} 的回合`;
    gameStatus.classList.remove('winner');
  }
}

function gameLoop(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  game.update(deltaTime);
  renderer.render();
  updateUI();

  animationId = requestAnimationFrame(gameLoop);
}

function handleCanvasClick(e: MouseEvent): void {
  const cell = renderer.screenToBoard(e.clientX, e.clientY);
  if (!cell) return;

  const state = game.getState();
  if (!state.isStarted || state.isGameOver) return;

  const targetCell = game.getCellAt(cell.x, cell.y);
  if (!targetCell || targetCell.piece !== Player.NONE) return;

  const startTime = performance.now();
  game.placePiece(cell.x, cell.y);
  const endTime = performance.now();

  if (endTime - startTime > 200) {
    console.warn(`Game logic took ${endTime - startTime}ms, exceeds 200ms target`);
  }
}

function handleCanvasMouseMove(e: MouseEvent): void {
  const cell = renderer.screenToBoard(e.clientX, e.clientY);
  renderer.setHoveredCell(cell);
}

function handleCanvasMouseLeave(): void {
  renderer.setHoveredCell(null);
}

function handleStart(): void {
  const state = game.getState();
  if (state.isStarted && !state.isGameOver) return;
  if (state.isGameOver) {
    game.reset();
  }
  game.start();
}

function handleReset(): void {
  game.reset();
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousemove', handleCanvasMouseMove);
canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
startBtn.addEventListener('click', handleStart);
resetBtn.addEventListener('click', handleReset);

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  const touch = e.touches[0];
  const cell = renderer.screenToBoard(touch.clientX, touch.clientY);
  if (cell) {
    const state = game.getState();
    if (state.isStarted && !state.isGameOver) {
      const targetCell = game.getCellAt(cell.x, cell.y);
      if (targetCell && targetCell.piece === Player.NONE) {
        game.placePiece(cell.x, cell.y);
      }
    }
  }
}, { passive: false });

updateUI();
animationId = requestAnimationFrame(gameLoop);

if (animationId) {
  window.addEventListener('beforeunload', () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
}
