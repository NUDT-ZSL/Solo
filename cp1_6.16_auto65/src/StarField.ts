export interface Star {
  id: number;
  x: number;
  y: number;
  brightness: number;
  size: number;
}

export interface ConnectionLine {
  from: Star;
  to: Star;
  age: number;
  duration: number;
  isError: boolean;
  errorAge: number;
  errorDuration: number;
}

export class StarField {
  private stars: Star[] = [];
  private altarX: number;
  private altarY: number;
  private altarW: number;
  private altarH: number;
  private connectedSequence: Star[] = [];
  private lines: ConnectionLine[] = [];
  private targetSequence: Star[] = [];
  private onSequenceComplete: (() => void) | null = null;

  constructor(canvasW: number, canvasH: number) {
    this.altarW = canvasW * 0.7;
    this.altarH = canvasH * 0.7;
    this.altarX = (canvasW - this.altarW) / 2;
    this.altarY = (canvasH - this.altarH) / 2;
    this.generateStars();
  }

  private generateStars(): void {
    const starCount = 50;
    for (let i = 0; i < starCount; i++) {
      const brightness = 0.3 + Math.random() * 0.7;
      const size = 2 + (brightness - 0.3) * (6 / 0.7);
      this.stars.push({
        id: i,
        x: this.altarX + 20 + Math.random() * (this.altarW - 40),
        y: this.altarY + 20 + Math.random() * (this.altarH - 40),
        brightness,
        size
      });
    }
  }

  getAltarBounds() {
    return { x: this.altarX, y: this.altarY, w: this.altarW, h: this.altarH };
  }

  getStars(): Star[] {
    return this.stars;
  }

  getCenter(): { x: number; y: number } {
    return { x: this.altarX + this.altarW / 2, y: this.altarY + this.altarH / 2 };
  }

  generateTargetSequence(length: number = 4): Star[] {
    const shuffled = [...this.stars].sort(() => Math.random() - 0.5);
    this.targetSequence = shuffled.slice(0, Math.min(length, this.stars.length));
    return this.targetSequence;
  }

  setOnSequenceComplete(callback: () => void): void {
    this.onSequenceComplete = callback;
  }

  resetConnection(): void {
    this.connectedSequence = [];
    this.lines = [];
  }

  handleClick(mx: number, my: number): boolean {
    if (this.targetSequence.length === 0) return false;
    const expectedIdx = this.connectedSequence.length;
    if (expectedIdx >= this.targetSequence.length) return false;
    const expectedStar = this.targetSequence[expectedIdx];

    for (const star of this.stars) {
      const dx = mx - star.x;
      const dy = my - star.y;
      const hitRadius = Math.max(star.size, 10);
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        if (star.id === expectedStar.id) {
          if (this.connectedSequence.length > 0) {
            const prev = this.connectedSequence[this.connectedSequence.length - 1];
            this.lines.push({
              from: prev,
              to: star,
              age: 0,
              duration: 0.5,
              isError: false,
              errorAge: 0,
              errorDuration: 0.3
            });
          }
          this.connectedSequence.push(star);
          if (this.connectedSequence.length === this.targetSequence.length) {
            if (this.onSequenceComplete) {
              this.onSequenceComplete();
            }
          }
          return true;
        } else {
          if (this.connectedSequence.length > 0) {
            const prev = this.connectedSequence[this.connectedSequence.length - 1];
            const errLine: ConnectionLine = {
              from: prev,
              to: star,
              age: 0,
              duration: 0,
              isError: true,
              errorAge: 0,
              errorDuration: 0.3
            };
            this.lines.push(errLine);
          }
          this.connectedSequence = [];
          return true;
        }
      }
    }
    return false;
  }

  update(deltaTime: number): void {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const line = this.lines[i];
      if (line.isError) {
        line.errorAge += deltaTime;
        if (line.errorAge >= line.errorDuration) {
          this.lines.splice(i, 1);
        }
      } else {
        line.age += deltaTime;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      ctx.save();
      ctx.globalAlpha = star.brightness;
      const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 2);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${star.brightness})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const line of this.lines) {
      if (line.isError) {
        const flicker = Math.sin(line.errorAge * 50) > 0 ? 1 : 0.3;
        ctx.save();
        ctx.globalAlpha = flicker * (1 - line.errorAge / line.errorDuration);
        ctx.strokeStyle = '#E94560';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(line.from.x, line.from.y);
        ctx.lineTo(line.to.x, line.to.y);
        ctx.stroke();
        ctx.restore();
      } else {
        const progress = Math.min(line.age / line.duration, 1);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(line.from.x, line.from.y);
        ctx.lineTo(line.to.x, line.to.y);
        ctx.stroke();

        const flowT = (line.age % line.duration) / line.duration;
        const fx = line.from.x + (line.to.x - line.from.x) * flowT;
        const fy = line.from.y + (line.to.y - line.from.y) * flowT;
        const glowGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 12);
        glowGrad.addColorStop(0, 'rgba(255, 215, 0, 1)');
        glowGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.6)');
        glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(fx, fy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (this.connectedSequence.length > 0) {
      const lastStar = this.connectedSequence[this.connectedSequence.length - 1];
      ctx.save();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lastStar.x, lastStar.y, lastStar.size + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderPatternHint(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, scale: number): void {
    if (this.targetSequence.length < 2) return;
    ctx.save();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    const first = this.targetSequence[0];
    ctx.moveTo(offsetX + (first.x - this.altarX) * scale, offsetY + (first.y - this.altarY) * scale);
    for (let i = 1; i < this.targetSequence.length; i++) {
      const s = this.targetSequence[i];
      ctx.lineTo(offsetX + (s.x - this.altarX) * scale, offsetY + (s.y - this.altarY) * scale);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for (const s of this.targetSequence) {
      const px = offsetX + (s.x - this.altarX) * scale;
      const py = offsetY + (s.y - this.altarY) * scale;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
