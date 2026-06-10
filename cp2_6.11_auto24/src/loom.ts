import {
  ParticlePool,
  PaletteColor,
  hexToRgb,
  samplePalette,
  luminance,
  easeOutCubic,
  easeOutQuad,
  STRIDE,
  F_BASE_X, F_BASE_Y, F_X, F_Y, F_VX, F_VY,
  F_COLOR_R, F_COLOR_G, F_COLOR_B,
  F_BASE_COLOR_T, F_COLOR_OFFSET, F_ALPHA, F_SIZE, F_PHASE,
  F_RETURN_SX, F_RETURN_SY, F_BURST_TX, F_BURST_TY,
  F_FLASH_TIMER, F_STATE_TIMER,
  FLAG_STRIDE, FL_ACTIVE, FL_STATE, FL_IS_WARM,
  STATE_IDLE, STATE_DISTORTED, STATE_BURSTING, STATE_RETURNING,
  POOL_SIZE
} from './particle.js';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface BurstRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
}

const WARM_PALETTE: PaletteColor[] = [
  hexToRgb('#FF6B35'),
  hexToRgb('#FF8C42'),
  hexToRgb('#FFB347'),
  hexToRgb('#FFD700')
];

const COOL_PALETTE: PaletteColor[] = [
  hexToRgb('#4ECDC4'),
  hexToRgb('#5DADE2'),
  hexToRgb('#8E7CC3'),
  hexToRgb('#6C5CE7')
];

const INITIAL_PARTICLES = 2000;
const SINE_FREQ = 0.5;
const SINE_AMP_BASE = 1;
const MAX_DISTORT_OFFSET = 50;
const DISTORT_RADIUS = 80;
const BURST_RADIUS = 80;
const BURST_MAX_RADIUS = 150;
const TRAIL_LIFE = 1.0;
const RETURN_DURATION = 0.5;
const BURST_DURATION = 0.1;
const BURST_RETURN_DURATION = 0.8;
const FLASH_INTERVAL = 0.15;
const FLASH_COUNT = 2;
const BURST_RING_DURATION = 0.4;

export class Loom {
  pool: ParticlePool;
  private width: number;
  private height: number;
  private offsetX: number;
  private offsetY: number;

  density: number;
  tension: number;
  colorSpeed: number;

  warmPalette: PaletteColor[];
  coolPalette: PaletteColor[];

  trails: TrailPoint[];
  burstRings: BurstRing[];

  dirty: boolean;
  private time: number;
  private colorTime: number;
  private gridCols: number;
  private gridRows: number;
  private cachedBrightColor: PaletteColor;

  constructor() {
    this.pool = new ParticlePool(POOL_SIZE);
    this.width = 0;
    this.height = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    this.density = 5;
    this.tension = 5;
    this.colorSpeed = 1;

    this.warmPalette = WARM_PALETTE;
    this.coolPalette = COOL_PALETTE;

    this.trails = [];
    this.burstRings = [];

    this.dirty = true;
    this.time = 0;
    this.colorTime = 0;
    this.gridCols = 0;
    this.gridRows = 0;
    this.cachedBrightColor = this.computeBrightestColor();
  }

  private computeBrightestColor(): PaletteColor {
    const all = [...this.warmPalette, ...this.coolPalette];
    let maxL = -1;
    let best = all[0];
    for (const c of all) {
      const l = luminance(c);
      if (l > maxL) { maxL = l; best = c; }
    }
    return best;
  }

  getBrightestTrailColor(): PaletteColor {
    return this.cachedBrightColor;
  }

  setViewport(vw: number, vh: number): void {
    const panelW = vw < 768 ? 0 : 280;
    const availW = vw - panelW;
    this.width = availW * 0.6;
    this.height = vh * 0.7;
    if (this.width < 100) this.width = availW * 0.9;
    if (this.height < 100) this.height = vh * 0.55;
    this.offsetX = panelW + (availW - this.width) / 2;
    this.offsetY = (vh - this.height) / 2;
    this.dirty = true;
  }

  initParticles(count: number = INITIAL_PARTICLES): void {
    this.pool.reset();
    this.trails.length = 0;
    this.burstRings.length = 0;

    const aspect = this.width / this.height;
    this.gridCols = Math.ceil(Math.sqrt(count * aspect));
    this.gridRows = Math.ceil(count / this.gridCols);
    const actual = this.gridCols * this.gridRows;
    const stepX = this.width / (this.gridCols + 1);
    const stepY = this.height / (this.gridRows + 1);

    const data = this.pool.data;
    const flags = this.pool.flags;
    let created = 0;
    for (let row = 0; row < this.gridRows && created < actual; row++) {
      for (let col = 0; col < this.gridCols && created < actual; col++) {
        const idx = this.pool.acquire();
        if (idx < 0) return;
        const db = idx * STRIDE;
        const fb = idx * FLAG_STRIDE;
        const bx = stepX * (col + 1);
        const by = stepY * (row + 1);
        data[db + F_BASE_X] = bx;
        data[db + F_BASE_Y] = by;
        data[db + F_X] = bx;
        data[db + F_Y] = by;
        data[db + F_SIZE] = 4;
        data[db + F_PHASE] = Math.random() * Math.PI * 2;
        data[db + F_BASE_COLOR_T] = Math.random();
        data[db + F_COLOR_OFFSET] = Math.random() * 10;
        flags[fb + FL_IS_WARM] = Math.random() < 0.5 ? 1 : 0;
        flags[fb + FL_STATE] = STATE_IDLE;
        data[db + F_STATE_TIMER] = 0;
        created++;
      }
    }
    this.dirty = true;
  }

  setDensity(value: number): void {
    const v = Math.max(1, Math.min(10, value));
    if (v === this.density) return;
    this.density = v;
    const factor = v / 5;
    const count = Math.round(INITIAL_PARTICLES * factor);
    this.initParticles(Math.min(count, 2000));
  }

  setTension(value: number): void {
    this.tension = Math.max(0, Math.min(10, value));
    this.dirty = true;
  }

  setColorSpeed(value: number): void {
    this.colorSpeed = Math.max(0, Math.min(5, value));
    this.dirty = true;
  }

  getOffsetX(): number { return this.offsetX; }
  getOffsetY(): number { return this.offsetY; }
  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }

  containsPoint(lx: number, ly: number): boolean {
    return lx >= 0 && lx <= this.width && ly >= 0 && ly <= this.height;
  }

  distortRegion(centerX: number, centerY: number, offsetDX: number, offsetDY: number): void {
    const dist = Math.sqrt(offsetDX * offsetDX + offsetDY * offsetDY);
    if (dist < 0.5) return;
    const clampedDist = Math.min(dist, MAX_DISTORT_OFFSET);
    const nx = clampedDist / (dist || 1);
    const ox = offsetDX * nx;
    const oy = offsetDY * nx;

    const r2 = DISTORT_RADIUS * DISTORT_RADIUS;
    const data = this.pool.data;
    const flags = this.pool.flags;
    for (let i = 0; i < this.pool.size; i++) {
      const fb = i * FLAG_STRIDE;
      if (!flags[fb + FL_ACTIVE]) continue;
      const db = i * STRIDE;
      const dx = data[db + F_X] - centerX;
      const dy = data[db + F_Y] - centerY;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        const falloff = 1 - d2 / r2;
        data[db + F_VX] = ox * falloff;
        data[db + F_VY] = oy * falloff;
        flags[fb + FL_STATE] = STATE_DISTORTED;
        data[db + F_STATE_TIMER] = 0;
      }
    }
    this.dirty = true;
  }

  beginReturnForDistorted(): void {
    const data = this.pool.data;
    const flags = this.pool.flags;
    for (let i = 0; i < this.pool.size; i++) {
      const fb = i * FLAG_STRIDE;
      if (!flags[fb + FL_ACTIVE]) continue;
      if (flags[fb + FL_STATE] === STATE_DISTORTED) {
        const db = i * STRIDE;
        flags[fb + FL_STATE] = STATE_RETURNING;
        data[db + F_STATE_TIMER] = 0;
        data[db + F_RETURN_SX] = data[db + F_X];
        data[db + F_RETURN_SY] = data[db + F_Y];
      }
    }
    this.dirty = true;
  }

  burstAt(x: number, y: number): void {
    const r2 = BURST_RADIUS * BURST_RADIUS;
    const data = this.pool.data;
    const flags = this.pool.flags;

    const ghostSources: number[] = [];
    for (let i = 0; i < this.pool.size; i++) {
      const fb = i * FLAG_STRIDE;
      if (!flags[fb + FL_ACTIVE]) continue;
      const db = i * STRIDE;
      const dx = data[db + F_BASE_X] - x;
      const dy = data[db + F_BASE_Y] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        ghostSources.push(i);
      }
    }

    for (let i = 0; i < this.pool.size; i++) {
      const fb = i * FLAG_STRIDE;
      if (!flags[fb + FL_ACTIVE]) continue;
      const db = i * STRIDE;
      const dx = data[db + F_BASE_X] - x;
      const dy = data[db + F_BASE_Y] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        const d = Math.sqrt(d2);
        const falloff = 1 - d / BURST_RADIUS;
        const burstDist = 20 + falloff * 20;
        const angle = Math.random() * Math.PI * 2;
        data[db + F_BURST_TX] = data[db + F_BASE_X] + Math.cos(angle) * burstDist;
        data[db + F_BURST_TY] = data[db + F_BASE_Y] + Math.sin(angle) * burstDist;
        flags[fb + FL_STATE] = STATE_BURSTING;
        data[db + F_STATE_TIMER] = 0;
        data[db + F_FLASH_TIMER] = FLASH_COUNT * FLASH_INTERVAL * 2;
      }
    }

    for (let k = 0; k < ghostSources.length && k < 2000; k++) {
      const src = ghostSources[k];
      const srcDb = src * STRIDE;
      const srcFb = src * FLAG_STRIDE;
      const idx = this.pool.acquire();
      if (idx < 0) break;
      const db = idx * STRIDE;
      const fb = idx * FLAG_STRIDE;
      data[db + F_BASE_X] = data[srcDb + F_BASE_X];
      data[db + F_BASE_Y] = data[srcDb + F_BASE_Y];
      data[db + F_X] = data[srcDb + F_BASE_X];
      data[db + F_Y] = data[srcDb + F_BASE_Y];
      const angle = Math.random() * Math.PI * 2;
      const burstDist = 25 + Math.random() * 15;
      data[db + F_BURST_TX] = data[db + F_BASE_X] + Math.cos(angle) * burstDist;
      data[db + F_BURST_TY] = data[db + F_BASE_Y] + Math.sin(angle) * burstDist;
      data[db + F_SIZE] = 3;
      data[db + F_PHASE] = data[srcDb + F_PHASE];
      data[db + F_BASE_COLOR_T] = data[srcDb + F_BASE_COLOR_T];
      data[db + F_COLOR_OFFSET] = data[srcDb + F_COLOR_OFFSET];
      flags[fb + FL_IS_WARM] = flags[srcFb + FL_IS_WARM];
      flags[fb + FL_STATE] = STATE_BURSTING;
      data[db + F_STATE_TIMER] = 0;
      data[db + F_FLASH_TIMER] = FLASH_COUNT * FLASH_INTERVAL * 2;
    }

    const mixR = (WARM_PALETTE[0].r + COOL_PALETTE[0].r + WARM_PALETTE[WARM_PALETTE.length - 1].r) / 3;
    const mixG = (WARM_PALETTE[0].g + COOL_PALETTE[0].g + WARM_PALETTE[WARM_PALETTE.length - 1].g) / 3;
    const mixB = (WARM_PALETTE[0].b + COOL_PALETTE[0].b + WARM_PALETTE[WARM_PALETTE.length - 1].b) / 3;
    this.burstRings.push({
      x, y, radius: 0, maxRadius: BURST_MAX_RADIUS,
      life: BURST_RING_DURATION, maxLife: BURST_RING_DURATION,
      r: mixR, g: mixG, b: mixB
    });
    this.dirty = true;
  }

  addTrailPoint(x: number, y: number): void {
    if (this.trails.length > 0) {
      const last = this.trails[this.trails.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      if (dx * dx + dy * dy < 9) return;
    }
    this.trails.push({ x, y, alpha: 1.0, life: TRAIL_LIFE, maxLife: TRAIL_LIFE });
    while (this.trails.length > 200) {
      this.trails.shift();
    }
    this.dirty = true;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.colorSpeed > 0) {
      this.colorTime += dt * this.colorSpeed * 0.15;
    }
    const data = this.pool.data;
    const flags = this.pool.flags;
    const tensionFactor = this.tension / 5;
    const sineAmp = SINE_AMP_BASE * tensionFactor;
    const omega = SINE_FREQ * Math.PI * 2;

    for (let i = 0; i < this.pool.size; i++) {
      const fb = i * FLAG_STRIDE;
      if (!flags[fb + FL_ACTIVE]) continue;
      const db = i * STRIDE;

      const palette = flags[fb + FL_IS_WARM] ? this.warmPalette : this.coolPalette;
      const colT = ((data[db + F_BASE_COLOR_T] + this.colorTime + data[db + F_COLOR_OFFSET] * 0.05) % 1 + 1) % 1;
      const col = samplePalette(palette, colT);

      data[db + F_STATE_TIMER] += dt;

      if (data[db + F_FLASH_TIMER] > 0) {
        data[db + F_FLASH_TIMER] -= dt;
        const flashTotalDur = FLASH_COUNT * FLASH_INTERVAL * 2;
        const flashPhase = data[db + F_FLASH_TIMER] / flashTotalDur;
        const cyclePos = (data[db + F_FLASH_TIMER] % (FLASH_INTERVAL * 2)) / (FLASH_INTERVAL * 2);
        const flashing = cyclePos < 0.5;
        if (flashing && flashPhase > 0) {
          data[db + F_COLOR_R] = 255;
          data[db + F_COLOR_G] = 255;
          data[db + F_COLOR_B] = 255;
        } else {
          data[db + F_COLOR_R] = col.r;
          data[db + F_COLOR_G] = col.g;
          data[db + F_COLOR_B] = col.b;
        }
      } else {
        data[db + F_COLOR_R] = col.r;
        data[db + F_COLOR_G] = col.g;
        data[db + F_COLOR_B] = col.b;
      }

      switch (flags[fb + FL_STATE]) {
        case STATE_IDLE: {
          const sx = Math.sin(omega * this.time + data[db + F_PHASE]) * sineAmp;
          const sy = Math.cos(omega * this.time + data[db + F_PHASE] * 1.3) * sineAmp * 0.6;
          data[db + F_X] = data[db + F_BASE_X] + sx;
          data[db + F_Y] = data[db + F_BASE_Y] + sy;
          break;
        }
        case STATE_DISTORTED: {
          data[db + F_X] += data[db + F_VX];
          data[db + F_Y] += data[db + F_VY];
          data[db + F_VX] *= 0.85;
          data[db + F_VY] *= 0.85;
          break;
        }
        case STATE_BURSTING: {
          const t = Math.min(1, data[db + F_STATE_TIMER] / BURST_DURATION);
          const e = easeOutQuad(t);
          data[db + F_X] = data[db + F_BASE_X] + (data[db + F_BURST_TX] - data[db + F_BASE_X]) * e;
          data[db + F_Y] = data[db + F_BASE_Y] + (data[db + F_BURST_TY] - data[db + F_BASE_Y]) * e;
          if (t >= 1) {
            flags[fb + FL_STATE] = STATE_RETURNING;
            data[db + F_STATE_TIMER] = 0;
            data[db + F_RETURN_SX] = data[db + F_X];
            data[db + F_RETURN_SY] = data[db + F_Y];
          }
          break;
        }
        case STATE_RETURNING: {
          const dur = data[db + F_FLASH_TIMER] > 0 ? BURST_RETURN_DURATION : RETURN_DURATION;
          const t = Math.min(1, data[db + F_STATE_TIMER] / dur);
          const e = easeOutCubic(t);
          data[db + F_X] = data[db + F_RETURN_SX] + (data[db + F_BASE_X] - data[db + F_RETURN_SX]) * e;
          data[db + F_Y] = data[db + F_RETURN_SY] + (data[db + F_BASE_Y] - data[db + F_RETURN_SY]) * e;
          if (t >= 1) {
            flags[fb + FL_STATE] = STATE_IDLE;
            data[db + F_STATE_TIMER] = 0;
            if (data[db + F_SIZE] < 3.5) {
              this.pool.release(i);
            }
          }
          break;
        }
      }
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].life -= dt;
      this.trails[i].alpha = Math.max(0, this.trails[i].life / this.trails[i].maxLife);
      if (this.trails[i].life <= 0) {
        this.trails.splice(i, 1);
      }
    }

    for (let i = this.burstRings.length - 1; i >= 0; i--) {
      const ring = this.burstRings[i];
      ring.life -= dt;
      const t = 1 - ring.life / ring.maxLife;
      ring.radius = ring.maxRadius * t;
      if (ring.life <= 0) {
        this.burstRings.splice(i, 1);
      }
    }

    this.dirty = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);

    const grad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 1.2
    );
    grad.addColorStop(0, 'rgba(108, 92, 231, 0.12)');
    grad.addColorStop(1, 'rgba(11, 19, 43, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-40, -40, this.width + 80, this.height + 80);

    const cols = this.gridCols;
    const rows = this.gridRows;
    if (cols > 0 && rows > 0) {
      ctx.strokeStyle = 'rgba(78, 205, 196, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const stepX = this.width / (cols + 1);
      for (let c = 1; c <= cols; c++) {
        const x = stepX * c;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
      }
      const stepY = this.height / (rows + 1);
      for (let r = 1; r <= rows; r++) {
        const y = stepY * r;
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
      }
      ctx.stroke();
    }

    if (this.trails.length >= 2) {
      const bright = this.getBrightestTrailColor();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < this.trails.length; i++) {
        const p0 = this.trails[i - 1];
        const p1 = this.trails[i];
        const a = (p0.alpha + p1.alpha) / 2;
        if (a <= 0) continue;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${bright.r | 0}, ${bright.g | 0}, ${bright.b | 0}, ${a.toFixed(3)})`;
        ctx.lineWidth = 6 * a;
        ctx.shadowColor = `rgba(${bright.r | 0}, ${bright.g | 0}, ${bright.b | 0}, ${(a * 0.8).toFixed(3)})`;
        ctx.shadowBlur = 12;
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    const data = this.pool.data;
    const fl = this.pool.flags;
    ctx.shadowBlur = 8;
    for (let i = 0; i < this.pool.size; i++) {
      const fb = i * FLAG_STRIDE;
      if (!fl[fb + FL_ACTIVE]) continue;
      const db = i * STRIDE;
      const r = data[db + F_COLOR_R];
      const g = data[db + F_COLOR_G];
      const b = data[db + F_COLOR_B];
      ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${data[db + F_ALPHA]})`;
      ctx.shadowColor = `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0.7)`;
      const sz = data[db + F_SIZE];
      ctx.beginPath();
      ctx.arc(data[db + F_X], data[db + F_Y], sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (let i = 0; i < this.burstRings.length; i++) {
      const ring = this.burstRings[i];
      const a = ring.life / ring.maxLife;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${ring.r | 0}, ${ring.g | 0}, ${ring.b | 0}, ${(a * 0.7).toFixed(3)})`;
      ctx.lineWidth = 3 * a;
      ctx.shadowColor = `rgba(${ring.r | 0}, ${ring.g | 0}, ${ring.b | 0}, ${a.toFixed(3)})`;
      ctx.shadowBlur = 16;
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  renderPreview(ctx: CanvasRenderingContext2D, pw: number, ph: number): void {
    ctx.fillStyle = '#0B132B';
    ctx.fillRect(0, 0, pw, ph);
    if (this.width <= 0 || this.height <= 0) return;
    const sx = pw / this.width;
    const sy = ph / this.height;
    const data = this.pool.data;
    const fl = this.pool.flags;
    for (let i = 0; i < this.pool.size; i++) {
      const fb = i * FLAG_STRIDE;
      if (!fl[fb + FL_ACTIVE]) continue;
      const db = i * STRIDE;
      const px = data[db + F_X] * sx;
      const py = data[db + F_Y] * sy;
      if (px < -2 || py < -2 || px > pw + 2 || py > ph + 2) continue;
      const r = data[db + F_COLOR_R];
      const g = data[db + F_COLOR_G];
      const b = data[db + F_COLOR_B];
      ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
  }

  reset(): void {
    this.density = 5;
    this.tension = 5;
    this.colorSpeed = 1;
    this.time = 0;
    this.colorTime = 0;
    this.trails.length = 0;
    this.burstRings.length = 0;
    this.initParticles(INITIAL_PARTICLES);
  }

  getSnapshotDataURL(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
  }
}
