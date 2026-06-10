export const POOL_SIZE = 4000;

export const STATE_IDLE = 0;
export const STATE_DISTORTED = 1;
export const STATE_BURSTING = 2;
export const STATE_RETURNING = 3;

export const STRIDE = 20;
export const F_BASE_X = 0;
export const F_BASE_Y = 1;
export const F_X = 2;
export const F_Y = 3;
export const F_VX = 4;
export const F_VY = 5;
export const F_COLOR_R = 6;
export const F_COLOR_G = 7;
export const F_COLOR_B = 8;
export const F_BASE_COLOR_T = 9;
export const F_COLOR_OFFSET = 10;
export const F_ALPHA = 11;
export const F_SIZE = 12;
export const F_PHASE = 13;
export const F_RETURN_SX = 14;
export const F_RETURN_SY = 15;
export const F_BURST_TX = 16;
export const F_BURST_TY = 17;
export const F_FLASH_TIMER = 18;
export const F_STATE_TIMER = 19;

export const FLAG_STRIDE = 3;
export const FL_ACTIVE = 0;
export const FL_STATE = 1;
export const FL_IS_WARM = 2;

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
  const clamped = ((t % 1) + 1) % 1;
  const scaled = clamped * len;
  const idx = Math.floor(scaled) % len;
  const frac = scaled - Math.floor(scaled);
  const a = palette[idx];
  const b = palette[(idx + 1) % len];
  return lerpColor(a, b, frac);
}

export function luminance(c: PaletteColor): number {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

export class ParticlePool {
  readonly size: number;
  data: Float32Array;
  flags: Uint8Array;

  private nextFree: number;
  private freeList: Int32Array;

  constructor(poolSize: number = POOL_SIZE) {
    this.size = poolSize;
    this.data = new Float32Array(poolSize * STRIDE);
    this.flags = new Uint8Array(poolSize * FLAG_STRIDE);

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
    const fb = idx * FLAG_STRIDE;
    const db = idx * STRIDE;
    this.flags[fb + FL_ACTIVE] = 1;
    this.flags[fb + FL_STATE] = STATE_IDLE;
    this.data[db + F_STATE_TIMER] = 0;
    this.data[db + F_ALPHA] = 1;
    this.data[db + F_VX] = 0;
    this.data[db + F_VY] = 0;
    this.data[db + F_FLASH_TIMER] = 0;
    return idx;
  }

  release(idx: number): void {
    if (idx < 0 || idx >= this.size) return;
    const fb = idx * FLAG_STRIDE;
    if (!this.flags[fb + FL_ACTIVE]) return;
    this.flags[fb + FL_ACTIVE] = 0;
    this.freeList[this.nextFree] = idx;
    this.nextFree++;
  }

  activeCount(): number {
    return this.size - this.nextFree;
  }

  reset(): void {
    this.flags.fill(0);
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
