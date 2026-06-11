import { GameBoard } from './gameBoard';
import { validate, calculateScore } from './wordValidator';
import {
  loadProgress,
  saveProgress,
  getLevelById,
  getCompletionPercent,
  addFoundWord,
  getLevelFoundWords,
  isCompleted,
  getLevels,
  TIME_LIMIT,
  type GameProgress
} from './levelManager';

interface UIState {
  score: number;
  timeLeft: number;
  paused: boolean;
  showLevelSelect: boolean;
  showResult: boolean;
  resultType: 'win' | 'timeout' | null;
  toast: { text: string; color: string; startTime: number } | null;
}

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const loading = document.getElementById('loading');

if (!canvas) {
  throw new Error('Canvas element not found');
}

const board = new GameBoard(canvas);
let progress: GameProgress = loadProgress();
let currentLevelId = progress.unlockedLevel;
let currentLevel = getLevelById(currentLevelId) || getLevelById(1)!;

const state: UIState = {
  score: progress.totalScore,
  timeLeft: TIME_LIMIT,
  paused: false,
  showLevelSelect: false,
  showResult: false,
  resultType: null,
  toast: null
};

let lastTimestamp = 0;
let levelScore = 0;

board.reset(currentLevel.letters);
board.setOnWordSubmit((word: string) => {
  const upper = word.toUpperCase();
  const found = getLevelFoundWords(currentLevelId, progress);
  const isTarget = currentLevel.targetWords.includes(upper);
  const isValid = validate(upper);

  if (isValid && !found.includes(upper)) {
    const points = calculateScore(upper) * (isTarget ? 2 : 1);
    levelScore += points;
    state.score += points;
    progress.totalScore = state.score;
    progress = addFoundWord(currentLevelId, upper, progress);
    saveProgress(progress);

    showToast(`+${points}  ${upper}`, isTarget ? '#ffd700' : '#4fc3f7');

    const completion = getCompletionPercent(currentLevelId, progress);
    if (completion >= 80 && !state.showResult) {
      state.showResult = true;
      state.resultType = 'win';
    }
    return { valid: true, score: points };
  }
  return { valid: false, score: 0 };
});

function showToast(text: string, color: string): void {
  state.toast = { text, color, startTime: performance.now() };
}

function drawUI(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const isMobile = w < 768;

  if (isMobile) drawMobileUI(ctx, w, h, time);
  else drawDesktopUI(ctx, w, h, time);

  if (state.toast) drawToast(ctx, w, h, time);
  if (state.showResult) drawResultOverlay(ctx, w, h, time);
  if (state.showLevelSelect) drawLevelSelect(ctx, w, h, time);
  if (state.paused && !state.showResult && !state.showLevelSelect) drawPauseOverlay(ctx, w, h, time);
}

function drawDesktopUI(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const panelW = Math.min(280, w * 0.22);
  const padding = 24;

  drawLeftPanel(ctx, padding, 80, panelW, h - 120, time);
  drawRightPanel(ctx, w - panelW - padding, 80, panelW, h - 120, time);
  drawTopBar(ctx, w, h, time);
}

function drawMobileUI(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const padding = 16;
  const topBarH = 56;

  drawMobileTopBar(ctx, padding, 16, w - padding * 2, topBarH, time);

  const infoY = topBarH + 36;
  const infoH = Math.min(110, h * 0.16);
  drawMobileInfo(ctx, padding, infoY, w - padding * 2, infoH, time);

  const boardBounds = board.getBoardBounds();
  const listY = boardBounds.y + boardBounds.height + 16;
  const listH = h - listY - padding;
  drawMobileWordsList(ctx, padding, listY, w - padding * 2, listH, time);
}

function drawTopBar(ctx: CanvasRenderingContext2D, w: number, _h: number, time: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 22, 60, 0.6)';
  ctx.fillRect(0, 0, w, 64);
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(w, 64);
  ctx.stroke();

  drawPauseButton(ctx, 24, 16, 32, 32, time);

  drawLevelsButton(ctx, 72, 16, 32, 32, time);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 22px 'Orbitron', sans-serif`;
  ctx.shadowColor = 'rgba(79, 195, 247, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText(`★ PuzzlePhrase  ·  ${currentLevel.theme}`, w / 2, 32);
  ctx.shadowBlur = 0;

  drawScoreBadge(ctx, w - 200, 14, 180, 36, time);
  ctx.restore();
}

function drawMobileTopBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number): void {
  ctx.save();
  drawPauseButton(ctx, x, y, h, h, time);
  drawLevelsButton(ctx, x + h + 10, y, h, h, time);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(h * 0.46)}px 'Orbitron', sans-serif`;
  ctx.shadowColor = 'rgba(79, 195, 247, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText('★ PuzzlePhrase', x + w / 2 + h / 2, y + h / 2);
  ctx.shadowBlur = 0;

  ctx.font = `600 ${Math.floor(h * 0.3)}px 'Nunito', sans-serif`;
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText(currentLevel.theme, x + w / 2 + h / 2, y + h + 16);
  ctx.restore();
}

function drawPauseButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, _time: number): void {
  ctx.save();
  const isHit = isHitPause();
  const hover = isHit;
  ctx.fillStyle = hover ? 'rgba(79, 195, 247, 0.3)' : 'rgba(79, 195, 247, 0.15)';
  ctx.strokeStyle = hover ? 'rgba(79, 195, 247, 0.8)' : 'rgba(79, 195, 247, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, h * 0.25);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  if (state.paused || state.showResult) {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.35, y + h * 0.25);
    ctx.lineTo(x + w * 0.35, y + h * 0.75);
    ctx.lineTo(x + w * 0.8, y + h * 0.5);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(x + w * 0.3, y + h * 0.25, w * 0.15, h * 0.5);
    ctx.fillRect(x + w * 0.55, y + h * 0.25, w * 0.15, h * 0.5);
  }
  ctx.restore();
}

function drawLevelsButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, _time: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, h * 0.25);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffd700';
  ctx.font = `bold ${Math.floor(h * 0.5)}px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('≡', x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawScoreBadge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number): void {
  ctx.save();
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.003);
  ctx.shadowColor = `rgba(255, 215, 0, ${0.3 + 0.2 * pulse})`;
  ctx.shadowBlur = 15;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(255, 215, 0, 0.25)');
  grad.addColorStop(1, 'rgba(255, 180, 0, 0.15)');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, h * 0.5);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold 14px 'Nunito', sans-serif`;
  ctx.fillText('SCORE', x + 16, y + h / 2 - 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 20px 'Orbitron', sans-serif`;
  ctx.fillText(String(state.score), x + w - 16, y + h / 2 + 1);
  ctx.restore();
}

function drawLeftPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number): void {
  ctx.save();
  panelBg(ctx, x, y, w, h);

  let cy = y + 24;
  const sectionTitle = (txt: string) => {
    ctx.fillStyle = '#8ea5ff';
    ctx.font = `bold 13px 'Nunito', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '1.5px';
    ctx.fillText(txt, x + 24, cy);
    cy += 24;
  };

  sectionTitle('当前分数');
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 40px 'Orbitron', sans-serif`;
  ctx.fillText(String(state.score), x + 24, cy);
  ctx.fillStyle = '#4fc3f7';
  ctx.font = `600 13px 'Nunito', sans-serif`;
  ctx.fillText(`本关 +${levelScore}`, x + 24, cy + 46);
  cy += 76;

  sectionTitle('关卡进度');
  drawProgressBar(ctx, x + 24, cy, w - 48, 14, time);
  cy += 32;
  const found = getLevelFoundWords(currentLevelId, progress);
  ctx.fillStyle = '#cfd8ff';
  ctx.font = `600 13px 'Nunito', sans-serif`;
  ctx.fillText(`已找到 ${found.length} / ${currentLevel.targetWords.length} 个目标词`, x + 24, cy);
  cy += 48;

  sectionTitle('倒计时');
  drawTimer(ctx, x + 24, cy, 100, time);
  cy += 130;

  sectionTitle('操作提示');
  ctx.fillStyle = '#98a8d6';
  ctx.font = `13px 'Nunito', sans-serif`;
  const tips = [
    '· 点击并拖动选择字母',
    '· 相邻 8 个方向均可连接',
    '· 目标词得分 ×2（金色）',
    '· 完成 80% 解锁下一关'
  ];
  for (const t of tips) {
    ctx.fillText(t, x + 24, cy);
    cy += 20;
  }

  ctx.restore();
}

function drawMobileInfo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number): void {
  ctx.save();
  panelBg(ctx, x, y, w, h);

  const colW = (w - 40) / 3;

  ctx.fillStyle = '#ffd700';
  ctx.font = `bold 11px 'Nunito', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('SCORE', x + 20, y + 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px 'Orbitron', sans-serif`;
  ctx.fillText(String(state.score), x + 20, y + 32);

  ctx.fillStyle = '#8ea5ff';
  ctx.font = `bold 11px 'Nunito', sans-serif`;
  ctx.fillText('进度', x + 20 + colW, y + 16);
  const pct = getCompletionPercent(currentLevelId, progress);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px 'Orbitron', sans-serif`;
  ctx.fillText(`${pct}%`, x + 20 + colW, y + 32);
  drawProgressBar(ctx, x + 20 + colW, y + 64, colW - 10, 8, time);

  ctx.fillStyle = '#4fc3f7';
  ctx.font = `bold 11px 'Nunito', sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('时间', x + w - 20, y + 16);
  ctx.fillStyle = state.timeLeft < 20 ? '#ef5350' : '#ffffff';
  ctx.font = `bold 26px 'Orbitron', sans-serif`;
  ctx.fillText(formatTime(state.timeLeft), x + w - 20, y + 32);

  ctx.restore();
}

function drawRightPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, _time: number): void {
  ctx.save();
  panelBg(ctx, x, y, w, h);

  const titleY = y + 24;
  ctx.fillStyle = '#8ea5ff';
  ctx.font = `bold 13px 'Nunito', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('已找到的单词', x + 24, titleY);

  const found = getLevelFoundWords(currentLevelId, progress);
  ctx.fillStyle = '#4fc3f7';
  ctx.font = `600 12px 'Nunito', sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`${found.length} 个`, x + w - 24, titleY + 2);

  const listY = titleY + 40;
  const listH = h - 64;
  drawWordsList(ctx, x + 24, listY, w - 48, listH, found);

  ctx.restore();
}

function drawMobileWordsList(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, _time: number): void {
  ctx.save();
  panelBg(ctx, x, y, w, h);

  const found = getLevelFoundWords(currentLevelId, progress);
  ctx.fillStyle = '#8ea5ff';
  ctx.font = `bold 12px 'Nunito', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('已找到单词', x + 16, y + 12);
  ctx.fillStyle = '#4fc3f7';
  ctx.textAlign = 'right';
  ctx.fillText(`${found.length} / ${currentLevel.targetWords.length}`, x + w - 16, y + 14);

  drawWordsList(ctx, x + 16, y + 40, w - 32, h - 52, found);
  ctx.restore();
}

function drawWordsList(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, found: string[]): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const chipH = 32;
  const gapX = 8;
  const gapY = 8;
  let cx = x;
  let cy = y;
  let maxRowH = 0;

  const targets = new Set(currentLevel.targetWords.map((t) => t.toUpperCase()));

  for (let i = 0; i < found.length; i++) {
    const word = found[i];
    ctx.font = `bold 14px 'Nunito', sans-serif`;
    const textW = ctx.measureText(word).width + 24;
    if (cx + textW > x + w && cx !== x) {
      cx = x;
      cy += chipH + gapY;
    }
    if (cy + chipH > y + h) break;

    const isTarget = targets.has(word.toUpperCase());
    const bgColor = isTarget ? 'rgba(255, 215, 0, 0.2)' : 'rgba(79, 195, 247, 0.18)';
    const borderColor = isTarget ? 'rgba(255, 215, 0, 0.6)' : 'rgba(79, 195, 247, 0.4)';
    const textColor = isTarget ? '#ffd700' : '#8fd3ff';

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    roundRect(ctx, cx, cy, textW, chipH, chipH * 0.4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `bold 14px 'Nunito', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(word, cx + 12, cy + chipH / 2 + 1);

    if (isTarget) {
      ctx.fillStyle = '#ffd700';
      ctx.font = `10px 'Orbitron', sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText('★', cx + textW - 10, cy + chipH / 2 + 1);
    }

    cx += textW + gapX;
    maxRowH = chipH;
    if (cx + 100 > x + w) {
      cx = x;
      cy += maxRowH + gapY;
      maxRowH = 0;
    }
  }

  if (found.length === 0) {
    ctx.fillStyle = '#5a6a9a';
    ctx.font = `14px 'Nunito', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始拖拽字母拼出单词吧！', x + w / 2, y + h / 2);
  }
  ctx.restore();
}

function drawProgressBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, _time: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(30, 45, 90, 0.8)';
  roundRect(ctx, x, y, w, h, h * 0.5);
  ctx.fill();

  const pct = getCompletionPercent(currentLevelId, progress) / 100;
  const fillW = Math.max(0, Math.min(w, w * pct));
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#ffd700');
  grad.addColorStop(1, '#4fc3f7');
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, fillW, h, h * 0.5);
  ctx.fill();

  ctx.fillStyle = pct > 0.5 ? '#0a0e27' : '#ffffff';
  ctx.font = `bold ${Math.floor(h * 0.7)}px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(pct * 100)}%`, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawTimer(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, _time: number): void {
  ctx.save();
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2 - 4;

  ctx.strokeStyle = 'rgba(30, 45, 90, 0.9)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const pct = Math.max(0, state.timeLeft / TIME_LIMIT);
  const startA = -Math.PI / 2;
  const endA = startA + Math.PI * 2 * pct;
  const color = state.timeLeft < 20 ? '#ef5350' : state.timeLeft < 40 ? '#ffc107' : '#4fc3f7';
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, endA);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 28px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatTime(state.timeLeft), cx, cy + 2);

  ctx.restore();
}

function drawToast(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  if (!state.toast) return;
  const t = (time - state.toast.startTime) / 1500;
  if (t >= 1) {
    state.toast = null;
    return;
  }
  ctx.save();
  const alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1;
  const offset = (1 - alpha) * -40;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = state.toast.color;
  ctx.font = `bold 32px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = state.toast.color;
  ctx.shadowBlur = 20;
  ctx.fillText(state.toast.text, w / 2, h * 0.18 + offset);
  ctx.restore();
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, _time: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 25, 0.75)';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 48px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(79, 195, 247, 0.6)';
  ctx.shadowBlur = 20;
  ctx.fillText('游戏暂停', w / 2, h / 2 - 30);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#8ea5ff';
  ctx.font = `18px 'Nunito', sans-serif`;
  ctx.fillText('点击继续按钮恢复游戏', w / 2, h / 2 + 20);
  ctx.restore();
}

function drawResultOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 25, 0.82)';
  ctx.fillRect(0, 0, w, h);

  const isWin = state.resultType === 'win';
  const found = getLevelFoundWords(currentLevelId, progress);

  if (isWin) {
    for (let i = 0; i < 20; i++) {
      const angle = (time * 0.0005 + i * 0.5) % (Math.PI * 2);
      const rad = 80 + Math.sin(time * 0.002 + i) * 15;
      const sx = w / 2 + Math.cos(angle) * rad;
      const sy = h / 2 - 90 + Math.sin(angle) * rad;
      ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + 0.5 * Math.sin(time * 0.005 + i)})`;
      drawStar(ctx, sx, sy, 5, 6, 3);
    }
  }

  ctx.fillStyle = isWin ? '#ffd700' : '#ef5350';
  ctx.font = `bold 52px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = isWin ? 'rgba(255, 215, 0, 0.6)' : 'rgba(239, 83, 80, 0.6)';
  ctx.shadowBlur = 30;
  ctx.fillText(isWin ? '关卡通关！' : '时间到！', w / 2, h / 2 - 70);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 28px 'Nunito', sans-serif`;
  ctx.fillText(`本关得分 +${levelScore}`, w / 2, h / 2 - 10);

  ctx.fillStyle = '#8ea5ff';
  ctx.font = `18px 'Nunito', sans-serif`;
  ctx.fillText(`找到 ${found.length} / ${currentLevel.targetWords.length} 个目标单词`, w / 2, h / 2 + 30);
  ctx.fillText(`完成度 ${getCompletionPercent(currentLevelId, progress)}%`, w / 2, h / 2 + 56);

  drawButton(ctx, w / 2 - 110, h / 2 + 100, 220, 52, isWin ? '下一关 →' : '再来一次', isWin ? '#ffd700' : '#4fc3f7');
  ctx.restore();
}

function drawLevelSelect(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 25, 0.9)';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 36px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(79, 195, 247, 0.6)';
  ctx.shadowBlur = 15;
  ctx.fillText('选择关卡', w / 2, 50);
  ctx.shadowBlur = 0;

  const levels = getLevels();
  const cols = w < 500 ? 4 : 5;
  const gap = 16;
  const available = w - 80;
  const size = Math.min(72, (available - gap * (cols - 1)) / cols);
  const rows = Math.ceil(levels.length / cols);
  const totalW = cols * size + (cols - 1) * gap;
  const totalH = rows * size + (rows - 1) * gap;
  let startX = (w - totalW) / 2;
  let startY = (h - totalH) / 2 + 10;

  for (let i = 0; i < levels.length; i++) {
    const lvl = levels[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = startX + col * (size + gap);
    const by = startY + row * (size + gap);
    const unlocked = lvl.id <= progress.unlockedLevel;
    const completed = isCompleted(lvl.id, progress);
    const isCurrent = lvl.id === currentLevelId;

    let bg = 'rgba(30, 45, 90, 0.6)';
    let border = 'rgba(79, 195, 247, 0.3)';
    let textColor = '#8ea5ff';

    if (unlocked) {
      bg = completed ? 'rgba(255, 215, 0, 0.2)' : 'rgba(79, 195, 247, 0.2)';
      border = completed ? 'rgba(255, 215, 0, 0.7)' : 'rgba(79, 195, 247, 0.6)';
      textColor = completed ? '#ffd700' : '#ffffff';
    }
    if (isCurrent) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.005);
      ctx.shadowColor = completed ? `rgba(255, 215, 0, ${0.4 + 0.3 * pulse})` : `rgba(79, 195, 247, ${0.4 + 0.3 * pulse})`;
      ctx.shadowBlur = 18;
    }

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, size, size, size * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.floor(size * 0.38)}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(lvl.id), bx + size / 2, by + size / 2 - (completed ? 4 : 0));

    if (completed) {
      ctx.fillStyle = '#ffd700';
      ctx.font = `${Math.floor(size * 0.28)}px 'Orbitron', sans-serif`;
      drawStar(ctx, bx + size / 2, by + size * 0.78, 5, size * 0.18, size * 0.09);
    }

    if (!unlocked) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${Math.floor(size * 0.3)}px sans-serif`;
      ctx.fillText('🔒', bx + size / 2, by + size * 0.78);
    }
  }

  drawButton(ctx, w / 2 - 80, h - 80, 160, 44, '返回', '#8ea5ff');
  ctx.restore();
}

function drawButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, color: string): void {
  ctx.save();
  ctx.fillStyle = color + '33';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, h * 0.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `bold ${Math.floor(h * 0.4)}px 'Nunito', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function panelBg(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(20, 30, 70, 0.7)');
  grad.addColorStop(1, 'rgba(15, 22, 55, 0.7)');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outer: number, inner: number): void {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outer);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outer;
    y = cy + Math.sin(rot) * outer;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * inner;
    y = cy + Math.sin(rot) * inner;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outer);
  ctx.closePath();
  ctx.fill();
}

function formatTime(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

let lastPointerX = 0;
let lastPointerY = 0;

function isHitPause(): boolean {
  const rect = canvas.getBoundingClientRect();
  const isMobile = rect.width < 768;
  const x = isMobile ? 16 : 24;
  const y = isMobile ? 16 : 16;
  const s = isMobile ? 56 : 32;
  return lastPointerX >= x && lastPointerX <= x + s && lastPointerY >= y && lastPointerY <= y + s;
}

function isHitLevels(): boolean {
  const rect = canvas.getBoundingClientRect();
  const isMobile = rect.width < 768;
  const s = isMobile ? 56 : 32;
  const x = isMobile ? 16 + s + 10 : 72;
  const y = isMobile ? 16 : 16;
  return lastPointerX >= x && lastPointerX <= x + s && lastPointerY >= y && lastPointerY <= y + s;
}

function isHitResultButton(): boolean {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  return lastPointerX >= w / 2 - 110 && lastPointerX <= w / 2 + 110 && lastPointerY >= h / 2 + 100 && lastPointerY <= h / 2 + 152;
}

function isHitBackButton(): boolean {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  return lastPointerX >= w / 2 - 80 && lastPointerX <= w / 2 + 80 && lastPointerY >= h - 80 && lastPointerY <= h - 36;
}

function handlePointerDown(e: MouseEvent | TouchEvent): void {
  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;
  if ('touches' in e) {
    if (e.touches.length === 0) return;
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = (e as MouseEvent).clientX;
    clientY = (e as MouseEvent).clientY;
  }
  lastPointerX = clientX - rect.left;
  lastPointerY = clientY - rect.top;
}

function handleClick(): void {
  if (state.showResult) {
    if (isHitResultButton()) {
      state.showResult = false;
      if (state.resultType === 'win') {
        const nextId = currentLevelId + 1;
        const nextLevel = getLevelById(nextId);
        if (nextLevel && nextId <= progress.unlockedLevel) {
          currentLevelId = nextId;
          currentLevel = nextLevel;
        }
      }
      board.reset(currentLevel.letters);
      levelScore = 0;
      state.timeLeft = TIME_LIMIT;
      state.resultType = null;
      return;
    }
  }

  if (state.showLevelSelect) {
    if (isHitBackButton()) {
      state.showLevelSelect = false;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const levels = getLevels();
    const cols = w < 500 ? 4 : 5;
    const gap = 16;
    const available = w - 80;
    const size = Math.min(72, (available - gap * (cols - 1)) / cols);
    const rows = Math.ceil(levels.length / cols);
    const totalW = cols * size + (cols - 1) * gap;
    const totalH = rows * size + (rows - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = (h - totalH) / 2 + 10;
    for (let i = 0; i < levels.length; i++) {
      const lvl = levels[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (size + gap);
      const by = startY + row * (size + gap);
      if (lastPointerX >= bx && lastPointerX <= bx + size && lastPointerY >= by && lastPointerY <= by + size) {
        if (lvl.id <= progress.unlockedLevel) {
          currentLevelId = lvl.id;
          currentLevel = lvl;
          board.reset(currentLevel.letters);
          levelScore = 0;
          state.timeLeft = TIME_LIMIT;
          state.showLevelSelect = false;
          state.showResult = false;
        }
        return;
      }
    }
    return;
  }

  if (isHitPause()) {
    state.paused = !state.paused;
    return;
  }
  if (isHitLevels()) {
    state.showLevelSelect = true;
    state.paused = true;
  }
}

canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('click', handleClick);

function gameLoop(timestamp: number): void {
  if (!loading!.style.display && loading!.style.display !== 'none') {
    loading!.style.display = 'none';
  }

  const rect = canvas.getBoundingClientRect();
  if (rect.width !== canvas.width / (window.devicePixelRatio || 1) || rect.height !== canvas.height / (window.devicePixelRatio || 1)) {
    board.updateSize();
  }

  const delta = lastTimestamp ? Math.min(timestamp - lastTimestamp, 100) : 16;
  lastTimestamp = timestamp;

  const gameActive = !state.paused && !state.showResult && !state.showLevelSelect;
  board.setInteractive(gameActive);

  if (gameActive) {
    state.timeLeft -= delta / 1000;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.showResult = true;
      state.resultType = 'timeout';
    }
  }

  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  board.render(timestamp);
  drawUI(ctx, rect.width, rect.height, timestamp);

  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {
  board.updateSize();
});

requestAnimationFrame(gameLoop);
