import { Game } from './game.js';

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 960;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

let lastTime = 0;
let accumulator = 0;
let game: Game;

function resizeCanvas(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const container = document.getElementById('game-container')!;
  const containerW = container.clientWidth;
  const containerH = container.clientHeight;

  const scale = Math.min(containerW / CANVAS_WIDTH, containerH / CANVAS_HEIGHT);
  const displayWidth = CANVAS_WIDTH * scale;
  const displayHeight = CANVAS_HEIGHT * scale;

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  game = new Game(canvas);
  game.emitter.prepareNext(game.state.cleanupMode);

  window.addEventListener('keydown', (e) => {
    game.handleKeyDown(e);
  });

  window.addEventListener('keyup', (e) => {
    game.handleKeyUp(e);
  });

  canvas.addEventListener('mousemove', (e) => {
    game.handleMouseMove(e);
  });

  canvas.addEventListener('mousedown', (e) => {
    game.handleMouseDown(e);
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    game.handleMouseDown(mouseEvent);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    game.handleMouseMove(mouseEvent);
  }, { passive: false });

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime: number): void {
  requestAnimationFrame(gameLoop);

  const deltaTime = Math.min(currentTime - lastTime, 250);
  lastTime = currentTime;
  accumulator += deltaTime;

  let frameCount = 0;
  while (accumulator >= FRAME_TIME && frameCount < 5) {
    game.update(FRAME_TIME);
    accumulator -= FRAME_TIME;
    frameCount++;
  }

  const alpha = accumulator / FRAME_TIME;
  game.draw();
  void alpha;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
