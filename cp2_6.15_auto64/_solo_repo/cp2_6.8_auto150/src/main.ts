import { AudioManager } from './audio';
import { Player } from './player';
import { Game } from './game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const startScreen = document.getElementById('startScreen') as HTMLDivElement;
const gameOverScreen = document.getElementById('gameOverScreen') as HTMLDivElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
const scoreDisplay = document.getElementById('scoreDisplay') as HTMLDivElement;
const speedDisplay = document.getElementById('speedDisplay') as HTMLDivElement;
const noteDisplay = document.getElementById('noteDisplay') as HTMLDivElement;
const finalScore = document.getElementById('finalScore') as HTMLDivElement;

const audioManager = new AudioManager();
const player = new Player(100);
const game = new Game(audioManager);

let lastTime = 0;
let animationId: number | null = null;
let lastLandedPlatformId: number | null = null;

function resizeCanvas(): void {
  const container = canvas.parentElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = 800;
  canvas.height = 600;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function updateUI(): void {
  scoreDisplay.textContent = `分数: ${game.score}`;
  speedDisplay.textContent = `速度: x${game.speedMultiplier.toFixed(2)}`;
  noteDisplay.textContent = game.currentNoteName;
}

function handleJump(): void {
  if (!game.isRunning || game.isGameOver) return;
  player.jump();

  const color = game.platforms.length > 0 ? game.platforms[0].color : '#00FFB9';
  player.spawnJumpTrail(color);
}

function handleWaveBurst(): void {
  if (!game.isRunning || game.isGameOver) return;
  game.triggerWaveBurst(player.x, player.y);
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    e.preventDefault();
    if (game.isGameOver) {
      startGame();
    } else {
      handleJump();
    }
  } else if (e.code === 'KeyE') {
    e.preventDefault();
    handleWaveBurst();
  } else if (game.isGameOver) {
    startGame();
  }
}

function handleCanvasClick(): void {
  if (game.isGameOver) {
    startGame();
  } else {
    handleJump();
  }
}

function startGame(): void {
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  player.reset();
  game.reset();
  lastLandedPlatformId = null;
  updateUI();
}

function endGame(): void {
  game.isGameOver = true;
  game.isRunning = false;
  audioManager.playGameOver();
  finalScore.textContent = `最终分数: ${game.score}`;
  gameOverScreen.classList.remove('hidden');
}

function gameLoop(currentTime: number): void {
  if (lastTime === 0) lastTime = currentTime;
  const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  if (game.isRunning && !game.isGameOver) {
    player.update(dt);
    game.update(dt);

    const collision = game.checkCollision(player.x, player.y, player.radius);

    if (collision.hitTrap) {
      endGame();
    } else if (collision.hitPlatform) {
      const platformIndex = game.platforms.indexOf(collision.hitPlatform);
      if (platformIndex !== lastLandedPlatformId) {
        game.onPlatformLand(collision.hitPlatform);
        lastLandedPlatformId = platformIndex;
      }
    }

    if (player.y < 50 || player.y > game.canvasHeight - 50) {
      endGame();
    }

    updateUI();
  }

  ctx.fillStyle = '#180B26';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  game.draw(ctx);
  player.draw(ctx);

  if (game.isGameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  animationId = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', () => {
  startGame();
});

restartBtn.addEventListener('click', () => {
  startGame();
});

document.addEventListener('keydown', handleKeyDown);
canvas.addEventListener('click', handleCanvasClick);

animationId = requestAnimationFrame(gameLoop);
