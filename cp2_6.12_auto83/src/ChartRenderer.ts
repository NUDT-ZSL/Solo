import { DataPoint, ChartType } from './types';
import { getCategoryColorHsl } from './utils/colorUtils';

interface ChartRendererOptions {
  width?: number;
  height?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  animationProgress?: number;
}

export class ChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private data: DataPoint[];
  private categories: string[];
  private width: number;
  private height: number;
  private padding = { top: 24, right: 24, bottom: 40, left: 48 };
  private animationProgress: number = 1;
  private animationFrameId: number | null = null;
  private currentType: ChartType = 'bar';

  constructor(canvas: HTMLCanvasElement, data: DataPoint[], options: ChartRendererOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.data = data;
    this.categories = [...new Set(data.map(d => d.category))];
    this.width = options.width || canvas.width;
    this.height = options.height || canvas.height;
    if (options.padding) this.padding = options.padding;
    if (options.animationProgress !== undefined) this.animationProgress = options.animationProgress;
    
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  setData(data: DataPoint[]): void {
    this.data = data;
    this.categories = [...new Set(data.map(d => d.category))];
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.setupCanvas();
  }

  setAnimationProgress(progress: number): void {
    this.animationProgress = Math.max(0, Math.min(1, progress));
  }

  render(type: ChartType): void {
    this.currentType = type;
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    switch (type) {
      case 'bar':
        this.renderBarChart();
        break;
      case 'line':
        this.renderLineChart();
        break;
      case 'timeline':
        this.renderTimeline();
        break;
    }
  }

  animate(type: ChartType, duration: number = 800): Promise<void> {
    return new Promise((resolve) => {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      
      const startTime = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeOutCubic(progress);
        
        this.animationProgress = eased;
        this.render(type);
        
        if (progress < 1) {
          this.animationFrameId = requestAnimationFrame(animate);
        } else {
          this.animationProgress = 1;
          this.animationFrameId = null;
          resolve();
        }
      };
      
      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private getChartArea(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.padding.left,
      y: this.padding.top,
      width: this.width - this.padding.left - this.padding.right,
      height: this.height - this.padding.top - this.padding.bottom,
    };
  }

  private renderBarChart(): void {
    const chartArea = this.getChartArea();
    const data = this.data;
    const categories = this.categories;
    
    if (data.length === 0) return;

    const values = data.map(d => d.value);
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, 0);
    const valueRange = maxValue - minValue || 1;

    const barCount = data.length;
    const barGap = 8;
    const barWidth = (chartArea.width - barGap * (barCount - 1)) / barCount;

    this.ctx.strokeStyle = '#E5E7EB';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = chartArea.y + (chartArea.height / 4) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(chartArea.x, y);
      this.ctx.lineTo(chartArea.x + chartArea.width, y);
      this.ctx.stroke();
    }

    data.forEach((item, index) => {
      const categoryIndex = categories.indexOf(item.category);
      const color = getCategoryColorHsl(categoryIndex, categories.length);
      
      const barX = chartArea.x + index * (barWidth + barGap);
      const barHeight = (Math.abs(item.value) / valueRange) * chartArea.height * this.animationProgress;
      
      let barY: number;
      if (item.value >= 0) {
        const zeroY = chartArea.y + (maxValue / valueRange) * chartArea.height;
        barY = zeroY - barHeight;
      } else {
        const zeroY = chartArea.y + (maxValue / valueRange) * chartArea.height;
        barY = zeroY;
      }

      const delay = index * 0.1;
      const adjustedProgress = Math.max(0, Math.min(1, (this.animationProgress - delay) / (1 - delay)));
      const finalBarHeight = barHeight * this.easeOutCubic(adjustedProgress);
      const finalBarY = item.value >= 0 ? barY + (barHeight - finalBarHeight) : barY;

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.roundRect(barX, finalBarY, barWidth, finalBarHeight, [4, 4, 0, 0]);
      this.ctx.fill();
    });

    this.ctx.fillStyle = '#6B7280';
    this.ctx.font = '11px system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    data.forEach((item, index) => {
      const x = chartArea.x + index * (barWidth + barGap) + barWidth / 2;
      const y = chartArea.y + chartArea.height + 16;
      this.ctx.fillText(item.date, x, y);
    });

    this.ctx.fillStyle = '#6B7280';
    this.ctx.font = '11px system-ui, sans-serif';
    this.ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = maxValue - (valueRange / 4) * i;
      const y = chartArea.y + (chartArea.height / 4) * i + 4;
      this.ctx.fillText(value.toFixed(0), chartArea.x - 8, y);
    }
  }

  private renderLineChart(): void {
    const chartArea = this.getChartArea();
    const data = this.data;
    
    if (data.length === 0) return;

    const values = data.map(d => d.value);
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, 0);
    const valueRange = maxValue - minValue || 1;

    const getX = (index: number) => {
      if (data.length === 1) return chartArea.x + chartArea.width / 2;
      return chartArea.x + (index / (data.length - 1)) * chartArea.width;
    };

    const getY = (value: number) => {
      return chartArea.y + ((maxValue - value) / valueRange) * chartArea.height;
    };

    this.ctx.strokeStyle = '#E5E7EB';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = chartArea.y + (chartArea.height / 4) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(chartArea.x, y);
      this.ctx.lineTo(chartArea.x + chartArea.width, y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = '#1E40AF';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    const progressPoints = Math.floor(data.length * this.animationProgress);
    const remainder = (data.length * this.animationProgress) % 1;
    
    if (progressPoints > 0 || remainder > 0) {
      this.ctx.beginPath();
      
      for (let i = 0; i < data.length; i++) {
        if (i > progressPoints && remainder === 0) break;
        
        let t: number;
        if (i < progressPoints) {
          t = 1;
        } else {
          t = remainder;
        }
        
        const x = getX(i);
        const y = getY(data[i].value);
        
        if (i === 0 || (i <= progressPoints && t === 1)) {
          if (i === 0) this.ctx.moveTo(x, y);
          else this.ctx.lineTo(x, y);
        }
        
        if (i === progressPoints && remainder > 0 && i < data.length - 1) {
          const nextX = getX(i + 1);
          const nextY = getY(data[i + 1].value);
          const interpX = x + (nextX - x) * t;
          const interpY = y + (nextY - y) * t;
          this.ctx.lineTo(interpX, interpY);
          break;
        }
      }
      
      this.ctx.stroke();
    }

    data.forEach((item, index) => {
      if (index > progressPoints && remainder === 0) return;
      if (index === progressPoints && remainder === 0) return;
      
      const x = getX(index);
      const y = getY(item.value);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 5, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#1E40AF';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 5, 0, Math.PI * 2);
      this.ctx.stroke();
    });

    this.ctx.fillStyle = '#6B7280';
    this.ctx.font = '11px system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    data.forEach((item, index) => {
      const x = getX(index);
      const y = chartArea.y + chartArea.height + 16;
      this.ctx.fillText(item.date, x, y);
    });

    this.ctx.fillStyle = '#6B7280';
    this.ctx.font = '11px system-ui, sans-serif';
    this.ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = maxValue - (valueRange / 4) * i;
      const y = chartArea.y + (chartArea.height / 4) * i + 4;
      this.ctx.fillText(value.toFixed(0), chartArea.x - 8, y);
    }
  }

  private renderTimeline(): void {
    const chartArea = this.getChartArea();
    const data = this.data;
    const categories = this.categories;
    
    if (data.length === 0) return;

    const totalWidth = chartArea.width;
    const pointCount = data.length;
    
    const getX = (index: number) => {
      if (pointCount === 1) return chartArea.x + totalWidth / 2;
      return chartArea.x + 12 + (index / (pointCount - 1)) * (totalWidth - 24);
    };
    
    const lineY = chartArea.y + chartArea.height / 2;

    this.ctx.strokeStyle = '#D1D5DB';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(chartArea.x, lineY);
    this.ctx.lineTo(chartArea.x + chartArea.width * this.animationProgress, lineY);
    this.ctx.stroke();

    data.forEach((item, index) => {
      const delay = index * 0.05;
      const adjustedProgress = Math.max(0, Math.min(1, (this.animationProgress - delay) / (1 - delay)));
      const easedProgress = this.easeOutCubic(adjustedProgress);
      
      if (easedProgress <= 0) return;
      
      const x = getX(index) * easedProgress + chartArea.x * (1 - easedProgress);
      const categoryIndex = categories.indexOf(item.category);
      const color = getCategoryColorHsl(categoryIndex, categories.length);
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, lineY, 6, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, lineY, 3, 0, Math.PI * 2);
      this.ctx.fill();

      if (easedProgress > 0.5) {
        const labelOpacity = (easedProgress - 0.5) * 2;
        this.ctx.globalAlpha = labelOpacity;
        this.ctx.fillStyle = '#374151';
        this.ctx.font = '11px system-ui, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(item.date, x, lineY + 24);
        this.ctx.globalAlpha = 1;
      }
    });

    this.ctx.fillStyle = '#6B7280';
    this.ctx.font = '10px system-ui, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(this.categories[0] || '', chartArea.x, chartArea.y + 12);
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
