import { Particle } from './particle';

export type EmotionType = 'happy' | 'sad' | 'angry' | 'calm';

export interface FlowerConfig {
  x: number;
  y: number;
  emotion: EmotionType;
}

interface Petal {
  angle: number;
  targetAngle: number;
  currentRotation: number;
  size: number;
  bloomProgress: number;
  flying: boolean;
  flyVx: number;
  flyVy: number;
  flyX: number;
  flyY: number;
  flyScale: number;
  flyAlpha: number;
}

export class Flower {
  x: number;
  y: number;
  emotion: EmotionType;
  petals: Petal[];
  stemHeight: number;
  stemArcHeight: number;
  stemColor: string;
  coreRadius: number;
  coreAlpha: number;
  corePulsePhase: number;
  bloomProgress: number;
  fullyBloomed: boolean;
  dying: boolean;
  dead: boolean;
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  dragDirection: { x: number; y: number };
  deformAmount: number;
  swayAngle: number;
  swayPhase: number;
  hue: number;
  saturation: number;
  particlesToSpawn: number;
  burstParticles: Particle[];
  createdAt: number;

  constructor(config: FlowerConfig) {
    this.x = config.x;
    this.y = config.y;
    this.emotion = config.emotion;
    this.stemHeight = 60 + Math.random() * 40;
    this.stemArcHeight = 20 + Math.random() * 20;
    this.stemColor = '#2ecc71';
    this.coreRadius = 4 + Math.random() * 4;
    this.coreAlpha = 0.6;
    this.corePulsePhase = Math.random() * Math.PI * 2;
    this.bloomProgress = 0;
    this.fullyBloomed = false;
    this.dying = false;
    this.dead = false;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragDirection = { x: 0, y: 0 };
    this.deformAmount = 0;
    this.swayAngle = 0;
    this.swayPhase = Math.random() * Math.PI * 2;
    this.particlesToSpawn = 30 + Math.floor(Math.random() * 21);
    this.burstParticles = [];
    this.createdAt = performance.now();

    this.setupColorByEmotion();
    this.petals = [];
    for (let i = 0; i < 5; i++) {
      const targetAngle = (i / 5) * Math.PI * 2;
      this.petals.push({
        angle: 0,
        targetAngle,
        currentRotation: 0,
        size: 10 + Math.random() * 15,
        bloomProgress: 0,
        flying: false,
        flyVx: 0,
        flyVy: 0,
        flyX: 0,
        flyY: 0,
        flyScale: 1,
        flyAlpha: 1
      });
    }
  }

  private setupColorByEmotion(): void {
    switch (this.emotion) {
      case 'happy':
        this.hue = 30 + Math.random() * 30;
        this.saturation = 80;
        break;
      case 'sad':
        this.hue = 220 + Math.random() * 50;
        this.saturation = 70;
        break;
      case 'angry':
        if (Math.random() < 0.5) {
          this.hue = Math.random() * 20;
        } else {
          this.hue = 300 + Math.random() * 30;
        }
        this.saturation = 90;
        break;
      case 'calm':
        this.hue = 120 + Math.random() * 80;
        this.saturation = 60;
        break;
    }
  }

  update(): Particle[] {
    const newParticles: Particle[] = [];

    this.corePulsePhase += 0.033;
    this.coreAlpha = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(this.corePulsePhase));

    if (!this.fullyBloomed && !this.dying) {
      this.bloomProgress = Math.min(this.bloomProgress + 1 / 60, 1);
      if (this.bloomProgress >= 1) {
        this.fullyBloomed = true;
      }

      for (const petal of this.petals) {
        petal.currentRotation += (2 * Math.PI) / 180;
        petal.angle = petal.targetAngle * this.bloomProgress;
        petal.bloomProgress = this.bloomProgress;
      }

      if (this.particlesToSpawn > 0 && Math.random() < 0.3) {
        newParticles.push(this.createParticle());
        this.particlesToSpawn--;
      }
    }

    if (this.fullyBloomed && !this.dying && !this.isDragging) {
      this.swayPhase += 0.021;
      this.swayAngle = (5 * Math.PI / 180) * Math.sin(this.swayPhase);
    }

    if (this.deformAmount > 0 && !this.isDragging) {
      this.deformAmount *= 0.9;
      if (this.deformAmount < 0.01) {
        this.deformAmount = 0;
      }
    }

    for (const petal of this.petals) {
      if (petal.flying) {
        petal.flyX += petal.flyVx;
        petal.flyY += petal.flyVy;
        petal.flyVx *= 0.98;
        petal.flyVy *= 0.98;
        petal.angle += 0.05;
        petal.flyScale *= 0.97;
        petal.flyAlpha *= 0.97;
        if (petal.flyAlpha < 0.01) {
          this.dead = true;
        }
      }
    }

    for (const p of this.burstParticles) {
      p.update();
    }
    this.burstParticles = this.burstParticles.filter(p => !p.dead);

    return newParticles;
  }

  private createParticle(): Particle {
    return new Particle({
      x: this.x + (Math.random() - 0.5) * 20,
      y: this.y - this.stemHeight * 0.5 + (Math.random() - 0.5) * 20,
      baseHue: this.hue,
      baseSaturation: this.saturation,
      baseLightness: 60
    });
  }

  triggerBurst(): Particle[] {
    if (this.dying) return [];
    this.dying = true;

    for (const petal of this.petals) {
      petal.flying = true;
      const angle = Math.random() * Math.PI * 2;
      petal.flyVx = Math.cos(angle) * 3;
      petal.flyVy = Math.sin(angle) * 3;
    }

    const burst: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      burst.push(new Particle({
        x: this.x,
        y: this.y - this.stemHeight,
        baseHue: 45,
        baseSaturation: 100,
        baseLightness: 60,
        isGolden: true
      }));
    }
    this.burstParticles = burst;
    return burst;
  }

  containsPoint(px: number, py: number): boolean {
    if (this.dying || !this.fullyBloomed) return false;
    const flowerCenterY = this.y - this.stemHeight;
    const maxPetalSize = Math.max(...this.petals.map(p => p.size));
    const dist = Math.sqrt((px - this.x) ** 2 + (py - flowerCenterY) ** 2);
    return dist < maxPetalSize + 15;
  }

  startDrag(px: number, py: number): void {
    this.isDragging = true;
    this.dragOffsetX = px - this.x;
    this.dragOffsetY = py - this.y;
  }

  updateDrag(px: number, py: number): void {
    if (!this.isDragging) return;
    const oldX = this.x;
    const oldY = this.y;
    this.x = px - this.dragOffsetX;
    this.y = py - this.dragOffsetY;
    const dx = this.x - oldX;
    const dy = this.y - oldY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.dragDirection = { x: dx / dist, y: dy / dist };
      this.deformAmount = Math.min(dist * 0.02, 0.5);
    }
  }

  endDrag(): void {
    this.isDragging = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    const drawX = 0;
    const drawY = 0;
    const stemTopY = drawY - this.stemHeight;

    this.drawStem(ctx, drawX, drawY, stemTopY);

    ctx.save();
    ctx.translate(drawX, stemTopY);
    ctx.rotate(this.swayAngle);

    for (const petal of this.petals) {
      this.drawPetal(ctx, petal);
    }

    this.drawCore(ctx);

    ctx.restore();
    ctx.restore();

    for (const p of this.burstParticles) {
      p.draw(ctx);
    }
  }

  private drawStem(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, topY: number): void {
    ctx.save();
    ctx.strokeStyle = this.stemColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    const controlX = baseX + (Math.sin(this.swayPhase) * this.stemArcHeight * 0.5);
    const midY = (baseY + topY) / 2;
    ctx.quadraticCurveTo(
      controlX,
      midY,
      baseX + Math.sin(this.swayPhase) * 5,
      topY
    );
    ctx.stroke();
    ctx.restore();
  }

  private drawPetal(ctx: CanvasRenderingContext2D, petal: Petal): void {
    ctx.save();

    if (petal.flying) {
      ctx.translate(petal.flyX, petal.flyY);
      ctx.globalAlpha = petal.flyAlpha;
    }

    ctx.rotate(petal.angle);

    let scaleX = 1;
    let scaleY = 1;
    if (this.deformAmount > 0 && !petal.flying) {
      scaleX = 1 + this.deformAmount * this.dragDirection.x;
      scaleY = 1 + this.deformAmount * this.dragDirection.y;
    }
    if (petal.flying) {
      scaleX = petal.flyScale;
      scaleY = petal.flyScale;
    }
    ctx.scale(scaleX, scaleY);

    const size = petal.size * petal.bloomProgress;

    if (petal.flying) {
      ctx.fillStyle = `rgba(255, 255, 255, ${petal.flyAlpha})`;
    } else {
      ctx.fillStyle = `hsl(${this.hue}, ${this.saturation}%, ${55 + petal.bloomProgress * 10}%)`;
    }

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
      size * 0.5, -size * 0.5,
      0, -size
    );
    ctx.quadraticCurveTo(
      -size * 0.5, -size * 0.5,
      0, 0
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawCore(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, this.coreRadius * 2
    );
    gradient.addColorStop(0, `rgba(255, 255, 200, ${this.coreAlpha})`);
    gradient.addColorStop(0.5, `rgba(255, 220, 100, ${this.coreAlpha * 0.8})`);
    gradient.addColorStop(1, `rgba(255, 200, 50, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.coreRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 230, ${this.coreAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, this.coreRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
