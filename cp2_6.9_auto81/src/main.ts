import { PhysicsEngine, Nebula } from './physics';
import { Renderer } from './renderer';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const hintBar = document.getElementById('hint-bar') as HTMLDivElement;

const DEFAULT_HINT = '点击生成星云 | 拖拽移动星云 | 碰撞融合星云';
const FULL_HINT = '星云已满';

const engine = new PhysicsEngine();
const renderer = new Renderer(canvas);

renderer.resize();

let isDragging = false;
let draggedNebula: Nebula | null = null;
let lastMouseX = 0;
let lastMouseY = 0;
let dragStartX = 0;
let dragStartY = 0;
let mouseMoved = false;
const MOVE_THRESHOLD = 5;

function updateHintBar(): void {
  if (engine.fullMessageTimer > 0) {
    hintBar.textContent = FULL_HINT;
    hintBar.classList.add('full');
  } else {
    hintBar.textContent = DEFAULT_HINT;
    hintBar.classList.remove('full');
  }
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  const { x, y } = getCanvasCoords(e);
  lastMouseX = x;
  lastMouseY = y;
  dragStartX = x;
  dragStartY = y;
  mouseMoved = false;

  const nebula = engine.findNebulaAt(x, y);
  if (nebula) {
    isDragging = true;
    draggedNebula = nebula;
    engine.startDrag(nebula);
  }
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const { x, y } = getCanvasCoords(e);

  if (!mouseMoved) {
    const dx = x - dragStartX;
    const dy = y - dragStartY;
    if (dx * dx + dy * dy > MOVE_THRESHOLD * MOVE_THRESHOLD) {
      mouseMoved = true;
    }
  }

  if (isDragging && draggedNebula) {
    engine.dragTo(draggedNebula, x, y, lastMouseX, lastMouseY);
  }

  lastMouseX = x;
  lastMouseY = y;
});

canvas.addEventListener('mouseup', (e: MouseEvent) => {
  const { x, y } = getCanvasCoords(e);

  if (isDragging && draggedNebula) {
    const dx = x - dragStartX;
    const dy = y - dragStartY;
    engine.endDrag(draggedNebula, dx, dy);
    isDragging = false;
    draggedNebula = null;
  } else if (!mouseMoved) {
    engine.createNebula(x, y);
  }
});

canvas.addEventListener('mouseleave', () => {
  if (isDragging && draggedNebula) {
    const dx = lastMouseX - dragStartX;
    const dy = lastMouseY - dragStartY;
    engine.endDrag(draggedNebula, dx, dy);
    isDragging = false;
    draggedNebula = null;
  }
});

window.addEventListener('resize', () => {
  renderer.resize();
});

function loop(): void {
  engine.step(renderer.width, renderer.height);
  renderer.render(engine);
  updateHintBar();
  requestAnimationFrame(loop);
}

loop();
