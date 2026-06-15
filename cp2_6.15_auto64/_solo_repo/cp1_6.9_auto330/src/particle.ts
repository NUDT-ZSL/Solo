import type { CharInfo } from './textProcessor';

interface TrailDot {
  x: number;
  y: number;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
}

interface PulseEffect {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export type ParticleState = 'peeling' | 'orbiting' | 'returning' | 'restored';

export class Particle {
  char: string;
  origX: number;
  origY: number;
  x: number;
  y: number;
  z: number;
  orbitRadius: number;
  orbitPhase: number;
  orbitTilt: number;
  zSwingAmp: number;
  zSwingPhase: number;
  coreSize: number;
  glowSize: number;
  hue: number;
  state: ParticleState;
  peelStartTime: number;
  peelDelay: number;
  peelDuration: number;
  returnStartTime: number;
  returnDuration: number;
  returnStartX: number;
  returnStartY: number;
  fontSize: number;
  restoredScale: number;
  restoredScaleTime: number;
  restoredScaleDuration: number;
  index: number;
  total: number;

  static trailDots: TrailDot[] = [];
  static pulseEffects: PulseEffect[] = [];
  static readonly ROTATION_PERIOD = 12;
  static readonly ANGULAR_SPEED = (2 * Math.PI) / Particle.ROTATION_PERIOD;

  constructor(
    charInfo: CharInfo,
    orbitRadius: number,
    index: number,
    total: number,
    fontSize: number,
    canvasCenterX: number,
    canvasCenterY: number
  ) {
    this.char = charInfo.char;
    this.origX = charInfo.origX;
    this.origY = charInfo.origY;
    this.x = charInfo.origX;
    this.y = charInfo.origY;
    this.z = 0;
    this.orbitRadius = orbitRadius;
    this.orbitPhase = Math.random() * Math.PI * 2;
    this.orbitTilt = (Math.random() - 0.5) * 0.15;
    this.zSwingAmp = 3;
    this.zSwingPhase = Math.random() * Math.PI * 2;
    this.coreSize = 6 + Math.random() * 4;
    this.glowSize = this.coreSize * (2.5 + Math.random() * 1.5);
    this.hue = 20 + Math.random() * 15;
    this.state = 'peeling';
    this.peelDelay = index * 120 + Math.random() * 80;
    this.peelDuration = 800 + Math.random() * 400;
    this.peelStartTime = 0;
    this.returnStartTime = 0;
    this.returnDuration = 500;
    this.returnStartX = 0;
    this.returnStartY = 0;
    this.fontSize = fontSize;
    this.restoredScale = 1;
    this.restoredScaleTime = 0;
    this.restoredScaleDuration = 300;
    this.index = index;
    this.total = total;
  }

  startPeel(globalStartTime: number): void {
    this.peelStartTime = globalStartTime + this.peelDelay;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  update(time: number, canvasCenterX: number, canvasCenterY: number): void {
    switch (this.state) {
      case 'peeling':
        this.updatePeeling(time, canvasCenterX, canvasCenterY);
        break;
      case 'orbiting':
        this.updateOrbiting(time, canvasCenterX, canvasCenterY);
        break;
      case 'returning':
        this.updateReturning(time);
        break;
      case 'restored':
        this.updateRestored(time);
        break;
    }
  }

  private updatePeeling(time: number, cx: number, cy: number): void {
    if (time < this.peelStartTime) return;

    const elapsed = time - this.peelStartTime;
    const progress = Math.min(elapsed / this.peelDuration, 1);
    const eased = this.easeOutCubic(progress);

    this.updateOrbiting(time, cx, cy);

    const orbitX = this.x;
    const orbitY = this.y;

    this.x = this.origX + (orbitX - this.origX) * eased;
    this.y = this.origY + (orbitY - this.origY) * eased;
    this.z = this.z * eased;

    if (progress >= 1) {
      this.state = 'orbiting';
    }
  }

  private updateOrbiting(time: number, cx: number, cy: number): void {
    const t = time / 1000;
    const angle = this.orbitPhase + Particle.ANGULAR_SPEED * t;

    const radiusFactor = 0.8 + 0.2 * Math.sin(t * 0.5 + this.orbitPhase);
    const currentRadius = this.orbitRadius * radiusFactor;

    this.x = cx + Math.cos(angle) * currentRadius;
    this.y = cy + Math.sin(angle) * currentRadius * (1 - this.orbitTilt * Math.sin(angle * 0.7));
    this.z = Math.sin(t * 1.2 + this.zSwingPhase) * this.zSwingAmp;
  }

  private updateReturning(time: number): void {
    const elapsed = time - this.returnStartTime;
    const progress = Math.min(elapsed / this.returnDuration, 1);
    const eased = this.easeInOutQuad(progress);

    const prevX = this.x;
    const prevY = this.y;

    this.x = this.returnStartX + (this.origX - this.returnStartX) * eased;
    this.y = this.returnStartY + (this.origY - this.returnStartY) * eased;
    this.z = this.z * (1 - eased);

    this.spawnTrailDots(prevX, prevY);

    if (progress >= 1) {
      this.state = 'restored';
      this.restoredScaleTime = time;
      this.spawnPulse();
    }
  }

  private updateRestored(time: number): void {
    const elapsed = time - this.restoredScaleTime;
    const progress = Math.min(elapsed / this.restoredScaleDuration, 1);

    if (progress < 1) {
      if (progress < 0.5) {
        this.restoredScale = 1 + (progress / 0.5) * 0.15;
      } else {
        this.restoredScale = 1.15 - ((progress - 0.5) / 0.5) * 0.15;
      }
    } else {
      this.restoredScale = 1;
    }
  }

  private spawnTrailDots(fromX: number, fromY: number): void {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      Particle.trailDots.push({
        x: fromX + (this.x - fromX) * t + (Math.random() - 0.5) * 3,
        y: fromY + (this.y - fromY) * t + (Math.random() - 0.5) * 3,
        alpha: 0.7,
        size: 2,
        life: 0,
        maxLife: 1000,
      });
    }
  }

  private spawnPulse(): void {
    Particle.pulseEffects.push({
      x: this.origX,
      y: this.origY,
      radius: 0,
      alpha: 0.6,
      life: 0,
      maxLife: 800,
    });
  }

  returnToOrigin(time: number): void {
    if (this.state === 'orbiting' || this.state === 'peeling') {
      this.state = 'returning';
      this.returnStartTime = time;
      this.returnStartX = this.x;
      this.returnStartY = this.y;
    }
  }

  isClicked(clickX: number, clickY: number): boolean {
    if (this.state !== 'orbiting' && this.state !== 'peeling') return false;
    const hitRadius = Math.max(this.glowSize, this.coreSize + 8);
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return dx * dx + dy * dy <= hitRadius * hitRadius;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    switch (this.state) {
      case 'peeling':
      case 'orbiting':
        this.drawParticle(ctx, time);
        break;
      case 'returning':
        this.drawParticle(ctx, time);
        break;
      case 'restored':
        this.drawRestoredText(ctx);
        break;
    }
  }

  private drawParticle(ctx: CanvasRenderingContext2D, time: number): void {
    const zScale = 1 + this.z * 0.02;
    const edgeFactor = Math.abs(this.orbitRadius > 0 ?
      (this.orbitRadius - Math.sqrt(
        Math.pow(this.x - ctx.canvas.width / 2, 2) +
        Math.pow(this.y - ctx.canvas.height / 2, 2)
      )) / this.orbitRadius : 1);
    const edgeAlpha = Math.min(1, 0.3 + edgeFactor * 0.9);

    const alpha = this.state === 'peeling'
      ? Math.min(1, (time - this.peelStartTime) / this.peelDuration)
      : 1;
    const finalAlpha = alpha * edgeAlpha;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(zScale, zScale);

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.glowSize);
    glowGradient.addColorStop(0, `hsla(${this.hue}, 70%, 75%, ${0.7 * finalAlpha})`);
    glowGradient.addColorStop(0.4, `hsla(${this.hue + 5}, 65%, 82%, ${0.35 * finalAlpha})`);
    glowGradient.addColorStop(1, `hsla(${this.hue + 10}, 60%, 92%, 0)`);
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.glowSize, 0, Math.PI * 2);
    ctx.fill();

    const twinkle = 0.85 + 0.15 * Math.sin(time * 0.005 + this.orbitPhase);
    const coreGradient = ctx.createRadialGradient(-this.coreSize * 0.2, -this.coreSize * 0.2, 0, 0, 0, this.coreSize);
    coreGradient.addColorStop(0, `hsla(${this.hue - 5}, 90%, 88%, ${finalAlpha * twinkle})`);
    coreGradient.addColorStop(0.5, `hsla(${this.hue}, 85%, 72%, ${finalAlpha * twinkle})`);
    coreGradient.addColorStop(1, `hsla(${this.hue + 8}, 75%, 58%, ${finalAlpha * 0.9})`);
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.coreSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(45, 100%, 96%, ${finalAlpha * 0.9 * twinkle})`;
    ctx.beginPath();
    ctx.arc(-this.coreSize * 0.25, -this.coreSize * 0.25, this.coreSize * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawRestoredText(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.origX, this.origY);
    ctx.scale(this.restoredScale, this.restoredScale);
    ctx.font = `${this.fontSize}px 'Patrick Hand SC', 'Ma Shan Zheng', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4A3728';
    ctx.shadowColor = 'rgba(74, 55, 40, 0.15)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(this.char, 0, 0);
    ctx.restore();
  }

  static updateTrailDots(deltaTime: number): void {
    for (let i = Particle.trailDots.length - 1; i >= 0; i--) {
      const dot = Particle.trailDots[i];
      dot.life += deltaTime;
      const progress = dot.life / dot.maxLife;
      dot.alpha = 0.7 * (1 - progress);
      if (dot.life >= dot.maxLife) {
        Particle.trailDots.splice(i, 1);
      }
    }
  }

  static drawTrailDots(ctx: CanvasRenderingContext2D): void {
    for (const dot of Particle.trailDots) {
      const progress = dot.life / dot.maxLife;
      const hue = 25 + progress * 20;
      const lightness = 75 + progress * 20;
      ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${dot.alpha})`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  static updatePulseEffects(deltaTime: number): void {
    for (let i = Particle.pulseEffects.length - 1; i >= 0; i--) {
      const pulse = Particle.pulseEffects[i];
      pulse.life += deltaTime;
      const progress = pulse.life / pulse.maxLife;
      pulse.radius = 200 * this.easeOutQuad(progress);
      pulse.alpha = 0.5 * (1 - progress);
      if (pulse.life >= pulse.maxLife) {
        Particle.pulseEffects.splice(i, 1);
      }
    }
  }

  static drawPulseEffects(ctx: CanvasRenderingContext2D): void {
    for (const pulse of Particle.pulseEffects) {
      const gradient = ctx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, pulse.radius);
      gradient.addColorStop(0, `hsla(38, 85%, 88%, ${pulse.alpha})`);
      gradient.addColorStop(0.6, `hsla(32, 75%, 80%, ${pulse.alpha * 0.4})`);
      gradient.addColorStop(1, `hsla(30, 60%, 75%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private static easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  static clearEffects(): void {
    Particle.trailDots = [];
    Particle.pulseEffects = [];
  }
}
