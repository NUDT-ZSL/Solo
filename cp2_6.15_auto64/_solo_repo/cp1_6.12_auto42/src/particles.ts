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
      this.y = -this.size * 2 - Math.random() * height * 0.3;
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
    return 1.5 + Math.random() * 3;
  }

  protected getDefaultSpeed(): { vx: number; vy: number } {
    return {
      vx: 0,
      vy: -(0.2 + Math.random() * 0.6)
    };
  }

  protected getDefaultLife(): number {
    return 3 + Math.random() * 4;
  }

  public override init(width: number, height: number, fromTop: boolean = false): void {
    super.init(width, height, fromTop);
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.8 + Math.random() * 1.5;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.4 + Math.random() * 0.8;
    this.swayAmplitude = 8 + Math.random() * 20;
    this.y = height * Math.random();
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

    ctx.globalAlpha = a * 0.25;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = '#FFB347';
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = a;
    ctx.fillStyle = '#FFFFD4';
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  public override reset(width: number, height: number): void {
    this.init(width, height, false);
    this.y = height + this.size * 2 + Math.random() * 50;
  }
}

export class RainParticle extends BaseParticle {
  private length: number = 0;
  private endX: number = 0;
  private endY: number = 0;

  protected getDefaultSize(): number {
    return 0.6 + Math.random() * 1.2;
  }

  protected getDefaultSpeed(): { vx: number; vy: number } {
    return {
      vx: -0.2 + Math.random() * 0.15,
      vy: 7 + Math.random() * 4
    };
  }

  protected getDefaultLife(): number {
    return 10;
  }

  public override init(width: number, height: number, fromTop: boolean = false): void {
    super.init(width, height, fromTop);
    this.length = 8 + Math.random() * 12;
    this.alpha = 0.2 + Math.random() * 0.35;
    this.updateEndpoints();
  }

  private updateEndpoints(): void {
    this.endX = this.x + this.vx * 2;
    this.endY = this.y + this.length;
  }

  public update(dt: number, width: number, height: number): void {
    if (!this.active) return;

    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
    this.endX += this.vx * 60 * dt;
    this.endY += this.vy * 60 * dt;

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
    ctx.lineTo(this.endX, this.endY);
    ctx.stroke();
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
  private sinRot: number = 0;
  private cosRot: number = 0;

  protected getDefaultSize(): number {
    return 1.2 + Math.random() * 3;
  }

  protected getDefaultSpeed(): { vx: number; vy: number } {
    return {
      vx: 0,
      vy: 0.6 + Math.random() * 1.2
    };
  }

  protected getDefaultLife(): number {
    return 15;
  }

  public override init(width: number, height: number, fromTop: boolean = false): void {
    super.init(width, height, fromTop);
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 1.5;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.3 + Math.random() * 0.8;

    const rand = Math.random();
    if (rand < 0.85) {
      this.flakeType = 2;
    } else if (rand < 0.95) {
      this.flakeType = 1;
    } else {
      this.flakeType = 0;
    }

    this.alpha = 0.4 + Math.random() * 0.4;
    this.updateTrig();
  }

  private updateTrig(): void {
    this.sinRot = Math.sin(this.rotation);
    this.cosRot = Math.cos(this.rotation);
  }

  public update(dt: number, width: number, height: number): void {
    if (!this.active) return;

    this.rotation += this.rotationSpeed * dt;
    this.swayOffset += this.swaySpeed * dt;
    this.updateTrig();

    this.x += Math.sin(this.swayOffset) * 20 * dt;
    this.y += this.vy * 40 * dt;

    if (this.y > height + this.size * 2) {
      this.active = false;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';

    const s = this.size;

    if (this.flakeType === 2) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.flakeType === 1) {
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + this.rotation * 0.3;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(angle) * s, this.y + Math.sin(angle) * s);
      }
      ctx.stroke();
    } else {
      ctx.lineWidth = 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + this.rotation;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(angle) * s * 0.8, this.y + Math.sin(angle) * s * 0.8);
      }
      ctx.stroke();
    }
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

  protected getDefaultSize(): number {
    return 1.2 + Math.random() * 2;
  }

  protected getDefaultSpeed(): { vx: number; vy: number } {
    return {
      vx: 0,
      vy: 0
    };
  }

  protected getDefaultLife(): number {
    return 0.12 + Math.random() * 0.2;
  }

  public override init(width: number, height: number, fromTop: boolean = false): void {
    super.init(width, height, fromTop);
    this.flashTimer = 0;
    this.flashDuration = 0.03 + Math.random() * 0.08;
    this.isFlashing = true;
    this.alpha = 0.9;

    const boltLength = 50 + Math.random() * 100;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;

    this.endX = this.x + Math.cos(angle) * boltLength;
    this.endY = this.y + Math.sin(angle) * boltLength;

    const mid = 0.4 + Math.random() * 0.2;
    const offset = (Math.random() - 0.5) * 20;

    this.mid1X = this.x + (this.endX - this.x) * mid + offset;
    this.mid1Y = this.y + (this.endY - this.y) * mid + offset * 0.5;
  }

  public update(dt: number, width: number, height: number): void {
    if (!this.active) return;

    this.flashTimer += dt;

    if (this.flashTimer > this.flashDuration) {
      this.isFlashing = !this.isFlashing;
      this.flashTimer = 0;
      this.flashDuration = 0.02 + Math.random() * 0.05;
    }

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
    }

    this.alpha = this.isFlashing ? 0.9 : 0.15;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const a = this.alpha;

    ctx.globalAlpha = a * 0.4;
    ctx.strokeStyle = '#9F7AEA';
    ctx.lineWidth = this.size * 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.mid1X, this.mid1Y);
    ctx.lineTo(this.endX, this.endY);
    ctx.stroke();

    ctx.globalAlpha = a;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = this.size * 0.4;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.mid1X, this.mid1Y);
    ctx.lineTo(this.endX, this.endY);
    ctx.stroke();
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
