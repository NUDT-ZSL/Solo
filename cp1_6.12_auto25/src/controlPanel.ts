import { ThemeName, THEMES } from './particleSystem';

export interface ControlPanelCallbacks {
  onParticleCountChange: (count: number) => void;
  onThemeChange: (theme: ThemeName) => void;
  onForceStrengthChange: (strength: number) => void;
  onMouseInteractionToggle: (enabled: boolean) => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private toggleButton: HTMLButtonElement;
  private callbacks: ControlPanelCallbacks;
  private isOpen: boolean = true;
  private currentTheme: ThemeName;
  private currentParticleCount: number;
  private currentForceStrength: number;
  private currentMouseInteraction: boolean;
  private fpsDisplay: HTMLSpanElement | null = null;

  constructor(
    parent: HTMLElement,
    callbacks: ControlPanelCallbacks,
    initialTheme: ThemeName,
    initialParticleCount: number,
    initialForceStrength: number,
    initialMouseInteraction: boolean
  ) {
    this.callbacks = callbacks;
    this.currentTheme = initialTheme;
    this.currentParticleCount = initialParticleCount;
    this.currentForceStrength = initialForceStrength;
    this.currentMouseInteraction = initialMouseInteraction;

    this.container = parent;
    this.panel = this.createPanel();
    this.toggleButton = this.createToggleButton();
    this.container.appendChild(this.panel);
    this.container.appendChild(this.toggleButton);
  }

  public updateFPS(fps: number): void {
    if (this.fpsDisplay) {
      this.fpsDisplay.textContent = `${fps.toFixed(0)} FPS`;
      if (fps >= 55) {
        this.fpsDisplay.style.color = '#06d6a0';
      } else if (fps >= 30) {
        this.fpsDisplay.style.color = '#ffd166';
      } else {
        this.fpsDisplay.style.color = '#ef476f';
      }
    }
  }

  public destroy(): void {
    this.panel.remove();
    this.toggleButton.remove();
  }

  private supportsBackdropFilter(): boolean {
    if (typeof CSS === 'undefined' || !CSS.supports) return false;
    return (
      CSS.supports('backdrop-filter', 'blur(10px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(10px)')
    );
  }

  private getPanelBackgroundStyle(): string {
    if (this.supportsBackdropFilter()) {
      return `
        background: rgba(20, 20, 30, 0.7);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      `;
    } else {
      return `
        background: rgba(20, 20, 30, 0.92);
      `;
    }
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    const bgStyle = this.getPanelBackgroundStyle();
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 280px;
      padding: 20px;
      ${bgStyle}
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 1000;
      transition: opacity 0.3s ease, transform 0.3s ease;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    const titleLeft = document.createElement('span');
    titleLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    titleLeft.innerHTML = '<span style="width: 8px; height: 8px; border-radius: 50%; background: #9b5de5; box-shadow: 0 0 8px #9b5de5;"></span>粒子控制台';

    this.fpsDisplay = document.createElement('span');
    this.fpsDisplay.style.cssText = 'font-size: 12px; font-weight: 500; color: #06d6a0;';
    this.fpsDisplay.textContent = '-- FPS';

    title.appendChild(titleLeft);
    title.appendChild(this.fpsDisplay);
    panel.appendChild(title);

    panel.appendChild(this.createParticleCountSlider());
    panel.appendChild(this.createThemeSelector());
    panel.appendChild(this.createForceStrengthSlider());
    panel.appendChild(this.createMouseInteractionToggle());

    return panel;
  }

  private createToggleButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '⚙';
    const bgStyle = this.getPanelBackgroundStyle();
    btn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      ${bgStyle}
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e0e0e0;
      font-size: 18px;
      cursor: pointer;
      z-index: 1001;
      display: none;
      transition: transform 0.3s ease;
    `;
    btn.addEventListener('click', () => this.toggle());
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'rotate(90deg)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'rotate(0deg)';
    });
    return btn;
  }

  private createParticleCountSlider(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom: 18px;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 8px;';

    const label = document.createElement('span');
    label.textContent = '粒子数量';
    label.style.color = '#b0b0b0';

    const value = document.createElement('span');
    value.textContent = this.currentParticleCount.toString();
    value.style.color = '#ffffff';
    value.style.fontWeight = '500';

    labelRow.appendChild(label);
    labelRow.appendChild(value);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '500';
    slider.max = '5000';
    slider.step = '100';
    slider.value = this.currentParticleCount.toString();
    this.styleSlider(slider);

    slider.addEventListener('input', () => {
      const count = parseInt(slider.value, 10);
      this.currentParticleCount = count;
      value.textContent = count.toString();
      this.callbacks.onParticleCountChange(count);
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);
    return wrapper;
  }

  private createThemeSelector(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom: 18px;';

    const label = document.createElement('div');
    label.textContent = '主题色盘';
    label.style.cssText = 'color: #b0b0b0; margin-bottom: 10px;';
    wrapper.appendChild(label);

    const themeButtons = document.createElement('div');
    themeButtons.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

    for (const theme of Object.values(THEMES)) {
      const btn = document.createElement('button');
      btn.textContent = theme.label;
      btn.style.cssText = `
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid ${this.currentTheme === theme.name ? theme.colors[0] : 'rgba(255,255,255,0.1)'};
        background: ${this.currentTheme === theme.name ? `${theme.colors[0]}33` : 'rgba(255,255,255,0.05)'};
        color: #e0e0e0;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
      `;

      if (this.currentTheme === theme.name) {
        btn.style.boxShadow = `0 0 12px ${theme.colors[0]}44`;
      }

      btn.addEventListener('mouseenter', () => {
        btn.style.background = `${theme.colors[0]}44`;
        btn.style.borderColor = theme.colors[0];
      });

      btn.addEventListener('mouseleave', () => {
        if (this.currentTheme !== theme.name) {
          btn.style.background = 'rgba(255,255,255,0.05)';
          btn.style.borderColor = 'rgba(255,255,255,0.1)';
          btn.style.boxShadow = 'none';
        }
      });

      btn.addEventListener('click', () => {
        this.currentTheme = theme.name;
        this.callbacks.onThemeChange(theme.name);
        this.refreshThemeButtons(themeButtons);
      });

      themeButtons.appendChild(btn);
    }

    wrapper.appendChild(themeButtons);
    return wrapper;
  }

  private refreshThemeButtons(container: HTMLElement): void {
    const buttons = container.querySelectorAll('button');
    const themes = Object.values(THEMES);
    buttons.forEach((btn, index) => {
      const theme = themes[index];
      if (this.currentTheme === theme.name) {
        btn.style.background = `${theme.colors[0]}33`;
        btn.style.borderColor = theme.colors[0];
        btn.style.boxShadow = `0 0 12px ${theme.colors[0]}44`;
      } else {
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.borderColor = 'rgba(255,255,255,0.1)';
        btn.style.boxShadow = 'none';
      }
    });
  }

  private createForceStrengthSlider(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom: 18px;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 8px;';

    const label = document.createElement('span');
    label.textContent = '粒子间作用力';
    label.style.color = '#b0b0b0';

    const value = document.createElement('span');
    value.textContent = this.currentForceStrength.toFixed(2);
    value.style.color = '#ffffff';
    value.style.fontWeight = '500';

    labelRow.appendChild(label);
    labelRow.appendChild(value);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.05';
    slider.value = this.currentForceStrength.toString();
    this.styleSlider(slider);

    slider.addEventListener('input', () => {
      const strength = parseFloat(slider.value);
      this.currentForceStrength = strength;
      value.textContent = strength.toFixed(2);
      this.callbacks.onForceStrengthChange(strength);
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);
    return wrapper;
  }

  private createMouseInteractionToggle(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

    const label = document.createElement('span');
    label.textContent = '鼠标交互';
    label.style.color = '#b0b0b0';

    const toggle = document.createElement('label');
    toggle.style.cssText = `
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
      cursor: pointer;
    `;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.currentMouseInteraction;
    input.style.cssText = 'opacity: 0; width: 0; height: 0;';

    const slider = document.createElement('span');
    slider.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: ${this.currentMouseInteraction ? '#9b5de5' : 'rgba(255,255,255,0.15)'};
      border-radius: 26px;
      transition: all 0.3s ease;
    `;

    const knob = document.createElement('span');
    knob.style.cssText = `
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: ${this.currentMouseInteraction ? '25px' : '3px'};
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    slider.appendChild(knob);

    input.addEventListener('change', () => {
      const enabled = input.checked;
      this.currentMouseInteraction = enabled;
      slider.style.backgroundColor = enabled ? '#9b5de5' : 'rgba(255,255,255,0.15)';
      knob.style.left = enabled ? '25px' : '3px';
      this.callbacks.onMouseInteractionToggle(enabled);
    });

    toggle.appendChild(input);
    toggle.appendChild(slider);

    wrapper.appendChild(label);
    wrapper.appendChild(toggle);
    return wrapper;
  }

  private styleSlider(slider: HTMLInputElement): void {
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
    `;

    const styleId = 'particle-slider-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #9b5de5;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(155, 93, 229, 0.6);
          transition: transform 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #9b5de5;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(155, 93, 229, 0.6);
        }
      `;
      document.head.appendChild(style);
    }
  }

  private toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'translateY(0)';
      this.panel.style.pointerEvents = 'auto';
      this.toggleButton.style.display = 'none';
    } else {
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateY(-20px)';
      this.panel.style.pointerEvents = 'none';
      this.toggleButton.style.display = 'block';
    }
  }
}
