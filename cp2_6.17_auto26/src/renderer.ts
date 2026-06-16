import { GameState, TILE_SIZE, CANVAS_SIZE, LevelData, coordToKey, TRAP_FLASH_DURATION, GATE_DURATION } from './gameTypes';

let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;
let cachedLevelKey = '';
let cachedGatesKey = '';

const getLevelCacheKey = (level: LevelData, removedGates: Set<string>): string => {
  const gateKey = Array.from(removedGates).sort().join('|');
  const wallsKey = level.walls.map((w) => coordToKey(w)).sort().join(';');
  const trapsKey = level.traps.map((t) => coordToKey(t)).sort().join(';');
  const platesKey = level.pressurePlates.map((p) => coordToKey(p)).sort().join(';');
  return `${level.id}|${wallsKey}|${trapsKey}|${platesKey}|${coordToKey(level.exit)}|${gateKey}`;
};

const ensureOffscreen = () => {
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = CANVAS_SIZE;
    offscreenCanvas.height = CANVAS_SIZE;
    offscreenCtx = offscreenCanvas.getContext('2d');
  }
  return { canvas: offscreenCanvas!, ctx: offscreenCtx! };
};

const drawFloor = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = '#6b7b8d';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
};

const drawWall = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
};

const drawTrap = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#450a0a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const px = x + (i * TILE_SIZE) / steps;
    const py = i % 2 === 0 ? y + 10 : y + 25;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.moveTo(x, y + TILE_SIZE - 10);
  for (let i = 0; i <= steps; i++) {
    const px = x + (i * TILE_SIZE) / steps;
    const py = i % 2 === 0 ? y + TILE_SIZE - 10 : y + TILE_SIZE - 25;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
};

const drawPressurePlate = (ctx: CanvasRenderingContext2D, x: number, y: number, pressed: boolean) => {
  ctx.fillStyle = pressed ? '#0284c7' : '#38bdf8';
  const inset = 12;
  ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
  ctx.strokeStyle = pressed ? '#0369a1' : '#0ea5e9';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, TILE_SIZE - inset * 2 - 1, TILE_SIZE - inset * 2 - 1);
};

const drawExit = (ctx: CanvasRenderingContext2D, x: number, y: number, unlocked: boolean) => {
  ctx.fillStyle = '#6b7b8d';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = unlocked ? '#22c55e' : '#64748b';
  const inset = 10;
  ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, TILE_SIZE - inset * 2 - 1, TILE_SIZE - inset * 2 - 1);
  if (!unlocked) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 20);
    ctx.lineTo(x + TILE_SIZE - 20, y + TILE_SIZE - 20);
    ctx.moveTo(x + TILE_SIZE - 20, y + 20);
    ctx.lineTo(x + 20, y + TILE_SIZE - 20);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 6);
  }
};

const drawStaticLayer = (state: GameState) => {
  const { ctx } = ensureOffscreen();
  const { levelData } = state;

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let gy = 0; gy < levelData.height; gy++) {
    for (let gx = 0; gx < levelData.width; gx++) {
      drawFloor(ctx, gx * TILE_SIZE, gy * TILE_SIZE);
    }
  }

  levelData.walls.forEach((w) => {
    const key = coordToKey(w);
    if (!state.removedGates.has(key)) {
      drawWall(ctx, w.x * TILE_SIZE, w.y * TILE_SIZE);
    }
  });

  levelData.traps.forEach((t) => {
    drawTrap(ctx, t.x * TILE_SIZE, t.y * TILE_SIZE);
  });

  levelData.pressurePlates.forEach((p) => {
    const pressed = isPlatePressed(state, p);
    drawPressurePlate(ctx, p.x * TILE_SIZE, p.y * TILE_SIZE, pressed);
  });

  drawExit(ctx, levelData.exit.x * TILE_SIZE, levelData.exit.y * TILE_SIZE, state.rescuedCount === state.totalCompanions);
};

const isPlatePressed = (state: GameState, plate: { x: number; y: number }): boolean => {
  if (state.player.coord.x === plate.x && state.player.coord.y === plate.y) return true;
  return state.rocks.some((r) => r.coord.x === plate.x && r.coord.y === plate.y);
};

const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.arc(cx, cy, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 8, cy - 4, 3, 0, Math.PI * 2);
  ctx.arc(cx + 8, cy - 4, 3, 0, Math.PI * 2);
  ctx.fill();
};

const drawRock = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const inset = 10;
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, TILE_SIZE - inset * 2 - 1, TILE_SIZE - inset * 2 - 1);
  ctx.strokeStyle = '#5c3b1e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + inset + 10, y + inset + 10);
  ctx.lineTo(x + inset + 25, y + inset + 35);
  ctx.moveTo(x + inset + 35, y + inset + 8);
  ctx.lineTo(x + inset + 45, y + inset + 40);
  ctx.moveTo(x + inset + 15, y + inset + 45);
  ctx.lineTo(x + inset + 40, y + inset + 50);
  ctx.stroke();
};

const drawCompanion = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 6, cy - 5, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 6, cy - 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 5, 0, Math.PI, true);
  ctx.stroke();
};

export const render = (ctx: CanvasRenderingContext2D, state: GameState, now: number) => {
  const levelKey = getLevelCacheKey(state.levelData, state.removedGates);
  const gatesKey = levelKey;

  if (levelKey !== cachedLevelKey || gatesKey !== cachedGatesKey) {
    drawStaticLayer(state);
    cachedLevelKey = levelKey;
    cachedGatesKey = gatesKey;
  }

  ctx.drawImage(offscreenCanvas!, 0, 0);

  state.rocks.forEach((r) => {
    drawRock(ctx, r.coord.x * TILE_SIZE, r.coord.y * TILE_SIZE);
  });

  state.companions.forEach((c) => {
    if (!c.rescued) {
      drawCompanion(ctx, c.coord.x * TILE_SIZE, c.coord.y * TILE_SIZE);
    }
  });

  drawPlayer(ctx, state.player.coord.x * TILE_SIZE, state.player.coord.y * TILE_SIZE);

  if (state.isFailed) {
    const elapsed = now - state.trapFlashStart;
    if (elapsed < TRAP_FLASH_DURATION) {
      const alpha = 0.3 + 0.3 * Math.abs(Math.sin(elapsed / 50));
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
  }

  state.gateTimers.forEach((gt) => {
    const elapsed = now - gt.startTime;
    const remaining = Math.max(0, GATE_DURATION - elapsed);
    if (remaining > 0 && remaining < 300) {
      const flash = Math.abs(Math.sin(remaining / 30));
      gt.gateCoords.forEach((gc) => {
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 + flash * 0.5})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(gc.x * TILE_SIZE + 2, gc.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.setLineDash([]);
      });
    }
  });
};

export const invalidateStaticCache = () => {
  cachedLevelKey = '';
  cachedGatesKey = '';
};
