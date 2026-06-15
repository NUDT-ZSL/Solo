export interface Point {
  x: number;
  y: number;
}

export type Theme = 'night' | 'morning';

const FLOWER_COLORS: string[] = [
  '#ff69b4',
  '#9b59b6',
  '#f1c40f',
  '#e67e22'
];

const FLOWER_NAMES: string[] = [
  '星语花',
  '夜光兰',
  '晨曦薇',
  '月影菊',
  '云烟玫',
  '露珠莲',
  '风铃草',
  '蝶舞花',
  '梦境棠',
  '忆雪樱'
];

interface Petal {
  color: string;
  size: number;
  rotationOffset: number;
  phase: number;
}

interface FallingPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  life: number;
  color: string;
  size: number;
}

export class Flower {
  public petals: Petal[] = [];
  public baseRotation: number = 0;
  public rotationSpeed: number;
  public position: Point = { x: 0, y: 0 };
  public fallingPetals: FallingPetal[] = [];
  public fallTimer: number;
  public name: string;
  public isHovered: boolean = false;
  public maxRadius: number = 0;

  private _time: number = 0;

  constructor(position: Point) {
    this.position = { ...position };
    this.name = FLOWER_NAMES[Math.floor(Math.random() * FLOWER_NAMES.length)];
    this.rotationSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 1.0);
    this.fallTimer = 2 + Math.random() * 1;

    const baseColor = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)];
    for (let i = 0; i < 5; i++) {
      this.petals.push({
        color: baseColor,
        size: 8 + Math.random() * 12,
        rotationOffset: (i / 5) * Math.PI * 2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }
    this.maxRadius = Math.max(...this.petals.map(p => p.size));
  }

  public update(dt: number): void {
    this._time += dt;
    if (!this.isHovered) {
      this.baseRotation += this.rotationSpeed * dt;
    }
    this.fallTimer -= dt;
    if (this.fallTimer <= 0 && this.petals.length > 0) {
      this._dropPetal();
      this.fallTimer = 2 + Math.random() * 1;
    }
    for (let i = this.fallingPetals.length - 1; i >= 0; i--) {
      const p = this.fallingPetals[i];
      p.vy += 30 * dt;
      p.vx += (Math.random() - 0.5) * 8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 2);
      if (p.life <= 0) {
        this.fallingPetals.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, theme: Theme): void {
    const scale = this.isHovered ? 1.2 : 1.0;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.baseRotation);
    ctx.scale(scale, scale);

    if (theme === 'night') {
      ctx.shadowColor = 'rgba(255, 180, 220, 0.6)';
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
    }

    for (const petal of this.petals) {
      const quiver = Math.sin(this._time * Math.PI * 2 + petal.phase) * 2;
      ctx.save();
      ctx.rotate(petal.rotationOffset);
      ctx.translate(0, quiver * 0.5);
      ctx.beginPath();
      const s = petal.size;
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.7, -s * 0.9, 0, -s * 1.2);
      ctx.bezierCurveTo(-s * 0.7, -s * 0.9, -s * 0.5, -s * 0.3, 0, 0);
      ctx.closePath();
      ctx.fillStyle = petal.color;
      ctx.fill();
      ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = theme === 'night' ? '#ffef99' : '#ffb74d';
    ctx.fill();
    ctx.restore();

    for (const fp of this.fallingPetals) {
      ctx.save();
      ctx.globalAlpha = fp.alpha;
      ctx.translate(fp.x, fp.y);
      ctx.rotate(fp.rotation);
      ctx.beginPath();
      const s = fp.size;
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.7, -s * 0.9, 0, -s * 1.2);
      ctx.bezierCurveTo(-s * 0.7, -s * 0.9, -s * 0.5, -s * 0.3, 0, 0);
      ctx.closePath();
      ctx.fillStyle = fp.color;
      if (theme === 'night') {
        ctx.shadowColor = 'rgba(255, 180, 220, 0.4)';
        ctx.shadowBlur = 10;
      }
      ctx.fill();
      ctx.restore();
    }
  }

  private _dropPetal(): void {
    const idx = Math.floor(Math.random() * this.petals.length);
    const petal = this.petals[idx];
    const angle = this.baseRotation + petal.rotationOffset - Math.PI / 2;
    const dist = petal.size * 0.6;
    this.fallingPetals.push({
      x: this.position.x + Math.cos(angle) * dist,
      y: this.position.y + Math.sin(angle) * dist,
      vx: Math.cos(angle) * 20 + (Math.random() - 0.5) * 15,
      vy: Math.sin(angle) * 15 - 10,
      rotation: angle,
      rotationSpeed: (Math.random() - 0.5) * 4,
      alpha: 1,
      life: 2,
      color: petal.color,
      size: petal.size
    });
  }
}
