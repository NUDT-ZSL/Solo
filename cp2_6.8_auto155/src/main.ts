
import { GameEngine } from './gameEngine';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './entities';

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const container = document.getElementById('game-container');
  if (!container) return;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const scale = Math.min(containerWidth / CANVAS_WIDTH, containerHeight / CANVAS_HEIGHT);

  canvas.style.width = `${CANVAS_WIDTH * scale}px`;
  canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
}

function hideLoading(): void {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.opacity = '0';
    loading.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => {
      loading.style.display = 'none';
    }, 500);
  }
}

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('找不到Canvas元素');
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  resizeCanvas(canvas);
  window.addEventListener('resize', () => resizeCanvas(canvas));

  try {
    const engine = new GameEngine(canvas);

    setTimeout(() => {
      hideLoading();
      engine.start();
    }, 800);
  } catch (error) {
    console.error('游戏引擎初始化失败:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
