export interface ControlPanelCallbacks {
  onFlowSpeedChange: (speed: number) => void;
  onTrackDensityChange: (density: number) => void;
  onShowTrajectoryChange: (show: boolean) => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private callbacks: ControlPanelCallbacks;

  private flowSpeedSlider!: HTMLInputElement;
  private trackDensitySlider!: HTMLInputElement;
  private showTrajectoryCheckbox!: HTMLInputElement;

  private flowSpeedLabel!: HTMLSpanElement;
  private trackDensityLabel!: HTMLSpanElement;

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = this.createPanel();
    document.body.appendChild(this.container);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';

    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '260px',
      padding: '20px',
      background: 'rgba(20, 10, 40, 0.6)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      color: '#e0d8f0',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: '13px',
      zIndex: '1000',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      opacity: '0',
      transform: 'translateY(20px)',
    });

    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
    });

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '15px',
      fontWeight: '600',
      marginBottom: '16px',
      letterSpacing: '0.5px',
      color: '#c8b8e8',
      textShadow: '0 0 10px rgba(180, 130, 255, 0.3)',
    });
    title.textContent = '⚙ 控制面板';
    panel.appendChild(title);

    const { container: speedGroup, slider: speedSlider, label: speedLabel } = this.createSliderGroup(
      '粒子流速',
      0.1,
      3.0,
      1.0,
      0.1,
      (value) => {
        this.callbacks.onFlowSpeedChange(value);
      }
    );
    this.flowSpeedSlider = speedSlider;
    this.flowSpeedLabel = speedLabel;
    panel.appendChild(speedGroup);

    const { container: densityGroup, slider: densitySlider, label: densityLabel } = this.createSliderGroup(
      '星轨密度',
      20,
      300,
      120,
      10,
      (value) => {
        this.callbacks.onTrackDensityChange(value);
      }
    );
    this.trackDensitySlider = densitySlider;
    this.trackDensityLabel = densityLabel;
    panel.appendChild(densityGroup);

    const { container: checkGroup, checkbox } = this.createCheckboxGroup(
      '显示轨迹线',
      false,
      (checked) => {
        this.callbacks.onShowTrajectoryChange(checked);
      }
    );
    this.showTrajectoryCheckbox = checkbox;
    panel.appendChild(checkGroup);

    return panel;
  }

  private createSliderGroup(
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onChange: (value: number) => void
  ): { container: HTMLDivElement; slider: HTMLInputElement; label: HTMLSpanElement } {
    const group = document.createElement('div');
    Object.assign(group.style, {
      marginBottom: '14px',
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px',
    });

    const labelText = document.createElement('span');
    labelText.textContent = label;
    Object.assign(labelText.style, {
      fontSize: '12px',
      color: '#a898c8',
    });

    const valueLabel = document.createElement('span');
    valueLabel.textContent = value.toFixed(1);
    Object.assign(valueLabel.style, {
      fontSize: '12px',
      color: '#d0c0f0',
      fontWeight: '500',
      transition: 'color 0.3s ease',
    });

    header.appendChild(labelText);
    header.appendChild(valueLabel);
    group.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.step = String(step);

    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
      transition: 'background 0.3s ease',
    });

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueLabel.textContent = val.toFixed(1);
      onChange(val);
    });

    const style = document.createElement('style');
    style.textContent = `
      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: linear-gradient(135deg, #c898ff, #9060e0);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(160, 100, 230, 0.5);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      #control-panel input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(160, 100, 230, 0.7);
      }
      #control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: linear-gradient(135deg, #c898ff, #9060e0);
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(160, 100, 230, 0.5);
      }
    `;
    document.head.appendChild(style);

    group.appendChild(slider);

    return { container: group, slider, label: valueLabel };
  }

  private createCheckboxGroup(
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): { container: HTMLDivElement; checkbox: HTMLInputElement } {
    const group = document.createElement('div');
    Object.assign(group.style, {
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
      border: '1px solid rgba(200, 160, 255, 0.4)',
      borderRadius: '4px',
      background: 'rgba(255, 255, 255, 0.05)',
      cursor: 'pointer',
      position: 'relative',
      transition: 'all 0.3s ease',
      flexShrink: '0',
    });

    const checkStyle = document.createElement('style');
    checkStyle.textContent = `
      #control-panel input[type="checkbox"]:checked {
        background: linear-gradient(135deg, #c898ff, #9060e0);
        border-color: #b080e0;
      }
      #control-panel input[type="checkbox"]:checked::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 10px;
        font-weight: bold;
      }
    `;
    document.head.appendChild(checkStyle);

    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });

    const labelText = document.createElement('span');
    labelText.textContent = label;
    Object.assign(labelText.style, {
      fontSize: '12px',
      color: '#a898c8',
      cursor: 'pointer',
      userSelect: 'none',
    });

    labelText.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      onChange(checkbox.checked);
    });

    group.appendChild(checkbox);
    group.appendChild(labelText);

    return { container: group, checkbox };
  }

  getFlowSpeed(): number {
    return parseFloat(this.flowSpeedSlider.value);
  }

  getTrackDensity(): number {
    return parseFloat(this.trackDensitySlider.value);
  }

  getShowTrajectory(): boolean {
    return this.showTrajectoryCheckbox.checked;
  }

  dispose(): void {
    this.container.remove();
  }
}
