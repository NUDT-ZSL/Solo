export type FlowRateCallback = (value: number) => void;
export type HueCallback = (value: number) => void;
export type ShapeCallback = (value: number) => void;
export type ResetCallback = () => void;

interface SliderConfig {
  min: number;
  max: number;
  step: number;
  default: number;
  label: string;
  unit: string;
}

interface SliderComponents {
  wrapper: HTMLDivElement;
  input: HTMLInputElement;
  valueLabel: HTMLSpanElement;
}

export class ControlPanel {
  private containerEl: HTMLDivElement | null = null;
  private flowRateSlider: SliderComponents | null = null;
  private hueSlider: SliderComponents | null = null;
  private shapeSlider: SliderComponents | null = null;
  private resetBtn: HTMLButtonElement | null = null;

  private flowRateCallbacks: FlowRateCallback[] = [];
  private hueCallbacks: HueCallback[] = [];
  private shapeCallbacks: ShapeCallback[] = [];
  private resetCallbacks: ResetCallback[] = [];

  private mounted: boolean = false;

  constructor() {}

  mount(parentEl: HTMLElement): void {
    if (this.mounted) return;
    this.mounted = true;

    this.containerEl = document.createElement('div');
    this.containerEl.className = 'sand-control-panel';
    this.applyPanelStyle(this.containerEl);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '沙影参数';
    this.applyTitleStyle(title);
    this.containerEl.appendChild(title);

    this.flowRateSlider = this.createSlider({
      min: 0.5,
      max: 5.0,
      step: 0.1,
      default: 1.0,
      label: '沙粒流速',
      unit: '秒'
    });

    this.hueSlider = this.createSlider({
      min: 0,
      max: 360,
      step: 1,
      default: 40,
      label: '颜色色相',
      unit: '°'
    });

    this.shapeSlider = this.createSlider({
      min: 0,
      max: 100,
      step: 1,
      default: 50,
      label: '沙堆形状',
      unit: ''
    });

    if (this.containerEl) {
      this.containerEl.appendChild(this.flowRateSlider.wrapper);
      this.containerEl.appendChild(this.hueSlider.wrapper);
      this.containerEl.appendChild(this.shapeSlider.wrapper);
    }

    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'reset-button';
    this.resetBtn.innerHTML = '↺';
    this.applyResetBtnStyle(this.resetBtn);

    parentEl.appendChild(this.containerEl);
    parentEl.appendChild(this.resetBtn);

    this.bindEvents();
  }

  private createSlider(config: SliderConfig): SliderComponents {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-group';
    this.applySliderGroupStyle(wrapper);

    const header = document.createElement('div');
    header.className = 'slider-header';
    this.applySliderHeaderStyle(header);

    const label = document.createElement('span');
    label.className = 'slider-label';
    label.textContent = config.label;
    this.applySliderLabelStyle(label);

    const valueLabel = document.createElement('span');
    valueLabel.className = 'slider-value';
    valueLabel.textContent = `${config.default}${config.unit}`;
    this.applySliderValueStyle(valueLabel);

    header.appendChild(label);
    header.appendChild(valueLabel);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(config.default);
    this.applySliderInputStyle(input);

    wrapper.appendChild(header);
    wrapper.appendChild(input);

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valueLabel.textContent = `${v}${config.unit}`;
    });

    return { wrapper, input, valueLabel };
  }

  private applyStyle(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(el.style, styles);
  }

  private applyPanelStyle(el: HTMLDivElement): void {
    this.applyStyle(el, {
      position: 'fixed',
      left: '24px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '220px',
      padding: '20px 18px',
      background: 'rgba(255, 255, 255, 0.69)',
      backdropFilter: 'blur(12px)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(184, 134, 11, 0.15), 0 2px 8px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(212, 175, 55, 0.3)',
      zIndex: '100',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      userSelect: 'none'
    });
    (el.style as unknown as Record<string, string>).webkitBackdropFilter = 'blur(12px)';
  }

  private applyTitleStyle(el: HTMLDivElement): void {
    this.applyStyle(el, {
      fontSize: '15px',
      fontWeight: '600',
      color: '#8B6914',
      marginBottom: '18px',
      textAlign: 'center',
      letterSpacing: '2px'
    });
  }

  private applySliderGroupStyle(el: HTMLDivElement): void {
    this.applyStyle(el, {
      marginBottom: '18px'
    });
  }

  private applySliderHeaderStyle(el: HTMLDivElement): void {
    this.applyStyle(el, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    });
  }

  private applySliderLabelStyle(el: HTMLSpanElement): void {
    this.applyStyle(el, {
      fontSize: '12px',
      color: '#6B5A1E',
      fontWeight: '500'
    });
  }

  private applySliderValueStyle(el: HTMLSpanElement): void {
    this.applyStyle(el, {
      fontSize: '11px',
      color: '#B8860B',
      fontWeight: '600',
      fontFamily: "'SF Mono', 'Consolas', monospace",
      background: 'rgba(212, 175, 55, 0.1)',
      padding: '2px 7px',
      borderRadius: '4px'
    });
  }

  private applySliderInputStyle(el: HTMLInputElement): void {
    this.applyStyle(el, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.6) 0%, rgba(184, 134, 11, 0.6) 100%)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer'
    });
    (el.style as unknown as Record<string, string>).webkitAppearance = 'none';

    const styleId = 'sand-slider-style';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(145deg, #F5E6A8, #C9A84C);
          border: 1px solid rgba(184, 134, 11, 0.5);
          box-shadow: 0 2px 6px rgba(184, 134, 11, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: transform 0.15s cubic-bezier(.4,0,.2,1);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(145deg, #F5E6A8, #C9A84C);
          border: 1px solid rgba(184, 134, 11, 0.5);
          box-shadow: 0 2px 6px rgba(184, 134, 11, 0.3);
          cursor: pointer;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  private applyResetBtnStyle(el: HTMLButtonElement): void {
    this.applyStyle(el, {
      position: 'fixed',
      right: '30px',
      bottom: '30px',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: 'linear-gradient(145deg, #D4AF37, #B8860B)',
      border: 'none',
      color: '#FFF8DC',
      fontSize: '22px',
      fontWeight: 'bold',
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(184, 134, 11, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
      transition: 'transform 0.2s cubic-bezier(.4,0,.2,1), box-shadow 0.2s cubic-bezier(.4,0,.2,1)',
      zIndex: '100',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      outline: 'none'
    });

    el.addEventListener('mouseenter', () => {
      el.style.boxShadow = '0 6px 20px rgba(184, 134, 11, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.4)';
    });

    el.addEventListener('mouseleave', () => {
      el.style.boxShadow = '0 4px 16px rgba(184, 134, 11, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)';
    });

    el.addEventListener('mousedown', () => {
      el.style.transform = 'scale(0.9)';
    });

    el.addEventListener('mouseup', () => {
      el.style.transform = 'scale(1.05)';
      setTimeout(() => {
        el.style.transform = 'scale(1)';
      }, 100);
    });
  }

  private bindEvents(): void {
    if (this.flowRateSlider) {
      this.flowRateSlider.input.addEventListener('input', () => {
        if (this.flowRateSlider) {
          const v = parseFloat(this.flowRateSlider.input.value);
          this.flowRateCallbacks.forEach(cb => cb(v));
        }
      });
    }

    if (this.hueSlider) {
      this.hueSlider.input.addEventListener('input', () => {
        if (this.hueSlider) {
          const v = parseInt(this.hueSlider.input.value, 10);
          this.hueCallbacks.forEach(cb => cb(v));
        }
      });
    }

    if (this.shapeSlider) {
      this.shapeSlider.input.addEventListener('input', () => {
        if (this.shapeSlider) {
          const v = parseInt(this.shapeSlider.input.value, 10);
          this.shapeCallbacks.forEach(cb => cb(v));
        }
      });
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        this.resetCallbacks.forEach(cb => cb());
      });
    }
  }

  onFlowRateChange(cb: FlowRateCallback): void {
    this.flowRateCallbacks.push(cb);
  }

  onHueChange(cb: HueCallback): void {
    this.hueCallbacks.push(cb);
  }

  onShapeChange(cb: ShapeCallback): void {
    this.shapeCallbacks.push(cb);
  }

  onReset(cb: ResetCallback): void {
    this.resetCallbacks.push(cb);
  }

  unmount(): void {
    if (this.containerEl && this.containerEl.parentNode) {
      this.containerEl.parentNode.removeChild(this.containerEl);
    }
    if (this.resetBtn && this.resetBtn.parentNode) {
      this.resetBtn.parentNode.removeChild(this.resetBtn);
    }
    this.flowRateCallbacks = [];
    this.hueCallbacks = [];
    this.shapeCallbacks = [];
    this.resetCallbacks = [];
    this.mounted = false;
  }
}
