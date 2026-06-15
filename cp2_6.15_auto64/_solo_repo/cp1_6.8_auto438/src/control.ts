import { Config, THEMES, DENSITY_MIN, DENSITY_MAX, STRENGTH_MIN, STRENGTH_MAX, DEFAULT_CONFIG } from './utils';

export class ControlPanel {
  private config: Config;
  private onConfigChange: (config: Config) => void;
  private onReset: () => void;
  private panel!: HTMLDivElement;

  constructor(
    config: Config,
    onConfigChange: (config: Config) => void,
    onReset: () => void,
  ) {
    this.config = { ...config, theme: { ...config.theme } };
    this.onConfigChange = onConfigChange;
    this.onReset = onReset;
    this.createPanel();
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'control-panel';

    const style = document.createElement('style');
    style.textContent = `
      .control-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 20px 24px;
        border-radius: 12px;
        background: rgba(10, 10, 46, 0.55);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 20px rgba(100, 80, 255, 0.1), inset 0 0 30px rgba(100, 80, 255, 0.03);
        z-index: 100;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        color: rgba(255, 255, 255, 0.75);
        min-width: 220px;
        transition: box-shadow 0.3s ease;
        user-select: none;
      }
      .control-panel:hover {
        box-shadow: 0 0 30px rgba(100, 80, 255, 0.2), inset 0 0 30px rgba(100, 80, 255, 0.05);
      }
      .control-panel .ctrl-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: rgba(255, 255, 255, 0.4);
        margin-bottom: 16px;
      }
      .control-panel .ctrl-group {
        margin-bottom: 14px;
      }
      .control-panel .ctrl-group:last-child {
        margin-bottom: 0;
      }
      .control-panel .ctrl-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        margin-bottom: 6px;
        color: rgba(255, 255, 255, 0.6);
      }
      .control-panel .ctrl-value {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        font-variant-numeric: tabular-nums;
      }
      .control-panel input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.08);
        outline: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .control-panel input[type="range"]:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      .control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(160, 130, 255, 0.8);
        box-shadow: 0 0 8px rgba(160, 130, 255, 0.5);
        cursor: pointer;
        transition: box-shadow 0.2s, transform 0.15s;
      }
      .control-panel input[type="range"]::-webkit-slider-thumb:hover {
        box-shadow: 0 0 14px rgba(160, 130, 255, 0.8);
        transform: scale(1.15);
      }
      .control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(160, 130, 255, 0.8);
        box-shadow: 0 0 8px rgba(160, 130, 255, 0.5);
        border: none;
        cursor: pointer;
      }
      .control-panel select {
        width: 100%;
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        font-family: inherit;
        outline: none;
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s;
        -webkit-appearance: none;
        appearance: none;
      }
      .control-panel select:hover {
        border-color: rgba(160, 130, 255, 0.4);
      }
      .control-panel select:focus {
        border-color: rgba(160, 130, 255, 0.6);
        box-shadow: 0 0 8px rgba(160, 130, 255, 0.2);
      }
      .control-panel select option {
        background: #0a0a2e;
        color: rgba(255, 255, 255, 0.8);
      }
      .control-panel .ctrl-reset {
        width: 100%;
        padding: 8px 0;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.55);
        font-size: 12px;
        font-family: inherit;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.25s ease;
      }
      .control-panel .ctrl-reset:hover {
        background: rgba(160, 130, 255, 0.15);
        border-color: rgba(160, 130, 255, 0.3);
        color: rgba(255, 255, 255, 0.85);
        box-shadow: 0 0 12px rgba(160, 130, 255, 0.2);
      }
      .control-panel .ctrl-reset:active {
        transform: scale(0.97);
      }
    `;
    document.head.appendChild(style);

    const title = document.createElement('div');
    title.className = 'ctrl-title';
    title.textContent = '流光织网';
    this.panel.appendChild(title);

    this.createSlider('网格密度', DENSITY_MIN, DENSITY_MAX, this.config.density, 1, (v) => {
      this.config.density = v;
      this.notifyChange();
    });

    this.createSlider('扭曲强度', STRENGTH_MIN, STRENGTH_MAX, this.config.distortionStrength, 0.1, (v) => {
      this.config.distortionStrength = v;
      this.notifyChange();
    });

    this.createSelect('颜色主题', THEMES, this.config.theme.name, (theme) => {
      this.config.theme = { ...theme };
      this.notifyChange();
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'ctrl-reset';
    resetBtn.textContent = '重置';
    resetBtn.addEventListener('click', () => {
      this.config = { ...DEFAULT_CONFIG, theme: { ...DEFAULT_CONFIG.theme } };
      this.onReset();
      this.panel.remove();
      this.createPanel();
    });
    this.panel.appendChild(resetBtn);

    document.body.appendChild(this.panel);
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onChange: (v: number) => void,
  ): void {
    const group = document.createElement('div');
    group.className = 'ctrl-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'ctrl-label';

    const labelText = document.createElement('span');
    labelText.textContent = label;

    const valueText = document.createElement('span');
    valueText.className = 'ctrl-value';
    valueText.textContent = step < 1 ? value.toFixed(1) : String(value);

    labelEl.appendChild(labelText);
    labelEl.appendChild(valueText);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueText.textContent = step < 1 ? v.toFixed(1) : String(v);
      onChange(v);
    });

    group.appendChild(labelEl);
    group.appendChild(slider);
    this.panel.appendChild(group);
  }

  private createSelect(
    label: string,
    themes: Record<string, { name: string; startColor: string; endColor: string }>,
    currentName: string,
    onChange: (theme: { name: string; startColor: string; endColor: string }) => void,
  ): void {
    const group = document.createElement('div');
    group.className = 'ctrl-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'ctrl-label';
    labelEl.textContent = label;

    const select = document.createElement('select');
    for (const key of Object.keys(themes)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = themes[key].name;
      if (themes[key].name === currentName || key === currentName) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }

    select.addEventListener('change', () => {
      const selected = themes[select.value];
      if (selected) {
        onChange(selected);
      }
    });

    group.appendChild(labelEl);
    group.appendChild(select);
    this.panel.appendChild(group);
  }

  private notifyChange(): void {
    this.onConfigChange({ ...this.config, theme: { ...this.config.theme } });
  }

  destroy(): void {
    this.panel.remove();
  }
}
