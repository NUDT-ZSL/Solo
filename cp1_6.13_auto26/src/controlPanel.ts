export interface ControlPanelOptions {
  density: number;
  tailLength: number;
  speed: number;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private onDensityChange: (value: number) => void;
  private onTailLengthChange: (value: number) => void;
  private onSpeedChange: (value: number) => void;

  private densitySlider: HTMLInputElement;
  private tailLengthSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;

  private densityValue: HTMLSpanElement;
  private tailLengthValue: HTMLSpanElement;
  private speedValue: HTMLSpanElement;

  constructor(options: ControlPanelOptions, callbacks: {
    onDensityChange: (value: number) => void;
    onTailLengthChange: (value: number) => void;
    onSpeedChange: (value: number) => void;
  }) {
    this.onDensityChange = callbacks.onDensityChange;
    this.onTailLengthChange = callbacks.onTailLengthChange;
    this.onSpeedChange = callbacks.onSpeedChange;

    this.container = document.createElement('div');
    this.styleContainer();

    const densityControl = this.createSliderControl(
      '流星密度',
      options.density,
      1000,
      6000,
      500,
      '个'
    );
    const tailLengthControl = this.createSliderControl(
      '尾迹长度',
      options.tailLength,
      20,
      100,
      5,
      'px'
    );
    const speedControl = this.createSliderControl(
      '下落速度',
      options.speed,
      0.5,
      2.0,
      0.1,
      'x'
    );

    this.densitySlider = densityControl.slider;
    this.tailLengthSlider = tailLengthControl.slider;
    this.speedSlider = speedControl.slider;
    this.densityValue = densityControl.valueSpan;
    this.tailLengthValue = tailLengthControl.valueSpan;
    this.speedValue = speedControl.valueSpan;

    this.container.appendChild(densityControl.wrapper);
    this.container.appendChild(tailLengthControl.wrapper);
    this.container.appendChild(speedControl.wrapper);

    this.bindEvents();
    document.body.appendChild(this.container);
  }

  private styleContainer(): void {
    const s = this.container.style;
    s.position = 'fixed';
    s.bottom = '24px';
    s.left = '50%';
    s.transform = 'translateX(-50%)';
    s.background = 'rgba(31, 31, 46, 0.85)';
    s.backdropFilter = 'blur(12px)';
    s.borderRadius = '16px';
    s.padding = '12px 20px';
    s.display = 'flex';
    s.flexDirection = 'row';
    s.gap = '28px';
    s.zIndex = '100';
    s.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
    s.border = '1px solid rgba(255, 255, 255, 0.08)';

    const mq = window.matchMedia('(max-width: 768px)');
    const updateLayout = () => {
      if (mq.matches) {
        s.flexDirection = 'column';
        s.gap = '16px';
        s.padding = '16px';
        s.width = 'calc(100% - 32px)';
        s.maxWidth = '360px';
      } else {
        s.flexDirection = 'row';
        s.gap = '28px';
        s.padding = '12px 20px';
        s.width = 'auto';
        s.maxWidth = 'none';
      }
    };
    updateLayout();
    mq.addEventListener('change', updateLayout);
  }

  private createSliderControl(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string
  ): { wrapper: HTMLDivElement; slider: HTMLInputElement; valueSpan: HTMLSpanElement } {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';
    wrapper.style.flex = '1';
    wrapper.style.minWidth = '120px';

    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.justifyContent = 'space-between';
    labelRow.style.alignItems = 'center';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = '#c8c8e0';
    labelEl.style.fontSize = '12px';
    labelEl.style.fontWeight = '500';

    const valueSpan = document.createElement('span');
    valueSpan.textContent = this.formatValue(value, step) + unit;
    valueSpan.style.color = '#88aaff';
    valueSpan.style.fontSize = '12px';
    valueSpan.style.fontWeight = '600';
    valueSpan.style.fontVariantNumeric = 'tabular-nums';
    valueSpan.style.transition = 'color 0.2s ease-out';

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    const sliderStyle = slider.style;
    sliderStyle.width = '100%';
    sliderStyle.height = '4px';
    sliderStyle.borderRadius = '2px';
    sliderStyle.background = '#2a2a4a';
    sliderStyle.outline = 'none';
    sliderStyle.cursor = 'pointer';
    sliderStyle.appearance = 'none';
    sliderStyle.webkitAppearance = 'none';
    sliderStyle.transition = 'background 0.2s ease-out';

    const styleId = 'slider-style-' + Math.random().toString(36).slice(2, 8);
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4a8cff;
        cursor: pointer;
        transition: all 0.2s ease-out;
        box-shadow: 0 2px 8px rgba(74, 140, 255, 0.4);
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        background: #6aaaff;
        transform: scale(1.15);
        box-shadow: 0 3px 12px rgba(106, 170, 255, 0.5);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4a8cff;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease-out;
        box-shadow: 0 2px 8px rgba(74, 140, 255, 0.4);
      }
      input[type="range"]::-moz-range-thumb:hover {
        background: #6aaaff;
        transform: scale(1.15);
        box-shadow: 0 3px 12px rgba(106, 170, 255, 0.5);
      }
      input[type="range"]::-moz-range-track {
        height: 4px;
        border-radius: 2px;
        background: #2a2a4a;
      }
    `;
    document.head.appendChild(styleEl);

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);

    return { wrapper, slider, valueSpan };
  }

  private formatValue(value: number, step: number): string {
    if (step < 1) {
      return value.toFixed(1);
    }
    return String(Math.round(value));
  }

  private bindEvents(): void {
    this.densitySlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.densityValue.textContent = this.formatValue(value, 500) + '个';
      this.onDensityChange(value);
    });

    this.tailLengthSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.tailLengthValue.textContent = this.formatValue(value, 5) + 'px';
      this.onTailLengthChange(value);
    });

    this.speedSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.speedValue.textContent = this.formatValue(value, 0.1) + 'x';
      this.onSpeedChange(value);
    });
  }

  public destroy(): void {
    this.container.remove();
  }
}
