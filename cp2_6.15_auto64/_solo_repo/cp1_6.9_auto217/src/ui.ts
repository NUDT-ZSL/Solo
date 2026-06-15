export const TRADITIONAL_COLORS: { name: string; hex: string }[] = [
  { name: '墨黑', hex: '#1a1a1a' },
  { name: '朱砂', hex: '#e74c3c' },
  { name: '藤黄', hex: '#f1c40f' },
  { name: '石青', hex: '#2c82c9' },
  { name: '石绿', hex: '#27ae60' },
  { name: '胭脂', hex: '#c0392b' },
  { name: '赭石', hex: '#a0522d' },
  { name: '钛白', hex: '#f5f5f5' }
];

export interface UIState {
  brushSize: number;
  selectedColor: string;
  selectedColorName: string;
}

export interface UICallbacks {
  onBrushSizeChange: (size: number) => void;
  onColorChange: (hex: string, name: string) => void;
  onClear: () => void;
  onExport: () => void;
}

export class ToolbarUI {
  private container: HTMLElement;
  private exportBtn: HTMLButtonElement;
  private brushSlider: HTMLInputElement;
  private brushValueDisplay: HTMLSpanElement;
  private clearBtn: HTMLButtonElement;
  private state: UIState;
  private callbacks: UICallbacks;

  constructor(parent: HTMLElement, state: UIState, callbacks: UICallbacks) {
    this.state = state;
    this.callbacks = callbacks;

    this.container = document.createElement('div');
    this.container.className = 'toolbar glass-panel';
    this.container.id = 'toolbar';

    this.brushSlider = this.createBrushSlider();
    this.brushValueDisplay = document.createElement('span');
    this.brushValueDisplay.className = 'brush-value';
    this.brushValueDisplay.textContent = `${state.brushSize}px`;

    const colorPalette = this.createColorPalette();
    this.clearBtn = this.createClearButton();

    const brushSection = document.createElement('div');
    brushSection.className = 'tool-section';
    const brushLabel = document.createElement('label');
    brushLabel.className = 'tool-label';
    brushLabel.textContent = '笔刷大小';
    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'slider-wrap';
    sliderWrap.appendChild(this.brushSlider);
    sliderWrap.appendChild(this.brushValueDisplay);
    brushSection.appendChild(brushLabel);
    brushSection.appendChild(sliderWrap);

    const colorSection = document.createElement('div');
    colorSection.className = 'tool-section';
    const colorLabel = document.createElement('label');
    colorLabel.className = 'tool-label';
    colorLabel.textContent = '传统色';
    colorSection.appendChild(colorLabel);
    colorSection.appendChild(colorPalette);

    const clearSection = document.createElement('div');
    clearSection.className = 'tool-section';
    clearSection.appendChild(this.clearBtn);

    this.container.appendChild(brushSection);
    this.container.appendChild(colorSection);
    this.container.appendChild(clearSection);

    parent.appendChild(this.container);

    this.exportBtn = this.createExportButton();
    parent.appendChild(this.exportBtn);
  }

  private createBrushSlider(): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '50';
    slider.value = String(this.state.brushSize);
    slider.className = 'brush-slider';
    slider.addEventListener('input', () => {
      const size = parseInt(slider.value, 10);
      this.state.brushSize = size;
      this.brushValueDisplay.textContent = `${size}px`;
      this.callbacks.onBrushSizeChange(size);
    });
    return slider;
  }

  private createColorPalette(): HTMLElement {
    const palette = document.createElement('div');
    palette.className = 'color-palette';

    TRADITIONAL_COLORS.forEach((c) => {
      const swatch = document.createElement('button');
      swatch.className = 'color-swatch';
      if (c.hex === this.state.selectedColor) {
        swatch.classList.add('selected');
      }
      swatch.style.background = c.hex;
      swatch.title = c.name;
      swatch.setAttribute('data-color', c.hex);
      swatch.setAttribute('data-name', c.name);
      swatch.addEventListener('click', () => {
        palette.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('selected'));
        swatch.classList.add('selected');
        this.state.selectedColor = c.hex;
        this.state.selectedColorName = c.name;
        this.callbacks.onColorChange(c.hex, c.name);
      });
      palette.appendChild(swatch);
    });

    return palette;
  }

  private createClearButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'clear-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/>
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      <span>清除画布</span>
    `;
    btn.addEventListener('click', () => this.callbacks.onClear());
    return btn;
  }

  private createExportButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'export-btn';
    btn.id = 'exportBtn';
    btn.type = 'button';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>导出</span>
      <div class="shine"></div>
    `;
    btn.addEventListener('click', () => this.callbacks.onExport());
    return btn;
  }

  showExportProgress(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'export-overlay';
    overlay.innerHTML = `
      <div class="export-modal glass-panel">
        <div class="spinner"></div>
        <div class="export-text">导出中...</div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  hideExportProgress(overlay: HTMLDivElement): void {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }
}
