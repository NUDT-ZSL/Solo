import { GameEngine } from './GameEngine';
import { Renderer } from './Renderer';

let engine: GameEngine;
let renderer: Renderer;
let lastTime = performance.now();
let rafId = 0;

function init() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('gameCanvas not found');
    return;
  }

  engine = new GameEngine();
  renderer = new Renderer(canvas, engine);

  window.addEventListener('resize', onResize);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });

  startLoop();
}

function onResize() {
  if (renderer) {
    renderer.resize();
    renderer.markBoardDirty();
  }
}

function getCanvasCoords(evt: MouseEvent | Touch): { x: number; y: number } {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

function onClick(evt: MouseEvent) {
  if (!engine || !renderer) return;
  const { x, y } = getCanvasCoords(evt);
  handleInteraction(x, y);
}

function onTouchStart(evt: TouchEvent) {
  evt.preventDefault();
  if (!engine || !renderer || evt.touches.length === 0) return;
  const { x, y } = getCanvasCoords(evt.touches[0]);
  handleInteraction(x, y);
}

function onMouseMove(evt: MouseEvent) {
  if (!engine || !renderer) return;
  const { x, y } = getCanvasCoords(evt);
  for (const el of renderer.uiElements) {
    const r = el.rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      (document.getElementById('gameCanvas') as HTMLCanvasElement).style.cursor = 'pointer';
      return;
    }
  }
  const board = renderer.screenToBoard(x, y);
  const piece = engine.findPieceAtWorld(board.x, board.y);
  if (piece && piece.faction === engine.state.currentFaction && !engine.state.winner) {
    (document.getElementById('gameCanvas') as HTMLCanvasElement).style.cursor = 'pointer';
  } else {
    (document.getElementById('gameCanvas') as HTMLCanvasElement).style.cursor = 'default';
  }
}

function handleInteraction(x: number, y: number) {
  for (const el of renderer.uiElements) {
    const r = el.rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      el.onClick();
      return;
    }
  }

  const s = engine.state;
  if (s.winner || s.phase === 'ai_thinking') return;

  const board = renderer.screenToBoard(x, y);
  const clickedPiece = engine.findPieceAtWorld(board.x, board.y);

  if (clickedPiece) {
    if (clickedPiece.faction === s.currentFaction) {
      engine.selectPiece(clickedPiece.id);
      return;
    } else if (s.selectedPieceId && s.validAttacks.includes(clickedPiece.id)) {
      engine.attackPiece(clickedPiece.id);
      return;
    } else {
      return;
    }
  }

  if (s.selectedPieceId) {
    const grid = engine.findGridAtWorld(board.x, board.y);
    if (grid) {
      engine.movePieceTo(grid);
      return;
    }
  }

  engine.state.selectedPieceId = null;
  engine.state.validMoves = [];
  engine.state.validAttacks = [];
}

function startLoop() {
  lastTime = performance.now();
  const loop = (t: number) => {
    let dt = (t - lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    lastTime = t;

    if (engine && renderer) {
      engine.update(dt);
      renderer.render(engine.state);
    }

    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', () => {
  if (rafId) cancelAnimationFrame(rafId);
});
