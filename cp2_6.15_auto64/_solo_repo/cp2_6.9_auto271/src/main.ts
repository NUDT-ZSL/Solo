import { GameEngine } from './gameEngine';
import { Renderer } from './renderer';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const engine = new GameEngine();
const renderer = new Renderer(canvas, engine);

let lastTime = performance.now();
let mouseX = 0, mouseY = 0;

const handleResize = () => {
  renderer.resize();
};

const getCanvasCoords = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  if ('touches' in e) {
    const t = e.touches[0] || e.changedTouches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

const animateClickScale = (key: 'resign' | 'confirm' | 'cancel') => {
  renderer.clickScale[key] = 0.95;
  setTimeout(() => { renderer.clickScale[key] = 1; }, 100);
};

const handleClick = (e: MouseEvent) => {
  const { x, y } = getCanvasCoords(e);
  const action = renderer.handleClick(x, y);

  if (action === 'resign') {
    animateClickScale('resign');
    renderer.showConfirm = true;
  } else if (action === 'confirm') {
    animateClickScale('confirm');
    renderer.showConfirm = false;
    engine.resign();
  } else if (action === 'cancel') {
    animateClickScale('cancel');
    renderer.showConfirm = false;
  } else if (action === 'board') {
    const cell = renderer.getBoardCell(x, y);
    if (cell) {
      if (engine.selected) {
        if (!engine.tryMove(cell.row, cell.col)) {
          const p = engine.board[cell.row][cell.col];
          if (p && p.owner === 'player') {
            engine.selectPiece(cell.row, cell.col, performance.now());
          } else {
            engine.selected = null;
            engine.legalMoves = [];
          }
        }
      } else {
        engine.selectPiece(cell.row, cell.col, performance.now());
      }
    }
  }
};

const handleMouseMove = (e: MouseEvent) => {
  const { x, y } = getCanvasCoords(e);
  mouseX = x; mouseY = y;
  renderer.updateHover(x, y);
};

const handleTouchStart = (e: TouchEvent) => {
  e.preventDefault();
  const { x, y } = getCanvasCoords(e);
  mouseX = x; mouseY = y;
  renderer.updateHover(x, y);
  handleClick(e as unknown as MouseEvent);
};

window.addEventListener('resize', handleResize);
canvas.addEventListener('click', handleClick);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

handleResize();

const loop = (now: number) => {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  engine.tickAI(now);
  engine.updateParticles(dt);
  engine.updateCapturedAnimations(dt);

  renderer.render(now);

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
