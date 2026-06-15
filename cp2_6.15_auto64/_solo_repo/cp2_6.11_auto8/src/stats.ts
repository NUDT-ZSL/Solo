export interface HistoryItem {
  timestamp: number;
  values: [number, number, number];
  score: number;
  comboType: 'triple' | 'straight' | 'pair' | 'none';
  comboName: string;
}

export interface ComboInfo {
  type: 'triple' | 'straight' | 'pair' | 'none';
  name: string;
  score: number;
}

const STORAGE_KEY = 'star-dice-stats';
const MAX_HISTORY = 100;
const DISPLAY_HISTORY = 20;

export class Stats {
  private history: HistoryItem[] = [];
  private totalGames: number = 0;
  private totalScore: number = 0;
  private highScore: number = 0;
  private panelMinimized: boolean = false;
  private chartAnimations: { progress: number; started: boolean }[] = [];
  private animStartTime: number = -1;
  private needsAnimationReset: boolean = false;
  private globalTime: number = 0;

  constructor() {
    this.load();
    this.needsAnimationReset = true;
  }

  static evaluateCombo(values: [number, number, number]): ComboInfo {
    const sorted = [...values].sort((a, b) => a - b) as [number, number, number];

    if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) {
      return { type: 'triple', name: '豹 子', score: 1000 };
    }

    if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
      return { type: 'straight', name: '顺 子', score: 500 };
    }

    if (sorted[0] === sorted[1] || sorted[1] === sorted[2]) {
      return { type: 'pair', name: '对 子', score: 200 };
    }

    return { type: 'none', name: '散 牌', score: 50 };
  }

  addResult(values: [number, number, number], score: number, combo: ComboInfo): void {
    const item: HistoryItem = {
      timestamp: Date.now(),
      values,
      score,
      comboType: combo.type,
      comboName: combo.name,
    };

    this.history.unshift(item);
    if (this.history.length > MAX_HISTORY) {
      this.history.pop();
    }

    this.totalGames++;
    this.totalScore += score;
    if (score > this.highScore) {
      this.highScore = score;
    }

    this.needsAnimationReset = true;
    this.save();
  }

  getRecentHistory(count: number = DISPLAY_HISTORY): HistoryItem[] {
    return this.history.slice(0, count);
  }

  getComboDistribution(): Map<string, number> {
    const dist = new Map<string, number>();
    dist.set('triple', 0);
    dist.set('straight', 0);
    dist.set('pair', 0);
    dist.set('none', 0);

    this.getRecentHistory().forEach(item => {
      dist.set(item.comboType, (dist.get(item.comboType) || 0) + 1);
    });

    return dist;
  }

  getTotalGames(): number {
    return this.totalGames;
  }

  getTotalScore(): number {
    return this.totalScore;
  }

  getHighScore(): number {
    return this.highScore;
  }

  save(): void {
    try {
      const data = {
        history: this.history,
        totalGames: this.totalGames,
        totalScore: this.totalScore,
        highScore: this.highScore,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save stats:', e);
    }
  }

  load(): void {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        this.history = data.history || [];
        this.totalGames = data.totalGames || 0;
        this.totalScore = data.totalScore || 0;
        this.highScore = data.highScore || 0;
      }
    } catch (e) {
      console.warn('Failed to load stats:', e);
    }
  }

  reset(): void {
    this.history = [];
    this.totalGames = 0;
    this.totalScore = 0;
    this.highScore = 0;
    this.needsAnimationReset = true;
    this.save();
  }

  togglePanel(): void {
    this.panelMinimized = !this.panelMinimized;
  }

  isPanelMinimized(): boolean {
    return this.panelMinimized;
  }

  update(deltaTime: number): void {
    this.globalTime += deltaTime;

    if (this.needsAnimationReset) {
      this.needsAnimationReset = false;
      this.animStartTime = this.globalTime;
      const history = this.getRecentHistory(DISPLAY_HISTORY);
      this.chartAnimations = history.map(() => ({
        progress: 0,
        started: false,
      }));
    }

    const elapsed = this.globalTime - this.animStartTime;

    this.chartAnimations.forEach((anim, i) => {
      const staggerDelay = i * 0.05;
      if (elapsed >= staggerDelay) {
        anim.started = true;
      }
      if (anim.started && anim.progress < 1) {
        anim.progress = Math.min(1, anim.progress + deltaTime * 4);
      }
    });
  }

  renderBarChart(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const history = this.getRecentHistory(DISPLAY_HISTORY);
    if (history.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', x + width / 2, y + height / 2);
      return;
    }

    const maxScore = Math.max(...history.map(h => h.score), 1000);
    const barCount = Math.min(history.length, DISPLAY_HISTORY);
    const barGap = 4;
    const barWidth = (width - barGap * (barCount + 1)) / barCount;
    const chartBottom = y + height - 20;
    const chartTop = y + 10;
    const chartHeight = chartBottom - chartTop;

    ctx.fillStyle = 'rgba(255, 123, 36, 0.1)';
    ctx.fillRect(x, chartTop, width, chartHeight);

    ctx.strokeStyle = 'rgba(255, 123, 36, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const lineY = chartTop + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + width, lineY);
      ctx.stroke();
    }

    history.forEach((item, i) => {
      if (i >= DISPLAY_HISTORY) return;

      const anim = this.chartAnimations[i] || { progress: 1, started: true };
      const progress = anim.started ? this.easeOutBack(anim.progress) : 0;

      const barX = x + barGap + i * (barWidth + barGap);
      const barHeight = (item.score / maxScore) * chartHeight * progress;
      const barY = chartBottom - barHeight;

      const gradient = ctx.createLinearGradient(barX, barY, barX, chartBottom);
      const colors = this.getComboColors(item.comboType);
      gradient.addColorStop(0, colors.light);
      gradient.addColorStop(1, colors.dark);

      ctx.save();
      ctx.shadowColor = colors.base;
      ctx.shadowBlur = 8;
      ctx.fillStyle = gradient;
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.restore();

      if (anim.progress > 0.8) {
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = (anim.progress - 0.8) / 0.2;
        ctx.fillText(item.score.toString(), barX + barWidth / 2, barY - 5);
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '8px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((i + 1).toString(), barX + barWidth / 2, chartBottom + 12);
      ctx.restore();
    });
  }

  private getComboColors(type: string): { base: string; light: string; dark: string } {
    switch (type) {
      case 'triple':
        return { base: '#FFD700', light: '#FFEC8B', dark: '#B8860B' };
      case 'straight':
        return { base: '#00BFFF', light: '#87CEEB', dark: '#0080AA' };
      case 'pair':
        return { base: '#FF6B6B', light: '#FFA07A', dark: '#CD5C5C' };
      default:
        return { base: '#FF7B24', light: '#FFA25A', dark: '#E56A1C' };
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
