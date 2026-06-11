import { BubbleColor, NORMAL_COLORS, BUBBLE_COLORS } from './bubble.js';

export interface ShotBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  radius: number;
  active: boolean;
  stuck: boolean;
}

export class Emitter {
  x: number;
  y: number;
  radius: number;
  moveSpeed: number;
  angle: number;
  minAngle: number;
  maxAngle: number;
  currentBubble: BubbleColor;
  nextBubble: BubbleColor;
  shotBubble: ShotBubble | null;
  shootSpeed: number;
  canShoot: boolean;
  pulseTime: number;
  canvasWidth: number;
  canvasHeight: number;
  keys: { left: boolean; right: boolean };
  mouseX: number;
  mouseY: number;
  hasMouse: boolean;
  starMode: boolean;

  constructor(x: number, y: number, radius: number, canvasWidth: number, canvasHeight: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.moveSpeed = 6;
    this.angle = -Math.PI / 2;
    this.minAngle = -Math.PI / 2 - (Math.PI / 3);
    this.maxAngle = -Math.PI / 2 + (Math.PI / 3);
    this.shootSpeed = 14;
    this.canShoot = true;
    this.pulseTime = 0;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.shotBubble = null;
    this.starMode = false;
    this.keys = { left: false, right: false };
    this.mouseX = x;
    this.mouseY = 0;
    this.hasMouse = false;
    this.currentBubble = this.randomColor();
    this.nextBubble = this.randomColor();
  }

  private randomColor(): BubbleColor {
    return NORMAL_COLORS[Math.floor(Math.random() * NORMAL_COLORS.length)];
  }

  prepareNext(starMode: boolean): void {
    this.starMode = starMode;
    if (starMode) {
      this.currentBubble = 'star';
    } else {
      this.currentBubble = this.nextBubble;
    }
    this.nextBubble = this.randomColor();
    this.canShoot = true;
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.hasMouse = true;
    this.updateAngleFromMouse();
  }

  private updateAngleFromMouse(): void {
    if (!this.hasMouse) return;
    const dx = this.mouseX - this.x;
    const dy = this.mouseY - this.y;
    let angle = Math.atan2(dy, dx);
    if (angle < this.minAngle) angle = this.minAngle;
    if (angle > this.maxAngle) angle = this.maxAngle;
    this.angle = angle;
  }

  setKeyLeft(pressed: boolean): void {
    this.keys.left = pressed;
  }

  setKeyRight(pressed: boolean): void {
    this.keys.right = pressed;
  }

  shoot(): ShotBubble | null {
    if (!this.canShoot || this.shotBubble) return null;

    this.canShoot = false;
    const bubble: ShotBubble = {
      x: this.x + Math.cos(this.angle) * this.radius * 1.2,
      y: this.y + Math.sin(this.angle) * this.radius * 1.2,
      vx: Math.cos(this.angle) * this.shootSpeed,
      vy: Math.sin(this.angle) * this.shootSpeed,
      color: this.currentBubble,
      radius: this.radius,
      active: true,
      stuck: false
    };
    this.shotBubble = bubble;
    return bubble;
  }

  update(deltaTime: number, playAreaLeft: number, playAreaRight: number): void {
    const dt = deltaTime / 1000;
    this.pulseTime += dt;

    if (this.keys.left) {
      this.x -= this.moveSpeed;
    }
    if (this.keys.right) {
      this.x += this.moveSpeed;
    }

    const minX = playAreaLeft + this.radius;
    const maxX = playAreaRight - this.radius;
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;

    this.updateAngleFromMouse();

    if (this.shotBubble && this.shotBubble.active) {
      this.shotBubble.x += this.shotBubble.vx;
      this.shotBubble.y += this.shotBubble.vy;

      const b = this.shotBubble;
      if (b.x - b.radius < playAreaLeft) {
        b.x = playAreaLeft + b.radius;
        b.vx = Math.abs(b.vx);
      }
      if (b.x + b.radius > playAreaRight) {
        b.x = playAreaRight - b.radius;
        b.vx = -Math.abs(b.vx);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawAimLine(ctx);
    this.drawEmitter(ctx);
    this.drawCurrentBubble(ctx);
    this.drawNextPreview(ctx);

    if (this.shotBubble && this.shotBubble.active) {
      this.drawShotBubble(ctx);
    }
  }

  private drawAimLine(ctx: CanvasRenderingContext2D): void {
    if (!this.canShoot) return;

    const startX = this.x + Math.cos(this.angle) * (this.radius + 10);
    const startY = this.y + Math.sin(this.angle) * (this.radius + 10);
    const lineLength = 280;
    const endX = startX + Math.cos(this.angle) * lineLength;
    const endY = startY + Math.sin(this.angle) * lineLength;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -(this.pulseTime * 60) % 20;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.setLineDash([]);
    const dotSize = 5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(endX, endY, dotSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawEmitter(ctx: CanvasRenderingContext2D): void {
    const pulse = 0.7 + Math.sin(this.pulseTime * 3) * 0.3;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    const glowRadius = this.radius * 2.2 * pulse;
    const glow = ctx.createRadialGradient(0, 0, this.radius * 0.5, 0, 0, glowRadius);
    glow.addColorStop(0, 'rgba(100, 181, 246, 0.6)');
    glow.addColorStop(0.5, 'rgba(100, 181, 246, 0.2)');
    glow.addColorStop(1, 'rgba(100, 181, 246, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const baseGradient = ctx.createRadialGradient(0, -5, 2, 0, 0, this.radius);
    baseGradient.addColorStop(0, '#80d8ff');
    baseGradient.addColorStop(0.6, '#29b6f6');
    baseGradient.addColorStop(1, '#0277bd');

    ctx.fillStyle = baseGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const nozzleW = this.radius * 0.7;
    const nozzleH = this.radius * 1.1;
    const nozzleGradient = ctx.createLinearGradient(0, -this.radius, 0, -this.radius - nozzleH);
    nozzleGradient.addColorStop(0, '#4fc3f7');
    nozzleGradient.addColorStop(1, '#0288d1');

    ctx.fillStyle = nozzleGradient;
    ctx.beginPath();
    ctx.moveTo(-nozzleW / 2, -this.radius * 0.6);
    ctx.lineTo(nozzleW / 2, -this.radius * 0.6);
    ctx.lineTo(nozzleW / 2 + 2, -this.radius - nozzleH);
    ctx.lineTo(-nozzleW / 2 - 2, -this.radius - nozzleH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(0, -this.radius - nozzleH - 3, nozzleW / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(0, -this.radius - nozzleH - 3, nozzleW / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawCurrentBubble(ctx: CanvasRenderingContext2D): void {
    if (!this.canShoot) return;

    const offsetAngle = this.angle + Math.PI / 2;
    const px = this.x + Math.cos(offsetAngle) * this.radius * 0.3;
    const py = this.y + Math.sin(offsetAngle) * this.radius * 0.3;

    this.drawBubbleAt(ctx, px, py, this.currentBubble, this.radius * 0.72);
  }

  private drawNextPreview(ctx: CanvasRenderingContext2D): void {
    const previewX = this.x;
    const previewY = this.y + this.radius * 2.2;
    const previewRadius = this.radius * 0.55;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(previewX, previewY, previewRadius + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `bold ${Math.floor(previewRadius * 0.7)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('下一个', previewX, previewY - previewRadius - 12);
    ctx.restore();

    this.drawBubbleAt(ctx, previewX, previewY, this.nextBubble, previewRadius);
  }

  private drawShotBubble(ctx: CanvasRenderingContext2D): void {
    if (!this.shotBubble) return;
    this.drawBubbleAt(ctx, this.shotBubble.x, this.shotBubble.y, this.shotBubble.color, this.shotBubble.radius);
  }

  private drawBubbleAt(ctx: CanvasRenderingContext2D, x: number, y: number, color: BubbleColor, r: number): void {
    ctx.save();

    if (color === 'star') {
      this.drawStarBubbleAt(ctx, x, y, r);
    } else {
      const colors = BUBBLE_COLORS[color as Exclude<BubbleColor, 'star'>];
      const gradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      gradient.addColorStop(0, colors.light);
      gradient.addColorStop(0.6, colors.main);
      gradient.addColorStop(1, colors.dark);

      ctx.beginPath();
      ctx.arc(x, y, r - 1, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
    }

    ctx.restore();
  }

  private drawStarBubbleAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    const spikes = 5;
    const outerRadius = r * 0.9;
    const innerRadius = r * 0.42;

    const gradient = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, '#e040fb');
    gradient.addColorStop(0.8, '#7c4dff');
    gradient.addColorStop(1, '#304ffe');

    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const starGradient = ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
    starGradient.addColorStop(0, '#fff59d');
    starGradient.addColorStop(0.5, '#ffd54f');
    starGradient.addColorStop(1, '#ff8f00');
    ctx.fillStyle = starGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  clearShot(): void {
    this.shotBubble = null;
  }
}
