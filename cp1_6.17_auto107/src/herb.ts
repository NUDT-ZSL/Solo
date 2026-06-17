export interface HerbClusterConfig {
  centerX: number;
  baseY: number;
  count: number;
  maxHarvests: number;
}

interface SingleHerb {
  x: number;
  y: number;
  height: number;
  isHovered: boolean;
  hoverStartTime: number;
  isHarvesting: boolean;
  harvestStartTime: number;
  harvestOffsetY: number;
  harvestScale: number;
  active: boolean;
}

export class HerbCluster {
  private centerX: number;
  private baseY: number;
  private herbs: SingleHerb[] = [];
  private maxHarvests: number;
  private remainingHarvests: number;
  private hoverTransitionDuration: number = 200;
  private harvestDuration: number = 600;
  private glowRadius: number = 10;

  constructor(config: HerbClusterConfig) {
    this.centerX = config.centerX;
    this.baseY = config.baseY;
    this.maxHarvests = config.maxHarvests;
    this.remainingHarvests = config.maxHarvests;
    this.initHerbs(config.count);
  }

  private initHerbs(count: number): void {
    for (let i = 0; i < count; i++) {
      const offsetX = (i - (count - 1) / 2) * 15 + (Math.random() - 0.5) * 10;
      this.herbs.push({
        x: this.centerX + offsetX,
        y: this.baseY,
        height: 20 + Math.random() * 10,
        isHovered: false,
        hoverStartTime: 0,
        isHarvesting: false,
        harvestStartTime: 0,
        harvestOffsetY: 0,
        harvestScale: 1,
        active: true
      });
    }
  }

  public getRemainingHarvests(): number {
    return this.remainingHarvests;
  }

  public getMaxHarvests(): number {
    return this.maxHarvests;
  }

  public reset(): void {
    this.remainingHarvests = this.maxHarvests;
    for (const herb of this.herbs) {
      herb.active = true;
      herb.isHarvesting = false;
      herb.harvestOffsetY = 0;
      herb.harvestScale = 1;
    }
  }

  public checkHover(mouseX: number, mouseY: number, currentTime: number): boolean {
    if (this.remainingHarvests <= 0) return false;

    let anyHovered = false;
    for (const herb of this.herbs) {
      if (!herb.active) continue;

      const dist = Math.sqrt(
        Math.pow(mouseX - herb.x, 2) +
        Math.pow(mouseY - (herb.y - herb.height / 2), 2)
      );

      if (dist < 20) {
        if (!herb.isHovered) {
          herb.isHovered = true;
          herb.hoverStartTime = currentTime;
        }
        anyHovered = true;
      } else {
        if (herb.isHovered) {
          herb.isHovered = false;
          herb.hoverStartTime = currentTime;
        }
      }
    }
    return anyHovered;
  }

  public checkClick(mouseX: number, mouseY: number, currentTime: number): boolean {
    if (this.remainingHarvests <= 0) return false;

    for (const herb of this.herbs) {
      if (!herb.active) continue;

      const dist = Math.sqrt(
        Math.pow(mouseX - herb.x, 2) +
        Math.pow(mouseY - (herb.y - herb.height / 2), 2)
      );

      if (dist < 25) {
        this.triggerHarvest(herb, currentTime);
        return true;
      }
    }
    return false;
  }

  private triggerHarvest(herb: SingleHerb, currentTime: number): void {
    if (herb.isHarvesting) return;
    herb.isHarvesting = true;
    herb.harvestStartTime = currentTime;
    this.remainingHarvests--;
  }

  public update(_deltaTime: number, currentTime: number): void {
    for (const herb of this.herbs) {
      if (herb.isHarvesting && herb.active) {
        const elapsed = currentTime - herb.harvestStartTime;
        const t = Math.min(elapsed / this.harvestDuration, 1);

        const easeOut = 1 - Math.pow(1 - t, 3);
        herb.harvestOffsetY = -easeOut * 80;
        herb.harvestScale = 1 - easeOut;

        if (t >= 1) {
          herb.active = false;
          herb.isHarvesting = false;
        }
      }
    }
  }

  public getHoverScale(herb: SingleHerb, currentTime: number): number {
    if (herb.isHovered) {
      const elapsed = currentTime - herb.hoverStartTime;
      const t = Math.min(elapsed / this.hoverTransitionDuration, 1);
      return 1 + 0.1 * t;
    } else {
      const elapsed = currentTime - herb.hoverStartTime;
      const t = Math.min(elapsed / this.hoverTransitionDuration, 1);
      return 1.1 - 0.1 * t;
    }
  }

  public getColor(herb: SingleHerb, currentTime: number): string {
    const normalColor = { r: 232, g: 245, b: 233 };
    const hoverColor = { r: 200, g: 230, b: 201 };

    if (herb.isHovered) {
      const elapsed = currentTime - herb.hoverStartTime;
      const t = Math.min(elapsed / this.hoverTransitionDuration, 1);
      const r = Math.round(normalColor.r + (hoverColor.r - normalColor.r) * t);
      const g = Math.round(normalColor.g + (hoverColor.g - normalColor.g) * t);
      const b = Math.round(normalColor.b + (hoverColor.b - normalColor.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const elapsed = currentTime - herb.hoverStartTime;
      const t = Math.min(elapsed / this.hoverTransitionDuration, 1);
      const r = Math.round(hoverColor.r + (normalColor.r - hoverColor.r) * t);
      const g = Math.round(hoverColor.g + (normalColor.g - hoverColor.g) * t);
      const b = Math.round(hoverColor.b + (normalColor.b - hoverColor.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  public draw(ctx: CanvasRenderingContext2D, currentTime: number): void {
    ctx.save();

    for (const herb of this.herbs) {
      if (!herb.active && !herb.isHarvesting) continue;

      const scale = herb.isHarvesting ? herb.harvestScale : this.getHoverScale(herb, currentTime);
      const offsetY = herb.isHarvesting ? herb.harvestOffsetY : 0;
      const color = this.getColor(herb, currentTime);

      const drawY = herb.y + offsetY;

      if (herb.active && !herb.isHarvesting) {
        const gradient = ctx.createRadialGradient(
          herb.x, drawY - herb.height / 2, 0,
          herb.x, drawY - herb.height / 2, this.glowRadius * scale
        );
        gradient.addColorStop(0, 'rgba(200, 230, 201, 0.4)');
        gradient.addColorStop(1, 'rgba(200, 230, 201, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(herb.x, drawY - herb.height / 2, this.glowRadius * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.strokeStyle = '#81C784';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(herb.x, drawY);
      ctx.lineTo(herb.x - 4 * scale, drawY - herb.height * 0.6 * scale);
      ctx.lineTo(herb.x, drawY - herb.height * scale);
      ctx.lineTo(herb.x + 4 * scale, drawY - herb.height * 0.6 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#A5D6A7';
      ctx.beginPath();
      ctx.ellipse(
        herb.x - 3 * scale,
        drawY - herb.height * 0.35 * scale,
        5 * scale, 3 * scale,
        -Math.PI / 6,
        0, Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        herb.x + 3 * scale,
        drawY - herb.height * 0.5 * scale,
        5 * scale, 3 * scale,
        Math.PI / 6,
        0, Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
