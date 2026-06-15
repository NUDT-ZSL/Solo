export type PetAction = 'feed' | 'play' | 'sleep' | 'clean' | 'idle';

export interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  clean: number;
}

export interface PetBone {
  x: number;
  y: number;
  angle: number;
  length: number;
}

export class Pet {
  stats: PetStats;
  x: number;
  y: number;
  scale: number;
  targetScale: number;
  scaleTransitionTime: number;
  isAdult: boolean;
  action: PetAction;
  actionTimer: number;
  actionProgress: number;
  globalTime: number;
  shakeOffset: number;

  private readonly BABY_WIDTH = 40;
  private readonly BABY_HEIGHT = 30;
  private readonly ADULT_WIDTH = 60;
  private readonly ADULT_HEIGHT = 45;
  private readonly SCALE_TRANSITION_DURATION = 2;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.stats = { hunger: 70, happiness: 70, energy: 70, clean: 70 };
    this.scale = 1;
    this.targetScale = 1;
    this.scaleTransitionTime = 0;
    this.isAdult = false;
    this.action = 'idle';
    this.actionTimer = 0;
    this.actionProgress = 0;
    this.globalTime = 0;
    this.shakeOffset = 0;
  }

  update(dt: number): void {
    this.globalTime += dt;

    for (const key of Object.keys(this.stats) as (keyof PetStats)[]) {
      const decay = 0.05 + Math.random() * 0.1;
      this.stats[key] = Math.max(0, this.stats[key] - decay * dt);
    }

    const minStat = Math.min(this.stats.hunger, this.stats.happiness, this.stats.energy, this.stats.clean);
    if (minStat < 20) {
      this.shakeOffset = Math.sin(this.globalTime * (Math.PI * 2 / 0.3)) * 2;
    } else {
      this.shakeOffset = 0;
    }

    if (this.scaleTransitionTime > 0) {
      this.scaleTransitionTime -= dt;
      const t = 1 - Math.max(0, this.scaleTransitionTime) / this.SCALE_TRANSITION_DURATION;
      const eased = this.easeInOutCubic(t);
      this.scale = 1 + (this.getAdultScale() - 1) * eased;
    }

    if (this.actionTimer > 0) {
      this.actionTimer -= dt;
      this.actionProgress = 1 - this.actionTimer / 3;
      if (this.actionTimer <= 0) {
        this.action = 'idle';
        this.actionProgress = 0;
      }
    } else {
      this.actionProgress = 0;
    }

    if (this.shouldGrow() && !this.isAdult) {
      this.growToAdult();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const drawX = this.x + this.shakeOffset;
    const drawY = this.y;
    const bounceOffset = this.getActionBounceOffset();

    ctx.save();
    ctx.translate(drawX, drawY + bounceOffset);
    ctx.scale(this.scale, this.scale);

    this.drawBody(ctx);
    this.drawHead(ctx);
    this.drawLegs(ctx);
    this.drawFace(ctx);

    ctx.restore();
  }

  performAction(action: PetAction): void {
    if (this.action !== 'idle') return;

    this.action = action;
    this.actionTimer = 3;
    this.actionProgress = 0;

    switch (action) {
      case 'feed':
        this.stats.hunger = Math.min(100, this.stats.hunger + 30);
        break;
      case 'play':
        this.stats.happiness = Math.min(100, this.stats.happiness + 30);
        this.stats.energy = Math.max(0, this.stats.energy - 10);
        break;
      case 'sleep':
        this.stats.energy = Math.min(100, this.stats.energy + 35);
        break;
      case 'clean':
        this.stats.clean = Math.min(100, this.stats.clean + 35);
        break;
    }
  }

  isSad(): boolean {
    return this.stats.hunger < 20 || this.stats.happiness < 20 ||
           this.stats.energy < 20 || this.stats.clean < 20;
  }

  getWidth(): number {
    return (this.isAdult ? this.ADULT_WIDTH : this.BABY_WIDTH) * this.scale;
  }

  getHeight(): number {
    return (this.isAdult ? this.ADULT_HEIGHT : this.BABY_HEIGHT) * this.scale;
  }

  getTopY(): number {
    return this.y - this.getHeight() / 2;
  }

  private shouldGrow(): boolean {
    return this.stats.hunger >= 50 && this.stats.happiness >= 50 &&
           this.stats.energy >= 50 && this.stats.clean >= 50;
  }

  private growToAdult(): void {
    this.isAdult = true;
    this.targetScale = this.getAdultScale();
    this.scaleTransitionTime = this.SCALE_TRANSITION_DURATION;
  }

  private getAdultScale(): number {
    return this.ADULT_WIDTH / this.BABY_WIDTH;
  }

  private getActionBounceOffset(): number {
    if (this.action !== 'play') return 0;
    const jumpPhase = (this.actionProgress * 9) % 3;
    const jumpT = jumpPhase - Math.floor(jumpPhase);
    return -Math.abs(Math.sin(jumpT * Math.PI)) * 10;
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const w = this.BABY_WIDTH;
    const h = this.BABY_HEIGHT;
    ctx.save();
    ctx.fillStyle = '#FFB74D';
    ctx.strokeStyle = '#F57C00';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, -w / 2, -h / 2 + 6, w, h - 6, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFE0B2';
    this.roundRect(ctx, -w / 4, -h / 4 + 4, w / 2, h / 2, 6);
    ctx.fill();
    ctx.restore();
  }

  private drawHead(ctx: CanvasRenderingContext2D): void {
    const w = this.BABY_WIDTH;
    const h = this.BABY_HEIGHT;
    const headY = -h / 2 + 2;

    ctx.save();
    ctx.fillStyle = '#FFB74D';
    ctx.strokeStyle = '#F57C00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, headY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFB74D';
    ctx.beginPath();
    ctx.moveTo(-12, headY - 8);
    ctx.lineTo(-8, headY - 18);
    ctx.lineTo(-4, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(12, headY - 8);
    ctx.lineTo(8, headY - 18);
    ctx.lineTo(4, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFAB91';
    ctx.beginPath();
    ctx.moveTo(-10, headY - 10);
    ctx.lineTo(-8, headY - 15);
    ctx.lineTo(-6, headY - 11);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(10, headY - 10);
    ctx.lineTo(8, headY - 15);
    ctx.lineTo(6, headY - 11);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawLegs(ctx: CanvasRenderingContext2D): void {
    const h = this.BABY_HEIGHT;
    ctx.save();
    ctx.fillStyle = '#FFB74D';
    ctx.strokeStyle = '#F57C00';
    ctx.lineWidth = 1.5;

    const legY = h / 2 - 4;
    const legBob = Math.sin(this.globalTime * 4) * 0.5;

    ctx.beginPath();
    ctx.ellipse(-10, legY + legBob, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(10, legY - legBob, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawFace(ctx: CanvasRenderingContext2D): void {
    const h = this.BABY_HEIGHT;
    const headY = -h / 2 + 2;
    const isSad = this.isSad();
    const isSleeping = this.action === 'sleep';

    ctx.save();

    if (isSleeping) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-7, headY - 1);
      ctx.lineTo(-3, headY - 1);
      ctx.moveTo(3, headY - 1);
      ctx.lineTo(7, headY - 1);
      ctx.stroke();
    } else if (isSad) {
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(-5, headY - 1, 3, 0, Math.PI * 2);
      ctx.arc(5, headY - 1, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64B5F6';
      ctx.beginPath();
      ctx.arc(-5, headY + 2, 1.5, 0, Math.PI * 2);
      ctx.arc(5, headY + 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-5, headY + 1, 2.5, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(5, headY + 1, 2.5, Math.PI, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#E57373';
    ctx.beginPath();
    ctx.arc(-10, headY + 3, 2, 0, Math.PI * 2);
    ctx.arc(10, headY + 3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(0, headY + 4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (isSad) {
      ctx.arc(0, headY + 8, 2.5, Math.PI * 2, Math.PI);
    } else {
      ctx.arc(0, headY + 6, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    }
    ctx.stroke();

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
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

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
