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
  version?: number;
  fadeIn?: boolean;
  fadeInProgress?: number;
  opacity?: number;
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

export interface CanvasSnapshot {
  elements: CanvasElement[];
  version: number;
  timestamp: number;
}

export interface TransformMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ToolSettings {
  tool: ToolType;
  brushColor: string;
  brushWidth: number;
  shapeFillOpacity: number;
  fontSize: number;
}

export interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_HISTORY = 100;
const FADE_DURATION = 300;
const CROSSFADE_DURATION = 200;

export function generateId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createIdentityMatrix(): TransformMatrix {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

export function multiplyMatrix(m1: TransformMatrix, m2: TransformMatrix): TransformMatrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f
  };
}

export function translateMatrix(tx: number, ty: number): TransformMatrix {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

export function scaleMatrix(sx: number, sy: number): TransformMatrix {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

export function transformPoint(matrix: TransformMatrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  };
}

export function inverseTransform(matrix: TransformMatrix): TransformMatrix {
  const det = matrix.a * matrix.d - matrix.b * matrix.c;
  if (det === 0) return createIdentityMatrix();
  return {
    a: matrix.d / det,
    b: -matrix.b / det,
    c: -matrix.c / det,
    d: matrix.a / det,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / det,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / det
  };
}

export function createTransformFromView(view: ViewTransform): TransformMatrix {
  return multiplyMatrix(
    translateMatrix(view.offsetX, view.offsetY),
    scaleMatrix(view.scale, view.scale)
  );
}

export class CanvasEngine {
  private undoStack: CanvasSnapshot[] = [];
  private redoStack: CanvasSnapshot[] = [];
  private currentSnapshot: CanvasSnapshot;
  private versionCounter = 0;
  private listeners: Set<() => void> = new Set();

  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private offscreenSize = { width: 0, height: 0 };

  private dirtyRect: DirtyRect | null = null;
  private needsFullRedraw = true;

  private crossfadeState: {
    active: boolean;
    fromElements: CanvasElement[];
    toElements: CanvasElement[];
    progress: number;
    startTime: number;
  } | null = null;

  private fadeInElements: Map<string, { startTime: number; duration: number }> = new Map();

  private rafId: number | null = null;
  private animationListeners: Set<() => void> = new Set();

  constructor() {
    this.currentSnapshot = {
      elements: [],
      version: 0,
      timestamp: Date.now()
    };
    this.tryInitOffscreen();
  }

  private tryInitOffscreen(): void {
    if (typeof document !== 'undefined') {
      try {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
      } catch (e) {
        console.warn('Offscreen canvas not available');
      }
    }
  }

  private ensureOffscreenSize(width: number, height: number): void {
    if (!this.offscreenCanvas || !this.offscreenCtx) return;
    if (this.offscreenSize.width !== width || this.offscreenSize.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
      this.offscreenSize = { width, height };
      this.needsFullRedraw = true;
    }
  }

  getElements(): CanvasElement[] {
    return this.currentSnapshot.elements;
  }

  getSnapshot(): CanvasSnapshot {
    return { ...this.currentSnapshot, elements: [...this.currentSnapshot.elements] };
  }

  getVersion(): number {
    return this.currentSnapshot.version;
  }

  private saveToUndo(): void {
    const snapshot: CanvasSnapshot = {
      elements: [...this.currentSnapshot.elements],
      version: this.currentSnapshot.version,
      timestamp: Date.now()
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  setElements(elements: CanvasElement[], withCrossfade = false): void {
    const previous = [...this.currentSnapshot.elements];

    if (withCrossfade && previous.length > 0) {
      this.startCrossfade(previous, elements);
    }

    this.currentSnapshot = {
      elements: [...elements],
      version: ++this.versionCounter,
      timestamp: Date.now()
    };
    this.markDirtyFull();
    this.notify();
  }

  addElement(element: CanvasElement, saveHistory = true): void {
    if (saveHistory) {
      this.saveToUndo();
    }
    const newElement = { ...element, version: ++this.versionCounter } as CanvasElement;
    this.currentSnapshot.elements = [...this.currentSnapshot.elements, newElement];
    this.currentSnapshot.version = this.versionCounter;
    this.currentSnapshot.timestamp = Date.now();

    if (element.fadeIn) {
      this.fadeInElements.set(element.id, {
        startTime: performance.now(),
        duration: FADE_DURATION
      });
      this.startAnimationLoop();
    }

    this.markDirtyElement(element);
    this.notify();
  }

  updateElement(id: string, updates: Partial<CanvasElement>, saveHistory = true): void {
    if (saveHistory) {
      this.saveToUndo();
    }
    const idx = this.currentSnapshot.elements.findIndex(el => el.id === id);
    if (idx === -1) return;

    const oldEl = this.currentSnapshot.elements[idx];
    const newEl = { ...oldEl, ...updates, version: ++this.versionCounter } as CanvasElement;

    this.currentSnapshot.elements = [
      ...this.currentSnapshot.elements.slice(0, idx),
      newEl,
      ...this.currentSnapshot.elements.slice(idx + 1)
    ];
    this.currentSnapshot.version = this.versionCounter;
    this.currentSnapshot.timestamp = Date.now();

    const oldRect = this.getElementBounds(oldEl);
    const newRect = this.getElementBounds(newEl);
    this.markDirtyRect(this.unionRects(oldRect, newRect));
    this.notify();
  }

  removeElement(id: string, saveHistory = true): boolean {
    const idx = this.currentSnapshot.elements.findIndex(el => el.id === id);
    if (idx === -1) return false;

    if (saveHistory) {
      this.saveToUndo();
    }

    const element = this.currentSnapshot.elements[idx];
    this.markDirtyElement(element);

    this.currentSnapshot.elements = this.currentSnapshot.elements.filter(el => el.id !== id);
    this.currentSnapshot.version = ++this.versionCounter;
    this.currentSnapshot.timestamp = Date.now();

    this.fadeInElements.delete(id);
    this.notify();
    return true;
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;

    const current = {
      elements: [...this.currentSnapshot.elements],
      version: this.currentSnapshot.version,
      timestamp: this.currentSnapshot.timestamp
    };
    this.redoStack.push(current);

    const prevSnapshot = this.undoStack.pop()!;
    this.startCrossfade(this.currentSnapshot.elements, prevSnapshot.elements);

    this.currentSnapshot = {
      ...prevSnapshot,
      version: ++this.versionCounter
    };
    this.markDirtyFull();
    this.notify();
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    const current = {
      elements: [...this.currentSnapshot.elements],
      version: this.currentSnapshot.version,
      timestamp: this.currentSnapshot.timestamp
    };
    this.undoStack.push(current);

    const nextSnapshot = this.redoStack.pop()!;
    this.startCrossfade(this.currentSnapshot.elements, nextSnapshot.elements);

    this.currentSnapshot = {
      ...nextSnapshot,
      version: ++this.versionCounter
    };
    this.markDirtyFull();
    this.notify();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private startCrossfade(from: CanvasElement[], to: CanvasElement[]): void {
    this.crossfadeState = {
      active: true,
      fromElements: [...from],
      toElements: [...to],
      progress: 0,
      startTime: performance.now()
    };
    this.startAnimationLoop();
    this.markDirtyFull();
  }

  private updateCrossfade(now: number): boolean {
    if (!this.crossfadeState || !this.crossfadeState.active) return false;

    const elapsed = now - this.crossfadeState.startTime;
    const progress = Math.min(1, elapsed / CROSSFADE_DURATION);
    this.crossfadeState.progress = progress;

    if (progress >= 1) {
      this.crossfadeState.active = false;
      this.crossfadeState = null;
      return false;
    }
    return true;
  }

  getCrossfadeProgress(): number {
    return this.crossfadeState?.progress || 1;
  }

  isCrossfading(): boolean {
    return this.crossfadeState?.active || false;
  }

  getCrossfadeState() {
    return this.crossfadeState;
  }

  private startAnimationLoop(): void {
    if (this.rafId !== null) return;
    const tick = () => {
      const now = performance.now();
      let needsRender = false;

      if (this.crossfadeState?.active) {
        needsRender = this.updateCrossfade(now) || needsRender;
      }

      if (this.fadeInElements.size > 0) {
        needsRender = this.updateFadeIn(now) || needsRender;
      }

      if (needsRender) {
        this.markDirtyFull();
        this.animationListeners.forEach(fn => fn());
      }

      if (this.crossfadeState?.active || this.fadeInElements.size > 0) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private updateFadeIn(now: number): boolean {
    let changed = false;
    const toRemove: string[] = [];

    for (const [id, fadeInfo] of this.fadeInElements) {
      const elapsed = now - fadeInfo.startTime;
      if (elapsed >= fadeInfo.duration) {
        toRemove.push(id);
        const idx = this.currentSnapshot.elements.findIndex(e => e.id === id);
        if (idx !== -1) {
          this.currentSnapshot.elements[idx] = {
            ...this.currentSnapshot.elements[idx],
            fadeIn: false,
            fadeInProgress: 1,
            opacity: 1
          } as CanvasElement;
          changed = true;
        }
      } else {
        const progress = elapsed / fadeInfo.duration;
        const idx = this.currentSnapshot.elements.findIndex(e => e.id === id);
        if (idx !== -1) {
          this.currentSnapshot.elements[idx] = {
            ...this.currentSnapshot.elements[idx],
            fadeInProgress: progress,
            opacity: progress
          } as CanvasElement;
          changed = true;
        }
      }
    }

    toRemove.forEach(id => this.fadeInElements.delete(id));
    return changed;
  }

  subscribeAnimation(listener: () => void): () => void {
    this.animationListeners.add(listener);
    return () => this.animationListeners.delete(listener);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  private markDirtyFull(): void {
    this.needsFullRedraw = true;
    this.dirtyRect = null;
  }

  private markDirtyElement(element: CanvasElement): void {
    const bounds = this.getElementBounds(element);
    const padding = 20;
    const rect: DirtyRect = {
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2
    };
    this.markDirtyRect(rect);
  }

  private markDirtyRect(rect: DirtyRect): void {
    if (this.needsFullRedraw) return;
    if (!this.dirtyRect) {
      this.dirtyRect = { ...rect };
    } else {
      this.dirtyRect = this.unionRects(this.dirtyRect, rect);
    }
  }

  private unionRects(r1: DirtyRect, r2: DirtyRect): DirtyRect {
    const x = Math.min(r1.x, r2.x);
    const y = Math.min(r1.y, r2.y);
    const right = Math.max(r1.x + r1.width, r2.x + r2.width);
    const bottom = Math.max(r1.y + r1.height, r2.y + r2.height);
    return { x, y, width: right - x, height: bottom - y };
  }

  private getElementBounds(element: CanvasElement): DirtyRect {
    switch (element.type) {
      case 'brush': {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of (element as BrushElement).points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        const w = (element as BrushElement).width;
        return { x: minX - w, y: minY - w, width: maxX - minX + w * 2, height: maxY - minY + w * 2 };
      }
      case 'rectangle':
        return { x: element.x, y: element.y, width: element.width, height: element.height };
      case 'circle':
        return {
          x: element.x - element.radiusX - element.borderWidth,
          y: element.y - element.radiusY - element.borderWidth,
          width: element.radiusX * 2 + element.borderWidth * 2,
          height: element.radiusY * 2 + element.borderWidth * 2
        };
      case 'text':
        return {
          x: element.x - element.fontSize * 5,
          y: element.y - element.fontSize,
          width: element.fontSize * 10,
          height: element.fontSize * 2
        };
      case 'sticky-note':
        return { x: element.x - element.width / 2, y: element.y - element.height / 2, width: element.width, height: element.height };
      default:
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    viewTransform: ViewTransform,
    canvasWidth: number,
    canvasHeight: number,
    useDirtyRect = true
  ): void {
    const dpr = window.devicePixelRatio || 1;

    this.ensureOffscreenSize(canvasWidth, canvasHeight);

    const targetCtx = this.offscreenCtx && this.offscreenCanvas ? this.offscreenCtx : ctx;
    const useOffscreen = this.offscreenCtx !== null;

    targetCtx.save();

    if (useOffscreen) {
      targetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (this.needsFullRedraw || !useDirtyRect) {
      this.renderFull(targetCtx, viewTransform, canvasWidth, canvasHeight);
      this.needsFullRedraw = false;
      this.dirtyRect = null;
    } else if (this.dirtyRect) {
      this.renderDirty(targetCtx, viewTransform, canvasWidth, canvasHeight, this.dirtyRect);
    }

    targetCtx.restore();

    if (useOffscreen && this.offscreenCanvas) {
      const targetDpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(
        this.offscreenCanvas,
        0, 0,
        canvasWidth * dpr, canvasHeight * dpr,
        0, 0,
        canvasWidth * targetDpr, canvasHeight * targetDpr
      );
      ctx.restore();
    }
  }

  private renderFull(
    ctx: CanvasRenderingContext2D,
    viewTransform: ViewTransform,
    width: number,
    height: number
  ): void {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    this.drawGrid(ctx, viewTransform, width, height);

    ctx.save();
    ctx.translate(viewTransform.offsetX, viewTransform.offsetY);
    ctx.scale(viewTransform.scale, viewTransform.scale);

    const elements = this.crossfadeState?.active ? this.crossfadeState.toElements : this.currentSnapshot.elements;

    elements.forEach(element => {
      this.drawElementWithOpacity(ctx, element);
    });

    if (this.crossfadeState?.active && this.crossfadeState.progress < 1) {
      const alpha = 1 - this.crossfadeState.progress;
      ctx.save();
      ctx.globalAlpha = alpha;
      this.crossfadeState.fromElements.forEach(element => {
        this.drawElementWithOpacity(ctx, element);
      });
      ctx.restore();
    }

    ctx.restore();
  }

  private renderDirty(
    ctx: CanvasRenderingContext2D,
    viewTransform: ViewTransform,
    width: number,
    height: number,
    dirtyRect: DirtyRect
  ): void {
    const worldX = (dirtyRect.x - viewTransform.offsetX) / viewTransform.scale;
    const worldY = (dirtyRect.y - viewTransform.offsetY) / viewTransform.scale;
    const worldW = dirtyRect.width / viewTransform.scale;
    const worldH = dirtyRect.height / viewTransform.scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(dirtyRect.x, dirtyRect.y, dirtyRect.width, dirtyRect.height);
    ctx.clip();

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(dirtyRect.x, dirtyRect.y, dirtyRect.width, dirtyRect.height);

    this.drawGridInRect(ctx, viewTransform, dirtyRect);

    ctx.translate(viewTransform.offsetX, viewTransform.offsetY);
    ctx.scale(viewTransform.scale, viewTransform.scale);

    this.currentSnapshot.elements.forEach(element => {
      const bounds = this.getElementBounds(element);
      if (this.rectsIntersect(
        { x: worldX, y: worldY, width: worldW, height: worldH },
        bounds
      )) {
        this.drawElementWithOpacity(ctx, element);
      }
    });

    ctx.restore();
    this.dirtyRect = null;
  }

  private rectsIntersect(r1: DirtyRect, r2: DirtyRect): boolean {
    return !(
      r1.x + r1.width < r2.x ||
      r2.x + r2.width < r1.x ||
      r1.y + r1.height < r2.y ||
      r2.y + r2.height < r1.y
    );
  }

  private drawElementWithOpacity(ctx: CanvasRenderingContext2D, element: CanvasElement): void {
    const opacity = element.opacity ?? 1;
    if (opacity <= 0) return;

    if (opacity < 1) {
      ctx.save();
      ctx.globalAlpha = opacity;
      this.drawElement(ctx, element);
      ctx.restore();
    } else {
      this.drawElement(ctx, element);
    }
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    viewTransform: ViewTransform,
    width: number,
    height: number
  ): void {
    const gridSize = 40 * viewTransform.scale;
    if (gridSize < 3) return;

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

  private drawGridInRect(
    ctx: CanvasRenderingContext2D,
    viewTransform: ViewTransform,
    rect: DirtyRect
  ): void {
    const gridSize = 40 * viewTransform.scale;
    if (gridSize < 3) return;

    const startX = rect.x - (rect.x - viewTransform.offsetX) % gridSize;
    const startY = rect.y - (rect.y - viewTransform.offsetY) % gridSize;

    ctx.strokeStyle = '#e2e8f2';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x < rect.x + rect.width; x += gridSize) {
      ctx.moveTo(x, rect.y);
      ctx.lineTo(x, rect.y + rect.height);
    }

    for (let y = startY; y < rect.y + rect.height; y += gridSize) {
      ctx.moveTo(rect.x, y);
      ctx.lineTo(rect.x + rect.width, y);
    }

    ctx.stroke();
  }

  private drawElement(ctx: CanvasRenderingContext2D, element: CanvasElement): void {
    if (element.type === 'sticky-note') return;

    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate((element.rotation || 0) * Math.PI / 180);

    switch (element.type) {
      case 'brush':
        this.drawBrush(ctx, element as BrushElement);
        break;
      case 'rectangle':
        this.drawRectangle(ctx, element as RectangleElement);
        break;
      case 'circle':
        this.drawCircle(ctx, element as CircleElement);
        break;
      case 'text':
        this.drawText(ctx, element as TextElement);
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

    const relPoints = element.points.map(p => ({
      x: p.x - element.x,
      y: p.y - element.y
    }));

    ctx.moveTo(relPoints[0].x, relPoints[0].y);
    for (let i = 1; i < relPoints.length; i++) {
      const xc = (relPoints[i].x + relPoints[i - 1].x) / 2;
      const yc = (relPoints[i].y + relPoints[i - 1].y) / 2;
      ctx.quadraticCurveTo(relPoints[i - 1].x, relPoints[i - 1].y, xc, yc);
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
    ctx.ellipse(0, 0, element.radiusX, element.radiusY, 0, 0, Math.PI * 2);

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
    ctx.font = `${element.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
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

  screenToWorld(screenX: number, screenY: number, viewTransform: ViewTransform): Point {
    return {
      x: (screenX - viewTransform.offsetX) / viewTransform.scale,
      y: (screenY - viewTransform.offsetY) / viewTransform.scale
    };
  }

  worldToScreen(worldX: number, worldY: number, viewTransform: ViewTransform): Point {
    return {
      x: worldX * viewTransform.scale + viewTransform.offsetX,
      y: worldY * viewTransform.scale + viewTransform.offsetY
    };
  }

  zoomAtPoint(
    currentView: ViewTransform,
    screenX: number,
    screenY: number,
    newScale: number
  ): ViewTransform {
    const clampedScale = Math.max(0.1, Math.min(5, newScale));
    const worldX = (screenX - currentView.offsetX) / currentView.scale;
    const worldY = (screenY - currentView.offsetY) / currentView.scale;
    const newOffsetX = screenX - worldX * clampedScale;
    const newOffsetY = screenY - worldY * clampedScale;
    return {
      scale: clampedScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    };
  }

  getElementAtPoint(point: Point, viewTransform: ViewTransform): CanvasElement | null {
    const worldPoint = this.screenToWorld(point.x, point.y, viewTransform);
    const elements = [...this.currentSnapshot.elements].reverse();

    for (const element of elements) {
      if (this.isPointInElement(worldPoint, element)) {
        return element;
      }
    }
    return null;
  }

  private isPointInElement(point: Point, element: CanvasElement): boolean {
    switch (element.type) {
      case 'rectangle':
      case 'sticky-note':
        const halfW = (element as any).width / 2;
        const halfH = (element as any).height / 2;
        return (
          point.x >= element.x - halfW &&
          point.x <= element.x + halfW &&
          point.y >= element.y - halfH &&
          point.y <= element.y + halfH
        );
      case 'circle':
        const dx = point.x - element.x;
        const dy = point.y - element.y;
        const radiusX = (element as CircleElement).radiusX;
        const radiusY = (element as CircleElement).radiusY;
        return (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1;
      case 'text':
        const textW = element.text.length * (element as TextElement).fontSize * 0.6;
        const textH = (element as TextElement).fontSize;
        return (
          point.x >= element.x - textW / 2 &&
          point.x <= element.x + textW / 2 &&
          point.y >= element.y - textH / 2 &&
          point.y <= element.y + textH / 2
        );
      default:
        return false;
    }
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.listeners.clear();
    this.animationListeners.clear();
  }
}

export function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let lastTime = 0;
  let timeoutId: number | null = null;
  let lastArgs: any[] | null = null;

  const throttled = function (this: any, ...args: any[]) {
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (timeoutId === null) {
      lastArgs = args;
      timeoutId = window.setTimeout(() => {
        lastTime = Date.now();
        timeoutId = null;
        if (lastArgs) fn.apply(this, lastArgs);
      }, remaining);
    } else {
      lastArgs = args;
    }
  } as T;

  return throttled;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let timeoutId: number | null = null;

  const debounced = function (this: any, ...args: any[]) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, wait);
  } as T;

  return debounced;
}
