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

type EventCallback = (...args: unknown[]) => void;

export class CanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private container: HTMLElement | null = null;
  private elements: CanvasElement[] = [];
  private selectedIds: Set<string> = new Set();
  private offsetX = 0;
  private offsetY = 0;
  private zoom = 1;
  private animFrameId = 0;
  private needsRender = true;
  private listeners: Map<string, EventCallback[]> = new Map();
  private panAnimating = false;
  private panAnimStart = { x: 0, y: 0 };
  private panAnimEnd = { x: 0, y: 0 };
  private panAnimStartTime = 0;
  private panAnimDuration = 300;
  private selectionPulse = 0;
  private lastFrameTime = 0;
  private dpr = 1;

  init(container: HTMLElement): void {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'crosshair';
    container.appendChild(this.canvas);

    this.dpr = window.devicePixelRatio || 1;
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    this.startRenderLoop();

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(container);
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.needsRender = true;
  }

  private startRenderLoop(): void {
    const loop = (timestamp: number) => {
      this.animFrameId = requestAnimationFrame(loop);
      this.updateAnimations(timestamp);
      if (this.needsRender || this.panAnimating || this.selectedIds.size > 0) {
        this.render();
        this.needsRender = false;
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateAnimations(timestamp: number): void {
    if (this.panAnimating) {
      const elapsed = timestamp - this.panAnimStartTime;
      const progress = Math.min(elapsed / this.panAnimDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.offsetX = this.panAnimStart.x + (this.panAnimEnd.x - this.panAnimStart.x) * eased;
      this.offsetY = this.panAnimStart.y + (this.panAnimEnd.y - this.panAnimStart.y) * eased;
      if (progress >= 1) {
        this.panAnimating = false;
      }
      this.needsRender = true;
    }
    if (this.selectedIds.size > 0) {
      this.selectionPulse = (Math.sin(timestamp / 300) + 1) / 2;
      this.needsRender = true;
    }
  }

  render(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w / this.dpr, h / this.dpr);

    this.drawGrid(ctx, w / this.dpr, h / this.dpr);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.zoom, this.zoom);

    const visibleElements = this.getVisibleElements(w / this.dpr, h / this.dpr);
    for (const el of visibleElements) {
      this.drawElement(ctx, el);
    }

    ctx.restore();
    this.drawSelectionBoxes(ctx);
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

  private getElementBounds(el: CanvasElement): { x: number; y: number; width: number; height: number } {
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
      const bounds = this.getElementBounds(el);
      const sx = bounds.x * this.zoom + this.offsetX;
      const sy = bounds.y * this.zoom + this.offsetY;
      const sw = bounds.width * this.zoom;
      const sh = bounds.height * this.zoom;

      const pulse = 1 + (this.selectionPulse * 0.02);
      const cx = sx + sw / 2;
      const cy = sy + sh / 2;
      const pw = sw * pulse;
      const ph = sh * pulse;

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
    this.needsRender = true;
    this.emit('elementsChanged');
  }

  removeElement(id: string): void {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;
    el.opacity = 0;
    this.animateRemoval(el);
  }

  private animateRemoval(el: CanvasElement): void {
    const startTime = performance.now();
    const duration = 200;
    const startOpacity = 1;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.opacity = startOpacity * (1 - progress);
      this.needsRender = true;
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.elements = this.elements.filter(e => e.id !== el.id);
        this.selectedIds.delete(el.id);
        this.needsRender = true;
        this.emit('elementsChanged');
      }
    };
    requestAnimationFrame(animate);
  }

  updateElement(id: string, updates: Partial<CanvasElement>): void {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;
    Object.assign(el, updates);
    this.needsRender = true;
  }

  getElements(): CanvasElement[] {
    return [...this.elements].sort((a, b) => a.zIndex - b.zIndex);
  }

  panBy(dx: number, dy: number): void {
    this.offsetX += dx;
    this.offsetY += dy;
    this.needsRender = true;
  }

  panTo(x: number, y: number, animated = false): void {
    if (animated) {
      this.panAnimStart = { x: this.offsetX, y: this.offsetY };
      this.panAnimEnd = { x, y };
      this.panAnimStartTime = performance.now();
      this.panAnimDuration = 300;
      this.panAnimating = true;
    } else {
      this.offsetX = x;
      this.offsetY = y;
      this.needsRender = true;
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
    const clamped = Math.max(0.1, Math.min(5, scale));
    if (centerX !== undefined && centerY !== undefined) {
      this.offsetX = centerX - (centerX - this.offsetX) * (clamped / this.zoom);
      this.offsetY = centerY - (centerY - this.offsetY) * (clamped / this.zoom);
    }
    this.zoom = clamped;
    this.needsRender = true;
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
    this.needsRender = true;
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
    this.needsRender = true;
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
