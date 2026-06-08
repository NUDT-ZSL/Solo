import { GameManager, GameState } from './GameManager';

function getCanvasSize(): { width: number; height: number } {
  const maxWidth = Math.min(window.innerWidth - 32, 900);
  const maxHeight = Math.min(window.innerHeight - 180, 700);
  const aspectRatio = 3 / 4;

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.max(320, Math.floor(width)),
    height: Math.max(420, Math.floor(height))
  };
}

function setupCanvas(canvas: HTMLCanvasElement): void {
  const size = getCanvasSize();
  canvas.width = size.width;
  canvas.height = size.height;

  const hud = document.getElementById('hud') as HTMLElement;
  const controls = document.querySelector('.controls-hint') as HTMLElement;
  hud.style.width = `${size.width}px`;
  controls.style.width = `${size.width}px`;
}

function updateHUD(game: GameManager): void {
  const scoreEl = document.getElementById('score') as HTMLElement;
  const livesEl = document.getElementById('lives') as HTMLElement;
  const highScoreEl = document.getElementById('highScore') as HTMLElement;

  if (scoreEl) scoreEl.textContent = String(game.score);
  if (livesEl) livesEl.textContent = String(game.lives);
  if (highScoreEl) highScoreEl.textContent = String(game.highScore);
}

function showOverlay(id: string): void {
  const overlays = document.querySelectorAll('.overlay') as NodeListOf<HTMLElement>;
  overlays.forEach((o) => o.classList.add('hidden'));
  const target = document.getElementById(id) as HTMLElement;
  if (target) target.classList.remove('hidden');
}

function hideAllOverlays(): void {
  const overlays = document.querySelectorAll('.overlay') as NodeListOf<HTMLElement>;
  overlays.forEach((o) => o.classList.add('hidden'));
}

function showGameOver(game: GameManager): void {
  const finalScore = document.getElementById('finalScore') as HTMLElement;
  const highScoreDisplay = document.getElementById('highScoreDisplay') as HTMLElement;
  if (finalScore) finalScore.textContent = `分数: ${game.score}`;
  if (highScoreDisplay) highScoreDisplay.textContent = `最高分: ${game.highScore}`;
  showOverlay('gameOverOverlay');
}

function showWin(game: GameManager): void {
  const winScore = document.getElementById('winScore') as HTMLElement;
  const winHighScore = document.getElementById('winHighScore') as HTMLElement;
  if (winScore) winScore.textContent = `分数: ${game.score}`;
  if (winHighScore) winHighScore.textContent = `最高分: ${game.highScore}`;
  showOverlay('winOverlay');
}

function setupEventListeners(game: GameManager): void {
  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        game.paddle.leftPressed = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        game.paddle.rightPressed = true;
        e.preventDefault();
        break;
      case 'Space':
        e.preventDefault();
        if (game.state === 'start') {
          game.startNewGame();
          hideAllOverlays();
          updateHUD(game);
        } else if (game.state === 'playing') {
          const hasAttachedBall = game.balls.some(b => b.attached);
          if (hasAttachedBall) {
            game.launchBall();
          } else {
            game.togglePause();
            showOverlay('pauseOverlay');
          }
        } else if (game.state === 'paused') {
          game.togglePause();
          hideAllOverlays();
        } else if (game.state === 'gameover' || game.state === 'win') {
          game.startNewGame();
          hideAllOverlays();
          updateHUD(game);
        } else {
          game.launchBall();
        }
        break;
      case 'KeyR':
        game.startNewGame();
        hideAllOverlays();
        updateHUD(game);
        break;
      case 'Escape':
        if (game.state === 'playing') {
          game.togglePause();
          showOverlay('pauseOverlay');
        }
        break;
    }
  });

  document.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        game.paddle.leftPressed = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        game.paddle.rightPressed = false;
        break;
    }
  });

  const canvas = game.canvas;

  let touchStartX: number | null = null;
  let touchCurrentX: number | null = null;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchStartX = touch.clientX - rect.left;
    touchCurrentX = touchStartX;

    if (game.state === 'start') {
      game.startNewGame();
      hideAllOverlays();
      updateHUD(game);
    } else if (game.state === 'playing') {
      game.launchBall();
    } else if (game.state === 'gameover' || game.state === 'win') {
      game.startNewGame();
      hideAllOverlays();
      updateHUD(game);
    }

    const paddleCenter = game.paddle.x + game.paddle.width / 2;
    if (touchStartX < paddleCenter - 10) {
      game.paddle.leftPressed = true;
      game.paddle.rightPressed = false;
    } else if (touchStartX > paddleCenter + 10) {
      game.paddle.rightPressed = true;
      game.paddle.leftPressed = false;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touchStartX) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchCurrentX = touch.clientX - rect.left;

    const targetX = touchCurrentX - game.paddle.width / 2;
    game.paddle.x = Math.max(0, Math.min(game.width - game.paddle.width, targetX));
    game.paddle.leftPressed = false;
    game.paddle.rightPressed = false;
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    game.paddle.leftPressed = false;
    game.paddle.rightPressed = false;
    touchStartX = null;
    touchCurrentX = null;
  }, { passive: false });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const targetX = mouseX - game.paddle.width / 2;
    game.paddle.x = Math.max(0, Math.min(game.width - game.paddle.width, targetX));
  });

  canvas.addEventListener('click', () => {
    if (game.state === 'start') {
      game.startNewGame();
      hideAllOverlays();
      updateHUD(game);
    } else if (game.state === 'playing') {
      game.launchBall();
    } else if (game.state === 'gameover' || game.state === 'win') {
      game.startNewGame();
      hideAllOverlays();
      updateHUD(game);
    }
  });

  const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      game.startNewGame();
      hideAllOverlays();
      updateHUD(game);
    });
  }

  const resumeBtn = document.getElementById('resumeBtn') as HTMLButtonElement;
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      game.togglePause();
      hideAllOverlays();
    });
  }

  const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      game.startNewGame();
      hideAllOverlays();
      updateHUD(game);
    });
  }

  const restartBtnPause = document.getElementById('restartBtnPause') as HTMLButtonElement;
  if (restartBtnPause) {
    restartBtnPause.addEventListener('click', () => {
      game.startNewGame();
      hideAllOverlays();
      updateHUD(game);
    });
  }

  const winRestartBtn = document.getElementById('winRestartBtn') as HTMLButtonElement;
  if (winRestartBtn) {
    winRestartBtn.addEventListener('click', () => {
      game.startNewGame();
      hideAllOverlays();
      updateHUD(game);
    });
  }

  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      setupCanvas(canvas);
    }, 100);
  });
}

function main(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  setupCanvas(canvas);

  const game = new GameManager(canvas);
  setupEventListeners(game);
  updateHUD(game);

  let lastTime = performance.now();
  let fpsFrames = 0;
  let fpsTime = 0;
  let currentFps = 60;

  const prevState: { value: GameState } = { value: game.state };

  function gameLoop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 1 / 30);
    lastTime = currentTime;

    fpsFrames++;
    fpsTime += deltaTime;
    if (fpsTime >= 0.5) {
      currentFps = fpsFrames / fpsTime;
      fpsFrames = 0;
      fpsTime = 0;
      game.adaptPerformance(currentFps);
    }

    game.update(deltaTime);
    game.render();

    if (game.state !== prevState.value) {
      prevState.value = game.state;
      updateHUD(game);

      if (game.state === 'gameover') {
        showGameOver(game);
      } else if (game.state === 'win') {
        showWin(game);
      } else if (game.state === 'paused') {
        showOverlay('pauseOverlay');
      } else if (game.state === 'playing') {
        hideAllOverlays();
      }
    }

    if (game.state === 'playing') {
      updateHUD(game);
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
