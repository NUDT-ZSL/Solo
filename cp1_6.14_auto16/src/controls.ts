import type { AnimationMode } from './particleText';

export interface ControlValues {
  colorPreset: 'cyan' | 'magenta' | 'gold' | 'lime' | 'custom';
  customColor: string;
  particleSize: number;
  speedMultiplier: number;
  animationMode: AnimationMode;
  showGrid: boolean;
}

export interface ControlsCallbacks {
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onSpeedChange: (multiplier: number) => void;
  onAnimationChange: (mode: AnimationMode) => void;
  onGridToggle: (show: boolean) => void;
}

const PRESETS: Array<{ key: 'cyan' | 'magenta' | 'gold' | 'lime'; color: string }> = [
  { key: 'cyan', color: '#22d3ee' },
  { key: 'magenta', color: '#e879f9' },
  { key: 'gold', color: '#fcd34d' },
  { key: 'lime', color: '#a3e635' },
];

const ANIMATION_MODES: Array<{ mode: AnimationMode; label: string }> = [
  { mode: 'explode', label: 'Explode' },
  { mode: 'spiral', label: 'Spiral' },
  { mode: 'wave', label: 'Wave' },
  { mode: 'shuffle', label: 'Shuffle' },
];

export class ControlsPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private values: ControlValues;
  private callbacks: ControlsCallbacks;

  private colorPresets: Record<string, HTMLElement> = {};
  private colorInput: HTMLInputElement | null = null;
  private sizeSlider: HTMLInputElement | null = null;
  private speedSlider: HTMLInputElement | null = null;
  private gridToggle: HTMLElement | null = null;
  private animButtons: Record<string, HTMLElement> = {};
  private particleCountEl: HTMLElement | null = null;
  private fpsEl: HTMLElement | null = null;

  private isOpen: boolean = false;

  constructor(
    container: HTMLElement,
    initialValues: ControlValues,
    callbacks: ControlsCallbacks
  ) {
    this.container = container;
    this.values = { ...initialValues };
    this.callbacks = callbacks;
    this.panel = this.createPanel();
    this.container.appendChild(this.panel);
    this.bindMobileToggle();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'controls-panel';
    panel.id = 'controls-panel';

    panel.appendChild(this.createTitle('Controls'));

    panel.appendChild(this.createColorSection());

    panel.appendChild(this.createSizeSection());

    panel.appendChild(this.createSpeedSection());

    panel.appendChild(this.createAnimationSection());

    panel.appendChild(this.createGridSection());

    panel.appendChild(this.createStatsSection());

    return panel;
  }

  private createTitle(text: string): HTMLElement {
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = text;
    return title;
  }

  private createControlGroup(label: string, value?: string): {
    group: HTMLElement;
    label: HTMLElement;
    valueEl?: HTMLElement;
    content: HTMLElement;
  } {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelEl = document.createElement('label');
    labelEl.className = 'control-label';
    labelEl.textContent = label;

    if (value !== undefined) {
      const valueEl = document.createElement('span');
      valueEl.className = 'control-value';
      valueEl.textContent = value;
      labelEl.appendChild(valueEl);
      group.appendChild(labelEl);

      const content = document.createElement('div');
      group.appendChild(content);
      return { group, label: labelEl, valueEl, content };
    }

    group.appendChild(labelEl);
    const content = document.createElement('div');
    group.appendChild(content);
    return { group, label: labelEl, content };
  }

  private createColorSection(): HTMLElement {
    const { group, content } = this.createControlGroup('Particle Color');

    const presetsWrapper = document.createElement('div');
    presetsWrapper.className = 'color-presets';

    for (const preset of PRESETS) {
      const btn = document.createElement('div');
      btn.className = `color-preset ${preset.key}`;
      btn.title = preset.key.charAt(0).toUpperCase() + preset.key.slice(1);
      btn.dataset.color = preset.color;
      btn.dataset.preset = preset.key;

      btn.addEventListener('click', () => {
        this.values.colorPreset = preset.key;
        this.updateColorPresetActive();
        this.callbacks.onColorChange(preset.color);
      });

      this.colorPresets[preset.key] = btn;
      presetsWrapper.appendChild(btn);
    }

    if (this.values.colorPreset !== 'custom' && this.colorPresets[this.values.colorPreset]) {
      this.colorPresets[this.values.colorPreset].classList.add('active');
    }

    content.appendChild(presetsWrapper);

    const customWrapper = document.createElement('div');
    customWrapper.className = 'custom-color-wrapper';

    this.colorInput = document.createElement('input');
    this.colorInput.type = 'color';
    this.colorInput.value = this.values.customColor;
    this.colorInput.id = 'custom-color-input';

    this.colorInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.values.colorPreset = 'custom';
      this.values.customColor = val;
      this.updateColorPresetActive();
      this.callbacks.onColorChange(val);
    });

    const label = document.createElement('span');
    label.className = 'custom-color-label';
    label.textContent = 'Custom color';

    customWrapper.appendChild(this.colorInput);
    customWrapper.appendChild(label);
    content.appendChild(customWrapper);

    return group;
  }

  private updateColorPresetActive(): void {
    for (const key of Object.keys(this.colorPresets)) {
      this.colorPresets[key].classList.remove('active');
    }
    if (this.values.colorPreset !== 'custom' && this.colorPresets[this.values.colorPreset]) {
      this.colorPresets[this.values.colorPreset].classList.add('active');
    }
  }

  private createSizeSection(): HTMLElement {
    const initial = this.values.particleSize.toFixed(1) + ' px';
    const { group, valueEl, content } = this.createControlGroup('Particle Size', initial);

    this.sizeSlider = document.createElement('input');
    this.sizeSlider.type = 'range';
    this.sizeSlider.min = '1';
    this.sizeSlider.max = '5';
    this.sizeSlider.step = '0.1';
    this.sizeSlider.value = String(this.values.particleSize);

    this.sizeSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.values.particleSize = val;
      if (valueEl) valueEl.textContent = val.toFixed(1) + ' px';
      this.callbacks.onSizeChange(val);
    });

    content.appendChild(this.sizeSlider);
    return group;
  }

  private createSpeedSection(): HTMLElement {
    const initial = this.values.speedMultiplier.toFixed(1) + ' x';
    const { group, valueEl, content } = this.createControlGroup('Speed Multiplier', initial);

    this.speedSlider = document.createElement('input');
    this.speedSlider.type = 'range';
    this.speedSlider.min = '0.5';
    this.speedSlider.max = '2';
    this.speedSlider.step = '0.1';
    this.speedSlider.value = String(this.values.speedMultiplier);

    this.speedSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.values.speedMultiplier = val;
      if (valueEl) valueEl.textContent = val.toFixed(1) + ' x';
      this.callbacks.onSpeedChange(val);
    });

    content.appendChild(this.speedSlider);
    return group;
  }

  private createAnimationSection(): HTMLElement {
    const { group, content } = this.createControlGroup('Animation Mode');

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'animation-buttons';

    for (const item of ANIMATION_MODES) {
      const btn = document.createElement('button');
      btn.className = 'anim-btn';
      btn.type = 'button';
      btn.textContent = item.label;
      btn.dataset.mode = item.mode;

      if (item.mode === this.values.animationMode) {
        btn.classList.add('active');
      }

      btn.addEventListener('click', () => {
        this.updateAnimationActive(item.mode);
        this.values.animationMode = item.mode;
        this.callbacks.onAnimationChange(item.mode);
      });

      this.animButtons[item.mode] = btn;
      buttonsWrapper.appendChild(btn);
    }

    content.appendChild(buttonsWrapper);
    return group;
  }

  private updateAnimationActive(mode: AnimationMode): void {
    for (const key of Object.keys(this.animButtons)) {
      this.animButtons[key].classList.remove('active');
    }
    if (this.animButtons[mode]) {
      this.animButtons[mode].classList.add('active');
    }
  }

  private createGridSection(): HTMLElement {
    const { group, content } = this.createControlGroup('Background Grid');

    const wrapper = document.createElement('div');
    wrapper.className = 'toggle-wrapper';

    const spacer = document.createElement('span');
    spacer.style.flex = '1';

    this.gridToggle = document.createElement('div');
    this.gridToggle.className = 'toggle-switch';
    if (this.values.showGrid) {
      this.gridToggle.classList.add('active');
    }

    this.gridToggle.addEventListener('click', () => {
      this.values.showGrid = !this.values.showGrid;
      this.gridToggle?.classList.toggle('active', this.values.showGrid);
      this.callbacks.onGridToggle(this.values.showGrid);
    });

    wrapper.appendChild(spacer);
    wrapper.appendChild(this.gridToggle);
    content.appendChild(wrapper);
    return group;
  }

  private createStatsSection(): HTMLElement {
    const stats = document.createElement('div');
    stats.className = 'stats';

    const row1 = document.createElement('div');
    row1.className = 'stat-row';
    row1.innerHTML = '<span>Particle Count</span>';
    this.particleCountEl = document.createElement('span');
    this.particleCountEl.className = 'stat-value';
    this.particleCountEl.textContent = '--';
    row1.appendChild(this.particleCountEl);
    stats.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'stat-row';
    row2.innerHTML = '<span>Frame Rate</span>';
    this.fpsEl = document.createElement('span');
    this.fpsEl.className = 'stat-value';
    this.fpsEl.textContent = '-- FPS';
    row2.appendChild(this.fpsEl);
    stats.appendChild(row2);

    return stats;
  }

  private bindMobileToggle(): void {
    const toggleBtn = document.getElementById('panel-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.isOpen = !this.isOpen;
        this.panel.classList.toggle('open', this.isOpen);
      });
    }
  }

  public updateParticleCount(count: number): void {
    if (this.particleCountEl) {
      this.particleCountEl.textContent = count.toLocaleString();
    }
  }

  public updateFps(fps: number): void {
    if (this.fpsEl) {
      this.fpsEl.textContent = `${fps} FPS`;
    }
  }

  public updateValues(values: Partial<ControlValues>): void {
    if (values.colorPreset !== undefined) {
      this.values.colorPreset = values.colorPreset;
      this.updateColorPresetActive();
    }
    if (values.customColor !== undefined) {
      this.values.customColor = values.customColor;
      if (this.colorInput) this.colorInput.value = values.customColor;
    }
    if (values.particleSize !== undefined) {
      this.values.particleSize = values.particleSize;
      if (this.sizeSlider) this.sizeSlider.value = String(values.particleSize);
    }
    if (values.speedMultiplier !== undefined) {
      this.values.speedMultiplier = values.speedMultiplier;
      if (this.speedSlider) this.speedSlider.value = String(values.speedMultiplier);
    }
    if (values.animationMode !== undefined) {
      this.values.animationMode = values.animationMode;
      this.updateAnimationActive(values.animationMode);
    }
    if (values.showGrid !== undefined) {
      this.values.showGrid = values.showGrid;
      this.gridToggle?.classList.toggle('active', values.showGrid);
    }
  }
}
