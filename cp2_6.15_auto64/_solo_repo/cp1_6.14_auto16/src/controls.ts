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
  private colorValueEl: HTMLElement | null = null;
  private sizeSlider: HTMLInputElement | null = null;
  private sizeValueEl: HTMLElement | null = null;
  private speedSlider: HTMLInputElement | null = null;
  private speedValueEl: HTMLElement | null = null;
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
      btn.title = `${preset.key.charAt(0).toUpperCase() + preset.key.slice(1)} ${preset.color}`;
      btn.dataset.color = preset.color;
      btn.dataset.preset = preset.key;

      btn.addEventListener('click', () => {
        this.applyColor(preset.color, preset.key);
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
    this.colorInput.title = 'Pick custom color';

    const label = document.createElement('span');
    label.className = 'custom-color-label';
    label.textContent = 'Custom';

    this.colorValueEl = document.createElement('span');
    this.colorValueEl.className = 'custom-color-value';
    this.colorValueEl.textContent = this.values.customColor.toUpperCase();

    this.colorInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.applyColor(val, 'custom');
    });

    this.colorInput.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.applyColor(val, 'custom');
    });

    customWrapper.appendChild(this.colorInput);
    customWrapper.appendChild(label);
    customWrapper.appendChild(this.colorValueEl);
    content.appendChild(customWrapper);

    if (this.values.colorPreset !== 'custom') {
      const initialPreset = PRESETS.find(p => p.key === this.values.colorPreset);
      if (initialPreset) {
        this.colorInput.value = initialPreset.color;
        this.colorValueEl.textContent = initialPreset.color.toUpperCase();
      }
    }

    return group;
  }

  private applyColor(color: string, preset: 'cyan' | 'magenta' | 'gold' | 'lime' | 'custom'): void {
    this.values.colorPreset = preset;
    this.values.customColor = color;

    for (const key of Object.keys(this.colorPresets)) {
      this.colorPresets[key].classList.remove('active');
    }
    if (preset !== 'custom' && this.colorPresets[preset]) {
      this.colorPresets[preset].classList.add('active');
    }

    if (this.colorInput) {
      this.colorInput.value = color;
    }
    if (this.colorValueEl) {
      this.colorValueEl.textContent = color.toUpperCase();
    }

    this.callbacks.onColorChange(color);
  }

  private createSizeSection(): HTMLElement {
    const initial = this.values.particleSize.toFixed(1) + ' px';
    const { group, valueEl, content } = this.createControlGroup('Particle Size', initial);
    this.sizeValueEl = valueEl || null;

    this.sizeSlider = document.createElement('input');
    this.sizeSlider.type = 'range';
    this.sizeSlider.min = '1';
    this.sizeSlider.max = '5';
    this.sizeSlider.step = '0.1';
    this.sizeSlider.value = String(this.values.particleSize);
    this.sizeSlider.title = `Size: ${this.values.particleSize.toFixed(1)} px`;

    this.sizeSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.values.particleSize = val;
      if (this.sizeValueEl) this.sizeValueEl.textContent = val.toFixed(1) + ' px';
      this.sizeSlider!.title = `Size: ${val.toFixed(1)} px`;
      this.callbacks.onSizeChange(val);
    });

    content.appendChild(this.sizeSlider);
    return group;
  }

  private createSpeedSection(): HTMLElement {
    const initial = this.values.speedMultiplier.toFixed(1) + ' x';
    const { group, valueEl, content } = this.createControlGroup('Speed Multiplier', initial);
    this.speedValueEl = valueEl || null;

    this.speedSlider = document.createElement('input');
    this.speedSlider.type = 'range';
    this.speedSlider.min = '0.5';
    this.speedSlider.max = '2';
    this.speedSlider.step = '0.1';
    this.speedSlider.value = String(this.values.speedMultiplier);
    this.speedSlider.title = `Speed: ${this.values.speedMultiplier.toFixed(1)}x`;

    this.speedSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.values.speedMultiplier = val;
      if (this.speedValueEl) this.speedValueEl.textContent = val.toFixed(1) + ' x';
      this.speedSlider!.title = `Speed: ${val.toFixed(1)}x`;
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

    const label = document.createElement('span');
    label.className = 'toggle-label';
    label.textContent = 'Show reference grid';

    this.gridToggle = document.createElement('div');
    this.gridToggle.className = 'toggle-switch';
    this.gridToggle.title = this.values.showGrid ? 'Hide grid' : 'Show grid';
    if (this.values.showGrid) {
      this.gridToggle.classList.add('active');
    }

    this.gridToggle.addEventListener('click', () => {
      this.values.showGrid = !this.values.showGrid;
      this.gridToggle?.classList.toggle('active', this.values.showGrid);
      if (this.gridToggle) {
        this.gridToggle.title = this.values.showGrid ? 'Hide grid' : 'Show grid';
      }
      this.callbacks.onGridToggle(this.values.showGrid);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(this.gridToggle);
    content.appendChild(wrapper);
    return group;
  }

  private createStatsSection(): HTMLElement {
    const stats = document.createElement('div');
    stats.className = 'stats';

    const row1 = document.createElement('div');
    row1.className = 'stat-row';
    const label1 = document.createElement('span');
    label1.textContent = 'Particle Count';
    this.particleCountEl = document.createElement('span');
    this.particleCountEl.className = 'stat-value';
    this.particleCountEl.textContent = '--';
    row1.appendChild(label1);
    row1.appendChild(this.particleCountEl);
    stats.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'stat-row';
    const label2 = document.createElement('span');
    label2.textContent = 'Frame Rate';
    this.fpsEl = document.createElement('span');
    this.fpsEl.className = 'stat-value';
    this.fpsEl.textContent = '-- FPS';
    row2.appendChild(label2);
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
        toggleBtn.textContent = this.isOpen ? 'Hide' : 'Controls';
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
      for (const key of Object.keys(this.colorPresets)) {
        this.colorPresets[key].classList.remove('active');
      }
      if (values.colorPreset !== 'custom' && this.colorPresets[values.colorPreset]) {
        this.colorPresets[values.colorPreset].classList.add('active');
      }
    }
    if (values.customColor !== undefined) {
      this.values.customColor = values.customColor;
      if (this.colorInput) this.colorInput.value = values.customColor;
      if (this.colorValueEl) this.colorValueEl.textContent = values.customColor.toUpperCase();
    }
    if (values.particleSize !== undefined) {
      this.values.particleSize = values.particleSize;
      if (this.sizeSlider) this.sizeSlider.value = String(values.particleSize);
      if (this.sizeValueEl) this.sizeValueEl.textContent = values.particleSize.toFixed(1) + ' px';
    }
    if (values.speedMultiplier !== undefined) {
      this.values.speedMultiplier = values.speedMultiplier;
      if (this.speedSlider) this.speedSlider.value = String(values.speedMultiplier);
      if (this.speedValueEl) this.speedValueEl.textContent = values.speedMultiplier.toFixed(1) + ' x';
    }
    if (values.animationMode !== undefined) {
      this.values.animationMode = values.animationMode;
      this.updateAnimationActive(values.animationMode);
    }
    if (values.showGrid !== undefined) {
      this.values.showGrid = values.showGrid;
      this.gridToggle?.classList.toggle('active', values.showGrid);
      if (this.gridToggle) {
        this.gridToggle.title = values.showGrid ? 'Hide grid' : 'Show grid';
      }
    }
  }
}
