export interface RollResult {
  values: [number, number, number];
  rating: string;
  score: number;
  timestamp: number;
}

export type Rating = 'triple' | 'straight' | 'pair' | 'normal';

export class Stats {
  private history: RollResult[] = [];
  private maxHistory: number = 20;
  private expanded: boolean = true;
  private animTime: number = 0;
  private firstRender: boolean = true;
  private storageKey: string = 'star-flame-dice-stats';
  private panelAnimProgress: number = 1;
  private panelTargetProgress: number = 1;

  constructor() {
    this.loadFromStorage();
  }

  addRoll(result: RollResult): void {
    this.history.unshift(result);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
    this.firstRender = true;
    this.animTime = 0;
    this.saveToStorage();
  }

  getHistory(): RollResult[] {
    return this.history;
  }

  getTotalRolls(): number {
    return this.history.length;
  }

  getDistribution(): Record<number, number> {
    const dist: Record<number, number> = {};
    for (let i = 1; i <= 6; i++) {
      dist[i] = 0;
    }
    for (const roll of this.history) {
      for (const v of roll.values) {
        dist[v]++;
      }
    }
    return dist;
  }

  getRatingDistribution(): Record<Rating, number> {
    const dist: Record<Rating, number> = {
      triple: 0,
      straight: 0,
      pair: 0,
      normal: 0,
    };
    for (const roll of this.history) {
      const rating = this.getRating(roll.values);
      dist[rating]++;
    }
    return dist;
  }

  getRating(values: [number, number, number]): Rating {
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) {
      return 'triple';
    }
    if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
      return 'straight';
    }
    if (sorted[0] === sorted[1] || sorted[1] === sorted[2] || sorted[0] === sorted[2]) {
      return 'pair';
    }
    return 'normal';
  }

  getScore(values: [number, number, number]): number {
    const rating = this.getRating(values);
    const sum = values.reduce((a, b) => a + b, 0);
    switch (rating) {
      case 'triple':
        return sum * 10;
      case 'straight':
        return sum * 5;
      case 'pair':
        return sum * 2;
      default:
        return sum;
    }
  }

  toggle(): void {
    this.expanded = !this.expanded;
    this.panelTargetProgress = this.expanded ? 1 : 0;
    this.firstRender = true;
    this.animTime = 0;
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  update(dt: number): void {
    if (this.firstRender) {
      this.animTime += dt;
    }

    this.panelAnimProgress += (this.panelTargetProgress - this.panelAnimProgress) * 8 * dt;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
    const headerHeight = 50;
    const contentMaxHeight = 260;
    const contentHeight = contentMaxHeight * this.panelAnimProgress;
    const totalHeight = headerHeight + contentHeight;

    if (totalHeight < 1) return;

    ctx.save();

    this.drawPanel(ctx, x, y, width, totalHeight, headerHeight, contentHeight);

    if (this.panelAnimProgress > 0.1) {
      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, x, y, width, totalHeight, 16);
      ctx.clip();
      this.drawContent(ctx, x, y + headerHeight, width, contentMaxHeight);
      ctx.restore();
    }

    this.drawHeader(ctx, x, y, width, headerHeight);

    ctx.restore();
  }

  private drawPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    headerHeight: number,
    contentHeight: number
  ): void {
    const r = 16;

    ctx.shadowColor = 'rgba(255, 123, 36, 0.5)';
    ctx.shadowBlur = 15;

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(26, 10, 46, 0.95)');
    gradient.addColorStop(1, 'rgba(13, 5, 25, 0.98)');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(255, 123, 36, 0.4)';
    ctx.lineWidth = 2;

    this.roundRect(ctx, x, y, width, height, r);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    if (contentHeight > 5) {
      ctx.strokeStyle = 'rgba(255, 123, 36, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + headerHeight);
      ctx.lineTo(x + width - 10, y + headerHeight);
      ctx.stroke();
    }
  }

  private drawHeader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.fillStyle = '#FF7B24';
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FF7B24';
    ctx.shadowBlur = 8;
    ctx.fillText('历史统计', x + 20, y + height / 2);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '13px Orbitron, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.history.length}/${this.maxHistory} 局`, x + width - 50, y + height / 2);
    ctx.textAlign = 'left';

    const arrowX = x + width - 25;
    const arrowY = y + height / 2;
    ctx.strokeStyle = '#FF7B24';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (this.expanded) {
      ctx.moveTo(arrowX - 6, arrowY + 4);
      ctx.lineTo(arrowX, arrowY - 4);
      ctx.lineTo(arrowX + 6, arrowY + 4);
    } else {
      ctx.moveTo(arrowX - 6, arrowY - 4);
      ctx.lineTo(arrowX, arrowY + 4);
      ctx.lineTo(arrowX + 6, arrowY - 4);
    }
    ctx.stroke();
  }

  private drawContent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const padding = 20;
    const chartTop = y + padding;
    const chartHeight = height - padding * 2 - 45;
    const barCount = 6;
    const barGap = 10;
    const barWidth = (width - padding * 2 - barGap * (barCount - 1)) / barCount;

    const dist = this.getDistribution();
    const maxValue = Math.max(...Object.values(dist), 1);

    const staggerDelay = 0.05;

    for (let i = 0; i < barCount; i++) {
      const value = i + 1;
      const count = dist[value];
      const barHeightRatio = count / maxValue;

      const animProgress = this.getStaggeredProgress(i, staggerDelay, barCount);
      const easedProgress = this.easeOutBack(animProgress);
      const displayHeight = chartHeight * barHeightRatio * easedProgress;

      const barX = x + padding + i * (barWidth + barGap);
      const barY = chartTop + chartHeight - displayHeight;

      if (displayHeight > 1) {
        const barGradient = ctx.createLinearGradient(barX, barY, barX, barY + displayHeight);
        barGradient.addColorStop(0, '#FFD700');
        barGradient.addColorStop(0.3, '#FF7B24');
        barGradient.addColorStop(1, '#E65100');

        ctx.shadowColor = 'rgba(255, 123, 36, 0.6)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = barGradient;
        this.roundRect(ctx, barX, barY, barWidth, displayHeight, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (easedProgress > 0.3) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const alpha = Math.min(1, (easedProgress - 0.3) / 0.7);
        ctx.globalAlpha = alpha;
        ctx.fillText(count.toString(), barX + barWidth / 2, barY - 6);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = 'bold 13px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(value.toString(), barX + barWidth / 2, chartTop + chartHeight + 6);
      ctx.textAlign = 'left';
    }

    const ratingDist = this.getRatingDistribution();
    const ratings: { key: Rating; label: string; color: string }[] = [
      { key: 'triple', label: '豹子', color: '#FFD700' },
      { key: 'straight', label: '顺子', color: '#00D4FF' },
      { key: 'pair', label: '对子', color: '#7B68EE' },
      { key: 'normal', label: '普通', color: '#888888' },
    ];

    const legendY = y + height - 22;
    const legendItemWidth = (width - padding * 2) / ratings.length;

    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i];
      const legendX = x + padding + i * legendItemWidth;

      ctx.fillStyle = rating.color;
      ctx.shadowColor = rating.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(legendX + 6, legendY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '12px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${rating.label} ${ratingDist[rating.key]}`, legendX + 16, legendY);
    }
  }

  private getStaggeredProgress(index: number, delay: number, total: number): number {
    const offset = index * delay;
    const animDuration = 0.6;
    const progress = Math.max(0, Math.min(1, (this.animTime - offset) / animDuration));
    return progress;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  isPointInPanel(px: number, py: number, x: number, y: number, width: number): boolean {
    const headerHeight = 50;
    const contentMaxHeight = 260;
    const contentHeight = contentMaxHeight * this.panelAnimProgress;
    const totalHeight = headerHeight + contentHeight;
    return px >= x && px <= x + width && py >= y && py <= y + totalHeight;
  }

  isPointInHeader(px: number, py: number, x: number, y: number, width: number): boolean {
    const headerHeight = 50;
    return px >= x && px <= x + width && py >= y && py <= y + headerHeight;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (_) {
      // ignore
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.history = JSON.parse(data);
        if (this.history.length > this.maxHistory) {
          this.history = this.history.slice(0, this.maxHistory);
        }
      }
    } catch (_) {
      this.history = [];
    }
  }

  clear(): void {
    this.history = [];
    this.saveToStorage();
    this.firstRender = true;
    this.animTime = 0;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
