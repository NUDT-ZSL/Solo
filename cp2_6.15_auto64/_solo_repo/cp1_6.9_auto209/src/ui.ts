import { Vortex } from './vortex';
import { colorThemes } from './particle';

export interface UIConfig {
  speed: number;
  particleCount: number;
  theme: string;
}

export class ControlPanel {
  private container: HTMLElement;
  private vortex: Vortex;
  private panel: HTMLDivElement;
  private speedSlider: HTMLInputElement;
  private particleSlider: HTMLInputElement;
  private themeSelector: HTMLDivElement;
  private resetButton: HTMLButtonElement;
  private speedValue: HTMLSpanElement;
  private particleValue: HTMLSpanElement;
  private themeButtons: HTMLButtonElement[] = [];

  private speed: number = 1;
  private particleCount: number = 500;
  private theme: string = 'fantasy';

  constructor(container: HTMLElement, vortex: Vortex) {
    this.container = container;
    this.vortex = vortex;
    this.panel = document.createElement('div');
    this.speedSlider = document.createElement('input');
    this.particleSlider = document.createElement('input');
    this.themeSelector = document.createElement('div');
    this.resetButton = document.createElement('button');
    this.speedValue = document.createElement('span');
    this.particleValue = document.createElement('span');

    this.injectStyles();
    this.build();
    this.bindEvents();
  }

  private injectStyles() {
    const styleId = 'vortex-control-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .vortex-panel {
        position: absolute;
        top: 24px;
        right: 24px;
        width: 320px;
        padding: 24px;
        background: rgba(30, 10, 60, 0.35);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(180, 120, 255, 0.25);
        border-radius: 18px;
        box-shadow:
          0 8px 32px rgba(120, 50, 200, 0.2),
          0 2px 8px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        color: #e8d8ff;
        z-index: 100;
        user-select: none;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                    box-shadow 0.3s ease,
                    border-color 0.3s ease;
      }
      .vortex-panel:hover {
        box-shadow:
          0 12px 40px rgba(150, 80, 220, 0.3),
          0 4px 12px rgba(0, 0, 0, 0.35),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
        border-color: rgba(200, 150, 255, 0.35);
      }
      .vortex-panel-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 20px;
        letter-spacing: 2px;
        background: linear-gradient(135deg, #ff9d6c 0%, #c084fc 50%, #60a5fa 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .vortex-panel-title::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff9d6c, #c084fc);
        box-shadow: 0 0 10px rgba(192, 132, 252, 0.6);
        animation: vortex-title-pulse 2s ease-in-out infinite;
      }
      @keyframes vortex-title-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.2); }
      }
      .vortex-control-group {
        margin-bottom: 20px;
      }
      .vortex-control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: #c4a8e8;
        margin-bottom: 10px;
        letter-spacing: 0.5px;
      }
      .vortex-control-value {
        font-family: 'Consolas', monospace;
        font-size: 12px;
        padding: 2px 8px;
        background: rgba(192, 132, 252, 0.15);
        border-radius: 6px;
        color: #e8d8ff;
        min-width: 50px;
        text-align: center;
      }
      .vortex-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(90deg, rgba(255, 157, 108, 0.3) 0%, rgba(192, 132, 252, 0.3) 100%);
        outline: none;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .vortex-slider:hover {
        background: linear-gradient(90deg, rgba(255, 157, 108, 0.5) 0%, rgba(192, 132, 252, 0.5) 100%);
      }
      .vortex-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff9d6c 0%, #c084fc 100%);
        cursor: pointer;
        box-shadow: 0 0 0 3px rgba(192, 132, 252, 0.2),
                    0 2px 8px rgba(192, 132, 252, 0.4);
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                    box-shadow 0.2s ease;
      }
      .vortex-slider:hover::-webkit-slider-thumb {
        transform: scale(1.15);
        box-shadow: 0 0 0 4px rgba(192, 132, 252, 0.3),
                    0 4px 12px rgba(192, 132, 252, 0.5);
      }
      .vortex-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff9d6c 0%, #c084fc 100%);
        cursor: pointer;
        border: none;
        box-shadow: 0 0 0 3px rgba(192, 132, 252, 0.2),
                    0 2px 8px rgba(192, 132, 252, 0.4);
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                    box-shadow 0.2s ease;
      }
      .vortex-slider:hover::-moz-range-thumb {
        transform: scale(1.15);
        box-shadow: 0 0 0 4px rgba(192, 132, 252, 0.3),
                    0 4px 12px rgba(192, 132, 252, 0.5);
      }
      .vortex-theme-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      .vortex-theme-btn {
        position: relative;
        padding: 10px 14px;
        border: 1px solid rgba(180, 120, 255, 0.2);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);
        color: #e8d8ff;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: hidden;
      }
      .vortex-theme-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, var(--theme-c1) 0%, var(--theme-c2) 100%);
        opacity: 0;
        transition: opacity 0.25s ease;
        z-index: 0;
      }
      .vortex-theme-btn:hover {
        transform: translateY(-2px);
        border-color: rgba(200, 150, 255, 0.4);
        box-shadow: 0 4px 16px rgba(120, 50, 200, 0.25);
      }
      .vortex-theme-btn:hover::before {
        opacity: 0.15;
      }
      .vortex-theme-btn.active {
        border-color: rgba(255, 180, 120, 0.6);
        box-shadow: 0 0 0 2px rgba(255, 157, 108, 0.3),
                    0 4px 16px rgba(255, 120, 80, 0.2);
      }
      .vortex-theme-btn.active::before {
        opacity: 0.2;
      }
      .vortex-theme-btn > * {
        position: relative;
        z-index: 1;
      }
      .vortex-theme-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--theme-c1), var(--theme-c2));
        box-shadow: 0 0 8px var(--theme-c1);
        flex-shrink: 0;
      }
      .vortex-reset-btn {
        width: 100%;
        padding: 12px 18px;
        margin-top: 4px;
        border: 1px solid rgba(255, 157, 108, 0.4);
        border-radius: 10px;
        background: linear-gradient(135deg, rgba(255, 157, 108, 0.1) 0%, rgba(192, 132, 252, 0.1) 100%);
        color: #ffd4c0;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;
      }
      .vortex-reset-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255, 157, 108, 0.3) 0%, rgba(192, 132, 252, 0.3) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .vortex-reset-btn:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 157, 108, 0.7);
        box-shadow: 0 6px 24px rgba(255, 120, 80, 0.25);
        color: #fff;
      }
      .vortex-reset-btn:hover::before {
        opacity: 1;
      }
      .vortex-reset-btn:active {
        transform: translateY(0) scale(0.98);
      }
      .vortex-reset-btn > * {
        position: relative;
        z-index: 1;
      }
      @media (max-width: 400px) {
        .vortex-panel {
          width: calc(100% - 32px);
          right: 16px;
          top: 16px;
          padding: 18px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private build() {
    this.panel.className = 'vortex-panel';
    this.panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'vortex-panel-title';
    title.textContent = '旋涡幻境 控制台';
    this.panel.appendChild(title);

    const speedGroup = document.createElement('div');
    speedGroup.className = 'vortex-control-group';
    const speedLabel = document.createElement('div');
    speedLabel.className = 'vortex-control-label';
    speedLabel.innerHTML = '<span>转速</span>';
    this.speedValue.className = 'vortex-control-value';
    this.speedValue.textContent = this.speed.toFixed(1) + 'x';
    speedLabel.appendChild(this.speedValue);
    this.speedSlider.type = 'range';
    this.speedSlider.min = '0.1';
    this.speedSlider.max = '3.0';
    this.speedSlider.step = '0.1';
    this.speedSlider.value = String(this.speed);
    this.speedSlider.className = 'vortex-slider';
    speedGroup.appendChild(speedLabel);
    speedGroup.appendChild(this.speedSlider);
    this.panel.appendChild(speedGroup);

    const particleGroup = document.createElement('div');
    particleGroup.className = 'vortex-control-group';
    const particleLabel = document.createElement('div');
    particleLabel.className = 'vortex-control-label';
    particleLabel.innerHTML = '<span>粒子数量</span>';
    this.particleValue.className = 'vortex-control-value';
    this.particleValue.textContent = String(this.particleCount);
    particleLabel.appendChild(this.particleValue);
    this.particleSlider.type = 'range';
    this.particleSlider.min = '100';
    this.particleSlider.max = '1000';
    this.particleSlider.step = '10';
    this.particleSlider.value = String(this.particleCount);
    this.particleSlider.className = 'vortex-slider';
    particleGroup.appendChild(particleLabel);
    particleGroup.appendChild(this.particleSlider);
    this.panel.appendChild(particleGroup);

    const themeGroup = document.createElement('div');
    themeGroup.className = 'vortex-control-group';
    const themeLabel = document.createElement('div');
    themeLabel.className = 'vortex-control-label';
    themeLabel.innerHTML = '<span>颜色主题</span>';
    themeGroup.appendChild(themeLabel);

    this.themeSelector.className = 'vortex-theme-grid';
    const themes: { key: string; name: string; c1: string; c2: string }[] = [
      { key: 'fantasy', name: '幻彩', c1: '#ff9d6c', c2: '#c084fc' },
      { key: 'aurora', name: '极光', c1: '#64ffda', c2: '#60a5fa' },
      { key: 'lava', name: '熔岩', c1: '#ff7842', c2: '#ff3c1e' },
      { key: 'ice', name: '冰晶', c1: '#c8f0ff', c2: '#64b4ff' },
    ];
    this.themeButtons = [];
    for (const t of themes) {
      const btn = document.createElement('button');
      btn.className = 'vortex-theme-btn' + (t.key === this.theme ? ' active' : '');
      btn.dataset.theme = t.key;
      btn.style.setProperty('--theme-c1', t.c1);
      btn.style.setProperty('--theme-c2', t.c2);
      btn.innerHTML = `<span class="vortex-theme-dot"></span><span>${t.name}</span>`;
      this.themeSelector.appendChild(btn);
      this.themeButtons.push(btn);
    }
    themeGroup.appendChild(this.themeSelector);
    this.panel.appendChild(themeGroup);

    this.resetButton.className = 'vortex-reset-btn';
    this.resetButton.innerHTML = '<span>↻ 重置状态</span>';
    this.panel.appendChild(this.resetButton);

    this.container.appendChild(this.panel);
  }

  private bindEvents() {
    this.speedSlider.addEventListener('input', () => {
      this.speed = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = this.speed.toFixed(1) + 'x';
      this.vortex.setSpeed(this.speed);
    });

    this.particleSlider.addEventListener('input', () => {
      this.particleCount = parseInt(this.particleSlider.value, 10);
      this.particleValue.textContent = String(this.particleCount);
      this.vortex.setParticleCount(this.particleCount);
    });

    for (const btn of this.themeButtons) {
      btn.addEventListener('click', () => {
        const themeKey = btn.dataset.theme!;
        this.setTheme(themeKey);
      });
    }

    this.resetButton.addEventListener('click', () => {
      this.reset();
    });
  }

  setTheme(key: string) {
    if (!colorThemes[key]) return;
    this.theme = key;
    for (const btn of this.themeButtons) {
      btn.classList.toggle('active', btn.dataset.theme === key);
    }
    this.vortex.setTheme(key);
  }

  reset() {
    this.speed = 1;
    this.particleCount = 500;
    this.theme = 'fantasy';

    this.speedSlider.value = String(this.speed);
    this.speedValue.textContent = this.speed.toFixed(1) + 'x';
    this.particleSlider.value = String(this.particleCount);
    this.particleValue.textContent = String(this.particleCount);
    for (const btn of this.themeButtons) {
      btn.classList.toggle('active', btn.dataset.theme === this.theme);
    }

    this.vortex.setSpeed(this.speed);
    this.vortex.setParticleCount(this.particleCount);
    this.vortex.reset();
  }

  getConfig(): UIConfig {
    return {
      speed: this.speed,
      particleCount: this.particleCount,
      theme: this.theme,
    };
  }

  destroy() {
    this.panel.remove();
  }
}
