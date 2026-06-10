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

export class ControlPanel {
  private containerEl: HTMLDivElement | null = null;
  private flowRateSlider: HTMLInputElement | null = null;
  private hueSlider: HTMLInputElement | null = null;
  private shapeSlider: HTMLInputElement | null = null;
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

    this.containerEl.appendChild(this.flowRateSlider.wrapper);
    this.containerEl.appendChild(this.hueSlider.wrapper);
    this.containerEl.appendChild(this.shapeSlider.wrapper);

    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'reset-button';
    this.resetBtn.innerHTML = '↺';
    this.applyResetBtnStyle(this.resetBtn);
    this.containerEl.appendChild(this.resetBtn);

    parentEl.appendChild(this.containerEl);

    this.bindEvents();
  }

  private createSlider(config: SliderConfig): { wrapper: HTMLDivElement; input: HTMLInputElement; valueLabel: HTMLSpanElement } {
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

  private applyPanelStyle(el: HTMLDivElement): void {
    Object.assign(el.style, {
      position: 'fixed',
      left: '24px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '220px',
      padding: '20px 18px',
      background: 'rgba(255, 255, 255, 0.69)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(184, 134, 11, 0.15), 0 2px 8px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(212, 175, 55, 0.3)',
      zIndex: '100',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      userSelect: 'none'
    } as CSSStyleDeclaration);
  }

  private applyTitleStyle(el: HTMLDivElement): void {
    Object.assign(el.style, {
      fontSize: '15px',
      fontWeight: '600',
      color: '#8B6914',
      marginBottom: '18px',
      textAlign: 'center',
      letterSpacing: '2px'
    } as CSSStyleDeclaration);
  }

  private applySliderGroupStyle(el: HTMLDivElement): void {
    Object.assign(el.style, {
      marginBottom: '18px'
    } as CSSStyleDeclaration);
  }

  private applySliderHeaderStyle(el: HTMLDivElement): void {
    Object.assign(el.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    } as CSSStyleDeclaration);
  }

  private applySliderLabelStyle(el: HTMLSpanElement): void {
    Object.assign(el.style, {
      fontSize: '12px',
      color: '#6B5A1E',
      fontWeight: '500'
    } as CSSStyleDeclaration);
  }

  private applySliderValueStyle(el: HTMLSpanElement): void {
    Object.assign(el.style, {
      fontSize: '11px',
      color: '#B8860B',
      fontWeight: '600',
      fontFamily: "'SF Mono', 'Consolas', monospace",
      background: 'rgba(212, 175, 55, 0.1)',
      padding: '2px 7px',
      borderRadius: '4px'
    } as CSSStyleDeclaration);
  }

  private applySliderInputStyle(el: HTMLInputElement): void {
    Object.assign(el.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.6) 0%, rgba(184, 134, 11, 0.6) 100%)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer'
    } as CSSStyleDeclaration);

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
    Object.assign(el.style, {
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
    } as CSSStyleDeclaration);

    el.addEventListener('mouseenter', () => {
      if (el) {
        el.style.boxShadow = '0 6px 20px rgba(184, 134, 11, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.4)';
      }
    });

    el.addEventListener('mouseleave', () => {
      if (el) {
        el.style.boxShadow = '0 4px 16px rgba(184, 134, 11, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)';
      }
    });

    el.addEventListener('mousedown', () => {
      if (el) {
        el.style.transform = 'scale(0.9)';
      }
    });

    el.addEventListener('mouseup', () => {
      if (el) {
        el.style.transform = 'scale(1.05)';
        setTimeout(() => {
          if (el) el.style.transform = 'scale(1)';
        }, 100);
      }
    });
  }

  private bindEvents(): void {
    if (this.flowRateSlider) {
      this.flowRateSlider.addEventListener('input', () => {
        const v = parseFloat(this.flowRateSlider!.value);
        this.flowRateCallbacks.forEach(cb => cb(v));
      });
    }

    if (this.hueSlider) {
      this.hueSlider.addEventListener('input', () => {
        const v = parseInt(this.hueSlider!.value, 10);
        this.hueCallbacks.forEach(cb => cb(v));
      });
    }

    if (this.shapeSlider) {
      this.shapeSlider.addEventListener('input', () => {
        const v = parseInt(this.shapeSlider!.value, 10);
        this.shapeCallbacks.forEach(cb => cb(v));
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
