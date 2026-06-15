import { ColorData } from './probe';

export interface HistoryItem {
  id: string;
  color: ColorData;
  locked: boolean;
  timestamp: number;
}

export type SelectionMode = 'start' | 'end' | null;

export class HistoryManager {
  private items: HistoryItem[] = [];
  private readonly maxItems: number = 20;
  private container: HTMLElement;
  private selectedStartId: string | null = null;
  private selectedEndId: string | null = null;

  private onAdd?: (item: HistoryItem) => void;
  private onRemove?: (id: string) => void;
  private onSelect?: (item: HistoryItem, mode: 'start' | 'end') => void;
  private onClear?: () => void;
  private onItemClick?: (item: HistoryItem) => void;

  constructor(
    container: HTMLElement,
    callbacks?: {
      onAdd?: (item: HistoryItem) => void;
      onRemove?: (id: string) => void;
      onSelect?: (item: HistoryItem, mode: 'start' | 'end') => void;
      onClear?: () => void;
      onItemClick?: (item: HistoryItem) => void;
    }
  ) {
    this.container = container;
    this.onAdd = callbacks?.onAdd;
    this.onRemove = callbacks?.onRemove;
    this.onSelect = callbacks?.onSelect;
    this.onClear = callbacks?.onClear;
    this.onItemClick = callbacks?.onItemClick;
  }

  addColor(color: ColorData): HistoryItem {
    const item: HistoryItem = {
      id: this.generateId(),
      color,
      locked: false,
      timestamp: Date.now()
    };

    this.items.push(item);
    this.trimItems();
    this.render();
    this.onAdd?.(item);

    return item;
  }

  removeColor(id: string): boolean {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;

    const item = this.items[index];
    if (item.locked) return false;

    this.items.splice(index, 1);

    if (this.selectedStartId === id) {
      this.selectedStartId = null;
    }
    if (this.selectedEndId === id) {
      this.selectedEndId = null;
    }

    this.render();
    this.onRemove?.(id);

    return true;
  }

  clearColors(): void {
    this.items = this.items.filter(item => item.locked);
    this.selectedStartId = null;
    this.selectedEndId = null;
    this.render();
    this.onClear?.();
  }

  toggleLock(id: string): boolean {
    const item = this.items.find(i => i.id === id);
    if (!item) return false;

    item.locked = !item.locked;
    this.render();

    return item.locked;
  }

  isLocked(id: string): boolean {
    const item = this.items.find(i => i.id === id);
    return item?.locked ?? false;
  }

  selectAsStart(id: string): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    this.selectedStartId = id;
    this.render();
    this.onSelect?.(item, 'start');
  }

  selectAsEnd(id: string): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    this.selectedEndId = id;
    this.render();
    this.onSelect?.(item, 'end');
  }

  getSelectedStart(): HistoryItem | null {
    return this.items.find(i => i.id === this.selectedStartId) || null;
  }

  getSelectedEnd(): HistoryItem | null {
    return this.items.find(i => i.id === this.selectedEndId) || null;
  }

  getItem(id: string): HistoryItem | null {
    return this.items.find(i => i.id === id) || null;
  }

  updateColor(id: string, color: ColorData): boolean {
    const item = this.items.find(i => i.id === id);
    if (!item) return false;

    item.color = color;
    this.render();

    return true;
  }

  getItems(): HistoryItem[] {
    return [...this.items];
  }

  getCount(): number {
    return this.items.length;
  }

  private trimItems(): void {
    const unlockedItems = this.items.filter(item => !item.locked);

    if (unlockedItems.length > this.maxItems) {
      const toRemove = unlockedItems.length - this.maxItems;
      const removed = unlockedItems.slice(0, toRemove);
      const removedIds = new Set(removed.map(r => r.id));

      this.items = this.items.filter(item => !removedIds.has(item.id));

      removed.forEach(r => {
        if (this.selectedStartId === r.id) this.selectedStartId = null;
        if (this.selectedEndId === r.id) this.selectedEndId = null;
      });
    }
  }

  private generateId(): string {
    return `color_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  render(): void {
    this.container.innerHTML = '';

    if (this.items.length === 0) {
      this.container.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; padding: 10px;">暂无历史记录，点击图片取色</p>';
      return;
    }

    this.items.forEach(item => {
      const el = this.createItemElement(item);
      this.container.appendChild(el);
    });
  }

  private createItemElement(item: HistoryItem): HTMLElement {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.style.backgroundColor = item.color.hex;
    div.dataset.id = item.id;
    div.title = item.color.hex;

    if (item.locked) {
      div.classList.add('locked');
    }

    if (item.id === this.selectedStartId) {
      div.classList.add('selected-start');
    }
    if (item.id === this.selectedEndId) {
      div.classList.add('selected-end');
    }

    const lockIcon = document.createElement('span');
    lockIcon.className = 'lock-icon';
    lockIcon.textContent = '🔒';
    div.appendChild(lockIcon);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = '删除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeColor(item.id);
    });
    div.appendChild(deleteBtn);

    div.addEventListener('click', () => {
      this.handleItemClick(item);
    });

    div.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.toggleLock(item.id);
    });

    return div;
  }

  private handleItemClick(item: HistoryItem): void {
    this.onItemClick?.(item);

    if (!this.selectedStartId || this.selectedStartId === item.id) {
      this.selectAsStart(item.id);
    } else if (!this.selectedEndId || this.selectedEndId === item.id) {
      this.selectAsEnd(item.id);
    } else {
      this.selectAsStart(item.id);
    }
  }
}
