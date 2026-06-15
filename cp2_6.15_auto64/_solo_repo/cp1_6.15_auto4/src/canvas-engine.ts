export type ElementType = 'freehand' | 'rectangle' | 'sticky-note';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  points: { x: number; y: number }[];
  text: string;
  color: string;
  strokeWidth: number;
  scale: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  createdAt: number;
}

interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type EventCallback = (...args: unknown[]) => void;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ANIMATION_PAN_DURATION = 300;
const ANIMATION_SELECTION_PULSE = 200;
const ANIMATION_REMOVAL = 200;
const ANIMATION_SELECTION_BOUNCE = 100;

export class CanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private container: HTMLElement | null = null;
  private elements: CanvasElement[] = [];
  private selectedIds: Set<string> = new Set();
  private offsetX = 0;
  private offsetY = 0;
  private zoom = 1;
  private animFrameId = 0;
  private needsFullRender = true;
  private dirtyRects: DirtyRect[] = [];
  private listeners: Map<string, EventCallback[]> = new Map();
  private panAnimating = false;
  private panAnimStart = { x: 0, y: 0 };
  private panAnimEnd = { x: 0, y: 0 };
  private panAnimStartTime = 0;
  private selectionAnimProgress = 0;
  private selectionAnimStartTime = 0;
  private selectionAnimating = false;
  private dpr = 1;
  private cachedZoom = 1;
  private cachedElements: Map<string, { bounds: { x: number; y: number; width: number; height: number } }> = new Map();

  init(container: HTMLElement): void {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'crosshair';
    container.appendChild(this.canvas);

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    this.dpr = window.devicePixelRatio || 1;
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    this.startRenderLoop();

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(container);
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    if (!this.canvas || !this.container || !this.offscreenCanvas) return;
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.offscreenCanvas.width = rect.width * this.dpr;
    this.offscreenCanvas.height = rect.height * this.dpr;
    this.needsFullRender = true;
    this.cachedElements.clear();
  }

  private startRenderLoop(): void {
    const loop = (timestamp: number) => {
      this.animFrameId = requestAnimationFrame(loop);
      this.updateAnimations(timestamp);
      if (this.needsRender()) {
        this.render();
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private needsRender(): boolean {
    return this.needsFullRender ||
           this.dirtyRects.length > 0 ||
           this.panAnimating ||
           this.selectionAnimating ||
           this.selectedIds.size > 0;
  }

  private updateAnimations(timestamp: number): void {
    if (this.panAnimating) {
      const elapsed = timestamp - this.panAnimStartTime;
      const progress = Math.min(elapsed / ANIMATION_PAN_DURATION, 1);
      const eased = this.easeOutCubic(progress);
      this.offsetX = this.panAnimStart.x + (this.panAnimEnd.x - this.panAnimStart.x) * eased;
      this.offsetY = this.panAnimStart.y + (this.panAnimEnd.y - this.panAnimStart.y) * eased;
      if (progress >= 1) {
        this.panAnimating = false;
      }
      this.markDirty();
    }

    if (this.selectionAnimating) {
      const elapsed = timestamp - this.selectionAnimStartTime;
      const progress = Math.min(elapsed / ANIMATION_SELECTION_BOUNCE, 1);
      if (progress < 0.5) {
        this.selectionAnimProgress = this.easeOutBack(progress * 2);
      } else {
        this.selectionAnimProgress = 1 - this.easeInBack((progress - 0.5) * 2);
      }
      if (progress >= 1) {
        this.selectionAnimating = false;
        this.selectionAnimProgress = 0;
      }
      this.markDirty();
    }

    if (this.selectedIds.size > 0 && !this.selectionAnimating) {
      const pulse = (Math.sin(timestamp / ANIMATION_SELECTION_PULSE) + 1) / 2;
      this.selectionAnimProgress = pulse * 0.3;
      this.markDirty();
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeInBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  }

  render(): void {
    if (!this.ctx || !this.canvas || !this.offscreenCtx || !this.offscreenCanvas) return;

    const viewW = this.canvas.width / this.dpr;
    const viewH = this.canvas.height / this.dpr;

    if (this.needsFullRender || this.cachedZoom !== this.zoom) {
      this.renderFull(viewW, viewH);
      this.needsFullRender = false;
      this.cachedZoom = this.zoom;
      this.dirtyRects = [];
    } else if (this.dirtyRects.length > 0) {
      this.renderDirtyRegions(viewW, viewH);
      this.dirtyRects = [];
    }

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    this.drawSelectionBoxes(this.ctx);
  }

  private renderFull(viewW: number, viewH: number): void {
    if (!this.offscreenCtx) return;
    const ctx = this.offscreenCtx;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);

    this.drawGrid(ctx, viewW, viewH);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.zoom, this.zoom);

    const visibleElements = this.getVisibleElements(viewW, viewH);
    for (const el of visibleElements) {
      this.drawElement(ctx, el);
      this.cacheElementBounds(el);
    }

    ctx.restore();
  }

  private renderDirtyRegions(viewW: number, viewH: number): void {
    if (!this.offscreenCtx) return;
    const ctx = this.offscreenCtx;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    for (const rect of this.dirtyRects) {
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();

      this.drawGridInRect(ctx, rect, viewW, viewH);

      ctx.save();
      ctx.translate(this.offsetX, this.offsetY);
      ctx.scale(this.zoom, this.zoom);

      const dirtyRectCanvas = {
        x: (rect.x - this.offsetX) / this.zoom,
        y: (rect.y - this.offsetY) / this.zoom,
        width: rect.width / this.zoom,
        height: rect.height / this.zoom,
      };

      const elements = this.getElementsInRect(
        dirtyRectCanvas.x,
        dirtyRectCanvas.y,
        dirtyRectCanvas.width,
        dirtyRectCanvas.height
      ).filter(el => el.opacity > 0).sort((a, b) => a.zIndex - b.zIndex);

      for (const el of elements) {
        this.drawElement(ctx, el);
        this.cacheElementBounds(el);
      }

      ctx.restore();
      ctx.restore();
    }
  }

  private markDirtyRect(screenX: number, screenY: number, width: number, height: number): void {
    const pad = 10;
    this.dirtyRects.push({
      x: Math.max(0, screenX - pad),
      y: Math.max(0, screenY - pad),
      width: width + pad * 2,
      height: height + pad * 2,
    });
  }

  private markDirty(): void {
    this.needsFullRender = true;
  }

  private cacheElementBounds(el: CanvasElement): void {
    const bounds = this.getElementBounds(el);
    const screenBounds = {
      x: bounds.x * this.zoom + this.offsetX,
      y: bounds.y * this.zoom + this.offsetY,
      width: bounds.width * this.zoom,
      height: bounds.height * this.zoom,
    };
    this.cachedElements.set(el.id, { bounds: screenBounds });
    this.markDirtyRect(screenBounds.x, screenBounds.y, screenBounds.width, screenBounds.height);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gridSize = 30 * this.zoom;
    if (gridSize < 8) return;

    const ox = this.offsetX % gridSize;
    const oy = this.offsetY % gridSize;

    ctx.strokeStyle = '#E8ECF0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = ox; x < w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = oy; y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  private drawGridInRect(ctx: CanvasRenderingContext2D, rect: DirtyRect, w: number, h: number): void {
    const gridSize = 30 * this.zoom;
    if (gridSize < 8) return;

    const ox = this.offsetX % gridSize;
    const oy = this.offsetY % gridSize;

    ctx.strokeStyle = '#E8ECF0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    const startX = Math.floor((rect.x - ox) / gridSize) * gridSize + ox;
    for (let x = startX; x < rect.x + rect.width; x += gridSize) {
      if (x >= 0 && x < w) {
        ctx.moveTo(x, rect.y);
        ctx.lineTo(x, rect.y + rect.height);
      }
    }

    const startY = Math.floor((rect.y - oy) / gridSize) * gridSize + oy;
    for (let y = startY; y < rect.y + rect.height; y += gridSize) {
      if (y >= 0 && y < h) {
        ctx.moveTo(rect.x, y);
        ctx.lineTo(rect.x + rect.width, y);
      }
    }
    ctx.stroke();
  }

  private getVisibleElements(viewW: number, viewH: number): CanvasElement[] {
    const bounds = this.getViewportBounds(viewW, viewH);
    return this.elements
      .filter(el => el.opacity > 0)
      .filter(el => {
        const elBounds = this.getElementBounds(el);
        return elBounds.x + elBounds.width > bounds.x &&
               elBounds.x < bounds.x + bounds.width &&
               elBounds.y + elBounds.height > bounds.y &&
               elBounds.y < bounds.y + bounds.height;
      })
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  private getViewportBounds(viewW: number, viewH: number) {
    return {
      x: -this.offsetX / this.zoom,
      y: -this.offsetY / this.zoom,
      width: viewW / this.zoom,
      height: viewH / this.zoom,
    };
  }

  getElementBounds(el: CanvasElement): { x: number; y: number; width: number; height: number } {
    if (el.type === 'freehand' && el.points.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of el.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const pad = el.strokeWidth / 2;
      return { x: minX - pad, y: minY - pad, width: maxX - minX + el.strokeWidth, height: maxY - minY + el.strokeWidth };
    }
    return { x: el.x, y: el.y, width: el.width, height: el.height };
  }

  private drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement): void {
    ctx.save();
    ctx.globalAlpha = el.opacity;

    switch (el.type) {
      case 'freehand':
        this.drawFreehand(ctx, el);
        break;
      case 'rectangle':
        this.drawRectangle(ctx, el);
        break;
      case 'sticky-note':
        this.drawStickyNote(ctx, el);
        break;
    }

    ctx.restore();
  }

  private drawFreehand(ctx: CanvasRenderingContext2D, el: CanvasElement): void {
    if (el.points.length < 2) return;
    ctx.strokeStyle = el.color;
    ctx.lineWidth = el.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.zoom < 0.5 && el.points.length > 50) {
      const step = Math.ceil(el.points.length / 50);
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = step; i < el.points.length; i += step) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.lineTo(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(el.points[0].x, el.points[0].y);
    for (let i = 1; i < el.points.length - 1; i++) {
      const xc = (el.points[i].x + el.points[i + 1].x) / 2;
      const yc = (el.points[i].y + el.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, xc, yc);
    }
    const last = el.points[el.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  private drawRectangle(ctx: CanvasRenderingContext2D, el: CanvasElement): void {
    ctx.strokeStyle = el.color;
    ctx.lineWidth = el.strokeWidth;
    ctx.lineJoin = 'round';
    ctx.strokeRect(el.x, el.y, el.width, el.height);
    ctx.fillStyle = el.color + '15';
    ctx.fillRect(el.x, el.y, el.width, el.height);
  }

  private drawStickyNote(ctx: CanvasRenderingContext2D, el: CanvasElement): void {
    const r = 4;
    ctx.fillStyle = el.color;
    ctx.beginPath();
    ctx.moveTo(el.x + r, el.y);
    ctx.lineTo(el.x + el.width - r, el.y);
    ctx.arcTo(el.x + el.width, el.y, el.x + el.width, el.y + r, r);
    ctx.lineTo(el.x + el.width, el.y + el.height - r);
    ctx.arcTo(el.x + el.width, el.y + el.height, el.x + el.width - r, el.y + el.height, r);
    ctx.lineTo(el.x + r, el.y + el.height);
    ctx.arcTo(el.x, el.y + el.height, el.x, el.y + el.height - r, r);
    ctx.lineTo(el.x, el.y + r);
    ctx.arcTo(el.x, el.y, el.x + r, el.y, r);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#2D3748';
    ctx.font = `${14 / el.scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif`;
    ctx.textBaseline = 'top';
    const padding = 10;
    const maxWidth = el.width - padding * 2;
    const lines = this.wrapText(ctx, el.text, maxWidth);
    const lineHeight = 20 / el.scale;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], el.x + padding, el.y + padding + i * lineHeight);
    }
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const rawLines = text.split('\n');
    const result: string[] = [];
    for (const line of rawLines) {
      if (line === '') {
        result.push('');
        continue;
      }
      let current = '';
      for (const char of line) {
        const test = current + char;
        if (ctx.measureText(test).width > maxWidth && current.length > 0) {
          result.push(current);
          current = char;
        } else {
          current = test;
        }
      }
      if (current) result.push(current);
    }
    return result;
  }

  private drawSelectionBoxes(ctx: CanvasRenderingContext2D): void {
    if (this.selectedIds.size === 0) return;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    for (const id of this.selectedIds) {
      const el = this.elements.find(e => e.id === id);
      if (!el || el.opacity <= 0) continue;

      const cached = this.cachedElements.get(id);
      let sx: number, sy: number, sw: number, sh: number;

      if (cached) {
        sx = cached.bounds.x;
        sy = cached.bounds.y;
        sw = cached.bounds.width;
        sh = cached.bounds.height;
      } else {
        const bounds = this.getElementBounds(el);
        sx = bounds.x * this.zoom + this.offsetX;
        sy = bounds.y * this.zoom + this.offsetY;
        sw = bounds.width * this.zoom;
        sh = bounds.height * this.zoom;
      }

      const bounce = 1 + this.selectionAnimProgress * 0.05;
      const cx = sx + sw / 2;
      const cy = sy + sh / 2;
      const pw = sw * bounce;
      const ph = sh * bounce;

      ctx.strokeStyle = '#5B7FA5';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);
      ctx.setLineDash([]);

      ctx.fillStyle = '#5B7FA5';
      const handleSize = 6;
      const handles = [
        { x: cx - pw / 2, y: cy - ph / 2 },
        { x: cx + pw / 2, y: cy - ph / 2 },
        { x: cx - pw / 2, y: cy + ph / 2 },
        { x: cx + pw / 2, y: cy + ph / 2 },
      ];
      for (const h of handles) {
        ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      }
    }
    ctx.restore();
  }

  addElement(element: CanvasElement): void {
    this.elements.push(element);
    this.markDirty();
    this.cachedElements.clear();
    this.emit('elementsChanged');
  }

  removeElement(id: string): void {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;
    this.animateRemoval(el);
  }

  private animateRemoval(el: CanvasElement): void {
    const startTime = performance.now();
    const startOpacity = el.opacity;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION_REMOVAL, 1);
      const eased = this.easeOutCubic(progress);
      el.opacity = startOpacity * (1 - eased);
      this.markDirty();
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.elements = this.elements.filter(e => e.id !== el.id);
        this.selectedIds.delete(el.id);
        this.cachedElements.delete(el.id);
        this.markDirty();
        this.emit('elementsChanged');
      }
    };
    requestAnimationFrame(animate);
  }

  updateElement(id: string, updates: Partial<CanvasElement>): void {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;

    const oldBounds = this.cachedElements.get(id)?.bounds;
    if (oldBounds) {
      this.markDirtyRect(oldBounds.x, oldBounds.y, oldBounds.width, oldBounds.height);
    }

    Object.assign(el, updates);
    this.cachedElements.delete(id);
    this.markDirty();
  }

  getElements(): CanvasElement[] {
    return [...this.elements].sort((a, b) => a.zIndex - b.zIndex);
  }

  panBy(dx: number, dy: number): void {
    this.offsetX += dx;
    this.offsetY += dy;
    this.markDirty();
  }

  panTo(x: number, y: number, animated = false): void {
    if (animated) {
      this.panAnimStart = { x: this.offsetX, y: this.offsetY };
      this.panAnimEnd = { x, y };
      this.panAnimStartTime = performance.now();
      this.panAnimating = true;
    } else {
      this.offsetX = x;
      this.offsetY = y;
      this.markDirty();
    }
  }

  panToElement(id: string): void {
    const el = this.elements.find(e => e.id === id);
    if (!el || !this.canvas) return;
    const bounds = this.getElementBounds(el);
    const canvasW = this.canvas.width / this.dpr;
    const canvasH = this.canvas.height / this.dpr;
    const targetX = canvasW / 2 - (bounds.x + bounds.width / 2) * this.zoom;
    const targetY = canvasH / 2 - (bounds.y + bounds.height / 2) * this.zoom;
    this.panTo(targetX, targetY, true);
  }

  setZoom(scale: number, centerX?: number, centerY?: number): void {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
    if (centerX !== undefined && centerY !== undefined) {
      this.offsetX = centerX - (centerX - this.offsetX) * (clamped / this.zoom);
      this.offsetY = centerY - (centerY - this.offsetY) * (clamped / this.zoom);
    }
    this.zoom = clamped;
    this.cachedElements.clear();
    this.markDirty();
  }

  getZoom(): number {
    return this.zoom;
  }

  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.offsetX) / this.zoom,
      y: (screenY - this.offsetY) / this.zoom,
    };
  }

  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: canvasX * this.zoom + this.offsetX,
      y: canvasY * this.zoom + this.offsetY,
    };
  }

  getElementsAtPoint(canvasX: number, canvasY: number): CanvasElement[] {
    const results: CanvasElement[] = [];
    for (const el of [...this.elements].reverse()) {
      if (el.opacity <= 0) continue;
      if (el.type === 'freehand') {
        for (const p of el.points) {
          const dist = Math.hypot(p.x - canvasX, p.y - canvasY);
          if (dist < Math.max(el.strokeWidth, 8)) {
            results.push(el);
            break;
          }
        }
      } else {
        const bounds = this.getElementBounds(el);
        if (canvasX >= bounds.x && canvasX <= bounds.x + bounds.width &&
            canvasY >= bounds.y && canvasY <= bounds.y + bounds.height) {
          results.push(el);
        }
      }
    }
    return results;
  }

  getElementsInRect(x: number, y: number, w: number, h: number): CanvasElement[] {
    const results: CanvasElement[] = [];
    for (const el of this.elements) {
      if (el.opacity <= 0) continue;
      const bounds = this.getElementBounds(el);
      if (bounds.x < x + w && bounds.x + bounds.width > x &&
          bounds.y < y + h && bounds.y + bounds.height > y) {
        results.push(el);
      }
    }
    return results;
  }

  setSelected(ids: string[]): void {
    this.selectedIds = new Set(ids);
    this.selectionAnimStartTime = performance.now();
    this.selectionAnimating = ids.length > 0;
    this.markDirty();
  }

  getSelectedIds(): string[] {
    return [...this.selectedIds];
  }

  reorderElements(orderedIds: string[]): void {
    for (let i = 0; i < orderedIds.length; i++) {
      const el = this.elements.find(e => e.id === orderedIds[i]);
      if (el) el.zIndex = i;
    }
    const maxZ = orderedIds.length;
    this.elements
      .filter(e => !orderedIds.includes(e.id))
      .forEach((el, i) => { el.zIndex = maxZ + i; });
    this.markDirty();
    this.cachedElements.clear();
    this.emit('elementsChanged');
  }

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  getCanvasElement(): HTMLCanvasElement | null {
    return this.canvas;
  }

  setCursor(cursor: string): void {
    if (this.canvas) this.canvas.style.cursor = cursor;
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const list = this.listeners.get(event);
    if (list) list.forEach(cb => cb(...args));
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
