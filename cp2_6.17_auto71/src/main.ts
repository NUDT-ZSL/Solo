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

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (controller.isGameOver) {
    const restartBtnX = canvas.width / 2 - 70;
    const restartBtnY = canvas.height / 2 + 60;
    const restartBtnW = 140;
    const restartBtnH = 44;

    if (x >= restartBtnX && x <= restartBtnX + restartBtnW &&
        y >= restartBtnY && y <= restartBtnY + restartBtnH) {
      controller.restart(['橘子', '小黑', '小花']);
      return;
    }
  }

  renderer.handleClick(x, y);
});

window.addEventListener('resize', () => {
  renderer.resize();
});

requestAnimationFrame(gameLoop);
