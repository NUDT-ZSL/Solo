export interface ControlPanelCallbacks {
  onFlowSpeedChange: (value: number) => void;
  onOrbitDensityChange: (value: number) => void;
  onShowTrajectoryChange: (value: boolean) => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private callbacks: ControlPanelCallbacks;

  private currentFlowSpeed = 1.0;
  private targetFlowSpeed = 1.0;
  private currentDensity = 1.0;
  private targetDensity = 1.0;

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = this.createPanel();
    document.body.appendChild(this.container);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = '';

    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '260px',
      padding: '20px 22px',
      background: 'rgba(30, 10, 50, 0.45)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      color: '#e0d8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '13px',
      zIndex: '100',
      userSelect: 'none',
    });

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '15px',
      fontWeight: '600',
      marginBottom: '16px',
      letterSpacing: '0.5px',
      color: 'rgba(255, 220, 140, 0.9)',
    });
    title.textContent = '星轨控制';
    panel.appendChild(title);

    this.createSlider(
      panel,
      '粒子流速',
      0.1,
      3.0,
      0.1,
      1.0,
      (val) => {
        this.targetFlowSpeed = val;
      },
    );

    this.createSlider(
      panel,
      '星轨密度',
      0.2,
      1.0,
      0.05,
      1.0,
      (val) => {
        this.targetDensity = val;
      },
    );

    this.createCheckbox(
      panel,
      '显示轨迹线',
      false,
      (checked) => {
        this.callbacks.onShowTrajectoryChange(checked);
      },
    );

    return panel;
  }

  private createSlider(
    parent: HTMLDivElement,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (value: number) => void,
  ): HTMLInputElement {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      marginBottom: '14px',
    });

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '6px',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.opacity = '0.85';

    const valueEl = document.createElement('span');
    valueEl.textContent = value.toFixed(1);
    valueEl.style.opacity = '0.7';
    valueEl.style.fontSize = '12px';

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    wrapper.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'rgba(255, 255, 255, 0.15)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
    });

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueEl.textContent = val.toFixed(1);
      onChange(val);
    });

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(255, 200, 100, 0.9);
        box-shadow: 0 0 8px rgba(255, 180, 60, 0.5);
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      #control-panel input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(255, 180, 60, 0.7);
      }
      #control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(255, 200, 100, 0.9);
        box-shadow: 0 0 8px rgba(255, 180, 60, 0.5);
        cursor: pointer;
        border: none;
      }
    `;
    if (!document.getElementById('slider-style')) {
      styleTag.id = 'slider-style';
      document.head.appendChild(styleTag);
    }

    wrapper.appendChild(slider);
    parent.appendChild(wrapper);

    return slider;
  }

  private createCheckbox(
    parent: HTMLDivElement,
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ): HTMLInputElement {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '4px',
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    Object.assign(checkbox.style, {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '16px',
      height: '16px',
      borderRadius: '3px',
      border: '1.5px solid rgba(255, 255, 255, 0.3)',
      background: 'rgba(255, 255, 255, 0.05)',
      cursor: 'pointer',
      position: 'relative',
      transition: 'all 0.25s ease',
      flexShrink: '0',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.opacity = '0.85';

    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
      if (checkbox.checked) {
        checkbox.style.background = 'rgba(255, 200, 100, 0.3)';
        checkbox.style.borderColor = 'rgba(255, 200, 100, 0.6)';
      } else {
        checkbox.style.background = 'rgba(255, 255, 255, 0.05)';
        checkbox.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      }
    });

    const checkStyle = document.createElement('style');
    checkStyle.textContent = `
      #control-panel input[type="checkbox"]:checked::after {
        content: '';
        position: absolute;
        left: 4px;
        top: 1px;
        width: 5px;
        height: 9px;
        border: solid rgba(255, 220, 140, 0.9);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    `;
    if (!document.getElementById('checkbox-style')) {
      checkStyle.id = 'checkbox-style';
      document.head.appendChild(checkStyle);
    }

    wrapper.appendChild(checkbox);
    wrapper.appendChild(labelEl);
    parent.appendChild(wrapper);

    return checkbox;
  }

  update(dt: number) {
    const lerp = (current: number, target: number, speed: number) => {
      return current + (target - current) * Math.min(1, speed * dt);
    };

    this.currentFlowSpeed = lerp(this.currentFlowSpeed, this.targetFlowSpeed, 5);
    this.currentDensity = lerp(this.currentDensity, this.targetDensity, 4);

    if (Math.abs(this.currentFlowSpeed - this.targetFlowSpeed) > 0.001) {
      this.callbacks.onFlowSpeedChange(this.currentFlowSpeed);
    } else {
      this.currentFlowSpeed = this.targetFlowSpeed;
      this.callbacks.onFlowSpeedChange(this.currentFlowSpeed);
    }

    if (Math.abs(this.currentDensity - this.targetDensity) > 0.005) {
      this.callbacks.onOrbitDensityChange(this.currentDensity);
    } else {
      this.currentDensity = this.targetDensity;
      this.callbacks.onOrbitDensityChange(this.currentDensity);
    }
  }

  dispose() {
    this.container.remove();
  }
}
