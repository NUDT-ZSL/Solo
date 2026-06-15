import { Game } from './Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
const menuScreen = document.getElementById('menu-screen') as HTMLDivElement;
const gameoverScreen = document.getElementById('gameover-screen') as HTMLDivElement;

const game = new Game(canvas);

startBtn.addEventListener('click', () => {
  menuScreen.classList.remove('active');
  gameoverScreen.classList.remove('active');
  game.start();
});

restartBtn.addEventListener('click', () => {
  gameoverScreen.classList.remove('active');
  game.reset();
});

window.addEventListener('beforeunload', () => {
  game.stop();
});
