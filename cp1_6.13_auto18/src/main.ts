import { Maze, MAZE_WIDTH, MAZE_HEIGHT } from './maze';
import { Player } from './player';
import { UI } from './ui';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let maze: Maze;
let player: Player;
let ui: UI;
let lastTime: number = 0;
let cameraX: number = 0;
let cameraY: number = 0;
let mouseX: number = 0;
let mouseY: number = 0;
const keys: Set<string> = new Set();

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (ui) ui.updateSize(canvas.width, canvas.height);
}

function init(): void {
  maze = new Maze();
  player = new Player();
  ui = new UI(canvas.width, canvas.height);
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

  const dt = now - lastTime;
  lastTime = now;

  if (ui.showVictory) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ui.drawVictory(ctx, player, now);
    return;
  }

  if (ui.paused) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    ui.drawMazeWalls(ctx, maze);
    ui.drawExit(ctx, maze, now);
    ui.drawFragments(ctx, maze, now);
    player.draw(ctx, now);
    ctx.restore();
    ui.drawPauseOverlay(ctx);
    return;
  }

  handleMovement();
  player.update(maze, now, dt);
  updateCamera();

  if (maze.isAtExit(player.x, player.y)) {
    ui.showVictory = true;
    ui.victoryTime = now;
  }

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  drawAmbientLight(ctx);

  ui.drawMazeWalls(ctx, maze);
  ui.drawExit(ctx, maze, now);
  ui.drawFragments(ctx, maze, now);
  player.draw(ctx, now);

  drawFogOfWar(ctx);

  ctx.restore();

  ui.drawStatusPanel(ctx, player);
  ui.drawButtons(ctx, mouseX, mouseY);
  ui.drawInstructions(ctx, now);
}

function drawAmbientLight(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createRadialGradient(
    player.x, player.y, 0,
    player.x, player.y, 60
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(
    player.x - 60, player.y - 60,
    120, 120
  );
}

function drawFogOfWar(ctx: CanvasRenderingContext2D): void {
  const ambientRadius = 50;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';

  const gradient = ctx.createRadialGradient(
    player.x, player.y, 0,
    player.x, player.y, ambientRadius
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(player.x - ambientRadius, player.y - ambientRadius, ambientRadius * 2, ambientRadius * 2);

  for (const pulse of player.pulses) {
    if (!pulse.active) continue;
    const elapsed = performance.now() - pulse.startTime;
    const progress = Math.min(elapsed / pulse.duration, 1);
    const currentRadius = progress * pulse.maxRadius;
    const fadeOpacity = pulse.opacity * (1 - progress);

    if (fadeOpacity <= 0 || currentRadius <= 0) continue;

    const pg = ctx.createRadialGradient(
      pulse.x, pulse.y, Math.max(0, currentRadius - 15),
      pulse.x, pulse.y, currentRadius
    );
    pg.addColorStop(0, `rgba(255, 255, 255, 0)`);
    pg.addColorStop(0.5, `rgba(255, 255, 255, ${fadeOpacity * 0.4})`);
    pg.addColorStop(1, `rgba(255, 255, 255, 0)`);

    ctx.fillStyle = pg;
    ctx.fillRect(
      pulse.x - currentRadius, pulse.y - currentRadius,
      currentRadius * 2, currentRadius * 2
    );
  }

  for (const hw of player.highlightWalls) {
    const elapsed = performance.now() - hw.startTime;
    const progress = elapsed / hw.duration;
    const alpha = hw.opacity * (1 - progress);
    if (alpha <= 0) continue;

    const cx = (hw.x1 + hw.x2) / 2;
    const cy = (hw.y1 + hw.y2) / 2;
    const halfLen = Math.hypot(hw.x2 - hw.x1, hw.y2 - hw.y1) / 2;
    const revealR = halfLen + 10;

    const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, revealR);
    hg.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
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
    if (!ui.paused && !ui.showVictory) {
      player.emitPulse();
    }
  }

  if (e.key === 'p' || e.key === 'P') {
    if (!ui.showVictory) {
      ui.paused = !ui.paused;
    }
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
  const btnSize = 40;
  const padding = 16;
  const pauseX = canvas.width - btnSize - padding * 2 - btnSize;
  const resetX = canvas.width - btnSize - padding;
  const btnY = padding;

  if (ui.isInRect(e.clientX, e.clientY, pauseX, btnY, btnSize, btnSize)) {
    if (!ui.showVictory) {
      ui.paused = !ui.paused;
    }
  }

  if (ui.isInRect(e.clientX, e.clientY, resetX, btnY, btnSize, btnSize)) {
    resetGame();
  }
});

function resetGame(): void {
  maze = new Maze();
  player.reset();
  ui.paused = false;
  ui.showVictory = false;
}

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
init();
requestAnimationFrame(gameLoop);
