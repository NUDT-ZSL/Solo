import type { ReliefParams } from './reliefScene';
import { getPresetList } from './starData';

export interface UICallbacks {
  onParamChange: (key: keyof ReliefParams, value: number | boolean) => void;
  onPresetSelect: (key: string) => void;
  onUploadClick: () => void;
  onSavePreset: () => void;
  onLoadPreset: () => void;
}

interface SliderDef {
  key: keyof ReliefParams;
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  format: (v: number) => string;
}

export class UIControls {
  private container: HTMLElement;
  private hoverLabel: HTMLElement;
  private callbacks: UICallbacks;
  private expanded: boolean = true;
  private panelEl!: HTMLDivElement;
  private contentEl!: HTMLDivElement;
  private sliders: Map<keyof ReliefParams, { track: HTMLElement; thumb: HTMLElement; valueEl: HTMLElement; def: SliderDef }> = new Map();
  private toggleMap: Map<keyof ReliefParams, { switchEl: HTMLElement }> = new Map();
  private presetSelect!: HTMLSelectElement;
  private hoverTargetScreen: { x: number; y: number } | null = null;
  private hoverLabelVisible: boolean = false;
  private labelLerpX: number = 0;
  private labelLerpY: number = 0;

  constructor(container: HTMLElement, hoverLabel: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.hoverLabel = hoverLabel;
    this.callbacks = callbacks;
    this.buildPanel();
    this.startLabelFollow();
  }

  private buildPanel(): void {
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'param-panel expanded';

    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'panel-toggle';
    toggleBtn.innerHTML = '‹';
    toggleBtn.addEventListener('click', () => this.togglePanel());
    this.panelEl.appendChild(toggleBtn);

    this.contentEl = document.createElement('div');
    this.contentEl.className = 'panel-content';
    this.panelEl.appendChild(this.contentEl);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '星尘拓印';
    this.contentEl.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.className = 'panel-subtitle';
    subtitle.textContent = 'STARDUST IMPRINT';
    this.contentEl.appendChild(subtitle);

    const sliders: SliderDef[] = [
      { key: 'rippleCount', label: '涟漪波数', min: 2, max: 12, step: 1, initial: 6, format: v => String(Math.round(v)) },
      { key: 'baseCurvature', label: '基底曲率', min: -0.5, max: 0.5, step: 0.01, initial: 0, format: v => v.toFixed(2) },
      { key: 'bumpScale', label: '鼓包缩放', min: 0.5, max: 2.0, step: 0.01, initial: 1, format: v => v.toFixed(2) },
      { key: 'colorTempShift', label: '色温偏移', min: -0.3, max: 0.3, step: 0.01, initial: 0, format: v => v.toFixed(2) },
      { key: 'rotationSpeed', label: '旋转速度', min: 0, max: 2, step: 0.01, initial: 1, format: v => v.toFixed(2) + '×' },
      { key: 'starDensity', label: '背景星点密度', min: 0, max: 200, step: 1, initial: 80, format: v => String(Math.round(v)) }
    ];

    sliders.forEach(def => {
      this.createSlider(def);
    });

    this.createToggle('autoRotate', '自转周期', true);

    const divider = document.createElement('div');
    divider.className = 'section-divider';
    this.contentEl.appendChild(divider);

    const presetTitle = document.createElement('div');
    presetTitle.className = 'preset-section-title';
    presetTitle.textContent = '天区预设';
    this.contentEl.appendChild(presetTitle);

    this.presetSelect = document.createElement('select');
    this.presetSelect.className = 'preset-select';
    getPresetList().forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.key;
      opt.textContent = p.name;
      this.presetSelect.appendChild(opt);
    });
    this.presetSelect.addEventListener('change', e => {
      this.callbacks.onPresetSelect((e.target as HTMLSelectElement).value);
    });
    this.contentEl.appendChild(this.presetSelect);

    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';

    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'action-btn';
    uploadBtn.textContent = '上传星图';
    uploadBtn.addEventListener('click', () => this.callbacks.onUploadClick());
    btnRow.appendChild(uploadBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'action-btn';
    saveBtn.textContent = '保存参数';
    saveBtn.addEventListener('click', () => this.callbacks.onSavePreset());
    btnRow.appendChild(saveBtn);

    const loadBtn = document.createElement('button');
    loadBtn.className = 'action-btn';
    loadBtn.textContent = '加载预设';
    loadBtn.addEventListener('click', () => this.callbacks.onLoadPreset());
    btnRow.appendChild(loadBtn);

    this.contentEl.appendChild(btnRow);
    this.container.appendChild(this.panelEl);
  }

  private createSlider(def: SliderDef): void {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'slider-label-row';

    const label = document.createElement('span');
    label.className = 'slider-label';
    label.textContent = def.label;
    labelRow.appendChild(label);

    const valueEl = document.createElement('span');
    valueEl.className = 'slider-value';
    valueEl.textContent = def.format(def.initial);
    labelRow.appendChild(valueEl);

    group.appendChild(labelRow);

    const track = document.createElement('div');
    track.className = 'slider-track';

    const thumb = document.createElement('div');
    thumb.className = 'slider-thumb';
    const pct = (def.initial - def.min) / (def.max - def.min);
    thumb.style.left = `${pct * 100}%`;
    track.appendChild(thumb);

    group.appendChild(track);
    this.contentEl.appendChild(group);

    this.sliders.set(def.key, { track, thumb, valueEl, def });

    let dragging = false;
    const onMove = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const rawVal = def.min + pct * (def.max - def.min);
      const stepped = Math.round(rawVal / def.step) * def.step;
      const clamped = Math.max(def.min, Math.min(def.max, stepped));
      const finalPct = (clamped - def.min) / (def.max - def.min);
      thumb.style.left = `${finalPct * 100}%`;
      valueEl.textContent = def.format(clamped);
      this.callbacks.onParamChange(def.key, clamped);
    };
    track.addEventListener('mousedown', e => {
      dragging = true;
      thumb.classList.add('dragging');
      onMove(e.clientX);
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (dragging) onMove(e.clientX);
    });
    window.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        thumb.classList.remove('dragging');
      }
    });
  }

  private createToggle(key: keyof ReliefParams, label: string, initial: boolean): void {
    const row = document.createElement('div');
    row.className = 'toggle-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'toggle-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const switchEl = document.createElement('div');
    switchEl.className = 'toggle-switch' + (initial ? ' active' : '');
    const knob = document.createElement('div');
    knob.className = 'toggle-knob';
    switchEl.appendChild(knob);
    row.appendChild(switchEl);

    let value = initial;
    switchEl.addEventListener('click', () => {
      value = !value;
      switchEl.classList.toggle('active', value);
      this.callbacks.onParamChange(key, value);
    });

    this.toggleMap.set(key, { switchEl });
    this.contentEl.appendChild(row);
  }

  public setParamValue(key: keyof ReliefParams, value: number | boolean): void {
    const slider = this.sliders.get(key);
    if (slider) {
      const pct = (value as number - slider.def.min) / (slider.def.max - slider.def.min);
      slider.thumb.style.left = `${pct * 100}%`;
      slider.valueEl.textContent = slider.def.format(value as number);
      return;
    }
    const toggle = this.toggleMap.get(key);
    if (toggle) {
      toggle.switchEl.classList.toggle('active', !!value);
    }
  }

  public setSelectedPreset(key: string): void {
    this.presetSelect.value = key;
  }

  private togglePanel(): void {
    this.expanded = !this.expanded;
    this.panelEl.classList.toggle('expanded', this.expanded);
    this.panelEl.classList.toggle('collapsed', !this.expanded);
    const toggleBtn = this.panelEl.querySelector('.panel-toggle') as HTMLElement;
    if (toggleBtn) toggleBtn.innerHTML = this.expanded ? '‹' : '›';
  }

  public showHoverLabel(screenX: number, screenY: number, content: string): void {
    this.hoverLabel.innerHTML = content;
    this.hoverTargetScreen = { x: screenX, y: screenY - 14 };
    if (!this.hoverLabelVisible) {
      this.hoverLabelVisible = true;
      this.hoverLabel.classList.add('visible');
      this.labelLerpX = screenX;
      this.labelLerpY = screenY - 14;
    }
  }

  public hideHoverLabel(): void {
    this.hoverTargetScreen = null;
    if (this.hoverLabelVisible) {
      this.hoverLabelVisible = false;
      this.hoverLabel.classList.remove('visible');
    }
  }

  private startLabelFollow(): void {
    const tick = () => {
      if (this.hoverTargetScreen) {
        const followFactor = 0.25;
        this.labelLerpX += (this.hoverTargetScreen.x - this.labelLerpX) * followFactor;
        this.labelLerpY += (this.hoverTargetScreen.y - this.labelLerpY) * followFactor;
        this.hoverLabel.style.left = `${this.labelLerpX}px`;
        this.hoverLabel.style.top = `${this.labelLerpY}px`;
      }
      requestAnimationFrame(tick);
    };
    tick();
  }
}
