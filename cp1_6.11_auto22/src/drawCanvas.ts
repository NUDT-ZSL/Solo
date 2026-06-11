export interface StrokePoint {
  x: number;
  y: number;
  color: string;
  width: number;
  curvature: number;
  brightness: number;
}

export interface Stroke {
  id: number;
  points: StrokePoint[];
  color: string;
  width: number;
  timestamp: number;
}

interface DrawCanvasOptions {
  canvasId: string;
  colorPaletteId: string;
  brushWidthId: string;
  brushWidthValueId: string;
  customCursorId: string;
  colorPreviewId: string;
  onSamplingComplete: (strokes: Stroke[]) => void;
}

const COLORS = [
  '#FF3366',
  '#FF9933',
  '#FFD700',
  '#33CC66',
  '#3399FF',
  '#9966FF',
  '#FFFFFF'
];

const SAMPLING_INTERVAL = 4;
const SAMPLING_DELAY = 2000;

export class DrawCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private colorPalette: HTMLElement;
  private brushWidth: HTMLInputElement;
  private brushWidthValue: HTMLElement;
  private customCursor: HTMLElement;
  private colorPreview: HTMLElement;
  private onSamplingComplete: (strokes: Stroke[]) => void;

  private selectedColor = '#FF3366';
  private selectedWidth = 3;
  private isDrawing = false;
  private currentStroke: StrokePoint[] = [];
  private strokes: Stroke[] = [];
  private strokeIdCounter = 0;
  private samplingTimer: number | null = null;
  private trailPoints: { x: number; y: number; alpha: number }[] = [];
  private animationFrameId: number | null = null;
  private canvasRect: DOMRect | null = null;
  private scaleX = 1;
  private scaleY = 1;

  constructor(options: DrawCanvasOptions) {
    this.canvas = document.getElementById(options.canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.colorPalette = document.getElementById(options.colorPaletteId)!;
    this.brushWidth = document.getElementById(options.brushWidthId) as HTMLInputElement;
    this.brushWidthValue = document.getElementById(options.brushWidthValueId)!;
    this.customCursor = document.getElementById(options.customCursorId)!;
    this.colorPreview = document.getElementById(options.colorPreviewId)!;
    this.onSamplingComplete = options.onSamplingComplete;

    this.init();
  }

  private init(): void {
    this.setupCanvas();
    this.setupColorPalette();
    this.setupBrushWidth();
    this.setupEventListeners();
    this.setupCustomCursor();
    this.startAnimationLoop();
  }

  private setupCanvas(): void {
    const wrapper = this.canvas.parentElement!;
    const rect = wrapper.getBoundingClientRect();
    
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    this.canvasRect = this.canvas.getBoundingClientRect();
    this.scaleX = this.canvas.width / this.canvasRect.width / window.devicePixelRatio;
    this.scaleY = this.canvas.height / this.canvasRect.height / window.devicePixelRatio;

    this.ctx.fillStyle = '#0B0B1A';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private setupColorPalette(): void {
    COLORS.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (index === 0 ? ' selected' : '');
      swatch.style.background = color;
      swatch.style.color = color;
      swatch.dataset.color = color;
      swatch.title = color;
      
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        this.selectedColor = color;
        this.updateSliderColor();
        this.colorPreview.style.background = color;
        this.colorPreview.style.color = color;
      });
      
      this.colorPalette.appendChild(swatch);
    });

    this.colorPreview.style.background = this.selectedColor;
    this.colorPreview.style.color = this.selectedColor;
  }

  private setupBrushWidth(): void {
    this.brushWidth.addEventListener('input', () => {
      this.selectedWidth = parseInt(this.brushWidth.value);
      this.brushWidthValue.textContent = this.selectedWidth + 'px';
    });
    this.updateSliderColor();
  }

  private updateSliderColor(): void {
    this.brushWidth.style.setProperty('--slider-color', this.selectedColor);
    const thumb = document.querySelector('.slider::-webkit-slider-thumb') as HTMLElement;
    if (thumb) {
      thumb.style.background = this.selectedColor;
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    this.canvas.addEventListener('mouseout', this.handleMouseOut.bind(this));

    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.redrawAllStrokes();
    });
  }

  private setupCustomCursor(): void {
    document.addEventListener('mousemove', (e) => {
      this.customCursor.style.left = e.clientX + 'px';
      this.customCursor.style.top = e.clientY + 'px';
      this.colorPreview.style.left = e.clientX + 'px';
      this.colorPreview.style.top = e.clientY + 'px';
    });
  }

  private handleMouseEnter(_e: MouseEvent): void {
    this.customCursor.style.display = 'block';
    this.colorPreview.style.display = 'block';
  }

  private handleMouseOut(e: MouseEvent): void {
    if (!this.canvas.contains(e.relatedTarget as Node)) {
      this.customCursor.style.display = 'none';
      this.colorPreview.style.display = 'none';
    }
  }

  private getCanvasCoordinates(e: MouseEvent): { x: number; y: number } {
    if (!this.canvasRect) {
      this.canvasRect = this.canvas.getBoundingClientRect();
    }
    return {
      x: (e.clientX - this.canvasRect.left) * this.scaleX,
      y: (e.clientY - this.canvasRect.top) * this.scaleY
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoordinates(e);
    this.isDrawing = true;
    this.currentStroke = [];
    this.trailPoints = [];
    this.cancelSampling();
    
    const point = this.createStrokePoint(x, y);
    this.currentStroke.push(point);
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.selectedWidth / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.selectedColor;
    this.ctx.fill();
  }

  private handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoordinates(e);
    
    if (this.isDrawing) {
      const lastPoint = this.currentStroke[this.currentStroke.length - 1];
      const distance = Math.sqrt(
        Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2)
      );
      
      if (distance > 0.5) {
        const point = this.createStrokePoint(x, y);
        this.currentStroke.push(point);
        this.trailPoints.push({ x, y, alpha: 1 });
        
        this.drawLineSegment(lastPoint, point);
      }
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (this.isDrawing && this.currentStroke.length > 1) {
      const stroke: Stroke = {
        id: this.strokeIdCounter++,
        points: [...this.currentStroke],
        color: this.selectedColor,
        width: this.selectedWidth,
        timestamp: Date.now()
      };
      this.strokes.push(stroke);
      this.scheduleSampling();
    }
    
    this.isDrawing = false;
    this.currentStroke = [];
  }

  private createStrokePoint(x: number, y: number): StrokePoint {
    const brightness = this.calculateBrightness(this.selectedColor);
    return {
      x,
      y,
      color: this.selectedColor,
      width: this.selectedWidth,
      curvature: 0,
      brightness
    };
  }

  private calculateBrightness(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  private drawLineSegment(p1: StrokePoint, p2: StrokePoint): void {
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.strokeStyle = p1.color;
    this.ctx.lineWidth = p1.width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.strokeStyle = p1.color + '80';
    this.ctx.lineWidth = p1.width + 4;
    this.ctx.stroke();
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.updateTrail();
      this.drawTrail();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private updateTrail(): void {
    const fadeSpeed = 1 / (0.3 * 60);
    this.trailPoints = this.trailPoints
      .map(p => ({ ...p, alpha: p.alpha - fadeSpeed }))
      .filter(p => p.alpha > 0);
    
    if (this.trailPoints.length > 15) {
      this.trailPoints = this.trailPoints.slice(-15);
    }
  }

  private drawTrail(): void {
    if (this.trailPoints.length < 2) return;

    for (let i = 1; i < this.trailPoints.length; i++) {
      const p1 = this.trailPoints[i - 1];
      const p2 = this.trailPoints[i];
      const alpha = Math.min(p1.alpha, p2.alpha);
      
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.strokeStyle = this.selectedColor + Math.floor(alpha * 128).toString(16).padStart(2, '0');
      this.ctx.lineWidth = this.selectedWidth * alpha;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }
  }

  private scheduleSampling(): void {
    this.cancelSampling();
    this.samplingTimer = window.setTimeout(() => {
      this.performSampling();
    }, SAMPLING_DELAY);
  }

  private cancelSampling(): void {
    if (this.samplingTimer !== null) {
      clearTimeout(this.samplingTimer);
      this.samplingTimer = null;
    }
  }

  private performSampling(): void {
    const processedStrokes: Stroke[] = [];
    
    for (const stroke of this.strokes) {
      const sampledPoints = this.sampleStrokePoints(stroke.points);
      const pointsWithCurvature = this.calculateCurvature(sampledPoints);
      
      processedStrokes.push({
        ...stroke,
        points: pointsWithCurvature
      });
    }
    
    this.onSamplingComplete(processedStrokes);
  }

  private sampleStrokePoints(points: StrokePoint[]): StrokePoint[] {
    if (points.length < 2) return points;

    const sampled: StrokePoint[] = [];
    let accumulatedDistance = 0;
    
    sampled.push({ ...points[0] });
    
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const distance = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
      
      accumulatedDistance += distance;
      
      while (accumulatedDistance >= SAMPLING_INTERVAL) {
        const t = (accumulatedDistance - SAMPLING_INTERVAL) / distance;
        const x = p2.x - t * (p2.x - p1.x);
        const y = p2.y - t * (p2.y - p1.y);
        
        sampled.push({
          x,
          y,
          color: p2.color,
          width: p2.width,
          curvature: 0,
          brightness: p2.brightness
        });
        
        accumulatedDistance -= SAMPLING_INTERVAL;
      }
    }
    
    return sampled;
  }

  private calculateCurvature(points: StrokePoint[]): StrokePoint[] {
    if (points.length < 3) {
      return points.map(p => ({ ...p, curvature: 0 }));
    }
    
    const result: StrokePoint[] = [];
    
    for (let i = 0; i < points.length; i++) {
      const prevIdx = Math.max(0, i - 2);
      const nextIdx = Math.min(points.length - 1, i + 2);
      
      const p0 = points[prevIdx];
      const p1 = points[i];
      const p2 = points[nextIdx];
      
      const curvature = this.computeCurvature(p0, p1, p2);
      
      result.push({
        ...p1,
        curvature
      });
    }
    
    return result;
  }

  private computeCurvature(p0: StrokePoint, p1: StrokePoint, p2: StrokePoint): number {
    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;
    
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    
    if (len1 < 0.001 || len2 < 0.001) return 0;
    
    const ux1 = dx1 / len1;
    const uy1 = dy1 / len1;
    const ux2 = dx2 / len2;
    const uy2 = dy2 / len2;
    
    const cross = ux1 * uy2 - uy1 * ux2;
    const dot = ux1 * ux2 + uy1 * uy2;
    
    const angle = Math.atan2(Math.abs(cross), dot);
    
    const avgLen = (len1 + len2) / 2;
    const curvature = angle / (avgLen + 0.001);
    
    return Math.min(curvature, 2);
  }

  private redrawAllStrokes(): void {
    this.ctx.fillStyle = '#0B0B1A';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const stroke of this.strokes) {
      if (stroke.points.length < 2) continue;
      
      this.ctx.beginPath();
      this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.width;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
    }
  }

  public clear(): void {
    this.cancelSampling();
    this.strokes = [];
    this.currentStroke = [];
    this.trailPoints = [];
    this.strokeIdCounter = 0;
    
    this.ctx.fillStyle = '#0B0B1A';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public getStrokes(): Stroke[] {
    return this.strokes;
  }

  public destroy(): void {
    this.cancelSampling();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
