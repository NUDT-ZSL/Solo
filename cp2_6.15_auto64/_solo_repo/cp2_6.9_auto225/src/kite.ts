import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

export interface WindData {
  direction: number;
  speed: number;
  intensity: number;
}

export interface BellParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  life: number;
}

export class Kite {
  public x: number;
  public y: number;
  public targetX: number;
  public targetY: number;
  public rotation: number = 0;
  public targetRotation: number = 0;
  public yOffset: number = 0;
  public targetYOffset: number = 0;
  public wingspan: number = 120;
  public height: number = 80;
  public wingBend: number = 0;
  public targetWingBend: number = 0;
  public bellStrings: { x: number; y: number; bells: { x: number; y: number; size: number; sparkle: number }[] }[] = [];
  public shakeTime: number = 0;
  public shakeIntensity: number = 0;
  public burstTime: number = 0;
  public burstX: number = 0;
  public burstY: number = 0;
  public sparkleParticles: BellParticle[] = [];
  private time: number = 0;
  private baseY: number;

  constructor(centerX: number, centerY: number) {
    this.x = centerX;
    this.y = centerY;
    this.targetX = centerX;
    this.targetY = centerY;
    this.baseY = centerY;
    this.initBellStrings();
  }

  private initBellStrings(): void {
    this.bellStrings = [];
    const stringCount = 3;
    const spacing = this.wingspan * 0.35;
    for (let i = 0; i < stringCount; i++) {
      const offsetX = (i - (stringCount - 1) / 2) * spacing;
      const bells: { x: number; y: number; size: number; sparkle: number }[] = [];
      for (let j = 0; j < 5; j++) {
        bells.push({ x: 0, y: 0, size: 8, sparkle: Math.random() });
      }
      this.bellStrings.push({ x: offsetX, y: this.height * 0.4, bells });
    }
  }

  public update(dt: number, wind: WindData, centerX: number, centerY: number): void {
    this.time += dt;
    this.baseY = centerY;

    this.targetRotation = wind.direction;
    this.targetYOffset = (wind.speed - 5) * 10;
    this.targetYOffset = Math.max(-50, Math.min(50, this.targetYOffset));
    this.targetWingBend = wind.speed * 2;
    this.targetWingBend = Math.max(0, Math.min(20, this.targetWingBend));

    const easing = 0.08;
    this.rotation += (this.targetRotation - this.rotation) * easing;
    this.rotation = Math.max(-15, Math.min(15, this.rotation));
    this.yOffset += (this.targetYOffset - this.yOffset) * easing;
    this.wingBend += (this.targetWingBend - this.wingBend) * easing;

    const sineAmp = 3 + (wind.speed / 10) * 5;
    const sinePeriod = 1 + (wind.speed / 10);
    const sineX = Math.sin(this.time * sinePeriod) * sineAmp;
    const sineY = Math.cos(this.time * sinePeriod * 0.7) * sineAmp * 0.5;

    const noiseVal = noise2D(this.time * 0.5, 0) * wind.speed * 0.5;

    this.targetX = centerX + sineX + noiseVal;
    this.targetY = this.baseY + this.yOffset + sineY;

    this.x += (this.targetX - this.x) * easing;
    this.y += (this.targetY - this.y) * easing;

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      this.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.9;
    }

    if (this.burstTime > 0) {
      this.burstTime -= dt;
    }

    this.updateBellStrings(wind);
    this.updateSparkles(dt, wind);
  }

  private updateBellStrings(wind: WindData): void {
    for (let si = 0; si < this.bellStrings.length; si++) {
      const str = this.bellStrings[si];
      const baseAngle = (wind.direction * Math.PI) / 180;
      for (let bi = 0; bi < str.bells.length; bi++) {
        const bell = str.bells[bi];
        const bellY = 20 + bi * 22;
        const sway = Math.sin(this.time * 2 + bi * 0.5 + si) * (3 + wind.speed * 0.3);
        bell.x = str.x + sway + Math.sin(baseAngle) * bellY * 0.3;
        bell.y = str.y + bellY + Math.cos(baseAngle) * bellY * 0.1;
        bell.sparkle = (bell.sparkle + 0.02 + wind.speed * 0.005) % 1;
      }
    }
  }

  private updateSparkles(dt: number, wind: WindData): void {
    for (const str of this.bellStrings) {
      const lastBell = str.bells[str.bells.length - 1];
      if (Math.random() < 0.3 + wind.speed * 0.02) {
        this.sparkleParticles.push({
          x: this.x + lastBell.x,
          y: this.y + lastBell.y,
          size: 2 + Math.random() * 3,
          alpha: 0.6 + Math.random() * 0.4,
          life: 0.5 + Math.random() * 1.0
        });
      }
    }

    for (let i = this.sparkleParticles.length - 1; i >= 0; i--) {
      const p = this.sparkleParticles[i];
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 1.5);
      if (p.life <= 0) {
        this.sparkleParticles.splice(i, 1);
      }
    }
  }

  public triggerShake(x: number, y: number): void {
    this.shakeTime = 0.3;
    this.shakeIntensity = 8;
    this.burstTime = 0.3;
    this.burstX = x;
    this.burstY = y;
  }

  public getTailEndPositions(): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    for (const str of this.bellStrings) {
      const lastBell = str.bells[str.bells.length - 1];
      positions.push({ x: this.x + lastBell.x, y: this.y + lastBell.y });
    }
    return positions;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    this.drawWings(ctx);
    this.drawFrame(ctx);
    this.drawBellStrings(ctx);

    ctx.restore();

    this.drawSparkles(ctx);
    this.drawBurst(ctx);
  }

  private drawWings(ctx: CanvasRenderingContext2D): void {
    const halfWing = this.wingspan / 2;
    const bend = this.wingBend;

    const gradient = ctx.createRadialGradient(0, -5, 10, 0, 0, halfWing);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.5, '#FFEDC8');
    gradient.addColorStop(1, '#FFEDC8');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -this.height * 0.3);
    ctx.quadraticCurveTo(halfWing * 0.3, -this.height * 0.1 + bend * 0.3, halfWing, bend);
    ctx.quadraticCurveTo(halfWing * 0.5, this.height * 0.3, 0, this.height * 0.4);
    ctx.quadraticCurveTo(-halfWing * 0.5, this.height * 0.3, -halfWing, bend);
    ctx.quadraticCurveTo(-halfWing * 0.3, -this.height * 0.1 + bend * 0.3, 0, -this.height * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#E8D5B7';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(-halfWing, bend);
    ctx.quadraticCurveTo(-halfWing * 0.3, -this.height * 0.1 + bend * 0.3, 0, -this.height * 0.3);
    ctx.quadraticCurveTo(halfWing * 0.3, -this.height * 0.1 + bend * 0.3, halfWing, bend);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-halfWing * 0.6, bend * 0.5 + 5);
    ctx.quadraticCurveTo(0, -this.height * 0.05 + bend * 0.2, halfWing * 0.6, bend * 0.5 + 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -this.height * 0.3);
    ctx.lineTo(0, this.height * 0.4);
    ctx.stroke();
  }

  private drawFrame(ctx: CanvasRenderingContext2D): void {
    const halfWing = this.wingspan / 2;
    const bend = this.wingBend;

    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(-halfWing * 0.8, bend * 0.7);
    ctx.lineTo(halfWing * 0.8, bend * 0.7);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(0, -this.height * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBellStrings(ctx: CanvasRenderingContext2D): void {
    for (const str of this.bellStrings) {
      ctx.strokeStyle = '#8B7355';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(str.x, str.y - 10);
      for (let bi = 0; bi < str.bells.length; bi++) {
        const bell = str.bells[bi];
        ctx.lineTo(bell.x, bell.y);
      }
      ctx.stroke();

      for (let bi = 0; bi < str.bells.length; bi++) {
        const bell = str.bells[bi];
        const sparkleAlpha = 0.5 + 0.5 * Math.sin(bell.sparkle * Math.PI * 2);

        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 6 * sparkleAlpha;

        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.arc(bell.x, bell.y, bell.size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 215, 0, ${sparkleAlpha})`;
        ctx.beginPath();
        ctx.arc(bell.x - 1, bell.y - 1, bell.size / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
      }
    }
  }

  private drawSparkles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.sparkleParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBurst(ctx: CanvasRenderingContext2D): void {
    if (this.burstTime <= 0) return;

    const progress = 1 - this.burstTime / 0.3;
    const radius = 40 * progress;
    const alpha = 1 - progress;

    const gradient = ctx.createRadialGradient(
      this.burstX, this.burstY, 0,
      this.burstX, this.burstY, radius
    );
    gradient.addColorStop(0, `rgba(255, 107, 53, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(255, 165, 0, ${alpha * 0.7})`);
    gradient.addColorStop(1, `rgba(255, 215, 0, 0)`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.burstX, this.burstY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
