import { Wave, WaveOptions, MouseState } from './wave';

const MAX_ACTIVE_WAVES = 60;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private waves: Wave[];
  private speedMultiplier: number;
  private mouseState: MouseState;
  private lastMouseX: number;
  private lastMouseY: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = ctx;
    this.waves = [];
    this.speedMultiplier = 1;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseState = { x: 0, y: 0, dx: 0, dy: 0 };
    this.resize();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  public setMousePosition(x: number, y: number): void {
    this.mouseState.dx = x - this.lastMouseX;
    this.mouseState.dy = y - this.lastMouseY;
    this.mouseState.x = x;
    this.mouseState.y = y;
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  public addWave(options: Omit<WaveOptions, 'speedMultiplier'>): Wave {
    const wave = new Wave({
      ...options,
      speedMultiplier: this.speedMultiplier,
    });
    this.waves.push(wave);
    if (this.waves.length > MAX_ACTIVE_WAVES) {
      this.waves.shift();
    }
    return wave;
  }

  public clearWaves(): void {
    this.waves = [];
  }

  public getActiveWaveCount(): number {
    return this.waves.filter(w => !w.halo).length;
  }

  public getHaloCount(): number {
    return this.waves.filter(w => w.halo && !w.dead).length;
  }

  public getTotalCount(): number {
    return this.waves.filter(w => !w.dead).length;
  }

  private getInterferenceHues(): Wave[] {
    return this.waves.filter(w => !w.halo && !w.dead);
  }

  private drawInterference(): void {
    const activeWaves = this.getInterferenceHues();
    if (activeWaves.length < 2) return;

    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < activeWaves.length; i++) {
      for (let j = i + 1; j < activeWaves.length; j++) {
        const w1 = activeWaves[i];
        const w2 = activeWaves[j];
        const dx = w2.x - w1.x;
        const dy = w2.y - w1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = w1.radius + w2.radius;
        const minDist = Math.abs(w1.radius - w2.radius);

        if (dist > maxDist || dist < minDist) continue;

        const avgHue = (w1.hue + w2.hue) / 2;
        const alpha1 = w1.getAlpha();
        const alpha2 = w2.getAlpha();
        const intensity = Math.min(1, (alpha1 + alpha2) * 0.65);

        const overlapArea = this.calculateOverlapArea(w1, w2, dist);
        if (overlapArea <= 0) continue;

        const centerX = (w1.x + w2.x) / 2;
        const centerY = (w1.y + w2.y) / 2;
        const avgRadius = (w1.radius + w2.radius) / 2;

        const stripeCount = Math.max(2, Math.floor(avgRadius / 16));
        for (let s = 0; s < stripeCount; s++) {
          const t = (s + 0.5) / stripeCount;
          const stripeR = avgRadius * (0.2 + t * 0.8);
          const stripeAlpha = intensity * (1 - Math.abs(t - 0.5) * 1.2) * 0.35;
          if (stripeAlpha <= 0) continue;

          const stripeWidth = 6 + t * 4;
          const gradient = ctx.createRadialGradient(
            centerX, centerY, Math.max(0.1, stripeR - stripeWidth),
            centerX, centerY, stripeR + stripeWidth
          );
          gradient.addColorStop(0, `hsla(${avgHue}, 90%, 75%, 0)`);
          gradient.addColorStop(0.5, `hsla(${avgHue}, 90%, 70%, ${stripeAlpha})`);
          gradient.addColorStop(1, `hsla(${avgHue}, 90%, 75%, 0)`);

          ctx.beginPath();
          ctx.arc(centerX, centerY, stripeR + stripeWidth, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  private calculateOverlapArea(w1: Wave, w2: Wave, dist: number): number {
    const r1 = w1.radius;
    const r2 = w2.radius;
    if (dist >= r1 + r2) return 0;
    if (dist <= Math.abs(r1 - r2)) {
      const r = Math.min(r1, r2);
      return Math.PI * r * r;
    }
    const a = (dist * dist + r1 * r1 - r2 * r2) / (2 * dist);
    const b = dist - a;
    const theta1 = 2 * Math.acos(Math.max(-1, Math.min(1, a / r1)));
    const theta2 = 2 * Math.acos(Math.max(-1, Math.min(1, b / r2)));
    return 0.5 * (r1 * r1 * (theta1 - Math.sin(theta1)) + r2 * r2 * (theta2 - Math.sin(theta2)));
  }

  public update(deltaTime: number): void {
    for (const wave of this.waves) {
      wave.update(deltaTime, this.mouseState);
    }
    this.waves = this.waves.filter(w => !w.dead);
  }

  public render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    const bgGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGradient.addColorStop(0, '#0a0a1a');
    bgGradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.globalCompositeOperation = 'lighter';

    for (const wave of this.waves) {
      wave.draw(ctx);
    }

    this.drawInterference();

    ctx.globalCompositeOperation = 'source-over';
  }
}
