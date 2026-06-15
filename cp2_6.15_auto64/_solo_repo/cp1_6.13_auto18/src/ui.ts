import { PlayerStatusData } from './player';
import { IMaze } from './maze';

export interface UIState {
  status: PlayerStatusData;
  totalFragments: number;
  paused: boolean;
  showVictory: boolean;
  victoryTime: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function createInitialUIState(canvasWidth: number, canvasHeight: number, totalFragments: number): UIState {
  return {
    status: {
      pulseCount: 0,
      stepCount: 0,
      fragmentCount: 0,
    },
    totalFragments,
    paused: false,
    showVictory: false,
    victoryTime: 0,
    canvasWidth,
    canvasHeight,
  };
}

export function updateUIStateSize(state: UIState, width: number, height: number): UIState {
  return { ...state, canvasWidth: width, canvasHeight: height };
}

export function updateUIStatus(state: UIState, status: PlayerStatusData): UIState {
  return { ...state, status: { ...status } };
}

export function updateUIFragments(state: UIState, count: number, total: number): UIState {
  return {
    ...state,
    status: { ...state.status, fragmentCount: count },
    totalFragments: total,
  };
}

export function togglePause(state: UIState): UIState {
  if (state.showVictory) return state;
  return { ...state, paused: !state.paused };
}

export function triggerVictory(state: UIState, now: number): UIState {
  return { ...state, showVictory: true, victoryTime: now };
}

export function resetUIState(state: UIState, totalFragments: number): UIState {
  return {
    ...state,
    status: { pulseCount: 0, stepCount: 0, fragmentCount: 0 },
    totalFragments,
    paused: false,
    showVictory: false,
    victoryTime: 0,
  };
}

export function drawStatusPanel(ctx: CanvasRenderingContext2D, state: UIState): void {
  const panelX = 16;
  const panelY = 16;
  const panelW = 180;
  const panelH = 100;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(panelX, panelY, panelW, panelH, 12);
  } else {
    roundRectFallback(ctx, panelX, panelY, panelW, panelH, 12);
  }
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillText(`Pulses: ${state.status.pulseCount}`, panelX + 14, panelY + 26);
  ctx.fillText(`Steps: ${state.status.stepCount}`, panelX + 14, panelY + 48);
  ctx.fillText(`Fragments: ${state.status.fragmentCount}/${state.totalFragments}`, panelX + 14, panelY + 70);

  const fragBarW = 140;
  const fragBarH = 4;
  const fragBarX = panelX + 14;
  const fragBarY = panelY + 80;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(fragBarX, fragBarY, fragBarW, fragBarH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const ratio = state.totalFragments > 0 ? state.status.fragmentCount / state.totalFragments : 0;
  ctx.fillRect(fragBarX, fragBarY, fragBarW * Math.min(1, ratio), fragBarH);
}

export function drawButtons(
  ctx: CanvasRenderingContext2D,
  state: UIState,
  mouseX: number,
  mouseY: number
): { pauseHover: boolean; resetHover: boolean } {
  const btnSize = 40;
  const padding = 16;
  const pauseX = state.canvasWidth - btnSize * 2 - padding * 2;
  const resetX = state.canvasWidth - btnSize - padding;
  const btnY = padding;

  const pauseHover = isInRect(mouseX, mouseY, pauseX, btnY, btnSize, btnSize);
  const resetHover = isInRect(mouseX, mouseY, resetX, btnY, btnSize, btnSize);

  drawCircleButton(ctx, pauseX, btnY, btnSize, state.paused ? '▶' : '⏸', pauseHover);
  drawCircleButton(ctx, resetX, btnY, btnSize, '↺', resetHover);

  return { pauseHover, resetHover };
}

export function isPauseButtonClicked(state: UIState, x: number, y: number): boolean {
  const btnSize = 40;
  const padding = 16;
  const pauseX = state.canvasWidth - btnSize * 2 - padding * 2;
  const btnY = padding;
  return isInRect(x, y, pauseX, btnY, btnSize, btnSize);
}

export function isResetButtonClicked(state: UIState, x: number, y: number): boolean {
  const btnSize = 40;
  const padding = 16;
  const resetX = state.canvasWidth - btnSize - padding;
  const btnY = padding;
  return isInRect(x, y, resetX, btnY, btnSize, btnSize);
}

function drawCircleButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  label: string, hover: boolean
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  ctx.save();
  if (hover) {
    ctx.translate(cx, cy);
    ctx.scale(1.1, 1.1);
    ctx.translate(-cx, -cy);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hover ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);

  ctx.restore();
}

export function drawExit(ctx: CanvasRenderingContext2D, maze: IMaze, now: number): void {
  const elapsed = now % 1000;
  const phase = elapsed / 500;
  const alpha = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);

  ctx.beginPath();
  ctx.arc(maze.exitX, maze.exitY, maze.exitRadius + 8, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.15})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(maze.exitX, maze.exitY, maze.exitRadius + 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.3})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(maze.exitX, maze.exitY, maze.exitRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.85})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(maze.exitX, maze.exitY, maze.exitRadius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 210, ${alpha})`;
  ctx.fill();
}

export function drawFragments(ctx: CanvasRenderingContext2D, maze: IMaze, now: number): void {
  for (const frag of maze.fragments) {
    if (frag.collected) continue;

    const pulse = 0.5 + 0.5 * Math.sin(now / 400 + frag.x * 0.07 + frag.y * 0.05);
    const baseR = frag.radius;
    const size = baseR + pulse * 2;

    ctx.beginPath();
    ctx.arc(frag.x, frag.y, size + 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 220, 255, ${pulse * 0.1})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(frag.x, frag.y, size + 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 220, 255, ${pulse * 0.2})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(frag.x, frag.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180, 210, 255, ${0.5 + pulse * 0.3})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(frag.x, frag.y, size * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + pulse * 0.3})`;
    ctx.fill();
  }
}

export function drawMazeWalls(ctx: CanvasRenderingContext2D, maze: IMaze): void {
  const segments = maze.getWalls();
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 2;
  ctx.lineCap = 'butt';

  ctx.beginPath();
  for (const seg of segments) {
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
  }
  ctx.stroke();
}

export function drawPauseOverlay(ctx: CanvasRenderingContext2D, state: UIState): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', state.canvasWidth / 2, state.canvasHeight / 2);

  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('Press P or click ▶ to resume', state.canvasWidth / 2, state.canvasHeight / 2 + 40);
}

export function drawVictory(ctx: CanvasRenderingContext2D, state: UIState, now: number): void {
  const elapsed = now - state.victoryTime;
  const fadeIn = Math.min(elapsed / 1000, 1);

  ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * fadeIn})`;
  ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

  ctx.fillStyle = `rgba(255, 215, 0, ${fadeIn})`;
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ECHO FOUND', state.canvasWidth / 2, state.canvasHeight / 2 - 30);

  ctx.fillStyle = `rgba(255, 255, 255, ${fadeIn * 0.85})`;
  ctx.font = '16px monospace';
  ctx.fillText(
    `Pulses: ${state.status.pulseCount}  Steps: ${state.status.stepCount}  Fragments: ${state.status.fragmentCount}/${state.totalFragments}`,
    state.canvasWidth / 2, state.canvasHeight / 2 + 20
  );

  ctx.font = '14px monospace';
  ctx.fillStyle = `rgba(255, 255, 255, ${fadeIn * 0.55})`;
  ctx.fillText('Press R to play again', state.canvasWidth / 2, state.canvasHeight / 2 + 55);
}

export function drawInstructions(ctx: CanvasRenderingContext2D, state: UIState, now: number): void {
  const alpha = 0.4 + 0.2 * Math.sin(now / 800);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    'Arrow Keys / WASD: Move  |  Space: Emit Pulse  |  P: Pause  |  R: Reset',
    state.canvasWidth / 2, state.canvasHeight - 20
  );
}

function isInRect(mx: number, my: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return mx >= rx && mx <= rx + rw && my >= ry && my <= ry + rh;
}

function roundRectFallback(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}
