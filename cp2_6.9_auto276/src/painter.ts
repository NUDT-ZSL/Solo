import { InkDrop } from './inkdrop';

export interface Stroke {
  from: InkDrop;
  to: InkDrop;
  correct: boolean;
}

export interface ConnectionResult {
  success: boolean;
  stroke: Stroke | null;
  completed: boolean;
}

export class Painter {
  strokes: Stroke[] = [];
  private expectedNextIndex: number = 1;
  private totalDrops: number;

  constructor(totalDrops: number) {
    this.totalDrops = totalDrops;
  }

  reset(totalDrops: number): void {
    this.strokes = [];
    this.expectedNextIndex = 1;
    this.totalDrops = totalDrops;
  }

  drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.2
    );
    gradient.addColorStop(0, '#F7F2E0');
    gradient.addColorStop(1, '#EDE1C8');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(139, 119, 85, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 200; i++) {
      const x1 = Math.random() * width;
      const y1 = Math.random() * height;
      const angle = Math.random() * Math.PI;
      const length = 8 + Math.random() * 20;
      const x2 = x1 + Math.cos(angle) * length;
      const y2 = y1 + Math.sin(angle) * length;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  drawStrokes(ctx: CanvasRenderingContext2D): void {
    for (const stroke of this.strokes) {
      this.drawStroke(ctx, stroke);
    }
  }

  drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    const { from, to, correct } = stroke;

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const offset = Math.min(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) * 0.2;
    const ctrlX = midX + (Math.random() - 0.5) * offset;
    const ctrlY = midY + (Math.random() - 0.5) * offset;

    ctx.save();

    if (correct) {
      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, '#1A1A1A');
      gradient.addColorStop(1, '#3A2A1A');
      ctx.strokeStyle = gradient;
    } else {
      ctx.strokeStyle = 'rgba(139, 90, 43, 0.4)';
    }

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
    ctx.stroke();

    if (correct) {
      this.drawInkSpread(ctx, to.x, to.y);
    }

    ctx.restore();
  }

  drawInkSpread(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
    gradient.addColorStop(0, 'rgba(26, 26, 26, 0.4)');
    gradient.addColorStop(0.5, 'rgba(58, 42, 26, 0.2)');
    gradient.addColorStop(1, 'rgba(58, 42, 26, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPreviewLine(
    ctx: CanvasRenderingContext2D,
    from: InkDrop,
    mouseX: number,
    mouseY: number
  ): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(26, 26, 26, 0.5)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();

    ctx.restore();
  }

  tryConnect(from: InkDrop, to: InkDrop): ConnectionResult {
    if (from.index !== this.expectedNextIndex) {
      return { success: false, stroke: null, completed: false };
    }

    const isCorrect = to.index === this.expectedNextIndex + 1;
    const stroke: Stroke = { from, to, correct: isCorrect };

    if (isCorrect) {
      this.strokes.push(stroke);
      this.expectedNextIndex++;
      to.markConnected();

      const completed = this.expectedNextIndex > this.totalDrops;
      return { success: true, stroke, completed };
    } else {
      this.strokes.push(stroke);
      return { success: false, stroke, completed: false };
    }
  }

  getExpectedNextIndex(): number {
    return this.expectedNextIndex;
  }

  getConnectedCount(): number {
    return this.strokes.filter(s => s.correct).length;
  }

  getAccuracy(): number {
    if (this.strokes.length === 0) return 100;
    const correct = this.strokes.filter(s => s.correct).length;
    return Math.round((correct / this.strokes.length) * 100);
  }
}
