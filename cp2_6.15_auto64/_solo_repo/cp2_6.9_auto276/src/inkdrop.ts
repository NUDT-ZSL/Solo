export interface InkDropState {
  x: number;
  y: number;
  radius: number;
  index: number;
  connected: boolean;
}

export class InkDrop {
  x: number;
  y: number;
  radius: number;
  index: number;
  connected: boolean;
  color: string = '#1A1A1A';
  connectedColor: string = '#C9A96E';

  constructor(x: number, y: number, radius: number, index: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.index = index;
    this.connected = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const currentColor = this.connected ? this.connectedColor : this.color;

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 1.5
    );
    gradient.addColorStop(0, currentColor);
    gradient.addColorStop(0.6, this.hexToRgba(currentColor, 0.7));
    gradient.addColorStop(1, this.hexToRgba(currentColor, 0));

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    const innerGradient = ctx.createRadialGradient(
      this.x - this.radius * 0.2, this.y - this.radius * 0.2, 0,
      this.x, this.y, this.radius
    );
    innerGradient.addColorStop(0, this.hexToRgba(currentColor, 0.95));
    innerGradient.addColorStop(1, currentColor);

    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    if (!this.connected) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(this.index.toString(), this.x, this.y - this.radius - 5);
    }

    ctx.restore();
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius * 1.5;
  }

  markConnected(): void {
    this.connected = true;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
