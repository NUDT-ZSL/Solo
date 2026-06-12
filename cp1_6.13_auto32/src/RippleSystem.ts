export interface RippleSource {
  id: number;
  x: number;
  z: number;
  startTime: number;
  duration: number;
  pulseWidth: number;
  peakMultiplier: number;
}

const RIPPLE_DURATION = 3000;
const PULSE_WIDTH = 40;
const PEAK_MULTIPLIER = 1.5;
const SPREAD_SPEED = 0.12;
const WAVELENGTH = 30;

export class RippleSystem {
  public ripples: RippleSource[] = [];
  private nextId = 1;

  public add(x: number, z: number, time: number): RippleSource {
    const ripple: RippleSource = {
      id: this.nextId++,
      x,
      z,
      startTime: time,
      duration: RIPPLE_DURATION,
      pulseWidth: PULSE_WIDTH,
      peakMultiplier: PEAK_MULTIPLIER
    };
    this.ripples.push(ripple);
    return ripple;
  }

  public update(time: number): void {
    this.ripples = this.ripples.filter(
      (r) => time - r.startTime < r.duration
    );
  }

  public getContribution(
    x: number,
    z: number,
    time: number,
    baseAmplitude: number,
    decayFactor: number
  ): number {
    if (this.ripples.length === 0) return 0;

    let total = 0;
    for (const ripple of this.ripples) {
      const dt = time - ripple.startTime;
      if (dt <= 0 || dt >= ripple.duration) continue;

      const dx = x - ripple.x;
      const dz = z - ripple.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const spread = SPREAD_SPEED * dt;
      const diff = distance - spread;

      const sigma = ripple.pulseWidth * 0.5;
      const gaussian = Math.exp(-(diff * diff) / (2 * sigma * sigma));

      const phase = (2 * Math.PI * diff) / WAVELENGTH;
      const oscillation = Math.cos(phase);

      const decay = Math.pow(decayFactor, dt / 16);

      const lifeT = 1 - dt / ripple.duration;
      const envelope = lifeT * lifeT;

      const peak = baseAmplitude * ripple.peakMultiplier;
      total += peak * gaussian * oscillation * decay * envelope;
    }
    return total;
  }

  public get count(): number {
    return this.ripples.length;
  }
}
