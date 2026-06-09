export interface Star {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  phase: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class Starfield {
  private stars: Star[] = [];
  private canvas: HTMLCanvasElement;
  private count: number;

  constructor(canvas: HTMLCanvasElement, count: number = 20) {
    this.canvas = canvas;
    this.count = count;
    this.generateStars();
  }

  public generateStars(): void {
    this.stars = [];
    for (let i = 0; i < this.count; i++) {
      const radius = 1 + Math.random() * 1;
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: radius,
        baseRadius: radius,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        twinkleOffset: Math.random() * 0.5 + 0.5
      });
    }
  }

  public resize(): void {
    this.generateStars();
  }

  public update(time: number): void {
    for (const star of this.stars) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.phase);
      star.radius = star.baseRadius * (0.6 + twinkle * 0.4 * star.twinkleOffset);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 3;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
