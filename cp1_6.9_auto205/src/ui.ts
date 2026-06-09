import { IslandManager } from './island';
import { SceneManager } from './scene';
import { ParticleSystem } from './particles';

export interface UIState {
  islandCount: number;
  waveSpeed: number;
  theme: string;
}

export type UIChangeHandler = {
  onIslandCountChange: (count: number) => void;
  onWaveSpeedChange: (speed: number) => void;
  onThemeChange: (theme: string) => void;
  onResetView: () => void;
};

export class UIManager {
  private state: UIState = {
    islandCount: 15,
    waveSpeed: 1.0,
    theme: 'deep'
  };

  private islandCountSlider: HTMLInputElement;
  private islandCountValue: HTMLElement;
  private waveSpeedSlider: HTMLInputElement;
  private waveSpeedValue: HTMLElement;
  private themeSelector: HTMLElement;
  private resetButton: HTMLElement;
  private panel: HTMLElement;

  private handlers: UIChangeHandler;

  constructor(handlers: UIChangeHandler) {
    this.handlers = handlers;

    const getEl = (id: string) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Element not found: ${id}`);
      return el;
    };

    this.panel = getEl('controlPanel');
    this.islandCountSlider = getEl('islandCount') as HTMLInputElement;
    this.islandCountValue = getEl('islandCountValue');
    this.waveSpeedSlider = getEl('waveSpeed') as HTMLInputElement;
    this.waveSpeedValue = getEl('waveSpeedValue');
    this.themeSelector = getEl('themeSelector');
    this.resetButton = getEl('resetView');

    this.init();
  }

  private init(): void {
    this.setupIslandCountSlider();
    this.setupWaveSpeedSlider();
    this.setupThemeSelector();
    this.setupResetButton();
    this.setupPanelDrag();
    this.updateDisplay();
  }

  private setupIslandCountSlider(): void {
    this.islandCountSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      if (value !== this.state.islandCount) {
        this.state.islandCount = value;
        this.updateDisplay();
        this.handlers.onIslandCountChange(value);
      }
    });

    this.islandCountSlider.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      this.state.islandCount = value;
      this.updateDisplay();
      this.handlers.onIslandCountChange(value);
    });
  }

  private setupWaveSpeedSlider(): void {
    this.waveSpeedSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      if (Math.abs(value - this.state.waveSpeed) > 0.001) {
        this.state.waveSpeed = value;
        this.updateDisplay();
        this.handlers.onWaveSpeedChange(value);
      }
    });
  }

  private setupThemeSelector(): void {
    const buttons = this.themeSelector.querySelectorAll('.theme-btn') as NodeListOf<HTMLButtonElement>;
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        if (!theme || theme === this.state.theme) return;

        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        this.state.theme = theme;
        this.handlers.onThemeChange(theme);
      });
    });
  }

  private setupResetButton(): void {
    this.resetButton.addEventListener('click', () => {
      this.resetButton.classList.add('pulse');
      setTimeout(() => this.resetButton.classList.remove('pulse'), 500);
      this.handlers.onResetView();
    });

    this.resetButton.addEventListener('mouseenter', () => {
      (this.resetButton as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)';
    });
    this.resetButton.addEventListener('mouseleave', () => {
      (this.resetButton as HTMLElement).style.transform = '';
    });
  }

  private setupPanelDrag(): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startRight = 0;
    let startBottom = 0;

    const titleBar = this.panel.querySelector('.panel-title');
    if (!titleBar) return;

    (titleBar as HTMLElement).style.cursor = 'move';

    (titleBar as HTMLElement).addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'SPAN') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.panel.getBoundingClientRect();
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;

      e.preventDefault();
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newRight = Math.max(10, Math.min(window.innerWidth - 320, startRight - deltaX));
      const newBottom = Math.max(10, Math.min(window.innerHeight - 400, startBottom - deltaY));

      this.panel.style.right = newRight + 'px';
      this.panel.style.bottom = newBottom + 'px';
      this.panel.style.left = 'auto';
      this.panel.style.top = 'auto';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  private updateDisplay(): void {
    this.islandCountValue.textContent = this.state.islandCount.toString();
    this.waveSpeedValue.textContent = this.state.waveSpeed.toFixed(1);
  }

  public getState(): UIState {
    return { ...this.state };
  }

  public setIslandCount(count: number): void {
    this.state.islandCount = count;
    this.islandCountSlider.value = count.toString();
    this.updateDisplay();
  }

  public setWaveSpeed(speed: number): void {
    this.state.waveSpeed = speed;
    this.waveSpeedSlider.value = speed.toString();
    this.updateDisplay();
  }

  public setTheme(theme: string): void {
    const buttons = this.themeSelector.querySelectorAll('.theme-btn') as NodeListOf<HTMLButtonElement>;
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    this.state.theme = theme;
  }
}

export const createUIHandlers = (
  sceneManager: SceneManager,
  islandManager: IslandManager,
  particleSystem: ParticleSystem
): UIChangeHandler => {
  return {
    onIslandCountChange: (count: number) => {
      islandManager.generateIslands(count);
    },
    onWaveSpeedChange: (speed: number) => {
      islandManager.setWaveSpeed(speed);
    },
    onThemeChange: (theme: string) => {
      islandManager.setTheme(theme);
      particleSystem.setTheme(theme);

      const themeBgMap: Record<string, string> = {
        coral: '#2a1030',
        aurora: '#0a1a30',
        lava: '#2a0a10',
        deep: '#1a0a3e'
      };
      sceneManager.setFogColor(themeBgMap[theme] || '#1a0a3e');
    },
    onResetView: () => {
      sceneManager.resetView();
    }
  };
};
