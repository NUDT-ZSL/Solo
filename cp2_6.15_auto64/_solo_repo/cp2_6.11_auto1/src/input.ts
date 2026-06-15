import { GameState, launchBall, resetGame } from './physics';

export function initInput(canvas: HTMLCanvasElement, state: GameState): void {
  canvas.addEventListener('mousedown', (e) => onMouseDown(e, canvas, state));
  canvas.addEventListener('mousemove', (e) => onMouseMove(e, canvas, state));
  canvas.addEventListener('mouseup', (e) => onMouseUp(e, canvas, state));

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
    onMouseDown(fakeEvent as MouseEvent, canvas, state);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
    onMouseMove(fakeEvent as MouseEvent, canvas, state);
  });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    onMouseUp({ clientX: 0, clientY: 0 } as MouseEvent, canvas, state);
  });
}

function getCanvasPos(e: MouseEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = 800 / rect.width;
  const scaleY = 600 / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function onMouseDown(e: MouseEvent, canvas: HTMLCanvasElement, state: GameState): void {
  if (state.gameOver) {
    const btn = (state as any)._restartBtn;
    if (btn) {
      const pos = getCanvasPos(e, canvas);
      if (
        pos.x >= btn.x && pos.x <= btn.x + btn.w &&
        pos.y >= btn.y && pos.y <= btn.y + btn.h
      ) {
        resetGame(state);
      }
    }
    return;
  }

  if (state.ball.active) return;

  const pos = getCanvasPos(e, canvas);
  const dx = pos.x - state.launchPos.x;
  const dy = pos.y - state.launchPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 60) {
    state.isLaunching = true;
    (state as any)._mousePos = pos;
  }
}

function onMouseMove(e: MouseEvent, canvas: HTMLCanvasElement, state: GameState): void {
  if (!state.isLaunching) return;
  const pos = getCanvasPos(e, canvas);
  (state as any)._mousePos = pos;
}

function onMouseUp(e: MouseEvent, canvas: HTMLCanvasElement, state: GameState): void {
  if (!state.isLaunching) return;
  state.isLaunching = false;

  const mousePos = (state as any)._mousePos;
  if (!mousePos) return;

  const dx = mousePos.x - state.launchPos.x;
  const dy = mousePos.y - state.launchPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = 150;
  const power = Math.min(dist / maxDist, 1) * 10;
  const angle = Math.atan2(-dy, -dx);

  if (power > 0.5) {
    launchBall(state, angle, power);
  }

  (state as any)._mousePos = undefined;
}
