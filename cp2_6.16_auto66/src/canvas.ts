import { v4 as uuidv4 } from 'uuid';

export type ToolType = 'brush' | 'rectangle' | 'circle' | 'line' | 'text' | 'sticky' | 'select';

export type ElementType = 'path' | 'rectangle' | 'circle' | 'line' | 'text' | 'sticky';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
}

export interface PathElement extends BaseElement {
  type: 'path';
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radiusX: number;
  radiusY: number;
  color: string;
  strokeWidth: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  color: string;
  fontSize: number;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  width: number;
  height: number;
  content: string;
  backgroundColor: string;
}

export type CanvasElement = PathElement | RectangleElement | CircleElement | LineElement | TextElement | StickyElement;

export interface CanvasState {
  elements: CanvasElement[];
  scale: number;
  offsetX: number;
  offsetY: number;
}

type UpdateCallback = () => void;

const COLORS = [
  '#e94560', '#0f3460', '#1a1a2e', '#00d2ff',
  '#ffd700', '#32cd32', '#ff6347', '#9370db',
  '#ff69b4', '#00ced1', '#ffa500', '#808080',
];

const STROKE_WIDTHS = [2, 4, 6, 8, 10, 12];

export class WhiteboardCanvas {
  private elements: CanvasElement[] = [];
  private undoStack: CanvasElement[][] = [];
  private redoStack: CanvasElement[][] = [];
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private selectedIds: string[] = [];
  private currentTool: ToolType = 'brush';
  private currentColor = COLORS[0];
  private strokeWidth = 4;
  private isDrawing = false;
  private isPanning = false;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private currentPath: PathElement | null = null;
  private currentShape: CanvasElement | null = null;
  private selectionBox: { x: number; y: number; width: number; height: number } | null = null;
  private dragOffset: Map<string, { x: number; y: number }> = new Map();
  private canvasWidth = 0;
  private canvasHeight = 0;
  private onUpdate: UpdateCallback | null = null;
  private animationFrameId: number | null = null;
  private ripples: { x: number; y: number; startTime: number }[] = [];

  constructor() {}

  setUpdateCallback(callback: UpdateCallback | null) {
    this.onUpdate = callback;
  }

  getElements(): CanvasElement[] {
    return this.elements;
  }

  getScale(): number {
    return this.scale;
  }

  getOffsetX(): number {
    return this.offsetX;
  }

  getOffsetY(): number {
    return this.offsetY;
  }

  getSelectedIds(): string[] {
    return this.selectedIds;
  }

  getCurrentTool(): ToolType {
    return this.currentTool;
  }

  setCurrentTool(tool: ToolType) {
    this.currentTool = tool;
    this.selectedIds = [];
    this.notifyUpdate();
  }

  getCurrentColor(): string {
    return this.currentColor;
  }

  setCurrentColor(color: string) {
    this.currentColor = color;
    this.notifyUpdate();
  }

  getStrokeWidth(): number {
    return this.strokeWidth;
  }

  setStrokeWidth(width: number) {
    this.strokeWidth = width;
    this.notifyUpdate();
  }

  getColors(): string[] {
    return COLORS;
  }

  getStrokeWidths(): number[] {
    return STROKE_WIDTHS;
  }

  setCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale,
    };
  }

  addElement(element: CanvasElement) {
    this.saveState();
    this.elements.push(element);
    this.redoStack = [];
    this.notifyUpdate();
  }

  removeElement(id: string) {
    this.saveState();
    this.elements = this.elements.filter((el) => el.id !== id);
    this.selectedIds = this.selectedIds.filter((sid) => sid !== id);
    this.redoStack = [];
    this.notifyUpdate();
  }

  removeSelected() {
    if (this.selectedIds.length === 0) return;
    this.saveState();
    this.elements = this.elements.filter((el) => !this.selectedIds.includes(el.id));
    this.selectedIds = [];
    this.redoStack = [];
    this.notifyUpdate();
  }

  duplicateSelected() {
    if (this.selectedIds.length === 0) return;
    this.saveState();
    const newElements: CanvasElement[] = [];
    const newIds: string[] = [];
    for (const id of this.selectedIds) {
      const element = this.elements.find((el) => el.id === id);
      if (element) {
        const newEl = JSON.parse(JSON.stringify(element)) as CanvasElement;
        newEl.id = uuidv4();
        newEl.x += 20;
        newEl.y += 20;
        newEl.createdAt = new Date().toISOString();
        newEl.updatedAt = new Date().toISOString();
        if (newEl.type === 'path') {
          newEl.points = newEl.points.map((p) => ({ x: p.x + 20, y: p.y + 20 });
        }
        newElements.push(newEl);
        newIds.push(newEl.id);
      }
    }
    this.elements.push(...newElements);
    this.selectedIds = newIds;
    this.redoStack = [];
    this.notifyUpdate();
  }

  private saveState() {
    this.undoStack.push(JSON.parse(JSON.stringify(this.elements)));
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(JSON.parse(JSON.stringify(this.elements)));
    this.elements = this.undoStack.pop()!;
    this.selectedIds = [];
    this.notifyUpdate();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(JSON.parse(JSON.stringify(this.elements)));
    this.elements = this.redoStack.pop()!;
    this.selectedIds = [];
    this.notifyUpdate();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getSnapshot(): CanvasElement[] {
    return JSON.parse(JSON.stringify(this.elements));
  }

  loadSnapshot(elements: CanvasElement[]) {
    this.saveState();
    this.elements = JSON.parse(JSON.stringify(elements));
    this.selectedIds = [];
    this.redoStack = [];
    this.notifyUpdate();
  }

  getElementBounds(element: CanvasElement): { x: number; y: number; width: number; height: number } {
    switch (element.type) {
      case 'path': {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of element.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
      case 'rectangle':
        return { x: element.x, y: element.y, width: element.width, height: element.height };
      case 'circle':
        return {
          x: element.x - element.radiusX,
          y: element.y - element.radiusY,
          width: element.radiusX * 2,
          height: element.radiusY * 2,
        };
      case 'line':
        return {
          x: Math.min(element.x, element.x2),
          y: Math.min(element.y, element.y2),
          width: Math.abs(element.x2 - element.x),
          height: Math.abs(element.y2 - element.y),
        };
      case 'text': {
        const approxWidth = element.content.length * element.fontSize * 0.6;
        return { x: element.x, y: element.y - element.fontSize, width: approxWidth, height: element.fontSize * 1.2 };
      }
      case 'sticky':
        return { x: element.x, y: element.y, width: element.width, height: element.height };
      default:
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  isPointInElement(x: number, y: number, element: CanvasElement): boolean {
    const bounds = this.getElementBounds(element);
    const padding = 5 / this.scale;
    return (
      x >= bounds.x - padding &&
      x <= bounds.x + bounds.width + padding &&
      y >= bounds.y - padding &&
      y <= bounds.y + bounds.height + padding
    );
  }

  getElementAtPoint(x: number, y: number): CanvasElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      if (this.isPointInElement(x, y, this.elements[i])) {
        return this.elements[i];
      }
    }
    return null;
  }

  private selectInRect(x: number, y: number, width: number, height: number): string[] {
    const ids: string[] = [];
    const left = Math.min(x, x + width);
    const right = Math.max(x, x + width);
    const top = Math.min(y, y + height);
    const bottom = Math.max(y, y + height);

    for (const el of this.elements) {
      const bounds = this.getElementBounds(el);
      if (
        bounds.x < right &&
        bounds.x + bounds.width > left &&
        bounds.y < bottom &&
        bounds.y + bounds.height > top
      ) {
        ids.push(el.id);
      }
    }
    return ids;
  }

  handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(screenX, screenY);

    this.addRipple(screenX, screenY);

    if (e.button === 2) {
      this.isPanning = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      return;
    }

    if (this.currentTool === 'select') {
      const element = this.getElementAtPoint(worldPos.x, worldPos.y);
      if (element && this.selectedIds.includes(element.id)) {
        this.isDragging = true;
        this.dragOffset.clear();
        for (const id of this.selectedIds) {
          const el = this.elements.find((e) => e.id === id);
          if (el) {
            this.dragOffset.set(id, { x: worldPos.x - el.x, y: worldPos.y - el.y });
          }
        }
      } else if (element) {
          if (!e.shiftKey) {
            this.selectedIds = [element.id];
          } else {
            if (this.selectedIds.includes(element.id)) {
              this.selectedIds = this.selectedIds.filter((id) => id !== element.id);
            } else {
              this.selectedIds.push(element.id);
            }
          }
          this.isDragging = true;
          this.dragOffset.clear();
          for (const id of this.selectedIds) {
            const el = this.elements.find((e) => e.id === id);
            if (el) {
              this.dragOffset.set(id, { x: worldPos.x - el.x, y: worldPos.y - el.y });
            }
          }
          this.notifyUpdate();
        } else {
          if (!e.shiftKey) {
            this.selectedIds = [];
          }
          this.isDrawing = true;
          this.startX = worldPos.x;
          this.startY = worldPos.y;
          this.selectionBox = { x: worldPos.x, y: worldPos.y, width: 0, height: 0 };
          this.notifyUpdate();
        }
      return;
    }

    this.isDrawing = true;
    this.saveState();

    const now = new Date().toISOString();

    switch (this.currentTool) {
      case 'brush':
        this.currentPath = {
          id: uuidv4(),
          type: 'path',
          x: worldPos.x,
          y: worldPos.y,
          points: [{ x: worldPos.x, y: worldPos.y }],
          color: this.currentColor,
          strokeWidth: this.strokeWidth,
          createdAt: now,
          updatedAt: now,
        };
        this.elements.push(this.currentPath);
        break;
      case 'rectangle':
        this.currentShape = {
          id: uuidv4(),
          type: 'rectangle',
          x: worldPos.x,
          y: worldPos.y,
          width: 0,
          height: 0,
          color: this.currentColor,
          strokeWidth: this.strokeWidth,
          createdAt: now,
          updatedAt: now,
        };
        this.elements.push(this.currentShape);
        break;
      case 'circle':
        this.currentShape = {
          id: uuidv4(),
          type: 'circle',
          x: worldPos.x,
          y: worldPos.y,
          radiusX: 0,
          radiusY: 0,
          color: this.currentColor,
          strokeWidth: this.strokeWidth,
          createdAt: now,
          updatedAt: now,
        };
        this.elements.push(this.currentShape);
        break;
      case 'line':
        this.currentShape = {
          id: uuidv4(),
          type: 'line',
          x: worldPos.x,
          y: worldPos.y,
          x2: worldPos.x,
          y2: worldPos.y,
          color: this.currentColor,
          strokeWidth: this.strokeWidth,
          createdAt: now,
          updatedAt: now,
        };
        this.elements.push(this.currentShape);
        break;
      case 'text': {
        const textEl: TextElement = {
          id: uuidv4(),
          type: 'text',
          x: worldPos.x,
          y: worldPos.y,
          content: '双击编辑文本',
          color: this.currentColor,
          fontSize: 20,
          createdAt: now,
          updatedAt: now,
        };
        this.elements.push(textEl);
        this.isDrawing = false;
        break;
      }
      case 'sticky': {
        const sticky: StickyElement = {
          id: uuidv4(),
          type: 'sticky',
          x: worldPos.x,
          y: worldPos.y,
          width: 160,
          height: 100,
          content: '双击编辑便签',
          backgroundColor: '#ffe4a0',
          createdAt: now,
          updatedAt: now,
        };
        this.elements.push(sticky);
        this.isDrawing = false;
        break;
      }
    }

    this.redoStack = [];
    this.notifyUpdate();
  }

  handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(screenX, screenY);

    if (this.isPanning) {
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.offsetX += dx;
      this.offsetY += dy;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.notifyUpdate();
      return;
    }

    if (this.isDragging && this.selectedIds.length > 0) {
      for (const id of this.selectedIds) {
        const element = this.elements.find((el) => el.id === id);
        const offset = this.dragOffset.get(id);
        if (element && offset) {
          const dx = worldPos.x - offset.x - element.x;
          const dy = worldPos.y - offset.y - element.y;
          this.moveElement(element, dx, dy);
          element.updatedAt = new Date().toISOString();
        }
      }
      this.notifyUpdate();
      return;
    }

    if (!this.isDrawing) return;

    if (this.currentTool === 'select' && this.selectionBox) {
      this.selectionBox.width = worldPos.x - this.startX;
      this.selectionBox.height = worldPos.y - this.startY;
      this.selectedIds = this.selectInRect(
        this.selectionBox.x,
        this.selectionBox.y,
        this.selectionBox.width,
        this.selectionBox.height
      );
      this.notifyUpdate();
      return;
    }

    switch (this.currentTool) {
      case 'brush':
        if (this.currentPath) {
          this.currentPath.points.push({ x: worldPos.x, y: worldPos.y });
        }
        break;
      case 'rectangle':
        if (this.currentShape && this.currentShape.type === 'rectangle') {
          this.currentShape.width = worldPos.x - this.startX;
          this.currentShape.height = worldPos.y - this.startY;
          if (this.currentShape.width < 0) {
            this.currentShape.x = worldPos.x;
            this.currentShape.width = -this.currentShape.width;
          } else {
            this.currentShape.x = this.startX;
          }
          if (this.currentShape.height < 0) {
            this.currentShape.y = worldPos.y;
            this.currentShape.height = -this.currentShape.height;
          } else {
            this.currentShape.y = this.startY;
          }
        }
        break;
      case 'circle':
        if (this.currentShape && this.currentShape.type === 'circle') {
          this.currentShape.x = this.startX;
          this.currentShape.y = this.startY;
          this.currentShape.radiusX = Math.abs(worldPos.x - this.startX);
          this.currentShape.radiusY = Math.abs(worldPos.y - this.startY);
        }
        break;
      case 'line':
        if (this.currentShape && this.currentShape.type === 'line') {
          this.currentShape.x2 = worldPos.x;
          this.currentShape.y2 = worldPos.y;
        }
        break;
    }

    this.notifyUpdate();
  }

  handleMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (this.isDragging) {
      this.isDragging = false;
      this.dragOffset.clear();
      return;
    }

    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.currentPath = null;
    this.currentShape = null;
    this.selectionBox = null;
    this.notifyUpdate();
  }

  handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.25, Math.min(4, this.scale * zoomFactor));

    const worldX = (mouseX - this.offsetX) / this.scale;
    const worldY = (mouseY - this.offsetY) / this.scale;

    this.offsetX = mouseX - worldX * newScale;
    this.offsetY = mouseY - worldY * newScale;
    this.scale = newScale;

    this.notifyUpdate();
  }

  handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
  }

  private moveElement(element: CanvasElement, dx: number, dy: number) {
    element.x += dx;
    element.y += dy;

    if (element.type === 'path') {
      element.points = element.points.map((p) => ({ x: p.x + dx, y: p.y + dy });
    } else if (element.type === 'line') {
      element.x2 += dx;
      element.y2 += dy;
    }
  }

  updateTextContent(id: string, content: string) {
    const element = this.elements.find((el) => el.id === id);
    if (element && (element.type === 'text' || element.type === 'sticky')) {
      this.saveState();
      element.content = content;
      element.updatedAt = new Date().toISOString();
      this.redoStack = [];
      this.notifyUpdate();
    }
  }

  private addRipple(x: number, y: number) {
    this.ripples.push({ x, y, startTime: performance.now() });
    if (this.animationFrameId === null) {
      this.animateRipples();
    }
  }

  private animateRipples() {
    this.animationFrameId = requestAnimationFrame(() => {
      const now = performance.now();
      this.ripples = this.ripples.filter((r) => now - r.startTime < 300);
      if (this.ripples.length > 0) {
        this.animateRipples();
      } else {
        this.animationFrameId = null;
      }
      this.notifyUpdate();
    });
  }

  getRipples() {
    return this.ripples;
  }

  private isElementInViewport(element: CanvasElement): boolean {
    const bounds = this.getElementBounds(element);
    const viewLeft = -this.offsetX / this.scale;
    const viewTop = -this.offsetY / this.scale;
    const viewRight = viewLeft + this.canvasWidth / this.scale;
    const viewBottom = viewTop + this.canvasHeight / this.scale;

    return (
      bounds.x + bounds.width >= viewLeft &&
      bounds.x <= viewRight &&
      bounds.y + bounds.height >= viewTop &&
      bounds.y <= viewBottom
    );
  }

  getVisibleElements(): CanvasElement[] {
    if (this.elements.length <= 500) {
      return this.elements;
    }
    return this.elements.filter((el) => this.isElementInViewport(el));
  }

  getSelectionBox() {
    return this.selectionBox;
  }

  private notifyUpdate() {
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  resetView() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.notifyUpdate();
  }
}
