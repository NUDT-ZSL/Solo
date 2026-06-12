import type { EpicycleConfig, PlaybackSpeed, EpicycleSystemAPI } from './types';

export class UIControls {
  private container: HTMLElement;
  private system: EpicycleSystemAPI;
  private epicycles: EpicycleConfig[] = [];
  private panel: HTMLDivElement;
  private epicycleList: HTMLDivElement;
  private addButton: HTMLButtonElement;
  private playPauseBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private speedDownBtn: HTMLButtonElement;
  private speedUpBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;

  private onExport?: () => void;

  private epicycleRowMap: Map<string, HTMLElement> = new Map();
  private inputRefs: Map<string, { slider: HTMLInputElement; number: HTMLInputElement }> = new Map();

  private isRemoving: Set<string> = new Set();

  constructor(container: HTMLElement, system: EpicycleSystemAPI) {
    this.container = container;
    this.system = system;

    this.panel = document.createElement('div');
    this.epicycleList = document.createElement('div');
    this.addButton = document.createElement('button');
    this.playPauseBtn = document.createElement('button');
    this.resetBtn = document.createElement('button');
    this.speedDownBtn = document.createElement('button');
    this.speedUpBtn = document.createElement('button');
    this.exportBtn = document.createElement('button');

    this.buildPanel();
    this.setupStyles();
    this.setupEventListeners();
    this.initDefaultEpicycles();
  }

  setOnExport(callback: () => void) {
    this.onExport = callback;
  }

  private buildPanel() {
    this.panel.className = 'epicycle-panel';

    const title = document.createElement('h2');
    title.textContent = 'EpicycleFlow';
    title.className = 'panel-title';
    this.panel.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = '本轮视觉生成器';
    subtitle.className = 'panel-subtitle';
    this.panel.appendChild(subtitle);

    const epicyclesLabel = document.createElement('div');
    epicyclesLabel.className = 'section-label';
    epicyclesLabel.textContent = '本轮配置';
    this.panel.appendChild(epicyclesLabel);

    this.epicycleList.className = 'epicycle-list';
    this.panel.appendChild(this.epicycleList);

    this.addButton.className = 'add-btn';
    this.addButton.innerHTML = '+ 添加本轮';
    this.panel.appendChild(this.addButton);

    const controlsLabel = document.createElement('div');
    controlsLabel.className = 'section-label';
    controlsLabel.textContent = '播放控制';
    this.panel.appendChild(controlsLabel);

    const controlsRow = document.createElement('div');
    controlsRow.className = 'controls-row';

    this.playPauseBtn.className = 'control-btn play-btn';
    this.playPauseBtn.innerHTML = '⏸ 暂停';
    controlsRow.appendChild(this.playPauseBtn);

    this.resetBtn.className = 'control-btn reset-btn';
    this.resetBtn.innerHTML = '↺ 重置';
    controlsRow.appendChild(this.resetBtn);

    this.speedDownBtn.className = 'control-btn speed-btn speed-down';
    this.speedDownBtn.innerHTML = '« 0.5x';
    controlsRow.appendChild(this.speedDownBtn);

    this.speedUpBtn.className = 'control-btn speed-btn speed-up';
    this.speedUpBtn.innerHTML = '2x »';
    controlsRow.appendChild(this.speedUpBtn);

    this.panel.appendChild(controlsRow);

    this.container.appendChild(this.panel);

    this.exportBtn.className = 'export-btn';
    this.exportBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    `;
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';
    tooltip.textContent = '导出为SVG';
    this.exportBtn.appendChild(tooltip);

    this.container.appendChild(this.exportBtn);
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        overflow: hidden;
        background: #1a1a2e;
      }

      #root {
        width: 100vw;
        height: 100vh;
        position: relative;
      }

      canvas {
        display: block;
        cursor: grab;
      }

      canvas:active {
        cursor: grabbing;
      }

      .epicycle-panel {
        position: absolute;
        top: 20px;
        left: 20px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 16px;
        padding: 20px;
        width: 320px;
        z-index: 100;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .panel-title {
        font-size: 22px;
        font-weight: 700;
        background: linear-gradient(135deg, #00f5d4, #f72585);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 4px;
      }

      .panel-subtitle {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 20px;
      }

      .section-label {
        font-size: 12px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 12px;
        margin-top: 16px;
      }

      .section-label:first-of-type {
        margin-top: 0;
      }

      .epicycle-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 12px;
      }

      .epicycle-row {
        background: rgba(22, 33, 62, 0.6);
        border-radius: 12px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        transition: opacity 300ms ease, transform 300ms ease, max-height 300ms ease, padding 300ms ease, margin 300ms ease, border-width 300ms ease;
        max-height: 200px;
        overflow: hidden;
        opacity: 1;
        transform: translateX(0);
      }

      .epicycle-row.fade-out {
        opacity: 0;
        transform: translateX(-20px);
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        margin-top: 0;
        margin-bottom: 0;
        border-width: 0;
      }

      .epicycle-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .epicycle-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
      }

      .epicycle-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }

      .delete-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        font-size: 16px;
        padding: 2px 6px;
        border-radius: 6px;
        transition: all 150ms ease;
      }

      .delete-btn:hover {
        background: rgba(255, 0, 110, 0.2);
        color: #ff006e;
      }

      .delete-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .control-group {
        margin-bottom: 8px;
      }

      .control-group:last-child {
        margin-bottom: 0;
      }

      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 6px;
      }

      .control-value {
        background: rgba(15, 52, 96, 0.6);
        border: 1px solid #495057;
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        width: 65px;
        text-align: center;
        outline: none;
        transition: all 150ms ease;
        font-family: inherit;
        -moz-appearance: textfield;
      }

      .control-value::-webkit-outer-spin-button,
      .control-value::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .control-value:hover {
        border-color: #6c757d;
        box-shadow: 0 0 0 1px rgba(73, 80, 87, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
      }

      .control-value:focus {
        border-color: #00f5d4;
        box-shadow: 0 0 0 2px rgba(0, 245, 212, 0.2), inset 0 0 0 1px rgba(0, 245, 212, 0.1);
      }

      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        outline: none;
        cursor: pointer;
      }

      input[type="range"]:hover::-webkit-slider-thumb {
        transform: scale(1.15);
        box-shadow: 0 0 16px rgba(0, 245, 212, 0.6);
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00f5d4, #06d6a0);
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 245, 212, 0.4);
        transition: all 150ms ease;
      }

      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00f5d4, #06d6a0);
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px rgba(0, 245, 212, 0.4);
      }

      .add-btn {
        width: 100%;
        padding: 10px;
        background: rgba(6, 214, 160, 0.15);
        border: 1px dashed #06d6a0;
        border-radius: 10px;
        color: #06d6a0;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 200ms ease;
        font-family: inherit;
      }

      .add-btn:hover {
        background: rgba(6, 214, 160, 0.25);
        box-shadow: 0 0 20px rgba(6, 214, 160, 0.2);
      }

      .add-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .controls-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .control-btn {
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 150ms ease;
        font-family: inherit;
      }

      .play-btn {
        background: rgba(6, 214, 160, 0.2);
        border-color: rgba(6, 214, 160, 0.4);
        color: #06d6a0;
      }

      .play-btn:hover {
        background: rgba(6, 214, 160, 0.3);
        box-shadow: 0 0 16px rgba(6, 214, 160, 0.3);
      }

      .play-btn.paused {
        background: rgba(255, 190, 11, 0.2);
        border-color: rgba(255, 190, 11, 0.4);
        color: #ffbe0b;
      }

      .reset-btn {
        background: rgba(76, 201, 240, 0.15);
        border-color: rgba(76, 201, 240, 0.3);
        color: #4cc9f0;
      }

      .reset-btn:hover {
        background: rgba(76, 201, 240, 0.25);
        box-shadow: 0 0 16px rgba(76, 201, 240, 0.3);
      }

      .speed-btn {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.8);
      }

      .speed-btn:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .speed-btn.active {
        transform: scale(1.05);
      }

      .speed-up.active {
        background: rgba(255, 0, 110, 0.25);
        border-color: rgba(255, 0, 110, 0.5);
        color: #ff006e;
        box-shadow: 0 0 16px rgba(255, 0, 110, 0.3);
      }

      .speed-down.active {
        background: rgba(76, 201, 240, 0.25);
        border-color: rgba(76, 201, 240, 0.5);
        color: #4cc9f0;
        box-shadow: 0 0 16px rgba(76, 201, 240, 0.3);
      }

      .export-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #2d6a4f;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        transition: all 200ms ease;
      }

      .export-btn:hover {
        background: #40916c;
        transform: scale(1.08);
        box-shadow: 0 0 20px rgba(45, 106, 79, 0.5);
      }

      .export-btn .tooltip {
        position: absolute;
        right: 50px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 200ms ease;
      }

      .export-btn:hover .tooltip {
        opacity: 1;
      }

      .perf-stats {
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 11px;
        font-family: 'Consolas', 'Monaco', monospace;
        color: rgba(255, 255, 255, 0.6);
        z-index: 100;
        line-height: 1.6;
      }

      .perf-stats .fps {
        color: #06d6a0;
        font-weight: 600;
      }

      .perf-stats .draw {
        color: #4cc9f0;
      }
    `;
    document.head.appendChild(style);
  }

  private setupEventListeners() {
    this.addButton.addEventListener('click', () => this.addEpicycle());
    this.playPauseBtn.addEventListener('click', () => this.togglePlay());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.speedUpBtn.addEventListener('click', () => this.setSpeed(2));
    this.speedDownBtn.addEventListener('click', () => this.setSpeed(0.5));
    this.exportBtn.addEventListener('click', () => {
      if (this.onExport) this.onExport();
    });
  }

  private initDefaultEpicycles() {
    const colors = this.getEpicycleColors();

    this.epicycles = [
      { id: 'epi-1', radius: 80, angularVelocity: 1, phase: 0, color: colors[0] },
      { id: 'epi-2', radius: 50, angularVelocity: -2, phase: Math.PI / 2, color: colors[1] },
      { id: 'epi-3', radius: 30, angularVelocity: 3, phase: 0, color: colors[2] },
    ];

    this.renderAllEpicycles();
    this.syncSystemConfig();
  }

  private getEpicycleColors(): string[] {
    return ['#00f5d4', '#f72585', '#4cc9f0', '#ffbe0b', '#90e0ef', '#b5179e', '#06d6a0', '#ff006e'];
  }

  private syncSystemConfig() {
    this.system.setConfig(this.epicycles.map((e) => ({ ...e })));
  }

  private renderAllEpicycles() {
    this.epicycleList.innerHTML = '';
    this.epicycleRowMap.clear();
    this.inputRefs.clear();

    this.epicycles.forEach((epicycle, index) => {
      const row = this.createEpicycleRow(epicycle, index);
      this.epicycleList.appendChild(row);
      this.epicycleRowMap.set(epicycle.id, row);
    });

    this.updateAddButtonState();
  }

  private createEpicycleRow(epicycle: EpicycleConfig, index: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'epicycle-row';
    row.setAttribute('data-id', epicycle.id);

    const header = document.createElement('div');
    header.className = 'epicycle-header';

    const title = document.createElement('div');
    title.className = 'epicycle-title';
    const dot = document.createElement('span');
    dot.className = 'epicycle-dot';
    dot.style.background = epicycle.color;
    title.appendChild(dot);
    title.appendChild(document.createTextNode(`本轮 ${index + 1}`));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.disabled = this.epicycles.length <= 1;
    deleteBtn.addEventListener('click', () => this.removeEpicycle(epicycle.id));

    header.appendChild(title);
    header.appendChild(deleteBtn);
    row.appendChild(header);

    const radiusGroup = this.createControlGroup(
      epicycle.id,
      'radius',
      '半径',
      epicycle.radius,
      10,
      150,
      1
    );
    row.appendChild(radiusGroup);

    const velocityGroup = this.createControlGroup(
      epicycle.id,
      'angularVelocity',
      '角速度',
      epicycle.angularVelocity,
      -3,
      3,
      0.1
    );
    row.appendChild(velocityGroup);

    const phaseGroup = this.createControlGroup(
      epicycle.id,
      'phase',
      '相位',
      epicycle.phase,
      0,
      Math.PI * 2,
      0.01
    );
    row.appendChild(phaseGroup);

    return row;
  }

  private createControlGroup(
    epicycleId: string,
    field: keyof EpicycleConfig,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'control-label';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'control-value';
    valueInput.value = this.formatValue(value, step);
    valueInput.min = min.toString();
    valueInput.max = max.toString();
    valueInput.step = step.toString();

    labelDiv.appendChild(labelSpan);
    labelDiv.appendChild(valueInput);
    group.appendChild(labelDiv);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    group.appendChild(slider);

    const inputKey = `${epicycleId}-${field}`;
    this.inputRefs.set(inputKey, { slider, number: valueInput });

    const handleValueChange = (newValue: number) => {
      const clamped = Math.max(min, Math.min(max, newValue));

      slider.value = clamped.toString();
      valueInput.value = this.formatValue(clamped, step);

      const epicycle = this.epicycles.find((e) => e.id === epicycleId);
      if (epicycle) {
        (epicycle as any)[field] = clamped;
        this.syncSystemConfig();
      }
    };

    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      handleValueChange(val);
    });

    valueInput.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        handleValueChange(val);
      }
    });

    valueInput.addEventListener('blur', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        handleValueChange(val);
      } else {
        const epicycle = this.epicycles.find((e) => e.id === epicycleId);
        if (epicycle) {
          valueInput.value = this.formatValue((epicycle as any)[field], step);
        }
      }
    });

    return group;
  }

  private formatValue(value: number, step: number): string {
    if (step >= 1) {
      return Math.round(value).toString();
    }
    const decimals = step < 0.1 ? 2 : 2;
    return value.toFixed(decimals);
  }

  private addEpicycle() {
    if (this.epicycles.length >= 8) return;

    const colors = this.getEpicycleColors();
    const newEpicycle: EpicycleConfig = {
      id: `epi-${Date.now()}`,
      radius: 40,
      angularVelocity: 1,
      phase: 0,
      color: colors[this.epicycles.length % colors.length],
    };

    this.epicycles.push(newEpicycle);

    const row = this.createEpicycleRow(newEpicycle, this.epicycles.length - 1);
    this.epicycleList.appendChild(row);
    this.epicycleRowMap.set(newEpicycle.id, row);

    this.updateAddButtonState();
    this.updateDeleteButtons();
    this.syncSystemConfig();
  }

  private removeEpicycle(id: string) {
    if (this.epicycles.length <= 1) return;
    if (this.isRemoving.has(id)) return;

    this.isRemoving.add(id);

    const row = this.epicycleRowMap.get(id);
    if (row) {
      row.classList.add('fade-out');

      setTimeout(() => {
        this.epicycles = this.epicycles.filter((e) => e.id !== id);
        this.isRemoving.delete(id);
        this.epicycleRowMap.delete(id);

        const keysToDelete: string[] = [];
        this.inputRefs.forEach((_, key) => {
          if (key.startsWith(`${id}-`)) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach((k) => this.inputRefs.delete(k));

        this.renderAllEpicycles();
        this.syncSystemConfig();
      }, 300);
    }
  }

  private updateAddButtonState() {
    const count = this.epicycles.length;
    this.addButton.disabled = count >= 8;
    this.addButton.textContent = count >= 8 ? '已达上限 (8个)' : '+ 添加本轮';
  }

  private updateDeleteButtons() {
    const rows = this.epicycleList.querySelectorAll('.epicycle-row');
    rows.forEach((row) => {
      const deleteBtn = row.querySelector('.delete-btn') as HTMLButtonElement;
      if (deleteBtn) {
        deleteBtn.disabled = this.epicycles.length <= 1;
      }
    });
  }

  private togglePlay() {
    this.system.togglePlay();
    const isPlaying = this.system.getIsPlaying();
    this.playPauseBtn.innerHTML = isPlaying ? '⏸ 暂停' : '▶ 播放';
    this.playPauseBtn.classList.toggle('paused', !isPlaying);
  }

  private reset() {
    this.system.resetView();
    this.setSpeed(1);
    this.playPauseBtn.innerHTML = '⏸ 暂停';
    this.playPauseBtn.classList.remove('paused');
  }

  private setSpeed(speed: PlaybackSpeed) {
    this.system.setPlaybackSpeed(speed);
    this.speedUpBtn.classList.toggle('active', speed === 2);
    this.speedDownBtn.classList.toggle('active', speed === 0.5);
  }

  getEpicycles(): EpicycleConfig[] {
    return this.epicycles.map((e) => ({ ...e }));
  }
}
