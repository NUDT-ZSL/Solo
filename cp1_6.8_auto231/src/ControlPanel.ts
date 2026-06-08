export interface ControlPanelOptions {
  rayThickness: number;
  particleSpreadSpeed: number;
  onRayThicknessChange: (value: number) => void;
  onParticleSpreadSpeedChange: (value: number) => void;
  onReset: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private rayThicknessSlider: HTMLInputElement;
  private particleSpreadSlider: HTMLInputElement;
  private rayThicknessValue: HTMLSpanElement;
  private particleSpreadValue: HTMLSpanElement;
  private options: ControlPanelOptions;

  constructor(options: ControlPanelOptions) {
    this.options = options;

    this.container = document.createElement('div');
    this.container.id = 'control-panel';
    Object.assign(this.container.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '20px 24px',
      background: 'rgba(255, 255, 255, 0.06)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#ccc',
      fontFamily: "'Segoe UI', sans-serif",
      fontSize: '13px',
      zIndex: '100',
      minWidth: '220px',
      opacity: '0',
      transform: 'translateY(20px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease',
      userSelect: 'none',
    });

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '14px',
      fontWeight: '600',
      color: '#e0e0e0',
      marginBottom: '16px',
      letterSpacing: '1px',
    });
    title.textContent = '控制面板';
    this.container.appendChild(title);

    this.rayThicknessValue = this.createSliderGroup(
      '光线粗细',
      0.5, 5.0, 0.1,
      options.rayThickness,
      (val) => {
        this.options.onRayThicknessChange(val);
        this.rayThicknessValue.textContent = val.toFixed(1);
      },
      'ray-thickness'
    );

    this.rayThicknessSlider = this.container.querySelector('#ray-thickness') as HTMLInputElement;

    this.particleSpreadValue = this.createSliderGroup(
      '粒子扩散速度',
      0.2, 3.0, 0.1,
      options.particleSpreadSpeed,
      (val) => {
        this.options.onParticleSpreadSpeedChange(val);
        this.particleSpreadValue.textContent = val.toFixed(1);
      },
      'particle-spread'
    );

    this.particleSpreadSlider = this.container.querySelector('#particle-spread') as HTMLInputElement;

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      height: '1px',
      background: 'rgba(255,255,255,0.1)',
      margin: '14px 0',
    });
    this.container.appendChild(divider);

    const resetBtn = document.createElement('button');
    Object.assign(resetBtn.style, {
      width: '100%',
      padding: '8px 0',
      background: 'rgba(255, 80, 80, 0.15)',
      border: '1px solid rgba(255, 80, 80, 0.3)',
      borderRadius: '8px',
      color: '#ff8888',
      cursor: 'pointer',
      fontSize: '13px',
      fontFamily: "'Segoe UI', sans-serif",
      transition: 'background 0.2s, border-color 0.2s',
    });
    resetBtn.textContent = '重置画布';
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(255, 80, 80, 0.25)';
      resetBtn.style.borderColor = 'rgba(255, 80, 80, 0.5)';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(255, 80, 80, 0.15)';
      resetBtn.style.borderColor = 'rgba(255, 80, 80, 0.3)';
    });
    resetBtn.addEventListener('click', () => {
      this.options.onReset();
    });
    this.container.appendChild(resetBtn);

    document.body.appendChild(this.container);

    requestAnimationFrame(() => {
      this.container.style.opacity = '1';
      this.container.style.transform = 'translateY(0)';
    });
  }

  private createSliderGroup(
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    onChange: (value: number) => void,
    id: string
  ): HTMLSpanElement {
    const group = document.createElement('div');
    Object.assign(group.style, {
      marginBottom: '14px',
    });

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '6px',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.textContent = defaultValue.toFixed(1);
    Object.assign(valueEl.style, {
      color: '#aaa',
      fontVariantNumeric: 'tabular-nums',
    });

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    group.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);
    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'rgba(255,255,255,0.12)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
    });

    const style = document.createElement('style');
    style.textContent = `
      #${id}::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(200, 180, 255, 0.8);
        border: 2px solid rgba(255,255,255,0.3);
        cursor: pointer;
        transition: background 0.2s;
      }
      #${id}::-webkit-slider-thumb:hover {
        background: rgba(220, 200, 255, 1);
      }
      #${id}::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(200, 180, 255, 0.8);
        border: 2px solid rgba(255,255,255,0.3);
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    slider.addEventListener('input', () => {
      onChange(parseFloat(slider.value));
    });

    group.appendChild(slider);
    this.container.appendChild(group);

    return valueEl;
  }

  get rayThickness(): number {
    return parseFloat(this.rayThicknessSlider.value);
  }

  get particleSpreadSpeed(): number {
    return parseFloat(this.particleSpreadSlider.value);
  }

  dispose(): void {
    this.container.remove();
  }
}
