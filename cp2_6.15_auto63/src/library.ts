import { BrickType, BRICK_CONFIGS, Brick } from './brick';

interface LibraryItem {
  type: BrickType;
  remaining: number;
  maxCount: number;
}

export class BrickLibrary {
  private container: HTMLElement;
  private items: Map<BrickType, LibraryItem> = new Map();
  private dragGhost: HTMLElement | null = null;
  private currentDragType: BrickType | null = null;
  private onDragStartCallback: ((type: BrickType) => void) | null = null;
  private onDragEndCallback: ((type: BrickType) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initLibrary();
  }

  private initLibrary(): void {
    const types: BrickType[] = ['square2x2', 'rect2x4', 'flat1x2', 'small1x1'];
    for (const type of types) {
      this.items.set(type, {
        type,
        remaining: 6,
        maxCount: 6
      });
    }
    this.render();
  }

  public render(): void {
    const title = this.container.querySelector('.sidebar-title');
    this.container.innerHTML = '';
    if (title) {
      this.container.appendChild(title);
    } else {
      const newTitle = document.createElement('div');
      newTitle.className = 'sidebar-title';
      newTitle.textContent = '积木库';
      this.container.appendChild(newTitle);
    }

    for (const [type, item] of this.items) {
      const brickElement = this.createBrickElement(type, item.remaining);
      this.container.appendChild(brickElement);
    }
  }

  private createBrickElement(type: BrickType, remaining: number): HTMLElement {
    const config = BRICK_CONFIGS[type];
    const div = document.createElement('div');
    div.className = 'brick-item';
    div.dataset.type = type;

    if (remaining <= 0) {
      div.classList.add('disabled');
    }

    const preview = document.createElement('div');
    preview.className = 'brick-preview';
    preview.appendChild(this.createBrickPreviewCanvas(type));

    const info = document.createElement('div');
    info.className = 'brick-info';

    const name = document.createElement('div');
    name.className = 'brick-name';
    name.textContent = config.name;

    const count = document.createElement('div');
    count.className = 'brick-count';
    count.textContent = `剩余: ${remaining} / ${this.items.get(type)!.maxCount}`;

    info.appendChild(name);
    info.appendChild(count);

    div.appendChild(preview);
    div.appendChild(info);

    if (remaining > 0) {
      this.bindDragEvents(div, type);
    }

    return div;
  }

  private createBrickPreviewCanvas(type: BrickType): HTMLCanvasElement {
    const config = BRICK_CONFIGS[type];
    const canvas = document.createElement('canvas');
    const maxWidth = 60;
    const maxHeight = 40;
    const scale = Math.min(maxWidth / (config.width * 30), maxHeight / (config.height * 30));
    const cellSize = 30 * scale;

    canvas.width = config.width * cellSize;
    canvas.height = config.height * cellSize;

    const ctx = canvas.getContext('2d')!;
    const radius = 4 * scale;
    const borderWidth = 1;

    ctx.fillStyle = config.color;
    ctx.beginPath();
    this.roundRect(
      ctx,
      borderWidth,
      borderWidth,
      canvas.width - borderWidth * 2,
      canvas.height - borderWidth * 2,
      radius
    );
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = borderWidth;
    ctx.stroke();

    const studRadius = cellSize * 0.15;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let row = 0; row < config.height; row++) {
      for (let col = 0; col < config.width; col++) {
        const studX = cellSize / 2 + col * cellSize;
        const studY = cellSize / 2 + row * cellSize;
        ctx.beginPath();
        ctx.arc(studX, studY, studRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return canvas;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private bindDragEvents(element: HTMLElement, type: BrickType): void {
    element.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startDrag(e, type);
    });
  }

  private startDrag(e: MouseEvent, type: BrickType): void {
    const item = this.items.get(type);
    if (!item || item.remaining <= 0) return;

    this.currentDragType = type;
    this.createDragGhost(e.clientX, e.clientY, type);
    this.onDragStartCallback?.(type);

    const onMouseMove = (moveEvent: MouseEvent) => {
      this.updateDragGhost(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      this.endDrag();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private createDragGhost(x: number, y: number, type: BrickType): void {
    if (this.dragGhost) {
      document.body.removeChild(this.dragGhost);
    }

    const config = BRICK_CONFIGS[type];
    const cellSize = 50;

    this.dragGhost = document.createElement('div');
    this.dragGhost.className = 'drag-ghost';
    this.dragGhost.style.width = `${config.width * cellSize}px`;
    this.dragGhost.style.height = `${config.height * cellSize}px`;

    const canvas = document.createElement('canvas');
    canvas.width = config.width * cellSize;
    canvas.height = config.height * cellSize;
    const ctx = canvas.getContext('2d')!;

    const radius = 4;
    const borderWidth = 1;

    ctx.fillStyle = config.color;
    ctx.beginPath();
    this.roundRect(
      ctx,
      borderWidth,
      borderWidth,
      canvas.width - borderWidth * 2,
      canvas.height - borderWidth * 2,
      radius
    );
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = borderWidth;
    ctx.stroke();

    const studRadius = cellSize * 0.15;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let row = 0; row < config.height; row++) {
      for (let col = 0; col < config.width; col++) {
        const studX = cellSize / 2 + col * cellSize;
        const studY = cellSize / 2 + row * cellSize;
        ctx.beginPath();
        ctx.arc(studX, studY, studRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.dragGhost.appendChild(canvas);
    this.updateDragGhost(x, y);
    document.body.appendChild(this.dragGhost);
  }

  private updateDragGhost(x: number, y: number): void {
    if (!this.dragGhost) return;
    const rect = this.dragGhost.getBoundingClientRect();
    this.dragGhost.style.left = `${x - rect.width / 2}px`;
    this.dragGhost.style.top = `${y - rect.height / 2}px`;
  }

  private endDrag(): void {
    if (this.dragGhost) {
      document.body.removeChild(this.dragGhost);
      this.dragGhost = null;
    }
    if (this.currentDragType) {
      this.onDragEndCallback?.(this.currentDragType);
      this.currentDragType = null;
    }
  }

  public decrementCount(type: BrickType): boolean {
    const item = this.items.get(type);
    if (!item || item.remaining <= 0) return false;

    item.remaining--;
    this.render();
    return true;
  }

  public incrementCount(type: BrickType): void {
    const item = this.items.get(type);
    if (!item) return;

    item.remaining = Math.min(item.remaining + 1, item.maxCount);
    this.render();
  }

  public getRemaining(type: BrickType): number {
    return this.items.get(type)?.remaining || 0;
  }

  public reset(): void {
    for (const [type, item] of this.items) {
      item.remaining = item.maxCount;
    }
    this.render();
  }

  public setOnDragStart(callback: (type: BrickType) => void): void {
    this.onDragStartCallback = callback;
  }

  public setOnDragEnd(callback: (type: BrickType) => void): void {
    this.onDragEndCallback = callback;
  }

  public getCurrentDragType(): BrickType | null {
    return this.currentDragType;
  }

  public isDragging(): boolean {
    return this.currentDragType !== null;
  }
}
