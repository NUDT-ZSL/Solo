import { RippleSystem, RippleSource } from './RippleSystem';

export interface WaveParams {
  amplitude: number;
  frequency: number;
  decay: number;
}

const DEFAULT_PARAMS: WaveParams = {
  amplitude: 20,
  frequency: 1.5,
  decay: 0.995
};

export class WaveModel {
  public params: WaveParams;
  public rippleSystem: RippleSystem;

  constructor(params?: Partial<WaveParams>) {
    this.params = { ...DEFAULT_PARAMS, ...params };
    this.rippleSystem = new RippleSystem();
  }

  public setParams(p: Partial<WaveParams>): void {
    this.params = { ...this.params, ...p };
  }

  public addRipple(x: number, z: number, time: number): RippleSource {
    return this.rippleSystem.add(x, z, time);
  }

  public update(time: number): void {
    this.rippleSystem.update(time);
  }

  private getBaseHeight(x: number, z: number, tSec: number): number {
    const A = this.params.amplitude;
    const f = this.params.frequency;
    const omega = 2 * Math.PI * f;

    const w1 = A * Math.sin(omega * tSec + 0.04 * x);
    const w2 = A * 1.3 * Math.sin(omega * 1.15 * tSec + 0.035 * z + 0.8);
    const w3 = A * 0.7 * Math.sin(omega * 0.85 * tSec + 0.02 * x + 0.025 * z + 1.6);

    return (w1 + w2 + w3) / 3;
  }

  public getHeightAt(x: number, z: number, time: number): number {
    const tSec = time / 1000;
    const base = this.getBaseHeight(x, z, tSec);
    const ripple = this.rippleSystem.getContribution(
      x,
      z,
      time,
      this.params.amplitude,
      this.params.decay
    );
    return base + ripple;
  }
}
