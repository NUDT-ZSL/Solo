import { SceneState, LEVELS } from './scene';

export interface UIButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  action: string;
  isHovered: boolean;
}

export interface UIState {
  buttons: UIButton[];
  levelCompleteAlpha: number;
  allCompleteAlpha: number;
  hintText: string;
}

export function createUIState(): UIState {
  return {
    buttons: [],
    levelCompleteAlpha: 0,
    allCompleteAlpha: 0,
    hintText: '',
  };
}

export function layoutButtons(ui: UIState, canvasW: number): void {
  ui.buttons = [
    {
      x: canvasW - 130,
      y: 12,
      w: 56,
      h: 36,
      label: '⏸',
      action: 'pause',
      isHovered: false,
    },
    {
      x: canvasW - 66,
      y: 12,
      w: 56,
      h: 36,
      label: '↺',
      action: 'reset',
      isHovered: false,
    },
  ];
}

export function updateHint(ui: UIState, state: SceneState): void {
  const level = LEVELS[Math.min(state.currentLevel, LEVELS.length - 1)];
  ui.hintText = level ? level.hint : '';
}

export function drawUI(
  ctx: CanvasRenderingContext2D,
  state: SceneState,
  ui: UIState,
  canvasW: number,
  canvasH: number,
  time: number
): void {
  drawLevelInfo(ctx, state, canvasW);
  drawButtons(ctx, ui, time);
  drawHint(ctx, ui, canvasW, canvasH, time);

  if (state.isLevelComplete) {
    ui.levelCompleteAlpha = Math.min(1, ui.levelCompleteAlpha + 0.03);
    drawLevelComplete(ctx, state, canvasW, canvasH, ui.levelCompleteAlpha);
  } else {
    ui.levelCompleteAlpha = 0;
  }

  if (state.allComplete) {
    ui.allCompleteAlpha = Math.min(1, ui.allCompleteAlpha + 0.03);
    drawAllComplete(ctx, canvasW, canvasH, ui.allCompleteAlpha);
  }
}

function drawLevelInfo(ctx: CanvasRenderingContext2D, state: SceneState, canvasW: number): void {
  ctx.save();

  ctx.fillStyle = 'rgba(10,6,18,0.5)';
  ctx.beginPath();
  const bx = 10, by = 10, bw = 160, bh = 44, br = 10;
  ctx.moveTo(bx + br, by);
  ctx.lineTo(bx + bw - br, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
  ctx.lineTo(bx + bw, by + bh - br);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
  ctx.lineTo(bx + br, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
  ctx.lineTo(bx, by + br);
  ctx.quadraticCurveTo(bx, by, bx + br, by);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(107,90,138,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '14px "Segoe UI", sans-serif';
  ctx.fillStyle = '#b8a0d0';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`关卡 ${state.currentLevel + 1}`, 22, 18);

  ctx.fillStyle = '#8b6fb0';
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.fillText(`摆动: ${state.swingCount}`, 22, 36);

  ctx.restore();
}

function drawButtons(ctx: CanvasRenderingContext2D, ui: UIState, time: number): void {
  ctx.save();

  for (const btn of ui.buttons) {
    ctx.fillStyle = btn.isHovered ? 'rgba(60,40,90,0.7)' : 'rgba(30,20,50,0.6)';
    ctx.strokeStyle = btn.isHovered ? 'rgba(139,111,176,0.6)' : 'rgba(107,90,138,0.4)';
    ctx.lineWidth = 1;

    const br = 8;
    ctx.beginPath();
    ctx.moveTo(btn.x + br, btn.y);
    ctx.lineTo(btn.x + btn.w - br, btn.y);
    ctx.quadraticCurveTo(btn.x + btn.w, btn.y, btn.x + btn.w, btn.y + br);
    ctx.lineTo(btn.x + btn.w, btn.y + btn.h - br);
    ctx.quadraticCurveTo(btn.x + btn.w, btn.y + btn.h, btn.x + btn.w - br, btn.y + btn.h);
    ctx.lineTo(btn.x + br, btn.y + btn.h);
    ctx.quadraticCurveTo(btn.x, btn.y + btn.h, btn.x, btn.y + btn.h - br);
    ctx.lineTo(btn.x, btn.y + br);
    ctx.quadraticCurveTo(btn.x, btn.y, btn.x + br, btn.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = '18px sans-serif';
    ctx.fillStyle = btn.isHovered ? '#e0d0f0' : '#b8a0d0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  }

  ctx.restore();
}

function drawHint(
  ctx: CanvasRenderingContext2D,
  ui: UIState,
  canvasW: number,
  canvasH: number,
  time: number
): void {
  ctx.save();
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  const alpha = 0.3 + Math.sin(time * 0.002) * 0.1;
  ctx.fillStyle = `rgba(139,111,176,${alpha})`;
  ctx.fillText(ui.hintText, canvasW / 2, canvasH - 14);
  ctx.restore();
}

function drawLevelComplete(
  ctx: CanvasRenderingContext2D,
  state: SceneState,
  canvasW: number,
  canvasH: number,
  alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = '#0a0612';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.globalAlpha = alpha;
  ctx.font = '36px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffe8c0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffe8c0';
  ctx.shadowBlur = 20;
  ctx.fillText('关卡完成', canvasW / 2, canvasH / 2 - 20);

  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillStyle = '#b8a0d0';
  ctx.shadowBlur = 0;
  ctx.fillText('点击继续', canvasW / 2, canvasH / 2 + 30);
  ctx.restore();
}

function drawAllComplete(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = '#0a0612';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.globalAlpha = alpha;
  ctx.font = '40px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffd93b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffd93b';
  ctx.shadowBlur = 30;
  ctx.fillText('✦ 通关 ✦', canvasW / 2, canvasH / 2 - 20);

  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillStyle = '#b8a0d0';
  ctx.shadowBlur = 0;
  ctx.fillText('灵摆大师，你解开了所有迷宫', canvasW / 2, canvasH / 2 + 30);
  ctx.restore();
}

export function hitTestButton(ui: UIState, mx: number, my: number): string | null {
  for (const btn of ui.buttons) {
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      return btn.action;
    }
  }
  return null;
}

export function updateButtonHover(ui: UIState, mx: number, my: number): void {
  for (const btn of ui.buttons) {
    btn.isHovered = mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
  }
}
