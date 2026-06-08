import type { FluidMode, FluidParams } from './fluidSystem';

interface SliderConfig {
  key: keyof Omit<FluidParams, 'mode'>;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  format: (v: number) => string;
}

const MODE_CONFIG: { key: FluidMode; label: string }[] = [
  { key: 'vortex', label: '涡流' },
  { key: 'spray', label: '喷射' },
  { key: 'diffusion', label: '扩散' }
];

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'viscosity',
    label: '流体粘度',
    min: 0.1,
    max: 1.0,
    step: 0.01,
    default: 0.5,
    format: (v) => v.toFixed(2)
  },
  {
    key: 'turbulence',
    label: '湍流强度',
    min: 0,
    max: 5,
    step: 0.1,
    default: 2.0,
    format: (v) => v.toFixed(1)
  },
  {
    key: 'sprayAngleX',
    label: '喷射方向 X',
    min: -90,
    max: 90,
    step: 1,
    default: 0,
    format: (v) => `${v.toFixed(0)}°`
  },
  {
    key: 'sprayAngleY',
    label: '喷射方向 Y',
    min: -90,
    max: 90,
    step: 1,
    default: 0,
    format: (v) => `${v.toFixed(0)}°`
  }
];

export class UIControls {
  private panel: HTMLElement;
  private titleBtn: HTMLElement;
  private modeTitle: HTMLElement;
  private modeButtons: Map<FluidMode, HTMLButtonElement> = new Map();
  private valueDisplays: Map<string, HTMLElement> = new Map();
  private collapsed = false;
  private titleTimeout: number | null = null;

  public onParamChange?: (key: keyof FluidParams, value: number | FluidMode) => void;

  constructor() {
    this.panel = document.getElementById('control-panel')!;
    this.titleBtn = document.getElementById('page-title')!;
    this.modeTitle = document.getElementById('mode-title')!;

    this.buildPanel();
    this.bindTitleClick();
  }

  private buildPanel(): void {
    const isMobile = window.innerWidth < 768;
    const grid = document.createElement('div');
    grid.className = isMobile ? 'panel-grid' : '';

    SLIDER_CONFIGS.forEach((config, idx) => {
      const section = this.createSliderSection(config);
      if (isMobile) {
        if (idx < 2) grid.appendChild(section);
      } else {
        this.panel.appendChild(section);
      }
    });

    if (isMobile) {
      const grid2 = document.createElement('div');
      grid2.className = 'panel-grid';
      SLIDER_CONFIGS.slice(2).forEach((config) => {
        grid2.appendChild(this.createSliderSection(config));
      });
      this.panel.appendChild(grid);
      this.panel.appendChild(grid2);
    }

    const modeSection = document.createElement('div');
    modeSection.className = 'panel-section';
    const modeLabel = document.createElement('div');
    modeLabel.className = 'panel-label';
    modeLabel.textContent = '流体模式';
    modeSection.appendChild(modeLabel);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'mode-buttons';
    MODE_CONFIG.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.className = 'mode-btn' + (key === 'vortex' ? ' active' : '');
      btn.textContent = label;
      btn.dataset.mode = key;
      btn.addEventListener('click', () => this.handleModeClick(key));
      btnGroup.appendChild(btn);
      this.modeButtons.set(key, btn);
    });
    modeSection.appendChild(btnGroup);
    this.panel.appendChild(modeSection);
  }

  private createSliderSection(config: SliderConfig): HTMLElement {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const labelRow = document.createElement('div');
    labelRow.className = 'panel-label';
    const labelText = document.createElement('span');
    labelText.textContent = config.label;
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'panel-value';
    valueDisplay.textContent = config.format(config.default);
    labelRow.appendChild(labelText);
    labelRow.appendChild(valueDisplay);
    this.valueDisplays.set(config.key, valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(config.default);
    slider.dataset.key = config.key;
    slider.addEventListener('input', (e) => this.handleSliderInput(e, config));

    section.appendChild(labelRow);
    section.appendChild(slider);
    return section;
  }

  private handleSliderInput(e: Event, config: SliderConfig): void {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    const display = this.valueDisplays.get(config.key);
    if (display) display.textContent = config.format(value);
    if (this.onParamChange) {
      this.onParamChange(config.key, value);
    }
  }

  private handleModeClick(mode: FluidMode): void {
    this.modeButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === mode);
    });
    if (this.onParamChange) {
      this.onParamChange('mode', mode);
    }
  }

  private bindTitleClick(): void {
    this.titleBtn.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this.panel.classList.toggle('collapsed', this.collapsed);
    });
  }

  public showModeTitle(name: string): void {
    this.modeTitle.textContent = name;
    this.modeTitle.classList.add('visible');

    if (this.titleTimeout) {
      window.clearTimeout(this.titleTimeout);
    }

    this.titleTimeout = window.setTimeout(() => {
      this.modeTitle.classList.remove('visible');
      this.titleTimeout = null;
    }, 2000);
  }
}
