import { GameManager } from './GameManager';
import { Renderer } from './Renderer';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const gameManager = new GameManager(canvas);
const renderer = new Renderer(canvas);

gameManager.init();

let lastTime = performance.now();
let dragStartX = 0;
let isDragging = false;
let dragDeltaX = 0;

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  dragStartX = e.clientX;
  isDragging = true;
  dragDeltaX = 0;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  if (isDragging) {
    const dx = e.clientX - dragStartX;
    dragDeltaX += dx;
    if (Math.abs(dragDeltaX) > 5) {
      gameManager.handleSwipe(dx);
    }
    dragStartX = e.clientX;
  }

  if (gameManager.state.isGameOver) {
    renderer.setHoverRestart(gameManager.isRestartButtonHovered(e.clientX, e.clientY));
  }
});

canvas.addEventListener('mouseup', (e: MouseEvent) => {
  if (isDragging && Math.abs(dragDeltaX) < 10) {
    gameManager.handleClick(e.clientX, e.clientY);
  }
  isDragging = false;
  dragDeltaX = 0;
});

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  const touch = e.touches[0];
  dragStartX = touch.clientX;
  isDragging = true;
  dragDeltaX = 0;
}, { passive: false });

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  e.preventDefault();
  if (isDragging && e.touches.length > 0) {
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartX;
    dragDeltaX += dx;
    if (Math.abs(dragDeltaX) > 5) {
      gameManager.handleSwipe(dx);
    }
    dragStartX = touch.clientX;
  }
}, { passive: false });

canvas.addEventListener('touchend', (e: TouchEvent) => {
  e.preventDefault();
  if (isDragging && Math.abs(dragDeltaX) < 10 && e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    gameManager.handleClick(touch.clientX, touch.clientY);
  }
  isDragging = false;
  dragDeltaX = 0;
}, { passive: false });

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  gameManager.update(dt);

  const timeInSeconds = currentTime / 1000;
  renderer.draw(gameManager.state, timeInSeconds);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
