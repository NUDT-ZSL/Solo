export interface GUISettings {
  heightScale: number;
  colorBlend: number;
  fogDensity: number;
}

export type GUIChangeHandler = (settings: GUISettings) => void;

interface SliderConfig {
  key: keyof GUISettings;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export class GUIController {
  private settings: GUISettings;
  private container: HTMLDivElement;
  private sliders: Map<keyof GUISettings, HTMLInputElement> = new Map();
  private valueDisplays: Map<keyof GUISettings, HTMLSpanElement> = new Map();
  private onChange: GUIChangeHandler;

  constructor(initialSettings: GUISettings, onChange: GUIChangeHandler) {
    this.settings = { ...initialSettings };
    this.onChange = onChange;
    this.container = this.createContainer();
    this.createStyles();
    this.createSliders();
  }

  private createStyles(): void {
    const styleId = 'terrain-gui-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .gui-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(30, 30, 50, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-radius: 12px;
        padding: 20px;
        min-width: 240px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 1000;
        transition: filter 0.15s ease;
      }

      .gui-panel:hover {
        filter: brightness(1.1);
      }

      .gui-title {
        color: #fff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        letter-spacing: 0.5px;
      }

      .gui-slider-container {
        margin-bottom: 16px;
        transition: filter 0.15s ease;
      }

      .gui-slider-container:hover {
        filter: brightness(1.15);
      }

      .gui-slider-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #aaa;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        margin-bottom: 6px;
      }

      .gui-slider-value {
        color: #00d4ff;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }

      .gui-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: #333;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .gui-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #00d4ff;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
      }

      .gui-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.8);
      }

      .gui-slider::-webkit-slider-thumb:active {
        transform: scale(1.3);
      }

      .gui-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #00d4ff;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
      }

      .gui-slider::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.8);
      }

      .gui-slider::-moz-range-track {
        height: 6px;
        background: #333;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'gui-panel';

    const title = document.createElement('div');
    title.className = 'gui-title';
    title.textContent = '地形参数控制';
    container.appendChild(title);

    document.body.appendChild(container);
    return container;
  }

  private createSliders(): void {
    const sliderConfigs: SliderConfig[] = [
      { key: 'heightScale', label: '高度缩放', min: 0.5, max: 3.0, step: 0.01, value: this.settings.heightScale },
      { key: 'colorBlend', label: '颜色混合强度', min: 0, max: 1, step: 0.01, value: this.settings.colorBlend },
      { key: 'fogDensity', label: '雾效浓度', min: 0, max: 0.1, step: 0.001, value: this.settings.fogDensity }
    ];

    sliderConfigs.forEach(config => {
      this.createSlider(config);
    });
  }

  private createSlider(config: SliderConfig): void {
    const container = document.createElement('div');
    container.className = 'gui-slider-container';

    const labelContainer = document.createElement('div');
    labelContainer.className = 'gui-slider-label';

    const label = document.createElement('span');
    label.textContent = config.label;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'gui-slider-value';
    valueDisplay.textContent = config.value.toFixed(config.step < 0.01 ? 3 : 2);

    labelContainer.appendChild(label);
    labelContainer.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'gui-slider';
    slider.min = config.min.toString();
    slider.max = config.max.toString();
    slider.step = config.step.toString();
    slider.value = config.value.toString();

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.settings[config.key] = value;
      valueDisplay.textContent = value.toFixed(config.step < 0.01 ? 3 : 2);
      this.onChange(this.settings);
    });

    slider.addEventListener('change', () => {
      this.onChange(this.settings);
    });

    container.appendChild(labelContainer);
    container.appendChild(slider);
    this.container.appendChild(container);

    this.sliders.set(config.key, slider);
    this.valueDisplays.set(config.key, valueDisplay);
  }

  updateSettings(settings: Partial<GUISettings>): void {
    Object.entries(settings).forEach(([key, value]) => {
      const k = key as keyof GUISettings;
      if (value !== undefined) {
        this.settings[k] = value;
        const slider = this.sliders.get(k);
        const display = this.valueDisplays.get(k);
        if (slider) slider.value = value.toString();
        if (display) {
          const step = parseFloat(slider?.step || '0.01');
          display.textContent = value.toFixed(step < 0.01 ? 3 : 2);
        }
      }
    });
  }

  getSettings(): GUISettings {
    return { ...this.settings };
  }

  dispose(): void {
    this.container.remove();
    const style = document.getElementById('terrain-gui-styles');
    if (style) style.remove();
  }
}

export function createInfoPanel(): {
  updatePosition: (x: number, y: number, z: number) => void;
  updateFPS: (fps: number) => void;
} {
  const styleId = 'terrain-info-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .info-panel {
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(30, 30, 50, 0.6);
        border-radius: 0 16px 16px 16px;
        padding: 16px 20px;
        min-width: 180px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 1000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        transition: filter 0.15s ease;
      }

      .info-panel:hover {
        filter: brightness(1.1);
      }

      .info-item {
        color: #aaa;
        font-size: 12px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      .info-item:last-child {
        margin-bottom: 0;
      }

      .info-label {
        color: #888;
      }

      .info-value {
        color: #00d4ff;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }

      .info-fps {
        color: #4ade80 !important;
      }

      .info-fps.warn {
        color: #fbbf24 !important;
      }

      .info-fps.low {
        color: #f87171 !important;
      }
    `;
    document.head.appendChild(style);
  }

  const container = document.createElement('div');
  container.className = 'info-panel';

  const posItem = document.createElement('div');
  posItem.className = 'info-item';
  posItem.innerHTML = '<span class="info-label">位置</span><span class="info-value" id="info-pos">0.00, 0.00, 0.00</span>';

  const fpsItem = document.createElement('div');
  fpsItem.className = 'info-item';
  fpsItem.innerHTML = '<span class="info-label">FPS</span><span class="info-value info-fps" id="info-fps">60</span>';

  container.appendChild(posItem);
  container.appendChild(fpsItem);
  document.body.appendChild(container);

  const posDisplay = document.getElementById('info-pos') as HTMLSpanElement;
  const fpsDisplay = document.getElementById('info-fps') as HTMLSpanElement;

  return {
    updatePosition: (x: number, y: number, z: number) => {
      posDisplay.textContent = `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`;
    },
    updateFPS: (fps: number) => {
      fpsDisplay.textContent = fps.toFixed(0);
      fpsDisplay.classList.remove('warn', 'low');
      if (fps < 45) fpsDisplay.classList.add('low');
      else if (fps < 55) fpsDisplay.classList.add('warn');
    }
  };
}
