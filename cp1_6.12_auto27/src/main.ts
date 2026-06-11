import { GameManager } from './GameManager';
import { Renderer } from './Renderer';
import { audioManager } from './AudioManager';
import { SYMBOL_COLORS, GamePiece, PushDirection } from './types';

let canvas: HTMLCanvasElement;
let gameManager: GameManager;
let renderer: Renderer;
let lastTime = 0;
let isDraggingSlider = false;
let lastPushWarningTime = 0;

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  gameManager = new GameManager();
  renderer = new Renderer(canvas);
  audioManager.init();

  renderer.resize();
  setupEventListeners();
  setupGameCallbacks();

  requestAnimationFrame(gameLoop);
}

function setupEventListeners(): void {
  window.addEventListener('resize', () => {
    renderer.resize();
  });

  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  canvas.addEventListener('mouseup', handlePointerUp);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  document.addEventListener('click', () => {
    audioManager.resume();
  }, { once: true });
}

function setupGameCallbacks(): void {
  gameManager.setCallbacks({
    onMerge: (pieces: GamePiece[], newLevel: number, score: number, row: number, col: number) => {
      const color = SYMBOL_COLORS[pieces[0].type];
      pieces.forEach(p => {
        renderer.spawnMergeParticles(p.col, p.row, color);
      });
      renderer.addFloatingText(col, row, `+${score}`, '#ffd700');
      renderer.showMergeNotification(`合成成功！+${score}分`);
      audioManager.playMerge(newLevel);
    },
    onLifeLost: () => {
      audioManager.playLifeLost();
    },
    onPush: (direction: PushDirection) => {
      renderer.showPushSweep(direction);
      audioManager.playPushWarning();
    },
    onGameOver: () => {
      audioManager.playGameOver();
    },
    onMove: () => {
      audioManager.playMove();
    },
    onSelect: () => {
      audioManager.playSelect();
    },
    onComboChange: (combo: number) => {
      if (combo > 1) {
        audioManager.playCombo(combo);
      }
    }
  });
}

function handlePointerDown(e: MouseEvent): void {
  handleTap(e.clientX, e.clientY);
}

function handlePointerMove(e: MouseEvent): void {
  if (isDraggingSlider) {
    handleSliderDrag(e.clientX);
  }
}

function handlePointerUp(_e: MouseEvent): void {
  isDraggingSlider = false;
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    handleTap(touch.clientX, touch.clientY);
  }
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (isDraggingSlider && e.touches.length > 0) {
    handleSliderDrag(e.touches[0].clientX);
  }
}

function handleTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  isDraggingSlider = false;
}

function handleTap(clientX: number, clientY: number): void {
  audioManager.resume();

  const state = gameManager.getState();

  if (state.isGameOver) {
    if (renderer.isPointOnRestart(clientX, clientY)) {
      gameManager.resetGame();
    }
    return;
  }

  if (renderer.isPointOnSlider(clientX, clientY)) {
    isDraggingSlider = true;
    handleSliderDrag(clientX);
    return;
  }

  const gridPos = renderer.screenToGrid(clientX, clientY);
  if (gridPos) {
    gameManager.selectPiece(gridPos.row, gridPos.col);
  }
}

function handleSliderDrag(clientX: number): void {
  const value = renderer.getSliderValue(clientX);
  gameManager.setPushInterval(value);
}

function gameLoop(timestamp: number): void {
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  const state = gameManager.getState();
  const pushTimer = gameManager.getPushTimer();
  const pushInterval = gameManager.getPushInterval();

  if (!state.isGameOver) {
    gameManager.update(deltaTime);

    if (pushTimer < 3000 && timestamp - lastPushWarningTime > 1000) {
      audioManager.playPushWarning();
      lastPushWarningTime = timestamp;
    }
  }

  renderer.update(deltaTime);
  renderer.render(gameManager.getGrid(), state, pushTimer, pushInterval);

  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
