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

    this.injectStyles();

    this.container = document.createElement('div');
    this.container.className = 'pc-control-panel';

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

  private injectStyles(): void {
    const styleId = 'pc-control-panel-styles';
    if (document.getElementById(styleId)) return;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      .pc-control-panel {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(31, 31, 46, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 16px;
        padding: 12px 20px;
        display: flex;
        flex-direction: row;
        gap: 28px;
        z-index: 100;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.2s ease-out;
      }

      @media (max-width: 768px) {
        .pc-control-panel {
          flex-direction: column;
          gap: 12px;
          padding: 12px 16px;
          bottom: 16px;
          left: 16px;
          right: 16px;
          transform: none;
          width: calc(100% - 32px);
          max-width: none;
        }
      }

      .pc-slider-wrapper {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
        min-width: 120px;
      }

      @media (max-width: 768px) {
        .pc-slider-wrapper {
          min-width: unset;
        }
      }

      .pc-slider-label {
        color: #c8c8e0;
        font-size: 12px;
        font-weight: 500;
      }

      .pc-slider-value {
        color: #88aaff;
        font-size: 12px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        transition: color 0.2s ease-out;
      }

      .pc-slider-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      input[type="range"].pc-slider {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: #2a2a4a;
        outline: none;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
        transition: background 0.2s ease-out;
      }

      input[type="range"].pc-slider::-webkit-slider-thumb {
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

      input[type="range"].pc-slider::-webkit-slider-thumb:hover {
        background: #6aaaff;
        transform: scale(1.15);
        box-shadow: 0 3px 12px rgba(106, 170, 255, 0.5);
      }

      input[type="range"].pc-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4a8cff;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease-out;
        box-shadow: 0 2px 8px rgba(74, 140, 255, 0.4);
      }

      input[type="range"].pc-slider::-moz-range-thumb:hover {
        background: #6aaaff;
        transform: scale(1.15);
        box-shadow: 0 3px 12px rgba(106, 170, 255, 0.5);
      }

      input[type="range"].pc-slider::-moz-range-track {
        height: 4px;
        border-radius: 2px;
        background: #2a2a4a;
      }

      @media (max-width: 768px) {
        input[type="range"].pc-slider::-webkit-slider-thumb {
          width: 20px;
          height: 20px;
        }
        input[type="range"].pc-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
        }
      }
    `;
    document.head.appendChild(styleEl);
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
    wrapper.className = 'pc-slider-wrapper';

    const labelRow = document.createElement('div');
    labelRow.className = 'pc-slider-label-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'pc-slider-label';
    labelEl.textContent = label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'pc-slider-value';
    valueSpan.textContent = this.formatValue(value, step) + unit;

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'pc-slider';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

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
