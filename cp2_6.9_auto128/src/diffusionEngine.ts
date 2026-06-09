import { blendColors, rgbaString } from './colorManager';

export interface ColorBlob {
  id: number;
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  diffusionSpeed: number;
  createdAt: number;
}

export interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
  rings: RippleRing[];
  createdAt: number;
  duration: number;
}

export interface RippleRing {
  currentRadius: number;
  maxRadius: number;
  width: number;
  alpha: number;
  speed: number;
  highlightUntil: number;
}

export interface ClearAnimation {
  active: boolean;
  startTime: number;
  duration: number;
  cx: number;
  cy: number;
}

export class DiffusionEngine {
  private blobs: ColorBlob[] = [];
  private ripples: Ripple[] = [];
  private nextId = 1;
  private canvasWidth = 0;
  private canvasHeight = 0;
  public clearAnimation: ClearAnimation = {
    active: false,
    startTime: 0,
    duration: 1500,
    cx: 0,
    cy: 0,
  };
  private onBlobCountChange?: (count: number) => void;

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  setBlobCountCallback(cb: (count: number) => void): void {
    this.onBlobCountChange = cb;
  }

  getBlobCount(): number {
    return this.blobs.length;
  }

  addBlob(x: number, y: number, color: string, baseRadius: number, diffusionSpeed: number): void {
    const radius = 8 + Math.random() * 12;
    const actualRadius = baseRadius !== undefined ? baseRadius * 0.6 + radius * 0.4 : radius;
    this.blobs.push({
      id: this.nextId++,
      x,
      y,
      baseRadius: actualRadius,
      currentRadius: actualRadius,
      maxRadius: 60,
      color,
      alpha: 0.85,
      diffusionSpeed,
      createdAt: performance.now(),
    });
    this.notifyCount();
    this.optimizeBlobs();
  }

  addRipple(x: number, y: number, color: string): void {
    const now = performance.now();
    const rings: RippleRing[] = [];
    for (let i = 0; i < 3; i++) {
      rings.push({
        currentRadius: 0,
        maxRadius: 120 + i * 40,
        width: 5,
        alpha: 0.8 - i * 0.25,
        speed: 0.5 + i * 0.05,
        highlightUntil: 0,
      });
    }
    this.ripples.push({
      id: this.nextId++,
      x,
      y,
      color,
      rings,
      createdAt: now,
      duration: 2000,
    });
  }

  clearWithAnimation(cx: number, cy: number): void {
    this.clearAnimation = {
      active: true,
      startTime: performance.now(),
      duration: 1500,
      cx,
      cy,
    };
  }

  hardClear(): void {
    this.blobs = [];
    this.ripples = [];
    this.clearAnimation.active = false;
    this.notifyCount();
  }

  private notifyCount(): void {
    if (this.onBlobCountChange) {
      this.onBlobCountChange(this.blobs.length);
    }
  }

  private optimizeBlobs(): void {
    if (this.blobs.length <= 500) return;
    const toRemove = new Set<number>();
    for (let i = 0; i < this.blobs.length; i++) {
      if (toRemove.has(this.blobs[i].id)) continue;
      const a = this.blobs[i];
      for (let j = i + 1; j < this.blobs.length; j++) {
        if (toRemove.has(this.blobs[j].id)) continue;
        const b = this.blobs[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minRadius = Math.min(a.currentRadius, b.currentRadius);
        if (dist < minRadius * 0.2) {
          const overlapRatio = 1 - dist / minRadius;
          if (overlapRatio >= 0.8) {
            a.color = blendColors(a.color, b.color, 8);
            a.currentRadius = Math.max(a.currentRadius, b.currentRadius);
            a.baseRadius = Math.max(a.baseRadius, b.baseRadius);
            toRemove.add(b.id);
          }
        }
      }
    }
    if (toRemove.size > 0) {
      this.blobs = this.blobs.filter(b => !toRemove.has(b.id));
      this.notifyCount();
    }
  }

  private detectBlending(): void {
    for (let i = 0; i < this.blobs.length; i++) {
      for (let j = i + 1; j < this.blobs.length; j++) {
        const a = this.blobs[i];
        const b = this.blobs[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minRadius = Math.min(a.currentRadius, b.currentRadius);
        if (dist < minRadius) {
          const overlapRatio = 1 - dist / (a.currentRadius + b.currentRadius - minRadius);
          if (overlapRatio >= 0.3 && a.color !== b.color) {
            a.color = blendColors(a.color, b.color, 15);
            b.color = blendColors(b.color, a.color, 15);
          }
        }
      }
    }
  }

  private detectRippleOverlap(): void {
    for (let i = 0; i < this.ripples.length; i++) {
      for (let j = i + 1; j < this.ripples.length; j++) {
        const a = this.ripples[i];
        const b = this.ripples[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const aMaxR = Math.max(...a.rings.map(r => r.currentRadius));
        const bMaxR = Math.max(...b.rings.map(r => r.currentRadius));
        if (dist < aMaxR + bMaxR && a.color !== b.color) {
          const now = performance.now();
          a.rings.forEach(r => r.highlightUntil = now + 300);
          b.rings.forEach(r => r.highlightUntil = now + 300);
        }
      }
    }
  }

  updateDiffusion(): void {
    if (this.clearAnimation.active) {
      const elapsed = performance.now() - this.clearAnimation.startTime;
      if (elapsed >= this.clearAnimation.duration) {
        this.hardClear();
      }
      return;
    }

    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const blob = this.blobs[i];
      blob.currentRadius += blob.diffusionSpeed;
      const radiusFraction = blob.currentRadius / blob.maxRadius;
      blob.alpha = Math.max(0, 0.85 * (1 - radiusFraction * 0.9));
      if (blob.alpha < 0.05 || blob.currentRadius >= blob.maxRadius) {
        this.blobs.splice(i, 1);
      }
    }
    this.notifyCount();

    this.detectBlending();

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      const elapsed = performance.now() - ripple.createdAt;
      ripple.rings.forEach(ring => {
        ring.currentRadius += ring.speed;
        const frac = ring.currentRadius / ring.maxRadius;
        ring.alpha = Math.max(0, (0.8 - (ripple.rings.indexOf(ring)) * 0.25) * (1 - frac));
      });
      if (elapsed >= ripple.duration) {
        this.ripples.splice(i, 1);
      }
    }

    this.detectRippleOverlap();
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.canvasWidth === 0) return;

    for (const blob of this.blobs) {
      const gradient = ctx.createRadialGradient(
        blob.x, blob.y, 0,
        blob.x, blob.y, blob.currentRadius
      );
      gradient.addColorStop(0, rgbaString(blob.color, blob.alpha));
      gradient.addColorStop(1, rgbaString(blob.color, 0));
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    const now = performance.now();
    for (const ripple of this.ripples) {
      ripple.rings.forEach(ring => {
        if (ring.currentRadius <= 0 || ring.alpha <= 0) return;
        ctx.globalCompositeOperation = 'source-over';
        const isHighlight = now < ring.highlightUntil;
        const alpha = isHighlight ? Math.min(1, ring.alpha + 0.3) : ring.alpha;
        ctx.strokeStyle = rgbaString(ripple.color, alpha);
        ctx.lineWidth = ring.width;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ring.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    ctx.globalCompositeOperation = 'source-over';

    if (this.clearAnimation.active) {
      const elapsed = now - this.clearAnimation.startTime;
      const t = Math.min(1, elapsed / this.clearAnimation.duration);
      const maxRadius = Math.sqrt(
        this.canvasWidth * this.canvasWidth + this.canvasHeight * this.canvasHeight
      );
      const radius = maxRadius * t;
      const innerRadius = Math.max(0, radius - 80);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.canvasWidth, this.canvasHeight);
      ctx.arc(this.clearAnimation.cx, this.clearAnimation.cy, radius, 0, Math.PI * 2, true);
      ctx.clip();
      ctx.fillStyle = '#F5F0E1';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      ctx.restore();
      if (innerRadius > 0) {
        const gradient = ctx.createRadialGradient(
          this.clearAnimation.cx, this.clearAnimation.cy, innerRadius,
          this.clearAnimation.cx, this.clearAnimation.cy, radius
        );
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.6)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.clearAnimation.cx, this.clearAnimation.cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
