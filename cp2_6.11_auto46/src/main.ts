import { Game } from './game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new Game(canvas);
(game as any).init();
(window as any).__game = game;
