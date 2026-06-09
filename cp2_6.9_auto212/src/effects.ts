export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface TransitionText {
  text: string;
  y: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FlashEffect {
  alpha: number;
  color: string;
  life: number;
}

export class Effects {
  private particles: Particle[] = [];
  private transitionText: TransitionText | null = null;
  private flashEffect: FlashEffect | null = null;
  private sparkleAngle = 0;

  emitParticles(x: number, y: number, count: number = 50): void {
    const colors = ['#E74C3C', '#2ECC71', '#3498DB', '#F1C40F', '#9B59B6', '#FF6B6B', '#4ECDC4'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 120,
        maxLife: 120
      });
    }
  }

  showTransitionText(text: string): void {
    this.transitionText = {
      text,
      y: 0,
      alpha: 0,
      life: 150,
      maxLife: 150
    };
  }

  flashScreen(color: string = '#E74C3C'): void {
    this.flashEffect = {
      alpha: 0.6,
      color,
      life: 30,
    };
  }

  update(): void {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.vx *= 0.99;
      p.life--;
      return p.life > 0;
    });

    if (this.transitionText) {
      this.transitionText.life--;
      const t = 1 - this.transitionText.life / this.transitionText.maxLife;
      if (t < 0.3) {
        this.transitionText.alpha = t / 0.3;
        this.transitionText.y = 1 - t / 0.3;
      } else if (t > 0.7) {
        this.transitionText.alpha = (1 - t) / 0.3;
      } else {
        this.transitionText.alpha = 1;
      }
      if (this.transitionText.life <= 0) {
        this.transitionText = null;
      }
    }

    if (this.flashEffect) {
      this.flashEffect.life--;
      this.flashEffect.alpha = 0.6 * (this.flashEffect.life / 30);
      if (this.flashEffect.life <= 0) {
        this.flashEffect = null;
      }
    }

    this.sparkleAngle += 0.05;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    if (this.transitionText) {
      ctx.save();
      const t = this.transitionText;
      const centerY = height / 2 + t.y * 100;
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 48px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#FFA500';
      ctx.shadowBlur = 20;
      ctx.fillText(t.text, width / 2, centerY);
      ctx.restore();
    }

    if (this.flashEffect) {
      ctx.save();
      ctx.globalAlpha = this.flashEffect.alpha;
      ctx.fillStyle = this.flashEffect.color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  getSparkleAngle(): number {
    return this.sparkleAngle;
  }
}

export function drawWoodGrain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  for (let i = 0; i < 30; i++) {
    ctx.globalAlpha = 0.03 + Math.random() * 0.05;
    ctx.strokeStyle = Math.random() > 0.5 ? '#2C1810' : '#5D4037';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const lineY = y + Math.random() * h;
    ctx.moveTo(x, lineY);
    for (let px = 0; px < w; px += 20) {
      ctx.lineTo(x + px, lineY + Math.sin(px * 0.1) * 3);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawNoiseTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  for (let i = 0; i < 100; i++) {
    ctx.globalAlpha = Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? '#FFFFFF' : '#000000';
    ctx.fillRect(
      x + Math.random() * w,
      y + Math.random() * h,
      1 + Math.random() * 2,
      1 + Math.random() * 2
    );
  }
  ctx.restore();
}
