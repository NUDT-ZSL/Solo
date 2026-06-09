import { KEY_COLORS, rgbToHex, RGB } from './pixelEngine';

export class UIManager {
  private paletteGrid: HTMLElement;
  private historyDots: HTMLElement;
  private pixelCounter: HTMLElement;
  private brushSizeInput: HTMLInputElement;
  private brushSizeLabel: HTMLElement;
  private toastContainer: HTMLElement;
  private canvasOverlay: HTMLElement;
  private paletteElements: Map<string, HTMLElement> = new Map();
  private recentKeys: string[] = [];
  private highlightTimeouts: Map<string, number> = new Map();

  constructor() {
    const paletteGridEl = document.getElementById('paletteGrid');
    const historyDotsEl = document.getElementById('historyDots');
    const pixelCounterEl = document.getElementById('pixelCounter');
    const brushSizeInputEl = document.getElementById('brushSize');
    const brushSizeLabelEl = document.getElementById('brushSizeLabel');
    const toastContainerEl = document.getElementById('toastContainer');
    const canvasOverlayEl = document.getElementById('canvasOverlay');

    if (!paletteGridEl || !historyDotsEl || !pixelCounterEl ||
        !brushSizeInputEl || !brushSizeLabelEl || !toastContainerEl ||
        !canvasOverlayEl) {
      throw new Error('Required DOM elements not found');
    }

    this.paletteGrid = paletteGridEl;
    this.historyDots = historyDotsEl;
    this.pixelCounter = pixelCounterEl;
    this.brushSizeInput = brushSizeInputEl as HTMLInputElement;
    this.brushSizeLabel = brushSizeLabelEl;
    this.toastContainer = toastContainerEl;
    this.canvasOverlay = canvasOverlayEl;

    this.initPalette();
    this.initHistoryDots();
  }

  private initPalette(): void {
    const keys = Object.keys(KEY_COLORS);

    for (const key of keys) {
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.dataset.key = key;

      const colorSwatch = document.createElement('div');
      colorSwatch.className = 'palette-color';
      colorSwatch.style.backgroundColor = rgbToHex(KEY_COLORS[key]);

      const keyLabel = document.createElement('span');
      keyLabel.className = 'palette-key';
      keyLabel.textContent = key;

      item.appendChild(colorSwatch);
      item.appendChild(keyLabel);
      this.paletteGrid.appendChild(item);
      this.paletteElements.set(key, item);
    }
  }

  private initHistoryDots(): void {
    for (let i = 0; i < 10; i++) {
      const dot = document.createElement('div');
      dot.className = 'history-dot';
      this.historyDots.appendChild(dot);
    }
  }

  updatePalette(key: string): void {
    const element = this.paletteElements.get(key.toUpperCase());
    if (!element) return;

    element.classList.add('highlight');

    const existingTimeout = this.highlightTimeouts.get(key);
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    const timeoutId = window.setTimeout(() => {
      element.classList.remove('highlight');
      this.highlightTimeouts.delete(key);
    }, 500);

    this.highlightTimeouts.set(key, timeoutId);

    this.recentKeys.unshift(key);
    if (this.recentKeys.length > 10) {
      this.recentKeys.pop();
    }
    this.updateHistoryDots();
  }

  private updateHistoryDots(): void {
    const dots = this.historyDots.querySelectorAll('.history-dot');
    dots.forEach((dot, index) => {
      const key = this.recentKeys[index];
      if (key) {
        const color = KEY_COLORS[key.toUpperCase()];
        if (color) {
          (dot as HTMLElement).style.backgroundColor = rgbToHex(color);
        }
      } else {
        (dot as HTMLElement).style.backgroundColor = '';
      }
    });
  }

  updateCounter(count: number): void {
    this.pixelCounter.textContent = `${count} 像素`;
  }

  updateBrushSize(multiplier: number): void {
    const pixelSize = 8 * multiplier;
    this.brushSizeLabel.textContent = `${pixelSize}x${pixelSize}`;
  }

  getBrushSizeInput(): HTMLInputElement {
    return this.brushSizeInput;
  }

  showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  playClearAnimation(onComplete: () => void): void {
    this.canvasOverlay.classList.add('clearing');
    window.setTimeout(() => {
      this.canvasOverlay.classList.remove('clearing');
      onComplete();
    }, 500);
  }
}

export { KEY_COLORS };
export type { RGB };
