export interface IndicatorDataPoint {
  time: number;
  humidity: number;
  temperature: number;
  biodiversity: number;
}

export class EcoIndicatorChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private data: IndicatorDataPoint[] = [];
  private maxDataPoints = 60;
  private width = 0;
  private height = 0;
  private animationId: number | null = null;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas ${canvasId} not found`);
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize();
    this.initData();
  }

  private initData(): void {
    const now = Date.now();
    for (let i = this.maxDataPoints - 1; i >= 0; i--) {
      this.data.push({
        time: now - i * 1000,
        humidity: 30,
        temperature: 22,
        biodiversity: 5,
      });
    }
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  public update(humidity: number, temperature: number, biodiversity: number): void {
    const now = Date.now();
    this.data.push({ time: now, humidity, temperature, biodiversity });
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }
  }

  public draw(): void {
    const { ctx, width, height, data } = this;
    const padding = { top: 16, right: 12, bottom: 28, left: 36 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(15, 30, 15, 0.4)';
    ctx.fillRect(0, 0, width, height);

    const allValues = data.flatMap(d => [d.humidity, d.temperature, d.biodiversity]);
    const maxVal = Math.max(...allValues, 10);
    const minVal = Math.min(...allValues, 0);
    const range = maxVal - minVal || 1;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      const val = maxVal - (range / 4) * i;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(0), padding.left - 6, y + 3);
    }

    if (data.length < 2) return;

    const drawLine = (getVal: (d: IndicatorDataPoint) => number, color: string, glowColor: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / (data.length - 1)) * i;
        const val = getVal(data[i]);
        const normalized = (val - minVal) / range;
        const y = padding.top + chartH * (1 - normalized);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = padding.left + (chartW / (data.length - 1)) * (i - 1);
          const prevVal = getVal(data[i - 1]);
          const prevNormalized = (prevVal - minVal) / range;
          const prevY = padding.top + chartH * (1 - prevNormalized);

          const cpx = (prevX + x) / 2;
          ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    drawLine(d => d.humidity, '#4FC3F7', 'rgba(79, 195, 247, 0.8)');
    drawLine(d => d.temperature, '#FF9800', 'rgba(255, 152, 0, 0.8)');
    drawLine(d => d.biodiversity, '#66BB6A', 'rgba(102, 187, 106, 0.8)');

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const timeLabels = ['-60s', '-40s', '-20s', '现在'];
    const labelPositions = [0, chartW / 3, (chartW / 3) * 2, chartW];
    timeLabels.forEach((label, i) => {
      ctx.fillText(label, padding.left + labelPositions[i], height - 8);
    });
  }

  public startAnimation(): void {
    const loop = () => {
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  public stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public destroy(): void {
    this.stopAnimation();
  }
}
