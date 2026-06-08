import type { WeatherType, WeatherParams } from './weather';

export interface ParticleOptions {
  x: number;
  y: number;
  canvasWidth: number;
  canvasHeight: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  colorEnd: string;
  life: number;
  maxLife: number;
  opacity: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  angle: number;
  angularSpeed: number;
  canvasWidth: number;
  canvasHeight: number;
  weather: WeatherType;
  isSnowflake: boolean;
  snowflakeRotation: number;
  onGround: boolean;
  groundLife: number;
  shakeAmount: number;

  constructor(options: ParticleOptions, weatherParams: WeatherParams, weather: WeatherType, pixelSize: number) {
    this.x = options.x;
    this.y = options.y;
    this.canvasWidth = options.canvasWidth;
    this.canvasHeight = options.canvasHeight;
    this.weather = weather;
    this.size = pixelSize;
    this.color = weatherParams.particleColor;
    this.colorEnd = weatherParams.particleColorEnd;
    this.maxLife = 4000;
    this.life = this.maxLife;
    this.opacity = 0;
    this.wobbleOffset = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.001 + Math.random() * 0.002;
    this.angle = Math.random() * Math.PI * 2;
    this.angularSpeed = (Math.random() - 0.5) * 0.002;
    this.isSnowflake = weather === 'snowy';
    this.snowflakeRotation = Math.random() * Math.PI * 2;
    this.onGround = false;
    this.groundLife = 0;
    this.shakeAmount = weather === 'stormy' ? 2 : 0;

    const baseSpeed = weatherParams.speed;
    if (weather === 'sunny') {
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = -(0.3 + Math.random() * 0.5);
    } else if (weather === 'cloudy') {
      this.vx = (Math.random() - 0.3) * baseSpeed;
      this.vy = Math.random() * 0.3;
    } else if (weather === 'rainy') {
      this.vx = 0;
      this.vy = baseSpeed + Math.random() * 2;
    } else if (weather === 'snowy') {
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = baseSpeed + Math.random() * 0.5;
    } else if (weather === 'stormy') {
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = baseSpeed + Math.random() * 2;
    } else {
      this.vx = (Math.random() - 0.5) * baseSpeed;
      this.vy = (Math.random() - 0.5) * baseSpeed;
    }
  }

  update(deltaTime: number, windSpeed: number, weatherParams: WeatherParams, weather: WeatherType): void {
    this.weather = weather;
    this.color = weatherParams.particleColor;
    this.colorEnd = weatherParams.particleColorEnd;
    this.shakeAmount = weather === 'stormy' ? 3 : 0;
    this.isSnowflake = weather === 'snowy';

    if (this.onGround) {
      this.groundLife += deltaTime;
      this.opacity = Math.max(0, 1 - this.groundLife / 2000);
      return;
    }

    this.life -= deltaTime;

    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio > 0.8) {
      this.opacity = (1 - lifeRatio) * 5;
    } else if (lifeRatio < 0.2) {
      this.opacity = lifeRatio * 5;
    } else {
      this.opacity = 1;
    }

    const wind = windSpeed / 10;

    if (weather === 'sunny') {
      this.angle += this.angularSpeed * deltaTime;
      const spiralRadius = 0.3;
      this.vx = Math.cos(this.angle) * spiralRadius;
      this.vy = -(0.3 + Math.random() * 0.3);
      this.vx += wind * 0.2;
    } else if (weather === 'rainy') {
      this.vy += weatherParams.gravity * deltaTime * 0.01;
      this.vx = wind * 2;
    } else if (weather === 'snowy') {
      this.wobbleOffset += this.wobbleSpeed * deltaTime;
      const wobble = Math.sin(this.wobbleOffset) * weatherParams.wobbleAmount * wind * 3;
      this.vx = wobble * 0.05;
      this.vy = weatherParams.speed + Math.random() * 0.2;
      this.snowflakeRotation += 0.002 * deltaTime;
    } else if (weather === 'stormy') {
      this.vy += weatherParams.gravity * deltaTime * 0.01;
      this.vx = wind * 1.5 + (Math.random() - 0.5) * this.shakeAmount;
    } else if (weather === 'cloudy') {
      this.wobbleOffset += this.wobbleSpeed * deltaTime;
      this.vx = wind * 0.5 + Math.sin(this.wobbleOffset) * weatherParams.wobbleAmount * 0.1;
      this.vy = Math.cos(this.wobbleOffset * 0.7) * 0.1;
    }

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeAmount > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeAmount;
      shakeY = (Math.random() - 0.5) * this.shakeAmount;
    }

    this.x += this.vx * deltaTime * 0.06 + shakeX;
    this.y += this.vy * deltaTime * 0.06 + shakeY;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
    gradient.addColorStop(0, this.colorEnd);
    gradient.addColorStop(1, this.color);

    if (this.isSnowflake) {
      this.drawSnowflake(ctx);
    } else if (this.weather === 'rainy' || this.weather === 'stormy') {
      this.drawRain(ctx);
    } else {
      ctx.fillStyle = gradient;
      this.drawPixelRect(ctx, this.x, this.y, this.size, this.size);
    }

    ctx.restore();
  }

  private drawPixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const px = Math.floor(x);
    const py = Math.floor(y);
    ctx.fillRect(px, py, Math.ceil(w), Math.ceil(h));
  }

  private drawRain(ctx: CanvasRenderingContext2D): void {
    const rainLength = this.size * 4;
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + rainLength);
    gradient.addColorStop(0, this.color + '00');
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, this.colorEnd);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(1, this.size * 0.5);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(Math.floor(this.x), Math.floor(this.y));
    ctx.lineTo(Math.floor(this.x + this.vx * 2), Math.floor(this.y + rainLength));
    ctx.stroke();
  }

  private drawSnowflake(ctx: CanvasRenderingContext2D): void {
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);
    const size = this.size * 1.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.snowflakeRotation);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, this.size * 0.4);
    ctx.lineCap = 'round';

    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * i);
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(size, 0);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = this.colorEnd;
    this.drawPixelRect(ctx, -this.size * 0.3, -this.size * 0.3, this.size * 0.6, this.size * 0.6);

    ctx.restore();
  }

  isDead(): boolean {
    if (this.onGround) {
      return this.groundLife >= 2000;
    }
    if (this.life <= 0) return true;
    if (this.y < -50 || this.y > this.canvasHeight + 50) return true;
    if (this.x < -50 || this.x > this.canvasWidth + 50) return true;
    return false;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.life = this.maxLife;
    this.opacity = 0;
    this.onGround = false;
    this.groundLife = 0;
    this.wobbleOffset = Math.random() * Math.PI * 2;
    this.angle = Math.random() * Math.PI * 2;
  }

  landOnGround(groundY: number): void {
    if (this.isSnowflake && !this.onGround) {
      this.onGround = true;
      this.y = groundY;
      this.groundLife = 0;
      this.vx = 0;
      this.vy = 0;
    }
  }
}
