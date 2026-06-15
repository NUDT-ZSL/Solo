export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export class Grid {
  private ctx: CanvasRenderingContext2D;
  private cellSize: number = 50;
  private lineColor: string = '#00bcd4';
  private lineAlpha: number = 0.3;
  private waveAmplitude: number = 3;
  private wavePeriod: number = 2000;
  private transform: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setTransform(transform: ViewTransform): void {
    this.transform = transform;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.transform.offsetX) / this.transform.scale,
      y: (sy - this.transform.offsetY) / this.transform.scale
    };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.transform.scale + this.transform.offsetX,
      y: wy * this.transform.scale + this.transform.offsetY
    };
  }

  draw(time: number, canvasWidth: number, canvasHeight: number): void {
    const ctx = this.ctx;
    const { scale, offsetX, offsetY } = this.transform;
    const cellSize = this.cellSize * scale;

    const tl = this.screenToWorld(-100, -100);
    const br = this.screenToWorld(canvasWidth + 100, canvasHeight + 100);

    const startX = Math.floor(tl.x / this.cellSize) * this.cellSize;
    const endX = Math.ceil(br.x / this.cellSize) * this.cellSize;
    const startY = Math.floor(tl.y / this.cellSize) * this.cellSize;
    const endY = Math.ceil(br.y / this.cellSize) * this.cellSize;

    ctx.save();
    ctx.strokeStyle = this.lineColor;
    ctx.globalAlpha = this.lineAlpha;
    ctx.lineWidth = 1 / window.devicePixelRatio;
    ctx.shadowColor = this.lineColor;
    ctx.shadowBlur = 6 * scale;

    const phase = (time % this.wavePeriod) / this.wavePeriod;
    const t = phase * Math.PI * 2;

    ctx.beginPath();
    for (let wx = startX; wx <= endX; wx += this.cellSize) {
      const sx = wx * scale + offsetX;
      const offsetTop = Math.sin(t + wx * 0.02) * this.waveAmplitude * scale;
      const offsetBottom = Math.sin(t + wx * 0.02 + 1.3) * this.waveAmplitude * scale;

      ctx.moveTo(sx + offsetTop, -100);
      const segments = Math.ceil((canvasHeight + 200) / 50);
      for (let i = 1; i <= segments; i++) {
        const sy = -100 + (canvasHeight + 200) * (i / segments);
        const localPhase = t + wx * 0.02 + (sy / canvasHeight) * Math.PI * 2;
        const ox = Math.sin(localPhase) * this.waveAmplitude * scale;
        ctx.lineTo(sx + ox, sy);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    for (let wy = startY; wy <= endY; wy += this.cellSize) {
      const sy = wy * scale + offsetY;
      const offsetLeft = Math.cos(t + wy * 0.02) * this.waveAmplitude * scale;
      const offsetRight = Math.cos(t + wy * 0.02 + 0.7) * this.waveAmplitude * scale;

      ctx.moveTo(-100, sy + offsetLeft);
      const segments = Math.ceil((canvasWidth + 200) / 50);
      for (let i = 1; i <= segments; i++) {
        const sx = -100 + (canvasWidth + 200) * (i / segments);
        const localPhase = t + wy * 0.02 + (sx / canvasWidth) * Math.PI * 2;
        const oy = Math.cos(localPhase) * this.waveAmplitude * scale;
        ctx.lineTo(sx, sy + oy);
      }
    }
    ctx.stroke();

    ctx.globalAlpha = this.lineAlpha * 0.6;
    ctx.shadowBlur = 12 * scale;
    ctx.lineWidth = 1 / window.devicePixelRatio;

    ctx.beginPath();
    for (let wx = startX; wx <= endX; wx += this.cellSize * 2) {
      const sx = wx * scale + offsetX;
      ctx.moveTo(sx, -100);
      ctx.lineTo(sx, canvasHeight + 100);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let wy = startY; wy <= endY; wy += this.cellSize * 2) {
      const sy = wy * scale + offsetY;
      ctx.moveTo(-100, sy);
      ctx.lineTo(canvasWidth + 100, sy);
    }
    ctx.stroke();

    ctx.restore();
  }
}
