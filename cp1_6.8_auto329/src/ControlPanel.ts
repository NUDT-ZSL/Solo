export interface ControlState {
  flowSpeed: number;
  particleDensity: number;
  showConnections: boolean;
}

type ControlChangeCallback = (state: ControlState) => void;

export class ControlPanel {
  private container: HTMLDivElement;
  private flowSlider: HTMLInputElement;
  private densitySlider: HTMLInputElement;
  private connectionCheckbox: HTMLInputElement;
  private state: ControlState;
  private onChangeCallback: ControlChangeCallback | null = null;
  private panelVisible: boolean = true;
  private toggleBtn: HTMLButtonElement;

  constructor() {
    this.state = {
      flowSpeed: 1.0,
      particleDensity: 1.0,
      showConnections: false,
    };

    this.container = document.createElement('div');
    this.container.id = 'control-panel';
    this.applyStyles();

    const title = document.createElement('div');
    title.textContent = '⚙ 控制面板';
    title.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: rgba(180, 210, 255, 0.9);
      margin-bottom: 16px;
      text-shadow: 0 0 10px rgba(100, 160, 255, 0.5);
    `;
    this.container.appendChild(title);

    this.flowSlider = this.createSlider('纤维流速', 0.1, 3.0, 0.1, 1.0, (val) => {
      this.state.flowSpeed = val;
      this.notifyChange();
    });

    this.densitySlider = this.createSlider('光点密度', 0.1, 2.0, 0.1, 1.0, (val) => {
      this.state.particleDensity = val;
      this.notifyChange();
    });

    this.connectionCheckbox = this.createCheckbox('显示连接线', false, (checked) => {
      this.state.showConnections = checked;
      this.notifyChange();
    });

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.textContent = '▼';
    this.toggleBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: rgba(180, 210, 255, 0.6);
      cursor: pointer;
      font-size: 12px;
      padding: 4px;
      transition: transform 0.3s ease;
    `;
    this.toggleBtn.addEventListener('click', () => this.togglePanel());
    this.container.appendChild(this.toggleBtn);

    document.body.appendChild(this.container);
  }

  private applyStyles() {
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      min-width: 240px;
      padding: 20px;
      background: rgba(10, 15, 30, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(100, 160, 255, 0.15);
      border-radius: 12px;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(100, 160, 255, 0.1),
        0 0 40px rgba(60, 120, 255, 0.05);
      color: rgba(180, 210, 255, 0.85);
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      z-index: 1000;
      transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      user-select: none;
    `;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (val: number) => void
  ): HTMLInputElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `margin-bottom: 14px;`;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    `;

    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelText.style.color = 'rgba(180, 210, 255, 0.7)';

    const valueText = document.createElement('span');
    valueText.textContent = value.toFixed(1);
    valueText.style.cssText = `
      color: rgba(140, 200, 255, 0.9);
      font-variant-numeric: tabular-nums;
    `;

    labelRow.appendChild(labelText);
    labelRow.appendChild(valueText);
    wrapper.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(60, 100, 180, 0.3);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
      transition: background 0.2s;
    `;

    const styleThumb = `
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(120, 180, 255, 0.9);
      box-shadow: 0 0 8px rgba(80, 140, 255, 0.6), 0 0 20px rgba(80, 140, 255, 0.2);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      #control-panel input[type="range"]::-webkit-slider-thumb { ${styleThumb} }
      #control-panel input[type="range"]::-moz-range-thumb { ${styleThumb} border: none; }
      #control-panel input[type="range"]:hover::-webkit-slider-thumb {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(80, 140, 255, 0.8), 0 0 30px rgba(80, 140, 255, 0.3);
      }
    `;
    document.head.appendChild(styleEl);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueText.textContent = val.toFixed(1);
      onChange(val);
    });

    wrapper.appendChild(slider);
    this.container.appendChild(wrapper);
    return slider;
  }

  private createCheckbox(
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLInputElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
      cursor: pointer;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.style.cssText = `
      width: 16px;
      height: 16px;
      accent-color: rgba(100, 160, 255, 0.8);
      cursor: pointer;
      filter: drop-shadow(0 0 4px rgba(80, 140, 255, 0.5));
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 12px;
      color: rgba(180, 210, 255, 0.7);
      cursor: pointer;
    `;

    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });

    wrapper.appendChild(checkbox);
    wrapper.appendChild(labelEl);
    this.container.appendChild(wrapper);

    return checkbox;
  }

  private togglePanel() {
    this.panelVisible = !this.panelVisible;
    const children = this.container.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (child !== this.toggleBtn) {
        child.style.display = this.panelVisible ? '' : 'none';
        if (this.panelVisible) {
          child.style.opacity = '0';
          child.style.transition = 'opacity 0.3s ease';
          requestAnimationFrame(() => {
            child.style.opacity = '1';
          });
        }
      }
    }
    this.toggleBtn.textContent = this.panelVisible ? '▼' : '▲';
    this.toggleBtn.style.transform = this.panelVisible ? '' : 'rotate(180deg)';
  }

  onChange(callback: ControlChangeCallback) {
    this.onChangeCallback = callback;
  }

  private notifyChange() {
    if (this.onChangeCallback) {
      this.onChangeCallback({ ...this.state });
    }
  }

  getState(): ControlState {
    return { ...this.state };
  }
}
