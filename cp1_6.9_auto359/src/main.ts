import { Renderer } from './renderer';

const HINT_THRESHOLD = 50;

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
const particleCountEl = document.getElementById('particleCount') as HTMLElement | null;
const hintTextEl = document.getElementById('hintText') as HTMLElement | null;

if (!canvas) {
  throw new Error('Canvas element not found');
}

const renderer = new Renderer(canvas);

let lastTime = performance.now();
let animationId: number;
let isMouseDown = false;

function updateUI(): void {
  const count = renderer.getActiveCount();
  if (particleCountEl) {
    particleCountEl.textContent = String(count);
  }
  if (hintTextEl) {
    if (count < HINT_THRESHOLD) {
      hintTextEl.classList.remove('hidden');
    } else {
      hintTextEl.classList.add('hidden');
    }
  }
}

function gameLoop(now: number): void {
  const deltaTime = Math.min(now - lastTime, 100);
  lastTime = now;

  renderer.update(deltaTime, now);
  renderer.render(now);
  updateUI();

  animationId = requestAnimationFrame(gameLoop);
}

function getMousePos(e: MouseEvent): { x: number; y: number } {
  const rect = canvas!.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function getTouchPos(e: TouchEvent): { x: number; y: number } | null {
  if (e.touches.length === 0) return null;
  const rect = canvas!.getBoundingClientRect();
  const touch = e.touches[0];
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
}

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  isMouseDown = true;
  const pos = getMousePos(e);
  renderer.startDrawing(pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const pos = getMousePos(e);
  renderer.setMousePosition(pos.x, pos.y);
});

window.addEventListener('mouseup', () => {
  if (isMouseDown) {
    isMouseDown = false;
    renderer.stopDrawing();
  }
});

canvas.addEventListener('mouseleave', () => {
  if (isMouseDown) {
    isMouseDown = false;
    renderer.stopDrawing();
  }
});

canvas.addEventListener(
  'touchstart',
  (e: TouchEvent) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    if (pos) {
      isMouseDown = true;
      renderer.startDrawing(pos.x, pos.y);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  'touchmove',
  (e: TouchEvent) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    if (pos) {
      renderer.setMousePosition(pos.x, pos.y);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  'touchend',
  (e: TouchEvent) => {
    e.preventDefault();
    isMouseDown = false;
    renderer.stopDrawing();
  },
  { passive: false }
);

window.addEventListener('resize', () => {
  renderer.resize();
});

animationId = requestAnimationFrame(gameLoop);
updateUI();

window.addEventListener('beforeunload', () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});
