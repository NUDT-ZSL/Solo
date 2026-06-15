import { Pattern, PatternParams } from './pattern';

interface SliderConfig {
  key: keyof PatternParams;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'rotationSpeed', label: '旋转速度', min: 0, max: 5, step: 0.01, defaultValue: 1 },
  { key: 'colorCycleSpeed', label: '色彩循环速度', min: 0, max: 3, step: 0.01, defaultValue: 1 },
  { key: 'deformationIntensity', label: '形变强度', min: 0.5, max: 2.0, step: 0.01, defaultValue: 1.0 },
];

export class ControlPanel {
  private container: HTMLDivElement;
  private pattern: Pattern;
  private sliders: Map<keyof PatternParams, HTMLInputElement>;
  private valueDisplays: Map<keyof PatternParams, HTMLSpanElement>;
  private resetButton: HTMLButtonElement;
  private onResetCallback: (() => void) | null = null;

  constructor(pattern: Pattern) {
    this.pattern = pattern;
    this.sliders = new Map();
    this.valueDisplays = new Map();

    this.container = document.createElement('div');
    this.styleContainer();

    const title = document.createElement('div');
    title.textContent = '控制面板';
    this.styleTitle(title);
    this.container.appendChild(title);

    for (const config of SLIDER_CONFIGS) {
      const sliderRow = this.createSlider(config);
      this.container.appendChild(sliderRow);
    }

    this.resetButton = document.createElement('button');
    this.resetButton.textContent = '重置';
    this.styleResetButton(this.resetButton);
    this.resetButton.addEventListener('click', () => this.handleReset());
    this.container.appendChild(this.resetButton);

    document.body.appendChild(this.container);
  }

  setOnResetCallback(callback: () => void): void {
    this.onResetCallback = callback;
  }

  private styleContainer(): void {
    const s = this.container.style;
    s.position = 'fixed';
    s.right = '24px';
    s.bottom = '24px';
    s.width = '280px';
    s.padding = '20px';
    s.background = 'rgba(255, 255, 255, 0.12)';
    s.backdropFilter = 'blur(16px) saturate(180%)';
    (s as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = 'blur(16px) saturate(180%)';
    s.borderRadius = '12px';
    s.border = '0.5px solid rgba(74, 144, 226, 0.6)';
    s.boxShadow = '0 0 24px rgba(74, 144, 226, 0.15), inset 0 0 24px rgba(255, 255, 255, 0.05)';
    s.zIndex = '1000';
    s.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    s.userSelect = 'none';
  }

  private styleTitle(el: HTMLDivElement): void {
    const s = el.style;
    s.color = '#66FCF1';
    s.fontSize = '16px';
    s.fontWeight = '600';
    s.marginBottom = '18px';
    s.letterSpacing = '1px';
    s.textAlign = 'center';
    s.textShadow = '0 0 10px rgba(102, 252, 241, 0.4)';
  }

  private createSlider(config: SliderConfig): HTMLDivElement {
    const row = document.createElement('div');
    row.style.marginBottom = '16px';

    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.justifyContent = 'space-between';
    labelRow.style.alignItems = 'center';
    labelRow.style.marginBottom = '8px';

    const label = document.createElement('span');
    label.textContent = config.label;
    label.style.color = '#66FCF1';
    label.style.fontSize = '13px';
    label.style.opacity = '0.9';
    label.style.fontWeight = '500';

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = config.defaultValue.toFixed(2);
    valueDisplay.style.color = '#66FCF1';
    valueDisplay.style.fontSize = '12px';
    valueDisplay.style.fontFamily = 'monospace';
    valueDisplay.style.background = 'rgba(102, 252, 241, 0.1)';
    valueDisplay.style.padding = '2px 8px';
    valueDisplay.style.borderRadius = '4px';
    valueDisplay.style.minWidth = '48px';
    valueDisplay.style.textAlign = 'center';
    valueDisplay.style.transition = 'all 0.15s ease';

    labelRow.appendChild(label);
    labelRow.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(config.defaultValue);

    this.styleSlider(slider);
    this.bindSliderEvents(slider, config, valueDisplay);

    this.sliders.set(config.key, slider);
    this.valueDisplays.set(config.key, valueDisplay);

    row.appendChild(labelRow);
    row.appendChild(slider);

    return row;
  }

  private styleSlider(slider: HTMLInputElement): void {
    const s = slider.style;
    s.width = '100%';
    s.height = '6px';
    s.appearance = 'none';
    s.webkitAppearance = 'none';
    s.background = 'transparent';
    s.cursor = 'pointer';
    s.outline = 'none';

    const styleSheet = document.createElement('style');
    const uniqueId = 'slider-' + Math.random().toString(36).slice(2, 9);
    slider.classList.add(uniqueId);

    styleSheet.textContent = `
      .${uniqueId}::-webkit-slider-runnable-track {
        height: 6px;
        background: linear-gradient(90deg, #2a2d3a 0%, #3a3d4a 100%);
        border-radius: 3px;
        border: 1px solid rgba(74, 144, 226, 0.3);
        transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .${uniqueId}::-webkit-slider-runnable-track:hover {
        border-color: rgba(74, 144, 226, 0.6);
        box-shadow: 0 0 8px rgba(74, 144, 226, 0.3);
      }
      .${uniqueId}::-moz-range-track {
        height: 6px;
        background: linear-gradient(90deg, #2a2d3a 0%, #3a3d4a 100%);
        border-radius: 3px;
        border: 1px solid rgba(74, 144, 226, 0.3);
        transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .${uniqueId}::-moz-range-track:hover {
        border-color: rgba(74, 144, 226, 0.6);
        box-shadow: 0 0 8px rgba(74, 144, 226, 0.3);
      }
      .${uniqueId}::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        margin-top: -7px;
        background: linear-gradient(135deg, #4A90E2 0%, #66FCF1 100%);
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        box-shadow: 0 0 12px rgba(74, 144, 226, 0.6);
        transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .${uniqueId}::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 20px rgba(102, 252, 241, 0.8);
      }
      .${uniqueId}::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: linear-gradient(135deg, #4A90E2 0%, #66FCF1 100%);
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        box-shadow: 0 0 12px rgba(74, 144, 226, 0.6);
        transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .${uniqueId}::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 20px rgba(102, 252, 241, 0.8);
      }
      .${uniqueId}:active::-webkit-slider-thumb {
        transform: scale(1.1);
      }
      .${uniqueId}:active::-moz-range-thumb {
        transform: scale(1.1);
      }
    `;

    document.head.appendChild(styleSheet);
  }

  private bindSliderEvents(
    slider: HTMLInputElement,
    config: SliderConfig,
    valueDisplay: HTMLSpanElement
  ): void {
    let currentValue = parseFloat(slider.value);
    let animating = false;
    let targetValue = currentValue;

    const animate = () => {
      if (!animating) return;

      const diff = targetValue - currentValue;
      if (Math.abs(diff) < 0.001) {
        currentValue = targetValue;
        animating = false;
      } else {
        currentValue += diff * 0.3;
        requestAnimationFrame(animate);
      }

      valueDisplay.textContent = currentValue.toFixed(2);
      this.pattern.setParams({
        [config.key]: currentValue,
      } as Partial<PatternParams>);
    };

    slider.addEventListener('input', () => {
      targetValue = parseFloat(slider.value);
      if (!animating) {
        animating = true;
        requestAnimationFrame(animate);
      }
    });

    slider.addEventListener('change', () => {
      targetValue = parseFloat(slider.value);
      currentValue = targetValue;
      valueDisplay.textContent = currentValue.toFixed(2);
      this.pattern.setParams({
        [config.key]: currentValue,
      } as Partial<PatternParams>);
      animating = false;
    });
  }

  private styleResetButton(btn: HTMLButtonElement): void {
    const s = btn.style;
    s.width = '100%';
    s.padding = '10px 16px';
    s.marginTop = '8px';
    s.background = 'linear-gradient(135deg, rgba(74, 144, 226, 0.3) 0%, rgba(102, 252, 241, 0.3) 100%)';
    s.border = '1px solid rgba(102, 252, 241, 0.5)';
    s.borderRadius = '8px';
    s.color = '#66FCF1';
    s.fontSize = '13px';
    s.fontWeight = '600';
    s.cursor = 'pointer';
    s.letterSpacing = '2px';
    s.transition = 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    s.fontFamily = 'inherit';
    s.outline = 'none';

    btn.addEventListener('mouseenter', () => {
      s.background = 'linear-gradient(135deg, rgba(74, 144, 226, 0.5) 0%, rgba(102, 252, 241, 0.5) 100%)';
      s.borderColor = 'rgba(102, 252, 241, 0.8)';
      s.boxShadow = '0 0 20px rgba(102, 252, 241, 0.4)';
      s.transform = 'translateY(-1px)';
    });

    btn.addEventListener('mouseleave', () => {
      s.background = 'linear-gradient(135deg, rgba(74, 144, 226, 0.3) 0%, rgba(102, 252, 241, 0.3) 100%)';
      s.borderColor = 'rgba(102, 252, 241, 0.5)';
      s.boxShadow = 'none';
      s.transform = 'translateY(0)';
    });

    btn.addEventListener('mousedown', () => {
      s.transform = 'translateY(0)';
      s.boxShadow = '0 0 8px rgba(102, 252, 241, 0.3)';
    });

    btn.addEventListener('mouseup', () => {
      s.boxShadow = '0 0 20px rgba(102, 252, 241, 0.4)';
    });
  }

  private handleReset(): void {
    for (const config of SLIDER_CONFIGS) {
      const slider = this.sliders.get(config.key);
      const display = this.valueDisplays.get(config.key);
      if (slider) {
        slider.value = String(config.defaultValue);
      }
      if (display) {
        display.textContent = config.defaultValue.toFixed(2);
      }
    }

    this.pattern.resetToDefaults();

    if (this.onResetCallback) {
      this.onResetCallback();
    }

    this.container.animate(
      [
        { boxShadow: '0 0 24px rgba(74, 144, 226, 0.15), inset 0 0 24px rgba(255, 255, 255, 0.05), 0 0 0 rgba(102, 252, 241, 0)' },
        { boxShadow: '0 0 24px rgba(74, 144, 226, 0.15), inset 0 0 24px rgba(255, 255, 255, 0.05), 0 0 40px rgba(102, 252, 241, 0.6)' },
        { boxShadow: '0 0 24px rgba(74, 144, 226, 0.15), inset 0 0 24px rgba(255, 255, 255, 0.05), 0 0 0 rgba(102, 252, 241, 0)' },
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }
    );
  }

  destroy(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
