export interface TreeParams {
  depth: number;
  angleRange: number;
  trunkHeight: number;
  windEnabled: boolean;
  windAmplitude: number;
}

export type ParamChangeCallback = (params: TreeParams) => void;
export type WindToggleCallback = (enabled: boolean, amplitude: number) => void;

export class ControlPanel {
  private container: HTMLDivElement;
  private params: TreeParams;
  private onParamChange: ParamChangeCallback;
  private onWindToggle: WindToggleCallback;
  private depthSlider!: HTMLInputElement;
  private angleSlider!: HTMLInputElement;
  private trunkSlider!: HTMLInputElement;
  private windAmplitudeSlider!: HTMLInputElement;
  private windButton!: HTMLButtonElement;
  private depthValue!: HTMLSpanElement;
  private angleValue!: HTMLSpanElement;
  private trunkValue!: HTMLSpanElement;
  private windAmplitudeValue!: HTMLSpanElement;

  constructor(
    initialParams: TreeParams,
    onParamChange: ParamChangeCallback,
    onWindToggle: WindToggleCallback
  ) {
    this.params = { ...initialParams };
    this.onParamChange = onParamChange;
    this.onWindToggle = onWindToggle;
    this.container = document.createElement('div');
    this.setupStyles();
    this.buildUI();
    this.bindEvents();
    document.body.appendChild(this.container);
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      padding: 20px 24px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #2D3748;
      border-radius: 12px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 60;
      min-width: 280px;
      color: #E2E8F0;
      user-select: none;
    `;
  }

  private buildUI(): void {
    const title = document.createElement('h2');
    title.textContent = '🌳 分形树控制面板';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 18px;
      color: #E2E8F0;
      border-bottom: 1px solid #2D3748;
      padding-bottom: 12px;
    `;
    this.container.appendChild(title);

    this.depthSlider = this.createSlider('生长深度', this.params.depth, 2, 8, 1, (v) => `${v} 层`, (el) => { this.depthValue = el; });
    this.angleSlider = this.createSlider('分支角度范围', this.params.angleRange, 15, 60, 1, (v) => `${v}°`, (el) => { this.angleValue = el; });
    this.trunkSlider = this.createSlider('主干高度', this.params.trunkHeight, 1, 4, 0.1, (v) => `${v.toFixed(1)} 单位`, (el) => { this.trunkValue = el; });
    this.windAmplitudeSlider = this.createSlider('风力强度', this.params.windAmplitude, 0, 0.3, 0.01, (v) => `${v.toFixed(2)}`, (el) => { this.windAmplitudeValue = el; });

    const windSection = document.createElement('div');
    windSection.style.marginTop = '8px';
    this.windButton = document.createElement('button');
    this.windButton.textContent = this.params.windEnabled ? '⏸ 停止摆动' : '🍃 随风摆动';
    this.windButton.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      background: #2B6CB0;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      margin-top: 8px;
    `;
    windSection.appendChild(this.windButton);

    const hint = document.createElement('div');
    hint.textContent = '💡 拖拽旋转视角 · 滚轮缩放';
    hint.style.cssText = `
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #2D3748;
      font-size: 12px;
      color: #718096;
      text-align: center;
    `;

    this.container.appendChild(windSection);
    this.container.appendChild(hint);
  }

  private createSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    formatValue: (v: number) => string,
    valueRef: (el: HTMLSpanElement) => void
  ): HTMLInputElement {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '16px';

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-size: 13px; color: #A0AEC0;';

    const valueEl = document.createElement('span');
    valueEl.textContent = formatValue(value);
    valueEl.style.cssText = 'font-size: 13px; color: #63B3ED; font-weight: 500; font-variant-numeric: tabular-nums;';
    valueRef(valueEl);

    header.appendChild(labelEl);
    header.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]#ctrl-${label} {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: #4A5568;
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }
      input[type="range"]#ctrl-${label}::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #63B3ED;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      input[type="range"]#ctrl-${label}::-webkit-slider-thumb:hover {
        background: #90CDF4;
      }
      input[type="range"]#ctrl-${label}::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #63B3ED;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      input[type="range"]#ctrl-${label}::-moz-range-thumb:hover {
        background: #90CDF4;
      }
    `;
    document.head.appendChild(sliderStyle);
    slider.id = `ctrl-${label}`;

    wrapper.appendChild(header);
    wrapper.appendChild(slider);
    this.container.appendChild(wrapper);

    return slider;
  }

  private bindEvents(): void {
    this.depthSlider.addEventListener('input', () => {
      const v = parseInt(this.depthSlider.value, 10);
      this.depthValue.textContent = `${v} 层`;
      this.params.depth = v;
      this.onParamChange({ ...this.params });
    });

    this.angleSlider.addEventListener('input', () => {
      const v = parseInt(this.angleSlider.value, 10);
      this.angleValue.textContent = `${v}°`;
      this.params.angleRange = v;
      this.onParamChange({ ...this.params });
    });

    this.trunkSlider.addEventListener('input', () => {
      const v = parseFloat(this.trunkSlider.value);
      this.trunkValue.textContent = `${v.toFixed(1)} 单位`;
      this.params.trunkHeight = v;
      this.onParamChange({ ...this.params });
    });

    this.windAmplitudeSlider.addEventListener('input', () => {
      const v = parseFloat(this.windAmplitudeSlider.value);
      this.windAmplitudeValue.textContent = v.toFixed(2);
      this.params.windAmplitude = v;
      if (this.params.windEnabled) {
        this.onWindToggle(true, v);
      }
    });

    this.windButton.addEventListener('mouseenter', () => {
      this.windButton.style.background = '#3182CE';
    });
    this.windButton.addEventListener('mouseleave', () => {
      this.windButton.style.background = this.params.windEnabled ? '#C53030' : '#2B6CB0';
    });
    this.windButton.addEventListener('mousedown', () => {
      this.windButton.style.transform = 'scale(0.95)';
    });
    this.windButton.addEventListener('mouseup', () => {
      this.windButton.style.transform = 'scale(1)';
    });
    this.windButton.addEventListener('click', () => {
      this.params.windEnabled = !this.params.windEnabled;
      this.windButton.textContent = this.params.windEnabled ? '⏸ 停止摆动' : '🍃 随风摆动';
      this.windButton.style.background = this.params.windEnabled ? '#C53030' : '#2B6CB0';
      this.onWindToggle(this.params.windEnabled, this.params.windAmplitude);
    });
  }

  public getParams(): TreeParams {
    return { ...this.params };
  }

  public destroy(): void {
    this.container.remove();
  }
}
