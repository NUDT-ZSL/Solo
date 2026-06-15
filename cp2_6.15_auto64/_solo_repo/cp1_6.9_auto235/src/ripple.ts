export interface RippleReflection {
  originX: number;
  originY: number;
  startAngle: number;
  endAngle: number;
  initialRadius: number;
}

export class Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  velocity: number;
  lifeTime: number;
  age: number;
  maxRadius: number;
  reflections: RippleReflection[];
  baseHue: number;

  private _reflectedSides: Set<string>;
  private _canvasW: number;
  private _canvasH: number;

  constructor(x: number, y: number, canvasW: number, canvasH: number) {
    this.x = x;
    this.y = y;
    this.radius = 2;
    this.alpha = 0.55;
    this.velocity = 70;
    this.lifeTime = 1.2;
    this.age = 0;
    this.maxRadius = Math.max(canvasW, canvasH) * 0.6;
    this.reflections = [];
    this.baseHue = 200 + Math.random() * 20;

    this._reflectedSides = new Set();
    this._canvasW = canvasW;
    this._canvasH = canvasH;
  }

  update(dt: number, canvasW: number, canvasH: number): boolean {
    this._canvasW = canvasW;
    this._canvasH = canvasH;

    this.age += dt;
    if (this.age >= this.lifeTime) return false;

    this.radius += this.velocity * dt;

    const t = this.age / this.lifeTime;
    this.alpha = 0.55 * (1 - t) * Math.pow(1 - t * 0.5, 2);

    this._checkReflection();

    return this.radius < this.maxRadius * 1.2;
  }

  private _checkReflection(): void {
    const sides: Array<{ key: string; mirror: () => { x: number; y: number; startAngle: number; endAngle: number } }> = [];

    if (this.radius > this.x && !this._reflectedSides.has('left')) {
      sides.push({
        key: 'left',
        mirror: () => {
          const chordHalf = Math.sqrt(Math.max(0, this.radius * this.radius - this.x * this.x));
          const centerAngle = Math.atan2(0, -1);
          const delta = Math.atan2(chordHalf, this.x);
          return { x: -this.x, y: this.y, startAngle: centerAngle - delta, endAngle: centerAngle + delta };
        }
      });
    }
    if (this.radius > this._canvasW - this.x && !this._reflectedSides.has('right')) {
      sides.push({
        key: 'right',
        mirror: () => {
          const dx = this._canvasW - this.x;
          const chordHalf = Math.sqrt(Math.max(0, this.radius * this.radius - dx * dx));
          const centerAngle = Math.atan2(0, 1);
          const delta = Math.atan2(chordHalf, dx);
          return { x: this._canvasW * 2 - this.x, y: this.y, startAngle: centerAngle - delta, endAngle: centerAngle + delta };
        }
      });
    }
    if (this.radius > this.y && !this._reflectedSides.has('top')) {
      sides.push({
        key: 'top',
        mirror: () => {
          const chordHalf = Math.sqrt(Math.max(0, this.radius * this.radius - this.y * this.y));
          const centerAngle = -Math.PI / 2;
          const delta = Math.atan2(chordHalf, this.y);
          return { x: this.x, y: -this.y, startAngle: centerAngle - delta, endAngle: centerAngle + delta };
        }
      });
    }
    if (this.radius > this._canvasH - this.y && !this._reflectedSides.has('bottom')) {
      sides.push({
        key: 'bottom',
        mirror: () => {
          const dy = this._canvasH - this.y;
          const chordHalf = Math.sqrt(Math.max(0, this.radius * this.radius - dy * dy));
          const centerAngle = Math.PI / 2;
          const delta = Math.atan2(chordHalf, dy);
          return { x: this.x, y: this._canvasH * 2 - this.y, startAngle: centerAngle - delta, endAngle: centerAngle + delta };
        }
      });
    }

    for (const side of sides) {
      const m = side.mirror();
      this.reflections.push({
        originX: m.x,
        originY: m.y,
        startAngle: m.startAngle,
        endAngle: m.endAngle,
        initialRadius: this.radius
      });
      this._reflectedSides.add(side.key);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this._renderRipple(ctx, this.x, this.y, this.radius, this.alpha, 0, Math.PI * 2);

    for (const ref of this.reflections) {
      const refRadius = this.radius;
      const refAlpha = this.alpha * 0.7;
      this._renderRipple(ctx, ref.originX, ref.originY, refRadius, refAlpha, ref.startAngle, ref.endAngle);
    }
  }

  private _renderRipple(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, r: number,
    alpha: number,
    startAngle: number, endAngle: number
  ): void {
    if (alpha <= 0.01 || r < 1) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const grad = ctx.createRadialGradient(cx, cy, Math.max(0, r - 4), cx, cy, r + 2);
    grad.addColorStop(0, `hsla(${this.baseHue}, 90%, 80%, 0)`);
    grad.addColorStop(0.5, `hsla(${this.baseHue}, 100%, 78%, ${alpha * 0.9})`);
    grad.addColorStop(1, `hsla(${this.baseHue + 10}, 100%, 70%, 0)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = r * 0.25;
    ctx.shadowColor = `hsla(${this.baseHue}, 100%, 70%, 0.5)`;

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.stroke();

    ctx.restore();
  }

  isDead(): boolean {
    return this.age >= this.lifeTime;
  }
}
