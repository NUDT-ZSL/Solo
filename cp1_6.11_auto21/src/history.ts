import {
  ColorData,
  HistoryItem,
  HistoryUpdateCallback,
  HistorySelectCallback,
  HistoryDeleteCallback,
  IColorHistory
} from './types';

export { HistoryItem, HistoryUpdateCallback, HistorySelectCallback, HistoryDeleteCallback } from './types';

export class ColorHistory implements IColorHistory {
  private items: HistoryItem[] = [];
  private maxItems: number = 20;
  private container: HTMLElement | null = null;
  private onUpdate: HistoryUpdateCallback | null = null;
  private onSelect: HistorySelectCallback | null = null;
  private onDelete: HistoryDeleteCallback | null = null;

  constructor(maxItems: number = 20) {
    this.maxItems = maxItems;
  }

  setContainer(container: HTMLElement): void {
    this.container = container;
  }

  setOnUpdate(callback: HistoryUpdateCallback): void {
    this.onUpdate = callback;
  }

  setOnSelect(callback: HistorySelectCallback): void {
    this.onSelect = callback;
  }

  setOnDelete(callback: HistoryDeleteCallback): void {
    this.onDelete = callback;
  }

  addColor(color: ColorData): HistoryItem {
    const item: HistoryItem = {
      id: this.generateId(),
      color: {
        r: color.r,
        g: color.g,
        b: color.b,
        hex: color.hex,
        hsl: { h: color.hsl.h, s: color.hsl.s, l: color.hsl.l }
      },
      locked: false,
      timestamp: Date.now()
    };

    this.items.unshift(item);
    this.trimOverflow();
    this.render();
    this.notifyUpdate();
    return item;
  }

  private trimOverflow(): void {
    if (this.items.length <= this.maxItems) return;

    const unlockedItems = this.items.filter(i => !i.locked);
    const numToRemove = this.items.length - this.maxItems;

    for (let i = 0; i < numToRemove; i++) {
      const oldestUnlocked = unlockedItems.pop();
      if (!oldestUnlocked) break;
      this.items = this.items.filter(it => it.id !== oldestUnlocked.id);
    }
  }

  removeColor(id: string): boolean {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) return false;

    this.items.splice(index, 1);
    this.render();
    this.notifyUpdate();
    return true;
  }

  updateColor(id: string, color: ColorData): boolean {
    const item = this.items.find(i => i.id === id);
    if (!item) return false;

    item.color = {
      r: color.r,
      g: color.g,
      b: color.b,
      hex: color.hex,
      hsl: { h: color.hsl.h, s: color.hsl.s, l: color.hsl.l }
    };
    this.render();
    this.notifyUpdate();
    return true;
  }

  toggleLock(id: string): boolean {
    const item = this.items.find(i => i.id === id);
    if (!item) return false;

    item.locked = !item.locked;
    this.render();
    this.notifyUpdate();
    return item.locked;
  }

  clear(): void {
    this.items = [];
    this.render();
    this.notifyUpdate();
  }

  getItems(): HistoryItem[] {
    return this.items.map(it => ({
      ...it,
      color: { ...it.color, hsl: { ...it.color.hsl } }
    }));
  }

  getItem(id: string): HistoryItem | undefined {
    const item = this.items.find(i => i.id === id);
    if (!item) return undefined;
    return {
      ...item,
      color: { ...item.color, hsl: { ...item.color.hsl } }
    };
  }

  getMaxItems(): number {
    return this.maxItems;
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

    const fragment = document.createDocumentFragment();

    this.items.forEach(item => {
      const swatch = document.createElement('div');
      swatch.className = `history-swatch${item.locked ? ' locked' : ''}`;
      swatch.dataset.id = item.id;
      swatch.title = item.color.hex;

      const colorDiv = document.createElement('div');
      colorDiv.className = 'swatch-color';
      colorDiv.style.backgroundColor = item.color.hex;
      swatch.appendChild(colorDiv);

      if (item.locked) {
        const lockIcon = document.createElement('div');
        lockIcon.className = 'swatch-lock';
        lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>`;
        swatch.appendChild(lockIcon);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'swatch-delete';
      deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
      deleteBtn.title = item.locked ? '已锁定，无法删除' : '删除';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onDelete) {
          this.onDelete(item.id);
        } else if (!item.locked) {
          this.removeColor(item.id);
        }
      });
      swatch.appendChild(deleteBtn);

      swatch.addEventListener('click', () => {
        if (this.onSelect) {
          const clone: HistoryItem = {
            ...item,
            color: { ...item.color, hsl: { ...item.color.hsl } }
          };
          this.onSelect(clone);
        }
      });

      fragment.appendChild(swatch);
    });

    this.container.appendChild(fragment);
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      const clone = this.items.map(it => ({
        ...it,
        color: { ...it.color, hsl: { ...it.color.hsl } }
      }));
      this.onUpdate(clone);
    }
  }

  private generateId(): string {
    return `color_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
