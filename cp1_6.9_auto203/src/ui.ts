import { ColorTheme, THEMES } from './feather';

export interface UIState {
  featherCount: number;
  speedMultiplier: number;
  themeIndex: number;
}

export class ControlPanel {
  container: HTMLDivElement;
  state: UIState;
  onFeatherCountChange: ((count: number) => void) | null;
  onSpeedChange: ((speed: number) => void) | null;
  onThemeChange: ((theme: ColorTheme) => void) | null;
  onReset: (() => void) | null;

  private countSlider!: HTMLInputElement;
  private countValue!: HTMLSpanElement;
  private speedSlider!: HTMLInputElement;
  private speedValue!: HTMLSpanElement;
  private themeSelect!: HTMLSelectElement;
  private resetBtn!: HTMLButtonElement;
  private toggleBtn!: HTMLButtonElement;
  private isMobile: boolean;

  constructor() {
    this.state = {
      featherCount: 150,
      speedMultiplier: 1.0,
      themeIndex: 0
    };
    this.onFeatherCountChange = null;
    this.onSpeedChange = null;
    this.onThemeChange = null;
    this.onReset = null;
    this.isMobile = this.checkMobile();
    this.container = this.createPanel();
    this.injectStyles();
  }

  private checkMobile(): boolean {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private injectStyles() {
    const styleId = 'lingyu-ui-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .lingyu-panel {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 300px;
        padding: 22px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px) saturate(1.5);
        -webkit-backdrop-filter: blur(20px) saturate(1.5);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset,
          0 0 30px rgba(155, 135, 255, 0.15),
          0 0 60px rgba(100, 200, 255, 0.08);
        color: #fff;
        font-family: inherit;
        z-index: 1000;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
      }
      .lingyu-panel.mobile {
        left: 50%;
        right: auto;
        bottom: 16px;
        top: auto;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 360px;
        padding: 16px;
        border-radius: 18px;
      }
      .lingyu-panel.collapsed {
        padding: 0;
        overflow: hidden;
      }
      .lingyu-panel.collapsed .lingyu-panel-content {
        opacity: 0;
        pointer-events: none;
        max-height: 0;
        padding-top: 0;
      }
      .lingyu-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .mobile .lingyu-panel-header {
        margin-bottom: 14px;
        padding-bottom: 10px;
      }
      .lingyu-title {
        font-size: 17px;
        font-weight: 600;
        background: linear-gradient(135deg, #a5b4fc 0%, #f0abfc 50%, #fda4af 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: 0.5px;
      }
      .mobile .lingyu-title {
        font-size: 15px;
      }
      .lingyu-toggle-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #c4b5fd;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.25s ease;
        font-size: 16px;
      }
      .lingyu-toggle-btn:hover {
        background: rgba(167, 139, 250, 0.2);
        border-color: rgba(167, 139, 250, 0.4);
        box-shadow: 0 0 15px rgba(167, 139, 250, 0.3);
        transform: scale(1.08);
      }
      .lingyu-toggle-btn:active {
        transform: scale(0.95);
      }
      .lingyu-panel-content {
        display: flex;
        flex-direction: column;
        gap: 18px;
        transition: all 0.3s ease;
        max-height: 600px;
        overflow: hidden;
      }
      .mobile .lingyu-panel-content {
        gap: 14px;
      }
      .lingyu-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .lingyu-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.75);
        font-weight: 500;
      }
      .mobile .lingyu-label {
        font-size: 12px;
      }
      .lingyu-value {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 700;
        font-size: 14px;
        font-variant-numeric: tabular-nums;
      }
      .lingyu-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
      }
      .lingyu-slider:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      .lingyu-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%);
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 2px 10px rgba(167, 139, 250, 0.5), 0 0 0 0 rgba(167, 139, 250, 0.5);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .lingyu-slider:hover::-webkit-slider-thumb {
        transform: scale(1.15);
        box-shadow: 0 2px 15px rgba(167, 139, 250, 0.6), 0 0 0 6px rgba(167, 139, 250, 0.15);
      }
      .lingyu-slider:active::-webkit-slider-thumb {
        transform: scale(1.05);
        box-shadow: 0 2px 20px rgba(167, 139, 250, 0.7), 0 0 0 8px rgba(167, 139, 250, 0.1);
      }
      .lingyu-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%);
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 2px 10px rgba(167, 139, 250, 0.5);
        transition: all 0.25s ease;
      }
      .lingyu-select {
        width: 100%;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        outline: none;
        transition: all 0.25s ease;
        font-family: inherit;
        backdrop-filter: blur(10px);
      }
      .mobile .lingyu-select {
        padding: 9px 12px;
        font-size: 12px;
      }
      .lingyu-select:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(167, 139, 250, 0.4);
        box-shadow: 0 0 15px rgba(167, 139, 250, 0.15);
      }
      .lingyu-select:focus {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(167, 139, 250, 0.6);
        box-shadow: 0 0 20px rgba(167, 139, 250, 0.25);
      }
      .lingyu-select option {
        background: #1a1a2e;
        color: #fff;
        border: none;
        padding: 8px;
      }
      .lingyu-btn {
        width: 100%;
        padding: 12px 18px;
        background: linear-gradient(135deg, rgba(167, 139, 250, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: inherit;
        letter-spacing: 0.5px;
        position: relative;
        overflow: hidden;
      }
      .mobile .lingyu-btn {
        padding: 10px 16px;
        font-size: 13px;
        border-radius: 10px;
      }
      .lingyu-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
        transition: left 0.6s ease;
      }
      .lingyu-btn:hover {
        background: linear-gradient(135deg, rgba(167, 139, 250, 0.5) 0%, rgba(236, 72, 153, 0.5) 100%);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
        box-shadow:
          0 8px 25px rgba(167, 139, 250, 0.3),
          0 4px 12px rgba(236, 72, 153, 0.2),
          0 0 30px rgba(167, 139, 250, 0.15);
      }
      .lingyu-btn:hover::before {
        left: 100%;
      }
      .lingyu-btn:active {
        transform: translateY(0) scale(0.98);
        box-shadow:
          0 4px 12px rgba(167, 139, 250, 0.25),
          0 2px 6px rgba(236, 72, 153, 0.2);
        transition: all 0.1s ease;
      }
      .lingyu-hint {
        position: fixed;
        left: 24px;
        top: 24px;
        padding: 12px 18px;
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
        line-height: 1.7;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        max-width: 280px;
      }
      .mobile .lingyu-hint {
        left: 16px;
        right: 16px;
        top: 16px;
        bottom: auto;
        max-width: none;
        font-size: 12px;
        padding: 10px 14px;
        line-height: 1.6;
      }
      .lingyu-hint strong {
        background: linear-gradient(135deg, #fbbf24, #f472b6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 700;
      }
      @media (max-width: 480px) {
        .lingyu-panel.mobile {
          width: calc(100% - 24px);
          max-width: none;
          bottom: 12px;
          padding: 14px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = `lingyu-panel${this.isMobile ? ' mobile' : ''}`;

    const header = document.createElement('div');
    header.className = 'lingyu-panel-header';

    const title = document.createElement('div');
    title.className = 'lingyu-title';
    title.textContent = '✨ 灵羽织梦';
    header.appendChild(title);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'lingyu-toggle-btn';
    this.toggleBtn.innerHTML = '▾';
    this.toggleBtn.title = '折叠/展开';
    this.toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      this.toggleBtn.innerHTML = panel.classList.contains('collapsed') ? '▴' : '▾';
    });
    header.appendChild(this.toggleBtn);

    const content = document.createElement('div');
    content.className = 'lingyu-panel-content';

    const countField = this.createSliderField(
      '羽毛数量',
      50,
      300,
      this.state.featherCount,
      (val) => {
        this.state.featherCount = val;
        this.countValue.textContent = val.toString();
        this.onFeatherCountChange?.(val);
      },
      (el) => { this.countSlider = el; },
      (el) => { this.countValue = el; }
    );
    content.appendChild(countField);

    const speedField = this.createSliderField(
      '流动速度',
      0.5,
      2.0,
      this.state.speedMultiplier,
      (val) => {
        this.state.speedMultiplier = val;
        this.speedValue.textContent = val.toFixed(1) + 'x';
        this.onSpeedChange?.(val);
      },
      (el) => { this.speedSlider = el; },
      (el) => { this.speedValue = el; },
      0.1
    );
    content.appendChild(speedField);

    const themeField = document.createElement('div');
    themeField.className = 'lingyu-field';
    const themeLabel = document.createElement('div');
    themeLabel.className = 'lingyu-label';
    themeLabel.innerHTML = '<span>颜色主题</span>';
    themeField.appendChild(themeLabel);

    this.themeSelect = document.createElement('select');
    this.themeSelect.className = 'lingyu-select';
    THEMES.forEach((theme, idx) => {
      const opt = document.createElement('option');
      opt.value = idx.toString();
      opt.textContent = theme.name;
      this.themeSelect.appendChild(opt);
    });
    this.themeSelect.addEventListener('change', (e) => {
      const idx = parseInt((e.target as HTMLSelectElement).value);
      this.state.themeIndex = idx;
      this.onThemeChange?.(THEMES[idx]);
    });
    themeField.appendChild(this.themeSelect);
    content.appendChild(themeField);

    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'lingyu-btn';
    this.resetBtn.textContent = '🔄 重置排列';
    this.resetBtn.addEventListener('click', () => {
      this.resetBtn.style.transform = 'scale(0.95)';
      setTimeout(() => { this.resetBtn.style.transform = ''; }, 150);
      this.onReset?.();
    });
    content.appendChild(this.resetBtn);

    panel.appendChild(header);
    panel.appendChild(content);

    this.createHint();

    return panel;
  }

  private createSliderField(
    labelText: string,
    min: number,
    max: number,
    value: number,
    onChange: (val: number) => void,
    sliderRef: (el: HTMLInputElement) => void,
    valueRef: (el: HTMLSpanElement) => void,
    step: number = 1
  ): HTMLDivElement {
    const field = document.createElement('div');
    field.className = 'lingyu-field';

    const label = document.createElement('div');
    label.className = 'lingyu-label';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = labelText;
    const valSpan = document.createElement('span');
    valSpan.className = 'lingyu-value';
    valSpan.textContent = step < 1 ? value.toFixed(1) + 'x' : value.toString();
    label.appendChild(nameSpan);
    label.appendChild(valSpan);
    valueRef(valSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'lingyu-slider';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    sliderRef(slider);

    slider.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      onChange(step < 1 ? parseFloat(v.toFixed(2)) : Math.round(v));
    });

    field.appendChild(label);
    field.appendChild(slider);
    return field;
  }

  private createHint() {
    const hint = document.createElement('div');
    hint.className = `lingyu-hint${this.isMobile ? ' mobile' : ''}`;
    hint.innerHTML = `
      <div><strong>💫 拖拽鼠标</strong>：引导羽毛形成流动漩涡</div>
      <div><strong>💥 点击画布</strong>：光晕爆散并聚集形成图案</div>
    `;
    document.body.appendChild(hint);

    setTimeout(() => {
      hint.style.transition = 'opacity 1s ease';
      hint.style.opacity = '0';
      setTimeout(() => hint.remove(), 1000);
    }, 8000);
  }

  mount() {
    document.body.appendChild(this.container);
    window.addEventListener('resize', () => {
      const nowMobile = this.checkMobile();
      if (nowMobile !== this.isMobile) {
        this.isMobile = nowMobile;
        this.container.className = `lingyu-panel${this.isMobile ? ' mobile' : ''}`;
      }
    });
  }

  getTheme(): ColorTheme {
    return THEMES[this.state.themeIndex];
  }
}
