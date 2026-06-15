import type { BrushConfig } from './brush';

export const INK_COLORS: { name: string; value: string }[] = [
  { name: '浓墨', value: '#1A1A1A' },
  { name: '淡墨', value: '#5A5A5A' },
  { name: '朱砂', value: '#C04040' },
  { name: '石青', value: '#2E6B8A' },
];

export const TEXTURE_TYPES: { name: string; value: 'danxuan' | 'sajin' | 'yunlong' }[] = [
  { name: '单宣', value: 'danxuan' },
  { name: '洒金', value: 'sajin' },
  { name: '云龙纸', value: 'yunlong' },
];

export const MAX_UNDO_STEPS = 50;

export interface UIState {
  brushSize: number;
  inkColor: string;
  inkColorName: string;
  textureType: 'danxuan' | 'sajin' | 'yunlong';
  undoCount: number;
  redoCount: number;
  currentWidth: number;
}

export class UIController {
  private state: UIState;
  private onBrushSizeChange: ((size: number) => void) | null = null;
  private onInkColorChange: ((color: string, name: string) => void) | null = null;
  private onTextureChange: ((texture: 'danxuan' | 'sajin' | 'yunlong') => void) | null = null;
  private onUndo: (() => void) | null = null;
  private onRedo: (() => void) | null = null;
  private onExport: (() => void) | null = null;
  private onClear: (() => void) | null = null;

  constructor(initialConfig: BrushConfig) {
    const inkEntry = INK_COLORS.find((c) => c.value === initialConfig.color) || INK_COLORS[0];
    this.state = {
      brushSize: initialConfig.baseSize,
      inkColor: initialConfig.color,
      inkColorName: inkEntry.name,
      textureType: initialConfig.textureType,
      undoCount: 0,
      redoCount: 0,
      currentWidth: 0,
    };
  }

  bindEvents(): void {
    const brushSlider = document.getElementById('brush-size') as HTMLInputElement;
    if (brushSlider) {
      brushSlider.addEventListener('input', () => {
        const size = parseInt(brushSlider.value, 10);
        this.state.brushSize = size;
        this.updateBrushSizeDisplay(size);
        if (this.onBrushSizeChange) this.onBrushSizeChange(size);
      });
    }

    const brushSizeVal = document.getElementById('brush-size-val');
    if (brushSizeVal) brushSizeVal.textContent = String(this.state.brushSize);

    INK_COLORS.forEach((ink) => {
      const btn = document.getElementById(`ink-${ink.value.slice(1)}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.selectInkColor(ink.value, ink.name);
        });
      }
    });

    TEXTURE_TYPES.forEach((tex) => {
      const btn = document.getElementById(`tex-${tex.value}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.selectTexture(tex.value);
        });
      }
    });

    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) undoBtn.addEventListener('click', () => { if (this.onUndo) this.onUndo(); });

    const redoBtn = document.getElementById('btn-redo');
    if (redoBtn) redoBtn.addEventListener('click', () => { if (this.onRedo) this.onRedo(); });

    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', () => { if (this.onExport) this.onExport(); });

    const clearBtn = document.getElementById('btn-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => { if (this.onClear) this.onClear(); });

    const exportConfirm = document.getElementById('export-confirm');
    if (exportConfirm) {
      exportConfirm.addEventListener('click', () => {
        this.handleExportConfirm();
      });
    }

    const exportCancel = document.getElementById('export-cancel');
    if (exportCancel) {
      exportCancel.addEventListener('click', () => {
        this.hideExportModal();
      });
    }

    const exportModal = document.getElementById('export-modal');
    if (exportModal) {
      exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) this.hideExportModal();
      });
    }

    this.updateInkSelection(this.state.inkColor);
    this.updateTextureSelection(this.state.textureType);
    this.updateUndoProgress();
  }

  setBrushSizeCallback(cb: (size: number) => void): void { this.onBrushSizeChange = cb; }
  setInkColorCallback(cb: (color: string, name: string) => void): void { this.onInkColorChange = cb; }
  setTextureCallback(cb: (texture: 'danxuan' | 'sajin' | 'yunlong') => void): void { this.onTextureChange = cb; }
  setUndoCallback(cb: () => void): void { this.onUndo = cb; }
  setRedoCallback(cb: () => void): void { this.onRedo = cb; }
  setExportCallback(cb: () => void): void { this.onExport = cb; }
  setClearCallback(cb: () => void): void { this.onClear = cb; }

  updateUndoState(undoCount: number, redoCount: number): void {
    this.state.undoCount = undoCount;
    this.state.redoCount = redoCount;
    this.updateUndoProgress();
    this.updateUndoRedoButtons();
  }

  updateCurrentWidth(width: number): void {
    this.state.currentWidth = Math.round(width);
    const el = document.getElementById('status-width');
    if (el) el.textContent = `${this.state.currentWidth}px`;
  }

  updateStatusInk(name: string): void {
    const el = document.getElementById('status-ink');
    if (el) el.textContent = name;
  }

  showExportModal(): void {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.add('active');
    this.updateExportPreview();
  }

  hideExportModal(): void {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.remove('active');
  }

  showExportLoading(): void {
    const loader = document.getElementById('export-loader');
    if (loader) loader.classList.add('active');
  }

  hideExportLoading(): void {
    const loader = document.getElementById('export-loader');
    if (loader) loader.classList.remove('active');
  }

  private selectInkColor(color: string, name: string): void {
    this.state.inkColor = color;
    this.state.inkColorName = name;
    this.updateInkSelection(color);
    this.updateStatusInk(name);
    if (this.onInkColorChange) this.onInkColorChange(color, name);
  }

  private selectTexture(texture: 'danxuan' | 'sajin' | 'yunlong'): void {
    this.state.textureType = texture;
    this.updateTextureSelection(texture);
    if (this.onTextureChange) this.onTextureChange(texture);
  }

  private updateBrushSizeDisplay(size: number): void {
    const el = document.getElementById('brush-size-val');
    if (el) el.textContent = String(size);
  }

  private updateInkSelection(color: string): void {
    INK_COLORS.forEach((ink) => {
      const btn = document.getElementById(`ink-${ink.value.slice(1)}`);
      if (btn) {
        if (ink.value === color) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      }
    });
  }

  private updateTextureSelection(texture: string): void {
    TEXTURE_TYPES.forEach((tex) => {
      const btn = document.getElementById(`tex-${tex.value}`);
      if (btn) {
        if (tex.value === texture) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      }
    });
  }

  private updateUndoProgress(): void {
    const bar = document.getElementById('undo-progress-bar');
    if (bar) {
      const percent = (this.state.undoCount / MAX_UNDO_STEPS) * 100;
      bar.style.width = `${percent}%`;
    }
    const undoSteps = document.getElementById('status-undo');
    if (undoSteps) undoSteps.textContent = `${this.state.undoCount}/${MAX_UNDO_STEPS}`;
  }

  private updateUndoRedoButtons(): void {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) {
      undoBtn.classList.toggle('disabled', this.state.undoCount === 0);
    }
    if (redoBtn) {
      redoBtn.classList.toggle('disabled', this.state.redoCount === 0);
    }
  }

  private updateExportPreview(): void {
    const previewImg = document.getElementById('export-preview-img') as HTMLImageElement;
    if (previewImg) {
      previewImg.src = '';
    }
  }

  private handleExportConfirm(): void {
    const resSel = document.getElementById('export-resolution') as HTMLSelectElement;
    const fmtSel = document.getElementById('export-format') as HTMLSelectElement;
    const resolution = resSel ? (parseInt(resSel.value, 10) as 1 | 2 | 4) : 4;
    const format = fmtSel ? (fmtSel.value as 'png' | 'svg') : 'png';

    const detail = { resolution, format };
    const event = new CustomEvent('export-confirm', { detail });
    document.dispatchEvent(event);
  }

  toggleMobileDrawer(): void {
    const toolbar = document.getElementById('toolbar');
    if (toolbar) toolbar.classList.toggle('drawer-open');
  }
}
