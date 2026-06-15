import * as THREE from 'three';

export type TimeMode = 'auto' | 'manual';

export interface TimeColors {
  base: THREE.Color;
  emissive: THREE.Color;
  background: THREE.Color;
}

interface ColorStop {
  hour: number;
  base: [number, number, number];
  emissive: [number, number, number];
  bg: [number, number, number];
}

const COLOR_STOPS: ColorStop[] = [
  { hour: 0,  base: [0.27, 0.27, 1.0],  emissive: [0.15, 0.15, 0.6],  bg: [0.02, 0.01, 0.08] },
  { hour: 4,  base: [0.20, 0.15, 0.55],  emissive: [0.12, 0.08, 0.40], bg: [0.03, 0.01, 0.09] },
  { hour: 6,  base: [0.90, 0.50, 0.25],  emissive: [0.60, 0.30, 0.15], bg: [0.10, 0.05, 0.06] },
  { hour: 8,  base: [1.00, 0.84, 0.34],  emissive: [0.80, 0.65, 0.25], bg: [0.06, 0.04, 0.04] },
  { hour: 12, base: [1.00, 0.63, 0.25],  emissive: [0.80, 0.50, 0.20], bg: [0.05, 0.03, 0.04] },
  { hour: 16, base: [1.00, 0.78, 0.25],  emissive: [0.80, 0.58, 0.20], bg: [0.06, 0.04, 0.04] },
  { hour: 18, base: [0.85, 0.35, 0.20],  emissive: [0.60, 0.25, 0.12], bg: [0.08, 0.04, 0.06] },
  { hour: 20, base: [0.29, 0.20, 0.51],  emissive: [0.22, 0.12, 0.40], bg: [0.04, 0.02, 0.10] },
  { hour: 22, base: [0.27, 0.15, 0.51],  emissive: [0.18, 0.10, 0.35], bg: [0.03, 0.01, 0.09] },
  { hour: 24, base: [0.27, 0.27, 1.0],  emissive: [0.15, 0.15, 0.6],  bg: [0.02, 0.01, 0.08] },
];

function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export class TimeSystem {
  private _progress: number;
  private _mode: TimeMode = 'auto';
  private _speed: number = 1 / 120;
  private _listeners: Array<(progress: number, colors: TimeColors) => void> = [];

  constructor() {
    const now = new Date();
    this._progress = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  }

  update(deltaSeconds: number): void {
    if (this._mode === 'auto') {
      this._progress += deltaSeconds * this._speed;
      if (this._progress >= 1) this._progress -= 1;
    }
    const colors = this.getColors();
    for (const fn of this._listeners) fn(this._progress, colors);
  }

  setProgress(p: number): void {
    this._progress = Math.max(0, Math.min(1, p));
  }

  getProgress(): number {
    return this._progress;
  }

  setMode(m: TimeMode): void {
    this._mode = m;
  }

  getMode(): TimeMode {
    return this._mode;
  }

  getColors(): TimeColors {
    const hour = this._progress * 24;
    let lo = COLOR_STOPS[0];
    let hi = COLOR_STOPS[COLOR_STOPS.length - 1];
    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
      if (hour >= COLOR_STOPS[i].hour && hour < COLOR_STOPS[i + 1].hour) {
        lo = COLOR_STOPS[i];
        hi = COLOR_STOPS[i + 1];
        break;
      }
    }
    const span = hi.hour - lo.hour;
    const t = span > 0 ? (hour - lo.hour) / span : 0;
    const base = lerp3(lo.base, hi.base, t);
    const em = lerp3(lo.emissive, hi.emissive, t);
    const bg = lerp3(lo.bg, hi.bg, t);
    return {
      base: new THREE.Color(base[0], base[1], base[2]),
      emissive: new THREE.Color(em[0], em[1], em[2]),
      background: new THREE.Color(bg[0], bg[1], bg[2]),
    };
  }

  onChange(fn: (progress: number, colors: TimeColors) => void): void {
    this._listeners.push(fn);
  }
}
