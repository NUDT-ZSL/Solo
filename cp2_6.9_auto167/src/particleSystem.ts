import type { EmotionConfig } from './emotionManager';
import { hexToRgb } from './emotionManager';

function generateFaceKeypoints(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const cx = 0.5;
  const cy = 0.46;

  const faceR = 0.30;
  for (let i = 0; i < 22; i++) {
    const angle = -Math.PI / 2 + (i / 21) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * faceR,
      y: cy + Math.sin(angle) * faceR * 1.15,
    });
  }

  const leftEyeCx = cx - 0.11;
  const rightEyeCx = cx + 0.11;
  const eyeCy = cy - 0.05;
  const eyeR = 0.045;

  for (let i = 0; i < 8; i++) {
    const angle = (i / 7) * Math.PI * 2;
    points.push({
      x: leftEyeCx + Math.cos(angle) * eyeR,
      y: eyeCy + Math.sin(angle) * eyeR * 0.7,
    });
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 7) * Math.PI * 2;
    points.push({
      x: rightEyeCx + Math.cos(angle) * eyeR,
      y: eyeCy + Math.sin(angle) * eyeR * 0.7,
    });
  }

  const browY = eyeCy - 0.07;
  const browHalfW = 0.055;
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    points.push({
      x: leftEyeCx - browHalfW + t * browHalfW * 2,
      y: browY - Math.sin(t * Math.PI) * 0.008,
    });
  }
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    points.push({
      x: rightEyeCx - browHalfW + t * browHalfW * 2,
      y: browY - Math.sin(t * Math.PI) * 0.008,
    });
  }

  const noseTopY = eyeCy + 0.06;
  const noseBottomY = cy + 0.06;
  const noseW = 0.04;
  points.push({ x: cx, y: noseTopY });
  points.push({ x: cx - noseW * 0.5, y: noseBottomY - 0.02 });
  points.push({ x: cx + noseW * 0.5, y: noseBottomY - 0.02 });
  points.push({ x: cx - noseW, y: noseBottomY });
  points.push({ x: cx, y: noseBottomY + 0.005 });
  points.push({ x: cx + noseW, y: noseBottomY });

  const mouthCy = cy + 0.15;
  const mouthW = 0.11;
  const mouthH = 0.03;
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const angle = Math.PI + t * Math.PI;
    points.push({
      x: cx - mouthW + t * mouthW * 2,
      y: mouthCy + Math.sin(angle) * mouthH,
    });
  }

  return points;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseR: number;
  baseG: number;
  baseB: number;
  r: number;
  g: number;
  b: number;
  phase: number;
  targetIndex: number;
  convergeProgress: number;
  convergeDelay: number;
  randomOffsetX: number;
  randomOffsetY: number;
  noiseSeed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private keypointsNormalized: { x: number; y: number }[] = generateFaceKeypoints();
  private keypointsScaled: { x: number; y: number }[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private globalSpeed: number = 1.0;
  private converging: boolean = false;
  private convergeStartTime: number = 0;
  private readonly CONVERGE_DELAY: number = 3000;
  private readonly CONVERGE_DURATION: number = 5000;

  private gridCellSize: number = 50;
  private grid: Map<string, Particle[]> = new Map();

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.keypointsScaled = this.keypointsNormalized.map((p) => ({
      x: p.x * width,
      y: p.y * height,
    }));
  }

  public setGlobalSpeed(speed: number): void {
    this.globalSpeed = speed;
  }

  public setDensity(count: number, emotionColor: string): void {
    const rgb = hexToRgb(emotionColor);
    while (this.particles.length < count) {
      this.particles.push(this.createParticle(rgb.r, rgb.g, rgb.b));
    }
    if (this.particles.length > count) {
      this.particles.length = count;
    }
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public startConverge(time: number): void {
    this.converging = true;
    this.convergeStartTime = time;
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].targetIndex = i % this.keypointsScaled.length;
      this.particles[i].convergeProgress = 0;
      this.particles[i].convergeDelay = Math.random() * 1500;
      this.particles[i].randomOffsetX = (Math.random() - 0.5) * 20;
      this.particles[i].randomOffsetY = (Math.random() - 0.5) * 20;
    }
  }

  public update(time: number, dt: number, config: EmotionConfig): void {
    const effectiveSpeed = this.globalSpeed * config.speedMultiplier;
    const sinceStart = time - this.convergeStartTime;
    const isConverging = this.converging && sinceStart > this.CONVERGE_DELAY;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      let ax = 0;
      let ay = 0;

      if (config.sineFrequency > 0 && config.sineAmplitude > 0) {
        p.phase += config.sineFrequency;
        ax += Math.cos(p.phase) * config.sineAmplitude * 0.1;
        ay += Math.sin(p.phase * 1.3) * config.sineAmplitude * 0.1;
      }

      if (config.jitterAmount > 0) {
        ax += (Math.random() - 0.5) * config.jitterAmount;
        ay += (Math.random() - 0.5) * config.jitterAmount;
      }

      p.vx += ax;
      p.vy += ay;

      if (config.damping < 1) {
        p.vx *= config.damping;
        p.vy *= config.damping;
      }

      const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const targetSpeed = config.targetSpeed * effectiveSpeed;
      if (currentSpeed > 0 && targetSpeed > 0) {
        const speedRatio = targetSpeed / currentSpeed;
        if (speedRatio < 1) {
          p.vx *= 0.98 + speedRatio * 0.02;
          p.vy *= 0.98 + speedRatio * 0.02;
        }
      }

      const speedLimit = 5 * effectiveSpeed;
      if (currentSpeed > speedLimit) {
        const scale = speedLimit / currentSpeed;
        p.vx *= scale;
        p.vy *= scale;
      }

      if (isConverging && this.keypointsScaled.length > 0) {
        const elapsed = sinceStart - this.CONVERGE_DELAY - p.convergeDelay;
        if (elapsed > 0) {
          const t = Math.min(1, elapsed / this.CONVERGE_DURATION);
          const eased = this.easeInOutCubic(t);
          const kp = this.keypointsScaled[p.targetIndex];
          const tx = kp.x + p.randomOffsetX * (1 + config.convergeOffset * 0.1);
          const ty = kp.y + p.randomOffsetY * (1 + config.convergeOffset * 0.1);
          const forceX = (tx - p.x) * 0.05 * eased;
          const forceY = (ty - p.y) * 0.05 * eased;
          p.vx = p.vx * (1 - eased * 0.7) + forceX;
          p.vy = p.vy * (1 - eased * 0.7) + forceY;
        }
      }

      p.x += p.vx * effectiveSpeed;
      p.y += p.vy * effectiveSpeed;

      if (p.x < 20) {
        p.x = 20;
        p.vx = Math.abs(p.vx) * 0.8;
      }
      if (p.x > this.canvasWidth - 20) {
        p.x = this.canvasWidth - 20;
        p.vx = -Math.abs(p.vx) * 0.8;
      }
      if (p.y < 20) {
        p.y = 20;
        p.vy = Math.abs(p.vy) * 0.8;
      }
      if (p.y > this.canvasHeight - 20) {
        p.y = this.canvasHeight - 20;
        p.vy = -Math.abs(p.vy) * 0.8;
      }

      this.interpolateColor(p, config);
    }
  }

  public render(ctx: CanvasRenderingContext2D, config: EmotionConfig): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${p.r | 0}, ${p.g | 0}, ${p.b | 0})`;
      ctx.fill();
    }

    if (this.converging && this.keypointsScaled.length >= 22) {
      ctx.strokeStyle = this.hexWithAlpha(config.primaryColor, 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 21; i++) {
        const kp = this.keypointsScaled[i];
        if (i === 0) {
          ctx.moveTo(kp.x, kp.y);
        } else {
          ctx.lineTo(kp.x, kp.y);
        }
      }
      ctx.closePath();
      ctx.stroke();

      this.drawFeatureOutline(ctx, 22, 29);
      this.drawFeatureOutline(ctx, 30, 37);
      this.drawFeatureLine(ctx, 38, 41);
      this.drawFeatureLine(ctx, 42, 45);

      ctx.beginPath();
      for (let i = 52; i <= 59; i++) {
        const kp = this.keypointsScaled[i];
        if (i === 52) ctx.moveTo(kp.x, kp.y);
        else ctx.lineTo(kp.x, kp.y);
      }
      ctx.stroke();
    }
  }

  private drawFeatureOutline(
    ctx: CanvasRenderingContext2D,
    start: number,
    end: number
  ): void {
    ctx.beginPath();
    for (let i = start; i <= end; i++) {
      const kp = this.keypointsScaled[i];
      if (i === start) ctx.moveTo(kp.x, kp.y);
      else ctx.lineTo(kp.x, kp.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  private drawFeatureLine(
    ctx: CanvasRenderingContext2D,
    start: number,
    end: number
  ): void {
    ctx.beginPath();
    for (let i = start; i <= end; i++) {
      const kp = this.keypointsScaled[i];
      if (i === start) ctx.moveTo(kp.x, kp.y);
      else ctx.lineTo(kp.x, kp.y);
    }
    ctx.stroke();
  }

  private createParticle(
    r: number,
    g: number,
    b: number
  ): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random();
    const radius = 2 + Math.random() * 2;
    return {
      x: 20 + Math.random() * (this.canvasWidth - 40),
      y: 20 + Math.random() * (this.canvasHeight - 40),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      baseR: r,
      baseG: g,
      baseB: b,
      r,
      g,
      b,
      phase: Math.random() * Math.PI * 2,
      targetIndex: 0,
      convergeProgress: 0,
      convergeDelay: 0,
      randomOffsetX: 0,
      randomOffsetY: 0,
      noiseSeed: Math.random() * 1000,
    };
  }

  private interpolateColor(p: Particle, config: EmotionConfig): void {
    const start = hexToRgb(config.colorStart);
    const end = hexToRgb(config.colorEnd);
    const t = (Math.sin(p.phase) + 1) * 0.5;
    p.baseR = start.r + (end.r - start.r) * t;
    p.baseG = start.g + (end.g - start.g) * t;
    p.baseB = start.b + (end.b - start.b) * t;
    p.r = p.r + (p.baseR - p.r) * 0.05;
    p.g = p.g + (p.baseG - p.g) * 0.05;
    p.b = p.b + (p.baseB - p.b) * 0.05;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private hexWithAlpha(hexOrRgb: string, alpha: number): string {
    if (hexOrRgb.startsWith('#')) {
      const rgb = hexToRgb(hexOrRgb);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
    return hexOrRgb.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
}
