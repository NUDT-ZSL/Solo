interface Point {
  x: number;
  y: number;
}

interface LineData {
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  animationStart: number;
  animationDuration: number;
}

interface StampData {
  x: number;
  y: number;
  type: string;
  rotation: number;
  opacity: number;
  grayscale: number;
  scale: number;
  animationStart: number;
  animationDuration: number;
}

type DrawAction = 
  | { type: 'line'; data: LineData }
  | { type: 'stamp'; data: StampData };

const MAX_HISTORY = 20;
const MAX_POINTS_PER_FRAME = 200;
const MIN_POINT_DISTANCE = 2;
const LINE_ANIMATION_DURATION = 150;
const STAMP_ANIMATION_DURATION = 300;

function drawStar(ctx: CanvasRenderingContext2D, size: number): void {
  const spikes = 5;
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.4;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  
  ctx.beginPath();
  ctx.moveTo(0, -outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
    rot += step;
  }
  
  ctx.lineTo(0, -outerRadius);
  ctx.closePath();
  ctx.fill();
}

function drawArrow(ctx: CanvasRenderingContext2D, size: number): void {
  const half = size / 2;
  const headLen = size * 0.4;
  
  ctx.beginPath();
  ctx.moveTo(-half, 0);
  ctx.lineTo(half - headLen, 0);
  ctx.moveTo(half - headLen, -headLen * 0.6);
  ctx.lineTo(half, 0);
  ctx.lineTo(half - headLen, headLen * 0.6);
  ctx.lineWidth = size * 0.15;
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawHandprint(ctx: CanvasRenderingContext2D, size: number): void {
  const palmWidth = size * 0.4;
  const palmHeight = size * 0.35;
  const fingerWidth = size * 0.12;
  const fingerHeight = size * 0.35;
  
  ctx.beginPath();
  ctx.roundRect(-palmWidth / 2, -palmHeight / 2, palmWidth, palmHeight, palmWidth * 0.2);
  ctx.fill();
  
  const fingerPositions = [-palmWidth * 0.35, -palmWidth * 0.1, palmWidth * 0.1, palmWidth * 0.35];
  const fingerHeights = [fingerHeight * 0.8, fingerHeight, fingerHeight * 0.95, fingerHeight * 0.85];
  
  fingerPositions.forEach((x, i) => {
    ctx.beginPath();
    ctx.roundRect(x - fingerWidth / 2, -palmHeight / 2 - fingerHeights[i], fingerWidth, fingerHeights[i], fingerWidth * 0.4);
    ctx.fill();
  });
  
  ctx.beginPath();
  ctx.roundRect(-palmWidth * 0.6, -palmHeight * 0.1, fingerWidth * 1.1, palmHeight * 0.8, fingerWidth * 0.4);
  ctx.fill();
}

function drawTag1(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.font = `bold ${size * 0.8}px Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAG', 0, 0);
}

function drawTag2(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.font = `bold italic ${size * 0.7}px Comic Sans MS, cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SOUL', 0, 0);
}

function drawTag3(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.font = `bold ${size * 0.6}px Courier New, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RUST', 0, 0);
}

function drawTag4(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.font = `bold ${size * 0.7}px Arial Black, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CREW', 0, 0);
}

function drawTag5(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.font = `bold italic ${size * 0.6}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VIBE', 0, 0);
}

const STAMP_DRAWERS: Record<string, (ctx: CanvasRenderingContext2D, size: number) => void> = {
  star: drawStar,
  arrow: drawArrow,
  handprint: drawHandprint,
  tag1: drawTag1,
  tag2: drawTag2,
  tag3: drawTag3,
  tag4: drawTag4,
  tag5: drawTag5,
};

export const STAMP_TYPES = [
  { id: 'star', name: '星星' },
  { id: 'arrow', name: '箭头' },
  { id: 'handprint', name: '手印' },
  { id: 'tag1', name: 'TAG' },
  { id: 'tag2', name: 'SOUL' },
  { id: 'tag3', name: 'RUST' },
  { id: 'tag4', name: 'CREW' },
  { id: 'tag5', name: 'VIBE' },
];

export const COLOR_PALETTE = [
  { color: '#FF4500', name: '橙红' },
  { color: '#FFD700', name: '金色' },
  { color: '#00FF7F', name: '春绿' },
  { color: '#00BFFF', name: '深天蓝' },
  { color: '#FF69B4', name: '热粉' },
  { color: '#8A2BE2', name: '蓝紫' },
  { color: '#000000', name: '黑色' },
  { color: '#FFFFFF', name: '白色' },
];

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private history: DrawAction[] = [];
  private redoStack: DrawAction[] = [];
  private currentLine: LineData | null = null;
  private isDrawing: boolean = false;
  private currentColor: string = '#FF4500';
  private currentSize: number = 5;
  private animationFrameId: number | null = null;
  private pendingPoints: Point[] = [];
  private onChangeCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.bgCanvas = document.createElement('canvas');
    const bgCtx = this.bgCanvas.getContext('2d');
    if (!bgCtx) throw new Error('Failed to get background canvas context');
    this.bgCtx = bgCtx;

    this.renderBrickBackground();
    this.startAnimationLoop();
  }

  setOnChangeCallback(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  private renderBrickBackground(): void {
    const { width, height } = this.canvas;
    this.bgCanvas.width = width;
    this.bgCanvas.height = height;

    this.bgCtx.fillStyle = '#8B4513';
    this.bgCtx.fillRect(0, 0, width, height);

    const brickWidth = 80;
    const brickHeight = 40;
    const mortarColor = '#654321';
    const brickColors = ['#8B4513', '#A0522D'];

    for (let y = 0; y < height; y += brickHeight) {
      const rowOffset = ((y / brickHeight) % 2) * (brickWidth / 2);
      for (let x = -brickWidth; x < width + brickWidth; x += brickWidth) {
        const brickX = x + rowOffset;
        const colorIndex = Math.floor((x + y) / brickWidth) % 2;
        
        this.bgCtx.fillStyle = brickColors[colorIndex];
        this.bgCtx.fillRect(brickX, y, brickWidth - 1, brickHeight - 1);
        
        this.bgCtx.strokeStyle = mortarColor;
        this.bgCtx.lineWidth = 1;
        this.bgCtx.strokeRect(brickX, y, brickWidth, brickHeight);
      }
    }

    this.redraw();
  }

  setCanvasSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderBrickBackground();
  }

  setColor(color: string): void {
    this.currentColor = color;
  }

  setBrushSize(size: number): void {
    this.currentSize = Math.max(1, Math.min(50, size));
  }

  startDrawing(x: number, y: number): void {
    this.isDrawing = true;
    this.currentLine = {
      points: [{ x, y }],
      color: this.currentColor,
      size: this.currentSize,
      opacity: 1,
      animationStart: performance.now(),
      animationDuration: LINE_ANIMATION_DURATION,
    };
    this.pendingPoints = [];
  }

  drawLine(x: number, y: number): void {
    if (!this.isDrawing || !this.currentLine) return;

    const lastPoint = this.currentLine.points[this.currentLine.points.length - 1];
    const distance = Math.hypot(x - lastPoint.x, y - lastPoint.y);
    
    if (distance >= MIN_POINT_DISTANCE) {
      this.pendingPoints.push({ x, y });
    }
  }

  endDrawing(): void {
    if (!this.isDrawing || !this.currentLine) return;
    
    this.flushPendingPoints();
    
    if (this.currentLine.points.length > 1) {
      this.addToHistory({ type: 'line', data: this.currentLine });
    }
    
    this.isDrawing = false;
    this.currentLine = null;
    this.pendingPoints = [];
  }

  private flushPendingPoints(): void {
    if (!this.currentLine || this.pendingPoints.length === 0) return;
    
    const pointsToAdd = this.pendingPoints.slice(0, MAX_POINTS_PER_FRAME);
    this.currentLine.points.push(...pointsToAdd);
    this.pendingPoints = this.pendingPoints.slice(MAX_POINTS_PER_FRAME);
  }

  addStamp(x: number, y: number, stampType: string): void {
    if (!STAMP_DRAWERS[stampType]) return;

    const grayValue = Math.floor(Math.random() * 100) + 100;
    const stamp: StampData = {
      x,
      y,
      type: stampType,
      rotation: (Math.random() - 0.5) * 60,
      opacity: Math.random() * 0.3 + 0.5,
      grayscale: grayValue,
      scale: 1,
      animationStart: performance.now(),
      animationDuration: STAMP_ANIMATION_DURATION,
    };

    this.addToHistory({ type: 'stamp', data: stamp });
  }

  private addToHistory(action: DrawAction): void {
    if (this.history.length >= MAX_HISTORY) {
      this.history.shift();
    }
    this.history.push(action);
    this.redoStack = [];
    this.notifyChange();
  }

  undo(): boolean {
    if (this.history.length === 0) return false;
    
    const action = this.history.pop();
    if (action) {
      this.redoStack.push(action);
      this.redraw();
      this.notifyChange();
      return true;
    }
    return false;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    
    const action = this.redoStack.pop();
    if (action) {
      this.history.push(action);
      this.redraw();
      this.notifyChange();
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  isEmpty(): boolean {
    return this.history.length === 0;
  }

  clearCanvas(): void {
    this.history = [];
    this.redoStack = [];
    this.redraw();
    this.notifyChange();
  }

  getCanvasData(): string {
    return this.canvas.toDataURL('image/png');
  }

  async loadImage(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
        this.history = [];
        this.redoStack = [];
        this.notifyChange();
        resolve();
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.flushPendingPoints();
      this.redraw();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private redraw(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.bgCanvas, 0, 0);

    const now = performance.now();

    for (const action of this.history) {
      if (action.type === 'line') {
        this.drawLineAction(action.data, now);
      } else if (action.type === 'stamp') {
        this.drawStampAction(action.data, now);
      }
    }

    if (this.currentLine) {
      this.drawLineAction(this.currentLine, now);
    }
  }

  private drawLineAction(line: LineData, now: number): void {
    if (line.points.length < 2) return;

    const progress = Math.min((now - line.animationStart) / line.animationDuration, 1);
    const currentOpacity = line.opacity * progress;

    this.ctx.save();
    this.ctx.globalAlpha = currentOpacity;
    this.ctx.strokeStyle = line.color;
    this.ctx.lineWidth = line.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(line.points[0].x, line.points[0].y);

    for (let i = 1; i < line.points.length - 1; i++) {
      const xc = (line.points[i].x + line.points[i + 1].x) / 2;
      const yc = (line.points[i].y + line.points[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(line.points[i].x, line.points[i].y, xc, yc);
    }

    const lastIdx = line.points.length - 1;
    this.ctx.lineTo(line.points[lastIdx].x, line.points[lastIdx].y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawStampAction(stamp: StampData, now: number): void {
    const progress = Math.min((now - stamp.animationStart) / stamp.animationDuration, 1);
    const scaleProgress = progress < 0.7 ? progress / 0.7 * 1.1 : 1.1 - (progress - 0.7) / 0.3 * 0.1;
    const currentOpacity = stamp.opacity * Math.min(progress * 2, 1);
    const currentScale = stamp.scale * scaleProgress;

    this.ctx.save();
    this.ctx.globalAlpha = currentOpacity;
    this.ctx.fillStyle = `rgb(${stamp.grayscale}, ${stamp.grayscale}, ${stamp.grayscale})`;
    this.ctx.translate(stamp.x, stamp.y);
    this.ctx.rotate((stamp.rotation * Math.PI) / 180);
    this.ctx.scale(currentScale, currentScale);

    const drawer = STAMP_DRAWERS[stamp.type];
    if (drawer) {
      drawer(this.ctx, 60);
    }

    this.ctx.restore();
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
