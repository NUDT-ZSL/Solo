import { ViewState } from './heatmap';

interface TrailPoint {
  x: number;
  y: number;
  color: { r: number; g: number; b: number };
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  targetVx: number;
  targetVy: number;
  trail: TrailPoint[];
  trailLength: number;
  highConcentration: number;
  flickerPhase: number;
  flickerSpeed: number;
}

const MIN_PARTICLES = 80;
const MAX_PARTICLES = 150;
const TRAIL_LENGTH = 18;
const WIND_TRANSITION_DURATION = 500;

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private particles: Particle[] = [];
  private windAngle = 90;
  private targetWindAngle = 90;
  private windTransitionStart = 0;
  private timeOfDay = 12;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.initParticles();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setTimeOfDay(hour: number): void {
    this.timeOfDay = hour;
  }

  setWindAngle(angle: number): void {
    if (angle !== this.targetWindAngle) {
      this.targetWindAngle = angle;
      this.windTransitionStart = performance.now();
    }
  }

  private initParticles(): void {
    const count = Math.floor(MIN_PARTICLES + Math.random() * (MAX_PARTICLES - MIN_PARTICLES));
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(randomStart: boolean = false): Particle {
    const windRad = (this.windAngle * Math.PI) / 180;
    const speed = 2 + Math.random() * 3;
    const vx = Math.cos(windRad) * speed;
    const vy = Math.sin(windRad) * speed;

    let x: number, y: number;
    if (randomStart) {
      x = Math.random() * this.width;
      y = Math.random() * this.height;
    } else {
      x = Math.random() * this.width * 0.3;
      y = Math.random() * this.height * 0.3;
    }

    return {
      x,
      y,
      vx,
      vy,
      radius: 3 + Math.random() * 3,
      baseAlpha: 0.6 + Math.random() * 0.3,
      targetVx: vx,
      targetVy: vy,
      trail: [],
      trailLength: TRAIL_LENGTH,
      highConcentration: 0,
      flickerPhase: Math.random() * Math.PI * 2,
      flickerSpeed: 0.05 + Math.random() * 0.05
    };
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  getAverageVelocity(): number {
    if (this.particles.length === 0) return 0;
    let totalSpeed = 0;
    for (const p of this.particles) {
      totalSpeed += Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    }
    return totalSpeed / this.particles.length;
  }

  private getCurrentWindAngle(now: number): number {
    if (now - this.windTransitionStart < WIND_TRANSITION_DURATION) {
      const t = (now - this.windTransitionStart) / WIND_TRANSITION_DURATION;
      const easeT = t * t * (3 - 2 * t);
      let diff = this.targetWindAngle - this.windAngle;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return this.windAngle + diff * easeT;
    }
    return this.targetWindAngle;
  }

  private getConcentrationFactor(x: number, y: number): number {
    const normX = x / this.width;
    const normY = y / this.height;

    const industrialX = 0.15;
    const industrialY = 0.15;
    const distIndustrial = Math.sqrt(
      Math.pow(normX - industrialX, 2) + Math.pow(normY - industrialY, 2)
    );
    const industrialFactor = Math.max(0, 1 - distIndustrial * 3);

    const residentialX = 0.5;
    const residentialY = 0.5;
    const distResidential = Math.sqrt(
      Math.pow(normX - residentialX, 2) + Math.pow(normY - residentialY, 2)
    );
    const residentialFactor = Math.max(0, 1 - distResidential * 2.5) * 0.5;

    const parkX = 0.85;
    const parkY = 0.85;
    const distPark = Math.sqrt(
      Math.pow(normX - parkX, 2) + Math.pow(normY - parkY, 2)
    );
    const parkFactor = Math.max(0, 1 - distPark * 3) * 0.1;

    return Math.min(1, industrialFactor * 0.8 + residentialFactor + parkFactor);
  }

  private getHeatmapColor(x: number, y: number): { r: number; g: number; b: number } {
    const factor = this.getConcentrationFactor(x, y);
    const r = Math.round(0 + factor * 255);
    const g = Math.round(255 - factor * 204);
    const b = Math.round(136 - factor * 136);
    return { r, g, b };
  }

  update(deltaTime: number, now: number): void {
    const currentAngle = this.getCurrentWindAngle(now);
    this.windAngle = currentAngle;
    const windRad = (currentAngle * Math.PI) / 180;

    const targetCount = Math.floor(MIN_PARTICLES + Math.random() * (MAX_PARTICLES - MIN_PARTICLES));
    while (this.particles.length < targetCount) {
      this.particles.push(this.createParticle(false));
    }
    while (this.particles.length > targetCount && this.particles.length > MIN_PARTICLES) {
      this.particles.pop();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      const concentrationFactor = this.getConcentrationFactor(p.x, p.y);
      p.highConcentration += (concentrationFactor - p.highConcentration) * 0.08;

      const baseSpeed = 2 + concentrationFactor * 3;
      const speed = baseSpeed * (1 + Math.random() * 0.3 - 0.15);
      p.targetVx = Math.cos(windRad) * speed;
      p.targetVy = Math.sin(windRad) * speed;

      p.vx += (p.targetVx - p.vx) * 0.08;
      p.vy += (p.targetVy - p.vy) * 0.08;

      p.trail.unshift({
        x: p.x,
        y: p.y,
        color: this.getHeatmapColor(p.x, p.y)
      });
      if (p.trail.length > p.trailLength) {
        p.trail.pop();
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.height + 10;
      if (p.y > this.height + 10) p.y = -10;

      p.flickerPhase += p.flickerSpeed;
    }
  }

  render(ctx: CanvasRenderingContext2D, view: ViewState): void {
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.zoom, view.zoom);

    const isNight = this.timeOfDay <= 5 || this.timeOfDay >= 22;
    const nightBrightness = isNight ? 0.3 : 1;

    for (const p of this.particles) {
      for (let i = 0; i < p.trail.length - 1; i++) {
        const t1 = p.trail[i];
        const t2 = p.trail[i + 1];
        const alpha = (1 - i / p.trailLength) * 0.4;

        const colorFactor = p.highConcentration;
        let r = Math.round(t1.color.r * (1 - colorFactor) + 255 * colorFactor);
        let g = Math.round(t1.color.g * (1 - colorFactor) + 235 * colorFactor);
        let b = Math.round(t1.color.b * (1 - colorFactor) + 130 * colorFactor);

        r = Math.round(r * nightBrightness);
        g = Math.round(g * nightBrightness);
        b = Math.round(b * nightBrightness);

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.stroke();
      }

      let alpha = p.baseAlpha;
      if (isNight) {
        alpha *= 0.3 + Math.random() * 0.4;
      } else {
        const flicker = 0.9 + Math.sin(p.flickerPhase) * 0.1;
        alpha *= flicker;
      }

      const colorFactor = p.highConcentration;
      let r = Math.round(255 * (1 - colorFactor) + 255 * colorFactor);
      let g = Math.round(255 * (1 - colorFactor) + 235 * colorFactor);
      let b = Math.round(255 * (1 - colorFactor) + 130 * colorFactor);

      r = Math.round(r * nightBrightness);
      g = Math.round(g * nightBrightness);
      b = Math.round(b * nightBrightness);

      const flickerGlow = 0.8 + Math.sin(p.flickerPhase * 1.5) * 0.2;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5 * flickerGlow})`;
      ctx.shadowBlur = 8 * flickerGlow;

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      const innerAlpha = alpha * 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${innerAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
