import {
  ParticlePool,
  PaletteColor,
  hexToRgb,
  samplePalette,
  easeOutCubic,
  easeOutQuad,
  STATE_IDLE,
  STATE_DISTORTED,
  STATE_BURSTING,
  STATE_RETURNING,
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

  private time: number;
  private gridCols: number;
  private gridRows: number;

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

    this.time = 0;
    this.gridCols = 0;
    this.gridRows = 0;
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

    let created = 0;
    for (let row = 0; row < this.gridRows && created < actual; row++) {
      for (let col = 0; col < this.gridCols && created < actual; col++) {
        const idx = this.pool.acquire();
        if (idx < 0) return;
        const bx = stepX * (col + 1);
        const by = stepY * (row + 1);
        this.pool.baseX[idx] = bx;
        this.pool.baseY[idx] = by;
        this.pool.x[idx] = bx;
        this.pool.y[idx] = by;
        this.pool.particleSize[idx] = 4;
        this.pool.phase[idx] = Math.random() * Math.PI * 2;
        this.pool.baseColorT[idx] = Math.random();
        this.pool.colorOffset[idx] = Math.random() * 10;
        this.pool.isWarm[idx] = Math.random() < 0.5 ? 1 : 0;
        this.pool.state[idx] = STATE_IDLE;
        this.pool.stateTimer[idx] = 0;
        created++;
      }
    }
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
  }

  setColorSpeed(value: number): void {
    this.colorSpeed = Math.max(0, Math.min(5, value));
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
    const pool = this.pool;
    for (let i = 0; i < pool.size; i++) {
      if (!pool.active[i]) continue;
      const dx = pool.x[i] - centerX;
      const dy = pool.y[i] - centerY;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        const falloff = 1 - d2 / r2;
        pool.vx[i] = ox * falloff;
        pool.vy[i] = oy * falloff;
        pool.state[i] = STATE_DISTORTED;
        pool.stateTimer[i] = 0;
      }
    }
  }

  beginReturnForDistorted(): void {
    const pool = this.pool;
    for (let i = 0; i < pool.size; i++) {
      if (!pool.active[i]) continue;
      if (pool.state[i] === STATE_DISTORTED) {
        pool.state[i] = STATE_RETURNING;
        pool.stateTimer[i] = 0;
        pool.returnStartX[i] = pool.x[i];
        pool.returnStartY[i] = pool.y[i];
      }
    }
  }

  burstAt(x: number, y: number): void {
    const r2 = BURST_RADIUS * BURST_RADIUS;
    const pool = this.pool;

    const ghostCount: number[] = [];
    for (let i = 0; i < pool.size; i++) {
      if (!pool.active[i]) continue;
      if (pool.isWarm[i]) continue;
      const dx = pool.baseX[i] - x;
      const dy = pool.baseY[i] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        ghostCount.push(i);
      }
    }

    for (let i = 0; i < pool.size; i++) {
      if (!pool.active[i]) continue;
      const dx = pool.baseX[i] - x;
      const dy = pool.baseY[i] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        const dist = Math.sqrt(d2);
        const falloff = 1 - dist / BURST_RADIUS;
        const burstDist = 20 + falloff * 20;
        const angle = Math.random() * Math.PI * 2;
        pool.burstTargetX[i] = pool.baseX[i] + Math.cos(angle) * burstDist;
        pool.burstTargetY[i] = pool.baseY[i] + Math.sin(angle) * burstDist;
        pool.state[i] = STATE_BURSTING;
        pool.stateTimer[i] = 0;
        pool.flashTimer[i] = FLASH_COUNT * FLASH_INTERVAL * 2;
      }
    }

    for (let k = 0; k < ghostCount.length && k < 2000; k++) {
      const src = ghostCount[k];
      const idx = pool.acquire();
      if (idx < 0) break;
      pool.baseX[idx] = pool.baseX[src];
      pool.baseY[idx] = pool.baseY[src];
      pool.x[idx] = pool.baseX[src];
      pool.y[idx] = pool.baseY[src];
      const angle = Math.random() * Math.PI * 2;
      const burstDist = 25 + Math.random() * 15;
      pool.burstTargetX[idx] = pool.baseX[idx] + Math.cos(angle) * burstDist;
      pool.burstTargetY[idx] = pool.baseY[idx] + Math.sin(angle) * burstDist;
      pool.particleSize[idx] = 3;
      pool.phase[idx] = pool.phase[src];
      pool.baseColorT[idx] = pool.baseColorT[src];
      pool.colorOffset[idx] = pool.colorOffset[src];
      pool.isWarm[idx] = pool.isWarm[src];
      pool.state[idx] = STATE_BURSTING;
      pool.stateTimer[idx] = 0;
      pool.flashTimer[idx] = FLASH_COUNT * FLASH_INTERVAL * 2;
    }

    const mixR = (WARM_PALETTE[0].r + COOL_PALETTE[0].r + WARM_PALETTE[WARM_PALETTE.length - 1].r) / 3;
    const mixG = (WARM_PALETTE[0].g + COOL_PALETTE[0].g + WARM_PALETTE[WARM_PALETTE.length - 1].g) / 3;
    const mixB = (WARM_PALETTE[0].b + COOL_PALETTE[0].b + WARM_PALETTE[WARM_PALETTE.length - 1].b) / 3;
    this.burstRings.push({
      x, y,
      radius: 0,
      maxRadius: BURST_MAX_RADIUS,
      life: BURST_RING_DURATION,
      maxLife: BURST_RING_DURATION,
      r: mixR, g: mixG, b: mixB
    });
  }

  addTrailPoint(x: number, y: number): void {
    if (this.trails.length > 0) {
      const last = this.trails[this.trails.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      if (dx * dx + dy * dy < 9) return;
    }
    this.trails.push({
      x, y,
      alpha: 1,
      life: TRAIL_LIFE,
      maxLife: TRAIL_LIFE
    });
    while (this.trails.length > 200) {
      this.trails.shift();
    }
  }

  getBrightestTrailColor(): { r: number; g: number; b: number } {
    return { r: 255, g: 215, b: 0 };
  }

  update(dt: number): void {
    this.time += dt;
    const pool = this.pool;
    const tensionFactor = this.tension / 5;
    const sineAmp = SINE_AMP_BASE * tensionFactor;
    const omega = SINE_FREQ * Math.PI * 2;
    const colorTime = this.time * this.colorSpeed * 0.15;

    for (let i = 0; i < pool.size; i++) {
      if (!pool.active[i]) continue;

      const palette = pool.isWarm[i] ? this.warmPalette : this.coolPalette;
      let colT = pool.baseColorT[i] + colorTime + pool.colorOffset[i] * 0.05;
      colT = colT - Math.floor(colT);
      const col = samplePalette(palette, colT);

      pool.stateTimer[i] += dt;

      if (pool.flashTimer[i] > 0) {
        pool.flashTimer[i] -= dt;
        const flashPhase = pool.flashTimer[i] / (FLASH_COUNT * FLASH_INTERVAL * 2);
        const cyclePos = ((pool.flashTimer[i] % (FLASH_INTERVAL * 2)) / (FLASH_INTERVAL * 2));
        const flashing = cyclePos < 0.5;
        if (flashing && flashPhase > 0) {
          pool.colorR[i] = 255;
          pool.colorG[i] = 255;
          pool.colorB[i] = 255;
        } else {
          pool.colorR[i] = col.r;
          pool.colorG[i] = col.g;
          pool.colorB[i] = col.b;
        }
      } else {
        pool.colorR[i] = col.r;
        pool.colorG[i] = col.g;
        pool.colorB[i] = col.b;
      }

      switch (pool.state[i]) {
        case STATE_IDLE: {
          const sx = Math.sin(omega * this.time + pool.phase[i]) * sineAmp;
          const sy = Math.cos(omega * this.time + pool.phase[i] * 1.3) * sineAmp * 0.6;
          pool.x[i] = pool.baseX[i] + sx;
          pool.y[i] = pool.baseY[i] + sy;
          break;
        }
        case STATE_DISTORTED: {
          pool.x[i] += pool.vx[i];
          pool.y[i] += pool.vy[i];
          pool.vx[i] *= 0.85;
          pool.vy[i] *= 0.85;
          break;
        }
        case STATE_BURSTING: {
          const t = Math.min(1, pool.stateTimer[i] / BURST_DURATION);
          const e = easeOutQuad(t);
          pool.x[i] = pool.baseX[i] + (pool.burstTargetX[i] - pool.baseX[i]) * e;
          pool.y[i] = pool.baseY[i] + (pool.burstTargetY[i] - pool.baseY[i]) * e;
          if (t >= 1) {
            pool.state[i] = STATE_RETURNING;
            pool.stateTimer[i] = 0;
            pool.returnStartX[i] = pool.x[i];
            pool.returnStartY[i] = pool.y[i];
          }
          break;
        }
        case STATE_RETURNING: {
          const dur = pool.flashTimer[i] > 0 ? BURST_RETURN_DURATION : RETURN_DURATION;
          const t = Math.min(1, pool.stateTimer[i] / dur);
          const e = easeOutCubic(t);
          pool.x[i] = pool.returnStartX[i] + (pool.baseX[i] - pool.returnStartX[i]) * e;
          pool.y[i] = pool.returnStartY[i] + (pool.baseY[i] - pool.returnStartY[i]) * e;
          if (t >= 1) {
            pool.state[i] = STATE_IDLE;
            pool.stateTimer[i] = 0;
            if (pool.particleSize[i] < 3.5 && pool.x[i] === pool.baseX[i] && pool.y[i] === pool.baseY[i]) {
              const isGhost = pool.particleSize[i] < 3.5;
              if (isGhost) {
                pool.release(i);
              }
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

    const pool = this.pool;
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
        ctx.strokeStyle = `rgba(${bright.r}, ${bright.g}, ${bright.b}, ${a})`;
        ctx.lineWidth = 6 * a;
        ctx.shadowColor = `rgba(${bright.r}, ${bright.g}, ${bright.b}, ${a * 0.8})`;
        ctx.shadowBlur = 12;
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    ctx.shadowBlur = 8;
    for (let i = 0; i < pool.size; i++) {
      if (!pool.active[i]) continue;
      const r = pool.colorR[i];
      const g = pool.colorG[i];
      const b = pool.colorB[i];
      ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${pool.alpha[i]})`;
      ctx.shadowColor = `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0.7)`;
      const sz = pool.particleSize[i];
      ctx.beginPath();
      ctx.arc(pool.x[i], pool.y[i], sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (let i = 0; i < this.burstRings.length; i++) {
      const ring = this.burstRings[i];
      const a = ring.life / ring.maxLife;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${ring.r | 0}, ${ring.g | 0}, ${ring.b | 0}, ${a * 0.7})`;
      ctx.lineWidth = 3 * a;
      ctx.shadowColor = `rgba(${ring.r | 0}, ${ring.g | 0}, ${ring.b | 0}, ${a})`;
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
    const pool = this.pool;
    for (let i = 0; i < pool.size; i++) {
      if (!pool.active[i]) continue;
      const px = pool.x[i] * sx;
      const py = pool.y[i] * sy;
      if (px < -2 || py < -2 || px > pw + 2 || py > ph + 2) continue;
      const r = pool.colorR[i];
      const g = pool.colorG[i];
      const b = pool.colorB[i];
      ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
  }

  reset(): void {
    this.density = 5;
    this.tension = 5;
    this.colorSpeed = 1;
    this.trails.length = 0;
    this.burstRings.length = 0;
    this.initParticles(INITIAL_PARTICLES);
  }

  getSnapshotDataURL(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
  }
}
