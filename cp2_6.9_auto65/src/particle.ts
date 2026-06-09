export interface ParticleConfig {
  x: number;
  y: number;
  baseHue: number;
  baseSaturation: number;
  baseLightness: number;
  isGolden?: boolean;
}

export class Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  life: number;
  maxLife: number;
  time: number;
  sineAmplitude: number;
  sineFrequency: number;
  isGolden: boolean;
  dead: boolean;
  circularAngle?: number;
  circularSpeed?: number;
  circularRadius?: number;
  originX?: number;
  originY?: number;

  constructor(config: ParticleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.radius = config.isGolden ? 2 : 3 + Math.random() * 3;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    const hueOffset = (Math.random() - 0.5) * 0.2;
    this.hue = config.baseHue * (1 + hueOffset);
    this.saturation = config.baseSaturation;
    this.lightness = 50 + Math.random() * 20;
    this.alpha = 1;
    this.life = 0;
    this.maxLife = 2 * 60;
    this.time = Math.random() * 100;
    this.sineAmplitude = 2;
    this.sineFrequency = 0.05;
    this.isGolden = config.isGolden || false;
    this.dead = false;

    if (this.isGolden) {
      this.originX = config.x;
      this.originY = config.y;
      this.circularAngle = Math.random() * Math.PI * 2;
      this.circularSpeed = 0.02 + Math.random() * 0.03;
      this.circularRadius = 0;
    }
  }

  update(): void {
    this.time++;
    this.life++;

    if (this.isGolden) {
      this.circularRadius! += 1.5;
      this.circularAngle! += this.circularSpeed!;
      this.x = this.originX! + Math.cos(this.circularAngle!) * this.circularRadius!;
      this.y = this.originY! + Math.sin(this.circularAngle!) * this.circularRadius!;
    } else {
      const sineY = Math.sin(this.time * this.sineFrequency) * this.sineAmplitude;
      this.x += this.vx;
      this.y += this.vy + sineY * 0.05;
    }

    if (this.life > this.maxLife * 0.6) {
      this.alpha = 1 - (this.life - this.maxLife * 0.6) / (this.maxLife * 0.4);
    }

    if (this.life >= this.maxLife || this.alpha <= 0) {
      this.dead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    if (this.isGolden) {
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius
      );
      gradient.addColorStop(0, 'rgba(255, 223, 0, 1)');
      gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${this.alpha})`;
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
