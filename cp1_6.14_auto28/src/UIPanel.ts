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
    this.buildUI();
    this.applyResponsive();
    window.addEventListener('resize', () => this.applyResponsive());
    document.body.appendChild(this.container);
    document.body.appendChild(this.brushHint);
  }

  private createBrushHint(): HTMLDivElement {
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 20px;
      background: rgba(0,0,0,0.75);
      color: white;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    `;
    return hint;
  }

  public showBrushHint(): void {
    this.brushHint.textContent = `Brush Size: ${this.brushSize}`;
    this.brushHint.style.opacity = '1';
    if (this.hintTimeout) window.clearTimeout(this.hintTimeout);
    this.hintTimeout = window.setTimeout(() => {
      this.brushHint.style.opacity = '0';
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
        height: 80px;
        background: #2a2b36;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 100;
        overflow-x: auto;
        overflow-y: hidden;
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
      `;
      const title = this.container.querySelector('.vf-title') as HTMLElement;
      if (title) title.style.display = 'none';
      const palette = this.container.querySelector('.vf-palette') as HTMLElement;
      if (palette) {
        palette.style.cssText = `
          display: flex;
          gap: 4px;
          flex-wrap: nowrap;
          overflow-x: auto;
          min-width: 180px;
          padding-bottom: 4px;
        `;
        palette.querySelectorAll('.vf-color-swatch').forEach((sw, i) => {
          if (i >= 6) (sw as HTMLElement).style.display = 'inline-block';
        });
      }
      const tools = this.container.querySelector('.vf-tools') as HTMLElement;
      if (tools) tools.style.flexShrink = '0';
      const historyBtns = this.container.querySelector('.vf-history') as HTMLElement;
      if (historyBtns) historyBtns.style.flexShrink = '0';
      const exportBtn = this.container.querySelector('.vf-export') as HTMLElement;
      if (exportBtn) exportBtn.style.flexShrink = '0';
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
      `;
      const title = this.container.querySelector('.vf-title') as HTMLElement;
      if (title) {
        title.style.display = 'block';
        title.style.cssText = `
          color: #ffffff;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 20px;
        `;
      }
      const palette = this.container.querySelector('.vf-palette') as HTMLElement;
      if (palette) {
        palette.style.cssText = `
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
          margin-bottom: 20px;
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
          margin-bottom: 24px;
        `;
      }
    }
  }

  private bounceAnim(el: HTMLElement): void {
    el.style.transition = 'transform 0.15s ease';
    el.style.transform = 'scale(1.05)';
    setTimeout(() => {
      el.style.transform = 'scale(1)';
    }, 150);
  }

  private buildUI(): void {
    const title = document.createElement('div');
    title.className = 'vf-title';
    title.textContent = 'VoxelFlow';
    title.style.cssText = `
      color: #ffffff;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
    `;
    this.container.appendChild(title);

    const palette = document.createElement('div');
    palette.className = 'vf-palette';
    palette.style.cssText = `
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      margin-bottom: 20px;
    `;

    PRESET_COLORS.forEach((color) => {
      const swatch = document.createElement('div');
      swatch.className = 'vf-color-swatch';
      swatch.dataset.color = color;
      swatch.style.cssText = `
        width: 28px;
        height: 28px;
        background: ${color};
        border-radius: 4px;
        cursor: pointer;
        transition: box-shadow 0.1s ease, transform 0.1s ease;
        box-shadow: ${color === this.currentColor ? 'inset 0 0 0 2px #ffffff' : 'inset 0 0 0 0px transparent'};
        box-sizing: border-box;
      `;
      swatch.addEventListener('click', () => {
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
    tools.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
    `;

    const toolDefs: { type: ToolType; label: string }[] = [
      { type: 'single', label: 'Single' },
      { type: 'sphere', label: 'Sphere' },
      { type: 'fill', label: 'Fill' }
    ];

    toolDefs.forEach(({ type, label }) => {
      const btn = document.createElement('button');
      btn.dataset.tool = type;
      btn.textContent = label;
      btn.style.cssText = `
        width: 72px;
        height: 36px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.15s, transform 0.15s;
        background: ${this.currentTool === type ? '#4f46e5' : '#3b3f50'};
        color: ${this.currentTool === type ? '#ffffff' : '#9ca3af'};
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
    historyBtns.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 24px;
    `;

    const undoBtn = document.createElement('button');
    undoBtn.textContent = '↶';
    undoBtn.title = 'Undo (Ctrl+Z)';
    undoBtn.style.cssText = `
      width: 48px;
      height: 36px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      background: #3b3f50;
      color: #e5e7eb;
      transition: background 0.15s;
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
      font-size: 16px;
      background: #3b3f50;
      color: #e5e7eb;
      transition: background 0.15s;
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
    exportWrapper.style.cssText = `
      display: flex;
      justify-content: ${window.innerWidth < 900 ? 'flex-start' : 'flex-end'};
    `;

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
      transition: background 0.15s, transform 0.1s;
    `;
    exportBtn.addEventListener('mouseenter', () => { exportBtn.style.background = '#2563eb'; });
    exportBtn.addEventListener('mouseleave', () => { exportBtn.style.background = '#3b82f6'; });
    exportBtn.addEventListener('mousedown', () => { exportBtn.style.transform = 'scale(0.95)'; });
    exportBtn.addEventListener('mouseup', () => { exportBtn.style.transform = 'scale(1)'; });
    exportBtn.addEventListener('mouseleave', () => { exportBtn.style.transform = 'scale(1)'; });
    exportBtn.addEventListener('click', () => {
      this.callbacks.onExport();
    });
    exportWrapper.appendChild(exportBtn);
    this.container.appendChild(exportWrapper);
  }

  private updatePaletteSelection(): void {
    const swatches = this.container.querySelectorAll('.vf-color-swatch');
    swatches.forEach((sw) => {
      const el = sw as HTMLElement;
      if (el.dataset.color === this.currentColor) {
        el.style.boxShadow = 'inset 0 0 0 2px #ffffff';
      } else {
        el.style.boxShadow = 'inset 0 0 0 0px transparent';
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
