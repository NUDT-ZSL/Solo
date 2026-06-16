export interface UIPanelCallbacks {
  onWindSpeedChange: (speed: number) => void;
  onPollutionSourceChange: (index: number) => void;
  onDensityChange: (density: number) => void;
  onToggleSimulation: () => void;
}

interface PollutionSourceOption {
  label: string;
  x: number;
  z: number;
}

export class UIPanel {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private callbacks: UIPanelCallbacks;

  private windSpeedSlider: HTMLInputElement | null = null;
  private windSpeedValue: HTMLSpanElement | null = null;
  private densitySlider: HTMLInputElement | null = null;
  private densityValue: HTMLSpanElement | null = null;
  private sourceSelect: HTMLSelectElement | null = null;
  private simulateButton: HTMLButtonElement | null = null;

  private isSimulating: boolean = false;

  private pollutionSources: PollutionSourceOption[] = [
    { label: '排放点 A (西侧)', x: -10, z: 0 },
    { label: '排放点 B (南侧)', x: 0, z: -8 },
    { label: '排放点 C (东南)', x: 8, z: 8 },
    { label: '排放点 D (东北)', x: -7, z: 7 },
    { label: '排放点 E (西南)', x: 7, z: -7 }
  ];

  constructor(container: HTMLElement, callbacks: UIPanelCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.panel = this.createPanel();
    this.container.appendChild(this.panel);
    this.injectStyles();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'wind-panel';

    const title = this.createTitle();
    panel.appendChild(title);

    const windGroup = this.createWindSpeedGroup();
    panel.appendChild(windGroup);

    const divider1 = this.createDivider();
    panel.appendChild(divider1);

    const sourceGroup = this.createSourceGroup();
    panel.appendChild(sourceGroup);

    const divider2 = this.createDivider();
    panel.appendChild(divider2);

    const densityGroup = this.createDensityGroup();
    panel.appendChild(densityGroup);

    const divider3 = this.createDivider();
    panel.appendChild(divider3);

    const simulateGroup = this.createSimulateButton();
    panel.appendChild(simulateGroup);

    return panel;
  }

  private createTitle(): HTMLDivElement {
    const titleGroup = document.createElement('div');
    titleGroup.className = 'panel-title-group';

    const title = document.createElement('h2');
    title.className = 'panel-title';
    title.textContent = '控制面板';

    const subtitle = document.createElement('p');
    subtitle.className = 'panel-subtitle';
    subtitle.textContent = '城风·三维风道扩散模拟器';

    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);

    return titleGroup;
  }

  private createWindSpeedGroup(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.textContent = '风速';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.textContent = '5.0 m/s';
    this.windSpeedValue = valueSpan;

    labelRow.appendChild(label);
    labelRow.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '10';
    slider.step = '0.5';
    slider.value = '5';
    slider.className = 'control-slider';
    this.windSpeedSlider = slider;

    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onWindSpeedChange(value);
      if (this.windSpeedValue) {
        this.windSpeedValue.textContent = value.toFixed(1) + ' m/s';
      }
    });

    group.appendChild(labelRow);
    group.appendChild(slider);

    return group;
  }

  private createSourceGroup(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.textContent = '污染源位置';

    labelRow.appendChild(label);

    const select = document.createElement('select');
    select.className = 'control-select';
    this.sourceSelect = select;

    this.pollutionSources.forEach((source, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.textContent = `${source.label} (X: ${source.x}, Z: ${source.z})`;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const value = parseInt((e.target as HTMLSelectElement).value);
      this.callbacks.onPollutionSourceChange(value);
    });

    group.appendChild(labelRow);
    group.appendChild(select);

    return group;
  }

  private createDensityGroup(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.textContent = '污染物密度';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.textContent = '0.4';
    this.densityValue = valueSpan;

    labelRow.appendChild(label);
    labelRow.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0.1';
    slider.max = '1.0';
    slider.step = '0.05';
    slider.value = '0.4';
    slider.className = 'control-slider';
    this.densitySlider = slider;

    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onDensityChange(value);
      if (this.densityValue) {
        this.densityValue.textContent = value.toFixed(2);
      }
    });

    group.appendChild(labelRow);
    group.appendChild(slider);

    return group;
  }

  private createSimulateButton(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const button = document.createElement('button');
    button.className = 'simulate-button';
    button.textContent = '开始扩散模拟';
    this.simulateButton = button;

    button.addEventListener('click', () => {
      this.isSimulating = !this.isSimulating;
      this.callbacks.onToggleSimulation();
      this.updateSimulateButton();
    });

    group.appendChild(button);

    return group;
  }

  private createDivider(): HTMLDivElement {
    const divider = document.createElement('div');
    divider.className = 'control-divider';
    return divider;
  }

  private updateSimulateButton(): void {
    if (this.simulateButton) {
      if (this.isSimulating) {
        this.simulateButton.textContent = '停止扩散模拟';
        this.simulateButton.classList.add('active');
      } else {
        this.simulateButton.textContent = '开始扩散模拟';
        this.simulateButton.classList.remove('active');
      }
    }
  }

  public setSimulationState(running: boolean): void {
    this.isSimulating = running;
    this.updateSimulateButton();
  }

  public getPollutionSources(): { x: number; z: number }[] {
    return this.pollutionSources.map(s => ({ x: s.x, z: s.z }));
  }

  private injectStyles(): void {
    const styleId = 'wind-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .wind-panel {
        position: fixed;
        top: 20px;
        left: 20px;
        width: 320px;
        background: rgba(26, 26, 46, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 0.5px solid #2D2D44;
        border-radius: 12px;
        padding: 24px;
        z-index: 1000;
        color: #fff;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .panel-title-group {
        margin-bottom: 20px;
      }

      .panel-title {
        font-size: 20px;
        font-weight: 600;
        color: #fff;
        margin: 0 0 4px 0;
        letter-spacing: 1px;
      }

      .panel-subtitle {
        font-size: 12px;
        color: #8888aa;
        margin: 0;
      }

      .control-group {
        margin-bottom: 0;
      }

      .control-divider {
        height: 1px;
        background: #3D3D5C;
        margin: 16px 8px;
      }

      .control-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .control-label {
        font-size: 14px;
        font-weight: 500;
        color: #ccc;
      }

      .control-value {
        font-size: 13px;
        font-weight: 600;
        color: #6C63FF;
        font-family: 'Courier New', monospace;
      }

      .control-slider {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: #2D2D44;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }

      .control-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: #6C63FF;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(108, 99, 255, 0.5);
        transition: transform 0.2s;
      }

      .control-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .control-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #6C63FF;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px rgba(108, 99, 255, 0.5);
      }

      .control-select {
        width: 100%;
        padding: 10px 12px;
        background: #121220;
        border: 1px solid #2D2D44;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        outline: none;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236C63FF' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
      }

      .control-select:hover {
        border-color: #6C63FF;
      }

      .control-select option {
        background: #1A1A2E;
        color: #fff;
      }

      .simulate-button {
        width: 100%;
        padding: 14px 20px;
        background: linear-gradient(135deg, #6C63FF, #5348d6);
        border: none;
        border-radius: 10px;
        color: #fff;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        letter-spacing: 1px;
      }

      .simulate-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(108, 99, 255, 0.4);
      }

      .simulate-button:active {
        transform: translateY(0);
      }

      .simulate-button.active {
        background: linear-gradient(135deg, #FF6F00, #e65100);
      }

      .simulate-button.active:hover {
        box-shadow: 0 6px 20px rgba(255, 111, 0, 0.4);
      }

      .info-panel {
        position: fixed;
        background: rgba(30, 30, 46, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid #2D2D44;
        border-radius: 10px;
        padding: 16px 20px;
        color: #fff;
        font-size: 13px;
        z-index: 1001;
        pointer-events: none;
        animation: infoPanelEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        min-width: 180px;
      }

      @keyframes infoPanelEnter {
        0% {
          opacity: 0;
          transform: scale(0.8);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      .info-panel-title {
        font-size: 14px;
        font-weight: 600;
        color: #6C63FF;
        margin-bottom: 10px;
      }

      .info-panel-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
      }

      .info-panel-row:last-child {
        margin-bottom: 0;
      }

      .info-panel-label {
        color: #8888aa;
      }

      .info-panel-value {
        font-weight: 500;
        color: #fff;
        font-family: 'Courier New', monospace;
      }

      .scale-bar {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(26, 26, 46, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 0.5px solid #2D2D44;
        border-radius: 8px;
        padding: 10px 20px;
        z-index: 999;
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .scale-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: #8888aa;
      }

      .scale-line {
        width: 40px;
        height: 2px;
        background: linear-gradient(90deg, #6C63FF, transparent);
        position: relative;
      }

      .scale-line::before,
      .scale-line::after {
        content: '';
        position: absolute;
        width: 2px;
        height: 8px;
        background: #6C63FF;
        top: -3px;
      }

      .scale-line::after {
        right: 0;
      }
    `;

    document.head.appendChild(style);
  }

  public showBuildingInfo(screenX: number, screenY: number, data: {
    height: number;
    windPressureLeft: number;
    windPressureRight: number;
    gridX: number;
    gridZ: number;
  }): void {
    this.hideBuildingInfo();

    const infoPanel = document.createElement('div');
    infoPanel.className = 'info-panel';
    infoPanel.id = 'building-info-panel';

    const title = document.createElement('div');
    title.className = 'info-panel-title';
    title.textContent = `建筑 #${data.gridX}-${data.gridZ}`;

    const heightRow = document.createElement('div');
    heightRow.className = 'info-panel-row';
    const heightLabel = document.createElement('span');
    heightLabel.className = 'info-panel-label';
    heightLabel.textContent = '高度';
    const heightValue = document.createElement('span');
    heightValue.className = 'info-panel-value';
    heightValue.textContent = data.height.toFixed(2) + ' u';
    heightRow.appendChild(heightLabel);
    heightRow.appendChild(heightValue);

    const pressureLeftRow = document.createElement('div');
    pressureLeftRow.className = 'info-panel-row';
    const pressureLeftLabel = document.createElement('span');
    pressureLeftLabel.className = 'info-panel-label';
    pressureLeftLabel.textContent = '左侧风压';
    const pressureLeftValue = document.createElement('span');
    pressureLeftValue.className = 'info-panel-value';
    pressureLeftValue.textContent = data.windPressureLeft.toFixed(2) + ' Pa';
    pressureLeftRow.appendChild(pressureLeftLabel);
    pressureLeftRow.appendChild(pressureLeftValue);

    const pressureRightRow = document.createElement('div');
    pressureRightRow.className = 'info-panel-row';
    const pressureRightLabel = document.createElement('span');
    pressureRightLabel.className = 'info-panel-label';
    pressureRightLabel.textContent = '右侧风压';
    const pressureRightValue = document.createElement('span');
    pressureRightValue.className = 'info-panel-value';
    pressureRightValue.textContent = data.windPressureRight.toFixed(2) + ' Pa';
    pressureRightRow.appendChild(pressureRightLabel);
    pressureRightRow.appendChild(pressureRightValue);

    infoPanel.appendChild(title);
    infoPanel.appendChild(heightRow);
    infoPanel.appendChild(pressureLeftRow);
    infoPanel.appendChild(pressureRightRow);

    document.body.appendChild(infoPanel);

    const panelWidth = 200;
    const panelHeight = 120;
    let left = screenX + 15;
    let top = screenY + 15;

    if (left + panelWidth > window.innerWidth) {
      left = screenX - panelWidth - 15;
    }
    if (top + panelHeight > window.innerHeight) {
      top = screenY - panelHeight - 15;
    }

    infoPanel.style.left = left + 'px';
    infoPanel.style.top = top + 'px';
  }

  public hideBuildingInfo(): void {
    const existing = document.getElementById('building-info-panel');
    if (existing) {
      existing.remove();
    }
  }

  public showScaleBar(): void {
    this.hideScaleBar();

    const scaleBar = document.createElement('div');
    scaleBar.className = 'scale-bar';
    scaleBar.id = 'scale-bar';

    const xScale = document.createElement('div');
    xScale.className = 'scale-item';
    const xLine = document.createElement('div');
    xLine.className = 'scale-line';
    const xText = document.createElement('span');
    xText.textContent = 'X轴 20u';
    xScale.appendChild(xLine);
    xScale.appendChild(xText);

    const zScale = document.createElement('div');
    zScale.className = 'scale-item';
    const zLine = document.createElement('div');
    zLine.className = 'scale-line';
    const zText = document.createElement('span');
    zText.textContent = 'Z轴 20u';
    zScale.appendChild(zLine);
    zScale.appendChild(zText);

    scaleBar.appendChild(xScale);
    scaleBar.appendChild(zScale);

    document.body.appendChild(scaleBar);
  }

  public hideScaleBar(): void {
    const existing = document.getElementById('scale-bar');
    if (existing) {
      existing.remove();
    }
  }

  public dispose(): void {
    this.hideBuildingInfo();
    this.hideScaleBar();
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }
}
