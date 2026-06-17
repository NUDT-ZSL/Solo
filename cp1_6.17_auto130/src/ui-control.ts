import type { GalaxyParams } from './galaxy-generator';
import { getThemeGradientCSS } from './galaxy-generator';

export class UIController {
  private starCountSlider: HTMLInputElement;
  private starCountValue: HTMLElement;
  private orbitMinSlider: HTMLInputElement;
  private orbitMinValue: HTMLElement;
  private orbitMaxSlider: HTMLInputElement;
  private orbitMaxValue: HTMLElement;
  private colorThemeSelect: HTMLSelectElement;
  private generateBtn: HTMLButtonElement;
  private fpsCounter: HTMLElement;
  private perfNotice: HTMLElement;
  private boundaryNotice: HTMLElement;

  private onGenerate: ((params: GalaxyParams) => void) | null = null;
  private boundaryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.starCountSlider = document.getElementById('star-count') as HTMLInputElement;
    this.starCountValue = document.getElementById('star-count-value') as HTMLElement;
    this.orbitMinSlider = document.getElementById('orbit-min') as HTMLInputElement;
    this.orbitMinValue = document.getElementById('orbit-min-value') as HTMLElement;
    this.orbitMaxSlider = document.getElementById('orbit-max') as HTMLInputElement;
    this.orbitMaxValue = document.getElementById('orbit-max-value') as HTMLElement;
    this.colorThemeSelect = document.getElementById('color-theme') as HTMLSelectElement;
    this.generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
    this.fpsCounter = document.getElementById('fps-counter') as HTMLElement;
    this.perfNotice = document.getElementById('perf-notice') as HTMLElement;
    this.boundaryNotice = document.getElementById('boundary-notice') as HTMLElement;

    this.bindEvents();
    this.applyThemeStyles();
  }

  private bindEvents() {
    this.starCountSlider.addEventListener('input', () => {
      this.starCountValue.textContent = this.starCountSlider.value;
    });

    this.orbitMinSlider.addEventListener('input', () => {
      this.orbitMinValue.textContent = this.orbitMinSlider.value;
    });

    this.orbitMaxSlider.addEventListener('input', () => {
      this.orbitMaxValue.textContent = this.orbitMaxSlider.value;
    });

    this.colorThemeSelect.addEventListener('change', () => {
      this.applyThemeStyles();
    });

    this.generateBtn.addEventListener('click', () => {
      if (this.onGenerate) {
        this.onGenerate(this.getParams());
      }
    });
  }

  private applyThemeStyles() {
    const theme = this.colorThemeSelect.value;
    const gradient = getThemeGradientCSS(theme);

    this.generateBtn.style.background = gradient;

    const styleId = 'dynamic-slider-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const colors = this.getThemeColorValues(theme);
    styleEl.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        background: ${gradient};
        box-shadow: 0 0 6px ${colors.primary}80;
      }
      input[type="range"]::-moz-range-thumb {
        background: ${gradient};
        box-shadow: 0 0 6px ${colors.primary}80;
      }
    `;
  }

  private getThemeColorValues(theme: string): { primary: string; secondary: string } {
    const map: Record<string, { primary: string; secondary: string }> = {
      'galaxy-purple': { primary: '#8B5CF6', secondary: '#3B82F6' },
      'sunset-orange': { primary: '#F97316', secondary: '#EAB308' },
      'aurora-green': { primary: '#10B981', secondary: '#06B6D4' },
    };
    return map[theme] || map['galaxy-purple'];
  }

  getParams(): GalaxyParams {
    return {
      starCount: parseInt(this.starCountSlider.value, 10),
      orbitMin: parseFloat(this.orbitMinSlider.value),
      orbitMax: parseFloat(this.orbitMaxSlider.value),
      colorTheme: this.colorThemeSelect.value,
    };
  }

  setGenerateCallback(cb: (params: GalaxyParams) => void) {
    this.onGenerate = cb;
  }

  updateFps(fps: number) {
    this.fpsCounter.textContent = `FPS: ${fps}`;

    if (fps < 45) {
      this.fpsCounter.style.color = '#FF4444';
      this.perfNotice.style.display = 'block';
    } else {
      this.fpsCounter.style.color = '#00FF88';
      this.perfNotice.style.display = 'none';
    }
  }

  showBoundaryNotice() {
    this.boundaryNotice.classList.add('visible');

    if (this.boundaryTimer) {
      clearTimeout(this.boundaryTimer);
    }

    this.boundaryTimer = setTimeout(() => {
      this.boundaryNotice.classList.remove('visible');
    }, 3000);
  }
}
