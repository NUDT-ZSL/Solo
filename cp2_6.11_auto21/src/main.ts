import { ColorProbe, ColorData, createColorData, hslToRgb } from './probe';
import { GradientGenerator } from './gradient';
import { HistoryManager, HistoryItem } from './history';

class ProbeController {
  private probeCanvas: HTMLCanvasElement;
  private gradientCanvas: HTMLCanvasElement;
  private colorProbe: ColorProbe;
  private gradientGenerator: GradientGenerator;
  private historyManager: HistoryManager;

  private currentColor: ColorData | null = null;
  private editingItemId: string | null = null;
  private isPanelCollapsed: boolean = false;
  private resizeTimeout: number | null = null;
  private debounceTimer: number | null = null;
  private crosshairAnimFrame: number | null = null;

  private elements: {
    uploadOverlay: HTMLElement;
    fileInput: HTMLInputElement;
    canvasWrapper: HTMLElement;
    hexValue: HTMLElement;
    rgbValue: HTMLElement;
    hslValue: HTMLElement;
    currentSwatch: HTMLElement;
    startColor: HTMLElement;
    endColor: HTMLElement;
    gradientModeBtn: HTMLElement;
    exportBtn: HTMLElement;
    copyToast: HTMLElement;
    crosshairInfo: HTMLElement;
    crosshairHex: HTMLElement;
    crosshairRgb: HTMLElement;
    crosshairHsl: HTMLElement;
    adjustPanel: HTMLElement;
    closeAdjustBtn: HTMLElement;
    lockBtn: HTMLElement;
    togglePanelBtn: HTMLElement;
    rightPanel: HTMLElement;
    clearBtn: HTMLElement;
    confirmModal: HTMLElement;
    cancelClearBtn: HTMLElement;
    confirmClearBtn: HTMLElement;
    loadingOverlay: HTMLElement;
    historyList: HTMLElement;
    rSlider: HTMLInputElement;
    gSlider: HTMLInputElement;
    bSlider: HTMLInputElement;
    hSlider: HTMLInputElement;
    sSlider: HTMLInputElement;
    lSlider: HTMLInputElement;
    rInput: HTMLInputElement;
    gInput: HTMLInputElement;
    bInput: HTMLInputElement;
    hInput: HTMLInputElement;
    sInput: HTMLInputElement;
    lInput: HTMLInputElement;
  };

  constructor() {
    this.probeCanvas = document.getElementById('probeCanvas') as HTMLCanvasElement;
    this.gradientCanvas = document.getElementById('gradientCanvas') as HTMLCanvasElement;

    this.elements = {
      uploadOverlay: document.getElementById('uploadOverlay') as HTMLElement,
      fileInput: document.getElementById('fileInput') as HTMLInputElement,
      canvasWrapper: document.querySelector('.canvas-wrapper') as HTMLElement,
      hexValue: document.getElementById('hexValue') as HTMLElement,
      rgbValue: document.getElementById('rgbValue') as HTMLElement,
      hslValue: document.getElementById('hslValue') as HTMLElement,
      currentSwatch: document.getElementById('currentSwatch') as HTMLElement,
      startColor: document.getElementById('startColor') as HTMLElement,
      endColor: document.getElementById('endColor') as HTMLElement,
      gradientModeBtn: document.getElementById('gradientModeBtn') as HTMLElement,
      exportBtn: document.getElementById('exportBtn') as HTMLElement,
      copyToast: document.getElementById('copyToast') as HTMLElement,
      crosshairInfo: document.getElementById('crosshairInfo') as HTMLElement,
      crosshairHex: document.getElementById('crosshairHex') as HTMLElement,
      crosshairRgb: document.getElementById('crosshairRgb') as HTMLElement,
      crosshairHsl: document.getElementById('crosshairHsl') as HTMLElement,
      adjustPanel: document.getElementById('adjustPanel') as HTMLElement,
      closeAdjustBtn: document.getElementById('closeAdjustBtn') as HTMLElement,
      lockBtn: document.getElementById('lockBtn') as HTMLElement,
      togglePanelBtn: document.getElementById('togglePanelBtn') as HTMLElement,
      rightPanel: document.getElementById('rightPanel') as HTMLElement,
      clearBtn: document.getElementById('clearBtn') as HTMLElement,
      confirmModal: document.getElementById('confirmModal') as HTMLElement,
      cancelClearBtn: document.getElementById('cancelClearBtn') as HTMLElement,
      confirmClearBtn: document.getElementById('confirmClearBtn') as HTMLElement,
      loadingOverlay: document.getElementById('loadingOverlay') as HTMLElement,
      historyList: document.getElementById('historyList') as HTMLElement,
      rSlider: document.getElementById('rSlider') as HTMLInputElement,
      gSlider: document.getElementById('gSlider') as HTMLInputElement,
      bSlider: document.getElementById('bSlider') as HTMLInputElement,
      hSlider: document.getElementById('hSlider') as HTMLInputElement,
      sSlider: document.getElementById('sSlider') as HTMLInputElement,
      lSlider: document.getElementById('lSlider') as HTMLInputElement,
      rInput: document.getElementById('rInput') as HTMLInputElement,
      gInput: document.getElementById('gInput') as HTMLInputElement,
      bInput: document.getElementById('bInput') as HTMLInputElement,
      hInput: document.getElementById('hInput') as HTMLInputElement,
      sInput: document.getElementById('sInput') as HTMLInputElement,
      lInput: document.getElementById('lInput') as HTMLInputElement,
    };

    this.colorProbe = new ColorProbe(this.probeCanvas, (color) => this.handleColorChange(color));
    this.gradientGenerator = new GradientGenerator(this.gradientCanvas);
    this.historyManager = new HistoryManager(this.elements.historyList, {
      onAdd: () => this.updateGradientFromHistory(),
      onRemove: () => this.updateGradientFromHistory(),
      onSelect: () => this.updateGradientFromHistory(),
      onClear: () => this.updateGradientFromHistory(),
      onItemClick: (item) => this.openAdjustPanel(item),
    });

    this.init();
  }

  private init(): void {
    this.setupCanvasSize();
    this.bindEvents();
    this.colorProbe.startTracking();
    this.gradientGenerator.draw();
    this.historyManager.render();
    this.startCrosshairInfoUpdate();
    this.hideLoading();
  }

  private setupCanvasSize(): void {
    const wrapper = this.elements.canvasWrapper;
    const rect = wrapper.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    this.probeCanvas.width = rect.width * dpr;
    this.probeCanvas.height = rect.height * dpr;
    
    const ctx = this.probeCanvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    
    this.probeCanvas.style.width = `${rect.width}px`;
    this.probeCanvas.style.height = `${rect.height}px`;
  }

  private bindEvents(): void {
    this.elements.uploadOverlay.addEventListener('click', () => {
      this.elements.fileInput.click();
    });

    this.elements.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.loadImage(target.files[0]);
      }
    });

    this.elements.canvasWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.uploadOverlay.classList.add('drag-over');
    });

    this.elements.canvasWrapper.addEventListener('dragleave', () => {
      this.elements.uploadOverlay.classList.remove('drag-over');
    });

    this.elements.canvasWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.uploadOverlay.classList.remove('drag-over');
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });

    this.probeCanvas.addEventListener('click', (_e) => {
      if (this.colorProbe.isImageLoaded() && this.currentColor) {
        this.addToHistory(this.currentColor);
      }
    });

    this.elements.gradientModeBtn.addEventListener('click', () => {
      const newType = this.gradientGenerator.toggleType();
      this.elements.gradientModeBtn.textContent = newType === 'linear' ? '线性渐变' : '径向渐变';
    });

    this.elements.exportBtn.addEventListener('click', () => {
      this.exportGradientCSS();
    });

    this.elements.closeAdjustBtn.addEventListener('click', () => {
      this.closeAdjustPanel();
    });

    this.elements.lockBtn.addEventListener('click', () => {
      this.toggleLockCurrent();
    });

    this.elements.togglePanelBtn.addEventListener('click', () => {
      this.togglePanel();
    });

    this.elements.clearBtn.addEventListener('click', () => {
      this.showConfirmModal();
    });

    this.elements.cancelClearBtn.addEventListener('click', () => {
      this.hideConfirmModal();
    });

    this.elements.confirmClearBtn.addEventListener('click', () => {
      this.historyManager.clearColors();
      this.hideConfirmModal();
    });

    this.elements.confirmModal.querySelector('.modal-overlay')?.addEventListener('click', () => {
      this.hideConfirmModal();
    });

    this.bindSliderEvents();

    window.addEventListener('resize', () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      this.resizeTimeout = window.setTimeout(() => {
        this.handleResize();
      }, 100);
    });
  }

  private bindSliderEvents(): void {
    const sliders = [
      { slider: this.elements.rSlider, input: this.elements.rInput, channel: 'r' },
      { slider: this.elements.gSlider, input: this.elements.gInput, channel: 'g' },
      { slider: this.elements.bSlider, input: this.elements.bInput, channel: 'b' },
      { slider: this.elements.hSlider, input: this.elements.hInput, channel: 'h' },
      { slider: this.elements.sSlider, input: this.elements.sInput, channel: 's' },
      { slider: this.elements.lSlider, input: this.elements.lInput, channel: 'l' },
    ];

    sliders.forEach(({ slider, input, channel }) => {
      slider.addEventListener('input', () => {
        input.value = slider.value;
        this.debounceAdjust(channel, parseInt(slider.value, 10));
      });

      input.addEventListener('input', () => {
        let val = parseInt(input.value, 10);
        const min = parseInt(input.min, 10);
        const max = parseInt(input.max, 10);
        val = Math.max(min, Math.min(max, isNaN(val) ? min : val));
        input.value = String(val);
        slider.value = String(val);
        this.debounceAdjust(channel, val);
      });
    });
  }

  private debounceAdjust(channel: string, value: number): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.adjustColor(channel, value);
    }, 50);
  }

  private adjustColor(channel: string, value: number): void {
    if (!this.editingItemId) return;

    const item = this.historyManager.getItem(this.editingItemId);
    if (!item) return;

    let color: ColorData;

    if (['r', 'g', 'b'].includes(channel)) {
      const rgb = { ...item.color.rgb };
      rgb[channel as 'r' | 'g' | 'b'] = value;
      color = createColorData(rgb.r, rgb.g, rgb.b);
      this.updateHSLSliders(color);
    } else {
      const hsl = { ...item.color.hsl };
      hsl[channel as 'h' | 's' | 'l'] = value;
      const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
      color = createColorData(rgb.r, rgb.g, rgb.b);
      this.updateRGBSliders(color);
    }

    this.historyManager.updateColor(this.editingItemId, color);
    this.updateGradientFromHistory();
    this.updateCurrentDisplay(color);
  }

  private updateRGBSliders(color: ColorData): void {
    this.elements.rSlider.value = String(color.rgb.r);
    this.elements.gSlider.value = String(color.rgb.g);
    this.elements.bSlider.value = String(color.rgb.b);
    this.elements.rInput.value = String(color.rgb.r);
    this.elements.gInput.value = String(color.rgb.g);
    this.elements.bInput.value = String(color.rgb.b);
  }

  private updateHSLSliders(color: ColorData): void {
    this.elements.hSlider.value = String(color.hsl.h);
    this.elements.sSlider.value = String(color.hsl.s);
    this.elements.lSlider.value = String(color.hsl.l);
    this.elements.hInput.value = String(color.hsl.h);
    this.elements.sInput.value = String(color.hsl.s);
    this.elements.lInput.value = String(color.hsl.l);
  }

  private async loadImage(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    this.showLoading();

    try {
      await this.colorProbe.loadImage(file);
      this.elements.uploadOverlay.classList.add('hidden');
    } catch (error) {
      console.error('Failed to load image:', error);
      alert('图片加载失败');
    } finally {
      this.hideLoading();
    }
  }

  private handleColorChange(color: ColorData | null): void {
    this.currentColor = color;
    if (color) {
      this.updateCurrentDisplay(color);
    }
  }

  private updateCurrentDisplay(color: ColorData): void {
    this.elements.hexValue.textContent = color.hex;
    this.elements.rgbValue.textContent = color.rgbString;
    this.elements.hslValue.textContent = color.hslString;
    this.elements.currentSwatch.style.backgroundColor = color.hex;
  }

  private addToHistory(color: ColorData): void {
    this.historyManager.addColor(color);
  }

  private updateGradientFromHistory(): void {
    const startItem = this.historyManager.getSelectedStart();
    const endItem = this.historyManager.getSelectedEnd();

    const startColor = startItem?.color.hex || '#FF0000';
    const endColor = endItem?.color.hex || '#0000FF';

    this.gradientGenerator.setColors(startColor, endColor);

    this.elements.startColor.style.backgroundColor = startColor;
    this.elements.endColor.style.backgroundColor = endColor;

    if (startItem) {
      this.elements.startColor.classList.add('selected');
    } else {
      this.elements.startColor.classList.remove('selected');
    }

    if (endItem) {
      this.elements.endColor.classList.add('selected');
    } else {
      this.elements.endColor.classList.remove('selected');
    }
  }

  private exportGradientCSS(): void {
    const css = this.gradientGenerator.generateCSS();
    navigator.clipboard.writeText(css).then(() => {
      this.showCopyToast();
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = css;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showCopyToast();
    });
  }

  private showCopyToast(): void {
    this.elements.copyToast.classList.add('show');
    setTimeout(() => {
      this.elements.copyToast.classList.remove('show');
    }, 3000);
  }

  private openAdjustPanel(item: HistoryItem): void {
    this.editingItemId = item.id;
    this.elements.adjustPanel.style.display = 'flex';
    
    this.updateRGBSliders(item.color);
    this.updateHSLSliders(item.color);
    this.updateCurrentDisplay(item.color);

    const isLocked = this.historyManager.isLocked(item.id);
    this.updateLockButton(isLocked);
  }

  private closeAdjustPanel(): void {
    this.editingItemId = null;
    this.elements.adjustPanel.style.display = 'none';
  }

  private toggleLockCurrent(): void {
    if (!this.editingItemId) return;
    const isLocked = this.historyManager.toggleLock(this.editingItemId);
    this.updateLockButton(isLocked);
  }

  private updateLockButton(locked: boolean): void {
    if (locked) {
      this.elements.lockBtn.textContent = '🔒';
      this.elements.lockBtn.classList.add('locked');
      this.elements.lockBtn.title = '解锁颜色';
    } else {
      this.elements.lockBtn.textContent = '🔓';
      this.elements.lockBtn.classList.remove('locked');
      this.elements.lockBtn.title = '锁定颜色';
    }
  }

  private togglePanel(): void {
    this.isPanelCollapsed = !this.isPanelCollapsed;
    if (this.isPanelCollapsed) {
      this.elements.rightPanel.classList.add('collapsed');
      this.elements.togglePanelBtn.textContent = '»';
    } else {
      this.elements.rightPanel.classList.remove('collapsed');
      this.elements.togglePanelBtn.textContent = '«';
    }
  }

  private showConfirmModal(): void {
    this.elements.confirmModal.style.display = 'flex';
  }

  private hideConfirmModal(): void {
    this.elements.confirmModal.style.display = 'none';
  }

  private showLoading(): void {
    this.elements.loadingOverlay.classList.remove('hidden');
  }

  private hideLoading(): void {
    setTimeout(() => {
      this.elements.loadingOverlay.classList.add('hidden');
    }, 300);
  }

  private handleResize(): void {
    this.setupCanvasSize();
    this.gradientGenerator.draw();
  }

  public destroy(): void {
    this.colorProbe.stopTracking();
    this.gradientGenerator.destroy();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ProbeController();
});
