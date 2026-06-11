import type { PatternParams } from './pattern';

export type SurfaceType = 'cylinder' | 'sphere' | 'torusKnot';

export interface UICallbacks {
  onParamsChange: (params: Partial<PatternParams>) => void;
  onSurfaceChange: (surface: SurfaceType) => void;
  onReset: () => void;
}

export class UIPanel {
  private callbacks: UICallbacks;
  private params: PatternParams;
  private currentSurface: SurfaceType;

  private curlSlider: HTMLInputElement;
  private densitySlider: HTMLInputElement;
  private colorShiftSlider: HTMLInputElement;
  private flowSpeedSlider: HTMLInputElement;

  private curlValue: HTMLElement;
  private densityValue: HTMLElement;
  private colorShiftValue: HTMLElement;
  private flowSpeedValue: HTMLElement;

  private surfaceButtons: NodeListOf<HTMLButtonElement>;
  private resetButton: HTMLButtonElement;

  private mobileMenuBtn: HTMLButtonElement;
  private uiContainer: HTMLElement;
  private isMobileOpen: boolean = false;

  constructor(defaultParams: PatternParams, defaultSurface: SurfaceType, callbacks: UICallbacks) {
    this.params = { ...defaultParams };
    this.currentSurface = defaultSurface;
    this.callbacks = callbacks;

    this.curlSlider = document.getElementById('curl-slider') as HTMLInputElement;
    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.colorShiftSlider = document.getElementById('color-shift-slider') as HTMLInputElement;
    this.flowSpeedSlider = document.getElementById('flow-speed-slider') as HTMLInputElement;

    this.curlValue = document.getElementById('curl-value')!;
    this.densityValue = document.getElementById('density-value')!;
    this.colorShiftValue = document.getElementById('color-shift-value')!;
    this.flowSpeedValue = document.getElementById('flow-speed-value')!;

    this.surfaceButtons = document.querySelectorAll('.surface-btn');
    this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement;

    this.mobileMenuBtn = document.getElementById('mobile-menu-btn') as HTMLButtonElement;
    this.uiContainer = document.getElementById('ui-container')!;

    this.initEventListeners();
    this.updateSliderColors();
    this.initOutsideClickListener();
  }

  private isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  private closeMobileMenuIfNeeded(): void {
    if (this.isMobile()) {
      this.closeMobileMenu();
    }
  }

  private initOutsideClickListener(): void {
    document.addEventListener('click', (e) => {
      if (this.isMobile() && this.isMobileOpen) {
        const target = e.target as Node;
        if (!this.uiContainer.contains(target) && !this.mobileMenuBtn.contains(target)) {
          this.closeMobileMenu();
        }
      }
    });

    document.addEventListener('touchend', (e) => {
      if (this.isMobile() && this.isMobileOpen) {
        const target = e.target as Node;
        if (!this.uiContainer.contains(target) && !this.mobileMenuBtn.contains(target)) {
          this.closeMobileMenu();
        }
      }
    });
  }

  private initEventListeners(): void {
    this.curlSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.curl = value;
      this.curlValue.textContent = value.toString();
      this.updateSliderColor(this.curlSlider, value, 0, 100);
      this.callbacks.onParamsChange({ curl: value });
    });
    this.curlSlider.addEventListener('change', () => {
      this.closeMobileMenuIfNeeded();
    });

    this.densitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.density = value;
      this.densityValue.textContent = value.toString();
      this.updateSliderColor(this.densitySlider, value, 10, 50);
      this.callbacks.onParamsChange({ density: value });
    });
    this.densitySlider.addEventListener('change', () => {
      this.closeMobileMenuIfNeeded();
    });

    this.colorShiftSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.colorShift = value;
      this.colorShiftValue.textContent = `${value}°`;
      this.updateSliderColor(this.colorShiftSlider, value, 0, 360);
      this.callbacks.onParamsChange({ colorShift: value });
    });
    this.colorShiftSlider.addEventListener('change', () => {
      this.closeMobileMenuIfNeeded();
    });

    this.flowSpeedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.flowSpeed = value;
      this.flowSpeedValue.textContent = value.toFixed(3);
      this.updateSliderColor(this.flowSpeedSlider, value, 0, 0.2);
      this.callbacks.onParamsChange({ flowSpeed: value });
    });
    this.flowSpeedSlider.addEventListener('change', () => {
      this.closeMobileMenuIfNeeded();
    });

    this.surfaceButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const surface = btn.dataset.surface as SurfaceType;
        if (surface && surface !== this.currentSurface) {
          this.setSurface(surface);
          this.callbacks.onSurfaceChange(surface);
          this.closeMobileMenuIfNeeded();
        }
      });
    });

    this.resetButton.addEventListener('click', () => {
      this.callbacks.onReset();
      this.closeMobileMenuIfNeeded();
    });

    this.mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMobileMenu();
    });

    this.mobileMenuBtn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.toggleMobileMenu();
    });

    this.uiContainer.addEventListener('touchstart', (e) => {
      if (this.isMobile() && this.isMobileOpen) {
        e.stopPropagation();
        e.preventDefault();
      }
    });

    this.uiContainer.addEventListener('touchmove', (e) => {
      if (this.isMobile() && this.isMobileOpen) {
        e.stopPropagation();
      }
    });

    this.uiContainer.addEventListener('touchend', (e) => {
      if (this.isMobile() && this.isMobileOpen) {
        e.stopPropagation();
        e.preventDefault();
      }
    });

    this.uiContainer.addEventListener('touchcancel', (e) => {
      if (this.isMobile() && this.isMobileOpen) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
  }

  private updateSliderColors(): void {
    this.updateSliderColor(this.curlSlider, this.params.curl, 0, 100);
    this.updateSliderColor(this.densitySlider, this.params.density, 10, 50);
    this.updateSliderColor(this.colorShiftSlider, this.params.colorShift, 0, 360);
    this.updateSliderColor(this.flowSpeedSlider, this.params.flowSpeed, 0, 0.2);
  }

  private updateSliderColor(
    slider: HTMLInputElement,
    value: number,
    min: number,
    max: number
  ): void {
    const progress = (value - min) / (max - min);
    const color = this.interpolateColor('#6C63FF', '#FF6584', progress);

    const style = document.createElement('style');
    const uniqueId = `slider-${slider.id}`;
    style.id = uniqueId;
    style.textContent = `
      #${slider.id}::-webkit-slider-thumb {
        background: ${color} !important;
      }
      #${slider.id}::-moz-range-thumb {
        background: ${color} !important;
      }
    `;

    const existingStyle = document.getElementById(uniqueId);
    if (existingStyle) {
      existingStyle.remove();
    }
    document.head.appendChild(style);
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  }

  setParams(params: PatternParams): void {
    this.params = { ...params };

    this.curlSlider.value = params.curl.toString();
    this.densitySlider.value = params.density.toString();
    this.colorShiftSlider.value = params.colorShift.toString();
    this.flowSpeedSlider.value = params.flowSpeed.toString();

    this.curlValue.textContent = params.curl.toString();
    this.densityValue.textContent = params.density.toString();
    this.colorShiftValue.textContent = `${params.colorShift}°`;
    this.flowSpeedValue.textContent = params.flowSpeed.toFixed(3);

    this.updateSliderColors();
  }

  setSurface(surface: SurfaceType): void {
    this.currentSurface = surface;
    this.surfaceButtons.forEach((btn) => {
      if (btn.dataset.surface === surface) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private toggleMobileMenu(): void {
    this.isMobileOpen = !this.isMobileOpen;
    if (this.isMobileOpen) {
      this.uiContainer.classList.add('open');
      this.mobileMenuBtn.textContent = '✕';
    } else {
      this.uiContainer.classList.remove('open');
      this.mobileMenuBtn.textContent = '☰';
    }
  }

  closeMobileMenu(): void {
    if (this.isMobileOpen) {
      this.isMobileOpen = false;
      this.uiContainer.classList.remove('open');
      this.mobileMenuBtn.textContent = '☰';
    }
  }
}
