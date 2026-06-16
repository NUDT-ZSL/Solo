import { SceneManager } from './sceneManager';
import { ColorMode } from './particleSystem';

export class UI {
  private sceneManager: SceneManager;
  private statsPanel: HTMLDivElement;
  private controlPanel: HTMLDivElement;
  private particleCountEl: HTMLDivElement;
  private avgSpeedEl: HTMLDivElement;
  private fpsEl: HTMLDivElement;
  private resetBtn: HTMLButtonElement;
  private colorModeBtn: HTMLButtonElement;

  private fpsHistory: number[] = [];
  private fpsSmoothingWindow: number;
  private readonly DEFAULT_SMOOTHING_WINDOW = 30;
  private readonly MIN_SMOOTHING_WINDOW = 5;
  private readonly MAX_SMOOTHING_WINDOW = 120;

  constructor(sceneManager: SceneManager, smoothingWindow?: number) {
    this.sceneManager = sceneManager;
    this.fpsSmoothingWindow = smoothingWindow
      ? Math.max(this.MIN_SMOOTHING_WINDOW, Math.min(this.MAX_SMOOTHING_WINDOW, smoothingWindow))
      : this.DEFAULT_SMOOTHING_WINDOW;

    this.statsPanel = document.createElement('div');
    this.statsPanel.style.cssText = [
      'position: fixed;',
      'top: 20px;',
      'left: 20px;',
      'color: #ffffffaa;',
      'font-family: sans-serif;',
      'font-size: 14px;',
      'line-height: 1.8;',
      'z-index: 100;',
      'pointer-events: none;',
      'text-shadow: 0 0 10px rgba(0,0,0,0.5);'
    ].join('');

    this.particleCountEl = document.createElement('div');
    this.avgSpeedEl = document.createElement('div');
    this.fpsEl = document.createElement('div');

    this.statsPanel.appendChild(this.particleCountEl);
    this.statsPanel.appendChild(this.avgSpeedEl);
    this.statsPanel.appendChild(this.fpsEl);

    this.controlPanel = document.createElement('div');
    this.controlPanel.style.cssText = [
      'position: fixed;',
      'top: 20px;',
      'right: 20px;',
      'background: #2a2a3e88;',
      'backdrop-filter: blur(10px);',
      '-webkit-backdrop-filter: blur(10px);',
      'border: 1px solid #ffffff33;',
      'border-radius: 12px;',
      'padding: 16px;',
      'z-index: 100;',
      'display: flex;',
      'flex-direction: column;',
      'gap: 12px;'
    ].join('');

    this.resetBtn = document.createElement('button');
    this.resetBtn.textContent = '重置';
    this.resetBtn.style.cssText = [
      'width: 120px;',
      'height: 36px;',
      'border-radius: 18px;',
      'background: #ff336666;',
      'color: white;',
      'border: none;',
      'cursor: pointer;',
      'font-family: sans-serif;',
      'font-size: 14px;',
      'transition: background 0.2s, transform 0.2s;'
    ].join('');

    this.colorModeBtn = document.createElement('button');
    this.colorModeBtn.textContent = '颜色模式: 距离';
    this.colorModeBtn.style.cssText = [
      'width: 120px;',
      'height: 36px;',
      'border-radius: 18px;',
      'background: #ff336666;',
      'color: white;',
      'border: none;',
      'cursor: pointer;',
      'font-family: sans-serif;',
      'font-size: 13px;',
      'transition: background 0.2s, transform 0.2s;'
    ].join('');

    this.controlPanel.appendChild(this.resetBtn);
    this.controlPanel.appendChild(this.colorModeBtn);

    document.body.appendChild(this.statsPanel);
    document.body.appendChild(this.controlPanel);

    this.setupEventListeners();
  }

  public setFpsSmoothingWindow(windowSize: number): void {
    this.fpsSmoothingWindow = Math.max(
      this.MIN_SMOOTHING_WINDOW,
      Math.min(this.MAX_SMOOTHING_WINDOW, windowSize)
    );
  }

  public getFpsSmoothingWindow(): number {
    return this.fpsSmoothingWindow;
  }

  private setupEventListeners(): void {
    this.resetBtn.addEventListener('click', () => {
      this.animateButton(this.resetBtn);
      this.sceneManager.reset();
    });

    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.background = '#ff3366cc';
    });

    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.background = '#ff336666';
    });

    this.colorModeBtn.addEventListener('click', () => {
      this.animateButton(this.colorModeBtn);
      this.toggleColorMode();
    });

    this.colorModeBtn.addEventListener('mouseenter', () => {
      this.colorModeBtn.style.background = '#ff3366cc';
    });

    this.colorModeBtn.addEventListener('mouseleave', () => {
      this.colorModeBtn.style.background = '#ff336666';
    });
  }

  private animateButton(btn: HTMLButtonElement): void {
    btn.style.transform = 'scale(0.92)';
    setTimeout(() => {
      btn.style.transform = 'scale(1.0)';
    }, 200);
  }

  private toggleColorMode(): void {
    const particleSystem = this.sceneManager.getParticleSystem();
    const currentMode = particleSystem.getColorMode();
    const newMode: ColorMode = currentMode === 'distance' ? 'velocity' : 'distance';
    particleSystem.setColorMode(newMode);
    this.colorModeBtn.textContent = newMode === 'distance' ? '颜色模式: 距离' : '颜色模式: 速度';
  }

  public update(): void {
    const particleSystem = this.sceneManager.getParticleSystem();

    this.particleCountEl.textContent = '粒子总数: ' + particleSystem.getParticleCount();
    this.avgSpeedEl.textContent = '平均速度: ' + particleSystem.getAverageSpeed().toFixed(2) + ' 单位/秒';

    const currentFps = this.sceneManager.getFPS();
    this.fpsHistory.push(currentFps);

    while (this.fpsHistory.length > this.fpsSmoothingWindow) {
      this.fpsHistory.shift();
    }

    const avgFps = Math.round(
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    );
    this.fpsEl.textContent = '帧率: ' + avgFps + ' FPS';

    if (avgFps >= 50) {
      this.fpsEl.style.color = '#00ff88aa';
    } else if (avgFps >= 30) {
      this.fpsEl.style.color = '#ffcc00aa';
    } else {
      this.fpsEl.style.color = '#ff4444aa';
    }
  }

  public dispose(): void {
    document.body.removeChild(this.statsPanel);
    document.body.removeChild(this.controlPanel);
  }
}
