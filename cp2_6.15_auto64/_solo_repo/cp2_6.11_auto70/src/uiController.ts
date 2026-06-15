import type { ColorTheme } from './terrainGenerator';

export class UIController {
  private gainSlider: HTMLInputElement;
  private rotationSlider: HTMLInputElement;
  private particleSlider: HTMLInputElement;
  private gainValue: HTMLElement;
  private rotationValue: HTMLElement;
  private particleValue: HTMLElement;
  private themeButtons: NodeListOf<HTMLButtonElement>;
  private controlPanel: HTMLElement;
  private togglePanel: HTMLButtonElement;
  private startOverlay: HTMLElement;
  private startBtn: HTMLButtonElement;
  private loading: HTMLElement;

  private gainChangeCallbacks: ((value: number) => void)[] = [];
  private rotationChangeCallbacks: ((value: number) => void)[] = [];
  private particleCountCallbacks: ((value: number) => void)[] = [];
  private themeChangeCallbacks: ((theme: ColorTheme) => void)[] = [];
  private startCallbacks: (() => void)[] = [];

  constructor() {
    this.gainSlider = document.getElementById('gain-slider') as HTMLInputElement;
    this.rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement;
    this.particleSlider = document.getElementById('particle-slider') as HTMLInputElement;
    this.gainValue = document.getElementById('gain-value') as HTMLElement;
    this.rotationValue = document.getElementById('rotation-value') as HTMLElement;
    this.particleValue = document.getElementById('particle-value') as HTMLElement;
    this.themeButtons = document.querySelectorAll('.theme-btn') as NodeListOf<HTMLButtonElement>;
    this.controlPanel = document.getElementById('control-panel') as HTMLElement;
    this.togglePanel = document.getElementById('toggle-panel') as HTMLButtonElement;
    this.startOverlay = document.getElementById('start-overlay') as HTMLElement;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.loading = document.getElementById('loading') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.gainSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.gainValue.textContent = value.toFixed(2);
      this.gainChangeCallbacks.forEach(cb => cb(value));
    });

    this.rotationSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.rotationValue.textContent = value.toFixed(2);
      this.rotationChangeCallbacks.forEach(cb => cb(value));
    });

    this.particleSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.particleValue.textContent = value.toString();
      this.particleCountCallbacks.forEach(cb => cb(value));
    });

    this.themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.themeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme as ColorTheme;
        this.themeChangeCallbacks.forEach(cb => cb(theme));
      });
    });

    this.togglePanel.addEventListener('click', () => {
      this.controlPanel.classList.toggle('hidden');
    });

    this.startBtn.addEventListener('click', () => {
      this.startCallbacks.forEach(cb => cb());
    });
  }

  onGainChange(callback: (value: number) => void): void {
    this.gainChangeCallbacks.push(callback);
  }

  onRotationSpeedChange(callback: (value: number) => void): void {
    this.rotationChangeCallbacks.push(callback);
  }

  onParticleCountChange(callback: (value: number) => void): void {
    this.particleCountCallbacks.push(callback);
  }

  onThemeChange(callback: (theme: ColorTheme) => void): void {
    this.themeChangeCallbacks.push(callback);
  }

  onStart(callback: () => void): void {
    this.startCallbacks.push(callback);
  }

  hideLoading(): void {
    this.loading.classList.add('fade-out');
    setTimeout(() => {
      this.loading.style.display = 'none';
    }, 500);
  }

  hideStartOverlay(): void {
    this.startOverlay.classList.add('hidden');
    setTimeout(() => {
      this.startOverlay.style.display = 'none';
    }, 500);
  }

  showStartError(message: string): void {
    const errorEl = document.createElement('div');
    errorEl.style.color = '#ff6b6b';
    errorEl.style.fontSize = '12px';
    errorEl.style.marginTop = '10px';
    errorEl.textContent = message;
    this.startBtn.parentNode?.insertBefore(errorEl, this.startBtn.nextSibling);
  }
}
