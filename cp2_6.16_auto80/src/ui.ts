// ===== UI模块：HUD绘制 + 开始/暂停/结束界面管理 + localStorage =====
import type { PlayerStats } from './player';

const CANVAS_W = 800;
const CANVAS_H = 600;
const HS_KEY = 'nebula_tactics_highscore';

export type GameState = 'start' | 'playing' | 'paused' | 'gameover';

export interface UIHandlers {
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
}

export class UI {
  ctx: CanvasRenderingContext2D;
  handlers: UIHandlers;

  // DOM 元素引用
  startScreen!: HTMLElement;
  pauseScreen!: HTMLElement;
  gameoverScreen!: HTMLElement;
  startHighscoreEl!: HTMLElement;
  finalScoreEl!: HTMLElement;
  finalHighscoreEl!: HTMLElement;

  highScore: number = 0;

  constructor(ctx: CanvasRenderingContext2D, handlers: UIHandlers) {
    this.ctx = ctx;
    this.handlers = handlers;
    this.bindDOM();
    this.highScore = this.loadHighScore();
    this.updateHighscoreDisplays(0);
  }

  // ===== 绑定DOM与按钮事件 =====
  private bindDOM(): void {
    const $ = (id: string): HTMLElement => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`DOM element #${id} not found`);
      return el;
    };
    this.startScreen = $('start-screen');
    this.pauseScreen = $('pause-screen');
    this.gameoverScreen = $('gameover-screen');
    this.startHighscoreEl = $('start-highscore');
    this.finalScoreEl = $('final-score');
    this.finalHighscoreEl = $('final-highscore');

    $('start-btn').addEventListener('click', () => this.handlers.onStart());
    $('resume-btn').addEventListener('click', () => this.handlers.onResume());
    $('restart-btn').addEventListener('click', () => this.handlers.onRestart());
  }

  // ===== localStorage =====
  private loadHighScore(): number {
    try {
      const v = localStorage.getItem(HS_KEY);
      if (!v) return 0;
      const n = parseInt(v, 10);
      return isNaN(n) ? 0 : n;
    } catch { return 0; }
  }
  private saveHighScore(score: number): void {
    try { localStorage.setItem(HS_KEY, String(score)); } catch { /* ignore */ }
  }

  // ===== 更新最高分显示 =====
  updateHighscoreDisplays(currentScore: number): void {
    if (currentScore > this.highScore) {
      this.highScore = currentScore;
      this.saveHighScore(this.highScore);
    }
    this.startHighscoreEl.textContent = `最高分: ${this.highScore}`;
    this.finalHighscoreEl.textContent = String(this.highScore);
  }

  // ===== 状态切换 =====
  setState(state: GameState, finalScore?: number): void {
    const show = (el: HTMLElement, visible: boolean): void => {
      el.classList.toggle('hidden', !visible);
    };
    show(this.startScreen, state === 'start');
    show(this.pauseScreen, state === 'paused');
    show(this.gameoverScreen, state === 'gameover');
    if (state === 'gameover' && finalScore !== undefined) {
      this.finalScoreEl.textContent = String(finalScore);
      this.updateHighscoreDisplays(finalScore);
    }
  }

  // ===== HUD 绘制：分数/护盾/能量（左上角） =====
  drawHUD(stats: PlayerStats): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 20px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const padX = 18;
    let y = 16;
    const lineH = 30;

    // 分数
    this.drawTextWithStroke(ctx, `SCORE: ${stats.score}`, padX, y, '#ffffff');
    y += lineH;

    // 护盾（带红色警告色）
    const shColor = stats.shield < 30 ? '#ff4757' : '#ffffff';
    this.drawTextWithStroke(ctx, `SHIELD: ${Math.floor(stats.shield)}/${stats.maxShield}`, padX, y, shColor);
    // 护盾条
    this.drawBar(ctx, padX + 150, y + 7, 140, 12, stats.shield / stats.maxShield, '#ff4757', '#331417');
    y += lineH;

    // 能量
    this.drawTextWithStroke(ctx, `ENERGY: ${Math.floor(stats.energy)}/${stats.maxEnergy}`, padX, y, '#ffffff');
    // 能量条
    this.drawBar(ctx, padX + 150, y + 7, 140, 12, stats.energy / stats.maxEnergy, '#70a1ff', '#14203a');
    y += lineH;

    // 武器等级
    const wColor = stats.weaponLevel >= 2 ? '#ffdd57' : '#88ccff';
    this.drawTextWithStroke(ctx, `LV.${stats.weaponLevel}  射速 ${stats.fireRate}/s  弹速 ${stats.bulletSpeed}`, padX, y, wColor);
    y += lineH;

    // 减速力场冷却
    const cdPct = 1 - stats.slowCooldown / stats.slowCooldownMax;
    const cdLabel = stats.slowCooldown > 0 ? `SLOW CD: ${stats.slowCooldown.toFixed(1)}s` : 'SLOW: READY';
    const cdColor = stats.slowCooldown > 0 ? '#aaaaaa' : '#00d4ff';
    this.drawTextWithStroke(ctx, cdLabel, padX, y, cdColor);
    this.drawBar(ctx, padX + 170, y + 7, 120, 12, cdPct, '#00d4ff', '#0e2a38');

    ctx.restore();
  }

  private drawTextWithStroke(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string): void {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 2;   // 约 0.5px * 4，足够明显
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pct: number, fg: string, bg: string): void {
    const p = Math.max(0, Math.min(1, pct));
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fg;
    ctx.fillRect(x, y, w * p, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // ===== 暂停暗化（50%黑）—— 在 game.ts 真正暂停循环时调用，用于最后一帧覆盖 =====
  drawPauseOverlay(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
  }
}
