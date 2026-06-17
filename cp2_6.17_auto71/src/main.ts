import { GameController } from './gameController';
import { Renderer } from './renderer';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element not found');
}

const controller = new GameController(['橘子', '小黑', '小花']);
const renderer = new Renderer(canvas, controller);

let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  const cappedDelta = Math.min(deltaTime, 100);

  controller.update(cappedDelta);
  renderer.update(cappedDelta);
  renderer.render();

  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {
  renderer.resize();
});

requestAnimationFrame(gameLoop);
