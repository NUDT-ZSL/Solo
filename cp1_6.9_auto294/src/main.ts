import { GameEngine } from './game';
import type { GridPos } from './game';
import { Renderer } from './render';
import type { HoverInfo } from './render';

function getCanvas(): HTMLCanvasElement {
  const el = document.getElementById('canvas');
  if (!el || !(el instanceof HTMLCanvasElement)) {
    throw new Error('未找到Canvas元素');
  }
  return el;
}

function getButton(id: string): HTMLButtonElement | null {
  const el = document.getElementById(id);
  return el instanceof HTMLButtonElement ? el : null;
}

const canvas = getCanvas();
const btnUndo = getButton('btnUndo');
const btnRedo = getButton('btnRedo');
const btnExport = getButton('btnExport');

const engine = new GameEngine();
const renderer = new Renderer(canvas);

let hoverGrid: GridPos | null = null;

function computeCanvasSize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.resize(width, height, dpr);
  const layout = renderer.computeLayout(engine.gridSize);
  engine.setLayout(layout);
}

function updateButtonStates(): void {
  if (btnUndo) btnUndo.disabled = !engine.canUndo();
  if (btnRedo) btnRedo.disabled = !engine.canRedo();
}

function handleClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const pos = engine.pixelToGrid(x, y);
  if (!pos) return;
  const now = performance.now();
  const placed = engine.placeStone(pos, now);
  if (placed) {
    updateButtonStates();
  }
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  hoverGrid = engine.pixelToGrid(x, y);
}

function handleMouseLeave(): void {
  hoverGrid = null;
}

function handleUndo(): void {
  if (engine.undo()) {
    updateButtonStates();
  }
}

function handleRedo(): void {
  if (engine.redo()) {
    updateButtonStates();
  }
}

async function handleExport(): Promise<void> {
  if (!btnExport) return;
  btnExport.disabled = true;
  try {
    const captureNow = performance.now();
    await renderer.exportPng(
      engine.stones,
      engine.diffusions,
      engine.ripples,
      engine.gridSize,
      captureNow
    );
  } finally {
    btnExport.disabled = false;
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  const isCtrl = e.ctrlKey || e.metaKey;
  if (!isCtrl) return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault();
    handleUndo();
  } else if (key === 'z' && e.shiftKey) {
    e.preventDefault();
    handleRedo();
  } else if (key === 'y') {
    e.preventDefault();
    handleRedo();
  }
}

function handleResize(): void {
  computeCanvasSize();
}

function loop(now: number): void {
  engine.update(now);
  const hover: HoverInfo = {
    pos: hoverGrid,
    nextColor: engine.nextColor
  };
  renderer.render(
    engine.stones,
    engine.diffusions,
    engine.ripples,
    hover,
    now
  );
  requestAnimationFrame(loop);
}

function bindEvents(): void {
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleResize);
  if (btnUndo) btnUndo.addEventListener('click', handleUndo);
  if (btnRedo) btnRedo.addEventListener('click', handleRedo);
  if (btnExport) btnExport.addEventListener('click', handleExport);
}

function init(): void {
  computeCanvasSize();
  bindEvents();
  updateButtonStates();
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
