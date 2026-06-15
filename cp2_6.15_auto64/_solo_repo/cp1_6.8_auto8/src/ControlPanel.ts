export interface ControlParams {
  flowSpeed: number;
  sensitivity: number;
  resonanceStrength: number;
}

type ParamChangeCallback = (params: ControlParams) => void;

export class ControlPanel {
  params: ControlParams;
  private container: HTMLDivElement;
  private sliders: Map<string, { input: HTMLInputElement; display: HTMLSpanElement; current: number; target: number }> = new Map();
  private onParamChange: ParamChangeCallback | null = null;
  private animFrameId: number | null = null;

  constructor() {
    this.params = {
      flowSpeed: 1.0,
      sensitivity: 1.0,
      resonanceStrength: 1.0,
    };

    this.container = document.createElement('div');
    this.container.className = 'cloud-control-panel';
    this.container.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      .cloud-control-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 20px 24px;
        background: rgba(180, 200, 210, 0.3);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 16px;
        z-index: 200;
        min-width: 220px;
        font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
        color: #2c3e50;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
      }

      .cloud-control-panel .panel-title {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 2px;
        margin-bottom: 16px;
        color: #3a5a6a;
        text-align: center;
        opacity: 0.8;
      }

      .cloud-control-panel .slider-group {
        margin-bottom: 14px;
      }

      .cloud-control-panel .slider-group:last-child {
        margin-bottom: 0;
      }

      .cloud-control-panel .slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .cloud-control-panel .slider-label {
        font-size: 12px;
        color: #4a6a7a;
        font-weight: 500;
      }

      .cloud-control-panel .slider-value {
        font-size: 11px;
        color: #5a8a9a;
        font-weight: 600;
        min-width: 32px;
        text-align: right;
      }

      .cloud-control-panel input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(100, 140, 160, 0.25);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
        transition: background 0.3s ease;
      }

      .cloud-control-panel input[type="range"]:hover {
        background: rgba(100, 140, 160, 0.4);
      }

      .cloud-control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: rgba(200, 220, 230, 0.9);
        backdrop-filter: blur(8px);
        border: 2px solid rgba(100, 160, 180, 0.5);
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                    box-shadow 0.3s ease,
                    background 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .cloud-control-panel input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        background: rgba(220, 240, 250, 0.95);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      }

      .cloud-control-panel input[type="range"]::-webkit-slider-thumb:active {
        transform: scale(1.1);
      }

      .cloud-control-panel input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: rgba(200, 220, 230, 0.9);
        border: 2px solid rgba(100, 160, 180, 0.5);
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @media (max-width: 768px) {
        .cloud-control-panel {
          bottom: 12px;
          right: 12px;
          padding: 14px 18px;
          min-width: 180px;
        }

        .cloud-control-panel .panel-title {
          font-size: 12px;
          margin-bottom: 12px;
        }

        .cloud-control-panel .slider-label {
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(style);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '云壑流音';
    this.container.appendChild(title);

    this.addSlider('flowSpeed', '云雾流速', 0.1, 3.0, 1.0);
    this.addSlider('sensitivity', '风铃灵敏度', 0.2, 2.0, 1.0);
    this.addSlider('resonanceStrength', '共鸣强度', 0.2, 2.0, 1.0);

    document.getElementById('app')!.appendChild(this.container);
    this.startSmoothUpdate();
  }

  private addSlider(key: string, label: string, min: number, max: number, value: number): void {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const header = document.createElement('div');
    header.className = 'slider-header';

    const labelEl = document.createElement('span');
    labelEl.className = 'slider-label';
    labelEl.textContent = label;

    const display = document.createElement('span');
    display.className = 'slider-value';
    display.textContent = value.toFixed(1);

    header.appendChild(labelEl);
    header.appendChild(display);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min.toString();
    input.max = max.toString();
    input.step = '0.01';
    input.value = value.toString();

    input.addEventListener('input', () => {
      const slider = this.sliders.get(key);
      if (slider) {
        slider.target = parseFloat(input.value);
        slider.display.textContent = parseFloat(input.value).toFixed(1);
      }
    });

    group.appendChild(header);
    group.appendChild(input);
    this.container.appendChild(group);

    this.sliders.set(key, {
      input,
      display,
      current: value,
      target: value,
    });
  }

  private startSmoothUpdate(): void {
    const smooth = () => {
      let changed = false;

      for (const [key, slider] of this.sliders) {
        const diff = slider.target - slider.current;
        if (Math.abs(diff) > 0.001) {
          slider.current += diff * 0.12;
          (this.params as any)[key] = slider.current;
          changed = true;
        }
      }

      if (changed && this.onParamChange) {
        this.onParamChange({ ...this.params });
      }

      this.animFrameId = requestAnimationFrame(smooth);
    };

    this.animFrameId = requestAnimationFrame(smooth);
  }

  setOnChange(callback: ParamChangeCallback): void {
    this.onParamChange = callback;
  }

  dispose(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
