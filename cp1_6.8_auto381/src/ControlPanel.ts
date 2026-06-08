export interface ControlPanelConfig {
  particleCount: number;
  connectionDistance: number;
  restoreSpeed: number;
  onParticleCountChange: (count: number) => void;
  onConnectionDistanceChange: (dist: number) => void;
  onRestoreSpeedChange: (speed: number) => void;
  onResetLayout: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private config: ControlPanelConfig;

  constructor(config: ControlPanelConfig) {
    this.config = config;
    this.container = document.createElement('div');
    this.container.className = 'gravity-control-panel';
    this.render();
    document.body.appendChild(this.container);
  }

  private render() {
    this.container.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'gcp-title';
    title.textContent = '引力织图';
    this.container.appendChild(title);

    this.createSlider(
      '粒子数量',
      50, 300, 1,
      this.config.particleCount,
      (val) => this.config.onParticleCountChange(val)
    );

    this.createSlider(
      '连接距离',
      2, 20, 0.5,
      this.config.connectionDistance,
      (val) => this.config.onConnectionDistanceChange(val)
    );

    this.createSlider(
      '恢复速度',
      0.005, 0.1, 0.005,
      this.config.restoreSpeed,
      (val) => this.config.onRestoreSpeedChange(val)
    );

    const resetBtn = document.createElement('button');
    resetBtn.className = 'gcp-button';
    resetBtn.textContent = '重置布局';
    resetBtn.addEventListener('click', () => this.config.onResetLayout());
    this.container.appendChild(resetBtn);

    this.injectStyles();
  }

  private createSlider(
    label: string,
    min: number, max: number, step: number,
    value: number,
    onChange: (val: number) => void
  ) {
    const wrapper = document.createElement('div');
    wrapper.className = 'gcp-slider-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'gcp-label-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'gcp-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'gcp-value';
    valueEl.textContent = String(value);

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.className = 'gcp-slider';

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valueEl.textContent = String(v);
      onChange(v);
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(input);
    this.container.appendChild(wrapper);
  }

  private stylesInjected = false;
  private injectStyles() {
    if (this.stylesInjected) return;
    this.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      .gravity-control-panel {
        position: fixed;
        left: 20px;
        bottom: 20px;
        width: 260px;
        padding: 24px;
        background: rgba(20, 10, 40, 0.55);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(100, 80, 200, 0.25);
        border-radius: 16px;
        color: #c8b8e8;
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        font-size: 13px;
        z-index: 1000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      .gcp-title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 20px;
        text-align: center;
        background: linear-gradient(135deg, #ffcc44, #aa66ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: 4px;
      }
      .gcp-slider-group {
        margin-bottom: 16px;
      }
      .gcp-label-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .gcp-label {
        color: #a898d8;
        font-size: 12px;
      }
      .gcp-value {
        color: #ffcc44;
        font-size: 12px;
        font-weight: 600;
        min-width: 36px;
        text-align: right;
      }
      .gcp-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(80, 60, 140, 0.4);
        outline: none;
        cursor: pointer;
      }
      .gcp-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #aa66ff;
        border: 2px solid rgba(255, 204, 68, 0.6);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(170, 102, 255, 0.5);
        transition: box-shadow 0.2s;
      }
      .gcp-slider::-webkit-slider-thumb:hover {
        box-shadow: 0 0 16px rgba(170, 102, 255, 0.8);
      }
      .gcp-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #aa66ff;
        border: 2px solid rgba(255, 204, 68, 0.6);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(170, 102, 255, 0.5);
      }
      .gcp-button {
        width: 100%;
        padding: 10px;
        margin-top: 4px;
        background: linear-gradient(135deg, rgba(170, 102, 255, 0.3), rgba(100, 60, 200, 0.3));
        border: 1px solid rgba(170, 102, 255, 0.4);
        border-radius: 8px;
        color: #d8c8ff;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        letter-spacing: 2px;
      }
      .gcp-button:hover {
        background: linear-gradient(135deg, rgba(170, 102, 255, 0.5), rgba(100, 60, 200, 0.5));
        box-shadow: 0 0 16px rgba(170, 102, 255, 0.3);
        border-color: rgba(170, 102, 255, 0.7);
      }
      .gcp-button:active {
        transform: scale(0.97);
      }
    `;
    document.head.appendChild(style);
  }

  updateValues(config: Partial<ControlPanelConfig>) {
    Object.assign(this.config, config);
    this.render();
  }

  dispose() {
    this.container.remove();
  }
}
