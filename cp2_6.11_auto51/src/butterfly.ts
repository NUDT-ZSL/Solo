interface Spot {
  offsetX: number;
  offsetY: number;
  color: string;
  baseRadius: number;
  wing: 'left' | 'right';
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface Butterfly {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  wingColor: string;
  wingPatternColor: string;
  baseAlpha: number;
  spawnTime: number;
  lifetime: number;
  flapPeriod: number;
  flapPhase: number;
  spots: Spot[];
  trail: TrailPoint[];
  isSpreading: boolean;
  spreadStartTime: number;
  spreadDuration: number;
  fadeInEnd: number;
  idlePhase: number;
  idleAmplitude: number;
  idlePeriod: number;
}

const SPOT_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4'];
const MAX_BUTTERFLIES = 60;
const TRAIL_LENGTH = 20;
const TRAIL_DELAY_MS = 150;

let _idCounter = 0;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function parseRgb(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3
      ? hex.split('').map(c => c + c).join('')
      : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    };
  }
  if (color.startsWith('rgb(')) {
    const inner = color.slice(4, -1);
    const parts = inner.split(',').map(s => parseInt(s.trim(), 10));
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0 };
  }
  return { r: 0, g: 0, b: 0 };
}

function rgbStr(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function rgbaStr(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) { rp = c; gp = x; }
  else if (h < 120) { rp = x; gp = c; }
  else if (h < 180) { gp = c; bp = x; }
  else if (h < 240) { gp = x; bp = c; }
  else if (h < 300) { rp = x; bp = c; }
  else { rp = c; bp = x; }
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

function getComplementaryColor(strokeColor: string): string {
  const { r, g, b } = parseRgb(strokeColor);
  console.log(`[Butterfly] 墨迹颜色 r=${r},g=${g},b=${b}`);
  const cr = 255 - r;
  const cg = 255 - g;
  const cb = 255 - b;
  console.log(`[Butterfly] 纯取反 r=${cr},g=${cg},b=${cb}`);
  const hsv = rgbToHsv(cr, cg, cb);
  console.log(`[Butterfly] HSV h=${hsv.h.toFixed(1)}°, s=${hsv.s.toFixed(2)}, v=${hsv.v.toFixed(2)}`);
  const shifted = hsvToRgb(
    hsv.h + 25,
    clamp(hsv.s + 0.2, 0, 1),
    clamp(hsv.v * 1.15, 0, 1)
  );
  console.log(`[Butterfly] HSV偏移后 r=${Math.round(shifted.r)},g=${Math.round(shifted.g)},b=${Math.round(shifted.b)}`);
  const fr = shifted.r * 0.65 + 255 * 0.35;
  const fg = shifted.g * 0.65 + 255 * 0.35;
  const fb = shifted.b * 0.65 + 255 * 0.35;
  const finalColor = rgbStr(fr, fg, fb);
  console.log(`[Butterfly] 最终翅膀颜色 ${finalColor}`);
  return finalColor;
}

function getPatternColor(wingColor: string): string {
  const { r, g, b } = parseRgb(wingColor);
  const wingHsv = rgbToHsv(r, g, b);
  const shifted = hsvToRgb(
    wingHsv.h + 50,
    clamp(wingHsv.s + 0.25, 0, 1),
    clamp(wingHsv.v * 1.2, 0, 1)
  );
  const cr = 255 - r, cg = 255 - g, cb = 255 - b;
  return rgbStr(
    shifted.r * 0.4 + cr * 0.6,
    shifted.g * 0.4 + cg * 0.6,
    shifted.b * 0.4 + cb * 0.6
  );
}

function generateSpots(size: number): Spot[] {
  const count = randInt(3, 6);
  const spots: Spot[] = [];
  for (let i = 0; i < count; i++) {
    const wing: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
    const angle = rand(-Math.PI * 0.55, Math.PI * 0.55);
    const dist = rand(size * 0.2, size * 0.7);
    spots.push({
      offsetX: Math.cos(angle) * dist * 0.7,
      offsetY: Math.sin(angle) * dist * 0.5,
      color: SPOT_COLORS[randInt(0, SPOT_COLORS.length - 1)],
      baseRadius: rand(size * 0.05, size * 0.12),
      wing
    });
  }
  return spots;
}

export class ButterflyManager {
  private butterflies: Butterfly[] = [];
  private sizeScale: number = 1;

  setSizeScale(scale: number): void {
    this.sizeScale = scale;
  }

  spawn(options: {
    x: number;
    y: number;
    strokeColor: string;
    strokeVelocity?: number;
    isSpread?: boolean;
    spreadTarget?: { x: number; y: number };
    spreadDuration?: number;
  }): void {
    const now = performance.now();
    const { x, y, strokeColor, strokeVelocity } = options;
    const isSpread = !!options.isSpread;

    console.log(`[Butterfly] spawn() 被调用: pos=(${x.toFixed(1)},${y.toFixed(1)}), strokeColor=${strokeColor}, velocity=${strokeVelocity?.toFixed(2)}, isSpread=${isSpread}`);

    const velocityFactor = clamp((strokeVelocity || 5) / 10, 0, 1);
    const minSize = 20 * this.sizeScale;
    const maxSize = 50 * this.sizeScale;
    const size = rand(minSize + velocityFactor * (maxSize - minSize) * 0.3, maxSize);
    console.log(`[Butterfly] 尺寸: ${size.toFixed(1)}px (范围 ${minSize}-${maxSize})`);

    const wingColor = getComplementaryColor(strokeColor);
    const patternColor = getPatternColor(wingColor);
    const lifetime = isSpread
      ? (options.spreadDuration || 2000)
      : rand(5000, 8000);
    console.log(`[Butterfly] 生命周期: ${lifetime.toFixed(0)}ms`);

    const butterfly: Butterfly = {
      id: ++_idCounter,
      x,
      y,
      targetX: options.spreadTarget ? options.spreadTarget.x : x,
      targetY: options.spreadTarget ? options.spreadTarget.y : y,
      size,
      wingColor,
      wingPatternColor: patternColor,
      baseAlpha: 0.2,
      spawnTime: now,
      lifetime,
      flapPeriod: rand(0.6, 1.2),
      flapPhase: rand(0, Math.PI * 2),
      spots: generateSpots(size),
      trail: [],
      isSpreading: !!options.isSpread,
      spreadStartTime: now,
      spreadDuration: options.spreadDuration || 2000,
      fadeInEnd: now + 1000,
      idlePhase: rand(0, Math.PI * 2),
      idleAmplitude: rand(2, 6),
      idlePeriod: rand(1.2, 2.5)
    };

    this.butterflies.push(butterfly);
    console.log(`[Butterfly] 已添加蝴蝶 #${butterfly.id}，总数 ${this.butterflies.length}/${MAX_BUTTERFLIES}`);
    this.enforceLimit();
    console.log(`[Butterfly] 执行上限检查后数量: ${this.butterflies.length}`);
  }

  private enforceLimit(): void {
    if (this.butterflies.length > MAX_BUTTERFLIES) {
      const over = this.butterflies.length - MAX_BUTTERFLIES;
      this.butterflies.sort((a, b) => a.spawnTime - b.spawnTime);
      const removed = this.butterflies.splice(0, over);
      console.log(`[Butterfly] 超过上限 ${MAX_BUTTERFLIES}，移除最旧的 ${over} 只蝴蝶 (ID: ${removed.map(b => b.id).join(',')})`);
    }
  }

  getCount(): number {
    return this.butterflies.length;
  }

  clear(): void {
    this.butterflies = [];
  }

  update(deltaTime: number, currentTime: number): void {
    const keep: Butterfly[] = [];
    for (const b of this.butterflies) {
      const elapsed = currentTime - b.spawnTime;
      if (elapsed > b.lifetime) continue;

      if (currentTime < b.fadeInEnd) {
        const t = (currentTime - b.spawnTime) / 1000;
        b.baseAlpha = 0.2 + t * 0.7;
      } else {
        const fadeStart = b.lifetime - 800;
        if (elapsed > fadeStart) {
          const t = (elapsed - fadeStart) / 800;
          b.baseAlpha = clamp(0.9 * (1 - t), 0, 0.9);
        } else {
          b.baseAlpha = 0.9;
        }
      }

      if (b.isSpreading) {
        const sElapsed = currentTime - b.spreadStartTime;
        const t = clamp(sElapsed / b.spreadDuration, 0, 1);
        const ease = 1 - Math.pow(1 - t, 2);
        b.x = b.x + (b.targetX - b.x) * ease * clamp(deltaTime / (b.spreadDuration * 0.5), 0, 1);
        b.y = b.y + (b.targetY - b.y) * ease * clamp(deltaTime / (b.spreadDuration * 0.5), 0, 1);
        b.size = b.size * (1 + t * 0.3);
      } else {
        const idleT = (currentTime / 1000) / b.idlePeriod + b.idlePhase;
        b.x += Math.sin(idleT * 1.3) * 0.15;
        b.y += Math.cos(idleT) * 0.1;
      }

      const shouldAddTrail = b.trail.length === 0
        || Math.hypot(b.x - b.trail[b.trail.length - 1].x, b.y - b.trail[b.trail.length - 1].y) > 1;
      if (shouldAddTrail) {
        b.trail.push({ x: b.x, y: b.y, alpha: 0.2 });
        if (b.trail.length > TRAIL_LENGTH) {
          b.trail.shift();
        }
      }
      for (let i = 0; i < b.trail.length; i++) {
        b.trail[i].alpha = 0.2 * ((i + 1) / b.trail.length);
      }

      keep.push(b);
    }
    this.butterflies = keep;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    for (const b of this.butterflies) {
      this.renderTrail(ctx, b);
      this.renderButterfly(ctx, b, now);
    }
  }

  private renderTrail(ctx: CanvasRenderingContext2D, bf: Butterfly): void {
    if (bf.trail.length < 2) return;
    const { r, g, b: bl } = parseRgb(bf.wingColor);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const delayCount = Math.min(Math.floor(TRAIL_DELAY_MS / 16), bf.trail.length - 1);
    const startIdx = Math.max(0, bf.trail.length - 1 - delayCount);
    for (let i = startIdx; i < bf.trail.length; i++) {
      const p = bf.trail[i];
      if (i === startIdx) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = rgbaStr(r, g, bl, 0.2);
    ctx.lineWidth = 0.3 * bf.size / 35;
    ctx.stroke();
  }

  private renderButterfly(ctx: CanvasRenderingContext2D, b: Butterfly, now: number): void {
    const t = (now / 1000) / b.flapPeriod + b.flapPhase;
    const flapAngle = Math.sin(t * Math.PI * 2) * (30 * Math.PI / 180);
    const flapScale = 0.6 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.4;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.globalAlpha = b.baseAlpha;

    this.drawWing(ctx, b, -flapAngle, 'left', flapScale);
    this.drawWing(ctx, b, flapAngle, 'right', flapScale);
    this.drawBody(ctx, b);

    ctx.restore();
  }

  private drawWing(
    ctx: CanvasRenderingContext2D,
    b: Butterfly,
    angle: number,
    side: 'left' | 'right',
    flapScale: number
  ): void {
    const sign = side === 'left' ? -1 : 1;
    const { r: wr, g: wg, b: wb } = parseRgb(b.wingColor);
    const { r: pr, g: pg, b: pb } = parseRgb(b.wingPatternColor);

    ctx.save();
    ctx.scale(sign, 1);
    ctx.rotate(angle);

    const w = b.size * 0.9;
    const h = b.size * 0.7;

    const grad = ctx.createRadialGradient(w * 0.2, 0, w * 0.1, w * 0.2, 0, w * 0.8);
    grad.addColorStop(0, rgbaStr(wr, wg, wb, 0.95));
    grad.addColorStop(0.6, rgbaStr(
      (wr + pr) / 2, (wg + pg) / 2, (wb + pb) / 2, 0.85
    ));
    grad.addColorStop(1, rgbaStr(pr, pg, pb, 0.6));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(w * 0.3, -h * 0.9, w * 1.0, -h * 0.7, w * 0.95, -h * 0.15);
    ctx.bezierCurveTo(w * 0.9, h * 0.3, w * 0.5, h * 0.7, w * 0.2, h * 0.5);
    ctx.bezierCurveTo(w * 0.05, h * 0.35, 0, h * 0.15, 0, 0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(w * 0.15, -h * 0.2, w * 0.4, -h * 0.1, w * 0.5, 0);
    ctx.bezierCurveTo(w * 0.4, h * 0.1, w * 0.15, h * 0.2, 0, 0);
    ctx.closePath();
    ctx.fillStyle = rgbaStr(pr, pg, pb, 0.4);
    ctx.fill();

    const spotScale = 0.85 + flapScale * 0.3;
    for (const spot of b.spots) {
      if (spot.wing !== side) continue;
      const srx = spot.offsetX * sign;
      const sry = spot.offsetY;
      const { r, g, b: bl } = parseRgb(spot.color);
      ctx.beginPath();
      ctx.arc(srx, sry, spot.baseRadius * spotScale, 0, Math.PI * 2);
      ctx.fillStyle = rgbaStr(r, g, bl, 0.9);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawBody(ctx: CanvasRenderingContext2D, b: Butterfly): void {
    const bw = b.size * 0.06;
    const bh = b.size * 0.6;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh / 2, 0, 0, Math.PI * 2);
    const bodyGrad = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    bodyGrad.addColorStop(0, 'rgba(50,40,35,0.85)');
    bodyGrad.addColorStop(0.5, 'rgba(30,25,22,0.95)');
    bodyGrad.addColorStop(1, 'rgba(50,40,35,0.85)');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(30,25,22,0.8)';
    ctx.lineWidth = 0.8;
    const antennaLen = b.size * 0.25;
    ctx.beginPath();
    ctx.moveTo(0, -bh / 2 + 2);
    ctx.quadraticCurveTo(-b.size * 0.08, -bh / 2 - antennaLen * 0.5, -b.size * 0.12, -bh / 2 - antennaLen);
    ctx.moveTo(0, -bh / 2 + 2);
    ctx.quadraticCurveTo(b.size * 0.08, -bh / 2 - antennaLen * 0.5, b.size * 0.12, -bh / 2 - antennaLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-b.size * 0.12, -bh / 2 - antennaLen, bw * 0.8, 0, Math.PI * 2);
    ctx.arc(b.size * 0.12, -bh / 2 - antennaLen, bw * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30,25,22,0.9)';
    ctx.fill();

    ctx.restore();
  }
}
