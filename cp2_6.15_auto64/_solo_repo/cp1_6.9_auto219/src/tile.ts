export interface Point {
  x: number;
  y: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

const BUMP_IN_DURATION = 0.4;
const BUMP_OUT_DURATION = 0.6;
const RIPPLE_TINT_DURATION = 0.3;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class Tile {
  vertices: [Point, Point, Point];
  center: Point;
  baseColor: HSL;
  currentColor: HSL;
  targetBump: number;
  currentBump: number;
  bumpPhase: 'idle' | 'in' | 'out';
  bumpProgress: number;
  rippleTintAmount: number;
  rippleTintPhase: 'idle' | 'active' | 'out';
  rippleTintProgress: number;
  heightMultiplier: number;
  needsUpdate: boolean;
  hasShadow: boolean;
  shadowSource: Tile | null;

  constructor(vertices: [Point, Point, Point], baseColor: HSL) {
    this.vertices = vertices;
    this.center = {
      x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
      y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3,
    };
    this.baseColor = { ...baseColor };
    this.currentColor = { ...baseColor };
    this.targetBump = 0;
    this.currentBump = 0;
    this.bumpPhase = 'idle';
    this.bumpProgress = 0;
    this.rippleTintAmount = 0;
    this.rippleTintPhase = 'idle';
    this.rippleTintProgress = 0;
    this.heightMultiplier = 1.0;
    this.needsUpdate = true;
    this.hasShadow = false;
    this.shadowSource = null;
  }

  setBaseColor(hsl: HSL): void {
    this.baseColor = { ...hsl };
    this.needsUpdate = true;
  }

  hover(active: boolean): void {
    const newTarget = active ? 1 : 0;
    if (newTarget !== this.targetBump) {
      this.targetBump = newTarget;
      if (active) {
        this.bumpPhase = 'in';
        this.bumpProgress = this.currentBump;
      } else {
        this.bumpPhase = 'out';
        this.bumpProgress = 1 - this.currentBump;
      }
      this.needsUpdate = true;
    }
  }

  triggerRippleTint(): void {
    if (this.rippleTintPhase !== 'active') {
      this.rippleTintPhase = 'active';
      this.rippleTintProgress = 0;
    }
  }

  update(deltaTime: number): boolean {
    let changed = false;

    if (this.bumpPhase !== 'idle') {
      const duration = this.bumpPhase === 'in' ? BUMP_IN_DURATION : BUMP_OUT_DURATION;
      this.bumpProgress += deltaTime / duration;

      if (this.bumpProgress >= 1) {
        this.currentBump = this.targetBump;
        this.bumpPhase = 'idle';
        this.bumpProgress = 0;
      } else {
        const t = this.bumpPhase === 'in'
          ? easeOutCubic(this.bumpProgress)
          : easeOutCubic(this.bumpProgress);
        if (this.bumpPhase === 'in') {
          this.currentBump = t;
        } else {
          this.currentBump = 1 - t;
        }
      }
      changed = true;
    }

    if (this.rippleTintPhase !== 'idle') {
      if (this.rippleTintPhase === 'active') {
        this.rippleTintProgress += deltaTime / RIPPLE_TINT_DURATION;
        if (this.rippleTintProgress >= 1) {
          this.rippleTintPhase = 'out';
          this.rippleTintProgress = 0;
        } else {
          this.rippleTintAmount = Math.sin(this.rippleTintProgress * Math.PI);
        }
      } else {
        this.rippleTintAmount = 0;
        this.rippleTintPhase = 'idle';
      }
      changed = true;
    }

    if (changed || this.needsUpdate) {
      this.updateCurrentColor();
      this.needsUpdate = false;
    }

    return changed;
  }

  private updateCurrentColor(): void {
    const bumpBoost = this.currentBump * 0.2;
    const rippleShift = this.rippleTintAmount * 180;

    this.currentColor = {
      h: (this.baseColor.h + rippleShift + 360) % 360,
      s: this.baseColor.s,
      l: Math.min(95, this.baseColor.l + bumpBoost * 100),
    };
  }

  containsPoint(px: number, py: number): boolean {
    const [v1, v2, v3] = this.vertices;
    const d1 = this.sign(px, py, v1.x, v1.y, v2.x, v2.y);
    const d2 = this.sign(px, py, v2.x, v2.y, v3.x, v3.y);
    const d3 = this.sign(px, py, v3.x, v3.y, v1.x, v1.y);

    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

    return !(hasNeg && hasPos);
  }

  private sign(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  }

  getDisplacedCenter(baseHeight: number): Point {
    const height = this.currentBump * baseHeight * this.heightMultiplier;
    return {
      x: this.center.x,
      y: this.center.y - height,
    };
  }

  draw(ctx: CanvasRenderingContext2D, baseHeight: number, globalRotation: number): void {
    const displacedCenter = this.getDisplacedCenter(baseHeight);

    ctx.save();
    ctx.translate(this.center.x, this.center.y);
    ctx.rotate(globalRotation);
    ctx.translate(-this.center.x, -this.center.y);

    const gradient = ctx.createRadialGradient(
      displacedCenter.x, displacedCenter.y, 0,
      this.center.x, this.center.y, this.getMaxRadius()
    );

    const peakColor = this.hslToString({
      h: this.currentColor.h,
      s: this.currentColor.s,
      l: Math.min(98, this.currentColor.l + 15),
    });
    const baseColorStr = this.hslToString(this.currentColor);

    gradient.addColorStop(0, peakColor);
    gradient.addColorStop(1, baseColorStr);

    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    ctx.lineTo(this.vertices[1].x, this.vertices[1].y);
    ctx.lineTo(this.vertices[2].x, this.vertices[2].y);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();

    if (this.currentBump > 0.01) {
      this.drawHighlight(ctx, displacedCenter);
    }

    ctx.strokeStyle = `hsla(${this.currentColor.h}, ${this.currentColor.s}%, ${Math.max(20, this.currentColor.l - 20)}%, 0.6)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  drawShadow(ctx: CanvasRenderingContext2D, baseHeight: number, globalRotation: number, neighborCenter: Point): void {
    if (this.currentBump < 0.01) return;

    ctx.save();
    ctx.translate(this.center.x, this.center.y);
    ctx.rotate(globalRotation);
    ctx.translate(-this.center.x, -this.center.y);

    const dx = neighborCenter.x - this.center.x;
    const dy = neighborCenter.y - this.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) {
      ctx.restore();
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    const shadowAlpha = this.currentBump * 0.35;
    const shadowOffset = this.currentBump * baseHeight * this.heightMultiplier * 0.5;

    const shadowCenter: Point = {
      x: this.center.x + nx * shadowOffset * 0.3,
      y: this.center.y + ny * shadowOffset * 0.3 + shadowOffset * 0.2,
    };

    const shadowGrad = ctx.createRadialGradient(
      shadowCenter.x, shadowCenter.y, 0,
      shadowCenter.x, shadowCenter.y, this.getMaxRadius() * 1.2
    );

    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
    shadowGrad.addColorStop(0.5, `rgba(0, 0, 0, ${shadowAlpha * 0.5})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    ctx.lineTo(this.vertices[1].x, this.vertices[1].y);
    ctx.lineTo(this.vertices[2].x, this.vertices[2].y);
    ctx.closePath();

    ctx.fillStyle = shadowGrad;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fill();

    ctx.restore();
  }

  private drawHighlight(ctx: CanvasRenderingContext2D, displacedCenter: Point): void {
    const [v1, v2, v3] = this.vertices;
    const edges: [Point, Point][] = [
      [v1, v2],
      [v2, v3],
      [v3, v1],
    ];

    for (const [a, b] of edges) {
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(displacedCenter.x, displacedCenter.y);
      ctx.lineTo(b.x, b.y);
      ctx.closePath();

      const edgeVecX = b.x - a.x;
      const edgeVecY = b.y - a.y;
      const normalX = -edgeVecY;
      const normalY = edgeVecX;
      const normLen = Math.sqrt(normalX * normalX + normalY * normalY);
      if (normLen === 0) continue;

      const nx = normalX / normLen;
      const ny = normalY / normLen;

      const centerToMidX = midX - this.center.x;
      const centerToMidY = midY - this.center.y;
      const dot = centerToMidX * nx + centerToMidY * ny;

      if (dot > 0) {
        const alpha = this.currentBump * 0.15;
        ctx.fillStyle = `hsla(${this.currentColor.h}, 100%, 90%, ${alpha})`;
      } else {
        const alpha = this.currentBump * 0.2;
        ctx.fillStyle = `hsla(${this.currentColor.h}, 60%, 15%, ${alpha})`;
      }
      ctx.fill();
    }
  }

  private getMaxRadius(): number {
    let maxR = 0;
    for (const v of this.vertices) {
      const dx = v.x - this.center.x;
      const dy = v.y - this.center.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > maxR) maxR = r;
    }
    return maxR;
  }

  private hslToString(hsl: HSL): string {
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  }

  setHeightMultiplier(m: number): void {
    if (this.heightMultiplier !== m) {
      this.heightMultiplier = m;
      this.needsUpdate = true;
    }
  }
}
