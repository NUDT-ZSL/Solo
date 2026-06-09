export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

export function rgbToString(rgb: RGB, alpha: number = 1): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export type ParticleState = 'idle' | 'scattering' | 'gathering' | 'wandering';

export interface ParticleTarget {
  x: number;
  y: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public baseRadius: number;
  public currentRadius: number;
  public color: RGB;
  public targetColor: RGB;
  public colorTransitionProgress: number = 1;
  public state: ParticleState = 'idle';
  public alive: boolean = true;
  public alpha: number = 1;

  public targetX: number;
  public targetY: number;
  public scatterStartX: number = 0;
  public scatterStartY: number = 0;
  public scatterTargetX: number = 0;
  public scatterTargetY: number = 0;
  public transitionProgress: number = 0;
  public transitionDuration: number = 800;

  public brownianPhase: number;
  public driftRadius: number;
  public driftPhase: number;
  public driftSpeed: number;
  public brownianSpeed: number;
  public glowRadius: number;

  public originalTargetX: number;
  public originalTargetY: number;
  public repulsionRecovery: number = 1;

  constructor(
    x: number,
    y: number,
    color: RGB,
    radius?: number
  ) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.originalTargetX = x;
    this.originalTargetY = y;
    this.baseRadius = radius ?? (3 + Math.random() * 3);
    this.currentRadius = this.baseRadius;
    this.color = { ...color };
    this.targetColor = { ...color };
    this.brownianPhase = Math.random() * Math.PI * 2;
    this.driftRadius = 2 + Math.random() * 2;
    this.driftPhase = Math.random() * Math.PI * 2;
    this.driftSpeed = (Math.PI * 2) / (4000 + Math.random() * 4000);
    this.brownianSpeed = 0.5 + Math.random() * 1;
    this.glowRadius = 6 + Math.random() * 6;
  }

  public setTarget(x: number, y: number, transitionMs: number = 800): void {
    this.originalTargetX = x;
    this.originalTargetY = y;
    this.targetX = x;
    this.targetY = y;
    this.transitionProgress = 0;
    this.transitionDuration = transitionMs;
    this.state = 'gathering';
  }

  public startScatter(canvasWidth: number, canvasHeight: number, durationMs: number = 500): void {
    this.scatterStartX = this.x;
    this.scatterStartY = this.y;
    this.scatterTargetX = Math.random() * canvasWidth;
    this.scatterTargetY = Math.random() * canvasHeight;
    this.transitionProgress = 0;
    this.transitionDuration = durationMs;
    this.state = 'scattering';
  }

  public startWander(canvasWidth: number, canvasHeight: number): void {
    this.scatterTargetX = Math.random() * canvasWidth;
    this.scatterTargetY = Math.random() * canvasHeight;
    this.state = 'wandering';
  }

  public setTargetColor(color: RGB): void {
    this.targetColor = { ...color };
    this.colorTransitionProgress = 0;
  }

  public setSizeScale(scale: number): void {
    this.currentRadius = this.baseRadius * scale;
  }

  public update(
    deltaTime: number,
    mouseX: number | null,
    mouseY: number | null,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const dt = deltaTime / 16.67;

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + deltaTime / 300);
      this.color = lerpColor(
        this.color,
        this.targetColor,
        deltaTime / 300
      );
    }

    switch (this.state) {
      case 'scattering':
        this.transitionProgress += deltaTime / this.transitionDuration;
        if (this.transitionProgress >= 1) {
          this.transitionProgress = 1;
          this.state = 'wandering';
        }
        const st = easeInOutCubic(this.transitionProgress);
        this.x = this.scatterStartX + (this.scatterTargetX - this.scatterStartX) * st;
        this.y = this.scatterStartY + (this.scatterTargetY - this.scatterStartY) * st;
        this.alpha = 1 - this.transitionProgress * 0.5;
        break;

      case 'wandering':
        const wdx = this.scatterTargetX - this.x;
        const wdy = this.scatterTargetY - this.y;
        const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
        if (wdist < 10) {
          this.scatterTargetX = Math.random() * canvasWidth;
          this.scatterTargetY = Math.random() * canvasHeight;
        } else {
          this.vx = (wdx / wdist) * 0.5;
          this.vy = (wdy / wdist) * 0.5;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
        }
        this.alpha = 0.3 + Math.sin(Date.now() * 0.003 + this.brownianPhase) * 0.2;
        break;

      case 'gathering':
        this.transitionProgress += deltaTime / this.transitionDuration;
        if (this.transitionProgress >= 1) {
          this.transitionProgress = 1;
          this.state = 'idle';
        }
        const gt = easeInOutCubic(this.transitionProgress);
        this.x = this.scatterStartX + (this.targetX - this.scatterStartX) * gt;
        this.y = this.scatterStartY + (this.targetY - this.scatterStartY) * gt;
        this.alpha = 0.5 + this.transitionProgress * 0.5;
        break;

      case 'idle':
      default:
        this.brownianPhase += 0.02 * dt;
        this.driftPhase += this.driftSpeed * deltaTime;

        const brownianX = Math.sin(this.brownianPhase) * this.brownianSpeed * 0.5;
        const brownianY = Math.cos(this.brownianPhase * 1.3) * this.brownianSpeed * 0.5;

        const driftX = Math.cos(this.driftPhase) * this.driftRadius * 0.1;
        const driftY = Math.sin(this.driftPhase) * this.driftRadius * 0.1;

        const returnX = (this.originalTargetX - this.x) * 0.05;
        const returnY = (this.originalTargetY - this.y) * 0.05;

        this.vx = (brownianX + driftX + returnX) * this.repulsionRecovery;
        this.vy = (brownianY + driftY + returnY) * this.repulsionRecovery;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        this.alpha = 1;
        break;
    }

    if (mouseX !== null && mouseY !== null) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 80 && dist > 0) {
        const force = Math.max(0, (80 - dist) / 80) * 200 * (deltaTime / 1000);
        const nx = dx / dist;
        const ny = dy / dist;
        this.x += nx * force;
        this.y += ny * force;
        this.repulsionRecovery = 0;
      }
    }

    if (this.repulsionRecovery < 1) {
      this.repulsionRecovery = Math.min(1, this.repulsionRecovery + deltaTime / 1000);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = this.glowRadius;
    ctx.shadowColor = rgbToString(this.color);
    ctx.fillStyle = rgbToString(this.color);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public prepareGatherFromCurrent(): void {
    this.scatterStartX = this.x;
    this.scatterStartY = this.y;
    this.transitionProgress = 0;
    this.state = 'gathering';
  }
}

export const COLOR_PALETTES: Array<[string, string]> = [
  ['#FF6B6B', '#4ECDC4'],
  ['#A855F7', '#3B82F6'],
  ['#F59E0B', '#EF4444'],
  ['#06B6D4', '#8B5CF6'],
  ['#10B981', '#FDE047'],
  ['#F43F5E', '#FBBF24'],
  ['#0EA5E9', '#EC4899'],
  ['#F97316', '#FBBF24'],
];

export function getRandomColorFromPalette(paletteIndex: number): RGB {
  const palette = COLOR_PALETTES[paletteIndex] ?? COLOR_PALETTES[0];
  const t = Math.random();
  const c1 = hexToRgb(palette[0]);
  const c2 = hexToRgb(palette[1]);
  return lerpColor(c1, c2, t);
}
