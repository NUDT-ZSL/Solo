import { Renderer } from './renderer';
import { Game, GameCallbacks } from './game';

function main(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('2D context not available');
    return;
  }

  const gameOverOverlay = document.getElementById('game-over-overlay') as HTMLDivElement;
  const finalScoreEl = document.getElementById('final-score') as HTMLDivElement;
  const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
  const energyWarning = document.getElementById('energy-warning') as HTMLDivElement;

  let energyWarningTimer: number | null = null;

  const callbacks: GameCallbacks = {
    onGameOver: (score: number) => {
      finalScoreEl.textContent = `FINAL SCORE: ${Math.floor(score)}`;
      gameOverOverlay.classList.add('visible');
    },
    onEnergyFull: () => {
      energyWarning.classList.add('active');
      if (energyWarningTimer !== null) {
        window.clearTimeout(energyWarningTimer);
      }
      energyWarningTimer = window.setTimeout(() => {
        energyWarning.classList.remove('active');
        energyWarningTimer = null;
      }, 2000);
    },
    onEnergyDrained: () => {
      energyWarning.classList.remove('active');
      if (energyWarningTimer !== null) {
        window.clearTimeout(energyWarningTimer);
        energyWarningTimer = null;
      }
    }
  };

  const renderer = new Renderer(ctx);
  const game = new Game(renderer, callbacks);

  let lastTime = performance.now();
  let running = true;

  function frame(now: number): void {
    if (!running) return;
    let dt = now - lastTime;
    if (dt > 100) dt = 100;
    lastTime = now;

    game.update(dt);
    game.render();

    requestAnimationFrame(frame);
  }

  function restart(): void {
    game.reset();
    gameOverOverlay.classList.remove('visible');
    lastTime = performance.now();
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (game.isGameOver) {
        restart();
      } else {
        game.triggerLightningStorm();
      }
    }
  });

  restartBtn.addEventListener('click', restart);

  requestAnimationFrame(frame);
}

main();
