export interface InkDropOptions {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  spreadSpeed: number;
  decayRate: number;
}

export class InkDrop {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  spreadSpeed: number;
  decayRate: number;
  direction: number;
  age: number;
  dead: boolean;

  constructor(options: InkDropOptions) {
    this.x = options.x;
    this.y = options.y;
    this.radius = options.radius;
    this.maxRadius = options.radius * (1.8 + Math.random() * 1.2);
    this.color = options.color;
    this.alpha = options.alpha;
    this.spreadSpeed = options.spreadSpeed;
    this.decayRate = options.decayRate;
    this.direction = Math.random() * Math.PI * 2;
    this.age = 0;
    this.dead = false;
  }

  update(brightnessFactor: number): void {
    this.age++;

    const effectiveSpread = this.spreadSpeed * (0.6 + brightnessFactor * 0.8);
    const deflection = (Math.random() - 0.5) * (Math.PI / 12);
    this.direction += deflection;

    this.x += Math.cos(this.direction) * effectiveSpread * 0.3;
    this.y += Math.sin(this.direction) * effectiveSpread * 0.3;

    if (this.radius < this.maxRadius) {
      this.radius += effectiveSpread * 0.4;
    }

    const effectiveDecay = this.decayRate * (1.1 - brightnessFactor * 0.4);
    this.alpha -= effectiveDecay;

    if (this.alpha <= 0.05) {
      this.alpha = 0;
      this.dead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.dead || this.alpha <= 0) return;

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    );

    const hexColor = this.color;
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.alpha})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${this.alpha * 0.6})`);
    gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${this.alpha * 0.2})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  distanceTo(other: InkDrop): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  mergeWith(other: InkDrop): void {
    const totalArea = this.radius * this.radius + other.radius * other.radius;
    this.radius = Math.sqrt(totalArea);
    this.maxRadius = Math.max(this.maxRadius, other.maxRadius);
    this.alpha = (this.alpha + other.alpha) / 2;
    this.x = (this.x + other.x) / 2;
    this.y = (this.y + other.y) / 2;
  }
}

export function createInkDrop(x: number, y: number, isBurst: boolean = false): InkDrop {
  if (isBurst) {
    const radius = 12 + Math.random() * 18;
    const grayValue = Math.floor(Math.random() * 30);
    const color = `#${grayValue.toString(16).padStart(2, '0').repeat(3)}`;
    return new InkDrop({
      x,
      y,
      radius,
      color,
      alpha: 0.9 + Math.random() * 0.1,
      spreadSpeed: 0.5 + Math.random() * 0.7,
      decayRate: 0.0015 + Math.random() * 0.0025
    });
  } else {
    const radius = 6 + Math.random() * 14;
    const grayValue = Math.floor(Math.random() * 52);
    const color = `#${grayValue.toString(16).padStart(2, '0').repeat(3)}`;
    return new InkDrop({
      x,
      y,
      radius,
      color,
      alpha: 0.7 + Math.random() * 0.2,
      spreadSpeed: 0.3 + Math.random() * 0.7,
      decayRate: 0.002 + Math.random() * 0.003
    });
  }
}
