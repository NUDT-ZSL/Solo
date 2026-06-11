export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  active: boolean;
  life: number;
  maxLife: number;

  update(dt: number, width: number, height: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  reset(width: number, height: number): void;
  init(width: number, height: number, fromTop?: boolean): void;
}

export abstract class BaseParticle implements Particle {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public size: number = 1;
  public alpha: number = 1;
  public active: boolean = true;
  public life: number = 0;
  public maxLife: number = 0;

  protected abstract getDefaultSize(): number;
  protected abstract getDefaultSpeed(): { vx: number; vy: number };
  protected abstract getDefaultLife(): number;

  public abstract update(dt: number, width: number, height: number): void;
  public abstract draw(ctx: CanvasRenderingContext2D): void;

  public reset(width: number, height: number): void {
    this.init(width, height, false);
  }

  public init(width: number, height: number, fromTop: boolean = false): void {
    this.active = true;
    this.alpha = 1;
    this.size = this.getDefaultSize();
    const speed = this.getDefaultSpeed();
    this.vx = speed.vx;
    this.vy = speed.vy;
    this.maxLife = this.getDefaultLife();
    this.life = this.maxLife;

    if (fromTop) {
      this.x = Math.random() * width;
      this.y = -this.size * 2;
    } else {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
    }
  }
}

export class SunParticle extends BaseParticle {
  private pulsePhase: number = 0;
  private pulseSpeed: number = 0;
  private swayOffset: number = 0;
  private swaySpeed: number = 0;
  private swayAmplitude: number = 0;

  protected getDefaultSize(): number {
    return 1.5 + Math.random() * 4;
  }

  protected getDefaultSpeed(): { vx: number; vy: number } {
    return {
      vx: 0,
      vy: -(0.3 + Math.random() * 0.7)
    };
  }

  protected getDefaultLife(): number {
    return 3 + Math.random() * 4;
  }

  public override init(width: number, height: number, fromTop: boolean = false): void {
    super.init(width, height, fromTop);
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 1 + Math.random() * 2;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.5 + Math.random() * 1;
    this.swayAmplitude = 10 + Math.random() * 25;
    this.y = height + Math.random() * height * 0.5;
  }

  public update(dt: number, width: number, height: number): void {
    if (!this.active) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    this.pulsePhase += this.pulseSpeed * dt;
    this.swayOffset += this.swaySpeed * dt;

    this.x += Math.sin(this.swayOffset) * this.swayAmplitude * dt * 0.1;
    this.y += this.vy * 60 * dt;

    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio < 0.3) {
      this.alpha = lifeRatio / 0.3;
    } else if (lifeRatio > 0.8) {
      this.alpha = (1 - lifeRatio) / 0.2;
    } else {
      this.alpha = 1;
    }

    if (this.y < -this.size * 2) {
      this.active = false;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.15;
    const size = this.size * pulseScale;
    const a = this.alpha;

    ctx.globalAlpha = a * 0.3;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = a * 0.6;
    ctx.fillStyle = '#FFB347';
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = a;
    ctx.fillStyle = '#FFFFD4';
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  public override reset(width: number, height: number): void {
    this.init(width, height, false);
    this.y = height + this.size * 2;
  }
}

export class RainParticle extends BaseParticle {
  private length: number = 0;

  protected getDefaultSize(): number {
    return 0.8 + Math.random() * 1.5;
  }

  protected getDefaultSpeed(): { vx: number; vy: number } {
    return {
      vx: -0.3 + Math.random() * 0.2,
      vy: 8 + Math.random() * 5
    };
  }

  protected getDefaultLife(): number {
    return 10;
  }

  public override init(width: number, height: number, fromTop: boolean = false): void {
    super.init(width, height, fromTop);
    this.length = 8 + Math.random() * 15;
    this.alpha = 0.25 + Math.random() * 0.4;
  }

  public update(dt: number, width: number, height: number): void {
    if (!this.active) return;

    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;

    if (this.y > height) {
      this.active = false;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = '#96C8FF';
    ctx.lineWidth = this.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.vx * 2, this.y + this.length);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  public override reset(width: number, height: number): void {
    this.init(width, height, true);
  }
}

export class SnowParticle extends BaseParticle {
  private rotation: number = 0;
  private rotationSpeed: number = 0;
  private swayOffset: number = 0;
  private swaySpeed: number = 0;
  private flakeType: number = 0;

  protected getDefaultSize(): number {
    return 1.5 + Math.random() * 4;
  }

  protected getDefaultSpeed(): { vx: number; vy: number } {
    return {
      vx: 0,
      vy: 0.8 + Math.random() * 1.5
    };
  }

  protected getDefaultLife(): number {
    return 15;
  }

  public override init(width: number, height: number, fromTop: boolean = false): void {
    super.init(width, height, fromTop);
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.4 + Math.random() * 1.2;
    const rand = Math.random();
    if (rand < 0.7) {
      this.flakeType = 2;
    } else if (rand < 0.9) {
      this.flakeType = 1;
    } else {
      this.flakeType = 0;
    }
    this.alpha = 0.5 + Math.random() * 0.4;
  }

  public update(dt: number, width: number, height: number): void {
    if (!this.active) return;

    this.rotation += this.rotationSpeed * dt;
    this.swayOffset += this.swaySpeed * dt;

    this.x += Math.sin(this.swayOffset) * 25 * dt;
    this.y += this.vy * 40 * dt;

    if (this.y > height + this.size * 2) {
      this.active = false;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#FFFFFF';

    const s = this.size;

    if (this.flakeType === 2) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.flakeType === 1) {
      this.drawSimpleStar(ctx, s);
    } else {
      this.drawSimpleFlake(ctx, s);
    }

    ctx.globalAlpha = 1;
  }

  private drawSimpleFlake(ctx: CanvasRenderingContext2D, s: number): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSimpleStar(ctx: CanvasRenderingContext2D, s: number): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * 0.5);

    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
      ctx.moveTo(0, 0);
      ctx.lineTo(-Math.cos(angle) * s * 0.7, -Math.sin(angle) * s * 0.7);
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }

  public override reset(width: number, height: number): void {
    this.init(width, height, true);
  }
}

export class ThunderParticle extends BaseParticle {
  private flashTimer: number = 0;
  private flashDuration: number = 0;
  private isFlashing: boolean = false;
  private endX: number = 0;
  private endY: number = 0;
  private mid1X: number = 0;
  private mid1Y: number = 0;
  private mid2X: number = 0;
  private mid2Y: number = 0;

  protected getDefaultSize(): number {
    return 1.5 + Math.random() * 3;
  }

  protected getDefaultSpeed(): { vx: number; vy: number } {
    return {
      vx: 0,
      vy: 0
    };
  }

  protected getDefaultLife(): number {
    return 0.15 + Math.random() * 0.25;
  }

  public override init(width: number, height: number, fromTop: boolean = false): void {
    super.init(width, height, fromTop);
    this.flashTimer = 0;
    this.flashDuration = 0.04 + Math.random() * 0.1;
    this.isFlashing = true;
    this.alpha = 0.9;

    const boltLength = 60 + Math.random() * 120;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;

    this.endX = this.x + Math.cos(angle) * boltLength;
    this.endY = this.y + Math.sin(angle) * boltLength;

    const mid1 = 0.3 + Math.random() * 0.15;
    const mid2 = 0.65 + Math.random() * 0.15;
    const offset1 = (Math.random() - 0.5) * 25;
    const offset2 = (Math.random() - 0.5) * 20;

    this.mid1X = this.x + (this.endX - this.x) * mid1 + offset1;
    this.mid1Y = this.y + (this.endY - this.y) * mid1 + offset1 * 0.5;
    this.mid2X = this.x + (this.endX - this.x) * mid2 + offset2;
    this.mid2Y = this.y + (this.endY - this.y) * mid2 + offset2 * 0.5;
  }

  public update(dt: number, width: number, height: number): void {
    if (!this.active) return;

    this.flashTimer += dt;

    if (this.flashTimer > this.flashDuration) {
      this.isFlashing = !this.isFlashing;
      this.flashTimer = 0;
      this.flashDuration = 0.025 + Math.random() * 0.06;
    }

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
    }

    this.alpha = this.isFlashing ? 0.9 : 0.2;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const a = this.alpha;

    ctx.globalAlpha = a * 0.5;
    ctx.strokeStyle = '#9F7AEA';
    ctx.lineWidth = this.size * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.mid1X, this.mid1Y);
    ctx.lineTo(this.mid2X, this.mid2Y);
    ctx.lineTo(this.endX, this.endY);
    ctx.stroke();

    ctx.globalAlpha = a;
    ctx.strokeStyle = '#FED7E2';
    ctx.lineWidth = this.size * 0.5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.mid1X, this.mid1Y);
    ctx.lineTo(this.mid2X, this.mid2Y);
    ctx.lineTo(this.endX, this.endY);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  public override reset(width: number, height: number): void {
    this.init(width, height, true);
  }
}

export type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'thunder';

export class ParticleFactory {
  public static create(type: WeatherType): Particle {
    switch (type) {
      case 'sunny':
        return new SunParticle();
      case 'rainy':
        return new RainParticle();
      case 'snowy':
        return new SnowParticle();
      case 'thunder':
        return new ThunderParticle();
      default:
        return new SunParticle();
    }
  }
}
