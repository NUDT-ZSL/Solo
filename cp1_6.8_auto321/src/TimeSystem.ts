import * as THREE from 'three';

export class TimeSystem {
  private _timeOfDay: number = 8;
  private _speed: number = 1;
  private _autoMode: boolean = true;
  private _cycleDuration: number = 120;

  private readonly dayColorA = new THREE.Color(0xffd54f);
  private readonly dayColorB = new THREE.Color(0xffab40);
  private readonly nightColorA = new THREE.Color(0x42a5f5);
  private readonly nightColorB = new THREE.Color(0x5c6bc0);
  private readonly dawnColor = new THREE.Color(0xff8a65);
  private readonly duskColor = new THREE.Color(0xef5350);

  get timeOfDay(): number {
    return this._timeOfDay;
  }

  set timeOfDay(v: number) {
    this._timeOfDay = ((v % 24) + 24) % 24;
  }

  get autoMode(): boolean {
    return this._autoMode;
  }

  set autoMode(v: boolean) {
    this._autoMode = v;
  }

  get progress(): number {
    return this._timeOfDay / 24;
  }

  update(deltaSeconds: number): void {
    if (!this._autoMode) return;
    const hoursPerSecond = 24 / this._cycleDuration;
    this._timeOfDay = (this._timeOfDay + deltaSeconds * hoursPerSecond * this._speed) % 24;
  }

  getColorA(): THREE.Color {
    return this._blendColors();
  }

  getColorB(): THREE.Color {
    const base = this._blendColors();
    const offset = new THREE.Color().copy(base);
    offset.offsetHSL(0.05, 0.1, -0.08);
    return offset;
  }

  getEmissiveColor(): THREE.Color {
    const base = this._blendColors();
    const emissive = new THREE.Color().copy(base);
    emissive.offsetHSL(0, 0, 0.15);
    return emissive;
  }

  getBackgroundColor(): THREE.Color {
    const t = this._timeOfDay;
    const nightBg = new THREE.Color(0x0a0015);
    const dayBg = new THREE.Color(0x1a0030);

    if (t >= 6 && t < 18) {
      const f = (t - 6) / 12;
      const peak = Math.sin(f * Math.PI);
      return nightBg.clone().lerp(dayBg, peak * 0.5);
    }
    return nightBg.clone();
  }

  isDaytime(): boolean {
    return this._timeOfDay >= 6 && this._timeOfDay < 18;
  }

  private _blendColors(): THREE.Color {
    const t = this._timeOfDay;
    const result = new THREE.Color();

    if (t >= 6 && t < 8) {
      const f = (t - 6) / 2;
      result.copy(this.nightColorA).lerp(this.dawnColor, this._smoothstep(f));
      result.lerp(this.dayColorA, this._smoothstep(f));
    } else if (t >= 8 && t < 16) {
      const f = (t - 8) / 8;
      result.copy(this.dayColorA).lerp(this.dayColorB, Math.sin(f * Math.PI) * 0.5);
    } else if (t >= 16 && t < 18) {
      const f = (t - 16) / 2;
      result.copy(this.dayColorB).lerp(this.duskColor, this._smoothstep(f));
    } else if (t >= 18 && t < 20) {
      const f = (t - 18) / 2;
      result.copy(this.duskColor).lerp(this.nightColorA, this._smoothstep(f));
    } else if (t >= 20 || t < 4) {
      const f = t >= 20 ? (t - 20) / 8 : (t + 4) / 8;
      result.copy(this.nightColorA).lerp(this.nightColorB, Math.sin(f * Math.PI) * 0.5);
    } else {
      const f = (t - 4) / 2;
      result.copy(this.nightColorB).lerp(this.dawnColor, this._smoothstep(f));
    }

    return result;
  }

  private _smoothstep(x: number): number {
    const c = Math.max(0, Math.min(1, x));
    return c * c * (3 - 2 * c);
  }
}
