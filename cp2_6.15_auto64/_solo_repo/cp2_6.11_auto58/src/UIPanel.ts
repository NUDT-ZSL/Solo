import { StationManager, Station } from './StationManager';
import { LineManager, MetroLine, PRESET_COLORS } from './LineManager';
import { TrainSimulator } from './TrainSimulator';

export interface UIPanelCallbacks {
  onExport: () => void;
  onImport: () => void;
  onResetView: () => void;
  onClearAll: () => void;
}

export class UIPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private menuBtn: HTMLElement;
  private stationManager: StationManager;
  private lineManager: LineManager;
  private trainSimulator: TrainSimulator;
  private callbacks: UIPanelCallbacks;
  private defaultStationColor: string = '#ffffff';
  private defaultStationSize: number = 1;
  private defaultStationDensity: number = 1;

  constructor(
    container: HTMLElement,
    stationManager: StationManager,
    lineManager: LineManager,
    trainSimulator: TrainSimulator,
    callbacks: UIPanelCallbacks
  ) {
    this.container = container;
    this.stationManager = stationManager;
    this.lineManager = lineManager;
    this.trainSimulator = trainSimulator;
    this.callbacks = callbacks;
    this.injectStyles();
    this.panel = this.createPanel();
    this.menuBtn = this.createMenuButton();
    this.container.appendChild(this.panel);
    this.container.appendChild(this.menuBtn);
    this.bindEvents();
    this.setupResponsive();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .glass-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
        height: 100vh;
        background: rgba(20, 20, 40, 0.75);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-left: 1px solid rgba(100, 200, 255, 0.15);
        z-index: 100;
        display: flex;
        flex-direction: column;
        transition: transform 0.3s ease, opacity 0.3s ease;
        overflow: hidden;
      }

      .glass-panel.collapsed {
        transform: translateX(100%);
        opacity: 0;
      }

      .panel-header {
        padding: 20px;
        border-bottom: 1px solid rgba(100, 200, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .panel-title {
        font-size: 18px;
        font-weight: 600;
        color: #64c8ff;
        letter-spacing: 2px;
        text-shadow: 0 0 10px rgba(100, 200, 255, 0.5);
      }

      .panel-close {
        width: 28px;
        height: 28px;
        border: none;
        background: rgba(100, 200, 255, 0.1);
        color: #64c8ff;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: all 0.2s ease;
      }

      .panel-close:hover {
        background: rgba(100, 200, 255, 0.2);
        transform: scale(1.1);
      }

      .panel-close:active {
        background: rgba(100, 200, 255, 0.3);
        transform: scale(0.95);
      }

      .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .panel-content::-webkit-scrollbar {
        width: 6px;
      }

      .panel-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }

      .panel-content::-webkit-scrollbar-thumb {
        background: rgba(100, 200, 255, 0.3);
        border-radius: 3px;
      }

      .section {
        margin-bottom: 24px;
      }

      .section-title {
        font-size: 12px;
        font-weight: 600;
        color: #888;
        letter-spacing: 2px;
        margin-bottom: 12px;
        text-transform: uppercase;
      }

      .btn-row {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .ui-btn {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid rgba(100, 200, 255, 0.25);
        background: rgba(100, 200, 255, 0.08);
        color: #64c8ff;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        letter-spacing: 0.5px;
      }

      .ui-btn:hover {
        background: rgba(100, 200, 255, 0.15);
        border-color: rgba(100, 200, 255, 0.4);
        transform: scale(1.03);
      }

      .ui-btn:active {
        background: rgba(100, 200, 255, 0.25);
        transform: scale(0.97);
      }

      .ui-btn.danger {
        border-color: rgba(255, 100, 100, 0.25);
        background: rgba(255, 100, 100, 0.08);
        color: #ff6464;
      }

      .ui-btn.danger:hover {
        background: rgba(255, 100, 100, 0.15);
        border-color: rgba(255, 100, 100, 0.4);
      }

      .ui-btn.danger:active {
        background: rgba(255, 100, 100, 0.25);
      }

      .control-row {
        margin-bottom: 14px;
      }

      .control-label {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #aaa;
        margin-bottom: 6px;
      }

      .control-value {
        color: #64c8ff;
        font-weight: 600;
      }

      .slider-container {
        position: relative;
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        overflow: hidden;
      }

      .slider-track {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: linear-gradient(90deg, #64c8ff, #a29bfe);
        border-radius: 3px;
        pointer-events: none;
      }

      .ui-slider {
        width: 100%;
        height: 100%;
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        cursor: pointer;
        position: relative;
        z-index: 2;
        margin: 0;
      }

      .ui-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #64c8ff;
        border: 2px solid #fff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(100, 200, 255, 0.6);
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      }

      .ui-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 15px rgba(100, 200, 255, 0.8);
      }

      .ui-slider::-webkit-slider-thumb:active {
        transform: scale(0.95);
        background: #4db8ff;
        box-shadow: 0 0 20px rgba(100, 200, 255, 1);
      }

      .ui-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #64c8ff;
        border: 2px solid #fff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(100, 200, 255, 0.6);
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      }

      .ui-slider::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 15px rgba(100, 200, 255, 0.8);
      }

      .ui-slider::-moz-range-thumb:active {
        transform: scale(0.95);
        background: #4db8ff;
        box-shadow: 0 0 20px rgba(100, 200, 255, 1);
      }

      .color-picker-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
      }

      .ui-color {
        width: 36px;
        height: 36px;
        border: 2px solid rgba(100, 200, 255, 0.3);
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        padding: 2px;
        transition: all 0.2s ease;
      }

      .ui-color:hover {
        transform: scale(1.1);
        border-color: rgba(100, 200, 255, 0.6);
      }

      .ui-color:active {
        transform: scale(0.95);
        border-color: rgba(100, 200, 255, 0.9);
        background: rgba(100, 200, 255, 0.1);
      }

      .ui-color::-webkit-color-swatch-wrapper {
        padding: 0;
      }

      .ui-color::-webkit-color-swatch {
        border-radius: 4px;
        border: none;
      }

      .preset-colors {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .preset-color {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        box-shadow: 0 0 8px currentColor;
      }

      .preset-color:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px currentColor;
      }

      .preset-color:active {
        transform: scale(0.9);
        box-shadow: 0 0 18px currentColor;
      }

      .preset-color.active {
        border-color: #fff;
      }

      .list-item {
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(100, 200, 255, 0.08);
        border-radius: 8px;
        margin-bottom: 8px;
        transition: all 0.2s ease;
      }

      .list-item:hover {
        background: rgba(100, 200, 255, 0.05);
        border-color: rgba(100, 200, 255, 0.15);
      }

      .list-item:active {
        background: rgba(100, 200, 255, 0.1);
        border-color: rgba(100, 200, 255, 0.25);
      }

      .list-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .list-item-name {
        font-size: 13px;
        font-weight: 500;
        color: #e0e0e0;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: text;
        padding: 2px 4px;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .list-item-name:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .list-item-name input {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(100, 200, 255, 0.3);
        color: #e0e0e0;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
      }

      .list-item-name input:focus {
        border-color: rgba(100, 200, 255, 0.6);
      }

      .color-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 6px currentColor;
      }

      .delete-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: rgba(255, 100, 100, 0.1);
        color: #ff6464;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .delete-btn:hover {
        background: rgba(255, 100, 100, 0.2);
        transform: scale(1.1);
      }

      .delete-btn:active {
        transform: scale(0.9);
        background: rgba(255, 100, 100, 0.35);
      }

      .station-info {
        font-size: 11px;
        color: #888;
      }

      .stations-sublist {
        margin-top: 8px;
        padding-left: 8px;
        border-left: 2px solid rgba(100, 200, 255, 0.2);
      }

      .station-sublist-item {
        font-size: 11px;
        color: #aaa;
        padding: 3px 0;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .station-sublist-index {
        color: #64c8ff;
        font-weight: 600;
        min-width: 18px;
      }

      .hamburger-btn {
        position: fixed;
        top: 16px;
        right: 16px;
        width: 44px;
        height: 44px;
        background: rgba(20, 20, 40, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(100, 200, 255, 0.2);
        border-radius: 10px;
        cursor: pointer;
        display: none;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 5px;
        z-index: 99;
        transition: all 0.2s ease;
      }

      .hamburger-btn:hover {
        background: rgba(20, 20, 40, 0.95);
        transform: scale(1.05);
      }

      .hamburger-btn:active {
        transform: scale(0.95);
      }

      .hamburger-btn span {
        width: 22px;
        height: 2px;
        background: #64c8ff;
        border-radius: 1px;
        transition: all 0.2s ease;
      }

      .instructions {
        padding: 12px;
        background: rgba(100, 200, 255, 0.05);
        border: 1px solid rgba(100, 200, 255, 0.1);
        border-radius: 8px;
        font-size: 11px;
        color: #999;
        line-height: 1.6;
      }

      .instructions strong {
        color: #64c8ff;
      }

      .empty-state {
        text-align: center;
        padding: 20px;
        color: #666;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'glass-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">⚡ 地铁规划控制台</div>
        <button class="panel-close" id="panel-close">×</button>
      </div>
      <div class="panel-content">
        <div class="section">
          <div class="section-title">操作</div>
          <div class="btn-row">
            <button class="ui-btn" id="btn-export">导出 JSON</button>
            <button class="ui-btn" id="btn-import">导入 JSON</button>
          </div>
          <div class="btn-row">
            <button class="ui-btn" id="btn-reset-view">重置视角</button>
            <button class="ui-btn danger" id="btn-clear">清空场景</button>
          </div>
        </div>

        <div class="section">
          <div class="section-title">站点设置</div>
          <div class="color-picker-row">
            <input type="color" class="ui-color" id="station-color-picker" value="${this.defaultStationColor}" />
            <div class="preset-colors" id="station-preset-colors">
              ${PRESET_COLORS.map(c => `<div class="preset-color" style="background:${c};color:${c}" data-color="${c}"></div>`).join('')}
              <div class="preset-color active" style="background:${this.defaultStationColor};color:${this.defaultStationColor}" data-color="${this.defaultStationColor}"></div>
            </div>
          </div>
          <div class="control-row">
            <div class="control-label">
              <span>站点大小</span>
              <span class="control-value" id="station-size-value">${this.defaultStationSize.toFixed(1)}</span>
            </div>
            <div class="slider-container">
              <div class="slider-track" id="station-size-track" style="width:${((this.defaultStationSize - 0.5) / 2) * 100}%"></div>
              <input type="range" class="ui-slider" id="station-size-slider" min="0.5" max="2.5" step="0.1" value="${this.defaultStationSize}" />
            </div>
          </div>
          <div class="control-row">
            <div class="control-label">
              <span>站点密度</span>
              <span class="control-value" id="station-density-value">${this.defaultStationDensity.toFixed(1)}</span>
            </div>
            <div class="slider-container">
              <div class="slider-track" id="station-density-track" style="width:${((this.defaultStationDensity - 0.5) / 1.5) * 100}%"></div>
              <input type="range" class="ui-slider" id="station-density-slider" min="0.5" max="2.0" step="0.1" value="${this.defaultStationDensity}" />
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">模拟设置</div>
          <div class="control-row">
            <div class="control-label">
              <span>列车速度</span>
              <span class="control-value" id="speed-value">1.0x</span>
            </div>
            <div class="slider-container">
              <div class="slider-track" id="speed-track" style="width:20%"></div>
              <input type="range" class="ui-slider" id="speed-slider" min="0.5" max="3" step="0.1" value="1" />
            </div>
          </div>
          <div class="control-row">
            <div class="control-label">
              <span>轨道透明度</span>
              <span class="control-value" id="opacity-value">0.70</span>
            </div>
            <div class="slider-container">
              <div class="slider-track" id="opacity-track" style="width:70%"></div>
              <input type="range" class="ui-slider" id="opacity-slider" min="0.1" max="1" step="0.05" value="0.7" />
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">站点列表 (${this.stationManager.getAllStations().length})</div>
          <div id="stations-list"></div>
        </div>

        <div class="section">
          <div class="section-title">线路列表 (${this.lineManager.getAllLines().length})</div>
          <div id="lines-list"></div>
        </div>

        <div class="section">
          <div class="instructions">
            <strong>操作说明：</strong><br>
            • <strong>左键点击网格</strong>：放置站点<br>
            • <strong>左键拖拽站点</strong>：移动站点<br>
            • <strong>右键点击站点</strong>：删除站点<br>
            • <strong>从站点拖拽到站点</strong>：创建线路<br>
            • <strong>左键旋转</strong> / <strong>右键平移</strong> / <strong>滚轮缩放</strong><br>
            • <strong>R 键</strong>：重置视角<br>
            • <strong>拖拽 JSON 文件</strong>：导入场景
          </div>
        </div>
      </div>
    `;
    return panel;
  }

  private createMenuButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'hamburger-btn';
    btn.id = 'hamburger-btn';
    btn.innerHTML = '<span></span><span></span><span></span>';
    return btn;
  }

  private bindEvents(): void {
    this.panel.querySelector('#panel-close')!.addEventListener('click', () => {
      this.togglePanel(false);
    });

    this.menuBtn.addEventListener('click', () => {
      this.togglePanel(true);
    });

    this.panel.querySelector('#btn-export')!.addEventListener('click', () => {
      this.callbacks.onExport();
    });
    this.panel.querySelector('#btn-import')!.addEventListener('click', () => {
      this.callbacks.onImport();
    });
    this.panel.querySelector('#btn-reset-view')!.addEventListener('click', () => {
      this.callbacks.onResetView();
    });
    this.panel.querySelector('#btn-clear')!.addEventListener('click', () => {
      if (confirm('确定要清空所有站点和线路吗？')) {
        this.callbacks.onClearAll();
      }
    });

    const stationColorPicker = this.panel.querySelector('#station-color-picker') as HTMLInputElement;
    stationColorPicker.addEventListener('input', (e) => {
      this.defaultStationColor = (e.target as HTMLInputElement).value;
      this.updateStationColorPresets();
    });

    const presetContainer = this.panel.querySelector('#station-preset-colors')!;
    presetContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('preset-color')) {
        this.defaultStationColor = target.dataset.color!;
        stationColorPicker.value = this.defaultStationColor;
        this.updateStationColorPresets();
      }
    });

    const stationSizeSlider = this.panel.querySelector('#station-size-slider') as HTMLInputElement;
    const stationSizeValue = this.panel.querySelector('#station-size-value')!;
    const stationSizeTrack = this.panel.querySelector('#station-size-track') as HTMLElement;
    stationSizeSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.defaultStationSize = val;
      stationSizeValue.textContent = val.toFixed(1);
      const pct = ((val - 0.5) / 2) * 100;
      stationSizeTrack.style.width = pct + '%';
    });

    const stationDensitySlider = this.panel.querySelector('#station-density-slider') as HTMLInputElement;
    const stationDensityValue = this.panel.querySelector('#station-density-value')!;
    const stationDensityTrack = this.panel.querySelector('#station-density-track') as HTMLElement;
    stationDensitySlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.defaultStationDensity = val;
      stationDensityValue.textContent = val.toFixed(1);
      const pct = ((val - 0.5) / 1.5) * 100;
      stationDensityTrack.style.width = pct + '%';
      this.stationManager.updateAllStationsDensity(val);
    });

    const speedSlider = this.panel.querySelector('#speed-slider') as HTMLInputElement;
    const speedValue = this.panel.querySelector('#speed-value')!;
    const speedTrack = this.panel.querySelector('#speed-track') as HTMLElement;
    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.trainSimulator.setGlobalSpeed(val);
      speedValue.textContent = val.toFixed(1) + 'x';
      const pct = ((val - 0.5) / 2.5) * 100;
      speedTrack.style.width = pct + '%';
    });

    const opacitySlider = this.panel.querySelector('#opacity-slider') as HTMLInputElement;
    const opacityValue = this.panel.querySelector('#opacity-value')!;
    const opacityTrack = this.panel.querySelector('#opacity-track') as HTMLElement;
    opacitySlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      opacityValue.textContent = val.toFixed(2);
      const pct = ((val - 0.1) / 0.9) * 100;
      opacityTrack.style.width = pct + '%';
      for (const line of this.lineManager.getAllLines()) {
        this.lineManager.updateLineOpacity(line.id, val);
      }
    });
  }

  private updateStationColorPresets(): void {
    const presets = this.panel.querySelectorAll('.preset-color');
    presets.forEach(p => {
      if ((p as HTMLElement).dataset.color === this.defaultStationColor) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  public getDefaultStationColor(): string {
    return this.defaultStationColor;
  }

  public getDefaultStationSize(): number {
    return this.defaultStationSize;
  }

  public getDefaultStationDensity(): number {
    return this.defaultStationDensity;
  }

  public togglePanel(show: boolean): void {
    if (show) {
      this.panel.classList.remove('collapsed');
    } else {
      this.panel.classList.add('collapsed');
    }
  }

  public setupResponsive(): void {
    const check = () => {
      if (window.innerWidth < 900) {
        this.menuBtn.style.display = 'flex';
        this.panel.classList.add('collapsed');
      } else {
        this.menuBtn.style.display = 'none';
        this.panel.classList.remove('collapsed');
      }
    };
    check();
    window.addEventListener('resize', check);
  }

  public refreshStationsList(): void {
    const list = this.panel.querySelector('#stations-list')!;
    const stations = this.stationManager.getAllStations();
    const title = this.panel.querySelector('.section-title');

    const stationSectionTitle = Array.from(this.panel.querySelectorAll('.section-title')).find(
      el => el.textContent!.startsWith('站点列表')
    );
    if (stationSectionTitle) {
      stationSectionTitle.textContent = `站点列表 (${stations.length})`;
    }

    if (stations.length === 0) {
      list.innerHTML = '<div class="empty-state">点击地面网格放置站点</div>';
      return;
    }

    list.innerHTML = stations.map(station => `
      <div class="list-item" data-id="${station.id}">
        <div class="list-item-header">
          <div class="list-item-name" data-action="rename">
            <span class="color-dot" style="background:${station.color}"></span>
            <span class="name-text">${station.name}</span>
          </div>
          <button class="delete-btn" data-action="delete" title="删除站点">×</button>
        </div>
        <div class="station-info">
          位置: (${station.position.x.toFixed(1)}, ${station.position.z.toFixed(1)}) | 大小: ${station.size.toFixed(1)} | 密度: ${station.density.toFixed(1)}
        </div>
      </div>
    `).join('');

    list.querySelectorAll<HTMLElement>('.list-item').forEach(item => {
      const id = item.dataset.id!;
      const deleteBtn = item.querySelector('[data-action="delete"]')!;
      const renameEl = item.querySelector('[data-action="rename"]')!;

      deleteBtn.addEventListener('click', () => {
        this.removeStationAndReferences(id);
      });

      renameEl.addEventListener('dblclick', () => {
        const nameText = renameEl.querySelector('.name-text')!;
        const currentName = nameText.textContent!;
        const input = document.createElement('input');
        input.value = currentName;
        input.maxLength = 20;
        nameText.textContent = '';
        nameText.appendChild(input);
        input.focus();
        input.select();

        const finish = () => {
          const newName = input.value.trim() || currentName;
          this.stationManager.updateStationName(id, newName);
          this.refreshStationsList();
          this.refreshLinesList();
        };

        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') input.blur();
          if (e.key === 'Escape') {
            input.value = currentName;
            input.blur();
          }
        });
      });
    });
  }

  private removeStationAndReferences(stationId: string): void {
    for (const line of this.lineManager.getAllLines()) {
      this.lineManager.removeStationFromLine(line.id, stationId);
    }
    this.stationManager.removeStation(stationId);
    this.refreshStationsList();
    this.refreshLinesList();
  }

  public refreshLinesList(): void {
    const list = this.panel.querySelector('#lines-list')!;
    const lines = this.lineManager.getAllLines();

    const lineSectionTitle = Array.from(this.panel.querySelectorAll('.section-title')).find(
      el => el.textContent!.startsWith('线路列表')
    );
    if (lineSectionTitle) {
      lineSectionTitle.textContent = `线路列表 (${lines.length})`;
    }

    if (lines.length === 0) {
      list.innerHTML = '<div class="empty-state">从站点拖拽到站点创建线路</div>';
      return;
    }

    list.innerHTML = lines.map(line => {
      const stationsHtml = line.stationIds.map((sid, i) => {
        const st = this.stationManager.getStation(sid);
        return `<div class="station-sublist-item">
          <span class="station-sublist-index">${i + 1}.</span>
          <span>${st ? st.name : '未知站点'}</span>
        </div>`;
      }).join('');

      return `
        <div class="list-item" data-id="${line.id}">
          <div class="list-item-header">
            <div class="list-item-name" data-action="rename">
              <span class="color-dot" style="background:${line.color}"></span>
              <span class="name-text">${line.name}</span>
            </div>
            <div style="display:flex;gap:4px;">
              <input type="color" class="ui-color" data-action="color" value="${line.color}" style="width:26px;height:26px;padding:0;" />
              <button class="delete-btn" data-action="delete" title="删除线路">×</button>
            </div>
          </div>
          <div class="stations-sublist">${stationsHtml || '<div style="font-size:11px;color:#666;">暂无站点</div>'}</div>
        </div>
      `;
    }).join('');

    list.querySelectorAll<HTMLElement>('.list-item').forEach(item => {
      const id = item.dataset.id!;
      const deleteBtn = item.querySelector('[data-action="delete"]')!;
      const renameEl = item.querySelector('[data-action="rename"]')!;
      const colorInput = item.querySelector('[data-action="color"]') as HTMLInputElement;

      deleteBtn.addEventListener('click', () => {
        this.lineManager.removeLine(id);
        this.refreshLinesList();
      });

      renameEl.addEventListener('dblclick', () => {
        const nameText = renameEl.querySelector('.name-text')!;
        const currentName = nameText.textContent!;
        const input = document.createElement('input');
        input.value = currentName;
        input.maxLength = 30;
        nameText.textContent = '';
        nameText.appendChild(input);
        input.focus();
        input.select();

        const finish = () => {
          const newName = input.value.trim() || currentName;
          this.lineManager.updateLineName(id, newName);
          this.refreshLinesList();
        };

        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') input.blur();
          if (e.key === 'Escape') {
            input.value = currentName;
            input.blur();
          }
        });
      });

      colorInput.addEventListener('input', (e) => {
        this.lineManager.updateLineColor(id, (e.target as HTMLInputElement).value);
        this.refreshLinesList();
      });
    });
  }

  public refreshAll(): void {
    this.refreshStationsList();
    this.refreshLinesList();
  }
}
