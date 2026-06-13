import { Game } from './Game';

function main(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #game not found');
    return;
  }

  const game = new Game(canvas);

  const startBtn = document.getElementById('start-btn');
  const overlay = document.getElementById('overlay');
  const replayBtn = document.getElementById('replay-btn');
  const endScreen = document.getElementById('end-screen');

  if (startBtn && overlay) {
    startBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
      game.start();
    });
  }

  if (replayBtn && endScreen) {
    replayBtn.addEventListener('click', () => {
      endScreen.style.display = 'none';
      game.restart();
    });
  }
}

document.addEventListener('DOMContentLoaded', main);
