export const POOL_SIZE = 4000;

export const STATE_IDLE = 0;
export const STATE_DISTORTED = 1;
export const STATE_BURSTING = 2;
export const STATE_RETURNING = 3;

export interface PaletteColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): PaletteColor {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

export function lerpColor(a: PaletteColor, b: PaletteColor, t: number): PaletteColor {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

export function samplePalette(palette: PaletteColor[], t: number): PaletteColor {
  const len = palette.length;
  if (len === 0) return { r: 255, g: 255, b: 255 };
  if (len === 1) return palette[0];
  const scaled = t * len;
  const idx = Math.floor(scaled) % len;
  const frac = scaled - Math.floor(scaled);
  const a = palette[idx];
  const b = palette[(idx + 1) % len];
  return lerpColor(a, b, frac);
}

export class ParticlePool {
  readonly size: number;

  baseX: Float32Array;
  baseY: Float32Array;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  colorR: Float32Array;
  colorG: Float32Array;
  colorB: Float32Array;
  baseColorT: Float32Array;
  colorOffset: Float32Array;
  alpha: Float32Array;
  particleSize: Float32Array;
  phase: Float32Array;
  state: Uint8Array;
  stateTimer: Float32Array;
  returnStartX: Float32Array;
  returnStartY: Float32Array;
  burstTargetX: Float32Array;
  burstTargetY: Float32Array;
  flashTimer: Float32Array;
  active: Uint8Array;
  isWarm: Uint8Array;

  private nextFree: number;
  private freeList: Int32Array;

  constructor(poolSize: number = POOL_SIZE) {
    this.size = poolSize;

    this.baseX = new Float32Array(poolSize);
    this.baseY = new Float32Array(poolSize);
    this.x = new Float32Array(poolSize);
    this.y = new Float32Array(poolSize);
    this.vx = new Float32Array(poolSize);
    this.vy = new Float32Array(poolSize);
    this.colorR = new Float32Array(poolSize);
    this.colorG = new Float32Array(poolSize);
    this.colorB = new Float32Array(poolSize);
    this.baseColorT = new Float32Array(poolSize);
    this.colorOffset = new Float32Array(poolSize);
    this.alpha = new Float32Array(poolSize);
    this.particleSize = new Float32Array(poolSize);
    this.phase = new Float32Array(poolSize);
    this.state = new Uint8Array(poolSize);
    this.stateTimer = new Float32Array(poolSize);
    this.returnStartX = new Float32Array(poolSize);
    this.returnStartY = new Float32Array(poolSize);
    this.burstTargetX = new Float32Array(poolSize);
    this.burstTargetY = new Float32Array(poolSize);
    this.flashTimer = new Float32Array(poolSize);
    this.active = new Uint8Array(poolSize);
    this.isWarm = new Uint8Array(poolSize);

    this.freeList = new Int32Array(poolSize);
    for (let i = 0; i < poolSize; i++) {
      this.freeList[i] = poolSize - 1 - i;
    }
    this.nextFree = poolSize;
  }

  acquire(): number {
    if (this.nextFree <= 0) return -1;
    this.nextFree--;
    const idx = this.freeList[this.nextFree];
    this.active[idx] = 1;
    this.state[idx] = STATE_IDLE;
    this.stateTimer[idx] = 0;
    this.alpha[idx] = 1;
    this.vx[idx] = 0;
    this.vy[idx] = 0;
    this.flashTimer[idx] = 0;
    return idx;
  }

  release(idx: number): void {
    if (idx < 0 || idx >= this.size) return;
    if (!this.active[idx]) return;
    this.active[idx] = 0;
    this.freeList[this.nextFree] = idx;
    this.nextFree++;
  }

  activeCount(): number {
    return this.size - this.nextFree;
  }

  reset(): void {
    this.active.fill(0);
    for (let i = 0; i < this.size; i++) {
      this.freeList[i] = this.size - 1 - i;
    }
    this.nextFree = this.size;
  }
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
