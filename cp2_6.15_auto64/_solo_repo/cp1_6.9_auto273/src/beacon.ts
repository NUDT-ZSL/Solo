import tinycolor from 'tinycolor2';

export interface BeaconState {
  x: number;
  y: number;
  hue: number;
  brightness: number;
  baseSize: number;
  pulsePeriod: number;
  id: string;
}

export class Beacon {
  x: number;
  y: number;
  hue: number;
  brightness: number;
  baseSize: number = 30;
  pulsePeriod: number;
  selected: boolean = false;
  id: string;
  private pulseStartTime: number;
  private spawnTime: number;

  constructor(x: number, y: number, hue?: number) {
    this.x = x;
    this.y = y;
    this.hue = hue !== undefined ? hue : Math.floor(Math.random() * 360);
    this.brightness = 90;
    this.pulsePeriod = 1500 + Math.random() * 1000;
    this.id = `beacon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.pulseStartTime = performance.now();
    this.spawnTime = performance.now();
  }

  static fromState(state: BeaconState): Beacon {
    const beacon = new Beacon(state.x, state.y, state.hue);
    beacon.brightness = state.brightness;
    beacon.baseSize = state.baseSize;
    beacon.pulsePeriod = state.pulsePeriod;
    beacon.id = state.id;
    return beacon;
  }

  toState(): BeaconState {
    return {
      x: this.x,
      y: this.y,
      hue: this.hue,
      brightness: this.brightness,
      baseSize: this.baseSize,
      pulsePeriod: this.pulsePeriod,
      id: this.id
    };
  }

  getSize(time: number): number {
    const elapsed = time - this.pulseStartTime;
    const phase = (elapsed % this.pulsePeriod) / this.pulsePeriod;
    const pulse = Math.sin(phase * Math.PI * 2) * 6;
    return this.baseSize + pulse;
  }

  getColor(): string {
    const saturation = 80;
    return tinycolor({ h: this.hue, s: saturation, v: this.brightness }).toHslString();
  }

  getColorRgb(): { r: number; g: number; b: number } {
    const saturation = 80;
    const tc = tinycolor({ h: this.hue, s: saturation, v: this.brightness });
    const rgb = tc.toRgb();
    return { r: rgb.r, g: rgb.g, b: rgb.b };
  }

  contains(px: number, py: number, time: number): boolean {
    const size = this.getSize(time);
    const radius = size / 2 + 8;
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  getSpawnProgress(time: number): number {
    const elapsed = time - this.spawnTime;
    return Math.min(1, elapsed / 400);
  }

  update(time: number): void {
    // Update logic if needed in future
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const size = this.getSize(time);
    const radius = size / 2;
    const spawnProgress = this.getSpawnProgress(time);
    const rgb = this.getColorRgb();
    const alpha = spawnProgress;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Outer glow
    const glowGradient = ctx.createRadialGradient(
      this.x, this.y, radius * 0.5,
      this.x, this.y, radius * 4
    );
    glowGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
    glowGradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
    glowGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius * 4, 0, Math.PI * 2);
    ctx.fill();

    // Main body with shadow
    ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
    ctx.shadowBlur = 12;
    
    const bodyGradient = ctx.createRadialGradient(
      this.x - radius * 0.3, this.y - radius * 0.3, 0,
      this.x, this.y, radius
    );
    bodyGradient.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
    bodyGradient.addColorStop(0.2, `rgba(${Math.min(255, rgb.r + 80)}, ${Math.min(255, rgb.g + 80)}, ${Math.min(255, rgb.b + 80)}, 0.9)`);
    bodyGradient.addColorStop(0.6, this.getColor());
    bodyGradient.addColorStop(1, `rgba(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)}, 1)`);
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Selection ring
    if (this.selected) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255, 255, 255, 0.85)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}
