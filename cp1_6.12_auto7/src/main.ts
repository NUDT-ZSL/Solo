import { GameEngine } from './core/GameEngine.js';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new GameEngine(canvas);
game.start();

(window as unknown as { __game: GameEngine }).__game = game;
