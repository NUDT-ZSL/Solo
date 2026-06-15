export class ControlPanel {
  private container: HTMLDivElement;
  private strengthSlider: HTMLInputElement;
  private angleSlider: HTMLInputElement;
  private resetBtn: HTMLButtonElement;
  private strengthValue: HTMLSpanElement;
  private angleValue: HTMLSpanElement;
  private onStrengthChange: (value: number) => void;
  private onAngleChange: (value: number) => void;
  private onReset: () => void;

  constructor(
    onStrengthChange: (value: number) => void,
    onAngleChange: (value: number) => void,
    onReset: () => void,
  ) {
    this.onStrengthChange = onStrengthChange;
    this.onAngleChange = onAngleChange;
    this.onReset = onReset;

    this.container = document.createElement('div');
    this.container.id = 'control-panel';
    Object.assign(this.container.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '240px',
      padding: '20px',
      background: 'rgba(15, 20, 50, 0.55)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '16px',
      border: '1px solid rgba(100, 140, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      color: '#c0d0ff',
      fontFamily: "'Segoe UI', sans-serif",
      fontSize: '13px',
      zIndex: '100',
      transition: 'opacity 0.4s ease',
    });

    const titleStyle = {
      fontSize: '14px',
      fontWeight: '600',
      color: '#a0b8ff',
      marginBottom: '14px',
      letterSpacing: '1px',
      textTransform: 'uppercase' as const,
    };

    const title = document.createElement('div');
    Object.assign(title.style, titleStyle);
    title.textContent = '控制面板';
    this.container.appendChild(title);

    this.strengthValue = this.createSliderGroup('引力波强度', 1, 10, 5, (val) => {
      this.onStrengthChange(val);
    });
    this.strengthSlider = this.container.querySelector('input[type=range]') as HTMLInputElement;

    this.angleValue = this.createSliderGroup('偏折角度', 1, 10, 5, (val) => {
      this.onAngleChange(val);
    });
    this.angleSlider = this.container.querySelectorAll('input[type=range]')[1] as HTMLInputElement;

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      height: '1px',
      background: 'rgba(100, 140, 255, 0.15)',
      margin: '16px 0',
    });
    this.container.appendChild(divider);

    this.resetBtn = document.createElement('button');
    Object.assign(this.resetBtn.style, {
      width: '100%',
      padding: '10px',
      background: 'rgba(80, 120, 255, 0.15)',
      border: '1px solid rgba(100, 140, 255, 0.3)',
      borderRadius: '10px',
      color: '#a0b8ff',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      letterSpacing: '1px',
    });
    this.resetBtn.textContent = '重置关卡';
    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.background = 'rgba(80, 120, 255, 0.3)';
      this.resetBtn.style.borderColor = 'rgba(130, 160, 255, 0.5)';
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.background = 'rgba(80, 120, 255, 0.15)';
      this.resetBtn.style.borderColor = 'rgba(100, 140, 255, 0.3)';
    });
    this.resetBtn.addEventListener('click', () => {
      this.onReset();
    });
    this.container.appendChild(this.resetBtn);

    document.body.appendChild(this.container);
    this.injectStyles();
  }

  private createSliderGroup(
    label: string,
    min: number,
    max: number,
    value: number,
    onChange: (val: number) => void,
  ): HTMLSpanElement {
    const group = document.createElement('div');
    Object.assign(group.style, { marginBottom: '14px' });

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px',
    });

    const lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.color = '#8090cc';

    const valSpan = document.createElement('span');
    valSpan.textContent = String(value);
    Object.assign(valSpan.style, {
      color: '#a0c0ff',
      fontWeight: '600',
      fontSize: '12px',
    });

    labelRow.appendChild(lbl);
    labelRow.appendChild(valSpan);
    group.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.step = '0.5';
    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'rgba(80, 120, 255, 0.2)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
    });

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valSpan.textContent = String(v);
      onChange(v);
    });

    group.appendChild(slider);
    this.container.appendChild(group);
    return valSpan;
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #control-panel input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(120, 160, 255, 0.8);
        border: 2px solid rgba(180, 200, 255, 0.5);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(100, 140, 255, 0.4);
        transition: transform 0.15s ease;
      }
      #control-panel input[type=range]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        background: rgba(150, 180, 255, 0.95);
      }
      #control-panel input[type=range]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(120, 160, 255, 0.8);
        border: 2px solid rgba(180, 200, 255, 0.5);
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  getStrength(): number {
    return parseFloat(this.strengthSlider.value);
  }

  getAngle(): number {
    return parseFloat(this.angleSlider.value);
  }

  setOpacity(val: number): void {
    this.container.style.opacity = String(val);
  }

  show(): void {
    this.container.style.display = 'block';
    this.container.style.opacity = '0';
    requestAnimationFrame(() => {
      this.container.style.opacity = '1';
    });
  }

  hide(): void {
    this.container.style.opacity = '0';
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 400);
  }

  destroy(): void {
    this.container.remove();
  }
}
