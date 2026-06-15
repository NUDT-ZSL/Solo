import { ElementType, getElementName, getElementEmoji, getElementColor } from './runeRecognizer';

export interface HistoryItem {
  id: number;
  elements: ElementType[];
  comboName?: string;
  timestamp: Date;
}

export interface UIManagerOptions {
  onElementChange?: (element: ElementType) => void;
  onClear?: () => void;
  onHistorySelect?: (item: HistoryItem) => void;
}

export class UIManager {
  private currentElement: ElementType = 'fire';
  private history: HistoryItem[] = [];
  private historyIdCounter: number = 0;
  private isHistoryPanelOpen: boolean = false;
  private floatingTextTimer: number | null = null;
  private shakeTimer: number | null = null;

  private options: UIManagerOptions;

  constructor(options: UIManagerOptions = {}) {
    this.options = options;
    this.initEventListeners();
    this.updateElementUI();
  }

  private initEventListeners(): void {
    const toolButtons = document.querySelectorAll('.tool-btn[data-element]');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const element = (e.currentTarget as HTMLElement).dataset.element as ElementType;
        this.setCurrentElement(element);
      });
    });

    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.options.onClear?.();
      });
    }

    const historyBtn = document.getElementById('history-btn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        this.toggleHistoryPanel();
      });
    }
  }

  setCurrentElement(element: ElementType): void {
    this.currentElement = element;
    this.updateElementUI();
    this.options.onElementChange?.(element);
  }

  getCurrentElement(): ElementType {
    return this.currentElement;
  }

  private updateElementUI(): void {
    const buttons = document.querySelectorAll('.tool-btn[data-element]');
    buttons.forEach(btn => {
      const btnEl = btn as HTMLElement;
      if (btnEl.dataset.element === this.currentElement) {
        btnEl.classList.add('active');
      } else {
        btnEl.classList.remove('active');
      }
    });

    const canvasWrapper = document.getElementById('canvas-wrapper');
    if (canvasWrapper) {
      canvasWrapper.classList.remove('fire', 'thunder', 'wind', 'earth');
      canvasWrapper.classList.add(this.currentElement);
    }

    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      toolbar.classList.remove('fire', 'thunder', 'wind', 'earth');
      toolbar.classList.add(this.currentElement);
    }

    this.updateElementAura();
  }

  private updateElementAura(): void {
    const aura = document.getElementById('element-aura');
    const corners = aura?.querySelectorAll('.aura-corner');
    if (!corners) return;

    const colors = getElementColor(this.currentElement);
    const color = colors.start;

    corners.forEach(corner => {
      (corner as HTMLElement).style.background = color;
    });

    aura?.classList.add('show');
  }

  showFloatingText(text: string, element?: ElementType): void {
    const floatEl = document.getElementById('floating-text');
    if (!floatEl) return;

    if (this.floatingTextTimer) {
      clearTimeout(this.floatingTextTimer);
      floatEl.classList.remove('show');
    }

    floatEl.textContent = text;

    if (element) {
      const colors = getElementColor(element);
      floatEl.style.color = colors.end;
    } else {
      floatEl.style.color = '#fff';
    }

    requestAnimationFrame(() => {
      floatEl.classList.add('show');
    });

    this.floatingTextTimer = window.setTimeout(() => {
      floatEl.classList.remove('show');
      this.floatingTextTimer = null;
    }, 2000);
  }

  triggerFlash(): void {
    const flashEl = document.getElementById('flash-overlay');
    if (!flashEl) return;

    flashEl.classList.remove('show');
    void flashEl.offsetWidth;
    flashEl.classList.add('show');

    setTimeout(() => {
      flashEl.classList.remove('show');
    }, 50);
  }

  triggerShake(): void {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

    if (this.shakeTimer) {
      clearTimeout(this.shakeTimer);
      wrapper.classList.remove('shaking');
    }

    wrapper.classList.remove('shaking');
    void wrapper.offsetWidth;
    wrapper.classList.add('shaking');

    this.shakeTimer = window.setTimeout(() => {
      wrapper.classList.remove('shaking');
      this.shakeTimer = null;
    }, 200);
  }

  addToHistory(elements: ElementType[], comboName?: string): void {
    const item: HistoryItem = {
      id: ++this.historyIdCounter,
      elements: [...elements],
      comboName,
      timestamp: new Date()
    };

    this.history.unshift(item);

    if (this.history.length > 5) {
      this.history.pop();
    }

    this.updateHistoryUI();
    this.updateThumbnails();
  }

  private updateHistoryUI(): void {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;

    if (this.history.length === 0) {
      listEl.innerHTML = '<div class="history-empty">暂无历史记录</div>';
      return;
    }

    listEl.innerHTML = '';

    this.history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.dataset.id = String(item.id);

      const icon = document.createElement('div');
      icon.className = 'history-icon';
      icon.textContent = item.elements.map(e => getElementEmoji(e)).join('');
      div.appendChild(icon);

      const info = document.createElement('div');
      info.className = 'history-info';

      const name = document.createElement('div');
      name.className = 'history-name';
      name.textContent = item.comboName || item.elements.map(e => getElementName(e) + '元素').join(' + ');
      info.appendChild(name);

      const time = document.createElement('div');
      time.className = 'history-time';
      time.textContent = this.formatTime(item.timestamp);
      info.appendChild(time);

      div.appendChild(info);

      div.addEventListener('click', () => {
        this.options.onHistorySelect?.(item);
      });

      listEl.appendChild(div);
    });
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private updateThumbnails(): void {
    const container = document.getElementById('rune-thumbnails');
    if (!container) return;

    const label = container.querySelector('span');

    container.innerHTML = '';
    if (label) container.appendChild(label);

    if (this.history.length === 0) return;

    const latest = this.history[0];

    latest.elements.forEach((element, index) => {
      if (index > 0) {
        const plus = document.createElement('span');
        plus.className = 'rune-combo-plus';
        plus.textContent = '+';
        container.appendChild(plus);
      }

      const thumb = document.createElement('div');
      thumb.className = `rune-thumb ${element}`;
      thumb.textContent = getElementEmoji(element);
      container.appendChild(thumb);

      setTimeout(() => {
        thumb.classList.add('show');
      }, index * 100);
    });
  }

  toggleHistoryPanel(): void {
    const panel = document.getElementById('history-panel');
    if (!panel) return;

    this.isHistoryPanelOpen = !this.isHistoryPanelOpen;

    if (this.isHistoryPanelOpen) {
      panel.classList.add('show');
    } else {
      panel.classList.remove('show');
    }
  }

  clearHistory(): void {
    this.history = [];
    this.updateHistoryUI();
    this.updateThumbnails();
  }

  getHistory(): HistoryItem[] {
    return [...this.history];
  }

  clearCanvasWithAnimation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<void> {
    return new Promise((resolve) => {
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOut = 1 - Math.pow(1 - progress, 3);

        ctx.fillStyle = `rgba(11, 0, 20, ${easeOut * 0.15})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          ctx.fillStyle = '#0B0014';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }
}
