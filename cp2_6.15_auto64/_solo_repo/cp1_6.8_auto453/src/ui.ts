import type { PlayerState } from './player';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover' | 'levelcomplete';

interface UIState {
  status: GameStatus;
  lives: number;
  maxLives: number;
  fragments: number;
  progress: number;
  unlockedPoems: string[];
  currentPoem: string | null;
  poemTimer: number;
  poemDuration: number;
}

const POEMS = [
  '大漠孤烟直',
  '长河落日圆',
  '行到水穷处',
  '坐看云起时',
  '山重水复疑无路',
  '柳暗花明又一村',
  '明月松间照',
  '清泉石上流',
  '会当凌绝顶',
  '一览众山小',
];

const FRAGMENTS_PER_POEM = 5;

export class UI {
  private state: UIState;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = {
      status: 'menu',
      lives: 3,
      maxLives: 3,
      fragments: 0,
      progress: 0,
      unlockedPoems: [],
      currentPoem: null,
      poemTimer: 0,
      poemDuration: 3,
    };
  }

  getStatus(): GameStatus { return this.state.status; }
  getLives(): number { return this.state.lives; }
  getFragments(): number { return this.state.fragments; }

  setStatus(status: GameStatus) { this.state.status = status; }

  setLives(lives: number) { this.state.lives = Math.max(0, lives); }

  addFragment(): boolean {
    this.state.fragments++;
    if (this.state.fragments % FRAGMENTS_PER_POEM === 0) {
      const poemIndex = this.state.unlockedPoems.length % POEMS.length;
      this.state.currentPoem = POEMS[poemIndex];
      this.state.unlockedPoems.push(POEMS[poemIndex]);
      this.state.poemTimer = this.state.poemDuration;
      return true;
    }
    return false;
  }

  setProgress(progress: number) { this.state.progress = Math.min(1, Math.max(0, progress)); }

  loseLife(): boolean {
    this.state.lives--;
    return this.state.lives <= 0;
  }

  isPoemDisplaying(): boolean { return this.state.poemTimer > 0; }

  update(dt: number) {
    if (this.state.poemTimer > 0) {
      this.state.poemTimer -= dt;
      if (this.state.poemTimer <= 0) {
        this.state.currentPoem = null;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    switch (this.state.status) {
      case 'menu':
        this.renderMenu(ctx);
        break;
      case 'playing':
        this.renderHUD(ctx);
        if (this.state.currentPoem) {
          this.renderPoem(ctx);
        }
        break;
      case 'gameover':
        this.renderGameOver(ctx);
        break;
      case 'levelcomplete':
        this.renderLevelComplete(ctx);
        break;
    }
  }

  private renderMenu(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(245, 240, 232, 0.85)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 56px "KaiTi", "STKaiti", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('墨染乾坤', this.canvasWidth / 2, this.canvasHeight * 0.35);

    ctx.font = '22px "KaiTi", "STKaiti", serif';
    ctx.fillStyle = '#4a4a4a';
    ctx.fillText('水墨山水 · 动作跑酷', this.canvasWidth / 2, this.canvasHeight * 0.44);

    const btnY = this.canvasHeight * 0.58;
    ctx.fillStyle = 'rgba(44, 44, 44, 0.08)';
    this.roundRect(ctx, this.canvasWidth / 2 - 90, btnY - 25, 180, 50, 8);
    ctx.fill();
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, this.canvasWidth / 2 - 90, btnY - 25, 180, 50, 8);
    ctx.stroke();

    ctx.fillStyle = '#2c2c2c';
    ctx.font = '24px "KaiTi", "STKaiti", serif';
    ctx.fillText('点击开始', this.canvasWidth / 2, btnY);

    ctx.font = '16px "KaiTi", "STKaiti", serif';
    ctx.fillStyle = '#8a8a8a';
    ctx.fillText('空格/点击上方 — 跳跃', this.canvasWidth / 2, this.canvasHeight * 0.74);
    ctx.fillText('下箭头/点击下方 — 滑铲', this.canvasWidth / 2, this.canvasHeight * 0.79);
  }

  private renderHUD(ctx: CanvasRenderingContext2D) {
    this.renderProgressBar(ctx);
    this.renderFragmentCount(ctx);
    this.renderLives(ctx);
  }

  private renderProgressBar(ctx: CanvasRenderingContext2D) {
    const x = 20;
    const y = 20;
    const width = 160;
    const height = 12;

    ctx.fillStyle = 'rgba(44, 44, 44, 0.15)';
    this.roundRect(ctx, x, y, width, height, 6);
    ctx.fill();

    const fillWidth = width * this.state.progress;
    if (fillWidth > 0) {
      const gradient = ctx.createLinearGradient(x, y, x + fillWidth, y);
      gradient.addColorStop(0, 'rgba(44, 44, 44, 0.6)');
      gradient.addColorStop(1, 'rgba(44, 44, 44, 0.9)');
      ctx.fillStyle = gradient;
      this.roundRect(ctx, x, y, fillWidth, height, 6);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(44, 44, 44, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, width, height, 6);
    ctx.stroke();
  }

  private renderFragmentCount(ctx: CanvasRenderingContext2D) {
    const x = this.canvasWidth - 100;
    const y = 22;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#C9A84C';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();

    ctx.fillStyle = '#C9A84C';
    ctx.font = 'bold 18px "KaiTi", "STKaiti", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`× ${this.state.fragments}`, x + 14, y + 1);
  }

  private renderLives(ctx: CanvasRenderingContext2D) {
    const x = this.canvasWidth - 100;
    const y = 46;

    for (let i = 0; i < this.state.maxLives; i++) {
      const dx = x + i * 22;
      if (i < this.state.lives) {
        this.renderInkDrop(ctx, dx, y, 7);
      } else {
        ctx.fillStyle = 'rgba(44, 44, 44, 0.15)';
        ctx.beginPath();
        ctx.arc(dx, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderInkDrop(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.bezierCurveTo(x + size * 0.8, y - size * 0.3, x + size, y + size * 0.3, x, y + size);
    ctx.bezierCurveTo(x - size, y + size * 0.3, x - size * 0.8, y - size * 0.3, x, y - size);
    ctx.closePath();
    ctx.fill();
  }

  private renderPoem(ctx: CanvasRenderingContext2D) {
    const poem = this.state.currentPoem;
    if (!poem) return;

    const progress = 1 - (this.state.poemTimer / this.state.poemDuration);
    const fadeIn = Math.min(1, progress * 3);
    const fadeOut = this.state.poemTimer < 0.5 ? this.state.poemTimer / 0.5 : 1;

    ctx.save();
    ctx.globalAlpha = fadeIn * fadeOut;

    ctx.fillStyle = 'rgba(245, 240, 232, 0.6)';
    ctx.fillRect(0, this.canvasHeight * 0.35, this.canvasWidth, this.canvasHeight * 0.3);

    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 36px "KaiTi", "STKaiti", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const revealChars = Math.floor(poem.length * Math.min(1, progress * 2));
    const displayText = poem.substring(0, revealChars);

    const startX = this.canvasWidth / 2 + (1 - Math.min(1, progress * 2)) * 50;
    ctx.fillText(displayText, startX, this.canvasHeight * 0.5);

    ctx.restore();
  }

  private renderGameOver(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(44, 44, 44, 0.6)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#F5F0E8';
    ctx.font = 'bold 44px "KaiTi", "STKaiti", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('墨尽笔枯', this.canvasWidth / 2, this.canvasHeight * 0.38);

    ctx.font = '20px "KaiTi", "STKaiti", serif';
    ctx.fillStyle = '#D8D0C4';
    ctx.fillText(`收集碎片：${this.state.fragments}`, this.canvasWidth / 2, this.canvasHeight * 0.48);

    if (this.state.unlockedPoems.length > 0) {
      ctx.font = '18px "KaiTi", "STKaiti", serif';
      ctx.fillStyle = '#C9A84C';
      ctx.fillText(`解锁诗句：${this.state.unlockedPoems.length}`, this.canvasWidth / 2, this.canvasHeight * 0.54);
    }

    const btnY = this.canvasHeight * 0.66;
    ctx.fillStyle = 'rgba(245, 240, 232, 0.1)';
    this.roundRect(ctx, this.canvasWidth / 2 - 90, btnY - 25, 180, 50, 8);
    ctx.fill();
    ctx.strokeStyle = '#F5F0E8';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, this.canvasWidth / 2 - 90, btnY - 25, 180, 50, 8);
    ctx.stroke();

    ctx.fillStyle = '#F5F0E8';
    ctx.font = '24px "KaiTi", "STKaiti", serif';
    ctx.fillText('再书一卷', this.canvasWidth / 2, btnY);
  }

  private renderLevelComplete(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(245, 240, 232, 0.85)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 44px "KaiTi", "STKaiti", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('卷轴尽展', this.canvasWidth / 2, this.canvasHeight * 0.32);

    ctx.font = '20px "KaiTi", "STKaiti", serif';
    ctx.fillStyle = '#4a4a4a';
    ctx.fillText(`收集碎片：${this.state.fragments}`, this.canvasWidth / 2, this.canvasHeight * 0.44);

    if (this.state.unlockedPoems.length > 0) {
      ctx.font = '20px "KaiTi", "STKaiti", serif';
      ctx.fillStyle = '#C9A84C';
      for (let i = 0; i < this.state.unlockedPoems.length; i++) {
        ctx.fillText(this.state.unlockedPoems[i], this.canvasWidth / 2, this.canvasHeight * 0.52 + i * 30);
      }
    }

    const btnY = this.canvasHeight * 0.72;
    ctx.fillStyle = 'rgba(44, 44, 44, 0.08)';
    this.roundRect(ctx, this.canvasWidth / 2 - 90, btnY - 25, 180, 50, 8);
    ctx.fill();
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, this.canvasWidth / 2 - 90, btnY - 25, 180, 50, 8);
    ctx.stroke();

    ctx.fillStyle = '#2c2c2c';
    ctx.font = '24px "KaiTi", "STKaiti", serif';
    ctx.fillText('续展新卷', this.canvasWidth / 2, btnY);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  reset() {
    this.state.lives = 3;
    this.state.fragments = 0;
    this.state.progress = 0;
    this.state.unlockedPoems = [];
    this.state.currentPoem = null;
    this.state.poemTimer = 0;
  }

  resize(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }
}
