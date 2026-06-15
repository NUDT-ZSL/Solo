import type { Vector2, Planet, Ship } from './physics';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private stars: Star[];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;
    this.stars = this.generateStars(50);
  }

  private generateStars(count: number): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 1 + Math.random(),
        brightness: 0.3 + Math.random() * 0.7
      });
    }
    return stars;
  }

  public resize(_width: number, _height: number) {
    this.stars = this.generateStars(50);
  }

  public clear() {
    this.ctx.fillStyle = '#0B0C10';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public drawStars() {
    for (const star of this.stars) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  public drawPlanet(planet: Planet) {
    if (planet.highlightAlpha > 0) {
      this.ctx.shadowColor = '#EDF2F7';
      this.ctx.shadowBlur = 8 + planet.highlightAlpha * 10;
    } else {
      this.ctx.shadowBlur = 0;
    }

    this.ctx.beginPath();
    this.ctx.arc(planet.position.x, planet.position.y, planet.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = planet.color;
    this.ctx.fill();

    this.ctx.shadowBlur = 0;

    this.ctx.beginPath();
    this.ctx.arc(planet.position.x, planet.position.y, planet.radius + 15, 0, Math.PI * 2);
    this.ctx.strokeStyle = this.darkenColor(planet.color, 0.4);
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  public drawShip(ship: Ship) {
    if (ship.trail.length > 1) {
      for (let i = 1; i < ship.trail.length; i++) {
        const alpha = i / ship.trail.length;
        this.ctx.strokeStyle = `rgba(99, 179, 237, ${alpha * 0.8})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(ship.trail[i - 1].x, ship.trail[i - 1].y);
        this.ctx.lineTo(ship.trail[i].x, ship.trail[i].y);
        this.ctx.stroke();
      }
    }

    let angle = 0;
    if (ship.isFlying) {
      angle = Math.atan2(ship.velocity.y, ship.velocity.x);
    }

    this.ctx.save();
    this.ctx.translate(ship.position.x, ship.position.y);
    this.ctx.rotate(angle);

    this.ctx.beginPath();
    this.ctx.moveTo(8, 0);
    this.ctx.lineTo(-6, -6);
    this.ctx.lineTo(-4, 0);
    this.ctx.lineTo(-6, 6);
    this.ctx.closePath();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();

    this.ctx.restore();
  }

  public drawPredictedTrajectory(start: Vector2, end: Vector2) {
    this.ctx.setLineDash([6, 6]);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.floor(r * (1 - factor));
    const dg = Math.floor(g * (1 - factor));
    const db = Math.floor(b * (1 - factor));
    return `rgba(${dr}, ${dg}, ${db}, 0.6)`;
  }
}
