import {
  GameState,
  PlayerSide,
  GamePhase,
  CellType,
  FogState,
  ButtonDef,
  BOARD_SIZE,
  CELL_SIZE,
  CELL_GAP,
  COLORS,
  SUMMON_ANIM_DURATION,
  VINE_ANIM_DURATION,
  SELECT_HALO_PERIOD,
  MAX_MANA,
} from './types';
import { getButtons } from './gameLogic';

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  dt: number,
  time: number,
  boardOriginX: number,
  boardOriginY: number
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawBackground(ctx, ctx.canvas.width, ctx.canvas.height);
  drawBoard(ctx, state, time, boardOriginX, boardOriginY);
  drawPieces(ctx, state, time, boardOriginX, boardOriginY);
  drawFog(ctx, state, boardOriginX, boardOriginY);
  drawParticles(ctx, state, boardOriginX, boardOriginY);
  drawSummonAnim(ctx, state, boardOriginX, boardOriginY);
  drawVineAnim(ctx, state, time, boardOriginX, boardOriginY);
  drawSelectionHalo(ctx, state, time, boardOriginX, boardOriginY);
  drawRuneBorder(ctx, state, time, boardOriginX, boardOriginY);
  drawUI(ctx, state, time, boardOriginX, boardOriginY);
  drawTurnTransition(ctx, state);
  drawGameOver(ctx, state);
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, COLORS.bg1);
  grad.addColorStop(1, COLORS.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  ox: number,
  oy: number
): void {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = state.board[r][c];
      const x = ox + c * (CELL_SIZE + CELL_GAP);
      const y = oy + r * (CELL_SIZE + CELL_GAP);

      // Cell background
      if (cell.type === CellType.SPIRIT) {
        const pulseT = (Math.sin(cell.pulsePhase) + 1) / 2;
        const brightness = 0.5 + pulseT * 0.5;
        const baseR = 30, baseG = 80, baseB = 45;
        const r2 = Math.floor(baseR * brightness + 20 * brightness);
        const g2 = Math.floor(baseG * brightness + 60 * brightness);
        const b2 = Math.floor(baseB * brightness + 30 * brightness);
        ctx.fillStyle = `rgb(${r2},${g2},${b2})`;

        if (cell.owner !== null) {
          const ownerColor = cell.owner === PlayerSide.GREEN ? [60, 179, 113] : [255, 179, 71];
          const mix = 0.3;
          const mr = Math.floor(r2 * (1 - mix) + ownerColor[0] * mix);
          const mg = Math.floor(g2 * (1 - mix) + ownerColor[1] * mix);
          const mb = Math.floor(b2 * (1 - mix) + ownerColor[2] * mix);
          ctx.fillStyle = `rgb(${mr},${mg},${mb})`;
        }

        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Spirit glow
        const glowAlpha = brightness * 0.3;
        const glow = ctx.createRadialGradient(
          x + CELL_SIZE / 2, y + CELL_SIZE / 2, 0,
          x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2
        );
        glow.addColorStop(0, `rgba(74, 230, 138, ${glowAlpha})`);
        glow.addColorStop(1, `rgba(74, 230, 138, 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Capture progress bar
        if (cell.captureProgress > 0 && cell.owner === null) {
          const progress = cell.captureProgress / 3000;
          ctx.fillStyle = `rgba(74, 230, 138, 0.7)`;
          ctx.fillRect(x + 4, y + CELL_SIZE - 6, (CELL_SIZE - 8) * progress, 3);
        }
      } else if (cell.type === CellType.THORN) {
        ctx.fillStyle = COLORS.thornDark;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        // Thorn pattern
        ctx.strokeStyle = 'rgba(100, 50, 20, 0.6)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const tx = x + 15 + i * 20;
          const ty = y + 20 + i * 10;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + 5, ty - 15);
          ctx.lineTo(tx + 10, ty);
          ctx.stroke();
        }
      } else {
        // Empty
        const grad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
        grad.addColorStop(0, '#0F2A1A');
        grad.addColorStop(1, '#0A1F15');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }

      // Border
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawFog(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  ox: number,
  oy: number
): void {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = state.board[r][c];
      if (cell.fogAlpha <= 0.01) continue;
      const x = ox + c * (CELL_SIZE + CELL_GAP);
      const y = oy + r * (CELL_SIZE + CELL_GAP);
      const cx = x + CELL_SIZE / 2;
      const cy = y + CELL_SIZE / 2;
      const radius = CELL_SIZE * 0.72;

      const fogGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const alpha = cell.fogAlpha;
      fogGrad.addColorStop(0, `rgba(42, 58, 42, ${alpha * 0.6})`);
      fogGrad.addColorStop(0.6, `rgba(30, 45, 30, ${alpha * 0.85})`);
      fogGrad.addColorStop(1, `rgba(26, 42, 26, ${alpha})`);
      ctx.fillStyle = fogGrad;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawPieces(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  ox: number,
  oy: number
): void {
  for (const piece of state.pieces) {
    // Only show enemy pieces if in visible area
    if (piece.side === PlayerSide.AMBER) {
      const cell = state.board[piece.row][piece.col];
      if (cell.fogAlpha > 0.5) continue;
    }

    const x = ox + piece.col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
    const y = oy + piece.row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
    const radius = 25;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.01)';
    ctx.fill();
    ctx.restore();

    // Piece body
    const color = piece.side === PlayerSide.GREEN ? COLORS.green : COLORS.amber;
    const grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, radius);
    grad.addColorStop(0, lightenColor(color, 40));
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, darkenColor(color, 30));
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Glow
    const glowGrad = ctx.createRadialGradient(x, y, radius - 3, x, y, radius + 6);
    const rgb = hexToRgb(color);
    glowGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
    glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
    ctx.beginPath();
    ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Entangled indicator
    if (piece.entangled > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      const dashOffset = (time * 0.003) % 8;
      ctx.lineDashOffset = dashOffset;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#2ECC71';
      ctx.font = 'bold 12px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${piece.entangled}`, x, y);
    }
  }
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  ox: number,
  oy: number
): void {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    const rgb = hexToRgb(p.color);
    ctx.beginPath();
    ctx.arc(ox + p.x, oy + p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.8})`;
    ctx.fill();
  }
}

function drawSummonAnim(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  ox: number,
  oy: number
): void {
  if (!state.summonAnim) return;
  const progress = state.summonAnim.progress / SUMMON_ANIM_DURATION;
  const cx = ox + state.summonAnim.col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  const cy = oy + state.summonAnim.row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  const maxRadius = CELL_SIZE * 0.8;
  const currentRadius = maxRadius * progress;
  const alpha = 1 - progress;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, currentRadius);
  const color = state.currentSide === PlayerSide.GREEN ? COLORS.green : COLORS.amber;
  const rgb = hexToRgb(color);
  grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`);
  grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.2})`);
  grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
  ctx.beginPath();
  ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawVineAnim(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  ox: number,
  oy: number
): void {
  if (!state.vineAnim) return;
  const progress = state.vineAnim.progress / VINE_ANIM_DURATION;
  const cx = ox + state.vineAnim.col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  const cy = oy + state.vineAnim.row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;

  ctx.save();
  ctx.globalAlpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
  ctx.strokeStyle = COLORS.vineGreen;
  ctx.lineWidth = 3;

  const numVines = 5;
  for (let i = 0; i < numVines; i++) {
    const angle = (Math.PI * 2 * i) / numVines + time * 0.002;
    const vineLen = 25 * Math.min(progress * 2, 1);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const cp1x = cx + Math.cos(angle + 0.5) * vineLen * 0.5;
    const cp1y = cy + Math.sin(angle + 0.5) * vineLen * 0.5;
    const endX = cx + Math.cos(angle) * vineLen;
    const endY = cy + Math.sin(angle) * vineLen;
    ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSelectionHalo(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  ox: number,
  oy: number
): void {
  if (state.selectedCell) {
    const x = ox + state.selectedCell.col * (CELL_SIZE + CELL_GAP);
    const y = oy + state.selectedCell.row * (CELL_SIZE + CELL_GAP);
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;
    const angle = (time / SELECT_HALO_PERIOD) * Math.PI * 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;

    const haloRadius = CELL_SIZE / 2 + 4;
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const startAngle = (Math.PI * 2 * i) / segments;
      const endAngle = startAngle + (Math.PI / segments) * 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, haloRadius, startAngle, endAngle);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawRuneBorder(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  ox: number,
  oy: number
): void {
  if (state.phase !== GamePhase.TURN_TRANSITION) return;

  const boardW = BOARD_SIZE * (CELL_SIZE + CELL_GAP);
  const boardH = BOARD_SIZE * (CELL_SIZE + CELL_GAP);
  const cx = ox + boardW / 2;
  const cy = oy + boardH / 2;
  const radius = Math.max(boardW, boardH) / 2 + 15;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.runeAngle);

  const runeCount = 12;
  for (let i = 0; i < runeCount; i++) {
    const angle = (Math.PI * 2 * i) / runeCount;
    const rx = Math.cos(angle) * radius;
    const ry = Math.sin(angle) * radius;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle + Math.PI / 2);

    ctx.strokeStyle = `rgba(168, 230, 207, ${0.3 + Math.sin(time * 0.003 + i) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(0, -12);
    ctx.lineTo(6, -6);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
}

function drawUI(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  ox: number,
  oy: number
): void {
  // Turn counter
  ctx.fillStyle = COLORS.lightGreen;
  ctx.font = '16px "Noto Serif SC", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`回合 ${state.turn} / ${state.maxTurns}`, ox, oy - 30);

  // Current side
  const sideText = state.currentSide === PlayerSide.GREEN ? '翠绿方' : '琥珀方';
  const sideColor = state.currentSide === PlayerSide.GREEN ? COLORS.green : COLORS.amber;
  ctx.fillStyle = sideColor;
  ctx.font = '14px "Noto Serif SC", serif';
  ctx.fillText(sideText, ox + 130, oy - 28);

  // Scores
  ctx.fillStyle = COLORS.green;
  ctx.textAlign = 'right';
  ctx.fillText(`翠绿: ${state.scores[0]}`, ox + BOARD_SIZE * (CELL_SIZE + CELL_GAP), oy - 28);
  ctx.fillStyle = COLORS.amber;
  ctx.fillText(`琥珀: ${state.scores[1]}`, ox + BOARD_SIZE * (CELL_SIZE + CELL_GAP), oy - 12);

  // Mana
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.lightGreen;
  ctx.font = '13px "Noto Serif SC", serif';
  ctx.fillText(`法力: ${state.mana[0]}`, ox, oy - 12);
  for (let i = 0; i < MAX_MANA; i++) {
    const dotX = ox + 50 + i * 14;
    const dotY = oy - 6;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = i < state.mana[0] ? COLORS.lightGreen : 'rgba(168,230,207,0.2)';
    ctx.fill();
  }

  // Turn timer (circular)
  drawTurnTimer(ctx, state, ox, oy);

  // Buttons
  const buttons = getButtons(state, ox, oy);
  for (const btn of buttons) {
    drawButton(ctx, btn, state);
  }
}

function drawTurnTimer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  ox: number,
  oy: number
): void {
  const timerX = ox + BOARD_SIZE * (CELL_SIZE + CELL_GAP) + 40;
  const timerY = oy + 40;
  const timerR = 30;
  const progress = state.turnTimer / 30;

  // Background circle
  ctx.beginPath();
  ctx.arc(timerX, timerY, timerR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 35, 25, 0.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(168, 230, 207, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Progress arc
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * progress;

  const r = Math.floor(60 + 195 * (1 - progress));
  const g = Math.floor(179 * progress);
  const b = Math.floor(113 * progress);
  ctx.beginPath();
  ctx.arc(timerX, timerY, timerR - 4, startAngle, endAngle);
  ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Timer text
  ctx.fillStyle = COLORS.lightGreen;
  ctx.font = 'bold 18px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil(state.turnTimer)}`, timerX, timerY);
}

function drawButton(ctx: CanvasRenderingContext2D, btn: ButtonDef, state: GameState): void {
  const isHovered = state.hoveredButton === btn.action;
  const isClicking = state.buttonClickAnim?.action === btn.action;

  ctx.save();

  let scale = 1;
  if (isClicking && state.buttonClickAnim!) {
    const p = state.buttonClickAnim.progress / 100;
    scale = p < 0.5 ? 1 - 0.05 * (p * 2) : 0.95 + 0.05 * ((p - 0.5) * 2);
  }

  if (isClicking) {
    const centerX = btn.x + btn.w / 2;
    const centerY = btn.y + btn.h / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
  }

  // Button background gradient
  const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
  if (btn.enabled) {
    const brightFactor = isHovered ? 1.2 : 1;
    const r1 = Math.floor(15 * brightFactor);
    const g1 = Math.floor(60 * brightFactor);
    const b1 = Math.floor(30 * brightFactor);
    const r2 = Math.floor(8 * brightFactor);
    const g2 = Math.floor(35 * brightFactor);
    const b2 = Math.floor(18 * brightFactor);
    grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
    grad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
  } else {
    grad.addColorStop(0, '#0A150D');
    grad.addColorStop(1, '#060E08');
  }

  // Rounded rect
  const r = 8;
  ctx.beginPath();
  ctx.moveTo(btn.x + r, btn.y);
  ctx.lineTo(btn.x + btn.w - r, btn.y);
  ctx.quadraticCurveTo(btn.x + btn.w, btn.y, btn.x + btn.w, btn.y + r);
  ctx.lineTo(btn.x + btn.w, btn.y + btn.h - r);
  ctx.quadraticCurveTo(btn.x + btn.w, btn.y + btn.h, btn.x + btn.w - r, btn.y + btn.h);
  ctx.lineTo(btn.x + r, btn.y + btn.h);
  ctx.quadraticCurveTo(btn.x, btn.y + btn.h, btn.x, btn.y + btn.h - r);
  ctx.lineTo(btn.x, btn.y + r);
  ctx.quadraticCurveTo(btn.x, btn.y, btn.x + r, btn.y);
  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = btn.enabled ? 'rgba(168, 230, 207, 0.5)' : 'rgba(168, 230, 207, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Text
  ctx.fillStyle = btn.enabled ? COLORS.lightGreen : 'rgba(168, 230, 207, 0.3)';
  ctx.font = '13px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);

  ctx.restore();
}

function drawTurnTransition(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.phase !== GamePhase.TURN_TRANSITION) return;
  if (state.transitionAlpha <= 0.01) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.globalAlpha = state.transitionAlpha;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, w, h);

  const sideText = state.currentSide === PlayerSide.GREEN ? '翠绿方' : '琥珀方';
  const text = `回合 ${state.turn} - ${sideText}`;

  ctx.fillStyle = COLORS.lightGreen;
  ctx.font = 'bold 36px "Ma Shan Zheng", "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(168, 230, 207, 0.5)';
  ctx.shadowBlur = 20;
  ctx.fillText(text, w / 2, h / 2);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.phase !== GamePhase.GAME_OVER) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, w, h);

  let resultText = '平局';
  if (state.winner === PlayerSide.GREEN) resultText = '翠绿方获胜';
  if (state.winner === PlayerSide.AMBER) resultText = '琥珀方获胜';

  ctx.fillStyle = COLORS.lightGreen;
  ctx.font = 'bold 42px "Ma Shan Zheng", "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(168, 230, 207, 0.6)';
  ctx.shadowBlur = 25;
  ctx.fillText(resultText, w / 2, h / 2 - 30);

  ctx.font = '20px "Noto Serif SC", serif';
  ctx.shadowBlur = 0;
  ctx.fillText(`翠绿 ${state.scores[0]} : ${state.scores[1]} 琥珀`, w / 2, h / 2 + 25);

  ctx.fillStyle = 'rgba(168, 230, 207, 0.6)';
  ctx.font = '16px "Noto Serif SC", serif';
  ctx.fillText('点击任意处重新开始', w / 2, h / 2 + 65);

  ctx.restore();
}

function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const r = Math.min(255, rgb.r + amount);
  const g = Math.min(255, rgb.g + amount);
  const b = Math.min(255, rgb.b + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const r = Math.max(0, rgb.r - amount);
  const g = Math.max(0, rgb.g - amount);
  const b = Math.max(0, rgb.b - amount);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}
