export interface WaveOptions {
  x: number;
  y: number;
  hue: number;
  speedMultiplier?: number;
}

export interface MouseState {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const INITIAL_RADIUS = 10;
const MAX_RADIUS = 150;
const BASE_SPEED = 80;
const HUE_SATURATION = 95;
const HUE_LIGHTNESS = 72;
const WAVE_THICKNESS = 36;
const HALO_OPACITY = 0.25;
const HALO_DURATION = 2000;
const HALO_FLOW_SPEED = 5;

export class Wave {
  public x: number;
  public y: number;
  public radius: number;
  public maxRadius: number;
  public speed: number;
  public hue: number;
  public saturation: number;
  public lightness: number;
  public bornAt: number;
  public dead: boolean;
  public halo: boolean;
  public haloBornAt: number;
  public haloX: number;
  public haloY: number;

  constructor(options: WaveOptions) {
    this.x = options.x;
    this.y = options.y;
    this.radius = INITIAL_RADIUS;
    this.maxRadius = MAX_RADIUS;
    this.speed = BASE_SPEED * (options.speedMultiplier ?? 1);
    this.hue = options.hue;
    this.saturation = HUE_SATURATION;
    this.lightness = HUE_LIGHTNESS;
    this.bornAt = performance.now();
    this.dead = false;
    this.halo = false;
    this.haloBornAt = 0;
    this.haloX = options.x;
    this.haloY = options.y;
  }

  public update(deltaTime: number, mouseState: MouseState): void {
    if (!this.halo) {
      this.radius += this.speed * deltaTime;
      if (this.radius >= this.maxRadius) {
        this.radius = this.maxRadius;
        this.halo = true;
        this.haloBornAt = performance.now();
      }
    } else {
      const elapsed = performance.now() - this.haloBornAt;
      const angle = Math.atan2(-mouseState.dy, -mouseState.dx);
      const moveAmount = HALO_FLOW_SPEED * deltaTime;
      if (Number.isFinite(angle)) {
        this.haloX += Math.cos(angle) * moveAmount;
        this.haloY += Math.sin(angle) * moveAmount;
      }
      if (elapsed >= HALO_DURATION) {
        this.dead = true;
      }
    }
  }

  public getAlpha(): number {
    if (!this.halo) {
      const progress = (this.radius - INITIAL_RADIUS) / (this.maxRadius - INITIAL_RADIUS);
      const eased = Math.pow(progress, 0.7);
      return Math.max(0.12, 1 - eased * 0.88);
    } else {
      const elapsed = performance.now() - this.haloBornAt;
      const progress = elapsed / HALO_DURATION;
      return HALO_OPACITY * (1 - progress);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.getAlpha();
    if (alpha <= 0) return;

    const centerX = this.halo ? this.haloX : this.x;
    const centerY = this.halo ? this.haloY : this.y;

    if (!this.halo) {
      const thickness = Math.min(WAVE_THICKNESS, Math.max(8, this.radius * 0.6));
      const outerR = this.radius;
      const midR = Math.max(1, this.radius - thickness * 0.5);
      const innerR = Math.max(0.1, this.radius - thickness);

      const mainGradient = ctx.createRadialGradient(
        centerX, centerY, innerR,
        centerX, centerY, outerR
      );
      mainGradient.addColorStop(0, `hsla(${this.hue}, 100%, 85%, ${alpha * 0.6})`);
      mainGradient.addColorStop(0.3, `hsla(${this.hue}, 100%, 78%, ${alpha * 0.9})`);
      mainGradient.addColorStop(0.55, `hsla(${this.hue + 8}, 100%, 75%, ${alpha})`);
      mainGradient.addColorStop(0.8, `hsla(${this.hue + 15}, 95%, 80%, ${alpha * 0.7})`);
      mainGradient.addColorStop(1, `hsla(${this.hue + 25}, 90%, 88%, 0)`);

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerR, 0, Math.PI * 2);
      ctx.fillStyle = mainGradient;
      ctx.fill();

      if (midR > 1) {
        const coreGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, midR
        );
        const coreHue = this.hue - 5;
        coreGradient.addColorStop(0, `hsla(${coreHue}, 100%, 92%, ${alpha * 0.35})`);
        coreGradient.addColorStop(0.4, `hsla(${coreHue}, 100%, 88%, ${alpha * 0.22})`);
        coreGradient.addColorStop(0.75, `hsla(${coreHue}, 98%, 82%, ${alpha * 0.15})`);
        coreGradient.addColorStop(1, `hsla(${this.hue}, 100%, 78%, ${alpha * 0.5})`);

        ctx.beginPath();
        ctx.arc(centerX, centerY, midR, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();
      }
    } else {
      const ringWidth = 5;
      const innerR = Math.max(0.1, this.radius - ringWidth);
      const outerR = this.radius + ringWidth;
      const gradient = ctx.createRadialGradient(
        centerX, centerY, innerR,
        centerX, centerY, outerR
      );
      gradient.addColorStop(0, `hsla(${this.hue}, 100%, 88%, 0)`);
      gradient.addColorStop(0.3, `hsla(${this.hue}, 100%, 80%, ${alpha * 0.7})`);
      gradient.addColorStop(0.5, `hsla(${this.hue}, 100%, 75%, ${alpha})`);
      gradient.addColorStop(0.7, `hsla(${this.hue}, 100%, 80%, ${alpha * 0.7})`);
      gradient.addColorStop(1, `hsla(${this.hue}, 100%, 88%, 0)`);

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerR, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }
}
