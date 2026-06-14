import { CanvasEngine, CanvasElement } from './canvas-engine';

export type ToolType = 'freehand' | 'rectangle' | 'sticky-note' | 'select';

type EventCallback = (...args: unknown[]) => void;

export class ToolManager {
  private engine: CanvasEngine;
  private activeTool: ToolType = 'freehand';
  private strokeWidth = 3;
  private color = '#5B7FA5';
  private isDrawing = false;
  private isPanning = false;
  private spacePressed = false;
  private lastMousePos = { x: 0, y: 0 };
  private currentFreehandId: string | null = null;
  private currentRectStart: { x: number; y: number } | null = null;
  private currentRectId: string | null = null;
  private isDraggingElement = false;
  private dragStartCanvas = { x: 0, y: 0 };
  private dragElementOrigins: Map<string, { x: number; y: number; points: { x: number; y: number }[] }> = new Map();
  private listeners: Map<string, EventCallback[]> = new Map();
  private selectionRectStart: { x: number; y: number } | null = null;
  private isSelectionRecting = false;
  private editingNoteId: string | null = null;

  constructor(engine: CanvasEngine) {
    this.engine = engine;
  }

  init(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    canvas.addEventListener('mouseup', e => this.onMouseUp(e));
    canvas.addEventListener('dblclick', e => this.onDoubleClick(e));
    canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('keydown', e => this.onKeyDown(e));
    document.addEventListener('keyup', e => this.onKeyUp(e));
  }

  setActiveTool(tool: ToolType): void {
    this.activeTool = tool;
    this.updateCursor();
    this.emit('toolChanged', tool);
  }

  getActiveTool(): ToolType {
    return this.activeTool;
  }

  setStrokeWidth(width: number): void {
    this.strokeWidth = Math.max(1, Math.min(20, width));
    this.emit('strokeWidthChanged', this.strokeWidth);
  }

  getStrokeWidth(): number {
    return this.strokeWidth;
  }

  setColor(color: string): void {
    this.color = color;
    this.emit('colorChanged', color);
  }

  getColor(): string {
    return this.color;
  }

  getSelectedElements(): string[] {
    return this.engine.getSelectedIds();
  }

  selectElement(id: string, multi = false): void {
    const current = this.engine.getSelectedIds();
    if (multi) {
      const set = new Set(current);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      this.engine.setSelected([...set]);
    } else {
      this.engine.setSelected([id]);
    }
    this.emit('selectionChanged', this.engine.getSelectedIds());
  }

  deselectAll(): void {
    this.engine.setSelected([]);
    this.emit('selectionChanged', []);
  }

  deleteSelected(): void {
    const ids = this.engine.getSelectedIds();
    for (const id of ids) {
      this.engine.removeElement(id);
    }
    this.engine.setSelected([]);
    this.emit('selectionChanged', []);
    this.emit('elementsChanged');
  }

  private updateCursor(): void {
    switch (this.activeTool) {
      case 'freehand':
        this.engine.setCursor('crosshair');
        break;
      case 'rectangle':
        this.engine.setCursor('crosshair');
        break;
      case 'sticky-note':
        this.engine.setCursor('text');
        break;
      case 'select':
        this.engine.setCursor('default');
        break;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = this.engine.screenToCanvas(screenX, screenY);
    this.lastMousePos = { x: e.clientX, y: e.clientY };

    if (this.spacePressed || e.button === 1) {
      this.isPanning = true;
      this.engine.setCursor('grabbing');
      return;
    }

    if (this.activeTool === 'select') {
      const hits = this.engine.getElementsAtPoint(canvasPos.x, canvasPos.y);
      if (hits.length > 0) {
        const topHit = hits[0];
        this.selectElement(topHit.id, e.ctrlKey || e.metaKey);
        this.startDragging(topHit.id, canvasPos);
      } else {
        this.deselectAll();
        this.selectionRectStart = canvasPos;
        this.isSelectionRecting = true;
      }
      return;
    }

    if (this.activeTool === 'freehand') {
      this.isDrawing = true;
      const id = this.engine.generateId();
      this.currentFreehandId = id;
      const el: CanvasElement = {
        id,
        type: 'freehand',
        x: canvasPos.x,
        y: canvasPos.y,
        width: 0,
        height: 0,
        points: [{ x: canvasPos.x, y: canvasPos.y }],
        text: '',
        color: this.color,
        strokeWidth: this.strokeWidth,
        scale: 1,
        rotation: 0,
        zIndex: this.engine.getElements().length,
        opacity: 1,
        createdAt: Date.now(),
      };
      this.engine.addElement(el);
      return;
    }

    if (this.activeTool === 'rectangle') {
      this.isDrawing = true;
      this.currentRectStart = { x: canvasPos.x, y: canvasPos.y };
      const id = this.engine.generateId();
      this.currentRectId = id;
      const el: CanvasElement = {
        id,
        type: 'rectangle',
        x: canvasPos.x,
        y: canvasPos.y,
        width: 0,
        height: 0,
        points: [],
        text: '',
        color: this.color,
        strokeWidth: this.strokeWidth,
        scale: 1,
        rotation: 0,
        zIndex: this.engine.getElements().length,
        opacity: 1,
        createdAt: Date.now(),
      };
      this.engine.addElement(el);
      return;
    }

    if (this.activeTool === 'sticky-note') {
      return;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = this.engine.screenToCanvas(screenX, screenY);

    if (this.isPanning) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.engine.panBy(dx, dy);
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      return;
    }

    if (this.isDraggingElement) {
      this.dragMove(canvasPos);
      return;
    }

    if (this.isSelectionRecting && this.selectionRectStart) {
      return;
    }

    if (this.activeTool === 'freehand' && this.isDrawing && this.currentFreehandId) {
      this.engine.updateElement(this.currentFreehandId, {
        points: [...(this.engine.getElements().find(el => el.id === this.currentFreehandId)?.points || []), { x: canvasPos.x, y: canvasPos.y }],
      });
      return;
    }

    if (this.activeTool === 'rectangle' && this.isDrawing && this.currentRectStart && this.currentRectId) {
      const x = Math.min(this.currentRectStart.x, canvasPos.x);
      const y = Math.min(this.currentRectStart.y, canvasPos.y);
      const w = Math.abs(canvasPos.x - this.currentRectStart.x);
      const h = Math.abs(canvasPos.y - this.currentRectStart.y);
      this.engine.updateElement(this.currentRectId, { x, y, width: w, height: h });
      return;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.updateCursor();
      return;
    }

    if (this.isDraggingElement) {
      this.isDraggingElement = false;
      this.dragElementOrigins.clear();
      this.emit('elementsChanged');
      return;
    }

    if (this.isSelectionRecting && this.selectionRectStart) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasPos = this.engine.screenToCanvas(screenX, screenY);
      const x = Math.min(this.selectionRectStart.x, canvasPos.x);
      const y = Math.min(this.selectionRectStart.y, canvasPos.y);
      const w = Math.abs(canvasPos.x - this.selectionRectStart.x);
      const h = Math.abs(canvasPos.y - this.selectionRectStart.y);
      if (w > 5 && h > 5) {
        const hitElements = this.engine.getElementsInRect(x, y, w, h);
        this.engine.setSelected(hitElements.map(el => el.id));
        this.emit('selectionChanged', this.engine.getSelectedIds());
      }
      this.isSelectionRecting = false;
      this.selectionRectStart = null;
      return;
    }

    if (this.activeTool === 'freehand' && this.isDrawing) {
      this.isDrawing = false;
      this.currentFreehandId = null;
      this.emit('elementsChanged');
      return;
    }

    if (this.activeTool === 'rectangle' && this.isDrawing) {
      this.isDrawing = false;
      this.currentRectStart = null;
      this.currentRectId = null;
      this.emit('elementsChanged');
      return;
    }
  }

  private onDoubleClick(e: MouseEvent): void {
    if (this.editingNoteId) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = this.engine.screenToCanvas(screenX, screenY);

    if (this.activeTool === 'select') {
      const hits = this.engine.getElementsAtPoint(canvasPos.x, canvasPos.y);
      const noteHit = hits.find(h => h.type === 'sticky-note');
      if (noteHit) {
        this.startEditingNote(noteHit);
        return;
      }
    }

    if (this.activeTool === 'sticky-note' || this.activeTool === 'select') {
      const id = this.engine.generateId();
      const noteWidth = 180;
      const noteHeight = 140;
      const stickyColors = ['#FFF9C4', '#F0F4C3', '#B2DFDB', '#B3E5FC', '#F8BBD0', '#FFE0B2'];
      const randomColor = stickyColors[Math.floor(Math.random() * stickyColors.length)];
      const el: CanvasElement = {
        id,
        type: 'sticky-note',
        x: canvasPos.x - noteWidth / 2,
        y: canvasPos.y - noteHeight / 2,
        width: noteWidth,
        height: noteHeight,
        points: [],
        text: '',
        color: randomColor,
        strokeWidth: 1,
        scale: 1,
        rotation: 0,
        zIndex: this.engine.getElements().length,
        opacity: 1,
        createdAt: Date.now(),
      };
      this.engine.addElement(el);
      this.emit('elementsChanged');
      setTimeout(() => this.startEditingNote(el), 50);
    }
  }

  private startEditingNote(el: CanvasElement): void {
    this.editingNoteId = el.id;
    const screenPos = this.engine.canvasToScreen(el.x, el.y);
    const canvasContainer = this.engine.getCanvasElement()?.parentElement;
    if (!canvasContainer) return;
    const containerRect = canvasContainer.getBoundingClientRect();

    const textarea = document.createElement('textarea');
    textarea.id = 'note-editor';
    textarea.style.position = 'absolute';
    textarea.style.left = `${screenPos.x + 10}px`;
    textarea.style.top = `${screenPos.y + 10}px`;
    textarea.style.width = `${(el.width - 20) * this.engine.getZoom()}px`;
    textarea.style.height = `${(el.height - 20) * this.engine.getZoom()}px`;
    textarea.style.border = '2px solid #5B7FA5';
    textarea.style.borderRadius = '4px';
    textarea.style.padding = '4px';
    textarea.style.font = `${14 * this.engine.getZoom()}px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif`;
    textarea.style.background = 'transparent';
    textarea.style.color = '#2D3748';
    textarea.style.resize = 'none';
    textarea.style.outline = 'none';
    textarea.style.zIndex = '1000';
    textarea.value = el.text;
    textarea.placeholder = '输入文字...';

    canvasContainer.appendChild(textarea);
    textarea.focus();

    const finishEdit = () => {
      if (this.editingNoteId) {
        this.engine.updateElement(this.editingNoteId, { text: textarea.value });
        this.editingNoteId = null;
        this.emit('elementsChanged');
      }
      textarea.remove();
    };

    textarea.addEventListener('blur', finishEdit);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        textarea.blur();
      }
      e.stopPropagation();
    });
  }

  private startDragging(hitId: string, canvasPos: { x: number; y: number }): void {
    this.isDraggingElement = true;
    this.dragStartCanvas = { ...canvasPos };
    const selectedIds = this.engine.getSelectedIds();
    if (!selectedIds.includes(hitId)) {
      this.selectElement(hitId);
    }
    const allSelected = this.engine.getSelectedIds();
    this.dragElementOrigins.clear();
    for (const id of allSelected) {
      const el = this.engine.getElements().find(e => e.id === id);
      if (el) {
        this.dragElementOrigins.set(id, {
          x: el.x,
          y: el.y,
          points: [...el.points],
        });
      }
    }
  }

  private dragMove(canvasPos: { x: number; y: number }): void {
    const dx = canvasPos.x - this.dragStartCanvas.x;
    const dy = canvasPos.y - this.dragStartCanvas.y;
    for (const [id, origin] of this.dragElementOrigins) {
      const el = this.engine.getElements().find(e => e.id === id);
      if (!el) continue;
      if (el.type === 'freehand') {
        this.engine.updateElement(id, {
          points: origin.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
        });
      } else {
        this.engine.updateElement(id, {
          x: origin.x + dx,
          y: origin.y + dy,
        });
      }
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = this.engine.getZoom() * delta;
    this.engine.setZoom(newZoom, screenX, screenY);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.editingNoteId) return;

    if (e.code === 'Space' && !this.spacePressed) {
      this.spacePressed = true;
      this.engine.setCursor('grab');
      e.preventDefault();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.engine.getSelectedIds().length > 0) {
        this.deleteSelected();
        e.preventDefault();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      this.engine.setSelected(this.engine.getElements().map(el => el.id));
      this.emit('selectionChanged', this.engine.getSelectedIds());
      e.preventDefault();
      return;
    }

    if (e.key === '1') { this.setActiveTool('freehand'); return; }
    if (e.key === '2') { this.setActiveTool('rectangle'); return; }
    if (e.key === '3') { this.setActiveTool('sticky-note'); return; }
    if (e.key === 'v' || e.key === 'V') { this.setActiveTool('select'); return; }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spacePressed = false;
      if (!this.isPanning) {
        this.updateCursor();
      }
    }
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
}
