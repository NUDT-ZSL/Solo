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

interface ClearData {
  previousActions: DrawAction[];
}

type DrawAction =
  | { type: 'line'; data: LineData }
  | { type: 'stamp'; data: StampData }
  | { type: 'clear'; data: ClearData };

export interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  actions: DrawAction[];
  redoStack: DrawAction[];
}

const MAX_HISTORY = 20;
const MAX_POINTS_PER_FRAME = 200;
const MIN_POINT_DISTANCE = 2;
const LINE_ANIMATION_DURATION = 150;
const STAMP_ANIMATION_DURATION = 300;
const MAX_LAYERS = 10;

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

function createLayerCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create layer canvas context');
  return { canvas, ctx };
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private layers: Layer[] = [];
  private activeLayerId: string = '';
  private currentLine: LineData | null = null;
  private isDrawing: boolean = false;
  private currentColor: string = '#FF4500';
  private currentSize: number = 5;
  private animationFrameId: number | null = null;
  private pendingPoints: Point[] = [];
  private onChangeCallback: (() => void) | null = null;
  private layerCounter: number = 0;

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
    this.addLayer();
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
  }

  setCanvasSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderBrickBackground();
    for (const layer of this.layers) {
      const oldCanvas = layer.canvas;
      layer.canvas.width = width;
      layer.canvas.height = height;
      layer.ctx.drawImage(oldCanvas, 0, 0);
    }
  }

  setColor(color: string): void {
    this.currentColor = color;
  }

  setBrushSize(size: number): void {
    this.currentSize = Math.max(1, Math.min(50, size));
  }

  getLayers(): LayerInfo[] {
    return this.layers.map(l => ({ id: l.id, name: l.name, visible: l.visible }));
  }

  getActiveLayerId(): string {
    return this.activeLayerId;
  }

  addLayer(): LayerInfo | null {
    if (this.layers.length >= MAX_LAYERS) return null;

    this.layerCounter++;
    const id = `layer_${Date.now()}_${this.layerCounter}`;
    const name = `图层${this.layerCounter}`;
    const { canvas, ctx } = createLayerCanvas(this.canvas.width, this.canvas.height);

    const layer: Layer = {
      id,
      name,
      visible: true,
      canvas,
      ctx,
      actions: [],
      redoStack: [],
    };

    this.layers.push(layer);
    this.activeLayerId = id;
    this.notifyChange();
    return { id, name, visible: true };
  }

  removeLayer(layerId: string): boolean {
    if (this.layers.length <= 1) return false;

    const index = this.layers.findIndex(l => l.id === layerId);
    if (index === -1) return false;

    this.layers.splice(index, 1);

    if (this.activeLayerId === layerId) {
      const newIndex = Math.min(index, this.layers.length - 1);
      this.activeLayerId = this.layers[newIndex].id;
    }

    this.notifyChange();
    return true;
  }

  selectLayer(layerId: string): void {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      this.activeLayerId = layerId;
      this.notifyChange();
    }
  }

  toggleLayerVisibility(layerId: string): void {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      layer.visible = !layer.visible;
      this.notifyChange();
    }
  }

  private getActiveLayer(): Layer | null {
    return this.layers.find(l => l.id === this.activeLayerId) || null;
  }

  startDrawing(x: number, y: number): void {
    const layer = this.getActiveLayer();
    if (!layer || !layer.visible) return;

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

    const layer = this.getActiveLayer();
    if (this.currentLine.points.length > 1 && layer) {
      this.addActionToLayer(layer, { type: 'line', data: this.currentLine });
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

    const layer = this.getActiveLayer();
    if (!layer || !layer.visible) return;

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

    this.addActionToLayer(layer, { type: 'stamp', data: stamp });
  }

  private addActionToLayer(layer: Layer, action: DrawAction): void {
    if (layer.actions.length >= MAX_HISTORY) {
      layer.actions.shift();
    }
    layer.actions.push(action);
    layer.redoStack = [];
    this.notifyChange();
  }

  undo(): boolean {
    const layer = this.getActiveLayer();
    if (!layer || layer.actions.length === 0) return false;

    const action = layer.actions.pop();
    if (action) {
      if (action.type === 'clear') {
        layer.actions.push(...action.data.previousActions);
      }
      layer.redoStack.push(action);
      this.redrawLayer(layer);
      this.notifyChange();
      return true;
    }
    return false;
  }

  redo(): boolean {
    const layer = this.getActiveLayer();
    if (!layer || layer.redoStack.length === 0) return false;

    const action = layer.redoStack.pop();
    if (action) {
      if (action.type === 'clear') {
        const removeCount = action.data.previousActions.length;
        for (let i = 0; i < removeCount; i++) {
          layer.actions.pop();
        }
      }
      layer.actions.push(action);
      this.redrawLayer(layer);
      this.notifyChange();
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    const layer = this.getActiveLayer();
    return layer !== null && layer.actions.length > 0;
  }

  canRedo(): boolean {
    const layer = this.getActiveLayer();
    return layer !== null && layer.redoStack.length > 0;
  }

  isEmpty(): boolean {
    for (const layer of this.layers) {
      if (layer.visible && !this.isLayerEmpty(layer)) {
        return false;
      }
    }
    return true;
  }

  private isLayerEmpty(layer: Layer): boolean {
    if (layer.actions.length === 0) return true;

    let effectiveStartIndex = 0;
    for (let i = layer.actions.length - 1; i >= 0; i--) {
      if (layer.actions[i].type === 'clear') {
        effectiveStartIndex = i + 1;
        break;
      }
    }

    return effectiveStartIndex >= layer.actions.length;
  }

  clearCanvas(): void {
    const layer = this.getActiveLayer();
    if (!layer || this.isLayerEmpty(layer)) return;

    const previousActions = [...layer.actions];
    const clearAction: DrawAction = {
      type: 'clear',
      data: { previousActions },
    };

    if (layer.actions.length >= MAX_HISTORY) {
      layer.actions.shift();
    }
    layer.actions.push(clearAction);
    layer.redoStack = [];
    this.redrawLayer(layer);
    this.notifyChange();
  }

  getCanvasData(): string {
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = this.canvas.width;
    compositeCanvas.height = this.canvas.height;
    const compositeCtx = compositeCanvas.getContext('2d');
    if (!compositeCtx) return this.canvas.toDataURL('image/png');

    compositeCtx.drawImage(this.bgCanvas, 0, 0);
    for (const layer of this.layers) {
      if (layer.visible) {
        compositeCtx.drawImage(layer.canvas, 0, 0);
      }
    }

    return compositeCanvas.toDataURL('image/png');
  }

  getLayerThumbnail(layerId: string): string {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return '';

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 40;
    thumbCanvas.height = 40;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx) return '';

    thumbCtx.fillStyle = '#2C2C2C';
    thumbCtx.fillRect(0, 0, 40, 40);
    thumbCtx.drawImage(layer.canvas, 0, 0, 40, 40);

    return thumbCanvas.toDataURL('image/png');
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.flushPendingPoints();
      this.compositeLayers();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private compositeLayers(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.bgCanvas, 0, 0);

    for (const layer of this.layers) {
      if (layer.visible) {
        this.ctx.drawImage(layer.canvas, 0, 0);
      }
    }
  }

  private redrawLayer(layer: Layer): void {
    const { width, height } = layer.canvas;
    layer.ctx.clearRect(0, 0, width, height);

    let effectiveStartIndex = 0;
    for (let i = layer.actions.length - 1; i >= 0; i--) {
      if (layer.actions[i].type === 'clear') {
        effectiveStartIndex = i + 1;
        break;
      }
    }

    const now = performance.now();
    for (let i = effectiveStartIndex; i < layer.actions.length; i++) {
      const action = layer.actions[i];
      if (action.type === 'line') {
        this.drawLineAction(layer.ctx, action.data, now);
      } else if (action.type === 'stamp') {
        this.drawStampAction(layer.ctx, action.data, now);
      }
    }
  }

  private drawLineAction(ctx: CanvasRenderingContext2D, line: LineData, now: number): void {
    if (line.points.length < 2) return;

    const progress = Math.min((now - line.animationStart) / line.animationDuration, 1);
    const currentOpacity = line.opacity * progress;

    ctx.save();
    ctx.globalAlpha = currentOpacity;
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(line.points[0].x, line.points[0].y);

    for (let i = 1; i < line.points.length - 1; i++) {
      const xc = (line.points[i].x + line.points[i + 1].x) / 2;
      const yc = (line.points[i].y + line.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(line.points[i].x, line.points[i].y, xc, yc);
    }

    const lastIdx = line.points.length - 1;
    ctx.lineTo(line.points[lastIdx].x, line.points[lastIdx].y);
    ctx.stroke();
    ctx.restore();
  }

  private drawStampAction(ctx: CanvasRenderingContext2D, stamp: StampData, now: number): void {
    const progress = Math.min((now - stamp.animationStart) / stamp.animationDuration, 1);
    const scaleProgress = progress < 0.7 ? progress / 0.7 * 1.1 : 1.1 - (progress - 0.7) / 0.3 * 0.1;
    const currentOpacity = stamp.opacity * Math.min(progress * 2, 1);
    const currentScale = stamp.scale * scaleProgress;

    ctx.save();
    ctx.globalAlpha = currentOpacity;
    ctx.fillStyle = `rgb(${stamp.grayscale}, ${stamp.grayscale}, ${stamp.grayscale})`;
    ctx.translate(stamp.x, stamp.y);
    ctx.rotate((stamp.rotation * Math.PI) / 180);
    ctx.scale(currentScale, currentScale);

    const drawer = STAMP_DRAWERS[stamp.type];
    if (drawer) {
      drawer(ctx, 60);
    }

    ctx.restore();
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
