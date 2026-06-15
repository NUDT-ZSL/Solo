import { Galaxy, ColorTheme } from './galaxy';
import { InteractionManager } from './interaction';

interface ThemeOption {
  id: ColorTheme;
  name: string;
  gradient: string;
}

const THEMES: ThemeOption[] = [
  { id: 'nebula', name: '星云蓝紫', gradient: 'linear-gradient(135deg, #fff4e0, #b070ff, #3040ff)' },
  { id: 'lava', name: '熔岩橙红', gradient: 'linear-gradient(135deg, #ffffee, #ff6633, #991100)' },
  { id: 'ice', name: '冰晶青白', gradient: 'linear-gradient(135deg, #ffffff, #aaddff, #4466aa)' },
  { id: 'aurora', name: '幻彩极光', gradient: 'linear-gradient(135deg, #fffeF0, #33ffaa, #aa33ff)' }
];

export class UIManager {
  private galaxy: Galaxy;
  private interaction: InteractionManager;
  private container: HTMLElement;

  private panel: HTMLDivElement;
  private rotationSlider: HTMLDivElement;
  private particleSlider: HTMLDivElement;
  private armsSelect: HTMLDivElement;
  private themeButtons: HTMLButtonElement[] = [];
  private resetButton: HTMLButtonElement;
  private rotationValue: HTMLSpanElement;
  private particleValue: HTMLSpanElement;

  private currentTheme: ColorTheme = 'nebula';

  private debounceTimer: number | null = null;

  constructor(galaxy: Galaxy, interaction: InteractionManager) {
    this.galaxy = galaxy;
    this.interaction = interaction;
    this.container = document.body;

    this.panel = this.createPanel();
    this.container.appendChild(this.panel);

    const title = this.createTitle();
    this.panel.appendChild(title);

    this.rotationSlider = this.createSlider(
      '旋转速度',
      0.1,
      3.0,
      1.0,
      0.1,
      (val) => {
        this.rotationValue.textContent = val.toFixed(1);
        this.galaxy.updateConfig({ rotationSpeed: val });
      }
    );
    this.rotationValue = this.rotationSlider.querySelector('.slider-value') as HTMLSpanElement;
    this.panel.appendChild(this.rotationSlider);

    this.particleSlider = this.createSlider(
      '粒子数量',
      1000,
      5000,
      3000,
      100,
      (val) => {
        const intVal = Math.round(val);
        this.particleValue.textContent = intVal.toString();
        this.debounceUpdateParticles(intVal);
      }
    );
    this.particleValue = this.particleSlider.querySelector('.slider-value') as HTMLSpanElement;
    this.panel.appendChild(this.particleSlider);

    this.armsSelect = this.createSelect(
      '螺旋臂数',
      [
        { value: '2', label: '2 条' },
        { value: '3', label: '3 条' },
        { value: '4', label: '4 条' }
      ],
      '2',
      (val) => {
        this.galaxy.updateConfig({ spiralArms: parseInt(val, 10) });
      }
    );
    this.panel.appendChild(this.armsSelect);

    const themeSection = this.createThemeSection();
    this.panel.appendChild(themeSection);

    this.resetButton = this.createResetButton();
    this.panel.appendChild(this.resetButton);

    this.injectStyles();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'galaxy-control-panel';
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 300px;
      padding: 22px;
      border-radius: 18px;
      background: rgba(20, 15, 40, 0.55);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.08),
        0 0 40px rgba(120, 80, 255, 0.08);
      color: rgba(255, 255, 255, 0.85);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      z-index: 1000;
      user-select: none;
      transition: box-shadow 0.3s ease;
    `;
    return panel;
  }

  private createTitle(): HTMLDivElement {
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 18px;
      color: rgba(255, 255, 255, 0.95);
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const icon = document.createElement('span');
    icon.textContent = '✦';
    icon.style.cssText = `
      background: linear-gradient(135deg, #b070ff, #ff88cc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 18px;
    `;

    const text = document.createElement('span');
    text.textContent = '星系控制台';

    title.appendChild(icon);
    title.appendChild(text);
    return title;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onChange: (value: number) => void
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-slider';
    wrapper.style.cssText = `
      margin-bottom: 18px;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      color: rgba(255, 255, 255, 0.75);
      font-weight: 500;
    `;

    const valueEl = document.createElement('span');
    valueEl.className = 'slider-value';
    valueEl.textContent = step < 1 ? value.toFixed(1) : value.toString();
    valueEl.style.cssText = `
      color: rgba(180, 160, 255, 0.95);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      min-width: 42px;
      text-align: right;
    `;

    header.appendChild(labelEl);
    header.appendChild(valueEl);

    const trackContainer = document.createElement('div');
    trackContainer.style.cssText = `
      position: relative;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.08);
      cursor: pointer;
    `;

    const fill = document.createElement('div');
    fill.className = 'slider-fill';
    const fillPercent = ((value - min) / (max - min)) * 100;
    fill.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: ${fillPercent}%;
      border-radius: 3px;
      background: linear-gradient(90deg, #7050ff, #ff80c8);
      transition: width 0.05s linear;
    `;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min.toString();
    input.max = max.toString();
    input.value = value.toString();
    input.step = step.toString();
    input.style.cssText = `
      position: absolute;
      left: 0;
      top: -4px;
      width: 100%;
      height: 14px;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    `;

    const thumb = document.createElement('div');
    thumb.className = 'slider-thumb';
    thumb.style.cssText = `
      position: absolute;
      top: 50%;
      left: ${fillPercent}%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 2px 8px rgba(120, 80, 255, 0.6), 0 0 0 3px rgba(120, 80, 255, 0.25);
      pointer-events: none;
      transition: box-shadow 0.2s ease, transform 0.15s ease;
    `;

    trackContainer.appendChild(fill);
    trackContainer.appendChild(thumb);
    trackContainer.appendChild(input);

    input.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      const percent = ((val - min) / (max - min)) * 100;
      fill.style.width = `${percent}%`;
      thumb.style.left = `${percent}%`;
      onChange(val);
    });

    input.addEventListener('mouseenter', () => {
      thumb.style.transform = 'translate(-50%, -50%) scale(1.15)';
      thumb.style.boxShadow = '0 3px 12px rgba(120, 80, 255, 0.8), 0 0 0 4px rgba(120, 80, 255, 0.3)';
    });
    input.addEventListener('mouseleave', () => {
      thumb.style.transform = 'translate(-50%, -50%) scale(1)';
      thumb.style.boxShadow = '0 2px 8px rgba(120, 80, 255, 0.6), 0 0 0 3px rgba(120, 80, 255, 0.25)';
    });

    wrapper.appendChild(header);
    wrapper.appendChild(trackContainer);
    return wrapper;
  }

  private createSelect(
    label: string,
    options: { value: string; label: string }[],
    defaultValue: string,
    onChange: (value: string) => void
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-select';
    wrapper.style.cssText = `
      margin-bottom: 18px;
    `;

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      color: rgba(255, 255, 255, 0.75);
      font-weight: 500;
      margin-bottom: 8px;
    `;

    const selectWrapper = document.createElement('div');
    selectWrapper.style.cssText = `
      position: relative;
    `;

    const select = document.createElement('select');
    options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === defaultValue) option.selected = true;
      select.appendChild(option);
    });
    select.style.cssText = `
      width: 100%;
      padding: 10px 36px 10px 14px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      transition: all 0.25s ease;
    `;

    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid rgba(255, 255, 255, 0.5);
      pointer-events: none;
      transition: transform 0.25s ease;
    `;

    select.addEventListener('mouseenter', () => {
      select.style.background = 'rgba(255, 255, 255, 0.1)';
      select.style.borderColor = 'rgba(160, 130, 255, 0.4)';
    });
    select.addEventListener('mouseleave', () => {
      select.style.background = 'rgba(255, 255, 255, 0.06)';
      select.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    });
    select.addEventListener('focus', () => {
      select.style.background = 'rgba(120, 80, 255, 0.12)';
      select.style.borderColor = 'rgba(160, 130, 255, 0.6)';
      select.style.boxShadow = '0 0 0 3px rgba(120, 80, 255, 0.2)';
    });
    select.addEventListener('blur', () => {
      select.style.boxShadow = 'none';
    });

    select.addEventListener('change', (e) => {
      onChange((e.target as HTMLSelectElement).value);
    });

    selectWrapper.appendChild(select);
    selectWrapper.appendChild(arrow);

    wrapper.appendChild(labelEl);
    wrapper.appendChild(selectWrapper);
    return wrapper;
  }

  private createThemeSection(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 20px;
    `;

    const labelEl = document.createElement('div');
    labelEl.textContent = '颜色主题';
    labelEl.style.cssText = `
      color: rgba(255, 255, 255, 0.75);
      font-weight: 500;
      margin-bottom: 10px;
    `;

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    `;

    THEMES.forEach((theme) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.theme = theme.id;

      const isActive = theme.id === this.currentTheme;

      btn.style.cssText = `
        position: relative;
        padding: 10px 10px 8px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.04);
        border: ${isActive ? '2px solid rgba(180, 150, 255, 0.8)' : '2px solid transparent'};
        color: rgba(255, 255, 255, 0.85);
        font-size: 12px;
        font-family: inherit;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.25s ease;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        overflow: hidden;
      `;

      const swatch = document.createElement('div');
      swatch.style.cssText = `
        height: 18px;
        border-radius: 8px;
        background: ${theme.gradient};
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      `;

      const name = document.createElement('span');
      name.textContent = theme.name;
      name.style.cssText = `
        text-align: center;
        line-height: 1;
      `;

      const check = document.createElement('div');
      check.className = 'theme-check';
      check.textContent = '✓';
      check.style.cssText = `
        position: absolute;
        top: 6px;
        right: 8px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgba(180, 150, 255, 0.95);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        display: ${isActive ? 'flex' : 'none'};
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(120, 80, 255, 0.5);
      `;

      btn.appendChild(check);
      btn.appendChild(swatch);
      btn.appendChild(name);

      btn.addEventListener('mouseenter', () => {
        if (btn.dataset.theme !== this.currentTheme) {
          btn.style.background = 'rgba(255, 255, 255, 0.1)';
          btn.style.transform = 'translateY(-1px)';
          btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.dataset.theme !== this.currentTheme) {
          btn.style.background = 'rgba(255, 255, 255, 0.04)';
          btn.style.transform = 'translateY(0)';
          btn.style.boxShadow = 'none';
        }
      });

      btn.addEventListener('click', () => {
        this.setTheme(theme.id);
      });

      this.themeButtons.push(btn);
      grid.appendChild(btn);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(grid);
    return wrapper;
  }

  private setTheme(themeId: ColorTheme): void {
    if (themeId === this.currentTheme) return;
    this.currentTheme = themeId;

    this.themeButtons.forEach((btn) => {
      const isActive = btn.dataset.theme === themeId;
      btn.style.borderColor = isActive ? 'rgba(180, 150, 255, 0.8)' : 'transparent';
      const check = btn.querySelector('.theme-check') as HTMLDivElement;
      if (check) check.style.display = isActive ? 'flex' : 'none';
    });

    this.galaxy.updateConfig({ theme: themeId });
  }

  private createResetButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '重置视角';
    btn.style.cssText = `
      width: 100%;
      padding: 12px 16px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(120, 80, 255, 0.3), rgba(255, 100, 180, 0.3));
      border: 1px solid rgba(180, 150, 255, 0.35);
      color: rgba(255, 255, 255, 0.92);
      font-size: 13px;
      font-family: inherit;
      font-weight: 600;
      letter-spacing: 0.3px;
      cursor: pointer;
      transition: all 0.25s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    `;

    const icon = document.createElement('span');
    icon.textContent = '⟲';
    icon.style.cssText = `
      font-size: 16px;
      transition: transform 0.4s ease;
      display: inline-block;
    `;
    btn.prepend(icon);

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'linear-gradient(135deg, rgba(120, 80, 255, 0.5), rgba(255, 100, 180, 0.5))';
      btn.style.borderColor = 'rgba(180, 150, 255, 0.6)';
      btn.style.transform = 'translateY(-1px)';
      btn.style.boxShadow = '0 6px 20px rgba(120, 80, 255, 0.3)';
      icon.style.transform = 'rotate(180deg)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'linear-gradient(135deg, rgba(120, 80, 255, 0.3), rgba(255, 100, 180, 0.3))';
      btn.style.borderColor = 'rgba(180, 150, 255, 0.35)';
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = 'none';
      icon.style.transform = 'rotate(0deg)';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'translateY(0) scale(0.98)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'translateY(-1px)';
    });

    btn.addEventListener('click', () => {
      this.interaction.resetView();
    });

    return btn;
  }

  private debounceUpdateParticles(count: number): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.galaxy.updateConfig({ particleCount: count });
    }, 150);
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      select option {
        background: #1a1030;
        color: rgba(255, 255, 255, 0.9);
      }

      @keyframes fadeInPanel {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .galaxy-control-panel {
        animation: fadeInPanel 0.6s ease forwards;
        animation-delay: 0.3s;
        opacity: 0;
      }
    `;
    document.head.appendChild(style);
  }

  public dispose(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }
}
