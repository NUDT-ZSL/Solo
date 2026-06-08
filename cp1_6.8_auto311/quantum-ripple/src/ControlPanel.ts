export interface ControlPanelOptions {
  spawnRate: number;
  pulseIntensity: number;
  showTrails: boolean;
  onSpawnRateChange: (value: number) => void;
  onPulseIntensityChange: (value: number) => void;
  onShowTrailsChange: (value: boolean) => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private spawnRateSlider: HTMLInputElement;
  private pulseIntensitySlider: HTMLInputElement;
  private spawnRateValue: HTMLSpanElement;
  private pulseIntensityValue: HTMLSpanElement;
  private onSpawnRateChange: (value: number) => void;
  private onPulseIntensityChange: (value: number) => void;
  private onShowTrailsChange: (value: boolean) => void;

  constructor(options: ControlPanelOptions) {
    this.onSpawnRateChange = options.onSpawnRateChange;
    this.onPulseIntensityChange = options.onPulseIntensityChange;
    this.onShowTrailsChange = options.onShowTrailsChange;

    this.container = document.createElement('div');
    this.container.className = 'quantum-control-panel';
    Object.assign(this.container.style, {
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      padding: '20px 24px',
      background: 'rgba(20, 10, 40, 0.55)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '16px',
      border: '1px solid rgba(100, 80, 200, 0.25)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      color: '#c8b8e8',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: '13px',
      zIndex: '100',
      minWidth: '240px',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      userSelect: 'none',
    });

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '14px',
      fontWeight: '600',
      color: '#d4c0ff',
      marginBottom: '16px',
      letterSpacing: '0.5px',
    });
    title.textContent = '⚛ 量子场控制';
    this.container.appendChild(title);

    this.spawnRateValue = this.createSliderRow(
      '粒子生成频率',
      1,
      30,
      options.spawnRate,
      1,
      (val) => {
        this.spawnRateValue.textContent = String(val);
        this.onSpawnRateChange(val);
      },
    );
    this.spawnRateSlider = this.container.querySelector(
      '.qcp-slider-spawn-rate',
    ) as HTMLInputElement;

    this.pulseIntensityValue = this.createSliderRow(
      '脉冲强度',
      0.5,
      5,
      options.pulseIntensity,
      0.5,
      (val) => {
        this.pulseIntensityValue.textContent = val.toFixed(1);
        this.onPulseIntensityChange(val);
      },
    );
    this.pulseIntensitySlider = this.container.querySelector(
      '.qcp-slider-pulse-intensity',
    ) as HTMLInputElement;

    this.createCheckboxRow('显示轨迹线', options.showTrails, (checked) => {
      this.onShowTrailsChange(checked);
    });

    document.body.appendChild(this.container);

    this.injectStyles();
  }

  private createSliderRow(
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onChange: (val: number) => void,
  ): HTMLSpanElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      marginBottom: '14px',
    });

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.opacity = '0.85';

    const valueEl = document.createElement('span');
    valueEl.textContent = String(value);
    Object.assign(valueEl.style, {
      color: '#a78bfa',
      fontWeight: '600',
      fontSize: '12px',
    });

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    row.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    const cls =
      label === '粒子生成频率'
        ? 'qcp-slider-spawn-rate'
        : 'qcp-slider-pulse-intensity';
    slider.className = cls;
    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'rgba(100, 80, 200, 0.2)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
      transition: 'background 0.2s ease',
    });

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      onChange(v);
    });

    row.appendChild(slider);
    this.container.appendChild(row);

    return valueEl;
  }

  private createCheckboxRow(
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ): void {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '4px',
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    Object.assign(checkbox.style, {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '16px',
      height: '16px',
      border: '1.5px solid rgba(100, 80, 200, 0.5)',
      borderRadius: '4px',
      background: checked ? 'rgba(139, 92, 246, 0.6)' : 'transparent',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.25s ease, border-color 0.25s ease',
    });

    if (checked) {
      checkbox.style.borderColor = 'rgba(139, 92, 246, 0.8)';
    }

    checkbox.addEventListener('change', () => {
      const isChecked = checkbox.checked;
      checkbox.style.background = isChecked
        ? 'rgba(139, 92, 246, 0.6)'
        : 'transparent';
      checkbox.style.borderColor = isChecked
        ? 'rgba(139, 92, 246, 0.8)'
        : 'rgba(100, 80, 200, 0.5)';
      onChange(isChecked);
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.opacity = '0.85';

    row.appendChild(checkbox);
    row.appendChild(labelEl);
    this.container.appendChild(row);
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .quantum-control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(167, 139, 250, 0.9);
        border: 2px solid rgba(200, 180, 255, 0.4);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .quantum-control-panel input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(139, 92, 246, 0.7);
      }
      .quantum-control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(167, 139, 250, 0.9);
        border: 2px solid rgba(200, 180, 255, 0.4);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
      }
      .quantum-control-panel input[type="checkbox"]:checked::after {
        content: '✓';
        position: absolute;
        top: -1px;
        left: 2px;
        font-size: 11px;
        color: #e0d0ff;
      }
    `;
    document.head.appendChild(style);
  }

  dispose(): void {
    this.container.remove();
  }
}
