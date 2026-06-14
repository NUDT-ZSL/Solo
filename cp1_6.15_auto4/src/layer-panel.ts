import { CanvasEngine, CanvasElement } from './canvas-engine';

type EventCallback = (...args: unknown[]) => void;

export class LayerPanel {
  private engine: CanvasEngine;
  private container: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private dragSourceId: string | null = null;
  private collapsed = false;

  constructor(engine: CanvasEngine) {
    this.engine = engine;
  }

  init(container: HTMLElement): void {
    this.container = container;
    this.render();
    this.engine.on('elementsChanged', () => this.refresh());
  }

  private render(): void {
    if (!this.container) return;

    this.panelEl = document.createElement('div');
    this.panelEl.className = 'layer-panel';
    this.panelEl.innerHTML = `
      <div class="layer-panel-header">
        <span class="layer-panel-title">图层</span>
        <button class="layer-panel-toggle" title="折叠/展开">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="layer-panel-list"></div>
    `;

    this.container.appendChild(this.panelEl);

    const toggleBtn = this.panelEl.querySelector('.layer-panel-toggle');
    toggleBtn?.addEventListener('click', () => this.toggleCollapse());

    this.listEl = this.panelEl.querySelector('.layer-panel-list');
    this.refresh();
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    if (this.panelEl) {
      this.panelEl.classList.toggle('collapsed', this.collapsed);
    }
  }

  refresh(): void {
    if (!this.listEl) return;
    const elements = this.engine.getElements().filter(e => e.opacity > 0).reverse();
    this.listEl.innerHTML = '';

    if (elements.length === 0) {
      this.listEl.innerHTML = '<div class="layer-panel-empty">暂无图层</div>';
      return;
    }

    for (const el of elements) {
      const item = this.createElementItem(el);
      this.listEl.appendChild(item);
    }
  }

  private createElementItem(el: CanvasElement): HTMLElement {
    const item = document.createElement('div');
    item.className = 'layer-item';
    item.dataset.id = el.id;

    const selectedIds = this.engine.getSelectedIds();
    if (selectedIds.includes(el.id)) {
      item.classList.add('selected');
    }

    const thumb = this.createThumbnail(el);
    const info = document.createElement('div');
    info.className = 'layer-item-info';
    info.innerHTML = `
      <span class="layer-item-name">${this.getElementName(el)}</span>
      <span class="layer-item-type">${this.getTypeLabel(el.type)}</span>
    `;

    const actions = document.createElement('div');
    actions.className = 'layer-item-actions';

    const focusBtn = document.createElement('button');
    focusBtn.className = 'layer-item-focus';
    focusBtn.title = '定位到元素';
    focusBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
    focusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.focusElement(el.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'layer-item-delete';
    deleteBtn.title = '删除元素';
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.removeElement(el.id);
      this.emit('elementsChanged');
    });

    actions.appendChild(focusBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(thumb);
    item.appendChild(info);
    item.appendChild(actions);

    item.addEventListener('click', () => {
      this.engine.setSelected([el.id]);
      this.emit('selectionChanged', [el.id]);
      this.refresh();
    });

    item.addEventListener('mouseenter', () => {
      item.classList.add('hover');
    });
    item.addEventListener('mouseleave', () => {
      item.classList.remove('hover');
    });

    item.draggable = true;
    item.addEventListener('dragstart', (e) => {
      this.dragSourceId = el.id;
      item.classList.add('dragging');
      e.dataTransfer!.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      this.dragSourceId = null;
      item.classList.remove('dragging');
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (this.dragSourceId && this.dragSourceId !== el.id) {
        this.reorderElements(this.dragSourceId, el.id);
      }
    });

    return item;
  }

  private createThumbnail(el: CanvasElement): HTMLElement {
    const thumb = document.createElement('div');
    thumb.className = 'layer-item-thumb';

    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 30;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 40, 30);

    switch (el.type) {
      case 'freehand': {
        if (el.points.length < 2) break;
        ctx.strokeStyle = el.color;
        ctx.lineWidth = Math.min(el.strokeWidth, 3);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const bounds = this.getPointsBounds(el.points);
        const scaleX = 36 / Math.max(bounds.width, 1);
        const scaleY = 26 / Math.max(bounds.height, 1);
        const scale = Math.min(scaleX, scaleY, 1);
        ctx.beginPath();
        ctx.moveTo((el.points[0].x - bounds.x) * scale + 2, (el.points[0].y - bounds.y) * scale + 2);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo((el.points[i].x - bounds.x) * scale + 2, (el.points[i].y - bounds.y) * scale + 2);
        }
        ctx.stroke();
        break;
      }
      case 'rectangle': {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = 1;
        const scale = Math.min(36 / Math.max(el.width, 1), 26 / Math.max(el.height, 1), 1);
        const w = el.width * scale;
        const h = el.height * scale;
        ctx.strokeRect(20 - w / 2, 15 - h / 2, w, h);
        break;
      }
      case 'sticky-note': {
        ctx.fillStyle = el.color;
        const scale = Math.min(36 / Math.max(el.width, 1), 26 / Math.max(el.height, 1), 1);
        const w = el.width * scale;
        const h = el.height * scale;
        ctx.fillRect(20 - w / 2, 15 - h / 2, w, h);
        break;
      }
    }

    thumb.appendChild(canvas);
    return thumb;
  }

  private getPointsBounds(points: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private getElementName(el: CanvasElement): string {
    switch (el.type) {
      case 'freehand': return '画笔路径';
      case 'rectangle': return '矩形';
      case 'sticky-note': return el.text ? el.text.slice(0, 8) + (el.text.length > 8 ? '...' : '') : '便签';
      default: return '元素';
    }
  }

  private getTypeLabel(type: string): string {
    switch (type) {
      case 'freehand': return '画笔';
      case 'rectangle': return '矩形';
      case 'sticky-note': return '便签';
      default: return type;
    }
  }

  focusElement(id: string): void {
    this.engine.panToElement(id);
    this.engine.setSelected([id]);
    this.emit('selectionChanged', [id]);
  }

  private reorderElements(sourceId: string, targetId: string): void {
    const elements = this.engine.getElements();
    const ordered = elements.map(e => e.id);
    const sourceIdx = ordered.indexOf(sourceId);
    const targetIdx = ordered.indexOf(targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;
    ordered.splice(sourceIdx, 1);
    ordered.splice(targetIdx, 0, sourceId);
    this.engine.reorderElements(ordered);
    this.refresh();
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, ...args: unknown[]): void {
    const list = this.listeners.get(event);
    if (list) list.forEach(cb => cb(...args));
  }

  destroy(): void {
    if (this.panelEl && this.panelEl.parentElement) {
      this.panelEl.parentElement.removeChild(this.panelEl);
    }
  }
}
