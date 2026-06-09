export interface UICallbacks {
  onDensityChange: (count: number) => void;
  onColorSpeedChange: (speed: number) => void;
  onWaveStrengthChange: (radius: number) => void;
}

interface StatsData {
  crystalCount: number;
  avgHeight: number;
  colorTheme: string;
}

export class UIController {
  private canvas: HTMLCanvasElement;
  private densitySlider: HTMLInputElement;
  private colorSpeedSlider: HTMLInputElement;
  private waveStrengthSlider: HTMLInputElement;
  private crystalCountEl: HTMLElement;
  private avgHeightEl: HTMLElement;
  private colorThemeEl: HTMLElement;
  private densityValueEl: HTMLElement;
  private colorSpeedValueEl: HTMLElement;
  private waveStrengthValueEl: HTMLElement;

  private callbacks: UICallbacks;
  private statsUpdateInterval: number | null = null;
  private currentThemeColor: string = '#58A6FF';
  private styleEl: HTMLStyleElement | null = null;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.canvas = this.getRequiredElement<HTMLCanvasElement>('canvas');
    this.densitySlider = this.getRequiredElement<HTMLInputElement>('density-slider');
    this.colorSpeedSlider = this.getRequiredElement<HTMLInputElement>('color-speed-slider');
    this.waveStrengthSlider = this.getRequiredElement<HTMLInputElement>('wave-strength-slider');
    this.crystalCountEl = this.getRequiredElement<HTMLElement>('crystal-count');
    this.avgHeightEl = this.getRequiredElement<HTMLElement>('avg-height');
    this.colorThemeEl = this.getRequiredElement<HTMLElement>('color-theme');
    this.densityValueEl = this.getRequiredElement<HTMLElement>('density-value');
    this.colorSpeedValueEl = this.getRequiredElement<HTMLElement>('color-speed-value');
    this.waveStrengthValueEl = this.getRequiredElement<HTMLElement>('wave-strength-value');

    this.injectStyles();
    this.applyBaseStyles();
    this.bindSliderEvents();
    this.updateSliderValuesDisplay();
    this.startStatsUpdate();
  }

  private getRequiredElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Element with id "${id}" not found`);
    }
    return el as T;
  }

  private injectStyles(): void {
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = `
      @keyframes ui-float-up {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 0.8;
          transform: translateY(0);
        }
      }

      .ui-stat-value {
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        text-shadow: 0 0 4px rgba(100, 150, 255, 0.5);
        display: inline-block;
      }

      .ui-stat-value.animate {
        animation: ui-float-up 0.25s ease-out forwards;
      }

      .ui-text {
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        text-shadow: 0 0 4px rgba(100, 150, 255, 0.5);
      }

      .ui-slider-value {
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        text-shadow: 0 0 4px rgba(100, 150, 255, 0.5);
        font-weight: 600;
      }

      input[type="range"].ui-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
        border: 1px solid transparent;
        transition: border-color 0.2s ease, background 0.2s ease;
      }

      input[type="range"].ui-slider:hover {
        background: rgba(255, 255, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      input[type="range"].ui-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #58A6FF;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid #05050F;
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.3s ease;
      }

      input[type="range"].ui-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }

      input[type="range"].ui-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #58A6FF;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid #05050F;
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.3s ease;
      }

      input[type="range"].ui-slider::-moz-range-thumb:hover {
        transform: scale(1.15);
      }
    `;
    document.head.appendChild(this.styleEl);
  }

  private applyBaseStyles(): void {
    const statElements = [this.crystalCountEl, this.avgHeightEl, this.colorThemeEl];
    statElements.forEach((el) => {
      el.classList.add('ui-stat-value');
    });

    const valueElements = [this.densityValueEl, this.colorSpeedValueEl, this.waveStrengthValueEl];
    valueElements.forEach((el) => {
      el.classList.add('ui-slider-value');
    });

    const sliders = [this.densitySlider, this.colorSpeedSlider, this.waveStrengthSlider];
    sliders.forEach((slider) => {
      slider.classList.add('ui-slider');
    });
  }

  private bindSliderEvents(): void {
    this.densitySlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      this.densityValueEl.textContent = value.toString();
      this.callbacks.onDensityChange(value);
    });

    this.colorSpeedSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      this.colorSpeedValueEl.textContent = value.toFixed(1);
      this.callbacks.onColorSpeedChange(value);
    });

    this.waveStrengthSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      this.waveStrengthValueEl.textContent = value.toFixed(1);
      this.callbacks.onWaveStrengthChange(value);
    });
  }

  private updateSliderValuesDisplay(): void {
    this.densityValueEl.textContent = this.densitySlider.value;
    this.colorSpeedValueEl.textContent = parseFloat(this.colorSpeedSlider.value).toFixed(1);
    this.waveStrengthValueEl.textContent = parseFloat(this.waveStrengthSlider.value).toFixed(1);
  }

  private startStatsUpdate(): void {
    this.statsUpdateInterval = window.setInterval(() => {
      this.updateStats();
    }, 1000);
  }

  private animateElement(el: HTMLElement): void {
    el.classList.remove('animate');
    void el.offsetWidth;
    el.classList.add('animate');
  }

  public setThemeColor(color: string): void {
    this.currentThemeColor = color;

    const sliders = [this.densitySlider, this.colorSpeedSlider, this.waveStrengthSlider];
    sliders.forEach((slider) => {
      const thumbStyle = `
        input[type="range"].ui-slider#${slider.id}::-webkit-slider-thumb {
          background: ${color};
          box-shadow: 0 0 10px ${color}66;
        }
        input[type="range"].ui-slider#${slider.id}::-moz-range-thumb {
          background: ${color};
          box-shadow: 0 0 10px ${color}66;
        }
      `;
      if (this.styleEl) {
        this.styleEl.textContent += thumbStyle;
      }
    });

    this.colorThemeEl.style.color = color;
  }

  public updateStats(data?: Partial<StatsData>): void {
    if (data) {
      if (data.crystalCount !== undefined) {
        this.crystalCountEl.textContent = data.crystalCount.toString();
        this.animateElement(this.crystalCountEl);
      }
      if (data.avgHeight !== undefined) {
        this.avgHeightEl.textContent = data.avgHeight.toFixed(2);
        this.animateElement(this.avgHeightEl);
      }
      if (data.colorTheme !== undefined) {
        this.colorThemeEl.textContent = data.colorTheme;
        this.animateElement(this.colorThemeEl);
      }
    } else {
      this.animateElement(this.crystalCountEl);
      this.animateElement(this.avgHeightEl);
      this.animateElement(this.colorThemeEl);
    }
  }

  public setCrystalCount(count: number): void {
    this.crystalCountEl.textContent = count.toString();
    this.animateElement(this.crystalCountEl);
  }

  public setAvgHeight(height: number): void {
    this.avgHeightEl.textContent = height.toFixed(2);
    this.animateElement(this.avgHeightEl);
  }

  public setColorTheme(theme: string, color?: string): void {
    this.colorThemeEl.textContent = theme;
    this.animateElement(this.colorThemeEl);
    if (color) {
      this.setThemeColor(color);
    }
  }

  public getDensity(): number {
    return parseInt(this.densitySlider.value, 10);
  }

  public getColorSpeed(): number {
    return parseFloat(this.colorSpeedSlider.value);
  }

  public getWaveStrength(): number {
    return parseFloat(this.waveStrengthSlider.value);
  }

  public dispose(): void {
    if (this.statsUpdateInterval !== null) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
  }
}
