interface ContainerParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

interface HaloPulse {
  active: boolean;
  progress: number;
  duration: number;
  hue: number;
}

const COLOR_STAGES: { threshold: number; hue: number }[] = [
  { threshold: 0, hue: 210 },
  { threshold: 10, hue: 190 },
  { threshold: 30, hue: 40 },
  { threshold: 50, hue: 25 },
  { threshold: 80, hue: 320 },
  { threshold: 120, hue: 280 }
];

export class LightContainer {
  x: number = 0;
  y: number = 0;
  readonly baseRadius: number = 70;
  radius: number = 70;
  capturedCount: number = 0;
  currentHue: number = 210;
  targetHue: number = 210;
  readonly saturation: number = 85;
  readonly lightness: number = 60;
  particles: ContainerParticle[] = [];
  readonly maxParticles: number = 40;
  haloPulse: HaloPulse = { active: false, progress: 0, duration: 1, hue: 210 };
  pulsePhase: number = 0;
  rotation: number = 0;
  private lastMilestone: number = -1;
  private readonly milestones: number[] = [10, 30, 50, 80, 120];

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    this.x = canvasWidth - 120;
    this.y = canvasHeight - 120;

    this.pulsePhase += deltaTime * 2;
    this.rotation += deltaTime * 0.3;

    this.radius = this.baseRadius + Math.sin(this.pulsePhase) * 4;

    this.currentHue += (this.targetHue - this.currentHue) * (1 - Math.exp(-deltaTime * 2));

    this.updateParticles(deltaTime);

    if (this.haloPulse.active) {
      this.haloPulse.progress += deltaTime / this.haloPulse.duration;
      if (this.haloPulse.progress >= 1) {
        this.haloPulse.active = false;
      }
    }

    const currentMilestone = this.milestones.filter(m => this.capturedCount >= m).length;
    if (currentMilestone > this.lastMilestone && this.capturedCount > 0) {
      this.lastMilestone = currentMilestone;
      this.updateColorStage();
      if (this.milestones.includes(this.capturedCount)) {
        this.triggerHaloPulse();
      }
    }
    if (this.capturedCount === 0) {
      this.lastMilestone = -1;
    }
  }

  private updateColorStage(): void {
    for (let i = COLOR_STAGES.length - 1; i >= 0; i--) {
      if (this.capturedCount >= COLOR_STAGES[i].threshold) {
        this.targetHue = COLOR_STAGES[i].hue;
        break;
      }
    }
  }

  private triggerHaloPulse(): void {
    this.haloPulse.active = true;
    this.haloPulse.progress = 0;
    this.haloPulse.hue = this.currentHue;
  }

  addCaptureParticle(targetHue: number): void {
    this.capturedCount++;
    const angle = Math.random() * Math.PI * 2;
    const dist = this.radius * 0.2 + Math.random() * this.radius * 0.5;
    this.particles.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 2 + Math.random() * 2,
      maxLife: 4,
      size: 1 + Math.random() * 2.5,
      hue: targetHue
    });
    if (this.particles.length > this.maxParticles) {
      this.particles.shift();
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      const dist = Math.sqrt(p.x * p.x + p.y * p.y);
      const maxDist = this.radius * 0.75;
      if (dist > maxDist) {
        const norm = maxDist / dist;
        p.x *= norm;
        p.y *= norm;
      }

      const centripetalForce = 0.01;
      p.vx -= (p.x / maxDist) * centripetalForce;
      p.vy -= (p.y / maxDist) * centripetalForce;

      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.vx *= 0.995;
      p.vy *= 0.995;

      p.vx += (Math.random() - 0.5) * 0.05;
      p.vy += (Math.random() - 0.5) * 0.05;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getColor(saturationOffset: number = 0, lightnessOffset: number = 0): string {
    const s = Math.min(100, this.saturation + saturationOffset);
    const l = Math.min(100, this.lightness + lightnessOffset);
    return `hsl(${this.currentHue}, ${s}%, ${l}%)`;
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderHaloPulse(ctx);
    this.renderContainer(ctx);
    this.renderContainerParticles(ctx);
    this.renderCount(ctx);
  }

  private renderHaloPulse(ctx: CanvasRenderingContext2D): void {
    if (!this.haloPulse.active) return;

    const t = this.haloPulse.progress;
    const maxRadius = Math.max(ctx.canvas.width, ctx.canvas.height);
    const radius = t * maxRadius;
    const alpha = 1 - t;
    const ringWidth = 80 * (1 - t * 0.5);

    const gradient = ctx.createRadialGradient(
      this.x, this.y, Math.max(0, radius - ringWidth),
      this.x, this.y, radius + ringWidth
    );

    gradient.addColorStop(0, `hsla(${this.haloPulse.hue}, 90%, 70%, 0)`);
    gradient.addColorStop(0.3, `hsla(${this.haloPulse.hue}, 95%, 75%, ${alpha * 0.15})`);
    gradient.addColorStop(0.5, `hsla(${(this.haloPulse.hue + 30) % 360}, 100%, 80%, ${alpha * 0.25})`);
    gradient.addColorStop(0.7, `hsla(${(this.haloPulse.hue + 60) % 360}, 95%, 75%, ${alpha * 0.15})`);
    gradient.addColorStop(1, `hsla(${this.haloPulse.hue}, 90%, 70%, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, radius + ringWidth, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private renderContainer(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    const outerGlow = ctx.createRadialGradient(0, 0, this.radius * 0.3, 0, 0, this.radius * 2);
    outerGlow.addColorStop(0, `hsla(${this.currentHue}, 90%, 65%, 0.25)`);
    outerGlow.addColorStop(0.5, `hsla(${this.currentHue}, 85%, 55%, 0.1)`);
    outerGlow.addColorStop(1, `hsla(${this.currentHue}, 80%, 50%, 0)`);
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    innerGrad.addColorStop(0, `hsla(${this.currentHue}, 90%, 55%, 0.15)`);
    innerGrad.addColorStop(0.6, `hsla(${this.currentHue}, 85%, 45%, 0.08)`);
    innerGrad.addColorStop(1, `hsla(${this.currentHue}, 80%, 40%, 0.02)`);
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `hsla(${this.currentHue}, 95%, 70%, 0.8)`;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.getColor(0, 20);
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `hsla(${this.currentHue}, 80%, 60%, 0.25)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(this.rotation);
    ctx.strokeStyle = `hsla(${this.currentHue}, 70%, 65%, 0.2)`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const inner = this.radius * 0.3;
      const outer = this.radius * 0.95;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderContainerParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, ${alpha * 0.9})`;
      ctx.shadowColor = `hsl(${p.hue}, 90%, 70%)`;
      ctx.shadowBlur = 12 * alpha;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private renderCount(ctx: CanvasRenderingContext2D): void {
    const countStr = this.capturedCount.toString();
    const digits = countStr.split('');
    const totalWidth = digits.length * 28;
    let startX = this.x - totalWidth / 2;
    const baseY = this.y + 5;

    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i];
      const cx = startX + 14 + i * 28;
      const cy = baseY;

      ctx.save();
      ctx.shadowColor = this.getColor(10, 30);
      ctx.shadowBlur = 15;
      ctx.fillStyle = this.getColor(15, 30);
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = `hsl(0, 0%, 100%)`;
      ctx.shadowBlur = 10;
      ctx.fillStyle = `hsl(0, 0%, 98%)`;
      ctx.fillText(digit, cx, cy + 1);
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = this.getColor(0, 10);
    ctx.shadowBlur = 6;
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = `hsla(${this.currentHue}, 90%, 85%, 0.8)`;
    ctx.textAlign = 'center';
    ctx.fillText('光符计数', this.x, this.y + this.radius + 18);
    ctx.restore();
  }
}
