import type { ExportFormat, ExportScale } from './export';

export interface ToolState {
  brushSize: number;
  inkColor: string;
  inkColorName: string;
  texture: 'plain' | 'gold' | 'cloud';
  textureName: string;
  historyCount: number;
  redoCount: number;
  maxHistory: number;
}

export type UIToolEvent =
  | { type: 'brushSizeChanged'; value: number }
  | { type: 'colorChanged'; value: string; name: string }
  | { type: 'textureChanged'; value: 'plain' | 'gold' | 'cloud'; name: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }
  | { type: 'reset' }
  | { type: 'export' }
  | { type: 'exportConfirmed'; format: ExportFormat; scale: ExportScale }
  | { type: 'exportCancelled' };

const COLOR_MAP: Record<string, string> = {
  '#1A1A1A': '浓墨',
  '#5A5A5A': '淡墨',
  '#C04040': '朱砂',
  '#2E6B8A': '石青'
};

const TEXTURE_MAP: Record<string, string> = {
  plain: '单宣',
  gold: '洒金',
  cloud: '云龙纸'
};

export class UIController {
  private state: ToolState;
  private listeners: Set<(event: UIToolEvent) => void> = new Set();
  private toolbar: HTMLElement;
  private mobileToggle: HTMLElement;
  private exportModal: HTMLElement;
  private exportFormat: ExportFormat = 'png';
  private exportScale: ExportScale = 4;

  constructor() {
    this.state = {
      brushSize: 10,
      inkColor: '#1A1A1A',
      inkColorName: '浓墨',
      texture: 'plain',
      textureName: '单宣',
      historyCount: 0,
      redoCount: 0,
      maxHistory: 50
    };

    this.toolbar = document.getElementById('toolbar') as HTMLElement;
    this.mobileToggle = document.getElementById('mobileToggle') as HTMLElement;
    this.exportModal = document.getElementById('exportModal') as HTMLElement;

    this.bindEvents();
  }

  getState(): ToolState {
    return { ...this.state };
  }

  onEvent(callback: (event: UIToolEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: UIToolEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  updateHistory(historyCount: number, redoCount: number): void {
    this.state.historyCount = historyCount;
    this.state.redoCount = redoCount;
    this.updateStatusBar();
    this.updateUndoRedoButtons();
  }

  setExportLoading(loading: boolean): void {
    const spinner = document.getElementById('exportSpinner');
    const btnText = document.getElementById('exportBtnText');
    const confirmBtn = document.getElementById('confirmExport') as HTMLButtonElement;

    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
    if (btnText) btnText.textContent = loading ? '导出中...' : '确认下载';
    if (confirmBtn) confirmBtn.disabled = loading;
  }

  showExportModal(): void {
    this.exportModal.classList.add('active');
  }

  hideExportModal(): void {
    this.exportModal.classList.remove('active');
    this.setExportLoading(false);
  }

  private bindEvents(): void {
    const sizeSlider = document.getElementById('sizeSlider') as HTMLInputElement;
    sizeSlider.addEventListener('input', () => {
      const value = parseInt(sizeSlider.value, 10);
      this.state.brushSize = value;
      this.updateSizeDisplay();
      this.emit({ type: 'brushSizeChanged', value });
    });

    const colorDots = document.querySelectorAll('#colorPalette .color-dot');
    colorDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        colorDots.forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');

        const color = (dot as HTMLElement).dataset.color || '#1A1A1A';
        this.state.inkColor = color;
        this.state.inkColorName = COLOR_MAP[color] || '墨色';
        this.updateStatusBar();
        this.emit({ type: 'colorChanged', value: color, name: this.state.inkColorName });
      });
    });

    const textureBtns = document.querySelectorAll('#textureButtons .texture-btn');
    textureBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        textureBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const texture = ((btn as HTMLElement).dataset.texture || 'plain') as 'plain' | 'gold' | 'cloud';
        this.state.texture = texture;
        this.state.textureName = TEXTURE_MAP[texture] || '单宣';
        this.updateStatusBar();
        this.emit({ type: 'textureChanged', value: texture, name: this.state.textureName });
      });
    });

    const undoBtn = document.getElementById('undoBtn');
    undoBtn?.addEventListener('click', () => this.emit({ type: 'undo' }));

    const redoBtn = document.getElementById('redoBtn');
    redoBtn?.addEventListener('click', () => this.emit({ type: 'redo' }));

    const clearBtn = document.getElementById('clearBtn');
    clearBtn?.addEventListener('click', () => this.emit({ type: 'clear' }));

    const resetBtn = document.getElementById('resetBtn');
    resetBtn?.addEventListener('click', () => this.emit({ type: 'reset' }));

    const exportBtn = document.getElementById('exportBtn');
    exportBtn?.addEventListener('click', () => this.emit({ type: 'export' }));

    this.mobileToggle.addEventListener('click', () => {
      this.toolbar.classList.toggle('open');
    });

    const cancelExport = document.getElementById('cancelExport');
    cancelExport?.addEventListener('click', () => {
      this.hideExportModal();
      this.emit({ type: 'exportCancelled' });
    });

    const confirmExport = document.getElementById('confirmExport');
    confirmExport?.addEventListener('click', () => {
      this.emit({
        type: 'exportConfirmed',
        format: this.exportFormat,
        scale: this.exportScale
      });
    });

    const formatBtns = document.querySelectorAll('#formatButtons .option-btn');
    formatBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        formatBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.exportFormat = ((btn as HTMLElement).dataset.format || 'png') as ExportFormat;
        this.updateResolutionVisibility();
      });
    });

    const resBtns = document.querySelectorAll('#resolutionButtons .option-btn');
    resBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        resBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.exportScale = parseInt((btn as HTMLElement).dataset.scale || '4', 10) as ExportScale;
      });
    });

    this.exportModal.addEventListener('click', (e) => {
      if (e.target === this.exportModal) {
        this.hideExportModal();
        this.emit({ type: 'exportCancelled' });
      }
    });

    this.updateSizeDisplay();
    this.updateStatusBar();
    this.updateUndoRedoButtons();
  }

  private updateSizeDisplay(): void {
    const sizeValue = document.getElementById('sizeValue');
    if (sizeValue) {
      sizeValue.textContent = `${this.state.brushSize} px`;
    }
  }

  private updateStatusBar(): void {
    const statusWidth = document.getElementById('statusWidth');
    if (statusWidth) statusWidth.textContent = String(this.state.brushSize);

    const statusColor = document.getElementById('statusColor');
    if (statusColor) statusColor.style.background = this.state.inkColor;

    const statusColorName = document.getElementById('statusColorName');
    if (statusColorName) statusColorName.textContent = this.state.inkColorName;

    const statusTexture = document.getElementById('statusTexture');
    if (statusTexture) statusTexture.textContent = this.state.textureName;

    const statusHistory = document.getElementById('statusHistory');
    if (statusHistory) {
      statusHistory.textContent = `${this.state.historyCount} / ${this.state.maxHistory}`;
    }

    const progress = document.getElementById('historyProgress');
    if (progress) {
      const percent = (this.state.historyCount / this.state.maxHistory) * 100;
      progress.style.width = `${Math.min(100, percent)}%`;
    }
  }

  private updateUndoRedoButtons(): void {
    const undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    const redoBtn = document.getElementById('redoBtn') as HTMLButtonElement;

    if (undoBtn) undoBtn.disabled = this.state.historyCount === 0;
    if (redoBtn) redoBtn.disabled = this.state.redoCount === 0;
  }

  private updateResolutionVisibility(): void {
    const resGroup = document.getElementById('resolutionGroup');
    if (resGroup) {
      resGroup.style.display = this.exportFormat === 'png' ? 'flex' : 'none';
    }
  }
}
