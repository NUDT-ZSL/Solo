export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  value: number;
  label: string;
  trackGradient?: string;
  trackBackgroundImage?: string;
  formatValue?: (value: number) => string;
}

export class SliderComponent {
  private container: HTMLDivElement;
  private slider: HTMLInputElement;
  private valueLabel: HTMLSpanElement;
  private config: SliderConfig;
  private onChangeCallback: (value: number) => void = () => {};

  constructor(config: SliderConfig) {
    this.config = config;
    this.container = document.createElement('div');
    this.container.style.cssText = `
      width: 100%;
      margin-bottom: 16px;
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const label = document.createElement('span');
    label.textContent = config.label;
    label.style.cssText = `
      color: #fff;
      font-size: 13px;
      font-weight: 500;
    `;

    this.valueLabel = document.createElement('span');
    this.valueLabel.style.cssText = `
      color: #fff;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      font-weight: 600;
    `;
    this.updateValueDisplay(config.value);

    labelRow.appendChild(label);
    labelRow.appendChild(this.valueLabel);

    const trackContainer = document.createElement('div');
    trackContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 6px;
      background: #555;
      border-radius: 3px;
      overflow: hidden;
    `;
    if (config.trackGradient) {
      trackContainer.style.background = config.trackGradient;
    } else if (config.trackBackgroundImage) {
      trackContainer.style.backgroundImage = config.trackBackgroundImage;
      trackContainer.style.backgroundSize = 'cover';
      trackContainer.style.backgroundPosition = 'center';
    }

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = config.min.toString();
    this.slider.max = config.max.toString();
    this.slider.step = config.step.toString();
    this.slider.value = config.value.toString();
    this.slider.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      transform: translateY(-50%);
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
      height: 18px;
      margin: 0;
    `;

    const styleId = `slider-style-${Math.random().toString(36).slice(2, 9)}`;
    const style = document.createElement('style');
    style.textContent = `
      #${styleId}::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #FFD700;
        border: 2px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      #${styleId}::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      #${styleId}::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #FFD700;
        border: 2px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
      }
    `;
    this.slider.id = styleId;
    document.head.appendChild(style);

    this.slider.addEventListener('input', () => {
      const val = parseFloat(this.slider.value);
      this.updateValueDisplay(val);
      this.onChangeCallback(val);
    });

    trackContainer.appendChild(this.slider);
    this.container.appendChild(labelRow);
    this.container.appendChild(trackContainer);
  }

  private updateValueDisplay(value: number): void {
    if (this.config.formatValue) {
      this.valueLabel.textContent = this.config.formatValue(value);
    } else {
      this.valueLabel.textContent = value.toFixed(2);
    }
  }

  public setValue(value: number): void {
    this.slider.value = value.toString();
    this.updateValueDisplay(value);
  }

  public getValue(): number {
    return parseFloat(this.slider.value);
  }

  public onChange(callback: (value: number) => void): void {
    this.onChangeCallback = callback;
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}

export default SliderComponent;
