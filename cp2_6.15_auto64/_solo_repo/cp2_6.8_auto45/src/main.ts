import { Maze } from './maze';
import { Player } from './player';

type GameState = 'menu' | 'playing' | 'win';

interface RayHit {
  distance: number;
  isWall: boolean;
  gx: number;
  gy: number;
  side: number;
}

interface MenuButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  size: number;
  hover: boolean;
  onClick: () => void;
}

const CELL_SIZE = 40;
const RAY_COUNT = 60;
const BG_COLOR = '#1a1a2e';
const WALL_COLOR = '#0f3460';
const FLOOR_COLOR = '#16213e';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let width = 0;
let height = 0;

function resize(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

let gameState: GameState = 'menu';
let maze: Maze | null = null;
let player: Player | null = null;
let score = 0;
let gameStartTime = 0;
let elapsedTime = 0;
let shakeTime = 0;
let shakeIntensity = 0;
let redFlashTime = 0;

const keys = new Set<string>();
const menuButtons: MenuButton[] = [];
let mouseX = 0;
let mouseY = 0;
let mouseLocked = false;
let audioCtx: AudioContext | null = null;

function initAudio(): void {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
}

function playCoinSound(): void {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function startGame(difficulty: number): void {
  initAudio();
  maze = new Maze(difficulty, CELL_SIZE);
  const start = maze.getStartPixel();
  player = new Player(start.x, start.y);
  score = 0;
  gameStartTime = performance.now();
  elapsedTime = 0;
  shakeTime = 0;
  redFlashTime = 0;
  gameState = 'playing';
  requestPointerLock();
}

function requestPointerLock(): void {
  canvas.requestPointerLock = canvas.requestPointerLock || (canvas as unknown as { webkitRequestPointerLock: () => void }).webkitRequestPointerLock;
  canvas.requestPointerLock();
}

document.addEventListener('pointerlockchange', () => {
  mouseLocked = document.pointerLockElement === canvas;
});

window.addEventListener('keydown', (e) => {
  keys.add(e.key);
  if (gameState === 'win' && e.key !== 'Shift') {
    gameState = 'menu';
    menuButtons.length = 0;
  }
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key);
});

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (mouseLocked && player) {
    player.rotate(e.movementX * 0.002);
  }
  if (gameState === 'menu') {
    for (const btn of menuButtons) {
      btn.hover = mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h;
    }
  }
});

canvas.addEventListener('click', () => {
  initAudio();
  if (gameState === 'menu') {
    for (const btn of menuButtons) {
      if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
        btn.onClick();
        return;
      }
    }
  } else if (gameState === 'playing' && !mouseLocked) {
    requestPointerLock();
  } else if (gameState === 'win') {
    gameState = 'menu';
    menuButtons.length = 0;
  }
});

function castRay(startX: number, startY: number, angle: number, maxDist: number, m: Maze): RayHit {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  let mapX = Math.floor(startX / CELL_SIZE);
  let mapY = Math.floor(startY / CELL_SIZE);
  const deltaDistX = Math.abs(1 / dirX);
  const deltaDistY = Math.abs(1 / dirY);
  let stepX: number, stepY: number;
  let sideDistX: number, sideDistY: number;

  if (dirX < 0) {
    stepX = -1;
    sideDistX = ((startX / CELL_SIZE) - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - (startX / CELL_SIZE)) * deltaDistX;
  }
  if (dirY < 0) {
    stepY = -1;
    sideDistY = ((startY / CELL_SIZE) - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - (startY / CELL_SIZE)) * deltaDistY;
  }

  let hit = false;
  let side = 0;
  let dist = 0;
  const maxSteps = Math.ceil(maxDist / CELL_SIZE) + 2;
  let steps = 0;

  while (!hit && steps < maxSteps) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (mapX < 0 || mapY < 0 || mapY >= m.grid.length || mapX >= m.grid[0].length) {
      hit = true;
      break;
    }
    if (m.grid[mapY][mapX] === 1) {
      hit = true;
    }
    steps++;
  }

  if (side === 0) {
    dist = (mapX - (startX / CELL_SIZE) + (1 - stepX) / 2) / dirX;
  } else {
    dist = (mapY - (startY / CELL_SIZE) + (1 - stepY) / 2) / dirY;
  }
  dist *= CELL_SIZE;

  return {
    distance: Math.min(dist, maxDist),
    isWall: hit,
    gx: mapX,
    gy: mapY,
    side
  };
}

function isPointInLightCone(px: number, py: number, p: Player): { lit: boolean; intensity: number } {
  const dx = px - p.x;
  const dy = py - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = p.getFlashlightDistance();
  if (dist > maxDist) return { lit: false, intensity: 0 };
  const angleTo = Math.atan2(dy, dx);
  let diff = angleTo - p.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const halfAngle = p.getFlashlightAngle() / 2;
  if (Math.abs(diff) > halfAngle) return { lit: false, intensity: 0 };
  const angleFactor = 1 - Math.abs(diff) / halfAngle;
  const distFactor = 1 - dist / maxDist;
  return { lit: true, intensity: angleFactor * distFactor };
}

function drawMenu(_t: number): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  if (menuButtons.length === 0) {
    const bw = 260;
    const bh = 60;
    const cx = width / 2;
    menuButtons.push({
      x: cx - bw / 2,
      y: height / 2 - 80,
      w: bw,
      h: bh,
      label: '简单迷宫 (11x11)',
      size: 11,
      hover: false,
      onClick: () => startGame(11)
    });
    menuButtons.push({
      x: cx - bw / 2,
      y: height / 2 + 20,
      w: bw,
      h: bh,
      label: '困难迷宫 (21x21)',
      size: 21,
      hover: false,
      onClick: () => startGame(21)
    });
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('迷宫探索', width / 2, height / 2 - 180);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText('WASD 移动  /  鼠标 转向  /  Shift 聚焦手电筒', width / 2, height / 2 - 130);
  ctx.fillText('收集金币  /  避开陷阱  /  找到闪烁的金色出口', width / 2, height / 2 - 100);

  for (const btn of menuButtons) {
    const scale = btn.hover ? 1.1 : 1;
    const bx = btn.x + btn.w / 2;
    const by = btn.y + btn.h / 2;
    const bw = btn.w * scale;
    const bh = btn.h * scale;
    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = btn.hover ? '#16213e' : '#0f3460';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(-bw / 2 + r, -bh / 2);
    ctx.lineTo(bw / 2 - r, -bh / 2);
    ctx.quadraticCurveTo(bw / 2, -bh / 2, bw / 2, -bh / 2 + r);
    ctx.lineTo(bw / 2, bh / 2 - r);
    ctx.quadraticCurveTo(bw / 2, bh / 2, bw / 2 - r, bh / 2);
    ctx.lineTo(-bw / 2 + r, bh / 2);
    ctx.quadraticCurveTo(-bw / 2, bh / 2, -bw / 2, bh / 2 - r);
    ctx.lineTo(-bw / 2, -bh / 2 + r);
    ctx.quadraticCurveTo(-bw / 2, -bh / 2, -bw / 2 + r, -bh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, 0, 0);
    ctx.restore();
  }
}

function drawGame(t: number): void {
  if (!maze || !player) return;

  let sx = 0, sy = 0;
  if (shakeTime > 0) {
    sx = (Math.random() - 0.5) * shakeIntensity;
    sy = (Math.random() - 0.5) * shakeIntensity;
  }

  ctx.save();
  ctx.translate(sx, sy);

  const camX = player.x - width / 2;
  const camY = player.y - height / 2;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  const startCol = Math.max(0, Math.floor(camX / CELL_SIZE) - 1);
  const endCol = Math.min(maze.getGridCols() - 1, Math.ceil((camX + width) / CELL_SIZE) + 1);
  const startRow = Math.max(0, Math.floor(camY / CELL_SIZE) - 1);
  const endRow = Math.min(maze.getGridRows() - 1, Math.ceil((camY + height) / CELL_SIZE) + 1);

  for (let gy = startRow; gy <= endRow; gy++) {
    for (let gx = startCol; gx <= endCol; gx++) {
      const px = gx * CELL_SIZE - camX;
      const py = gy * CELL_SIZE - camY;
      const isWall = maze.grid[gy][gx] === 1;
      const baseColor = isWall ? WALL_COLOR : FLOOR_COLOR;
      const b = maze.getBrightness(gx, gy);
      const r = parseInt(baseColor.slice(1, 3), 16);
      const g = parseInt(baseColor.slice(3, 5), 16);
      const bl = parseInt(baseColor.slice(5, 7), 16);
      ctx.fillStyle = `rgb(${Math.floor(r * b)}, ${Math.floor(g * b)}, ${Math.floor(bl * b)})`;
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
    }
  }

  const exit = maze.getExitPixel();
  const flicker = Math.sin(t / 500) * 0.5 + 0.5;
  const exitPx = exit.x - camX;
  const exitPy = exit.y - camY;
  const exitInLight = isPointInLightCone(exit.x, exit.y, player);
  if (exitInLight.lit || Math.hypot(exit.x - player.x, exit.y - player.y) < CELL_SIZE * 1.5) {
    const alpha = 0.5 + flicker * 0.5;
    const glowRadius = 30 + flicker * 10;
    const grad = ctx.createRadialGradient(exitPx, exitPy, 0, exitPx, exitPy, glowRadius);
    grad.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(exitPx, exitPy, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(exitPx, exitPy, 10 + flicker * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const coin of maze.coins) {
    if (coin.collected) continue;
    const coinInLight = isPointInLightCone(coin.x, coin.y, player);
    if (!coinInLight.lit) continue;
    const cpx = coin.x - camX;
    const cpy = coin.y - camY;
    ctx.fillStyle = `rgba(255, 215, 0, ${coinInLight.intensity})`;
    ctx.beginPath();
    ctx.arc(cpx, cpy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(200, 170, 0, ${coinInLight.intensity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const trap of maze.traps) {
    if (trap.triggered) continue;
    const trapInLight = isPointInLightCone(trap.x, trap.y, player);
    if (!trapInLight.lit) continue;
    const tpx = trap.x - camX;
    const tpy = trap.y - camY;
    ctx.save();
    ctx.translate(tpx, tpy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = `rgba(220, 50, 50, ${trapInLight.intensity})`;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = `rgba(255, 100, 100, ${trapInLight.intensity})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d')!;
  offCtx.fillStyle = 'rgba(0,0,0,1)';
  offCtx.fillRect(0, 0, width, height);

  offCtx.globalCompositeOperation = 'destination-out';

  const coneAngle = player.getFlashlightAngle();
  const coneDist = player.getFlashlightDistance();
  const startAngle = player.angle - coneAngle / 2;
  const cx = player.x - camX;
  const cy = player.y - camY;

  const rays: RayHit[] = [];
  for (let i = 0; i < RAY_COUNT; i++) {
    const a = startAngle + (coneAngle * i) / (RAY_COUNT - 1);
    rays.push(castRay(player.x, player.y, a, coneDist, maze));
  }

  offCtx.beginPath();
  offCtx.moveTo(cx, cy);
  for (let i = 0; i < RAY_COUNT; i++) {
    const a = startAngle + (coneAngle * i) / (RAY_COUNT - 1);
    const r = rays[i];
    const d = Math.min(r.distance, coneDist);
    const ex = cx + Math.cos(a) * d;
    const ey = cy + Math.sin(a) * d;
    offCtx.lineTo(ex, ey);
  }
  offCtx.closePath();

  const lightGrad = offCtx.createRadialGradient(cx, cy, 0, cx, cy, coneDist);
  lightGrad.addColorStop(0, 'rgba(0,0,0,1)');
  lightGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
  offCtx.fillStyle = lightGrad;
  offCtx.fill();
  offCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(offCanvas, 0, 0);

  const ppx = player.x - camX;
  const ppy = player.y - camY;
  ctx.save();
  ctx.translate(ppx, ppy);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();

  if (redFlashTime > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${redFlashTime * 2})`;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const scoreText = `分数: ${score}`;
  ctx.strokeText(scoreText, 20, 20);
  ctx.fillText(scoreText, 20, 20);

  elapsedTime = (performance.now() - gameStartTime) / 1000;
  const mins = Math.floor(elapsedTime / 60);
  const secs = Math.floor(elapsedTime % 60);
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.strokeText(timeStr, width - 20, 20);
  ctx.fillText(timeStr, width - 20, 20);

  if (!mouseLocked) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击屏幕开始控制', width / 2, height / 2);
  }
}

function drawWin(): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('你赢了！', width / 2, height / 2 - 80);

  const mins = Math.floor(elapsedTime / 60);
  const secs = Math.floor(elapsedTime % 60);
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  ctx.font = 'bold 32px monospace';
  ctx.fillText(`用时: ${timeStr}`, width / 2, height / 2);
  ctx.fillText(`分数: ${score}`, width / 2, height / 2 + 50);

  ctx.font = '22px monospace';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText('按任意键返回菜单', width / 2, height / 2 + 120);
}

function checkInteractions(): void {
  if (!maze || !player) return;

  for (const coin of maze.coins) {
    if (coin.collected) continue;
    const d = Math.hypot(player.x - coin.x, player.y - coin.y);
    if (d < player.radius + 6) {
      coin.collected = true;
      score += 10;
      playCoinSound();
    }
  }

  for (const trap of maze.traps) {
    if (trap.triggered) continue;
    const d = Math.hypot(player.x - trap.x, player.y - trap.y);
    if (d < player.radius + 8) {
      trap.triggered = true;
      score = Math.max(0, score - 10);
      redFlashTime = 0.2;
    }
  }

  const exit = maze.getExitPixel();
  const d = Math.hypot(player.x - exit.x, player.y - exit.y);
  if (d < CELL_SIZE * 0.6) {
    gameState = 'win';
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
}

let lastTime = performance.now();
function loop(t: number): void {
  const dt = Math.min((t - lastTime) / 1000, 0.05);
  lastTime = t;

  if (gameState === 'playing' && player && maze) {
    const { collided } = player.update(dt, keys, maze);
    if (collided && shakeTime <= 0) {
      shakeTime = 0.1;
      shakeIntensity = 6;
    }
    if (shakeTime > 0) {
      shakeTime -= dt;
      if (shakeTime < 0) shakeTime = 0;
    }
    if (redFlashTime > 0) {
      redFlashTime -= dt;
      if (redFlashTime < 0) redFlashTime = 0;
    }
    checkInteractions();
    drawGame(t);
  } else if (gameState === 'menu') {
    drawMenu(t);
  } else if (gameState === 'win') {
    drawWin();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
