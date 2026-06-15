export type MarkerInfo = {
  utmX: number;
  utmY: number;
  elevation: number;
  distance?: number;
  slope?: number;
};

export type ControlEvents = {
  onResetView: () => void;
  onSmoothnessChange: (value: number) => void;
  onToggleGrid: (show: boolean) => void;
  onExportPath: () => void;
  onMeasureMode: (active: boolean) => void;
};

interface MarkerSystemLike {
  exportPathData(): any;
}

export class OverlayPanel {
  private container: HTMLElement;
  private events: ControlEvents;
  private markerSystem: MarkerSystemLike | null = null;
  private infoPanel!: HTMLDivElement;
  private controlBar!: HTMLDivElement;
  private measureButton!: HTMLButtonElement;
  private gridToggle!: HTMLButtonElement;
  private smoothnessSlider!: HTMLInputElement;
  private isMeasureMode: boolean = false;
  private isGridVisible: boolean = true;
  private smoothnessValue: number = 3;
  private infoContent!: HTMLDivElement;
  private contextMenu!: HTMLDivElement;
  private pathLengthDisplay!: HTMLDivElement;

  private readonly CSS_VARS = {
    bgPanel: 'rgba(30, 30, 30, 0.85)',
    bgControl: 'rgba(20, 20, 20, 0.8)',
    textPrimary: '#fff',
    textAccent: '#00e676',
    buttonBg: '#546e7a',
    buttonHover: '#78909c',
    sliderColor: '#00bcd4',
    toggleOn: '#00e676',
    toggleOff: '#616161',
    borderActive: '#00e676',
  };

  constructor(container: HTMLElement, events: ControlEvents, markerSystem?: MarkerSystemLike) {
    this.container = container;
    this.events = events;
    if (markerSystem) {
      this.markerSystem = markerSystem;
    }
    this.injectStyles();
    this.createInfoPanel();
    this.createControlBar();
    this.createMeasureButton();
    this.createContextMenu();
  }

  setMarkerSystem(markerSystem: MarkerSystemLike): void {
    this.markerSystem = markerSystem;
  }

  handleExportPath(): void {
    if (this.markerSystem) {
      const data = this.markerSystem.exportPathData();
      this.downloadJSON(data, 'path-data.json');
    } else if (this.events.onExportPath) {
      this.events.onExportPath();
    }
  }

  private injectStyles(): void {
    const styleId = 'overlay-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      :root {
        --bg-panel: ${this.CSS_VARS.bgPanel};
        --bg-control: ${this.CSS_VARS.bgControl};
        --text-primary: ${this.CSS_VARS.textPrimary};
        --text-accent: ${this.CSS_VARS.textAccent};
        --button-bg: ${this.CSS_VARS.buttonBg};
        --button-hover: ${this.CSS_VARS.buttonHover};
        --slider-color: ${this.CSS_VARS.sliderColor};
        --toggle-on: ${this.CSS_VARS.toggleOn};
        --toggle-off: ${this.CSS_VARS.toggleOff};
        --border-active: ${this.CSS_VARS.borderActive};
      }

      .info-panel {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 240px;
        background: var(--bg-panel);
        border-radius: 12px;
        padding: 16px;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: var(--text-primary);
        font-size: 12px;
        line-height: 1.8;
        z-index: 100;
        pointer-events: none;
      }

      .info-panel .title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding-bottom: 8px;
      }

      .info-panel .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .info-panel .info-value {
        color: var(--text-accent);
        font-weight: 500;
      }

      .info-panel .hint {
        color: rgba(255,255,255,0.6);
        font-style: italic;
      }

      .info-panel .path-length {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.1);
        font-weight: 600;
      }

      .control-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 48px;
        width: 100%;
        background: var(--bg-control);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 0 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 100;
        box-sizing: border-box;
      }

      .control-btn {
        background: var(--button-bg);
        color: var(--text-primary);
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 13px;
        transition: background-color 0.3s ease;
      }

      .control-btn:hover {
        background: var(--button-hover);
      }

      .slider-container {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-primary);
        font-size: 13px;
      }

      .smoothness-slider {
        width: 100px;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
        outline: none;
      }

      .smoothness-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--slider-color);
        cursor: pointer;
        transition: transform 0.3s ease;
      }

      .smoothness-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .smoothness-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--slider-color);
        cursor: pointer;
        border: none;
        transition: transform 0.3s ease;
      }

      .smoothness-slider::-moz-range-thumb:hover {
        transform: scale(1.2);
      }

      .toggle-container {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-primary);
        font-size: 13px;
      }

      .toggle-btn {
        width: 40px;
        height: 22px;
        border-radius: 11px;
        background: var(--toggle-off);
        border: none;
        cursor: pointer;
        position: relative;
        transition: background-color 0.3s ease;
        padding: 0;
      }

      .toggle-btn::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        top: 2px;
        left: 2px;
        transition: transform 0.3s ease;
      }

      .toggle-btn.active {
        background: var(--toggle-on);
      }

      .toggle-btn.active::after {
        transform: translateX(18px);
      }

      .measure-btn {
        position: absolute;
        top: 16px;
        left: 16px;
        width: 40px;
        height: 40px;
        background: var(--bg-panel);
        border: 2px solid transparent;
        border-radius: 8px;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 8px;
        cursor: pointer;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .measure-btn:hover {
        background: rgba(50, 50, 50, 0.9);
      }

      .measure-btn.active {
        border-color: var(--border-active);
      }

      .measure-btn svg {
        width: 24px;
        height: 24px;
        color: var(--text-primary);
      }

      .context-menu {
        position: absolute;
        background: var(--bg-panel);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 8px;
        padding: 4px 0;
        z-index: 200;
        min-width: 140px;
        display: none;
      }

      .context-menu.show {
        display: block;
      }

      .context-menu-item {
        padding: 8px 16px;
        color: var(--text-primary);
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.3s ease;
      }

      .context-menu-item:hover {
        background: rgba(255,255,255,0.1);
      }

      .context-menu-item.danger {
        color: #ff5252;
      }
    `;
    document.head.appendChild(style);
  }

  createInfoPanel(): void {
    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'info-panel';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = '地形信息';
    this.infoPanel.appendChild(title);

    this.infoContent = document.createElement('div');
    this.infoContent.innerHTML = '<span class="hint">点击地形添加标记点</span>';
    this.infoPanel.appendChild(this.infoContent);

    this.pathLengthDisplay = document.createElement('div');
    this.pathLengthDisplay.className = 'path-length';
    this.pathLengthDisplay.style.display = 'none';
    this.infoPanel.appendChild(this.pathLengthDisplay);

    this.container.appendChild(this.infoPanel);
  }

  createControlBar(): void {
    this.controlBar = document.createElement('div');
    this.controlBar.className = 'control-bar';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'control-btn';
    resetBtn.textContent = '重置视角';
    resetBtn.addEventListener('click', () => this.events.onResetView());
    this.controlBar.appendChild(resetBtn);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    const sliderLabel = document.createElement('span');
    sliderLabel.textContent = '平滑度';
    sliderContainer.appendChild(sliderLabel);

    this.smoothnessSlider = document.createElement('input');
    this.smoothnessSlider.type = 'range';
    this.smoothnessSlider.min = '1';
    this.smoothnessSlider.max = '5';
    this.smoothnessSlider.step = '1';
    this.smoothnessSlider.value = '3';
    this.smoothnessSlider.className = 'smoothness-slider';
    this.smoothnessSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.smoothnessValue = value;
      this.events.onSmoothnessChange(value);
    });
    sliderContainer.appendChild(this.smoothnessSlider);

    const sliderValue = document.createElement('span');
    sliderValue.textContent = '3';
    sliderValue.style.color = this.CSS_VARS.textAccent;
    sliderValue.style.minWidth = '10px';
    this.smoothnessSlider.addEventListener('input', (e) => {
      sliderValue.textContent = (e.target as HTMLInputElement).value;
    });
    sliderContainer.appendChild(sliderValue);

    this.controlBar.appendChild(sliderContainer);

    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'toggle-container';

    const toggleLabel = document.createElement('span');
    toggleLabel.textContent = '网格';
    toggleContainer.appendChild(toggleLabel);

    this.gridToggle = document.createElement('button');
    this.gridToggle.className = 'toggle-btn active';
    this.gridToggle.addEventListener('click', () => {
      this.isGridVisible = !this.isGridVisible;
      this.gridToggle.classList.toggle('active', this.isGridVisible);
      this.events.onToggleGrid(this.isGridVisible);
    });
    toggleContainer.appendChild(this.gridToggle);

    this.controlBar.appendChild(toggleContainer);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'control-btn';
    exportBtn.textContent = '导出路径';
    exportBtn.addEventListener('click', () => this.handleExportPath());
    this.controlBar.appendChild(exportBtn);

    this.container.appendChild(this.controlBar);
  }

  createMeasureButton(): void {
    this.measureButton = document.createElement('button');
    this.measureButton.className = 'measure-btn';
    this.measureButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 15V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/>
        <path d="M6 10v2"/>
        <path d="M10 10v2"/>
        <path d="M14 10v2"/>
        <path d="M18 10v2"/>
      </svg>
    `;
    this.measureButton.addEventListener('click', () => {
      this.isMeasureMode = !this.isMeasureMode;
      this.measureButton.classList.toggle('active', this.isMeasureMode);
      this.events.onMeasureMode(this.isMeasureMode);
    });
    this.container.appendChild(this.measureButton);
  }

  private createContextMenu(): void {
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'context-menu';

    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item';
    deleteItem.textContent = '删除该段';
    this.contextMenu.appendChild(deleteItem);

    const clearAllItem = document.createElement('div');
    clearAllItem.className = 'context-menu-item danger';
    clearAllItem.textContent = '清空所有路径';
    this.contextMenu.appendChild(clearAllItem);

    this.container.appendChild(this.contextMenu);

    document.addEventListener('click', (e) => {
      if (!this.contextMenu.contains(e.target as Node)) {
        this.hideContextMenu();
      }
    });
  }

  updateMarkerInfo(info: MarkerInfo): void {
    const { utmX, utmY, elevation, distance, slope } = info;
    let html = `
      <div class="info-row">
        <span>UTM X:</span>
        <span class="info-value">${utmX.toFixed(2)}</span>
      </div>
      <div class="info-row">
        <span>UTM Y:</span>
        <span class="info-value">${utmY.toFixed(2)}</span>
      </div>
      <div class="info-row">
        <span>海拔:</span>
        <span class="info-value">${elevation.toFixed(2)} m</span>
      </div>
    `;

    if (distance !== undefined) {
      html += `
        <div class="info-row">
          <span>距离:</span>
          <span class="info-value">${distance.toFixed(2)} m</span>
        </div>
      `;
    }

    if (slope !== undefined) {
      html += `
        <div class="info-row">
          <span>坡度:</span>
          <span class="info-value">${slope.toFixed(1)}%</span>
        </div>
      `;
    }

    this.infoContent.innerHTML = html;
  }

  updatePathLength(length: number): void {
    if (length > 0) {
      this.pathLengthDisplay.style.display = 'block';
      this.pathLengthDisplay.innerHTML = `
        <span>路径总长度:</span>
        <span class="info-value">${length.toFixed(2)} m</span>
      `;
    } else {
      this.pathLengthDisplay.style.display = 'none';
    }
  }

  showContextMenu(x: number, y: number, onDelete: () => void, onClearAll: () => void): void {
    const menuWidth = 140;
    const menuHeight = 80;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + menuWidth > viewportWidth) {
      adjustedX = viewportWidth - menuWidth - 10;
    }
    if (y + menuHeight > viewportHeight) {
      adjustedY = viewportHeight - menuHeight - 10;
    }

    this.contextMenu.style.left = `${adjustedX}px`;
    this.contextMenu.style.top = `${adjustedY}px`;
    this.contextMenu.classList.add('show');

    const items = this.contextMenu.querySelectorAll('.context-menu-item');
    (items[0] as HTMLElement).onclick = () => {
      onDelete();
      this.hideContextMenu();
    };
    (items[1] as HTMLElement).onclick = () => {
      onClearAll();
      this.hideContextMenu();
    };
  }

  hideContextMenu(): void {
    this.contextMenu.classList.remove('show');
  }

  setMeasureMode(active: boolean): void {
    this.isMeasureMode = active;
    this.measureButton.classList.toggle('active', active);
  }

  downloadJSON(data: any, filename: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  destroy(): void {
    if (this.infoPanel) {
      this.container.removeChild(this.infoPanel);
    }
    if (this.controlBar) {
      this.container.removeChild(this.controlBar);
    }
    if (this.measureButton) {
      this.container.removeChild(this.measureButton);
    }
    if (this.contextMenu) {
      this.container.removeChild(this.contextMenu);
    }
  }
}
