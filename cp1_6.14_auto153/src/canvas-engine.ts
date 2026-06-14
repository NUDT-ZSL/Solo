export type ToolType = 'brush' | 'rectangle' | 'circle' | 'text' | 'eraser' | 'sticky-note' | 'select';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  userId?: string;
  timestamp?: number;
  fadeIn?: boolean;
}

export interface BrushElement extends BaseElement {
  type: 'brush';
  points: Point[];
  color: string;
  width: number;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  width: number;
  height: number;
  borderColor: string;
  borderWidth: number;
  fillColor: string;
  fillOpacity: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radiusX: number;
  radiusY: number;
  borderColor: string;
  borderWidth: number;
  fillColor: string;
  fillOpacity: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
}

export interface StickyNoteElement extends BaseElement {
  type: 'sticky-note';
  width: number;
  height: number;
  text: string;
  backgroundColor: string;
}

export type CanvasElement = BrushElement | RectangleElement | CircleElement | TextElement | StickyNoteElement;

export interface CanvasState {
  elements: CanvasElement[];
  viewTransform: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface ToolSettings {
  tool: ToolType;
  brushColor: string;
  brushWidth: number;
  shapeFillOpacity: number;
  fontSize: number;
}

const MAX_HISTORY = 100;

export function generateId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class CanvasEngine {
  private undoStack: CanvasElement[][] = [];
  private redoStack: CanvasElement[][] = [];
  private currentState: CanvasElement[] = [];
  private listeners: Set<() => void> = new Set();

  getElements(): CanvasElement[] {
    return this.currentState;
  }

  setElements(elements: CanvasElement[]): void {
    this.saveToUndo();
    this.currentState = [...elements];
    this.notify();
  }

  addElement(element: CanvasElement, broadcast = true): void {
    if (broadcast) {
      this.saveToUndo();
    }
    this.currentState = [...this.currentState, element];
    this.notify();
  }

  updateElement(id: string, updates: Partial<CanvasElement>): void {
    this.saveToUndo();
    this.currentState = this.currentState.map(el =>
      el.id === id ? { ...el, ...updates } as CanvasElement : el
    );
    this.notify();
  }

  removeElement(id: string): void {
    this.saveToUndo();
    this.currentState = this.currentState.filter(el => el.id !== id);
    this.notify();
  }

  private saveToUndo(): void {
    this.undoStack.push([...this.currentState]);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push([...this.currentState]);
    this.currentState = this.undoStack.pop()!;
    this.notify();
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push([...this.currentState]);
    this.currentState = this.redoStack.pop()!;
    this.notify();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  render(
    ctx: CanvasRenderingContext2D,
    elements: CanvasElement[],
    viewTransform: { scale: number; offsetX: number; offsetY: number },
    canvasWidth: number,
    canvasHeight: number
  ): void {
    ctx.save();
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.drawGrid(ctx, viewTransform, canvasWidth, canvasHeight);

    ctx.translate(viewTransform.offsetX, viewTransform.offsetY);
    ctx.scale(viewTransform.scale, viewTransform.scale);

    elements.forEach(element => {
      this.drawElement(ctx, element);
    });

    ctx.restore();
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    viewTransform: { scale: number; offsetX: number; offsetY: number },
    width: number,
    height: number
  ): void {
    const gridSize = 40 * viewTransform.scale;
    const startX = -((-viewTransform.offsetX) % gridSize);
    const startY = -((-viewTransform.offsetY) % gridSize);

    ctx.strokeStyle = '#e2e8f2';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    for (let y = startY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();
  }

  private drawElement(ctx: CanvasRenderingContext2D, element: CanvasElement): void {
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate((element.rotation || 0) * Math.PI / 180);

    switch (element.type) {
      case 'brush':
        this.drawBrush(ctx, element);
        break;
      case 'rectangle':
        this.drawRectangle(ctx, element);
        break;
      case 'circle':
        this.drawCircle(ctx, element);
        break;
      case 'text':
        this.drawText(ctx, element);
        break;
    }

    ctx.restore();
  }

  private drawBrush(ctx: CanvasRenderingContext2D, element: BrushElement): void {
    if (element.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(element.points[0].x - element.x, element.points[0].y - element.y);
    for (let i = 1; i < element.points.length; i++) {
      ctx.lineTo(element.points[i].x - element.x, element.points[i].y - element.y);
    }
    ctx.stroke();
  }

  private drawRectangle(ctx: CanvasRenderingContext2D, element: RectangleElement): void {
    ctx.beginPath();
    ctx.rect(0, 0, element.width, element.height);

    if (element.fillOpacity > 0) {
      const rgb = this.hexToRgb(element.fillColor);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${element.fillOpacity / 100})`;
      ctx.fill();
    }

    ctx.strokeStyle = element.borderColor;
    ctx.lineWidth = element.borderWidth;
    ctx.stroke();
  }

  private drawCircle(ctx: CanvasRenderingContext2D, element: CircleElement): void {
    ctx.beginPath();
    ctx.ellipse(element.radiusX, element.radiusY, element.radiusX, element.radiusY, 0, 0, Math.PI * 2);

    if (element.fillOpacity > 0) {
      const rgb = this.hexToRgb(element.fillColor);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${element.fillOpacity / 100})`;
      ctx.fill();
    }

    ctx.strokeStyle = element.borderColor;
    ctx.lineWidth = element.borderWidth;
    ctx.stroke();
  }

  private drawText(ctx: CanvasRenderingContext2D, element: TextElement): void {
    ctx.font = `${element.fontSize}px sans-serif`;
    ctx.fillStyle = element.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.text, 0, 0);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 };
  }

  screenToWorld(screenX: number, screenY: number, viewTransform: { scale: number; offsetX: number; offsetY: number }): Point {
    return {
      x: (screenX - viewTransform.offsetX) / viewTransform.scale,
      y: (screenY - viewTransform.offsetY) / viewTransform.scale
    };
  }

  worldToScreen(worldX: number, worldY: number, viewTransform: { scale: number; offsetX: number; offsetY: number }): Point {
    return {
      x: worldX * viewTransform.scale + viewTransform.offsetX,
      y: worldY * viewTransform.scale + viewTransform.offsetY
    };
  }
}
