import type { BrushSettings, RendererStats } from './types';

interface UIHandlers {
  onBrushChange: (settings: BrushSettings) => void;
  onClear: () => void;
}

export class UIController {
  private brushSizeSlider: HTMLInputElement;
  private brushSizeValue: HTMLElement;
  private inkDensitySlider: HTMLInputElement;
  private inkDensityValue: HTMLElement;
  private clearButton: HTMLButtonElement;
  private toggleStatsButton: HTMLButtonElement;
  private statsPanel: HTMLElement;
  private brushPreview: HTMLElement;
  private avgDensityEl: HTMLElement;
  private totalLengthEl: HTMLElement;
  private heatmapCanvas: HTMLCanvasElement;
  private heatmapCtx: CanvasRenderingContext2D;

  private settings: BrushSettings;
  private handlers: UIHandlers;
  private statsVisible: boolean = false;

  constructor(handlers: UIHandlers) {
    this.handlers = handlers;

    const brushSizeSlider = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');
    const inkDensitySlider = document.getElementById('ink-density');
    const inkDensityValue = document.getElementById('ink-density-value');
    const clearButton = document.getElementById('clear-btn');
    const toggleStatsButton = document.getElementById('toggle-stats');
    const statsPanel = document.getElementById('stats-panel');
    const brushPreview = document.getElementById('brush-preview');
    const avgDensityEl = document.getElementById('avg-density');
    const totalLengthEl = document.getElementById('total-length');
    const heatmapCanvas = document.getElementById('heatmap') as HTMLCanvasElement;

    if (
      !brushSizeSlider ||
      !brushSizeValue ||
      !inkDensitySlider ||
      !inkDensityValue ||
      !clearButton ||
      !toggleStatsButton ||
      !statsPanel ||
      !brushPreview ||
      !avgDensityEl ||
      !totalLengthEl ||
      !heatmapCanvas
    ) {
      throw new Error('UI elements not found');
    }

    this.brushSizeSlider = brushSizeSlider as HTMLInputElement;
    this.brushSizeValue = brushSizeValue;
    this.inkDensitySlider = inkDensitySlider as HTMLInputElement;
    this.inkDensityValue = inkDensityValue;
    this.clearButton = clearButton as HTMLButtonElement;
    this.toggleStatsButton = toggleStatsButton as HTMLButtonElement;
    this.statsPanel = statsPanel;
    this.brushPreview = brushPreview;
    this.avgDensityEl = avgDensityEl;
    this.totalLengthEl = totalLengthEl;
    this.heatmapCanvas = heatmapCanvas;

    const ctx = this.heatmapCanvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get heatmap context');
    this.heatmapCtx = ctx;

    this.settings = {
      size: parseInt(this.brushSizeSlider.value, 10),
      density: parseInt(this.inkDensitySlider.value, 10),
    };

    this.bindEvents();
    this.updateDisplay();
  }

  private bindEvents(): void {
    this.brushSizeSlider.addEventListener('input', () => {
      this.settings.size = parseInt(this.brushSizeSlider.value, 10);
      this.updateDisplay();
      this.handlers.onBrushChange({ ...this.settings });
    });

    this.inkDensitySlider.addEventListener('input', () => {
      this.settings.density = parseInt(this.inkDensitySlider.value, 10);
      this.updateDisplay();
      this.handlers.onBrushChange({ ...this.settings });
    });

    this.clearButton.addEventListener('click', () => {
      this.playInkRipple(this.clearButton);
      this.handlers.onClear();
    });

    this.toggleStatsButton.addEventListener('click', () => {
      this.playInkRipple(this.toggleStatsButton);
      this.toggleStatsPanel();
    });

    this.brushSizeSlider.addEventListener('mouseenter', () => {
      this.showBrushPreview();
    });
    this.brushSizeSlider.addEventListener('mouseleave', () => {
      this.hideBrushPreview();
    });
    this.brushSizeSlider.addEventListener('mousemove', (e) => {
      this.updateBrushPreviewPosition(e);
    });
  }

  private showBrushPreview(): void {
    this.brushPreview.classList.add('visible');
    this.updateBrushPreviewSize();
  }

  private hideBrushPreview(): void {
    this.brushPreview.classList.remove('visible');
  }

  private updateBrushPreviewPosition(e: MouseEvent): void {
    const size = this.settings.size * 2;
    this.brushPreview.style.width = `${size}px`;
    this.brushPreview.style.height = `${size}px`;
    this.brushPreview.style.left = `${e.clientX - size / 2}px`;
    this.brushPreview.style.top = `${e.clientY - size / 2 - 20}px`;
  }

  private updateBrushPreviewSize(): void {
    const size = this.settings.size * 2;
    this.brushPreview.style.width = `${size}px`;
    this.brushPreview.style.height = `${size}px`;
  }

  private playInkRipple(button: HTMLElement): void {
    button.style.transform = 'scale(0.97)';
    setTimeout(() => {
      button.style.transform = '';
    }, 150);
  }

  private toggleStatsPanel(): void {
    this.statsVisible = !this.statsVisible;
    if (this.statsVisible) {
      this.statsPanel.classList.remove('hidden');
    } else {
      this.statsPanel.classList.add('hidden');
    }
  }

  private updateDisplay(): void {
    this.brushSizeValue.textContent = `${this.settings.size}px`;
    this.inkDensityValue.textContent = `${this.settings.density}%`;
  }

  getSettings(): BrushSettings {
    return { ...this.settings };
  }

  updateStats(stats: RendererStats): void {
    this.avgDensityEl.textContent = `${stats.avgDensity}%`;
    this.totalLengthEl.textContent = `${stats.totalLength}px`;
    this.drawHeatmap(stats.densityGrid);
  }

  private drawHeatmap(grid: number[][]): void {
    const { width, height } = this.heatmapCanvas;
    const gridSize = grid.length;
    const cellW = width / gridSize;
    const cellH = height / gridSize;

    this.heatmapCtx.clearRect(0, 0, width, height);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const density = grid[y][x];
        const alpha = Math.min(0.9, density * 0.9);

        if (density < 0.05) continue;

        const gray = Math.floor(26 + (1 - density) * 50);
        this.heatmapCtx.fillStyle = `rgba(${gray}, ${gray - 5}, ${gray - 5}, ${alpha})`;
        this.heatmapCtx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }
}
