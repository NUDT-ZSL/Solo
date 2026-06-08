export interface ControlPanelCallbacks {
  onLineWidthChange: (width: number) => void;
  onSpreadSpeedChange: (speed: number) => void;
  onReset: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private callbacks: ControlPanelCallbacks;
  private fadeInAnimation = true;

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = this.createPanel();
    document.body.appendChild(this.container);

    requestAnimationFrame(() => {
      this.container.style.opacity = '1';
      this.container.style.transform = 'translateY(0)';
    });
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
      background: rgba(15, 15, 25, 0.65);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 16px;
      padding: 24px 28px;
      color: rgba(255, 255, 255, 0.85);
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      min-width: 240px;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    `;

    const title = document.createElement('div');
    title.textContent = '流光织诗';
    title.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 20px;
      color: rgba(167, 139, 250, 0.9);
    `;
    panel.appendChild(title);

    panel.appendChild(this.createSlider(
      '光线粗细',
      0.5, 5, 0.1, 1.5,
      (v) => this.callbacks.onLineWidthChange(v)
    ));

    panel.appendChild(this.createSlider(
      '粒子扩散',
      0.5, 3, 0.1, 1.0,
      (v) => this.callbacks.onSpreadSpeedChange(v)
    ));

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置画布';
    resetBtn.style.cssText = `
      width: 100%;
      margin-top: 16px;
      padding: 10px 0;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px;
      color: rgba(167, 139, 250, 0.9);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.25s ease;
      font-family: inherit;
    `;
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(99, 102, 241, 0.3)';
      resetBtn.style.borderColor = 'rgba(99, 102, 241, 0.5)';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(99, 102, 241, 0.15)';
      resetBtn.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    });
    resetBtn.addEventListener('click', () => this.callbacks.onReset());
    panel.appendChild(resetBtn);

    return panel;
  }

  private createSlider(
    label: string,
    min: number, max: number, step: number, defaultValue: number,
    onChange: (value: number) => void
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `margin-bottom: 16px;`;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `font-size: 12px; color: rgba(255, 255, 255, 0.6);`;

    const valueEl = document.createElement('span');
    valueEl.textContent = defaultValue.toFixed(1);
    valueEl.style.cssText = `font-size: 12px; color: rgba(167, 139, 250, 0.8); font-variant-numeric: tabular-nums;`;

    header.appendChild(labelEl);
    header.appendChild(valueEl);
    wrapper.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(99, 102, 241, 0.2);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;

    const style = document.createElement('style');
    style.textContent = `
      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(167, 139, 250, 0.9);
        border: 2px solid rgba(99, 102, 241, 0.4);
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      #control-panel input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
      }
      #control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(167, 139, 250, 0.9);
        border: 2px solid rgba(99, 102, 241, 0.4);
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueEl.textContent = val.toFixed(1);
      onChange(val);
    });

    wrapper.appendChild(slider);
    return wrapper;
  }

  dispose(): void {
    this.container.remove();
  }
}
