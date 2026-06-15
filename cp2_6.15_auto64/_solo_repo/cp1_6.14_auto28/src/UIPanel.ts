export type ToolType = 'single' | 'sphere' | 'fill' | 'eraser';

export const PRESET_COLORS: string[] = [
  '#ff3366', '#ff9933', '#ffcc33', '#33cc66', '#33ccaa', '#3399ff',
  '#cc66ff', '#ff66cc', '#ff4444', '#ff8844', '#ffdd55', '#66dd66',
  '#66dddd', '#6699ff', '#aa66ff', '#ff66aa', '#cc3333', '#cc6600',
  '#ccaa00', '#339933', '#339999', '#3366cc', '#8833cc', '#cc3388',
  '#eebb99', '#99cc99', '#99aacc', '#cc99cc', '#dddddd', '#888899'
];

export interface UIPanelCallbacks {
  onColorChange: (color: string) => void;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onBrushSizeChange: (size: number) => void;
}

export class UIPanel {
  private container: HTMLDivElement;
  private currentColor: string = PRESET_COLORS[0];
  private currentTool: ToolType = 'single';
  private brushSize: number = 1;
  private callbacks: UIPanelCallbacks;
  private brushHint: HTMLDivElement;
  private hintTimeout: number | null = null;

  constructor(callbacks: UIPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.brushHint = this.createBrushHint();
    document.body.appendChild(this.brushHint);
    this.buildUI();
    this.applyResponsive();
    window.addEventListener('resize', () => this.applyResponsive());
    document.body.appendChild(this.container);
  }

  private createBrushHint(): HTMLDivElement {
    const hint = document.createElement('div');
    hint.textContent = 'Brush Size: 1';
    hint.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%) scale(0.95);
      padding: 10px 24px;
      background: rgba(15, 16, 25, 0.92);
      color: #ffffff;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
    `;
    return hint;
  }

  public showBrushHint(): void {
    this.brushHint.textContent = `Brush Size: ${this.brushSize}`;
    this.brushHint.style.opacity = '1';
    this.brushHint.style.transform = 'translateX(-50%) scale(1)';
    if (this.hintTimeout) window.clearTimeout(this.hintTimeout);
    this.hintTimeout = window.setTimeout(() => {
      this.brushHint.style.opacity = '0';
      this.brushHint.style.transform = 'translateX(-50%) scale(0.95)';
      this.hintTimeout = null;
    }, 2000);
  }

  private applyResponsive(): void {
    const isMobile = window.innerWidth < 900;

    if (isMobile) {
      this.container.style.cssText = `
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: 90px;
        background: #2a2b36;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        z-index: 100;
        overflow-x: auto;
        overflow-y: hidden;
        border-top-left-radius: 14px;
        border-top-right-radius: 14px;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.4);
        flex-wrap: nowrap;
      `;

      const title = this.container.querySelector('.vf-title') as HTMLElement;
      if (title) title.style.display = 'none';

      const palette = this.container.querySelector('.vf-palette') as HTMLElement;
      if (palette) {
        palette.style.cssText = `
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 5px;
          overflow-x: auto;
          overflow-y: hidden;
          min-width: 200px;
          flex-shrink: 0;
          padding: 4px 2px;
        `;
        palette.querySelectorAll('.vf-color-swatch').forEach((sw) => {
          (sw as HTMLElement).style.display = 'inline-block';
          (sw as HTMLElement).style.flexShrink = '0';
        });
      }

      const tools = this.container.querySelector('.vf-tools') as HTMLElement;
      if (tools) {
        tools.style.cssText = `display: flex; gap: 5px; flex-shrink: 0;`;
      }

      const historyBtns = this.container.querySelector('.vf-history') as HTMLElement;
      if (historyBtns) {
        historyBtns.style.cssText = `display: flex; gap: 5px; flex-shrink: 0;`;
      }

      const exportWrapper = this.container.querySelector('.vf-export-wrapper') as HTMLElement;
      if (exportWrapper) {
        exportWrapper.style.cssText = `display: flex; flex-shrink: 0;`;
      }
    } else {
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 280px;
        height: 100%;
        background: #2a2b36;
        padding: 24px 16px;
        z-index: 100;
        overflow-y: auto;
        box-sizing: border-box;
        box-shadow: -4px 0 20px rgba(0,0,0,0.3);
        display: block;
      `;

      const title = this.container.querySelector('.vf-title') as HTMLElement;
      if (title) {
        title.style.display = 'block';
        title.style.cssText = `
          color: #ffffff;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 20px;
          letter-spacing: 0.5px;
        `;
      }

      const palette = this.container.querySelector('.vf-palette') as HTMLElement;
      if (palette) {
        palette.style.cssText = `
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
          margin-bottom: 22px;
        `;
      }

      const tools = this.container.querySelector('.vf-tools') as HTMLElement;
      if (tools) {
        tools.style.cssText = `
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
        `;
      }

      const historyBtns = this.container.querySelector('.vf-history') as HTMLElement;
      if (historyBtns) {
        historyBtns.style.cssText = `
          display: flex;
          gap: 6px;
          margin-bottom: 26px;
        `;
      }

      const exportWrapper = this.container.querySelector('.vf-export-wrapper') as HTMLElement;
      if (exportWrapper) {
        exportWrapper.style.cssText = `display: flex; justify-content: flex-end;`;
      }
    }
  }

  private bounceAnim(el: HTMLElement): void {
    el.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.transform = 'scale(1.05)';
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.style.transform = 'scale(1)';
      }, 120);
    });
  }

  private buildUI(): void {
    const title = document.createElement('div');
    title.className = 'vf-title';
    title.textContent = 'VoxelFlow';
    this.container.appendChild(title);

    const palette = document.createElement('div');
    palette.className = 'vf-palette';

    PRESET_COLORS.forEach((color) => {
      const swatch = document.createElement('div');
      swatch.className = 'vf-color-swatch';
      swatch.dataset.color = color;
      const isSelected = color === this.currentColor;
      swatch.style.cssText = `
        width: 28px;
        height: 28px;
        background: ${color};
        border-radius: 5px;
        cursor: pointer;
        transition: box-shadow 0.1s ease, transform 0.1s ease;
        box-shadow: ${isSelected ? 'inset 0 0 0 2px #ffffff, 0 0 0 1px rgba(0,0,0,0.3)' : 'inset 0 0 0 0px transparent, 0 0 0 1px rgba(0,0,0,0.2)'};
        box-sizing: border-box;
        flex-shrink: 0;
      `;
      swatch.addEventListener('mouseenter', () => {
        swatch.style.transform = 'scale(1.08)';
      });
      swatch.addEventListener('mouseleave', () => {
        swatch.style.transform = 'scale(1)';
      });
      swatch.addEventListener('click', () => {
        if (this.currentColor === color) return;
        this.currentColor = color;
        this.callbacks.onColorChange(color);
        this.bounceAnim(swatch);
        this.updatePaletteSelection();
      });
      palette.appendChild(swatch);
    });
    this.container.appendChild(palette);

    const tools = document.createElement('div');
    tools.className = 'vf-tools';

    const toolDefs: { type: ToolType; label: string }[] = [
      { type: 'single', label: 'Single' },
      { type: 'sphere', label: 'Sphere' },
      { type: 'fill', label: 'Fill' },
      { type: 'eraser', label: 'Erase' }
    ];

    toolDefs.forEach(({ type, label }) => {
      const btn = document.createElement('button');
      btn.dataset.tool = type;
      btn.textContent = label;
      const isSelected = this.currentTool === type;
      btn.style.cssText = `
        flex: 1;
        min-width: 56px;
        height: 36px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: background 0.15s ease, transform 0.15s ease, color 0.15s ease;
        background: ${isSelected ? '#4f46e5' : '#3b3f50'};
        color: ${isSelected ? '#ffffff' : '#9ca3af'};
      `;
      btn.addEventListener('click', () => {
        this.currentTool = type;
        this.callbacks.onToolChange(type);
        this.bounceAnim(btn);
        this.updateToolSelection();
      });
      tools.appendChild(btn);
    });
    this.container.appendChild(tools);

    const historyBtns = document.createElement('div');
    historyBtns.className = 'vf-history';

    const undoBtn = document.createElement('button');
    undoBtn.textContent = '↶';
    undoBtn.title = 'Undo (Ctrl+Z)';
    undoBtn.style.cssText = `
      width: 48px;
      height: 36px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 18px;
      background: #3b3f50;
      color: #e5e7eb;
      transition: background 0.15s ease, transform 0.15s ease;
    `;
    undoBtn.addEventListener('mouseenter', () => { undoBtn.style.background = '#4b5563'; });
    undoBtn.addEventListener('mouseleave', () => { undoBtn.style.background = '#3b3f50'; });
    undoBtn.addEventListener('click', () => {
      this.callbacks.onUndo();
      this.bounceAnim(undoBtn);
    });
    historyBtns.appendChild(undoBtn);

    const redoBtn = document.createElement('button');
    redoBtn.textContent = '↷';
    redoBtn.title = 'Redo (Ctrl+Shift+Z)';
    redoBtn.style.cssText = `
      width: 48px;
      height: 36px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 18px;
      background: #3b3f50;
      color: #e5e7eb;
      transition: background 0.15s ease, transform 0.15s ease;
    `;
    redoBtn.addEventListener('mouseenter', () => { redoBtn.style.background = '#4b5563'; });
    redoBtn.addEventListener('mouseleave', () => { redoBtn.style.background = '#3b3f50'; });
    redoBtn.addEventListener('click', () => {
      this.callbacks.onRedo();
      this.bounceAnim(redoBtn);
    });
    historyBtns.appendChild(redoBtn);
    this.container.appendChild(historyBtns);

    const exportWrapper = document.createElement('div');
    exportWrapper.className = 'vf-export-wrapper';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'vf-export';
    exportBtn.textContent = 'Export OBJ';
    exportBtn.style.cssText = `
      width: 120px;
      height: 40px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      background: #3b82f6;
      color: #ffffff;
      transition: background 0.15s ease, transform 0.1s ease;
    `;
    exportBtn.addEventListener('mouseenter', () => { exportBtn.style.background = '#2563eb'; });
    exportBtn.addEventListener('mouseleave', () => { exportBtn.style.background = '#3b82f6'; });
    exportBtn.addEventListener('mousedown', () => { exportBtn.style.transform = 'scale(0.95)'; });
    exportBtn.addEventListener('mouseup', () => { exportBtn.style.transform = 'scale(1)'; });
    exportBtn.addEventListener('mouseleave', () => { exportBtn.style.transform = 'scale(1)'; });
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onExport();
    });
    exportWrapper.appendChild(exportBtn);
    this.container.appendChild(exportWrapper);
  }

  private updatePaletteSelection(): void {
    const swatches = this.container.querySelectorAll('.vf-color-swatch');
    swatches.forEach((sw) => {
      const el = sw as HTMLElement;
      const color = el.dataset.color;
      if (color === this.currentColor) {
        el.style.boxShadow = 'inset 0 0 0 2px #ffffff, 0 0 0 1px rgba(0,0,0,0.3)';
      } else {
        el.style.boxShadow = 'inset 0 0 0 0px transparent, 0 0 0 1px rgba(0,0,0,0.2)';
      }
    });
  }

  private updateToolSelection(): void {
    const btns = this.container.querySelectorAll('[data-tool]');
    btns.forEach((b) => {
      const el = b as HTMLElement;
      if (el.dataset.tool === this.currentTool) {
        el.style.background = '#4f46e5';
        el.style.color = '#ffffff';
      } else {
        el.style.background = '#3b3f50';
        el.style.color = '#9ca3af';
      }
    });
  }

  public getColor(): string {
    return this.currentColor;
  }

  public getTool(): ToolType {
    return this.currentTool;
  }

  public setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.updateToolSelection();
  }

  public getBrushSize(): number {
    return this.brushSize;
  }

  public setBrushSize(size: number): void {
    const clamped = Math.max(1, Math.min(5, size));
    this.brushSize = clamped;
    this.callbacks.onBrushSizeChange(clamped);
    this.showBrushHint();
  }

  public adjustBrushSize(delta: number): void {
    this.setBrushSize(this.brushSize + delta);
  }

  public getContainer(): HTMLElement {
    return this.container;
  }
}
