import { getPalette } from './colorManager';

export interface UIState {
  currentColor: string;
  brushSize: number;
  diffusionSpeed: number;
}

export type UICallback = (state: Partial<UIState>) => void;
export type ClearCallback = () => void;

interface TimelineEvent {
  id: number;
  color: string;
  timestamp: number;
}

export class UIController {
  private state: UIState;
  private onStateChange: UICallback;
  private onClear: ClearCallback;
  private palette: string[];
  private activeSwatchIdx = 0;
  private timelineEvents: TimelineEvent[] = [];
  private nextTimelineId = 1;

  constructor(initialState: UIState, onStateChange: UICallback, onClear: ClearCallback) {
    this.state = initialState;
    this.onStateChange = onStateChange;
    this.onClear = onClear;
    this.palette = getPalette();
    this.init();
  }

  private init(): void {
    this.renderPalette();
    this.bindSliderEvents();
    this.bindClearButton();
    this.bindPanelCollapse();
    this.updateColorPreview(this.state.currentColor);
    this.updateBlobCount(0);
    this.startTimelineCleanup();
  }

  private renderPalette(): void {
    const paletteEl = document.getElementById('colorPalette')!;
    paletteEl.innerHTML = '';
    this.palette.forEach((color, idx) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (idx === this.activeSwatchIdx ? ' active' : '');
      swatch.style.backgroundColor = color;
      swatch.dataset.index = String(idx);
      swatch.title = `颜色 ${idx + 1}`;
      swatch.addEventListener('click', () => {
        this.setActiveColor(idx);
      });
      paletteEl.appendChild(swatch);
    });
  }

  private setActiveColor(index: number): void {
    this.activeSwatchIdx = index;
    this.state.currentColor = this.palette[index];
    document.querySelectorAll('.color-swatch').forEach((el, i) => {
      if (i === index) el.classList.add('active');
      else el.classList.remove('active');
    });
    this.updateColorPreview(this.state.currentColor);
    this.onStateChange({ currentColor: this.state.currentColor });
  }

  private bindSliderEvents(): void {
    const brushSlider = document.getElementById('brushSizeSlider') as HTMLInputElement;
    const brushValue = document.getElementById('brushSizeValue')!;
    const brushFloat = document.getElementById('brushSizeFloat')!;
    brushSlider.value = String(this.state.brushSize);
    brushValue.textContent = `${this.state.brushSize}px`;

    const updateBrushFloat = () => {
      const rect = brushSlider.getBoundingClientRect();
      const val = parseInt(brushSlider.value, 10);
      const min = parseInt(brushSlider.min, 10);
      const max = parseInt(brushSlider.max, 10);
      const pct = (val - min) / (max - min);
      const x = pct * rect.width;
      brushFloat.style.left = `${x}px`;
      brushFloat.textContent = `${val}px`;
    };

    brushSlider.addEventListener('input', () => {
      const val = parseInt(brushSlider.value, 10);
      this.state.brushSize = val;
      brushValue.textContent = `${val}px`;
      brushFloat.classList.add('visible');
      updateBrushFloat();
      this.onStateChange({ brushSize: val });
    });
    brushSlider.addEventListener('pointerdown', () => {
      brushFloat.classList.add('visible');
      updateBrushFloat();
    });
    brushSlider.addEventListener('pointerup', () => {
      setTimeout(() => brushFloat.classList.remove('visible'), 300);
    });

    const diffSlider = document.getElementById('diffSpeedSlider') as HTMLInputElement;
    const diffValue = document.getElementById('diffSpeedValue')!;
    const diffFloat = document.getElementById('diffSpeedFloat')!;
    diffSlider.value = String(this.state.diffusionSpeed);
    diffValue.textContent = this.state.diffusionSpeed.toFixed(2);

    const updateDiffFloat = () => {
      const rect = diffSlider.getBoundingClientRect();
      const val = parseFloat(diffSlider.value);
      const min = parseFloat(diffSlider.min);
      const max = parseFloat(diffSlider.max);
      const pct = (val - min) / (max - min);
      const x = pct * rect.width;
      diffFloat.style.left = `${x}px`;
      diffFloat.textContent = val.toFixed(2);
    };

    diffSlider.addEventListener('input', () => {
      const val = parseFloat(diffSlider.value);
      this.state.diffusionSpeed = val;
      diffValue.textContent = val.toFixed(2);
      diffFloat.classList.add('visible');
      updateDiffFloat();
      this.onStateChange({ diffusionSpeed: val });
    });
    diffSlider.addEventListener('pointerdown', () => {
      diffFloat.classList.add('visible');
      updateDiffFloat();
    });
    diffSlider.addEventListener('pointerup', () => {
      setTimeout(() => diffFloat.classList.remove('visible'), 300);
    });
  }

  private bindClearButton(): void {
    const btn = document.getElementById('clearBtn') as HTMLButtonElement;
    btn.addEventListener('click', () => {
      btn.classList.add('flashing');
      setTimeout(() => btn.classList.remove('flashing'), 500);
      this.onClear();
    });
  }

  private bindPanelCollapse(): void {
    const panel = document.getElementById('controlPanel')!;
    const collapsedIcon = panel.querySelector('.panel-collapsed-icon') as HTMLElement;
    let collapseTimer: ReturnType<typeof setTimeout> | null = null;

    const collapse = () => {
      if (window.innerWidth <= 768) return;
      panel.classList.add('collapsed');
    };

    const expand = () => {
      panel.classList.remove('collapsed');
      if (collapseTimer) {
        clearTimeout(collapseTimer);
        collapseTimer = null;
      }
    };

    panel.addEventListener('mouseenter', expand);
    panel.addEventListener('mouseleave', () => {
      if (window.innerWidth > 768) {
        collapseTimer = setTimeout(collapse, 300);
      }
    });
    collapsedIcon.addEventListener('mouseenter', expand);

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        panel.classList.remove('collapsed');
      }
    });

    if (window.innerWidth > 768) {
      collapseTimer = setTimeout(collapse, 1500);
    }
  }

  updateColorPreview(color: string): void {
    const preview = document.getElementById('colorPreview')!;
    preview.style.backgroundColor = color;
  }

  updateBlobCount(count: number): void {
    const el = document.getElementById('countValue')!;
    el.textContent = String(count);
  }

  addTimelineEvent(color: string): void {
    this.timelineEvents.push({
      id: this.nextTimelineId++,
      color,
      timestamp: performance.now(),
    });
    this.renderTimeline();
  }

  private renderTimeline(): void {
    const container = document.getElementById('timeline')!;
    const now = performance.now();
    const recent = this.timelineEvents.filter(e => now - e.timestamp <= 10000);
    this.timelineEvents = recent;
    if (recent.length === 0) {
      container.innerHTML = '<span class="timeline-empty">暂无操作记录</span>';
      return;
    }
    container.innerHTML = '';
    recent.forEach(evt => {
      const dot = document.createElement('div');
      dot.className = 'timeline-dot';
      dot.style.backgroundColor = evt.color;
      const age = now - evt.timestamp;
      dot.style.opacity = String(0.3 + 0.7 * (1 - age / 10000));
      container.appendChild(dot);
    });
  }

  private startTimelineCleanup(): void {
    setInterval(() => this.renderTimeline(), 1000);
  }

  getState(): UIState {
    return { ...this.state };
  }
}
