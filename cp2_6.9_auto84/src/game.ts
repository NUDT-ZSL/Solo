export interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  color: string;
  visited: boolean;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number; alpha: number }[];
}

export interface Target {
  x: number;
  y: number;
  radius: number;
  color1: string;
  color2: string;
  collected: boolean;
  scale: number;
  pulsePhase: number;
}

export interface CollisionFlash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  trail: { x: number; y: number }[];
}

export interface MazeTransform {
  rotation: number;
  mirrorX: boolean;
  mirrorY: boolean;
  targetRotation: number;
  targetMirrorX: boolean;
  targetMirrorY: boolean;
  animProgress: number;
  animating: boolean;
  animStartTime: number;
}

export interface GameState {
  cols: number;
  rows: number;
  cellSize: number;
  gap: number;
  maze: Cell[][];
  ball: Ball;
  targets: Target[];
  gravityX: number;
  gravityY: number;
  maxAcceleration: number;
  collected: number;
  totalTargets: number;
  startTime: number;
  elapsedTime: number;
  collisionFlashes: CollisionFlash[];
  particles: Particle[];
  victory: boolean;
  mazeTransform: MazeTransform;
  lastTransformTime: number;
  mazeOriginX: number;
  mazeOriginY: number;
}

const COLORS = ['#4a00e0', '#5a10e4', '#6a20e8', '#7a30ec', '#8e2de2', '#6e1ed8', '#5e0ece'];
const TARGET_COLORS_1 = ['#00ff88', '#00e0a0', '#00c8b8', '#00b0d0'];
const TARGET_COLORS_2 = ['#00b0d0', '#00c8b8', '#00e0a0', '#00ff88'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMaze(cols: number, rows: number): Cell[][] {
  const maze: Cell[][] = [];
  for (let y = 0; y < rows; y++) {
    maze[y] = [];
    for (let x = 0; x < cols; x++) {
      maze[y][x] = {
        x,
        y,
        walls: { top: true, right: true, bottom: true, left: true },
        color: pickRandom(COLORS),
        visited: false
      };
    }
  }

  const stack: Cell[] = [];
  const start = maze[0][0];
  start.visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { cell: Cell; dx: number; dy: number }[] = [];

    if (current.x > 0 && !maze[current.y][current.x - 1].visited) {
      neighbors.push({ cell: maze[current.y][current.x - 1], dx: -1, dy: 0 });
    }
    if (current.x < cols - 1 && !maze[current.y][current.x + 1].visited) {
      neighbors.push({ cell: maze[current.y][current.x + 1], dx: 1, dy: 0 });
    }
    if (current.y > 0 && !maze[current.y - 1][current.x].visited) {
      neighbors.push({ cell: maze[current.y - 1][current.x], dx: 0, dy: -1 });
    }
    if (current.y < rows - 1 && !maze[current.y + 1][current.x].visited) {
      neighbors.push({ cell: maze[current.y + 1][current.x], dx: 0, dy: 1 });
    }

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      if (next.dx === 1) {
        current.walls.right = false;
        next.cell.walls.left = false;
      } else if (next.dx === -1) {
        current.walls.left = false;
        next.cell.walls.right = false;
      } else if (next.dy === 1) {
        current.walls.bottom = false;
        next.cell.walls.top = false;
      } else if (next.dy === -1) {
        current.walls.top = false;
        next.cell.walls.bottom = false;
      }
      next.cell.visited = true;
      stack.push(next.cell);
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      maze[y][x].color = pickRandom(COLORS);
    }
  }

  return maze;
}

function generateTargets(cols: number, rows: number, cellSize: number, gap: number, originX: number, originY: number): Target[] {
  const positions = [
    { cx: 0, cy: 0 },
    { cx: cols - 1, cy: 0 },
    { cx: 0, cy: rows - 1 },
    { cx: cols - 1, cy: rows - 1 }
  ];

  return positions.map((pos, i) => {
    const px = originX + pos.cx * (cellSize + gap) + cellSize / 2;
    const py = originY + pos.cy * (cellSize + gap) + cellSize / 2;
    return {
      x: px,
      y: py,
      radius: 12.5,
      color1: TARGET_COLORS_1[i],
      color2: TARGET_COLORS_2[i],
      collected: false,
      scale: 1,
      pulsePhase: Math.random() * Math.PI * 2
    };
  });
}

export function createGame(cols: number, rows: number, cellSize: number, gap: number): GameState {
  const maze = generateMaze(cols, rows);
  const originX = 0;
  const originY = 0;
  const targets = generateTargets(cols, rows, cellSize, gap, originX, originY);

  const ballStartX = originX + Math.floor(cols / 2) * (cellSize + gap) + cellSize / 2;
  const ballStartY = originY + Math.floor(rows / 2) * (cellSize + gap) + cellSize / 2;

  return {
    cols,
    rows,
    cellSize,
    gap,
    maze,
    ball: {
      x: ballStartX,
      y: ballStartY,
      vx: 0,
      vy: 0,
      radius: 10,
      trail: []
    },
    targets,
    gravityX: 0,
    gravityY: 0,
    maxAcceleration: 800,
    collected: 0,
    totalTargets: 4,
    startTime: performance.now(),
    elapsedTime: 0,
    collisionFlashes: [],
    particles: [],
    victory: false,
    mazeTransform: {
      rotation: 0,
      mirrorX: false,
      mirrorY: false,
      targetRotation: 0,
      targetMirrorX: false,
      targetMirrorY: false,
      animProgress: 1,
      animating: false,
      animStartTime: 0
    },
    lastTransformTime: performance.now(),
    mazeOriginX: originX,
    mazeOriginY: originY
  };
}

export function resetGame(game: GameState): void {
  const newMaze = generateMaze(game.cols, game.rows);
  game.maze = newMaze;
  game.targets = generateTargets(game.cols, game.rows, game.cellSize, game.gap, game.mazeOriginX, game.mazeOriginY);
  game.ball.x = game.mazeOriginX + Math.floor(game.cols / 2) * (game.cellSize + game.gap) + game.cellSize / 2;
  game.ball.y = game.mazeOriginY + Math.floor(game.rows / 2) * (game.cellSize + game.gap) + game.cellSize / 2;
  game.ball.vx = 0;
  game.ball.vy = 0;
  game.ball.trail = [];
  game.collected = 0;
  game.startTime = performance.now();
  game.elapsedTime = 0;
  game.collisionFlashes = [];
  game.particles = [];
  game.victory = false;
  game.lastTransformTime = performance.now();
  game.mazeTransform = {
    rotation: 0,
    mirrorX: false,
    mirrorY: false,
    targetRotation: 0,
    targetMirrorX: false,
    targetMirrorY: false,
    animProgress: 1,
    animating: false,
    animStartTime: 0
  };
}

export function setGravity(game: GameState, gx: number, gy: number): void {
  const len = Math.sqrt(gx * gx + gy * gy);
  if (len > 0) {
    const clamped = Math.min(len, game.maxAcceleration);
    game.gravityX = (gx / len) * clamped;
    game.gravityY = (gy / len) * clamped;
  } else {
    game.gravityX = 0;
    game.gravityY = 0;
  }
}

function easeOutElastic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
}

function getMazeCenter(game: GameState): { x: number; y: number } {
  const mazeWidth = game.cols * (game.cellSize + game.gap) - game.gap;
  const mazeHeight = game.rows * (game.cellSize + game.gap) - game.gap;
  return {
    x: game.mazeOriginX + mazeWidth / 2,
    y: game.mazeOriginY + mazeHeight / 2
  };
}

export function getCurrentTransform(game: GameState, now: number): { rotation: number; mirrorX: boolean; mirrorY: boolean } {
  const t = game.mazeTransform;
  if (!t.animating) {
    return { rotation: t.rotation, mirrorX: t.mirrorX, mirrorY: t.mirrorY };
  }
  const progress = Math.min(1, (now - t.animStartTime) / 500);
  const eased = easeOutElastic(progress);
  const rotation = t.rotation + (t.targetRotation - t.rotation) * eased;
  const mirrorX = eased > 0.5 ? t.targetMirrorX : t.mirrorX;
  const mirrorY = eased > 0.5 ? t.targetMirrorY : t.mirrorY;
  return { rotation, mirrorX, mirrorY };
}

function transformPoint(
  px: number, py: number,
  cx: number, cy: number,
  rotation: number,
  mirrorX: boolean, mirrorY: boolean
): { x: number; y: number } {
  let x = px - cx;
  let y = py - cy;
  if (mirrorX) x = -x;
  if (mirrorY) y = -y;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;
  return { x: rx + cx, y: ry + cy };
}

function getCellWallsTransformed(
  game: GameState,
  cellX: number, cellY: number,
  transform: { rotation: number; mirrorX: boolean; mirrorY: boolean }
): { x1: number; y1: number; x2: number; y2: number }[] {
  const walls: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const cell = game.maze[cellY][cellX];
  const px = game.mazeOriginX + cellX * (game.cellSize + game.gap);
  const py = game.mazeOriginY + cellY * (game.cellSize + game.gap);
  const cs = game.cellSize;

  const center = getMazeCenter(game);

  const addWall = (sx: number, sy: number, ex: number, ey: number) => {
    const p1 = transformPoint(sx, sy, center.x, center.y, transform.rotation, transform.mirrorX, transform.mirrorY);
    const p2 = transformPoint(ex, ey, center.x, center.y, transform.rotation, transform.mirrorX, transform.mirrorY);
    walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
  };

  if (cell.walls.top) addWall(px, py, px + cs, py);
  if (cell.walls.right) addWall(px + cs, py, px + cs, py + cs);
  if (cell.walls.bottom) addWall(px, py + cs, px + cs, py + cs);
  if (cell.walls.left) addWall(px, py, px, py + cs);

  return walls;
}

function getAllWallsTransformed(
  game: GameState,
  transform: { rotation: number; mirrorX: boolean; mirrorY: boolean }
): { x1: number; y1: number; x2: number; y2: number }[] {
  const all: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let y = 0; y < game.rows; y++) {
    for (let x = 0; x < game.cols; x++) {
      all.push(...getCellWallsTransformed(game, x, y, transform));
    }
  }
  return all;
}

function pointToSegmentDistance(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number
): { dist: number; closestX: number; closestY: number; normalX: number; normalY: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const distX = px - closestX;
  const distY = py - closestY;
  const dist = Math.sqrt(distX * distX + distY * distY);
  let nx = 0, ny = -1;
  if (dist > 0.0001) {
    nx = distX / dist;
    ny = distY / dist;
  }
  return { dist, closestX, closestY, normalX: nx, normalY: ny };
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

export function playDingSound(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

function createVictoryParticles(game: GameState): void {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'];
  const center = getMazeCenter(game);
  for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 300;
    game.particles.push({
      x: center.x,
      y: center.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      size: 2 + Math.random() * 4,
      trail: []
    });
  }
}

export function updateGame(game: GameState, dt: number, now: number): void {
  game.elapsedTime = (now - game.startTime) / 1000;

  const t = game.mazeTransform;
  if (t.animating) {
    const progress = Math.min(1, (now - t.animStartTime) / 500);
    t.animProgress = progress;
    if (progress >= 1) {
      t.animating = false;
      t.animProgress = 1;
      t.rotation = t.targetRotation;
      t.mirrorX = t.targetMirrorX;
      t.mirrorY = t.targetMirrorY;
    }
  }

  if (!t.animating && now - game.lastTransformTime > 3000) {
    const choices = [
      { rotation: Math.PI / 2, mirrorX: false, mirrorY: false },
      { rotation: Math.PI, mirrorX: false, mirrorY: false },
      { rotation: -Math.PI / 2, mirrorX: false, mirrorY: false },
      { rotation: 0, mirrorX: true, mirrorY: false },
      { rotation: 0, mirrorX: false, mirrorY: true }
    ];
    const choice = choices[Math.floor(Math.random() * choices.length)];
    t.targetRotation = t.rotation + choice.rotation;
    t.targetMirrorX = choice.mirrorX ? !t.mirrorX : t.mirrorX;
    t.targetMirrorY = choice.mirrorY ? !t.mirrorY : t.mirrorY;
    t.animating = true;
    t.animProgress = 0;
    t.animStartTime = now;
    game.lastTransformTime = now;
  }

  const currentTransform = getCurrentTransform(game, now);

  if (!game.victory) {
    const ball = game.ball;
    ball.vx += game.gravityX * dt;
    ball.vy += game.gravityY * dt;

    const maxSpeed = 500;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed;
      ball.vy = (ball.vy / speed) * maxSpeed;
    }

    ball.vx *= 0.995;
    ball.vy *= 0.995;

    const steps = 4;
    const subDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;

      const walls = getAllWallsTransformed(game, currentTransform);
      for (const wall of walls) {
        const result = pointToSegmentDistance(ball.x, ball.y, wall.x1, wall.y1, wall.x2, wall.y2);
        if (result.dist < ball.radius) {
          const overlap = ball.radius - result.dist;
          ball.x += result.normalX * overlap;
          ball.y += result.normalY * overlap;

          const dot = ball.vx * result.normalX + ball.vy * result.normalY;
          if (dot < 0) {
            ball.vx -= 1.7 * dot * result.normalX;
            ball.vy -= 1.7 * dot * result.normalY;
          }

          game.collisionFlashes.push({
            x: result.closestX,
            y: result.closestY,
            radius: 0,
            maxRadius: 40,
            alpha: 1,
            startTime: now
          });
        }
      }
    }

    ball.trail.unshift({ x: ball.x, y: ball.y, alpha: 1 });
    if (ball.trail.length > 40) {
      ball.trail.pop();
    }
    for (let i = 0; i < ball.trail.length; i++) {
      ball.trail[i].alpha = Math.max(0, 1 - i * 0.05);
    }
    ball.trail = ball.trail.filter(p => p.alpha > 0.01);

    const center = getMazeCenter(game);
    for (const target of game.targets) {
      if (!target.collected) {
        const tp = transformPoint(target.x, target.y, center.x, center.y, currentTransform.rotation, currentTransform.mirrorX, currentTransform.mirrorY);
        const dx = ball.x - tp.x;
        const dy = ball.y - tp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ball.radius + target.radius) {
          target.collected = true;
          game.collected++;
          playDingSound();

          if (game.collected >= game.totalTargets) {
            game.victory = true;
            createVictoryParticles(game);
            setTimeout(() => {
              resetGame(game);
            }, 2500);
          }
        }
      }
      target.pulsePhase += dt * 3;
      if (target.collected) {
        target.scale = Math.max(0, target.scale - dt * 3);
      }
    }
  }

  game.collisionFlashes = game.collisionFlashes.filter(f => {
    const elapsed = (now - f.startTime) / 1000;
    f.radius = f.maxRadius * Math.min(1, elapsed / 0.3);
    f.alpha = Math.max(0, 1 - elapsed / 0.3);
    return f.alpha > 0;
  });

  game.particles = game.particles.filter(p => {
    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > 15) p.trail.pop();

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 200 * dt;
    p.alpha -= dt / 2;
    return p.alpha > 0;
  });
}

export function getTargetPrimaryColor(game: GameState): string {
  for (const t of game.targets) {
    if (!t.collected) return t.color1;
  }
  return '#00ff88';
}

export function getMazeTotalSize(game: GameState): { width: number; height: number } {
  return {
    width: game.cols * (game.cellSize + game.gap) - game.gap,
    height: game.rows * (game.cellSize + game.gap) - game.gap
  };
}
