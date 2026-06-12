import { Maze, MAZE_WIDTH, MAZE_HEIGHT, IMaze } from './maze';
import { Player } from './player';
import {
  UIState,
  createInitialUIState,
  updateUIStateSize,
  updateUIStatus,
  updateUIFragments,
  togglePause,
  triggerVictory,
  resetUIState,
  drawStatusPanel,
  drawButtons,
  drawExit,
  drawFragments,
  drawMazeWalls,
  drawPauseOverlay,
  drawVictory,
  drawInstructions,
  isPauseButtonClicked,
  isResetButtonClicked,
} from './ui';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let maze: IMaze;
let player: Player;
let uiState: UIState;
let lastTime: number = 0;
let cameraX: number = 0;
let cameraY: number = 0;
let mouseX: number = 0;
let mouseY: number = 0;
const keys: Set<string> = new Set();

const TOTAL_FRAGMENTS = 10;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (uiState) {
    uiState = updateUIStateSize(uiState, canvas.width, canvas.height);
  }
}

function init(): void {
  maze = new Maze();
  player = new Player(TOTAL_FRAGMENTS);
  uiState = createInitialUIState(canvas.width, canvas.height, TOTAL_FRAGMENTS);

  player.onFragmentCollected = (count: number, total: number) => {
    uiState = updateUIFragments(uiState, count, total);
  };

  lastTime = performance.now();
}

function updateCamera(): void {
  const targetX = player.x - canvas.width / 2;
  const targetY = player.y - canvas.height / 2;

  const maxCamX = MAZE_WIDTH - canvas.width;
  const maxCamY = MAZE_HEIGHT - canvas.height;

  if (MAZE_WIDTH <= canvas.width) {
    cameraX = (MAZE_WIDTH - canvas.width) / 2;
  } else {
    cameraX = Math.max(0, Math.min(maxCamX, targetX));
  }

  if (MAZE_HEIGHT <= canvas.height) {
    cameraY = (MAZE_HEIGHT - canvas.height) / 2;
  } else {
    cameraY = Math.max(0, Math.min(maxCamY, targetY));
  }
}

function gameLoop(now: number): void {
  requestAnimationFrame(gameLoop);

  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  if (uiState.showVictory) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawVictory(ctx, uiState, now);
    return;
  }

  if (uiState.paused) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    drawMazeWalls(ctx, maze);
    drawExit(ctx, maze, now);
    drawFragments(ctx, maze, now);
    player.draw(ctx, now);
    ctx.restore();
    drawPauseOverlay(ctx, uiState);
    drawButtons(ctx, uiState, mouseX, mouseY);
    return;
  }

  handleMovement();
  player.update(maze, now, dt);
  updateCamera();

  uiState = updateUIStatus(uiState, player.getStatus());

  if (maze.isAtExit(player.x, player.y)) {
    uiState = triggerVictory(uiState, now);
  }

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  drawMazeWalls(ctx, maze);
  drawExit(ctx, maze, now);
  drawFragments(ctx, maze, now);
  player.draw(ctx, now);

  drawFogOfWar(ctx, now);

  ctx.restore();

  drawStatusPanel(ctx, uiState);
  drawButtons(ctx, uiState, mouseX, mouseY);
  drawInstructions(ctx, uiState, now);
}

function drawFogOfWar(ctx: CanvasRenderingContext2D, now: number): void {
  const ambientRadius = 55;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';

  const ambientGrad = ctx.createRadialGradient(
    player.x, player.y, 0,
    player.x, player.y, ambientRadius
  );
  ambientGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
  ambientGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.25)');
  ambientGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = ambientGrad;
  ctx.fillRect(
    player.x - ambientRadius - 10,
    player.y - ambientRadius - 10,
    (ambientRadius + 10) * 2,
    (ambientRadius + 10) * 2
  );

  for (const pulse of player.pulses) {
    if (!pulse.active) continue;
    const elapsed = now - pulse.startTime;
    const progress = Math.min(elapsed / pulse.duration, 1);
    const currentRadius = progress * pulse.maxRadius;
    const fadeOpacity = pulse.baseOpacity * (1 - progress);

    if (fadeOpacity <= 0 || currentRadius <= 0) continue;

    const shellThickness = 22;
    const innerRadius = Math.max(0, currentRadius - shellThickness);

    const pg = ctx.createRadialGradient(
      pulse.x, pulse.y, innerRadius,
      pulse.x, pulse.y, currentRadius
    );
    pg.addColorStop(0, 'rgba(255, 255, 255, 0)');
    pg.addColorStop(0.5, `rgba(255, 255, 255, ${fadeOpacity * 0.5})`);
    pg.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = pg;
    ctx.fillRect(
      pulse.x - currentRadius - 5,
      pulse.y - currentRadius - 5,
      (currentRadius + 5) * 2,
      (currentRadius + 5) * 2
    );
  }

  for (const hw of player.highlightWalls) {
    const elapsed = now - hw.startTime;
    const progress = elapsed / hw.duration;
    const alpha = hw.baseOpacity * (1 - progress);
    if (alpha <= 0) continue;

    const cx = (hw.x1 + hw.x2) / 2;
    const cy = (hw.y1 + hw.y2) / 2;
    const halfLen = Math.hypot(hw.x2 - hw.x1, hw.y2 - hw.y1) / 2;
    const revealR = Math.max(halfLen + 14, 22);

    const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, revealR);
    hg.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.7})`);
    hg.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.3})`);
    hg.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = hg;
    ctx.fillRect(cx - revealR, cy - revealR, revealR * 2, revealR * 2);
  }

  ctx.restore();
}

function handleMovement(): void {
  let dx = 0;
  let dy = 0;

  if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy = -1;
  if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy = 1;
  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx = -1;
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx = 1;

  player.moveDir = { x: dx, y: dy };
}

window.addEventListener('keydown', (e: KeyboardEvent) => {
  keys.add(e.key);

  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    if (!uiState.paused && !uiState.showVictory) {
      player.emitPulse();
    }
  }

  if (e.key === 'p' || e.key === 'P') {
    uiState = togglePause(uiState);
  }

  if (e.key === 'r' || e.key === 'R') {
    resetGame();
  }
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
  keys.delete(e.key);
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

canvas.addEventListener('click', (e: MouseEvent) => {
  if (isPauseButtonClicked(uiState, e.clientX, e.clientY)) {
    uiState = togglePause(uiState);
  }

  if (isResetButtonClicked(uiState, e.clientX, e.clientY)) {
    resetGame();
  }
});

function resetGame(): void {
  maze = new Maze();
  player.reset(TOTAL_FRAGMENTS);
  uiState = resetUIState(uiState, TOTAL_FRAGMENTS);

  player.onFragmentCollected = (count: number, total: number) => {
    uiState = updateUIFragments(uiState, count, total);
  };
}

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
init();
requestAnimationFrame(gameLoop);
