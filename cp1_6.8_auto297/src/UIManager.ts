import {
  DIFFUSION_RATE_DEFAULT,
  DIFFUSION_RATE_MIN,
  DIFFUSION_RATE_MAX,
  INJECTION_STRENGTH_DEFAULT,
  INJECTION_STRENGTH_MIN,
  INJECTION_STRENGTH_MAX,
} from './constants';

type SliderCallback = (value: number) => void;
type ResetCallback = () => void;

export class UIManager {
  private container: HTMLElement;
  private panel: HTMLElement;
  private diffusionSlider: HTMLInputElement;
  private injectionSlider: HTMLInputElement;
  private diffusionValue: HTMLElement;
  private injectionValue: HTMLElement;
  private resetBtn: HTMLElement;
  private onDiffusionChange: SliderCallback | null = null;
  private onInjectionChange: SliderCallback | null = null;
  private onReset: ResetCallback | null = null;

  constructor() {
    this.container = document.body;
    this.panel = this.createPanel();
    this.diffusionSlider = this.createSlider('扩散速率', DIFFUSION_RATE_MIN, DIFFUSION_RATE_MAX, DIFFUSION_RATE_DEFAULT, 0.01);
    this.injectionSlider = this.createSlider('注入强度', INJECTION_STRENGTH_MIN, INJECTION_STRENGTH_MAX, INJECTION_STRENGTH_DEFAULT, 0.01);
    this.diffusionValue = this.createValueDisplay(DIFFUSION_RATE_DEFAULT);
    this.injectionValue = this.createValueDisplay(INJECTION_STRENGTH_DEFAULT);
    this.resetBtn = this.createResetButton();

    this.buildLayout();
    this.bindEvents();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = '';
    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '20px 24px',
      background: 'rgba(10, 15, 40, 0.55)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(100, 140, 255, 0.2)',
      borderRadius: '16px',
      color: '#c8d6f0',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: '13px',
      zIndex: '100',
      minWidth: '220px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(100, 140, 255, 0.08)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      userSelect: 'none',
    });
    return panel;
  }

  private createSlider(label: string, min: number, max: number, value: number, step: number): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'rgba(60, 80, 140, 0.4)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
      margin: '6px 0 0 0',
      transition: 'background 0.3s ease',
    });
    return slider;
  }

  private createValueDisplay(value: number): HTMLElement {
    const span = document.createElement('span');
    span.textContent = value.toFixed(2);
    Object.assign(span.style, {
      float: 'right',
      color: '#7ba0ff',
      fontWeight: '600',
      fontSize: '12px',
      transition: 'color 0.3s ease',
    });
    return span;
  }

  private createResetButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.textContent = '重置';
    Object.assign(btn.style, {
      width: '100%',
      padding: '8px 0',
      marginTop: '14px',
      background: 'rgba(60, 80, 160, 0.3)',
      border: '1px solid rgba(100, 140, 255, 0.25)',
      borderRadius: '8px',
      color: '#a0b8f0',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      letterSpacing: '1px',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(80, 100, 200, 0.5)';
      btn.style.borderColor = 'rgba(130, 160, 255, 0.5)';
      btn.style.color = '#d0e0ff';
      btn.style.transform = 'scale(1.02)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(60, 80, 160, 0.3)';
      btn.style.borderColor = 'rgba(100, 140, 255, 0.25)';
      btn.style.color = '#a0b8f0';
      btn.style.transform = 'scale(1)';
    });

    return btn;
  }

  private buildLayout(): void {
    const title = document.createElement('div');
    title.textContent = '熵增迷雾';
    Object.assign(title.style, {
      fontSize: '15px',
      fontWeight: '700',
      color: '#b0c8ff',
      marginBottom: '16px',
      letterSpacing: '2px',
      textAlign: 'center',
      textShadow: '0 0 12px rgba(100, 140, 255, 0.4)',
    });
    this.panel.appendChild(title);

    const diffusionGroup = this.createSliderGroup('扩散速率', this.diffusionSlider, this.diffusionValue);
    this.panel.appendChild(diffusionGroup);

    const spacer = document.createElement('div');
    spacer.style.height = '12px';
    this.panel.appendChild(spacer);

    const injectionGroup = this.createSliderGroup('注入强度', this.injectionSlider, this.injectionValue);
    this.panel.appendChild(injectionGroup);

    this.panel.appendChild(this.resetBtn);

    this.injectSliderStyles();

    this.container.appendChild(this.panel);
  }

  private createSliderGroup(label: string, slider: HTMLInputElement, valueDisplay: HTMLElement): HTMLElement {
    const group = document.createElement('div');

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2px',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.opacity = '0.8';

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueDisplay);

    group.appendChild(labelRow);
    group.appendChild(slider);

    return group;
  }

  private injectSliderStyles(): void {
    const styleId = 'entropy-slider-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #7ba0ff;
        box-shadow: 0 0 8px rgba(100, 140, 255, 0.5);
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      #control-panel input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(100, 140, 255, 0.7);
      }
      #control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #7ba0ff;
        box-shadow: 0 0 8px rgba(100, 140, 255, 0.5);
        cursor: pointer;
        border: none;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      #control-panel input[type="range"]::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(100, 140, 255, 0.7);
      }
      @media (max-width: 640px) {
        #control-panel {
          bottom: 12px !important;
          right: 12px !important;
          left: 12px !important;
          minWidth: unset !important;
          padding: 14px 16px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    this.diffusionSlider.addEventListener('input', () => {
      const val = parseFloat(this.diffusionSlider.value);
      this.diffusionValue.textContent = val.toFixed(2);
      this.onDiffusionChange?.(val);
    });

    this.injectionSlider.addEventListener('input', () => {
      const val = parseFloat(this.injectionSlider.value);
      this.injectionValue.textContent = val.toFixed(2);
      this.onInjectionChange?.(val);
    });

    this.resetBtn.addEventListener('click', () => {
      this.animateReset();
      this.onReset?.();
    });
  }

  private animateReset(): void {
    this.panel.style.transform = 'scale(0.95)';
    this.panel.style.opacity = '0.7';
    setTimeout(() => {
      this.panel.style.transform = 'scale(1)';
      this.panel.style.opacity = '1';
    }, 150);

    this.diffusionSlider.value = String(DIFFUSION_RATE_DEFAULT);
    this.injectionSlider.value = String(INJECTION_STRENGTH_DEFAULT);
    this.diffusionValue.textContent = DIFFUSION_RATE_DEFAULT.toFixed(2);
    this.injectionValue.textContent = INJECTION_STRENGTH_DEFAULT.toFixed(2);

    this.onDiffusionChange?.(DIFFUSION_RATE_DEFAULT);
    this.onInjectionChange?.(INJECTION_STRENGTH_DEFAULT);
  }

  setDiffusionChangeCallback(cb: SliderCallback): void {
    this.onDiffusionChange = cb;
  }

  setInjectionChangeCallback(cb: SliderCallback): void {
    this.onInjectionChange = cb;
  }

  setResetCallback(cb: ResetCallback): void {
    this.onReset = cb;
  }

  dispose(): void {
    this.container.removeChild(this.panel);
  }
}
