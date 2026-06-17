import type { GalaxyParams } from './galaxy-generator';
import { getThemeGradientCSS } from './galaxy-generator';

const DEFAULT_PARAMS: GalaxyParams = {
  starCount: 200,
  orbitMin: 5,
  orbitMax: 12,
  colorTheme: 'galaxy-purple',
};

const THEME_LABELS: Record<string, string> = {
  'galaxy-purple': '星河紫',
  'sunset-orange': '落日橙',
  'aurora-green': '极光绿',
};

export class UIController {
  private starCountSlider: HTMLInputElement;
  private starCountValue: HTMLElement;
  private orbitMinSlider: HTMLInputElement;
  private orbitMinValue: HTMLElement;
  private orbitMaxSlider: HTMLInputElement;
  private orbitMaxValue: HTMLElement;
  private orbitRangeValue: HTMLElement;
  private colorThemeSelect: HTMLSelectElement;
  private themeDisplay: HTMLElement;
  private generateBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private fpsCounter: HTMLElement;
  private perfNotice: HTMLElement;
  private boundaryNotice: HTMLElement;
  private panelTitle: HTMLElement;

  private onGenerate: ((params: GalaxyParams) => void) | null = null;
  private boundaryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.starCountSlider = document.getElementById('star-count') as HTMLInputElement;
    this.starCountValue = document.getElementById('star-count-value') as HTMLElement;
    this.orbitMinSlider = document.getElementById('orbit-min') as HTMLInputElement;
    this.orbitMinValue = document.getElementById('orbit-min-value') as HTMLElement;
    this.orbitMaxSlider = document.getElementById('orbit-max') as HTMLInputElement;
    this.orbitMaxValue = document.getElementById('orbit-max-value') as HTMLElement;
    this.orbitRangeValue = document.getElementById('orbit-range-value') as HTMLElement;
    this.colorThemeSelect = document.getElementById('color-theme') as HTMLSelectElement;
    this.themeDisplay = document.getElementById('theme-display') as HTMLElement;
    this.generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.fpsCounter = document.getElementById('fps-counter') as HTMLElement;
    this.perfNotice = document.getElementById('perf-notice') as HTMLElement;
    this.boundaryNotice = document.getElementById('boundary-notice') as HTMLElement;
    this.panelTitle = document.querySelector('.panel-title') as HTMLElement;

    this.addGalaxyIcon();
    this.bindEvents();
    this.updateAllValueDisplays();
    this.applyThemeStyles();
  }

  private addGalaxyIcon() {
    const iconSvg = `
      <svg class="galaxy-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="galaxy-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:var(--theme-primary);stop-opacity:1" />
            <stop offset="100%" style="stop-color:var(--theme-secondary);stop-opacity:0.8" />
          </radialGradient>
        </defs>
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="var(--theme-primary)" stroke-width="1.5" fill="none" opacity="0.6"/>
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="var(--theme-secondary)" stroke-width="1.5" fill="none" transform="rotate(60 12 12)" opacity="0.6"/>
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="var(--theme-primary)" stroke-width="1.5" fill="none" transform="rotate(-60 12 12)" opacity="0.6"/>
        <circle cx="12" cy="12" r="2.5" fill="var(--theme-primary)"/>
        <circle cx="12" cy="12" r="1.5" fill="var(--theme-secondary)"/>
      </svg>
    `;
    const iconWrapper = document.createElement('span');
    iconWrapper.innerHTML = iconSvg.trim();
    iconWrapper.style.display = 'inline-flex';
    iconWrapper.style.alignItems = 'center';
    this.panelTitle.insertBefore(iconWrapper.firstChild!, this.panelTitle.firstChild);
  }

  private bindEvents() {
    this.starCountSlider.addEventListener('input', () => {
      this.updateStarCountDisplay();
    });

    this.orbitMinSlider.addEventListener('input', () => {
      this.updateOrbitRangeDisplay();
    });

    this.orbitMaxSlider.addEventListener('input', () => {
      this.updateOrbitRangeDisplay();
    });

    this.colorThemeSelect.addEventListener('change', () => {
      this.applyThemeStyles();
      this.updateThemeDisplay();
    });

    this.generateBtn.addEventListener('click', () => {
      if (this.onGenerate) {
        this.onGenerate(this.getParams());
      }
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetToDefaults();
    });
  }

  private updateAllValueDisplays() {
    this.updateStarCountDisplay();
    this.updateOrbitRangeDisplay();
    this.updateThemeDisplay();
  }

  private updateStarCountDisplay() {
    this.starCountValue.textContent = `${this.starCountSlider.value} 颗`;
  }

  private updateOrbitRangeDisplay() {
    const minVal = parseFloat(this.orbitMinSlider.value);
    const maxVal = parseFloat(this.orbitMaxSlider.value);
    this.orbitMinValue.textContent = minVal.toFixed(1);
    this.orbitMaxValue.textContent = maxVal.toFixed(1);
    this.orbitRangeValue.textContent = `${minVal.toFixed(1)} - ${maxVal.toFixed(1)}`;
  }

  private updateThemeDisplay() {
    const theme = this.colorThemeSelect.value;
    this.themeDisplay.textContent = THEME_LABELS[theme] || theme;
  }

  private resetToDefaults() {
    this.starCountSlider.value = DEFAULT_PARAMS.starCount.toString();
    this.orbitMinSlider.value = DEFAULT_PARAMS.orbitMin.toString();
    this.orbitMaxSlider.value = DEFAULT_PARAMS.orbitMax.toString();
    this.colorThemeSelect.value = DEFAULT_PARAMS.colorTheme;

    this.updateAllValueDisplays();
    this.applyThemeStyles();

    if (this.onGenerate) {
      this.onGenerate(this.getParams());
    }
  }

  private applyThemeStyles() {
    const theme = this.colorThemeSelect.value;
    const colors = this.getThemeColorValues(theme);
    const gradient = getThemeGradientCSS(theme);

    const root = document.documentElement;
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-secondary', colors.secondary);
    root.style.setProperty('--theme-gradient', gradient);

    this.generateBtn.style.background = gradient;
    this.generateBtn.style.boxShadow = `0 0 20px ${colors.primary}60`;
    this.generateBtn.style.transition = 'background 0.3s ease-out, box-shadow 0.3s ease-out, transform 0.2s ease-out, filter 0.2s ease-out';

    this.resetBtn.style.background = colors.primary;
    this.resetBtn.style.transition = 'filter 0.2s ease-out, background 0.3s ease-out, transform 0.2s ease-out';
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
