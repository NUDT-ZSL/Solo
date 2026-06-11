import { Star, Color, mixColors } from './star';

interface Connection {
  starA: Star;
  starB: Star;
  color: Color;
  timer: number;
  maxTimer: number;
}

export class ConnectionManager {
  connections: Connection[];

  constructor() {
    this.connections = [];
  }

  add(starA: Star, starB: Star): void {
    const exists = this.connections.some(
      (c) =>
        (c.starA === starA && c.starB === starB) ||
        (c.starA === starB && c.starB === starA)
    );
    if (exists) return;

    this.connections.push({
      starA,
      starB,
      color: mixColors(starA.color, starB.color),
      timer: 0.5,
      maxTimer: 0.5,
    });
  }

  update(dt: number): void {
    for (let i = this.connections.length - 1; i >= 0; i--) {
      this.connections[i].timer -= dt;
      if (this.connections[i].timer <= 0) {
        this.connections.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const len = this.connections.length;
    if (len === 0) return;

    ctx.lineCap = 'round';
    for (let i = 0; i < len; i++) {
      const c = this.connections[i];
      const ratio = c.timer / c.maxTimer;
      const ease = ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
      const alpha = Math.max(0, Math.min(1, ease)) * 0.6;

      ctx.beginPath();
      ctx.moveTo(c.starA.x, c.starA.y);
      ctx.lineTo(c.starB.x, c.starB.y);
      ctx.strokeStyle = `rgba(${c.color.r},${c.color.g},${c.color.b},${alpha.toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  reset(): void {
    this.connections = [];
  }
}
