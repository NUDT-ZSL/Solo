export type WeatherType = 'rain' | 'heat' | 'thunder' | 'sand' | 'ink';

export const WEATHER_COLORS: Record<WeatherType, string> = {
  rain: '#4A90D9',
  heat: '#D94A4A',
  thunder: '#8E44AD',
  sand: '#D4A017',
  ink: '#2C2C2C'
};

export interface InkAnalysis {
  weatherType: WeatherType;
  terrainHeightMap: Float32Array;
  cloudDensityMap: Float32Array;
  dominantColor: string;
  mapWidth: number;
  mapHeight: number;
}

interface InkStroke {
  x: number;
  y: number;
  radius: number;
  color: WeatherType;
  opacity: number;
  birthTime: number;
  duration: number;
}

const MAP_RESOLUTION = 64;

export class InkEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private strokes: InkStroke[] = [];
  private isDrawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private currentColor: WeatherType = 'rain';
  private brushSize: number = 30;
  private animationId: number | null = null;
  private onAnalysisReady: ((analysis: InkAnalysis) => void) | null = null;
  private debounceTimer: number | null = null;
  private baseCanvas: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = canvas.width;
    this.baseCanvas.height = canvas.height;
    const baseCtx = this.baseCanvas.getContext('2d');
    if (!baseCtx) throw new Error('Failed to get base canvas context');
    this.baseCtx = baseCtx;

    this.bindEvents();
    this.startAnimation();
  }

  setColor(color: WeatherType): void {
    this.currentColor = color;
  }

  getColor(): WeatherType {
    return this.currentColor;
  }

  setOnAnalysisReady(callback: (analysis: InkAnalysis) => void): void {
    this.onAnalysisReady = callback;
  }

  clear(): void {
    this.strokes = [];
    this.baseCtx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.triggerAnalysis();
  }

  private bindEvents(): void {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('mouseup', () => this.handleMouseUp());
    canvas.addEventListener('mouseleave', () => this.handleMouseUp());

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchend', () => this.handleMouseUp());
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    this.isDrawing = true;
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.addStroke(pos.x, pos.y);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const pos = this.getCanvasPos(e);

    const dist = Math.sqrt((pos.x - this.lastX) ** 2 + (pos.y - this.lastY) ** 2);
    const steps = Math.max(1, Math.floor(dist / 5));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = this.lastX + (pos.x - this.lastX) * t;
      const y = this.lastY + (pos.y - this.lastY) * t;
      this.addStroke(x, y);
    }

    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  private handleMouseUp(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.triggerAnalysis();
    }
  }

  private addStroke(x: number, y: number): void {
    const sizeVariation = 0.8 + Math.random() * 0.4;
    this.strokes.push({
      x,
      y,
      radius: this.brushSize * sizeVariation,
      color: this.currentColor,
      opacity: 0.8,
      birthTime: performance.now(),
      duration: 1500
    });

    this.drawPermanentInk(x, y, this.brushSize * 0.3);
  }

  private drawPermanentInk(x: number, y: number, radius: number): void {
    const color = WEATHER_COLORS[this.currentColor];
    const gradient = this.baseCtx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, this.hexToRgba(color, 0.6));
    gradient.addColorStop(0.5, this.hexToRgba(color, 0.3));
    gradient.addColorStop(1, this.hexToRgba(color, 0));
    this.baseCtx.fillStyle = gradient;
    this.baseCtx.beginPath();
    this.baseCtx.arc(x, y, radius, 0, Math.PI * 2);
    this.baseCtx.fill();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private startAnimation(): void {
    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private render(): void {
    const now = performance.now();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.drawImage(this.baseCanvas, 0, 0);

    this.strokes = this.strokes.filter(stroke => {
      const age = now - stroke.birthTime;
      if (age > stroke.duration) return false;

      const progress = age / stroke.duration;
      const expandedRadius = stroke.radius * (1 + progress * 0.8);
      const opacity = stroke.opacity * (1 - progress * 0.875);

      const color = WEATHER_COLORS[stroke.color];
      const gradient = this.ctx.createRadialGradient(
        stroke.x, stroke.y, 0,
        stroke.x, stroke.y, expandedRadius
      );
      gradient.addColorStop(0, this.hexToRgba(color, opacity));
      gradient.addColorStop(0.4, this.hexToRgba(color, opacity * 0.6));
      gradient.addColorStop(1, this.hexToRgba(color, 0));

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(stroke.x, stroke.y, expandedRadius, 0, Math.PI * 2);
      this.ctx.fill();

      return true;
    });
  }

  private triggerAnalysis(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      const analysis = this.analyzeInk();
      if (this.onAnalysisReady) {
        this.onAnalysisReady(analysis);
      }
    }, 300);
  }

  private analyzeInk(): InkAnalysis {
    const width = MAP_RESOLUTION;
    const height = MAP_RESOLUTION;
    const terrainHeightMap = new Float32Array(width * height);
    const cloudDensityMap = new Float32Array(width * height);

    const colorWeights: Record<WeatherType, number> = {
      rain: 0,
      heat: 0,
      thunder: 0,
      sand: 0,
      ink: 0
    };

    const imageData = this.baseCtx.getImageData(
      0, 0, this.baseCanvas.width, this.baseCanvas.height
    );
    const data = imageData.data;

    const scaleX = this.baseCanvas.width / width;
    const scaleY = this.baseCanvas.height / height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.floor(x * scaleX + scaleX / 2);
        const srcY = Math.floor(y * scaleY + scaleY / 2);
        const idx = (srcY * this.baseCanvas.width + srcX) * 4;

        const r = data[idx] / 255;
        const g = data[idx + 1] / 255;
        const b = data[idx + 2] / 255;
        const a = data[idx + 3] / 255;

        const brightness = (r + g + b) / 3;
        const density = a * (1 - brightness * 0.5);

        terrainHeightMap[y * width + x] = Math.min(1, density * 1.5);
        cloudDensityMap[y * width + x] = Math.min(1, density * 1.2);

        if (a > 0.1) {
          const colorScore = a;
          if (b > r && b > g) {
            colorWeights.rain += colorScore;
          } else if (r > g && r > b * 1.5) {
            colorWeights.heat += colorScore;
          } else if (r > 0.3 && b > 0.3 && r > g && b > g) {
            colorWeights.thunder += colorScore;
          } else if (r > 0.5 && g > 0.4 && b < 0.5) {
            colorWeights.sand += colorScore;
          } else {
            colorWeights.ink += colorScore;
          }
        }
      }
    }

    for (let i = 0; i < 2; i++) {
      this.blurMap(terrainHeightMap, width, height);
      this.blurMap(cloudDensityMap, width, height);
    }

    let dominantType: WeatherType = 'ink';
    let maxWeight = 0;
    for (const [type, weight] of Object.entries(colorWeights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantType = type as WeatherType;
      }
    }

    return {
      weatherType: dominantType,
      terrainHeightMap,
      cloudDensityMap,
      dominantColor: WEATHER_COLORS[dominantType],
      mapWidth: width,
      mapHeight: height
    };
  }

  private blurMap(map: Float32Array, width: number, height: number): void {
    const temp = new Float32Array(map.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += map[ny * width + nx];
              count++;
            }
          }
        }
        temp[y * width + x] = sum / count;
      }
    }
    for (let i = 0; i < map.length; i++) {
      map[i] = temp[i];
    }
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
