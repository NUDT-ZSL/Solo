import { WindField } from './windField';
import { ParticleSystem } from './particleSystem';

export interface UIParams {
  strength: number;
  turbulence: number;
  lifetime: number;
}

export interface UICallbacks {
  onParamsChange: (params: UIParams) => void;
  onReset: () => void;
}

export class UIController {
  private container: HTMLDivElement;
  private windField: WindField;
  private particleSystem: ParticleSystem;
  private callbacks: UICallbacks;
  private params: UIParams;
  private sliders: Map<string, HTMLInputElement>;
  private valueDisplays: Map<string, HTMLSpanElement>;

  constructor(
    windField: WindField,
    particleSystem: ParticleSystem,
    callbacks: UICallbacks
  ) {
    this.windField = windField;
    this.particleSystem = particleSystem;
    this.callbacks = callbacks;
    this.sliders = new Map();
    this.valueDisplays = new Map();

    this.params = {
      strength: 8,
      turbulence: 2,
      lifetime: 5
    };

    this.container = this.createContainer();
    this.injectStyles();
    this.buildUI();
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    const styleId = 'ui-controller-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .wind-ui-container {
        position: fixed;
        left: 24px;
        bottom: 24px;
        z-index: 100;
        padding: 22px 24px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.35),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset,
          0 1px 0 rgba(255, 255, 255, 0.1) inset;
        width: 280px;
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        transform-origin: bottom left;
      }

      .wind-ui-container.collapsed {
        transform: scale(0.85) translateX(-20px);
        opacity: 0;
        pointer-events: none;
      }

      .wind-ui-title {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
        margin-bottom: 18px;
        letter-spacing: 0.08em;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .wind-ui-title::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00CED1, #8A2BE2);
        box-shadow: 0 0 10px rgba(0, 206, 209, 0.6);
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .wind-ui-group {
        margin-bottom: 16px;
      }

      .wind-ui-group:last-child {
        margin-bottom: 0;
      }

      .wind-ui-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .wind-ui-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
        letter-spacing: 0.03em;
      }

      .wind-ui-value {
        font-size: 12px;
        color: #00CED1;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        padding: 2px 8px;
        background: rgba(0, 206, 209, 0.1);
        border-radius: 6px;
        min-width: 36px;
        text-align: center;
        transition: all 0.2s ease-out;
      }

      .wind-ui-slider-container {
        position: relative;
        height: 24px;
        display: flex;
        align-items: center;
      }

      .wind-ui-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
        transition: background 0.2s ease-out;
      }

      .wind-ui-slider:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .wind-ui-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
        cursor: pointer;
        border: 2px solid #00CED1;
        box-shadow: 
          0 2px 8px rgba(0, 0, 0, 0.3),
          0 0 0 0 rgba(0, 206, 209, 0.4);
        transition: all 0.2s ease-out;
      }

      .wind-ui-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 
          0 3px 12px rgba(0, 0, 0, 0.4),
          0 0 0 6px rgba(0, 206, 209, 0.15);
      }

      .wind-ui-slider::-webkit-slider-thumb:active {
        transform: scale(1.05);
        box-shadow: 
          0 2px 6px rgba(0, 0, 0, 0.4),
          0 0 0 10px rgba(0, 206, 209, 0.1);
      }

      .wind-ui-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
        cursor: pointer;
        border: 2px solid #00CED1;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease-out;
      }

      .wind-ui-slider::-moz-range-thumb:hover {
        transform: scale(1.15);
      }

      .wind-ui-track-fill {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 4px;
        background: linear-gradient(90deg, #00CED1 0%, #8A2BE2 100%);
        border-radius: 2px;
        pointer-events: none;
        transition: width 0.05s ease-out;
      }

      .wind-ui-toggle {
        position: fixed;
        left: 24px;
        bottom: 24px;
        z-index: 99;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        transition: all 0.25s ease-out;
        opacity: 0;
        pointer-events: none;
      }

      .wind-ui-toggle.visible {
        opacity: 1;
        pointer-events: auto;
      }

      .wind-ui-toggle:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      }

      .wind-ui-hint {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 30px;
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        letter-spacing: 0.05em;
        transition: opacity 0.5s ease-out;
      }

      .wind-ui-hint.hidden {
        opacity: 0;
      }
    `;
    document.head.appendChild(style);
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'wind-ui-container';
    return container;
  }

  private buildUI(): void {
    const title = document.createElement('div');
    title.className = 'wind-ui-title';
    title.textContent = '风场参数控制';
    this.container.appendChild(title);

    this.createSlider(
      'strength',
      '风场强度',
      0,
      20,
      this.params.strength,
      0.1
    );

    this.createSlider(
      'turbulence',
      '湍流度',
      0,
      5,
      this.params.turbulence,
      0.1
    );

    this.createSlider(
      'lifetime',
      '粒子生命周期 (秒)',
      2,
      10,
      this.params.lifetime,
      0.5
    );

    this.createToggleButton();
    this.createHint();
  }

  private createSlider(
    key: keyof UIParams,
    label: string,
    min: number,
    max: number,
    value: number,
    step: number
  ): void {
    const group = document.createElement('div');
    group.className = 'wind-ui-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'wind-ui-label-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'wind-ui-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'wind-ui-value';
    valueEl.textContent = value.toFixed(1);

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'wind-ui-slider-container';

    const trackFill = document.createElement('div');
    trackFill.className = 'wind-ui-track-fill';
    const fillPercent = ((value - min) / (max - min)) * 100;
    trackFill.style.width = `${fillPercent}%`;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value.toString();
    slider.step = step.toString();
    slider.className = 'wind-ui-slider';

    sliderContainer.appendChild(trackFill);
    sliderContainer.appendChild(slider);

    group.appendChild(labelRow);
    group.appendChild(sliderContainer);

    this.container.appendChild(group);
    this.sliders.set(key, slider);
    this.valueDisplays.set(key, valueEl);

    let updateTimeout: number | null = null;
    
    slider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const newValue = parseFloat(target.value);
      this.params[key] = newValue;
      
      valueEl.textContent = newValue.toFixed(1);
      const percent = ((newValue - min) / (max - min)) * 100;
      trackFill.style.width = `${percent}%`;

      valueEl.style.background = 'rgba(0, 206, 209, 0.25)';
      valueEl.style.color = '#ffffff';

      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = window.setTimeout(() => {
        valueEl.style.background = 'rgba(0, 206, 209, 0.1)';
        valueEl.style.color = '#00CED1';
      }, 200);

      this.applyChanges();
    });
  }

  private createToggleButton(): void {
    const toggle = document.createElement('button');
    toggle.className = 'wind-ui-toggle';
    toggle.innerHTML = '⚙';
    toggle.title = '显示/隐藏控制面板';

    let collapsed = false;

    toggle.addEventListener('click', () => {
      collapsed = !collapsed;
      if (collapsed) {
        this.container.classList.add('collapsed');
        setTimeout(() => {
          toggle.classList.add('visible');
        }, 150);
      } else {
        this.container.classList.remove('collapsed');
        toggle.classList.remove('visible');
      }
    });

    document.body.appendChild(toggle);

    setTimeout(() => {
      this.container.style.opacity = '0';
      this.container.style.transform = 'scale(0.9) translateY(20px)';
      
      requestAnimationFrame(() => {
        this.container.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        this.container.style.opacity = '1';
        this.container.style.transform = 'scale(1) translateY(0)';
      });
    }, 100);
  }

  private createHint(): void {
    const hint = document.createElement('div');
    hint.className = 'wind-ui-hint';
    hint.textContent = '🖱 拖拽旋转视角 · 滚轮缩放 · 点击粒子产生风扰动';
    document.body.appendChild(hint);

    setTimeout(() => {
      hint.classList.add('hidden');
    }, 8000);
  }

  private applyChanges(): void {
    this.windField.updateParams({
      strength: this.params.strength,
      turbulence: this.params.turbulence
    });

    this.particleSystem.updateLifetime(this.params.lifetime);

    this.callbacks.onParamsChange(this.params);
  }

  getParams(): UIParams {
    return { ...this.params };
  }

  destroy(): void {
    this.container.remove();
  }
}
