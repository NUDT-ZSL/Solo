import { ParticleSystem } from './particleSystem';
import { colorThemes } from './utils';

interface Stats {
  fps: number;
  particleCount: number;
  renderTime: number;
}

export class UIControls {
  private container: HTMLElement;
  private particleSystem: ParticleSystem;
  private statsPanel: HTMLDivElement;
  private controlPanel: HTMLDivElement;
  private toggleButton: HTMLButtonElement;
  private hoverInfoPanel: HTMLDivElement;

  private fpsValue: HTMLSpanElement;
  private particleCountValue: HTMLSpanElement;
  private renderTimeValue: HTMLSpanElement;

  private particleCountSlider: HTMLInputElement;
  private rotationSpeedSlider: HTMLInputElement;
  private sizeMinSlider: HTMLInputElement;
  private sizeMaxSlider: HTMLInputElement;
  private themeButtons: HTMLButtonElement[] = [];

  private panelOpen: boolean = true;

  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 0;

  constructor(container: HTMLElement, particleSystem: ParticleSystem) {
    this.container = container;
    this.particleSystem = particleSystem;

    this.statsPanel = this.createStatsPanel();
    this.controlPanel = this.createControlPanel();
    this.toggleButton = this.createToggleButton();
    this.hoverInfoPanel = this.createHoverInfoPanel();

    this.fpsValue = this.statsPanel.querySelector('[data-fps]')!;
    this.particleCountValue = this.statsPanel.querySelector('[data-particles]')!;
    this.renderTimeValue = this.statsPanel.querySelector('[data-render]')!;

    this.particleCountSlider = this.controlPanel.querySelector('[data-slider="count"]') as HTMLInputElement;
    this.rotationSpeedSlider = this.controlPanel.querySelector('[data-slider="rotation"]') as HTMLInputElement;
    this.sizeMinSlider = this.controlPanel.querySelector('[data-slider="sizeMin"]') as HTMLInputElement;
    this.sizeMaxSlider = this.controlPanel.querySelector('[data-slider="sizeMax"]') as HTMLInputElement;

    this.bindSliderEvents();
    this.bindThemeEvents();
  }

  private createStatsPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 16px 20px;
      background: rgba(10, 10, 30, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.1);
      font-family: 'Inter', sans-serif;
      color: #ffffff;
      z-index: 100;
      min-width: 160px;
    `;

    panel.innerHTML = `
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(167, 139, 250, 0.9); margin-bottom: 10px; font-weight: 600;">性能监控</div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; color: rgba(255, 255, 255, 0.7);">FPS</span>
        <span data-fps style="font-size: 16px; font-weight: 700; color: #10b981;">60</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; color: rgba(255, 255, 255, 0.7);">粒子数</span>
        <span data-particles style="font-size: 14px; font-weight: 600; color: #a78bfa;">50,000</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: rgba(255, 255, 255, 0.7);">渲染耗时</span>
        <span data-render style="font-size: 14px; font-weight: 600; color: #60a5fa;">1.2ms</span>
      </div>
    `;

    this.container.appendChild(panel);
    return panel;
  }

  private createControlPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 280px;
      height: 100vh;
      padding: 24px 20px;
      background: rgba(10, 10, 30, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-left: 1px solid rgba(139, 92, 246, 0.3);
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
      font-family: 'Inter', sans-serif;
      color: #ffffff;
      z-index: 99;
      overflow-y: auto;
      transform: translateX(0);
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    panel.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #a78bfa, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">星云参数控制</h2>
        <p style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-top: 4px;">实时调节粒子效果</p>
      </div>
      
      ${this.createSliderGroup('count', '粒子数量', 50000, 10000, 100000, 1000, '50,000')}
      ${this.createSliderGroup('rotation', '旋转速度', 1.0, 0, 5, 0.1, '1.0x')}
      
      <div style="margin-bottom: 20px; padding: 14px; background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 10px;">
        <div style="font-size: 12px; color: rgba(167, 139, 250, 0.95); margin-bottom: 12px; font-weight: 600;">粒子大小范围</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; color: rgba(255, 255, 255, 0.7);">最小</span>
          <span data-value="sizeMin" style="font-size: 11px; font-weight: 600; color: #a78bfa; font-variant-numeric: tabular-nums;">0.10</span>
        </div>
        <input type="range" data-slider="sizeMin" min="0.05" max="1" step="0.05" value="0.1" style="
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          outline: none;
          cursor: pointer;
          margin-bottom: 10px;
        ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; color: rgba(255, 255, 255, 0.7);">最大</span>
          <span data-value="sizeMax" style="font-size: 11px; font-weight: 600; color: #a78bfa; font-variant-numeric: tabular-nums;">0.50</span>
        </div>
        <input type="range" data-slider="sizeMax" min="0.1" max="2" step="0.05" value="0.5" style="
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          outline: none;
          cursor: pointer;
        ">
        <style>
          input[data-slider="sizeMin"]::-webkit-slider-thumb,
          input[data-slider="sizeMax"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: linear-gradient(135deg, #a78bfa, #8b5cf6);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          input[data-slider="sizeMin"]::-webkit-slider-thumb:hover,
          input[data-slider="sizeMax"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 2px 12px rgba(139, 92, 246, 0.8);
          }
        </style>
      </div>
      
      <div style="margin-top: 28px;">
        <div style="font-size: 12px; color: rgba(167, 139, 250, 0.9); margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">颜色主题</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${colorThemes.map((theme, i) => `
            <button data-theme="${i}" style="
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 14px;
              background: ${i === 0 ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)'};
              border: 1px solid ${i === 0 ? 'rgba(139, 92, 246, 0.6)' : 'rgba(255, 255, 255, 0.1)'};
              border-radius: 10px;
              color: #ffffff;
              font-family: 'Inter', sans-serif;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            ">
              <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #${theme.colorStart.getHexString()}, #${theme.colorMid.getHexString()}, #${theme.colorEnd.getHexString()}); box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);"></span>
              <span>${theme.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <p style="font-size: 11px; color: rgba(255, 255, 255, 0.4); line-height: 1.6;">
          💡 拖拽旋转视角 · 滚轮缩放 · 右键平移 · 点击产生粒子爆裂
        </p>
      </div>
    `;

    this.container.appendChild(panel);
    return panel;
  }

  private createSliderGroup(
    key: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    displayValue: string
  ): string {
    return `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8); font-weight: 500;">${label}</span>
          <span data-value="${key}" style="font-size: 12px; font-weight: 600; color: #a78bfa; font-variant-numeric: tabular-nums;">${displayValue}</span>
        </div>
        <input type="range" data-slider="${key}" min="${min}" max="${max}" step="${step}" value="${value}" style="
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          outline: none;
          cursor: pointer;
        ">
        <style>
          input[data-slider="${key}"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: linear-gradient(135deg, #a78bfa, #8b5cf6);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          input[data-slider="${key}"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 2px 12px rgba(139, 92, 246, 0.8);
          }
          input[data-slider="${key}"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: linear-gradient(135deg, #a78bfa, #8b5cf6);
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
          }
        </style>
      </div>
    `;
  }

  private createToggleButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: ${this.panelOpen ? '310px' : '20px'};
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 10, 30, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 12px;
      color: #a78bfa;
      cursor: pointer;
      z-index: 101;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.08)';
      button.style.background = 'rgba(139, 92, 246, 0.2)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.background = 'rgba(10, 10, 30, 0.75)';
    });
    button.addEventListener('click', () => this.togglePanel());

    this.container.appendChild(button);
    return button;
  }

  private createHoverInfoPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      pointer-events: none;
      padding: 12px 16px;
      background: rgba(10, 10, 30, 0.9);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(139, 92, 246, 0.4);
      border-radius: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: #ffffff;
      z-index: 102;
      opacity: 0;
      transition: opacity 0.2s ease;
      min-width: 180px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    panel.innerHTML = `
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(167, 139, 250, 0.9); margin-bottom: 8px; font-weight: 600;">粒子信息</div>
      <div data-hover-content></div>
    `;

    this.container.appendChild(panel);
    return panel;
  }

  private bindSliderEvents(): void {
    const formatNumber = (n: number) => n.toLocaleString();
    const formatDecimal = (n: number) => n.toFixed(2);

    this.particleCountSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      const valueSpan = this.controlPanel.querySelector(`[data-value="count"]`) as HTMLElement;
      valueSpan.textContent = formatNumber(value);
      this.particleSystem.setParticleCount(value);
    });

    this.rotationSpeedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      const valueSpan = this.controlPanel.querySelector(`[data-value="rotation"]`) as HTMLElement;
      valueSpan.textContent = `${value.toFixed(1)}x`;
      this.particleSystem.rotationSpeed = value;
    });

    const updateSizeRange = () => {
      let minVal = parseFloat(this.sizeMinSlider.value);
      let maxVal = parseFloat(this.sizeMaxSlider.value);
      if (minVal > maxVal) {
        [minVal, maxVal] = [maxVal, minVal];
      }
      this.particleSystem.setSizeRange(minVal, maxVal);
    };

    this.sizeMinSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      const valueSpan = this.controlPanel.querySelector(`[data-value="sizeMin"]`) as HTMLElement;
      valueSpan.textContent = formatDecimal(value);
      updateSizeRange();
    });

    this.sizeMaxSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      const valueSpan = this.controlPanel.querySelector(`[data-value="sizeMax"]`) as HTMLElement;
      valueSpan.textContent = formatDecimal(value);
      updateSizeRange();
    });
  }

  private bindThemeEvents(): void {
    const buttons = this.controlPanel.querySelectorAll('[data-theme]');
    this.themeButtons = Array.from(buttons) as HTMLButtonElement[];

    this.themeButtons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateX(-4px)';
        btn.style.background = 'rgba(139, 92, 246, 0.2)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateX(0)';
        const idx = parseInt(btn.dataset.theme || '0');
        if (idx === this.particleSystem.getCurrentTheme()) {
          btn.style.background = 'rgba(139, 92, 246, 0.25)';
        } else {
          btn.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      });
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.theme || '0');
        this.setActiveTheme(idx);
        this.particleSystem.setTheme(idx);
      });
    });
  }

  private setActiveTheme(activeIdx: number): void {
    this.themeButtons.forEach((btn) => {
      const idx = parseInt(btn.dataset.theme || '0');
      if (idx === activeIdx) {
        btn.style.background = 'rgba(139, 92, 246, 0.25)';
        btn.style.borderColor = 'rgba(139, 92, 246, 0.6)';
      } else {
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      }
    });
  }

  private togglePanel(): void {
    this.panelOpen = !this.panelOpen;
    this.controlPanel.style.transform = this.panelOpen ? 'translateX(0)' : 'translateX(100%)';
    this.toggleButton.style.right = this.panelOpen ? '310px' : '20px';
  }

  public showHoverInfo(
    info: { position: THREE.Vector3; color: THREE.Color; velocity: THREE.Vector3 } | null,
    x: number,
    y: number
  ): void {
    const content = this.hoverInfoPanel.querySelector('[data-hover-content]') as HTMLElement;

    if (!info) {
      this.hoverInfoPanel.style.opacity = '0';
      return;
    }

    const { position, color, velocity } = info;
    content.innerHTML = `
      <div style="margin-bottom: 6px;">
        <span style="color: rgba(255, 255, 255, 0.5);">位置:</span> 
        <span style="font-variant-numeric: tabular-nums;">(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})</span>
      </div>
      <div style="margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
        <span style="color: rgba(255, 255, 255, 0.5);">颜色:</span>
        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}); box-shadow: 0 0 8px rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)});"></span>
        <span style="font-variant-numeric: tabular-nums;">#${color.getHexString()}</span>
      </div>
      <div>
        <span style="color: rgba(255, 255, 255, 0.5);">速度:</span> 
        <span style="font-variant-numeric: tabular-nums;">(${velocity.x.toFixed(3)}, ${velocity.y.toFixed(3)}, ${velocity.z.toFixed(3)})</span>
      </div>
    `;

    const offsetX = 15;
    const offsetY = 15;
    const panelWidth = 200;
    const panelHeight = 120;

    let finalX = x + offsetX;
    let finalY = y + offsetY;

    if (finalX + panelWidth > window.innerWidth) {
      finalX = x - panelWidth - offsetX;
    }
    if (finalY + panelHeight > window.innerHeight) {
      finalY = y - panelHeight - offsetY;
    }

    this.hoverInfoPanel.style.left = `${finalX}px`;
    this.hoverInfoPanel.style.top = `${finalY}px`;
    this.hoverInfoPanel.style.opacity = '1';
  }

  public updateStats(deltaTime: number, renderTime: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;

    if (this.fpsUpdateTime >= 1.0) {
      this.currentFps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;

      this.fpsValue.textContent = this.currentFps.toString();
      if (this.currentFps >= 55) {
        this.fpsValue.style.color = '#10b981';
      } else if (this.currentFps >= 30) {
        this.fpsValue.style.color = '#f59e0b';
      } else {
        this.fpsValue.style.color = '#ef4444';
      }

      const currentVisibleRatio = this.particleSystem.getVisibleRatio();
      if (this.currentFps < 30) {
        const newRatio = Math.max(0.5, currentVisibleRatio - 0.1);
        this.particleSystem.setVisibleRatio(newRatio);
      } else if (this.currentFps >= 55 && currentVisibleRatio < 1.0) {
        const newRatio = Math.min(1.0, currentVisibleRatio + 0.05);
        this.particleSystem.setVisibleRatio(newRatio);
      }
    }

    const actualCount = Math.floor(this.particleSystem.getParticleCount() * this.particleSystem.getVisibleRatio());
    this.particleCountValue.textContent = `${actualCount.toLocaleString()} / ${this.particleSystem.getParticleCount().toLocaleString()}`;
    this.renderTimeValue.textContent = `${renderTime.toFixed(1)}ms`;
  }

  public getFps(): number {
    return this.currentFps;
  }
}
