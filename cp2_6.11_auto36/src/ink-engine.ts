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
  edgeMap: Float32Array;
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
  private isDestroyed: boolean = false;

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

    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('mouseleave', this.handleMouseUp);

    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleMouseUp);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);
    this.isDrawing = true;
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.addStroke(pos.x, pos.y);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return;
    const pos = this.getCanvasPos(e);
    this.interpolateStroke(this.lastX, this.lastY, pos.x, pos.y);
    this.lastX = pos.x;
    this.lastY = pos.y;
  };

  private handleMouseUp = (): void => {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.triggerAnalysis();
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
    this.handleMouseDown(fakeEvent);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
    this.handleMouseMove(fakeEvent);
  };

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private interpolateStroke(x0: number, y0: number, x1: number, y1: number): void {
    const dist = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
    const steps = Math.max(1, Math.floor(dist / 5));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.addStroke(x, y);
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
    gradient.addColorStop(0, this.hexToRgba(color, 0.7));
    gradient.addColorStop(0.4, this.hexToRgba(color, 0.4));
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
    const animate = (): void => {
      if (this.isDestroyed) return;
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private render(): void {
    const now = performance.now();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.drawImage(this.baseCanvas, 0, 0);

    const activeStrokes: InkStroke[] = [];
    for (let i = 0; i < this.strokes.length; i++) {
      const stroke = this.strokes[i];
      const age = now - stroke.birthTime;
      if (age > stroke.duration) continue;

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

      activeStrokes.push(stroke);
    }
    this.strokes = activeStrokes;
  }

  private triggerAnalysis(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      requestAnimationFrame(() => {
        const analysis = this.analyzeInk();
        if (this.onAnalysisReady && !this.isDestroyed) {
          this.onAnalysisReady(analysis);
        }
      });
    }, 300);
  }

  private analyzeInk(): InkAnalysis {
    const width = MAP_RESOLUTION;
    const height = MAP_RESOLUTION;
    const terrainHeightMap = new Float32Array(width * height);
    const cloudDensityMap = new Float32Array(width * height);
    const edgeMap = new Float32Array(width * height);
    const densityMap = new Float32Array(width * height);

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

        densityMap[y * width + x] = density;
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

    this.computeEdgeMap(densityMap, edgeMap, width, height);
    this.computeTerrainHeight(densityMap, edgeMap, terrainHeightMap, width, height);

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
      edgeMap,
      dominantColor: WEATHER_COLORS[dominantType],
      mapWidth: width,
      mapHeight: height
    };
  }

  private computeEdgeMap(density: Float32Array, edge: Float32Array, w: number, h: number): void {
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * w + (x + kx);
            const kidx = (ky + 1) * 3 + (kx + 1);
            gx += density[idx] * sobelX[kidx];
            gy += density[idx] * sobelY[kidx];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edge[y * w + x] = Math.min(1, magnitude * 3);
      }
    }
  }

  private computeTerrainHeight(
    density: Float32Array,
    edge: Float32Array,
    height: Float32Array,
    w: number,
    h: number
  ): void {
    for (let i = 0; i < w * h; i++) {
      const baseHeight = density[i] * 1.2;
      const ridgeHeight = edge[i] * 1.5;
      const combined = baseHeight + ridgeHeight * 0.6;
      height[i] = Math.min(1, combined * 1.3);
    }
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
    this.isDestroyed = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleMouseUp);
  }
}
