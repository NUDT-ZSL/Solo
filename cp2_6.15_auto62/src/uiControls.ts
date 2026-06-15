export interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  onChange: (value: number) => void;
}

export interface SliderState {
  currentValue: number;
  targetValue: number;
  displayValue: number;
}

export class SliderControl {
  private container: HTMLElement;
  private config: SliderConfig;
  private state: SliderState;

  private sliderTrack!: HTMLDivElement;
  private sliderFill!: HTMLDivElement;
  private sliderThumb!: HTMLDivElement;
  private valueDisplay!: HTMLDivElement;
  private labelElement!: HTMLLabelElement;

  private isDragging: boolean = false;
  private transitionDuration: number = 200;
  private smoothTransitionTime: number = 100;

  constructor(container: HTMLElement, config: SliderConfig) {
    this.container = container;
    this.config = config;
    this.state = {
      currentValue: config.defaultValue,
      targetValue: config.defaultValue,
      displayValue: config.defaultValue,
    };
    this.createSlider();
    this.setupEventListeners();
    this.updateSliderUI();
  }

  private createSlider(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom: 16px;';

    this.labelElement = document.createElement('label');
    this.labelElement.textContent = this.config.label;
    this.labelElement.style.cssText = `
      display: block;
      font-size: 14px;
      color: #e0e0e0;
      margin-bottom: 8px;
      font-weight: 500;
    `;

    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = 'position: relative; height: 24px;';

    this.sliderTrack = document.createElement('div');
    this.sliderTrack.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 6px;
      transform: translateY(-50%);
      background: #2a2a2a;
      border-radius: 3px;
      cursor: pointer;
    `;

    this.sliderFill = document.createElement('div');
    this.sliderFill.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      height: 6px;
      transform: translateY(-50%);
      background: linear-gradient(90deg, #ff6b6b, #ff8787);
      border-radius: 3px;
      transition: width ${this.transitionDuration}ms ease;
      pointer-events: none;
    `;

    this.sliderThumb = document.createElement('div');
    this.sliderThumb.style.cssText = `
      position: absolute;
      top: 50%;
      width: 24px;
      height: 24px;
      transform: translate(-50%, -50%);
      background: #ff6b6b;
      border-radius: 50%;
      cursor: grab;
      box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
      transition: left ${this.transitionDuration}ms ease, transform 0.1s ease;
      z-index: 10;
    `;

    this.valueDisplay = document.createElement('div');
    this.valueDisplay.style.cssText = `
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      padding: 4px 10px;
      background: #1e1e1e;
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      font-family: 'Consolas', 'Monaco', monospace;
      pointer-events: none;
      white-space: nowrap;
      transition: left ${this.transitionDuration}ms ease;
      z-index: 5;
    `;

    sliderContainer.appendChild(this.sliderTrack);
    sliderContainer.appendChild(this.sliderFill);
    sliderContainer.appendChild(this.sliderThumb);
    sliderContainer.appendChild(this.valueDisplay);

    wrapper.appendChild(this.labelElement);
    wrapper.appendChild(sliderContainer);
    this.container.appendChild(wrapper);
  }

  private setupEventListeners(): void {
    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.isDragging = true;
      this.sliderThumb.style.cursor = 'grabbing';
      this.updateFromEvent(e);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();
      this.updateFromEvent(e);
    };

    const handleEnd = () => {
      this.isDragging = false;
      this.sliderThumb.style.cursor = 'grab';
    };

    this.sliderTrack.addEventListener('mousedown', handleStart);
    this.sliderThumb.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    this.sliderTrack.addEventListener('touchstart', handleStart, { passive: false });
    this.sliderThumb.addEventListener('touchstart', handleStart, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  }

  private updateFromEvent(e: MouseEvent | TouchEvent): void {
    const rect = this.sliderTrack.getBoundingClientRect();
    let clientX: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const range = this.config.max - this.config.min;
    const rawValue = this.config.min + x * range;
    const steppedValue = Math.round(rawValue / this.config.step) * this.config.step;
    const clampedValue = Math.max(this.config.min, Math.min(this.config.max, steppedValue));

    this.setTargetValue(clampedValue);
  }

  private valueToPosition(value: number): number {
    const range = this.config.max - this.config.min;
    return ((value - this.config.min) / range) * 100;
  }

  private formatValue(value: number): string {
    if (this.config.step >= 1) {
      return value.toFixed(0);
    } else if (this.config.step >= 0.1) {
      return value.toFixed(1);
    } else {
      return value.toFixed(2);
    }
  }

  private updateSliderUI(): void {
    const position = this.valueToPosition(this.state.displayValue);
    this.sliderFill.style.width = `${position}%`;
    this.sliderThumb.style.left = `${position}%`;

    const thumbRightOffset = 36;
    this.valueDisplay.style.left = `calc(${position}% + ${thumbRightOffset}px)`;
    this.valueDisplay.textContent = this.formatValue(this.state.displayValue);
  }

  public setTargetValue(value: number): void {
    this.state.targetValue = Math.max(this.config.min, Math.min(this.config.max, value));
  }

  public update(deltaTime: number): void {
    const smoothingFactor = Math.min(1, deltaTime / this.smoothTransitionTime);

    if (Math.abs(this.state.displayValue - this.state.targetValue) > 0.0001) {
      this.state.displayValue = this.lerp(
        this.state.displayValue,
        this.state.targetValue,
        smoothingFactor
      );
      this.updateSliderUI();
    }

    if (Math.abs(this.state.currentValue - this.state.targetValue) > 0.0001) {
      this.state.currentValue = this.lerp(
        this.state.currentValue,
        this.state.targetValue,
        smoothingFactor
      );
      this.config.onChange(this.state.currentValue);
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public getValue(): number {
    return this.state.currentValue;
  }

  public setValueImmediate(value: number): void {
    this.state.currentValue = value;
    this.state.targetValue = value;
    this.state.displayValue = value;
    this.updateSliderUI();
  }
}

export class UIControls {
  private container: HTMLElement;
  private sliders: Map<string, SliderControl> = new Map();

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;
  }

  public addSlider(id: string, config: SliderConfig): SliderControl {
    const slider = new SliderControl(this.container, config);
    this.sliders.set(id, slider);
    return slider;
  }

  public update(deltaTime: number): void {
    this.sliders.forEach((slider) => slider.update(deltaTime));
  }

  public getSlider(id: string): SliderControl | undefined {
    return this.sliders.get(id);
  }

  public setSliderValue(id: string, value: number): void {
    const slider = this.sliders.get(id);
    if (slider) {
      slider.setTargetValue(value);
    }
  }
}
