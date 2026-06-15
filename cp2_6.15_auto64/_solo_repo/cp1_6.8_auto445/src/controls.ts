import { ParticleSystem } from './particles';
import { InteractionHandler } from './interaction';
import { COLOR_THEMES } from './utils';

interface ControlCallbacks {
  onDensityChange: (value: number) => void;
  onRotationSpeedChange: (value: number) => void;
  onThemeChange: (theme: string) => void;
  onResetView: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private particleSystem: ParticleSystem;
  private interactionHandler: InteractionHandler;

  constructor(particleSystem: ParticleSystem, interactionHandler: InteractionHandler) {
    this.particleSystem = particleSystem;
    this.interactionHandler = interactionHandler;
    this.container = this.createPanel();
    document.body.appendChild(this.container);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';

    const style = document.createElement('style');
    style.textContent = `
      #control-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 260px;
        padding: 20px;
        background: rgba(10, 10, 40, 0.55);
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
        border: 1px solid rgba(120, 100, 200, 0.2);
        border-radius: 16px;
        color: #c8c0e8;
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        font-size: 13px;
        z-index: 100;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        transition: opacity 0.3s ease, transform 0.3s ease;
        user-select: none;
      }
      #control-panel:hover {
        border-color: rgba(140, 120, 220, 0.35);
        box-shadow: 0 8px 40px rgba(80, 40, 160, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }
      .panel-title {
        font-size: 15px;
        font-weight: 600;
        color: #e0d8ff;
        margin-bottom: 16px;
        letter-spacing: 1px;
        text-align: center;
      }
      .control-group {
        margin-bottom: 14px;
      }
      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 12px;
        color: #9a90c0;
      }
      .control-value {
        color: #b8a8e8;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }
      .panel-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(100, 80, 160, 0.3);
        outline: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .panel-slider:hover {
        background: rgba(120, 100, 180, 0.45);
      }
      .panel-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #9070d0;
        border: 2px solid #c0a8f0;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        box-shadow: 0 0 8px rgba(144, 112, 208, 0.4);
      }
      .panel-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(144, 112, 208, 0.6);
      }
      .panel-slider:active::-webkit-slider-thumb {
        transform: scale(0.95);
      }
      .panel-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #9070d0;
        border: 2px solid #c0a8f0;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .panel-select {
        width: 100%;
        padding: 7px 10px;
        border-radius: 8px;
        border: 1px solid rgba(120, 100, 200, 0.25);
        background: rgba(20, 15, 50, 0.6);
        color: #c8c0e8;
        font-size: 12px;
        font-family: inherit;
        outline: none;
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .panel-select:hover {
        border-color: rgba(140, 120, 220, 0.45);
      }
      .panel-select:focus {
        border-color: rgba(140, 120, 220, 0.6);
        box-shadow: 0 0 0 2px rgba(140, 120, 220, 0.15);
      }
      .panel-select option {
        background: #1a1530;
        color: #c8c0e8;
      }
      .panel-button {
        width: 100%;
        padding: 9px 0;
        border: 1px solid rgba(120, 100, 200, 0.3);
        border-radius: 8px;
        background: rgba(80, 60, 140, 0.25);
        color: #c8c0e8;
        font-size: 13px;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s ease;
        letter-spacing: 0.5px;
      }
      .panel-button:hover {
        background: rgba(100, 80, 160, 0.4);
        border-color: rgba(140, 120, 220, 0.5);
        box-shadow: 0 0 12px rgba(120, 100, 200, 0.2);
        transform: translateY(-1px);
      }
      .panel-button:active {
        transform: translateY(0px) scale(0.98);
        background: rgba(100, 80, 160, 0.55);
      }
    `;
    document.head.appendChild(style);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '星尘控制台';
    panel.appendChild(title);

    this.createSlider(panel, '粒子密度', 1000, 5000, 2500, 100, (v) => {
      this.particleSystem.setParticleCount(v);
    });

    this.createSlider(panel, '旋转速度', 0.1, 1.5, 0.5, 0.1, (v) => {
      this.particleSystem.setRotationSpeed(v);
    });

    this.createSelect(panel, '颜色主题', COLOR_THEMES, 'nebula', (v) => {
      this.particleSystem.setTheme(v);
    });

    this.createButton(panel, '重置视角', () => {
      this.interactionHandler.resetView();
    });

    return panel;
  }

  private createSlider(
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    defaultValue: number,
    step: number,
    onChange: (value: number) => void
  ) {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'control-value';
    valueEl.textContent = String(defaultValue);

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'panel-slider';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueEl.textContent = step >= 1 ? String(Math.round(v)) : v.toFixed(1);
      onChange(v);
    });

    group.appendChild(labelRow);
    group.appendChild(slider);
    parent.appendChild(group);
  }

  private createSelect(
    parent: HTMLElement,
    label: string,
    options: Record<string, { label: string }>,
    defaultValue: string,
    onChange: (value: string) => void
  ) {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelRow.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'panel-select';

    for (const [key, opt] of Object.entries(options)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = opt.label;
      if (key === defaultValue) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      onChange(select.value);
    });

    group.appendChild(labelRow);
    group.appendChild(select);
    parent.appendChild(group);
  }

  private createButton(parent: HTMLElement, label: string, onClick: () => void) {
    const group = document.createElement('div');
    group.className = 'control-group';

    const button = document.createElement('button');
    button.className = 'panel-button';
    button.textContent = label;
    button.addEventListener('click', onClick);

    group.appendChild(button);
    parent.appendChild(group);
  }
}
