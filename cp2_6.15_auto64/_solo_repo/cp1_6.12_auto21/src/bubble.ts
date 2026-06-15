export type BubbleColor = 'red' | 'blue' | 'green' | 'yellow' | 'star';

export const BUBBLE_COLORS: Record<Exclude<BubbleColor, 'star'>, { main: string; light: string; dark: string }> = {
  red: { main: '#ff5252', light: '#ff8a80', dark: '#c62828' },
  blue: { main: '#448aff', light: '#82b1ff', dark: '#1565c0' },
  green: { main: '#69f0ae', light: '#b9f6ca', dark: '#00c853' },
  yellow: { main: '#ffd740', light: '#ffe57f', dark: '#ffab00' }
};

export const NORMAL_COLORS: Exclude<BubbleColor, 'star'>[] = ['red', 'blue', 'green', 'yellow'];

export class Bubble {
  row: number;
  col: number;
  color: BubbleColor;
  radius: number;
  x!: number;
  y!: number;
  falling: boolean;
  fallVy: number;
  fallVx: number;
  popping: boolean;
  popProgress: number;
  isStar: boolean;

  constructor(row: number, col: number, color: BubbleColor, radius: number, offsetX: number, offsetY: number) {
    this.row = row;
    this.col = col;
    this.color = color;
    this.radius = radius;
    this.falling = false;
    this.fallVy = 0;
    this.fallVx = 0;
    this.popping = false;
    this.popProgress = 0;
    this.isStar = color === 'star';
    this.updatePosition(offsetX, offsetY);
  }

  updatePosition(offsetX: number, offsetY: number): void {
    const horizontalSpacing = this.radius * Math.sqrt(3);
    const verticalSpacing = this.radius * 1.5;
    const rowOffset = this.row % 2 === 1 ? horizontalSpacing / 2 : 0;
    this.x = offsetX + this.col * horizontalSpacing + rowOffset;
    this.y = offsetY + this.row * verticalSpacing;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.popping) {
      this.drawPopping(ctx);
      return;
    }
    if (this.falling) {
      this.drawFalling(ctx);
      return;
    }

    ctx.save();

    if (this.isStar) {
      this.drawStarBubble(ctx);
    } else {
      this.drawNormalBubble(ctx);
    }

    ctx.restore();
  }

  private drawNormalBubble(ctx: CanvasRenderingContext2D): void {
    const colors = BUBBLE_COLORS[this.color as Exclude<BubbleColor, 'star'>];
    const scale = this.popping ? 1 + this.popProgress * 0.5 : 1;
    const r = this.radius * scale;

    const gradient = ctx.createRadialGradient(
      this.x - r * 0.3, this.y - r * 0.3, r * 0.1,
      this.x, this.y, r
    );
    gradient.addColorStop(0, colors.light);
    gradient.addColorStop(0.6, colors.main);
    gradient.addColorStop(1, colors.dark);

    ctx.beginPath();
    ctx.arc(this.x, this.y, r - 1, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x - r * 0.35, this.y - r * 0.35, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x + r * 0.25, this.y + r * 0.15, r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
  }

  private drawStarBubble(ctx: CanvasRenderingContext2D): void {
    const r = this.radius;
    const spikes = 5;
    const outerRadius = r * 0.9;
    const innerRadius = r * 0.42;

    const gradient = ctx.createRadialGradient(
      this.x - r * 0.2, this.y - r * 0.2, r * 0.1,
      this.x, this.y, r
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, '#e040fb');
    gradient.addColorStop(0.8, '#7c4dff');
    gradient.addColorStop(1, '#304ffe');

    ctx.beginPath();
    ctx.arc(this.x, this.y, r - 1, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = this.x + Math.cos(angle) * radius;
      const py = this.y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const starGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, outerRadius);
    starGradient.addColorStop(0, '#fff59d');
    starGradient.addColorStop(0.5, '#ffd54f');
    starGradient.addColorStop(1, '#ff8f00');
    ctx.fillStyle = starGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawFalling(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - (this.y - 400) / 500);

    if (this.isStar) {
      this.drawStarBubble(ctx);
    } else {
      this.drawNormalBubble(ctx);
    }
    ctx.restore();
  }

  private drawPopping(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 1 - this.popProgress;
    if (this.isStar) {
      this.drawStarBubble(ctx);
    } else {
      this.drawNormalBubble(ctx);
    }
    ctx.restore();
  }

  getNeighbors(): { row: number; col: number }[] {
    const isOddRow = this.row % 2 === 1;
    if (isOddRow) {
      return [
        { row: this.row - 1, col: this.col },
        { row: this.row - 1, col: this.col + 1 },
        { row: this.row, col: this.col - 1 },
        { row: this.row, col: this.col + 1 },
        { row: this.row + 1, col: this.col },
        { row: this.row + 1, col: this.col + 1 }
      ];
    } else {
      return [
        { row: this.row - 1, col: this.col - 1 },
        { row: this.row - 1, col: this.col },
        { row: this.row, col: this.col - 1 },
        { row: this.row, col: this.col + 1 },
        { row: this.row + 1, col: this.col - 1 },
        { row: this.row + 1, col: this.col }
      ];
    }
  }

  matchesColor(other: Bubble | null | undefined): boolean {
    if (!other) return false;
    if (this.isStar || other.isStar) return true;
    return this.color === other.color;
  }

  distanceTo(px: number, py: number): number {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
