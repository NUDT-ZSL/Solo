import { GameManager } from './GameManager';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Unable to get 2D context');
    return;
  }

  const manager = new GameManager(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

  canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    manager.handleClick(mx, my);
  });

  manager.start();
}

document.addEventListener('DOMContentLoaded', init);
