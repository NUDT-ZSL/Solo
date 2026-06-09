import { Card } from './Card';

export interface LinkData {
  id: string;
  fromCardId: string;
  toCardId: string;
}

interface LightPoint {
  progress: number;
  speed: number;
  size: number;
}

export type LinkState = 'appearing' | 'idle' | 'disappearing';

export class Link {
  public id: string;
  public fromCardId: string;
  public toCardId: string;
  public state: LinkState;
  public opacity: number;
  public lightPoints: LightPoint[];
  public animProgress: number;
  public cachedLength: number;
  public needsRecalc: boolean;
  private _cachedPoints: { x: number; y: number }[] | null;

  constructor(id: string, fromCardId: string, toCardId: string) {
    this.id = id;
    this.fromCardId = fromCardId;
    this.toCardId = toCardId;
    this.state = 'appearing';
    this.opacity = 0;
    this.lightPoints = [];
    this.animProgress = 0;
    this.cachedLength = 0;
    this.needsRecalc = true;
    this._cachedPoints = null;
  }

  private initLightPoints(): void {
    this.lightPoints = [];
    const spacing = 15;
    const count = Math.max(2, Math.floor(this.cachedLength / spacing));
    for (let i = 0; i < count; i++) {
      this.lightPoints.push({
        progress: (i / count) + (Math.random() * 0.1),
        speed: 40,
        size: this.isMobile() ? 3 : (2 + Math.random() * 1)
      });
    }
  }

  public triggerDisappear(): void {
    this.state = 'disappearing';
    this.animProgress = 0;
  }

  public update(dt: number, cards: Map<string, Card>): void {
    const fromCard = cards.get(this.fromCardId);
    const toCard = cards.get(this.toCardId);

    if (!fromCard || !toCard) return;

    if (this.needsRecalc) {
      this.recalcCurve(fromCard, toCard);
      this.needsRecalc = false;
    }

    if (this.lightPoints.length === 0 && this.cachedLength > 0) {
      this.initLightPoints();
    }

    for (const point of this.lightPoints) {
      point.progress += (point.speed * dt) / this.cachedLength;
      if (point.progress >= 1) {
        point.progress -= 1;
      }
    }

    switch (this.state) {
      case 'appearing':
        this.animProgress = Math.min(1, this.animProgress + dt / 0.5);
        this.opacity = this.animProgress;
        if (this.animProgress >= 1) {
          this.state = 'idle';
        }
        break;
      case 'idle':
        this.opacity = 1;
        break;
      case 'disappearing':
        this.animProgress = Math.min(1, this.animProgress + dt / 0.3);
        this.opacity = 1 - this.animProgress;
        break;
    }
  }

  private recalcCurve(fromCard: Card, toCard: Card): void {
    const samples = 50;
    this._cachedPoints = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = this.getBezierPoint(t, fromCard, toCard);
      this._cachedPoints.push(p);
    }

    let length = 0;
    for (let i = 1; i < this._cachedPoints.length; i++) {
      const dx = this._cachedPoints[i].x - this._cachedPoints[i - 1].x;
      const dy = this._cachedPoints[i].y - this._cachedPoints[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    this.cachedLength = length;
  }

  private getBezierPoint(t: number, fromCard: Card, toCard: Card): { x: number; y: number } {
    const p0 = { x: fromCard.centerX, y: fromCard.centerY };
    const p3 = { x: toCard.centerX, y: toCard.centerY };
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.max(40, dist * 0.35);

    const angle1 = Math.atan2(dy, dx) - Math.PI / 6;
    const angle2 = Math.atan2(dy, dx) + Math.PI - Math.PI / 6;

    const p1 = {
      x: p0.x + Math.cos(angle1) * offset,
      y: p0.y + Math.sin(angle1) * offset
    };
    const p2 = {
      x: p3.x + Math.cos(angle2) * offset,
      y: p3.y + Math.sin(angle2) * offset
    };

    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
    };
  }

  private getPointAtProgress(progress: number, fromCard: Card, toCard: Card): { x: number; y: number } {
    if (!this._cachedPoints || this._cachedPoints.length === 0) {
      return this.getBezierPoint(progress, fromCard, toCard);
    }
    const targetDist = progress * this.cachedLength;
    let accDist = 0;

    for (let i = 1; i < this._cachedPoints.length; i++) {
      const prev = this._cachedPoints[i - 1];
      const curr = this._cachedPoints[i];
      const segDx = curr.x - prev.x;
      const segDy = curr.y - prev.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);

      if (accDist + segLen >= targetDist) {
        const segT = (targetDist - accDist) / segLen;
        return {
          x: prev.x + segDx * segT,
          y: prev.y + segDy * segT
        };
      }
      accDist += segLen;
    }

    return this._cachedPoints[this._cachedPoints.length - 1];
  }

  public draw(ctx: CanvasRenderingContext2D, cards: Map<string, Card>): void {
    const fromCard = cards.get(this.fromCardId);
    const toCard = cards.get(this.toCardId);
    if (!fromCard || !toCard) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const fromColor = this.hexToRgb(fromCard.color[0]);
    const toColor = this.hexToRgb(toCard.color[1]);

    const gradient = ctx.createLinearGradient(
      fromCard.centerX, fromCard.centerY,
      toCard.centerX, toCard.centerY
    );
    gradient.addColorStop(0, `rgba(${fromColor!.r}, ${fromColor!.g}, ${fromColor!.b}, 0.45)`);
    gradient.addColorStop(0.5, `rgba(${(fromColor!.r + toColor!.r) / 2}, ${(fromColor!.g + toColor!.g) / 2}, ${(fromColor!.b + toColor!.b) / 2}, 0.55)`);
    gradient.addColorStop(1, `rgba(${toColor!.r}, ${toColor!.g}, ${toColor!.b}, 0.45)`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const p0 = { x: fromCard.centerX, y: fromCard.centerY };
    const p3 = { x: toCard.centerX, y: toCard.centerY };
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.max(40, dist * 0.35);
    const angle1 = Math.atan2(dy, dx) - Math.PI / 6;
    const angle2 = Math.atan2(dy, dx) + Math.PI - Math.PI / 6;
    const p1 = { x: p0.x + Math.cos(angle1) * offset, y: p0.y + Math.sin(angle1) * offset };
    const p2 = { x: p3.x + Math.cos(angle2) * offset, y: p3.y + Math.sin(angle2) * offset };

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.stroke();

    for (const point of this.lightPoints) {
      const pos = this.getPointAtProgress(point.progress, fromCard, toCard);
      const p = this.getPointAtProgress(Math.max(0, point.progress - 0.03), fromCard, toCard);
      const trailGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, point.size * 3);
      trailGrad.addColorStop(0, 'rgba(220, 235, 255, 0.95)');
      trailGrad.addColorStop(0.3, 'rgba(180, 210, 255, 0.6)');
      trailGrad.addColorStop(1, 'rgba(120, 160, 255, 0)');
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, point.size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(240, 248, 255, 1)';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, point.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  public toJSON(): LinkData {
    return {
      id: this.id,
      fromCardId: this.fromCardId,
      toCardId: this.toCardId
    };
  }

  public static fromJSON(data: LinkData): Link {
    const link = new Link(data.id, data.fromCardId, data.toCardId);
    link.state = 'appearing';
    link.opacity = 0;
    link.animProgress = 0;
    return link;
  }
}
