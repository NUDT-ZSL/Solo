import { Maze } from './maze';
import { Player } from './player';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const winModal = document.getElementById('win-modal') as HTMLDivElement;
const timeSpentEl = document.getElementById('time-spent') as HTMLSpanElement;
const pathLengthEl = document.getElementById('path-length') as HTMLSpanElement;
const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

let maze: Maze;
let player: Player;
let cellSize: number = 0;
let offsetX: number = 0;
let offsetY: number = 0;
let gameWon: boolean = false;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const maxDpr = window.innerWidth > 1200 || window.innerHeight > 1200 ? 1.5 : dpr;

  canvas.width = window.innerWidth * maxDpr;
  canvas.height = window.innerHeight * maxDpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(maxDpr, 0, 0, maxDpr, 0, 0);

  calculateLayout();

  if (player) {
    player.setLayout(cellSize, offsetX, offsetY);
  }
}

function calculateLayout(): void {
  if (!maze) return;

  const gridW = maze.getGridWidth();
  const maxSize = Math.min(window.innerWidth, window.innerHeight) * 0.8;
  cellSize = Math.floor(maxSize / gridW);
  const totalSize = cellSize * gridW;

  offsetX = Math.floor((window.innerWidth - totalSize) / 2);
  offsetY = Math.floor((window.innerHeight - totalSize) / 2);
}

function initGame(): void {
  maze = new Maze(20);
  calculateLayout();
  player = new Player(maze, cellSize, offsetX, offsetY);
  gameWon = false;
  winModal.classList.remove('show');
}

function showWinScreen(): void {
  if (gameWon) return;
  gameWon = true;
  timeSpentEl.textContent = String(player.getElapsedSeconds());
  pathLengthEl.textContent = String(player.getSteps());
  winModal.classList.add('show');
}

function render(now: number): void {
  ctx.fillStyle = 'transparent';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  maze.update(now);
  player.update();

  const gridW = maze.getGridWidth();
  const totalSize = cellSize * gridW;

  maze.drawBorder(ctx, offsetX, offsetY, totalSize, totalSize);
  maze.draw(ctx, offsetX, offsetY, cellSize, now);
  player.draw(ctx);

  if (player.hasReachedExit()) {
    showWinScreen();
  }

  requestAnimationFrame(render);
}

restartBtn.addEventListener('click', () => {
  initGame();
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
initGame();
requestAnimationFrame(render);
