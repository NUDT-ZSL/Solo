import { ColorData } from './probe';

export interface HistoryItem {
  id: string;
  color: ColorData;
  locked: boolean;
  timestamp: number;
}

export type HistoryUpdateCallback = (items: HistoryItem[]) => void;

export class ColorHistory {
  private items: HistoryItem[] = [];
  private maxItems: number = 20;
  private container: HTMLElement | null = null;
  private onUpdate: HistoryUpdateCallback | null = null;
  private onSelect: ((item: HistoryItem) => void) | null = null;
  private onDelete: ((id: string) => void) | null = null;

  constructor(maxItems: number = 20) {
    this.maxItems = maxItems;
  }

  setContainer(container: HTMLElement): void {
    this.container = container;
  }

  setOnUpdate(callback: HistoryUpdateCallback): void {
    this.onUpdate = callback;
  }

  setOnSelect(callback: (item: HistoryItem) => void): void {
    this.onSelect = callback;
  }

  setOnDelete(callback: (id: string) => void): void {
    this.onDelete = callback;
  }

  addColor(color: ColorData): HistoryItem {
    const item: HistoryItem = {
      id: this.generateId(),
      color: { ...color },
      locked: false,
      timestamp: Date.now()
    };

    this.items.unshift(item);

    if (this.items.length > this.maxItems) {
      const unlockedItems = this.items.filter(i => !i.locked);
      if (unlockedItems.length > 0) {
        const oldestUnlocked = unlockedItems[unlockedItems.length - 1];
        this.items = this.items.filter(i => i.id !== oldestUnlocked.id);
      }
    }

    this.render();
    this.notifyUpdate();
    return item;
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

    item.color = { ...color };
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
    return [...this.items];
  }

  getItem(id: string): HistoryItem | undefined {
    return this.items.find(i => i.id === id);
  }

  getMaxItems(): number {
    return this.maxItems;
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

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
        lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>`;
        swatch.appendChild(lockIcon);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'swatch-delete';
      deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
      deleteBtn.title = '删除';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onDelete) {
          this.onDelete(item.id);
        } else {
          this.removeColor(item.id);
        }
      });
      swatch.appendChild(deleteBtn);

      swatch.addEventListener('click', () => {
        if (this.onSelect) {
          this.onSelect(item);
        }
      });

      this.container!.appendChild(swatch);
    });
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      this.onUpdate([...this.items]);
    }
  }

  private generateId(): string {
    return `color_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
