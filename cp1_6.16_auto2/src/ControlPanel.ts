import { ParticleParams, DEFAULT_PARAMS, PRESETS } from './ParticleManager';

type OnParamsChange = (params: ParticleParams, isPreset?: boolean) => void;

export class ControlPanel {
  private container: HTMLDivElement;
  private panel: HTMLDivElement;
  private gearBtn: HTMLDivElement | null = null;
  private onParamsChange: OnParamsChange;
  private currentParams: ParticleParams;
  private isOpen = true;
  private sliderValues: Map<string, HTMLSpanElement> = new Map();
  private hueStartInput: HTMLInputElement | null = null;
  private hueEndInput: HTMLInputElement | null = null;

  constructor(onParamsChange: OnParamsChange) {
    this.onParamsChange = onParamsChange;
    this.currentParams = { ...DEFAULT_PARAMS };

    this.container = document.createElement('div');
    this.container.id = 'control-panel-container';
    document.body.appendChild(this.container);

    this.panel = document.createElement('div');
    this.panel.className = 'panel';

    this.createGearButton();
    this.createSliders();
    this.createColorPickers();
    this.createPresets();

    this.container.appendChild(this.panel);
    this.applyStyles();
    this.handleResize();

    window.addEventListener('resize', () => this.handleResize());
  }

  private createGearButton(): void {
    this.gearBtn = document.createElement('div');
    this.gearBtn.className = 'gear-btn';
    this.gearBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E0E0E0" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    this.gearBtn.addEventListener('click', () => this.togglePanel());
    this.container.appendChild(this.gearBtn);
  }

  private createSliders(): void {
    const sliders = [
      { key: 'count', label: '粒子数量', min: 1000, max: 10000, step: 100, value: this.currentParams.count },
      { key: 'speed', label: '运动速度', min: 0.5, max: 5.0, step: 0.1, value: this.currentParams.speed },
      { key: 'radius', label: '散开半径', min: 1, max: 10, step: 0.5, value: this.currentParams.radius },
    ];

    sliders.forEach(({ key, label, min, max, step, value }) => {
      const group = document.createElement('div');
      group.className = 'slider-group';

      const labelRow = document.createElement('div');
      labelRow.className = 'slider-label-row';

      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.className = 'slider-label';

      const valueSpan = document.createElement('span');
      valueSpan.className = 'slider-value';
      valueSpan.textContent = String(value);
      this.sliderValues.set(key, valueSpan);

      labelRow.appendChild(labelEl);
      labelRow.appendChild(valueSpan);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.className = 'slider-input';
      input.dataset.key = key;

      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        valueSpan.textContent = key === 'count' ? String(Math.round(v)) : v.toFixed(1);
        this.currentParams[key as keyof ParticleParams] = key === 'count' ? Math.round(v) : v;
        this.onParamsChange({ ...this.currentParams });
      });

      group.appendChild(labelRow);
      group.appendChild(input);
      this.panel.appendChild(group);
    });
  }

  private createColorPickers(): void {
    const colorGroup = document.createElement('div');
    colorGroup.className = 'color-group';

    const startRow = document.createElement('div');
    startRow.className = 'color-row';

    const startLabel = document.createElement('label');
    startLabel.textContent = '颜色起始';
    startLabel.className = 'slider-label';

    this.hueStartInput = document.createElement('input');
    this.hueStartInput.type = 'range';
    this.hueStartInput.min = '0';
    this.hueStartInput.max = '1';
    this.hueStartInput.step = '0.01';
    this.hueStartInput.value = String(this.currentParams.colorStartHue);
    this.hueStartInput.className = 'hue-input hue-start';

    this.hueStartInput.addEventListener('input', () => {
      this.currentParams.colorStartHue = parseFloat(this.hueStartInput!.value);
      this.onParamsChange({ ...this.currentParams });
    });

    startRow.appendChild(startLabel);
    startRow.appendChild(this.hueStartInput);

    const endRow = document.createElement('div');
    endRow.className = 'color-row';

    const endLabel = document.createElement('label');
    endLabel.textContent = '颜色结束';
    endLabel.className = 'slider-label';

    this.hueEndInput = document.createElement('input');
    this.hueEndInput.type = 'range';
    this.hueEndInput.min = '0';
    this.hueEndInput.max = '1';
    this.hueEndInput.step = '0.01';
    this.hueEndInput.value = String(this.currentParams.colorEndHue);
    this.hueEndInput.className = 'hue-input hue-end';

    this.hueEndInput.addEventListener('input', () => {
      this.currentParams.colorEndHue = parseFloat(this.hueEndInput!.value);
      this.onParamsChange({ ...this.currentParams });
    });

    endRow.appendChild(endLabel);
    endRow.appendChild(this.hueEndInput);

    colorGroup.appendChild(startRow);
    colorGroup.appendChild(endRow);
    this.panel.appendChild(colorGroup);
  }

  private createPresets(): void {
    const presetContainer = document.createElement('div');
    presetContainer.className = 'preset-container';

    const presetLabel = document.createElement('div');
    presetLabel.className = 'preset-label';
    presetLabel.textContent = '预设方案';
    presetContainer.appendChild(presetLabel);

    const presetRow = document.createElement('div');
    presetRow.className = 'preset-row';

    Object.entries(PRESETS).forEach(([key, preset]) => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = preset.label;
      btn.style.background = `linear-gradient(135deg, ${preset.colorStartHex}, ${preset.colorEndHex})`;
      btn.dataset.preset = key;

      btn.addEventListener('click', () => {
        this.currentParams = {
          count: preset.count,
          speed: preset.speed,
          radius: preset.radius,
          colorStartHue: preset.colorStartHue,
          colorEndHue: preset.colorEndHue,
        };
        this.syncUI();
        this.onParamsChange({ ...this.currentParams }, true);
      });

      presetRow.appendChild(btn);
    });

    presetContainer.appendChild(presetRow);
    this.panel.appendChild(presetContainer);
  }

  private syncUI(): void {
    this.sliderValues.get('count')!.textContent = String(this.currentParams.count);
    this.sliderValues.get('speed')!.textContent = this.currentParams.speed.toFixed(1);
    this.sliderValues.get('radius')!.textContent = this.currentParams.radius.toFixed(1);

    const countInput = this.panel.querySelector('[data-key="count"]') as HTMLInputElement;
    const speedInput = this.panel.querySelector('[data-key="speed"]') as HTMLInputElement;
    const radiusInput = this.panel.querySelector('[data-key="radius"]') as HTMLInputElement;

    if (countInput) countInput.value = String(this.currentParams.count);
    if (speedInput) speedInput.value = String(this.currentParams.speed);
    if (radiusInput) radiusInput.value = String(this.currentParams.radius);
    if (this.hueStartInput) this.hueStartInput.value = String(this.currentParams.colorStartHue);
    if (this.hueEndInput) this.hueEndInput.value = String(this.currentParams.colorEndHue);
  }

  private togglePanel(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.panel.classList.add('panel-open');
      this.panel.classList.remove('panel-closed');
    } else {
      this.panel.classList.remove('panel-open');
      this.panel.classList.add('panel-closed');
    }
  }

  private handleResize(): void {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      this.panel.classList.add('panel-mobile');
      if (!this.gearBtn!.classList.contains('gear-visible')) {
        this.gearBtn!.classList.add('gear-visible');
        this.isOpen = false;
        this.panel.classList.add('panel-closed');
      }
    } else {
      this.panel.classList.remove('panel-mobile');
      this.gearBtn!.classList.remove('gear-visible');
      this.isOpen = true;
      this.panel.classList.add('panel-open');
      this.panel.classList.remove('panel-closed');
    }
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #control-panel-container {
        position: fixed;
        top: 0;
        right: 0;
        z-index: 100;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .panel {
        width: 280px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0 0 0 12px;
        color: #E0E0E0;
        overflow-y: auto;
        max-height: 100vh;
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
        transform: translateX(0);
        opacity: 1;
      }

      .panel.panel-closed {
        transform: translateX(110%);
        opacity: 0;
        pointer-events: none;
      }

      .panel.panel-open {
        transform: translateX(0);
        opacity: 1;
        pointer-events: all;
      }

      .panel.panel-mobile {
        position: fixed;
        top: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
        border-left: none;
        padding: 60px 20px 20px 20px;
      }

      .gear-btn {
        display: none;
        position: fixed;
        top: 16px;
        right: 16px;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 8px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        z-index: 101;
        transition: transform 0.3s ease;
      }

      .gear-btn:hover {
        transform: rotate(45deg);
      }

      .gear-btn.gear-visible {
        display: flex;
      }

      .slider-group {
        margin-bottom: 18px;
      }

      .slider-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .slider-label {
        font-size: 13px;
        color: #E0E0E0;
        font-weight: 500;
      }

      .slider-value {
        font-size: 13px;
        color: #FF6B6B;
        font-weight: 600;
        min-width: 40px;
        text-align: right;
      }

      .slider-input {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: #444;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }

      .slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: #FF6B6B;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .slider-input::-webkit-slider-thumb:active {
        transform: scale(1.3);
      }

      .slider-input::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #FF6B6B;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .slider-input::-moz-range-thumb:active {
        transform: scale(1.3);
      }

      .slider-input::-moz-range-track {
        height: 6px;
        background: #444;
        border-radius: 3px;
      }

      .color-group {
        margin-bottom: 18px;
      }

      .color-row {
        margin-bottom: 12px;
      }

      .color-row .slider-label {
        display: block;
        margin-bottom: 6px;
      }

      .hue-input {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 12px;
        border-radius: 6px;
        outline: none;
        cursor: pointer;
      }

      .hue-input.hue-start {
        background: linear-gradient(to right,
          hsl(0,80%,55%), hsl(0.08,80%,55%), hsl(0.17,80%,55%),
          hsl(0.25,80%,55%), hsl(0.33,80%,55%), hsl(0.42,80%,55%),
          hsl(0.5,80%,55%), hsl(0.58,80%,55%), hsl(0.67,80%,55%),
          hsl(0.75,80%,55%), hsl(0.83,80%,55%), hsl(0.92,80%,55%),
          hsl(1,80%,55%)
        );
      }

      .hue-input.hue-end {
        background: linear-gradient(to right,
          hsl(0,80%,55%), hsl(0.08,80%,55%), hsl(0.17,80%,55%),
          hsl(0.25,80%,55%), hsl(0.33,80%,55%), hsl(0.42,80%,55%),
          hsl(0.5,80%,55%), hsl(0.58,80%,55%), hsl(0.67,80%,55%),
          hsl(0.75,80%,55%), hsl(0.83,80%,55%), hsl(0.92,80%,55%),
          hsl(1,80%,55%)
        );
      }

      .hue-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: #FF6B6B;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .hue-input::-webkit-slider-thumb:active {
        transform: scale(1.3);
      }

      .hue-input::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #FF6B6B;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
      }

      .preset-container {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .preset-label {
        font-size: 13px;
        color: #E0E0E0;
        font-weight: 500;
        margin-bottom: 12px;
      }

      .preset-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .preset-btn {
        flex: 1;
        min-width: 70px;
        padding: 10px 8px;
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        transition: filter 0.15s ease, transform 0.15s ease;
        letter-spacing: 0.5px;
      }

      .preset-btn:hover {
        filter: brightness(1.1);
      }

      .preset-btn:active {
        transform: scale(0.94);
        filter: brightness(0.95);
      }
    `;
    document.head.appendChild(style);
  }
}
