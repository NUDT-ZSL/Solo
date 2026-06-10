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
  private maxDataPoints = 120;
  private sampleIntervalMs = 500;
  private width = 0;
  private height = 0;
  private animationId: number | null = null;
  private lastSampleTime = 0;
  private pendingHumidity = 30;
  private pendingTemperature = 22;
  private pendingBiodiversity = 5;
  private lastDrawnDataCount = -1;
  private startTime = Date.now();

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas ${canvasId} not found`);
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize();
    this.initData();
    this.lastSampleTime = Date.now();
  }

  private initData(): void {
    const now = Date.now();
    this.data = [];
    for (let i = this.maxDataPoints - 1; i >= 0; i--) {
      this.data.push({
        time: now - i * this.sampleIntervalMs,
        humidity: 30,
        temperature: 22,
        biodiversity: 5,
      });
    }
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.lastDrawnDataCount = -1;
  }

  public setValues(humidity: number, temperature: number, biodiversity: number): void {
    this.pendingHumidity = humidity;
    this.pendingTemperature = temperature;
    this.pendingBiodiversity = biodiversity;

    const now = Date.now();
    const elapsed = now - this.lastSampleTime;
    if (elapsed >= this.sampleIntervalMs) {
      this.sampleData();
    }
  }

  public update(humidity: number, temperature: number, biodiversity: number): void {
    this.setValues(humidity, temperature, biodiversity);
  }

  private sampleData(): void {
    const now = Date.now();
    this.lastSampleTime = now - ((now - this.lastSampleTime) % this.sampleIntervalMs);

    this.data.push({
      time: now,
      humidity: this.pendingHumidity,
      temperature: this.pendingTemperature,
      biodiversity: this.pendingBiodiversity,
    });

    while (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }
  }

  public draw(): void {
    if (this.width === 0 || this.height === 0) {
      this.resize();
      if (this.width === 0) return;
    }

    const now = Date.now();
    if (now - this.lastSampleTime >= this.sampleIntervalMs) {
      this.sampleData();
    }

    const { ctx, width, height, data } = this;
    const padding = { top: 14, right: 10, bottom: 26, left: 32 };
    const chartW = Math.max(50, width - padding.left - padding.right);
    const chartH = Math.max(40, height - padding.top - padding.bottom);

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(12, 24, 12, 0.55)';
    this.roundRect(ctx, 0, 0, width, height, 8);
    ctx.fill();

    const allValues = data.flatMap(d => [d.humidity, d.temperature, d.biodiversity]);
    const maxVal = Math.max(...allValues, 10);
    const minVal = Math.min(...allValues, 0);
    const range = maxVal - minVal || 1;
    const topPad = range * 0.1;
    const displayMax = maxVal + topPad;
    const displayMin = Math.max(0, minVal - topPad);
    const displayRange = displayMax - displayMin || 1;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      const val = displayMax - (displayRange / 4) * i;
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(val.toFixed(0), padding.left - 5, y);
      ctx.setLineDash([3, 3]);
    }
    ctx.setLineDash([]);

    if (data.length < 2) return;

    const drawArea = (getVal: (d: IndicatorDataPoint) => number, color: string) => {
      ctx.beginPath();
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      gradient.addColorStop(0, color + '33');
      gradient.addColorStop(1, color + '00');
      for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / (data.length - 1)) * i;
        const val = getVal(data[i]);
        const normalized = (val - displayMin) / displayRange;
        const y = padding.top + chartH * (1 - normalized);
        if (i === 0) {
          ctx.moveTo(x, padding.top + chartH);
          ctx.lineTo(x, y);
        } else {
          const prevX = padding.left + (chartW / (data.length - 1)) * (i - 1);
          const prevVal = getVal(data[i - 1]);
          const prevNormalized = (prevVal - displayMin) / displayRange;
          const prevY = padding.top + chartH * (1 - prevNormalized);
          const cpx = (prevX + x) / 2;
          ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
        }
      }
      const lastX = padding.left + chartW;
      ctx.lineTo(lastX, padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    const drawLine = (getVal: (d: IndicatorDataPoint) => number, color: string, glowColor: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / (data.length - 1)) * i;
        const val = getVal(data[i]);
        const normalized = (val - displayMin) / displayRange;
        const y = padding.top + chartH * (1 - normalized);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = padding.left + (chartW / (data.length - 1)) * (i - 1);
          const prevVal = getVal(data[i - 1]);
          const prevNormalized = (prevVal - displayMin) / displayRange;
          const prevY = padding.top + chartH * (1 - prevNormalized);
          const cpx = (prevX + x) / 2;
          ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
        }
      }
      ctx.stroke();

      const lastIdx = data.length - 1;
      const lastX = padding.left + (chartW / (data.length - 1)) * lastIdx;
      const lastVal = getVal(data[lastIdx]);
      const lastNorm = (lastVal - displayMin) / displayRange;
      const lastY = padding.top + chartH * (1 - lastNorm);
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    drawArea(d => d.humidity, '#4FC3F7');
    drawArea(d => d.temperature, '#FF9800');
    drawArea(d => d.biodiversity, '#66BB6A');

    drawLine(d => d.humidity, '#4FC3F7', 'rgba(79, 195, 247, 0.85)');
    drawLine(d => d.temperature, '#FF9800', 'rgba(255, 152, 0, 0.85)');
    drawLine(d => d.biodiversity, '#66BB6A', 'rgba(102, 187, 106, 0.85)');

    const totalSeconds = (this.maxDataPoints * this.sampleIntervalMs) / 1000;
    const timeLabels = [
      `-${Math.floor(totalSeconds)}s`,
      `-${Math.floor(totalSeconds * 0.66)}s`,
      `-${Math.floor(totalSeconds * 0.33)}s`,
      '现在'
    ];
    const labelPositions = [0, chartW / 3, (chartW / 3) * 2, chartW];

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    timeLabels.forEach((label, i) => {
      ctx.fillText(label, padding.left + labelPositions[i], padding.top + chartH + 7);
    });

    ctx.strokeStyle = 'rgba(139, 105, 20, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, padding.left, padding.top, chartW, chartH, 4);
    ctx.stroke();

    this.lastDrawnDataCount = data.length;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
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

  public getDataCount(): number {
    return this.data.length;
  }
}

