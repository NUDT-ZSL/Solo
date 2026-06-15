import { GameEngine } from './GameEngine';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element not found');
}

const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;

canvas.getContext('2d')!.scale(dpr, dpr);

const gameEngine = new GameEngine(canvas);

window.addEventListener('beforeunload', () => {
  gameEngine.destroy();
});
