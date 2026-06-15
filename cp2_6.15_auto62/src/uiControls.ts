export interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
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

  private wrapper!: HTMLDivElement;
  private sliderTrack!: HTMLDivElement;
  private sliderFill!: HTMLDivElement;
  private sliderThumb!: HTMLDivElement;
  private valueDisplay!: HTMLDivElement;
  private labelElement!: HTMLLabelElement;

  private isDragging: boolean = false;
  private transitionDuration: number = 200;
  private smoothTransitionTime: number = 100;

  private trackWidth: number = 0;

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
    this.updateSliderUI(false);
  }

  private createSlider(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = 'margin-bottom: 16px;';

    this.labelElement = document.createElement('label');
    this.labelElement.textContent = this.config.label;
    this.labelElement.style.cssText = `
      display: block;
      font-size: 14px;
      color: #e0e0e0;
      margin-bottom: 8px;
      font-weight: 500;
      user-select: none;
    `;

    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = 'position: relative; height: 28px;';

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
      width: 0%;
      pointer-events: none;
    `;

    this.sliderThumb = document.createElement('div');
    this.sliderThumb.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0%;
      width: 24px;
      height: 24px;
      margin-left: -12px;
      transform: translateY(-50%);
      background: #ff6b6b;
      border-radius: 50%;
      cursor: grab;
      box-shadow: 0 2px 8px rgba(255, 107, 107, 0.5), 0 0 0 0 rgba(255, 107, 107, 0.3);
      transition: box-shadow 0.2s ease, transform 0.1s ease;
      z-index: 10;
      user-select: none;
    `;

    this.valueDisplay = document.createElement('div');
    this.valueDisplay.style.cssText = `
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: calc(0% + 20px);
      padding: 4px 10px;
      background: #1e1e1e;
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      pointer-events: none;
      white-space: nowrap;
      z-index: 5;
      border: 1px solid rgba(255, 107, 107, 0.3);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    `;

    sliderContainer.appendChild(this.sliderTrack);
    sliderContainer.appendChild(this.sliderFill);
    sliderContainer.appendChild(this.sliderThumb);
    sliderContainer.appendChild(this.valueDisplay);

    this.wrapper.appendChild(this.labelElement);
    this.wrapper.appendChild(sliderContainer);
    this.container.appendChild(this.wrapper);
  }

  private setupEventListeners(): void {
    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.isDragging = true;
      this.sliderThumb.style.cursor = 'grabbing';
      this.sliderThumb.style.transform = 'translateY(-50%) scale(1.1)';
      this.disableTransition();
      this.updateFromEvent(e);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();
      this.updateFromEvent(e);
    };

    const handleEnd = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.sliderThumb.style.cursor = 'grab';
        this.sliderThumb.style.transform = 'translateY(-50%) scale(1)';
        this.enableTransition();
      }
    };

    this.sliderTrack.addEventListener('mousedown', handleStart);
    this.sliderThumb.addEventListener('mousedown', handleStart);
    this.sliderFill.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    this.sliderTrack.addEventListener('touchstart', handleStart, { passive: false });
    this.sliderThumb.addEventListener('touchstart', handleStart, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
  }

  private disableTransition(): void {
    this.sliderFill.style.transition = 'none';
    this.sliderThumb.style.transition = 'none';
    this.valueDisplay.style.transition = 'none';
  }

  private enableTransition(): void {
    this.sliderFill.style.transition = `width ${this.transitionDuration}ms ease`;
    this.sliderThumb.style.transition = `left ${this.transitionDuration}ms ease, transform 0.1s ease`;
    this.valueDisplay.style.transition = `left ${this.transitionDuration}ms ease`;
  }

  private updateFromEvent(e: MouseEvent | TouchEvent): void {
    const rect = this.sliderTrack.getBoundingClientRect();
    let clientX: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    this.trackWidth = rect.width;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const range = this.config.max - this.config.min;
    const rawValue = this.config.min + x * range;
    const steppedValue = Math.round(rawValue / this.config.step) * this.config.step;
    const clampedValue = Math.max(this.config.min, Math.min(this.config.max, steppedValue));

    this.state.targetValue = clampedValue;
    this.state.displayValue = clampedValue;
    this.state.currentValue = clampedValue;

    this.updateSliderUI(false);
    this.config.onChange(clampedValue);
  }

  private valueToPosition(value: number): number {
    const range = this.config.max - this.config.min;
    return ((value - this.config.min) / range) * 100;
  }

  private formatValue(value: number): string {
    let formatted: string;
    if (this.config.step >= 1) {
      formatted = value.toFixed(0);
    } else if (this.config.step >= 0.1) {
      formatted = value.toFixed(1);
    } else {
      formatted = value.toFixed(2);
    }
    if (this.config.unit) {
      return `${formatted}${this.config.unit}`;
    }
    return formatted;
  }

  private updateSliderUI(animated: boolean = true): void {
    const position = this.valueToPosition(this.state.displayValue);

    this.sliderFill.style.width = `${position}%`;
    this.sliderThumb.style.left = `${position}%`;

    const thumbOffset = 12;
    const gap = 8;
    const valueLeft = position + (thumbOffset + gap) / this.getTrackWidth() * 100;
    this.valueDisplay.style.left = `${valueLeft}%`;
    this.valueDisplay.textContent = this.formatValue(this.state.displayValue);
  }

  private getTrackWidth(): number {
    if (this.trackWidth <= 0) {
      const rect = this.sliderTrack.getBoundingClientRect();
      this.trackWidth = rect.width;
    }
    return this.trackWidth || 200;
  }

  public setTargetValue(value: number): void {
    this.state.targetValue = Math.max(this.config.min, Math.min(this.config.max, value));
    this.enableTransition();
  }

  public update(deltaTime: number): void {
    if (this.isDragging) return;

    const smoothingFactor = Math.min(1, deltaTime / this.smoothTransitionTime);
    let needsUpdate = false;

    if (Math.abs(this.state.displayValue - this.state.targetValue) > 0.0001) {
      this.state.displayValue = this.lerp(
        this.state.displayValue,
        this.state.targetValue,
        smoothingFactor
      );
      needsUpdate = true;
    }

    if (Math.abs(this.state.currentValue - this.state.targetValue) > 0.0001) {
      this.state.currentValue = this.lerp(
        this.state.currentValue,
        this.state.targetValue,
        smoothingFactor
      );
      this.config.onChange(this.state.currentValue);
    }

    if (needsUpdate) {
      this.updateSliderUI(true);
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public getValue(): number {
    return this.state.currentValue;
  }

  public getTargetValue(): number {
    return this.state.targetValue;
  }

  public setValueImmediate(value: number): void {
    this.state.currentValue = value;
    this.state.targetValue = value;
    this.state.displayValue = value;
    this.disableTransition();
    this.updateSliderUI(false);
    requestAnimationFrame(() => this.enableTransition());
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
