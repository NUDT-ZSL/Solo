export interface HSL {
  h: number;
  s: number;
  l: number;
  a: number;
}

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface Scale {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  angle: number;
  baseAngle: number;
  color: HSL;
  ribbonId: number;
  settled: boolean;
  fadeAlpha: number;
  overlayBoost: number;
}

export interface Ribbon {
  id: number;
  scales: Scale[];
  path: { x: number; y: number }[];
  cumulativeDist: number[];
  totalLength: number;
  settling: boolean;
  settleElapsed: number;
  settleDuration: number;
  createdAt: number;
  baseHue: number;
  fading: boolean;
}

export interface StrokeResult {
  emitParticles: boolean;
  point: { x: number; y: number; hue: number; speed: number };
}

const MAX_SCALES = 20000;
const SPRING_K = 0.03;
const SETTLE_DURATION = 0.5;
const DEFAULT_WIDTH = 16;
const MIN_SAMPLE_DIST = 4;
const BREATH_PERIOD = 2;
const SPATIAL_CELL = 32;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; b = 0; }
  else if (hp < 2) { r = x; g = c; b = 0; }
  else if (hp < 3) { r = 0; g = c; b = x; }
  else if (hp < 4) { r = 0; g = x; b = c; }
  else if (hp < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToCmyk(hsl: HSL): CMYK {
  const [r, g, b] = hslToRgb(hsl.h, hsl.s / 100, hsl.l / 100);
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 1 };
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return { c, m, y, k };
}

function cmykToHsl(cmyk: CMYK, alpha = 1): HSL {
  const { c, m, y, k } = cmyk;
  const r = (1 - c) * (1 - k);
  const g = (1 - m) * (1 - k);
  const b = (1 - y) * (1 - k);
  const [h, s, l] = rgbToHsl(r, g, b);
  return { h, s: s * 100, l: l * 100, a: alpha };
}

function mixCmyk(a: CMYK, b: CMYK, wa = 0.5, wb = 0.5): CMYK {
  const sum = wa + wb || 1;
  return {
    c: (a.c * wa + b.c * wb) / sum,
    m: (a.m * wa + b.m * wb) / sum,
    y: (a.y * wa + b.y * wb) / sum,
    k: Math.max(a.k, b.k),
  };
}

function hslToString(c: HSL, alphaOverride?: number): string {
  const a = alphaOverride !== undefined ? alphaOverride : c.a;
  return `hsla(${c.h.toFixed(1)}, ${c.s.toFixed(1)}%, ${c.l.toFixed(1)}%, ${a.toFixed(3)})`;
}

function dirToHue(angleRad: number): number {
  let deg = (angleRad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return (deg * (2 / 3)) % 360;
}

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export class Weaver {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  private ribbons: Ribbon[] = [];
  private currentRibbon: Ribbon | null = null;
  private lastPoint: { x: number; y: number; t: number } | null = null;
  private ribbonIdSeq = 0;
  private hueSet = new Set<number>();

  private spatialGrid = new Map<string, Scale[]>();

  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  get ribbonCount(): number { return this.ribbons.length; }

  get totalScales(): number {
    let n = 0;
    for (const r of this.ribbons) n += r.scales.length;
    return n;
  }

  get uniqueColors(): number { return this.hueSet.size; }

  reset(): void {
    this.ribbons = [];
    this.currentRibbon = null;
    this.lastPoint = null;
    this.ribbonIdSeq = 0;
    this.hueSet.clear();
    this.spatialGrid.clear();
  }

  startStroke(x: number, y: number): void {
    const id = ++this.ribbonIdSeq;
    const ribbon: Ribbon = {
      id,
      scales: [],
      path: [{ x, y }],
      cumulativeDist: [0],
      totalLength: 0,
      settling: false,
      settleElapsed: 0,
      settleDuration: SETTLE_DURATION,
      createdAt: performance.now(),
      baseHue: 0,
      fading: false,
    };
    this.ribbons.push(ribbon);
    this.currentRibbon = ribbon;
    this.lastPoint = { x, y, t: performance.now() };
  }

  moveStroke(x: number, y: number, _dt: number): StrokeResult | null {
    if (!this.currentRibbon || !this.lastPoint) return null;
    const now = performance.now();
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const dist = Math.hypot(dx, dy);
    const dtSec = Math.max(0.001, (now - this.lastPoint.t) / 1000);
    const speed = dist / dtSec;

    if (dist < MIN_SAMPLE_DIST) {
      return {
        emitParticles: speed > 150,
        point: { x, y, hue: this.currentRibbon.baseHue, speed },
      };
    }

    const dir = Math.atan2(dy, dx);
    const hue = dirToHue(dir);
    this.currentRibbon.baseHue = hue;

    this.currentRibbon.path.push({ x, y });
    this.currentRibbon.totalLength += dist;
    this.currentRibbon.cumulativeDist.push(this.currentRibbon.totalLength);

    const totalLen = this.currentRibbon.totalLength;
    const saturation = Math.min(100, 60 + Math.min(40, totalLen / 20));
    const width = DEFAULT_WIDTH + Math.min(10, speed / 50);
    const scaleBaseSize = Math.max(8, Math.min(12, width * 0.65));

    const hueBucket = Math.round(hue / 10) * 10;
    this.hueSet.add(hueBucket);

    const step = Math.max(3, scaleBaseSize * 0.55);
    const prevLen = this.currentRibbon.totalLength - dist;
    let t = Math.ceil(prevLen / step) * step;
    while (t <= totalLen + 1e-6) {
      const pos = this.sampleAt(this.currentRibbon, t);
      if (pos) {
        const defl = (Math.random() * 2 - 1) * 15;
        const angleDeg = (pos.dir * 180) / Math.PI + defl;
        const alpha = 0.6 + Math.random() * 0.3;
        const sizeJitter = 0.85 + Math.random() * 0.3;
        const scale: Scale = {
          x: pos.x,
          y: pos.y,
          baseX: pos.x,
          baseY: pos.y,
          size: scaleBaseSize * sizeJitter,
          angle: angleDeg,
          baseAngle: angleDeg,
          color: { h: hue, s: saturation, l: 52 + Math.random() * 8, a: alpha },
          ribbonId: this.currentRibbon.id,
          settled: false,
          fadeAlpha: 1,
          overlayBoost: 0,
        };
        this.currentRibbon.scales.push(scale);
        this.registerInGrid(scale);
        this.checkOverlaps(scale);
      }
      t += step;
    }

    this.lastPoint = { x, y, t: now };
    return {
      emitParticles: speed > 150,
      point: { x, y, hue, speed },
    };
  }

  endStroke(): void {
    if (this.currentRibbon) {
      this.currentRibbon.settling = true;
      this.currentRibbon.settleElapsed = 0;
      this.currentRibbon = null;
    }
    this.lastPoint = null;
  }

  update(dt: number): void {
    const now = performance.now();
    const breathT = (now / 1000) % BREATH_PERIOD;
    this._breathFactor = 0.9 + 0.1 * (Math.sin((breathT / BREATH_PERIOD) * Math.PI * 2 - Math.PI / 2) + 1) / 2;

    for (const ribbon of this.ribbons) {
      if (ribbon.settling) {
        ribbon.settleElapsed += dt;
        const p = Math.min(1, ribbon.settleElapsed / ribbon.settleDuration);
        this.applySpringSettle(ribbon, p, dt);
        if (p >= 1) {
          ribbon.settling = false;
          for (const s of ribbon.scales) s.settled = true;
        }
      }
      if (ribbon.fading) {
        for (const s of ribbon.scales) {
          s.fadeAlpha = Math.max(0, s.fadeAlpha - dt * 1.5);
        }
      }
    }

    this.enforceScaleCap();
    this.ribbons = this.ribbons.filter(r => {
      if (r.fading && r.scales.length && r.scales[r.scales.length - 1].fadeAlpha <= 0) {
        for (const s of r.scales) this.unregisterFromGrid(s);
        return false;
      }
      return true;
    });
  }

  private _breathFactor = 1;
  get breathFactor(): number { return this._breathFactor; }

  render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.renderBurlapHint();

    const breath = this._breathFactor;

    for (const ribbon of this.ribbons) {
      for (const s of ribbon.scales) {
        const alpha = s.fadeAlpha;
        if (alpha <= 0.001) continue;
        this.drawDiamond(s, breath, alpha);
        if (s.overlayBoost > 0) {
          this.drawDiamond(s, breath, alpha * Math.min(0.5, s.overlayBoost), true);
        }
      }
    }
  }

  private renderBurlapHint(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 1;
    const step = 16;
    for (let x = 0; x < this.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawDiamond(s: Scale, breath: number, alpha: number, highlight = false): void {
    const ctx = this.ctx;
    const size = s.size * breath;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate((s.angle * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.6, 0);
    ctx.closePath();
    if (highlight) {
      ctx.fillStyle = `hsla(${s.color.h}, ${Math.min(100, s.color.s + 10)}%, ${Math.min(92, s.color.l + 30)}%, ${alpha})`;
    } else {
      ctx.fillStyle = hslToString(s.color, alpha * s.color.a);
    }
    ctx.fill();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = highlight
      ? `hsla(${s.color.h}, 100%, 95%, ${alpha * 0.8})`
      : `hsla(${s.color.h}, ${Math.min(100, s.color.s + 10)}%, ${Math.max(20, s.color.l - 15)}%, ${alpha * 0.35})`;
    ctx.stroke();
    ctx.restore();
  }

  private sampleAt(ribbon: Ribbon, dist: number): { x: number; y: number; dir: number } | null {
    const cd = ribbon.cumulativeDist;
    if (cd.length < 2) return null;
    let lo = 0, hi = cd.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cd[mid] < dist) lo = mid; else hi = mid;
    }
    const segLen = cd[hi] - cd[lo] || 1;
    const t = (dist - cd[lo]) / segLen;
    const p0 = ribbon.path[lo];
    const p1 = ribbon.path[hi];
    return {
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t,
      dir: Math.atan2(p1.y - p0.y, p1.x - p0.x),
    };
  }

  private applySpringSettle(ribbon: Ribbon, progress: number, dt: number): void {
    if (ribbon.scales.length === 0) return;
    const n = ribbon.scales.length;
    const step = ribbon.totalLength / n;
    for (let i = 0; i < n; i++) {
      const s = ribbon.scales[i];
      const idealDist = i * step + step / 2;
      const pos = this.sampleAt(ribbon, idealDist);
      if (!pos) continue;
      const dxIdeal = pos.x - s.baseX;
      const dyIdeal = pos.y - s.baseY;
      const force = SPRING_K * (1 - progress * 0.7);
      s.baseX += dxIdeal * force;
      s.baseY += dyIdeal * force;
      const damp = Math.max(0, 1 - dt * 2);
      s.x = s.x * damp + s.baseX * (1 - damp);
      s.y = s.y * damp + s.baseY * (1 - damp);
      const idealAngle = (pos.dir * 180) / Math.PI;
      let deltaAngle = idealAngle - s.baseAngle;
      while (deltaAngle > 180) deltaAngle -= 360;
      while (deltaAngle < -180) deltaAngle += 360;
      s.baseAngle += deltaAngle * force * 0.8;
      s.angle = s.angle * damp + s.baseAngle * (1 - damp);
    }
  }

  private registerInGrid(s: Scale): void {
    const r = s.size * 1.3;
    const x0 = Math.floor((s.x - r) / SPATIAL_CELL);
    const y0 = Math.floor((s.y - r) / SPATIAL_CELL);
    const x1 = Math.floor((s.x + r) / SPATIAL_CELL);
    const y1 = Math.floor((s.y + r) / SPATIAL_CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = cellKey(cx, cy);
        let arr = this.spatialGrid.get(k);
        if (!arr) { arr = []; this.spatialGrid.set(k, arr); }
        arr.push(s);
      }
    }
  }

  private unregisterFromGrid(s: Scale): void {
    const r = s.size * 1.3;
    const x0 = Math.floor((s.x - r) / SPATIAL_CELL);
    const y0 = Math.floor((s.y - r) / SPATIAL_CELL);
    const x1 = Math.floor((s.x + r) / SPATIAL_CELL);
    const y1 = Math.floor((s.y + r) / SPATIAL_CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = cellKey(cx, cy);
        const arr = this.spatialGrid.get(k);
        if (!arr) continue;
        const idx = arr.indexOf(s);
        if (idx >= 0) arr.splice(idx, 1);
        if (arr.length === 0) this.spatialGrid.delete(k);
      }
    }
  }

  private checkOverlaps(s: Scale): void {
    const r = s.size * 1.3;
    const cx0 = Math.floor((s.x - r) / SPATIAL_CELL);
    const cy0 = Math.floor((s.y - r) / SPATIAL_CELL);
    const cx1 = Math.floor((s.x + r) / SPATIAL_CELL);
    const cy1 = Math.floor((s.y + r) / SPATIAL_CELL);
    const seen = new Set<Scale>();
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const arr = this.spatialGrid.get(cellKey(cx, cy));
        if (!arr) continue;
        for (const other of arr) {
          if (other === s || other.ribbonId === s.ribbonId) continue;
          if (seen.has(other)) continue;
          seen.add(other);
          const ddx = other.x - s.x;
          const ddy = other.y - s.y;
          const minDist = (other.size + s.size) * 0.55;
          if (ddx * ddx + ddy * ddy < minDist * minDist) {
            this.blendScalePair(s, other);
          }
        }
      }
    }
  }

  private blendScalePair(a: Scale, b: Scale): void {
    const cmykA = hslToCmyk(a.color);
    const cmykB = hslToCmyk(b.color);
    const mixed = mixCmyk(cmykA, cmykB);
    const newHslA = cmykToHsl(mixed, a.color.a);
    const newHslB = cmykToHsl(mixed, b.color.a);
    a.color.h = newHslA.h;
    a.color.s = Math.max(a.color.s, newHslA.s);
    a.color.l = Math.min(78, newHslA.l);
    b.color.h = newHslB.h;
    b.color.s = Math.max(b.color.s, newHslB.s);
    b.color.l = Math.min(78, newHslB.l);
    a.overlayBoost = Math.min(1, a.overlayBoost + 0.25);
    b.overlayBoost = Math.min(1, b.overlayBoost + 0.25);
  }

  private enforceScaleCap(): void {
    let total = 0;
    for (const r of this.ribbons) total += r.scales.length;
    if (total <= MAX_SCALES) return;
    for (const r of this.ribbons) {
      if (r.fading) continue;
      if (total - r.scales.length > MAX_SCALES * 0.85) {
        r.fading = true;
        total -= r.scales.length;
      } else {
        break;
      }
    }
  }
}
