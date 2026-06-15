type FragType = 'square' | 'triangle' | 'circle';

interface Fragment {
  type: FragType;
  size: number;
  baseX: number;
  baseY: number;
  color: string;
  zOrder: number;
}

export interface JetParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

const GOLD_STROKE = 'rgba(255, 215, 100, 0.45)';
const DANGER_COLOR = '#660000';

const PALETTE = [
  '#5ac8ff',
  '#ff7bd5',
  '#b78cff',
  '#7affd6',
  '#ffd266',
  '#ff8a66',
  '#66c2ff',
  '#f26bff'
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): string {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r},${g},${b})`;
}

export class Ship {
  private fragments: Fragment[] = [];
  public x: number = 0;
  public y: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  public scaleX: number = 1;
  public scaleY: number = 1;
  public tilt: number = 0;
  public spacingMul: number = 1;
  private jetTimer: number = 0;
  public jetParticles: JetParticle[] = [];
  private explodePhase: number = 0;
  private isExploding: boolean = false;
  private explodeOffsets: { dx: number; dy: number; rot: number }[] = [];
  public dangerT: number = 0;
  private basePaletteRgb: [number, number, number][] = PALETTE.map(hexToRgb);
  private dangerRgb: [number, number, number] = hexToRgb(DANGER_COLOR);
  private canvasW: number = 0;
  private canvasH: number = 0;

  constructor() {
    this.buildShip();
  }

  private buildShip(): void {
    this.fragments = [];
    this.explodeOffsets = [];
    const patterns: Array<{ type: FragType; x: number; y: number; size: number; colorIdx: number; z: number }> = [
      { type: 'triangle', x: 0, y: -28, size: 16, colorIdx: 0, z: 10 },
      { type: 'triangle', x: -10, y: -18, size: 12, colorIdx: 4, z: 9 },
      { type: 'triangle', x: 10, y: -18, size: 12, colorIdx: 4, z: 9 },
      { type: 'square', x: 0, y: -8, size: 14, colorIdx: 2, z: 8 },
      { type: 'square', x: -12, y: 0, size: 10, colorIdx: 3, z: 7 },
      { type: 'square', x: 12, y: 0, size: 10, colorIdx: 3, z: 7 },
      { type: 'circle', x: 0, y: 6, size: 9, colorIdx: 1, z: 6 },
      { type: 'circle', x: -18, y: 8, size: 7, colorIdx: 5, z: 5 },
      { type: 'circle', x: 18, y: 8, size: 7, colorIdx: 5, z: 5 },
      { type: 'square', x: -8, y: 14, size: 8, colorIdx: 6, z: 4 },
      { type: 'square', x: 8, y: 14, size: 8, colorIdx: 6, z: 4 },
      { type: 'triangle', x: -22, y: 18, size: 10, colorIdx: 7, z: 3 },
      { type: 'triangle', x: 22, y: 18, size: 10, colorIdx: 7, z: 3 },
      { type: 'circle', x: 0, y: 22, size: 8, colorIdx: 0, z: 2 },
      { type: 'square', x: -14, y: 26, size: 6, colorIdx: 4, z: 1 },
      { type: 'square', x: 14, y: 26, size: 6, colorIdx: 4, z: 1 },
      { type: 'triangle', x: -4, y: 30, size: 7, colorIdx: 5, z: 0 },
      { type: 'triangle', x: 4, y: 30, size: 7, colorIdx: 5, z: 0 }
    ];
    for (const p of patterns) {
      const jitter = 1.2;
      this.fragments.push({
        type: p.type,
        size: p.size + (Math.random() - 0.5) * 2,
        baseX: p.x + (Math.random() - 0.5) * jitter,
        baseY: p.y + (Math.random() - 0.5) * jitter,
        color: PALETTE[p.colorIdx],
        zOrder: p.z
      });
      this.explodeOffsets.push({
        dx: (Math.random() - 0.5) * 400,
        dy: (Math.random() - 0.5) * 400,
        rot: (Math.random() - 0.5) * Math.PI * 4
      });
    }
    this.fragments.sort((a, b) => a.zOrder - b.zOrder);
  }

  init(w: number, h: number): void {
    this.canvasW = w;
    this.canvasH = h;
    this.x = w / 2;
    this.y = h / 2;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  setTarget(x: number, y: number, dx: number, dy: number): void {
    this.targetX = x;
    this.targetY = y;
    if (dx < 0) {
      this.scaleX = 1.3;
      this.scaleY = 0.85;
      this.tilt = -15 * Math.PI / 180;
      this.spacingMul = 1.5;
    } else if (dx > 0) {
      this.scaleX = 0.8;
      this.scaleY = 0.8;
      this.tilt = 5 * Math.PI / 180;
      this.spacingMul = 1;
      if (this.jetTimer <= 0) this.jetTimer = 0.3;
    } else {
      this.scaleX += (1 - this.scaleX) * 0.15;
      this.scaleY += (1 - this.scaleY) * 0.15;
      this.tilt += (0 - this.tilt) * 0.15;
      this.spacingMul += (1 - this.spacingMul) * 0.15;
    }
  }

  applyGravityPull(pullX: number, pullY: number): void {
    this.targetX += pullX;
    this.targetY += pullY;
  }

  update(dt: number): void {
    if (this.isExploding) {
      this.explodePhase += dt;
      if (this.explodePhase >= 1) {
        this.isExploding = false;
        this.explodePhase = 0;
        this.respawn();
      }
      return;
    }
    const follow = 0.12;
    this.x += (this.targetX - this.x) * follow;
    this.y += (this.targetY - this.y) * follow;
    if (this.jetTimer > 0) {
      this.jetTimer -= dt;
      const count = 4;
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 0.6;
        const speed = 120 + Math.random() * 100;
        const ang = Math.PI / 2 + spread + this.tilt;
        const px = this.x;
        const py = this.y + 30;
        this.jetParticles.push({
          x: px + (Math.random() - 0.5) * 10,
          y: py + (Math.random() - 0.5) * 6,
          vx: Math.sin(ang) * speed,
          vy: Math.cos(ang) * speed,
          life: 1,
          maxLife: 0.35,
          size: 2 + Math.random() * 3
        });
      }
    }
    const arr = this.jetParticles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        arr.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }

  setDangerLevel(t: number): void {
    this.dangerT = Math.max(0, Math.min(1, t));
  }

  triggerExplode(): void {
    this.isExploding = true;
    this.explodePhase = 0;
  }

  isDead(): boolean {
    return this.isExploding;
  }

  private respawn(): void {
    this.x = this.canvasW * 0.2;
    this.y = this.canvasH * 0.25;
    this.targetX = this.x;
    this.targetY = this.y;
    this.dangerT = 0;
    this.jetParticles = [];
    this.jetTimer = 0;
  }

  private drawFragmentShape(ctx: CanvasRenderingContext2D, type: FragType, size: number): void {
    switch (type) {
      case 'square':
        ctx.beginPath();
        ctx.rect(-size / 2, -size / 2, size, size);
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.6);
        ctx.lineTo(size * 0.55, size * 0.5);
        ctx.lineTo(-size * 0.55, size * 0.5);
        ctx.closePath();
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.jetParticles) {
      const a = Math.max(0, p.life);
      ctx.fillStyle = `rgba(255, 200, 120, ${a * 0.85})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + a * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    const sx = this.isExploding ? 1 + this.explodePhase * 0.5 : this.scaleX;
    const sy = this.isExploding ? 1 + this.explodePhase * 0.3 : this.scaleY;
    const rot = this.isExploding ? 0 : this.tilt;
    ctx.rotate(rot);
    ctx.scale(sx, sy);

    const baseAlpha = this.isExploding ? 1 - this.explodePhase : 1;
    const spMul = this.isExploding ? 1 : this.spacingMul;

    for (let i = 0; i < this.fragments.length; i++) {
      const f = this.fragments[i];
      let ox: number;
      let oy: number;
      let extraRot = 0;
      if (this.isExploding) {
        const off = this.explodeOffsets[i];
        const ph = this.explodePhase;
        ox = f.baseX + off.dx * ph * 0.35;
        oy = f.baseY + off.dy * ph * 0.35;
        extraRot = off.rot * ph;
      } else {
        ox = f.baseX * spMul;
        oy = f.baseY * spMul;
      }
      ctx.save();
      ctx.translate(ox, oy);
      if (extraRot) ctx.rotate(extraRot);
      this.drawFragmentShape(ctx, f.type, f.size);
      const originalRgb = this.basePaletteRgb[i % this.basePaletteRgb.length];
      const fillColor = this.dangerT > 0
        ? lerpColor(originalRgb, this.dangerRgb, this.dangerT)
        : f.color;
      ctx.globalAlpha = baseAlpha;
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = GOLD_STROKE;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();
  }

  getRadius(): number {
    return 32;
  }
}
