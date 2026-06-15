import { GameManager } from './gameManager';
import { Renderer } from './renderer';
import { MouseState } from './sandSim';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas元素未找到');

let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;

const MIN_W = 320;
const MIN_H = 568;

function getScaledSize() {
  let w = window.innerWidth;
  let h = window.innerHeight;
  const scale = Math.min(w / MIN_W, h / MIN_H);
  if (scale < 1) {
    w = MIN_W * scale;
    h = MIN_H * scale;
  }
  return { w: Math.floor(w), h: Math.floor(h) };
}

function updateCanvasSize() {
  const { w, h } = getScaledSize();
  viewWidth = w;
  viewHeight = h;
  renderer.resize(w, h);
  game.resize(w, h);
}

const renderer = new Renderer(canvas);
const game = new GameManager(viewWidth, viewHeight);
updateCanvasSize();

const mouse: MouseState = {
  x: 0,
  y: 0,
  isOverTop: false,
  isDown: false
};

let lastTime = performance.now();

function gameLoop(currentTime: number) {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  game.update(dt, mouse);

  const status = game.getStatus();
  renderer.render(
    dt,
    game.getParticles(),
    game.getWorms(),
    game.hourglass,
    status,
    game.getFlashTime(),
    mouse.x,
    mouse.y
  );

  requestAnimationFrame(gameLoop);
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (viewWidth / rect.width),
    y: (e.clientY - rect.top) * (viewHeight / rect.height)
  };
}

canvas.addEventListener('mousemove', (e) => {
  const coords = getCanvasCoords(e);
  mouse.x = coords.x;
  mouse.y = coords.y;
  mouse.isOverTop = game.isMouseOverHourglassTop(coords.x, coords.y);
});

canvas.addEventListener('mousedown', (e) => {
  const coords = getCanvasCoords(e);

  if (game.isMouseOverPauseButton(coords.x, coords.y)) {
    game.togglePause();
    return;
  }

  if (game.isMouseOverReplayButton(coords.x, coords.y)) {
    game.restart();
    return;
  }

  mouse.isDown = true;
});

canvas.addEventListener('mouseup', () => {
  mouse.isDown = false;
});

canvas.addEventListener('mouseleave', () => {
  mouse.isDown = false;
  mouse.isOverTop = false;
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    const coords = getCanvasCoords(e.touches[0]);
    mouse.x = coords.x;
    mouse.y = coords.y;
    mouse.isDown = true;
    mouse.isOverTop = game.isMouseOverHourglassTop(coords.x, coords.y);

    if (game.isMouseOverPauseButton(coords.x, coords.y)) {
      game.togglePause();
    }
    if (game.isMouseOverReplayButton(coords.x, coords.y)) {
      game.restart();
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    const coords = getCanvasCoords(e.touches[0]);
    mouse.x = coords.x;
    mouse.y = coords.y;
    mouse.isOverTop = game.isMouseOverHourglassTop(coords.x, coords.y);
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  mouse.isDown = false;
  mouse.isOverTop = false;
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    game.togglePause();
  } else if (e.code === 'KeyR') {
    game.restart();
  }
});

window.addEventListener('resize', () => {
  updateCanvasSize();
});

requestAnimationFrame((t) => {
  lastTime = t;
  gameLoop(t);
});
