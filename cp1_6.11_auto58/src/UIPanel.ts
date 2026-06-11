import type { StationData, LineData } from './types';
import { PRESET_COLORS } from './types';

export interface UIPanelCallbacks {
  onRemoveStation: (id: string) => void;
  onUpdateStationSize: (id: string, size: number) => void;
  onUpdateStationColor: (id: string, color: string) => void;
  onUpdateLineName: (id: string, name: string) => void;
  onUpdateLineColor: (id: string, color: string) => void;
  onUpdateLineOpacity: (id: string, opacity: number) => void;
  onRemoveLine: (id: string) => void;
  onSpeedChange: (speed: number) => void;
  onExport: () => void;
  onImport: () => void;
  onToggleSimulation: () => void;
  onResetView: () => void;
  onClearAll: () => void;
}

export class UIPanel {
  private container: HTMLElement;
  private callbacks: UIPanelCallbacks;
  private panelEl: HTMLElement | null = null;
  private hamburgerBtn: HTMLElement | null = null;
  private panelOpen: boolean = true;
  private stationsContainer: HTMLElement | null = null;
  private linesContainer: HTMLElement | null = null;
  private speedSlider: HTMLInputElement | null = null;
  private speedValueLabel: HTMLElement | null = null;
  private simToggleBtn: HTMLElement | null = null;
  private notificationEl: HTMLElement | null = null;
  private notificationTimer: number | null = null;

  constructor(container: HTMLElement, callbacks: UIPanelCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.notificationEl = document.getElementById('notification');
    this.buildStyles();
    this.buildPanel();
    this.bindGlobalEvents();
    this.checkResponsive();
  }

  private buildStyles(): void {
    if (document.getElementById('metro-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'metro-ui-styles';
    style.textContent = `
      .metro-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
        height: 100vh;
        background: rgba(20, 20, 45, 0.75);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border-left: 1px solid rgba(100, 200, 255, 0.15);
        padding: 20px 16px;
        overflow-y: auto;
        z-index: 500;
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        scrollbar-width: thin;
        scrollbar-color: rgba(100,200,255,0.3) transparent;
      }
      .metro-panel::-webkit-scrollbar { width: 6px; }
      .metro-panel::-webkit-scrollbar-thumb {
        background: rgba(100,200,255,0.3);
        border-radius: 3px;
      }
      .metro-panel.hidden-mobile { transform: translateX(100%); }
      .metro-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(100, 200, 255, 0.15);
      }
      .metro-panel-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 14px;
        letter-spacing: 2px;
        color: #64c8ff;
        text-shadow: 0 0 8px rgba(100, 200, 255, 0.4);
      }
      .metro-section { margin-bottom: 22px; }
      .metro-section-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 11px;
        letter-spacing: 1.5px;
        color: #8bb8d6;
        margin-bottom: 10px;
        padding-left: 6px;
        border-left: 2px solid #64c8ff;
        text-transform: uppercase;
      }
      .metro-item {
        background: rgba(30, 30, 60, 0.6);
        border: 1px solid rgba(100, 200, 255, 0.12);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 8px;
        transition: all 0.2s ease;
      }
      .metro-item:hover {
        border-color: rgba(100, 200, 255, 0.35);
        background: rgba(40, 40, 80, 0.6);
      }
      .metro-item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
      }
      .metro-item-row:last-child { margin-bottom: 0; }
      .metro-item-name {
        font-size: 13px;
        font-weight: 500;
        color: #e0e0e0;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .metro-item-name-input {
        font-size: 13px;
        color: #e0e0e0;
        background: rgba(20, 20, 40, 0.6);
        border: 1px solid rgba(100, 200, 255, 0.2);
        border-radius: 4px;
        padding: 3px 6px;
        flex: 1;
        outline: none;
        transition: border-color 0.2s;
      }
      .metro-item-name-input:focus { border-color: #64c8ff; }
      .metro-color-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.2);
        box-shadow: 0 0 6px currentColor;
        cursor: pointer;
        transition: transform 0.15s ease;
        flex-shrink: 0;
      }
      .metro-color-dot:hover { transform: scale(1.15); }
      .metro-color-input {
        width: 30px;
        height: 22px;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
      }
      .metro-btn {
        font-family: 'Noto Sans SC', sans-serif;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid rgba(100, 200, 255, 0.3);
        background: rgba(50, 80, 120, 0.3);
        color: #b8d8f0;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .metro-btn:hover {
        background: rgba(80, 120, 180, 0.4);
        border-color: rgba(100, 200, 255, 0.6);
        color: #fff;
        transform: scale(1.03);
      }
      .metro-btn:active {
        background: rgba(60, 90, 140, 0.5);
        transform: scale(0.97);
      }
      .metro-btn.danger {
        border-color: rgba(248, 113, 113, 0.3);
        background: rgba(120, 40, 40, 0.3);
        color: #fca5a5;
      }
      .metro-btn.danger:hover {
        border-color: rgba(248, 113, 113, 0.6);
        background: rgba(160, 50, 50, 0.4);
        color: #fff;
      }
      .metro-btn.success {
        border-color: rgba(74, 222, 128, 0.3);
        background: rgba(40, 100, 60, 0.3);
        color: #86efac;
      }
      .metro-btn.success:hover {
        border-color: rgba(74, 222, 128, 0.6);
        background: rgba(50, 140, 80, 0.4);
        color: #fff;
      }
      .metro-btn-block {
        width: 100%;
        padding: 8px 12px;
        margin-bottom: 6px;
      }
      .metro-slider-container {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .metro-slider {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        height: 4px;
        border-radius: 2px;
        background: linear-gradient(to right, #64c8ff, #9b59b6);
        outline: none;
      }
      .metro-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid #64c8ff;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(100, 200, 255, 0.6);
        transition: transform 0.15s ease;
      }
      .metro-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
      .metro-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid #64c8ff;
        cursor: pointer;
      }
      .metro-slider-value {
        font-family: 'Orbitron', monospace;
        font-size: 12px;
        color: #64c8ff;
        min-width: 36px;
        text-align: right;
      }
      .metro-station-sublabel {
        font-size: 10px;
        color: #7890a8;
      }
      .metro-empty {
        font-size: 12px;
        color: #607088;
        text-align: center;
        padding: 16px;
        font-style: italic;
      }
      .metro-hamburger {
        position: fixed;
        top: 12px;
        right: 12px;
        width: 42px;
        height: 42px;
        border-radius: 8px;
        background: rgba(20, 20, 45, 0.75);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(100, 200, 255, 0.25);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        cursor: pointer;
        z-index: 600;
        transition: all 0.2s ease;
      }
      .metro-hamburger.show { display: flex; }
      .metro-hamburger:hover {
        border-color: rgba(100, 200, 255, 0.5);
        transform: scale(1.05);
      }
      .metro-hamburger span {
        width: 20px;
        height: 2px;
        background: #64c8ff;
        border-radius: 1px;
        transition: all 0.3s ease;
        box-shadow: 0 0 4px rgba(100, 200, 255, 0.5);
      }
      .metro-hamburger.active span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      .metro-hamburger.active span:nth-child(2) { opacity: 0; }
      .metro-hamburger.active span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
      .metro-line-stations {
        font-size: 10px;
        color: #7890a8;
        margin-top: 4px;
        line-height: 1.4;
      }
      @media (max-width: 900px) {
        .metro-panel {
          width: 85%;
          max-width: 340px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private buildPanel(): void {
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'metro-panel';

    this.panelEl.innerHTML = `
      <div class="metro-panel-header">
        <div class="metro-panel-title">METRO PLANNER</div>
      </div>

      <div class="metro-section">
        <div class="metro-section-title">模拟控制</div>
        <button class="metro-btn metro-btn-block success" data-action="toggle-sim">▶ 启动模拟</button>
        <button class="metro-btn metro-btn-block" data-action="reset-view">⟳ 重置视角 (R)</button>
        <div class="metro-item" style="margin-top:10px;">
          <div class="metro-item-row">
            <span class="metro-station-sublabel">列车速度</span>
          </div>
          <div class="metro-slider-container">
            <input type="range" class="metro-slider" id="speed-slider" min="0.5" max="3" step="0.1" value="1">
            <span class="metro-slider-value" id="speed-value">1.0x</span>
          </div>
        </div>
      </div>

      <div class="metro-section">
        <div class="metro-section-title">数据管理</div>
        <button class="metro-btn metro-btn-block" data-action="export">⬇ 导出 JSON</button>
        <button class="metro-btn metro-btn-block" data-action="import">⬆ 导入 JSON</button>
        <button class="metro-btn metro-btn-block danger" data-action="clear-all">🗑 清空全部</button>
      </div>

      <div class="metro-section">
        <div class="metro-section-title">站点列表</div>
        <div id="stations-container">
          <div class="metro-empty">暂无站点<br>点击地面网格放置</div>
        </div>
      </div>

      <div class="metro-section">
        <div class="metro-section-title">线路列表</div>
        <div id="lines-container">
          <div class="metro-empty">暂无线路<br>从一个站点拖拽到另一个</div>
        </div>
      </div>

      <div class="metro-section">
        <div class="metro-section-title">操作提示</div>
        <div class="metro-item">
          <div class="metro-station-sublabel" style="line-height:1.7;">
            • 左键点击地面：放置站点<br>
            • 左键拖拽站点：移动位置<br>
            • 右键点击站点：删除站点<br>
            • 站点拖拽到站点：连接轨道<br>
            • 左键空白：旋转视角<br>
            • 右键空白：平移视角<br>
            • 滚轮：缩放<br>
            • R键：重置视角<br>
            • 拖拽JSON到窗口：导入
          </div>
        </div>
      </div>
    `;

    this.hamburgerBtn = document.createElement('div');
    this.hamburgerBtn.className = 'metro-hamburger';
    this.hamburgerBtn.innerHTML = '<span></span><span></span><span></span>';

    this.container.appendChild(this.panelEl);
    this.container.appendChild(this.hamburgerBtn);

    this.stationsContainer = this.panelEl.querySelector('#stations-container');
    this.linesContainer = this.panelEl.querySelector('#lines-container');
    this.speedSlider = this.panelEl.querySelector('#speed-slider') as HTMLInputElement;
    this.speedValueLabel = this.panelEl.querySelector('#speed-value');
    this.simToggleBtn = this.panelEl.querySelector('[data-action="toggle-sim"]');

    this.bindPanelEvents();
  }

  private bindPanelEvents(): void {
    this.panelEl?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');
      switch (action) {
        case 'toggle-sim':
          this.callbacks.onToggleSimulation();
          break;
        case 'reset-view':
          this.callbacks.onResetView();
          break;
        case 'export':
          this.callbacks.onExport();
          break;
        case 'import':
          this.callbacks.onImport();
          break;
        case 'clear-all':
          this.callbacks.onClearAll();
          break;
      }
    });

    this.speedSlider?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.setCurrentSpeed(val);
      this.callbacks.onSpeedChange(val);
    });

    this.hamburgerBtn?.addEventListener('click', () => {
      this.togglePanel();
    });
  }

  private bindGlobalEvents(): void {
    window.addEventListener('resize', () => this.checkResponsive());
  }

  private checkResponsive(): void {
    const isMobile = window.innerWidth < 900;
    if (this.hamburgerBtn) {
      this.hamburgerBtn.classList.toggle('show', isMobile);
    }
    if (isMobile) {
      if (this.panelOpen) {
        this.panelEl?.classList.remove('hidden-mobile');
      } else {
        this.panelEl?.classList.add('hidden-mobile');
      }
    } else {
      this.panelEl?.classList.remove('hidden-mobile');
      this.hamburgerBtn?.classList.remove('active');
    }
  }

  private togglePanel(): void {
    this.panelOpen = !this.panelOpen;
    this.panelEl?.classList.toggle('hidden-mobile', !this.panelOpen);
    this.hamburgerBtn?.classList.toggle('active', this.panelOpen);
  }

  renderStationList(stations: StationData[]): void {
    if (!this.stationsContainer) return;
    if (stations.length === 0) {
      this.stationsContainer.innerHTML = `<div class="metro-empty">暂无站点<br>点击地面网格放置</div>`;
      return;
    }
    this.stationsContainer.innerHTML = stations.map(s => `
      <div class="metro-item" data-station-id="${s.id}">
        <div class="metro-item-row">
          <span class="metro-item-name">${this.escapeHtml(s.name)}</span>
          <input type="color" class="metro-color-input" data-station-color="${s.id}" value="${s.color}" title="站点颜色">
        </div>
        <div class="metro-item-row">
          <span class="metro-station-sublabel">尺寸</span>
          <input type="range" class="metro-slider" data-station-size="${s.id}" min="0.4" max="2" step="0.1" value="${s.size}" style="max-width:140px;">
          <span class="metro-slider-value">${s.size.toFixed(1)}</span>
        </div>
        <div class="metro-item-row">
          <span class="metro-station-sublabel">(${s.position.x.toFixed(1)}, ${s.position.z.toFixed(1)})</span>
          <button class="metro-btn danger" data-remove-station="${s.id}" style="padding:3px 8px;font-size:11px;">删除</button>
        </div>
      </div>
    `).join('');

    this.stationsContainer.querySelectorAll('[data-station-size]').forEach(el => {
      el.addEventListener('input', (e) => {
        const id = (el as HTMLElement).getAttribute('data-station-size')!;
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.callbacks.onUpdateStationSize(id, val);
        const lbl = el.parentElement?.querySelector('.metro-slider-value');
        if (lbl) lbl.textContent = val.toFixed(1);
      });
    });

    this.stationsContainer.querySelectorAll('[data-station-color]').forEach(el => {
      el.addEventListener('input', (e) => {
        const id = (el as HTMLElement).getAttribute('data-station-color')!;
        const val = (e.target as HTMLInputElement).value;
        this.callbacks.onUpdateStationColor(id, val);
      });
    });

    this.stationsContainer.querySelectorAll('[data-remove-station]').forEach(el => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).getAttribute('data-remove-station')!;
        this.callbacks.onRemoveStation(id);
      });
    });
  }

  renderLineList(lines: LineData[], stationNames: Map<string, string>): void {
    if (!this.linesContainer) return;
    if (lines.length === 0) {
      this.linesContainer.innerHTML = `<div class="metro-empty">暂无线路<br>从一个站点拖拽到另一个</div>`;
      return;
    }
    this.linesContainer.innerHTML = lines.map(l => {
      const stationList = l.stationIds
        .map(id => stationNames.get(id) ?? id.slice(0, 6))
        .join(' → ');
      return `
      <div class="metro-item" data-line-id="${l.id}">
        <div class="metro-item-row">
          <input type="text" class="metro-item-name-input" value="${this.escapeHtml(l.name)}" data-line-name="${l.id}">
          <div class="metro-color-dot" style="background:${l.color};color:${l.color};" data-line-color-dot="${l.id}"></div>
          <input type="color" class="metro-color-input" data-line-color="${l.id}" value="${l.color}" title="线路颜色">
        </div>
        <div class="metro-item-row">
          <span class="metro-station-sublabel">透明度</span>
          <input type="range" class="metro-slider" data-line-opacity="${l.id}" min="0.1" max="1" step="0.05" value="${l.opacity}" style="max-width:140px;">
          <span class="metro-slider-value">${l.opacity.toFixed(2)}</span>
        </div>
        <div class="metro-line-stations">${this.escapeHtml(stationList)}</div>
        <div class="metro-item-row" style="margin-top:6px;">
          <span></span>
          <button class="metro-btn danger" data-remove-line="${l.id}" style="padding:3px 8px;font-size:11px;">删除线路</button>
        </div>
      </div>
    `}).join('');

    this.linesContainer.querySelectorAll('[data-line-name]').forEach(el => {
      el.addEventListener('change', (e) => {
        const id = (el as HTMLElement).getAttribute('data-line-name')!;
        const val = (e.target as HTMLInputElement).value;
        this.callbacks.onUpdateLineName(id, val);
      });
    });

    this.linesContainer.querySelectorAll('[data-line-color]').forEach(el => {
      el.addEventListener('input', (e) => {
        const id = (el as HTMLElement).getAttribute('data-line-color')!;
        const val = (e.target as HTMLInputElement).value;
        this.callbacks.onUpdateLineColor(id, val);
        const dot = this.linesContainer?.querySelector(`[data-line-color-dot="${id}"]`) as HTMLElement;
        if (dot) {
          dot.style.background = val;
          dot.style.color = val;
        }
      });
    });

    this.linesContainer.querySelectorAll('[data-line-opacity]').forEach(el => {
      el.addEventListener('input', (e) => {
        const id = (el as HTMLElement).getAttribute('data-line-opacity')!;
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.callbacks.onUpdateLineOpacity(id, val);
        const lbl = el.parentElement?.querySelector('.metro-slider-value');
        if (lbl) lbl.textContent = val.toFixed(2);
      });
    });

    this.linesContainer.querySelectorAll('[data-remove-line]').forEach(el => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).getAttribute('data-remove-line')!;
        this.callbacks.onRemoveLine(id);
      });
    });
  }

  setCurrentSpeed(speed: number): void {
    if (this.speedSlider) this.speedSlider.value = String(speed);
    if (this.speedValueLabel) this.speedValueLabel.textContent = `${speed.toFixed(1)}x`;
  }

  setSimulationRunning(running: boolean): void {
    if (!this.simToggleBtn) return;
    if (running) {
      this.simToggleBtn.textContent = '⏸ 暂停模拟';
      this.simToggleBtn.classList.remove('success');
    } else {
      this.simToggleBtn.textContent = '▶ 启动模拟';
      this.simToggleBtn.classList.add('success');
    }
  }

  showNotification(message: string): void {
    if (!this.notificationEl) return;
    this.notificationEl.textContent = message;
    this.notificationEl.classList.add('show');
    if (this.notificationTimer) window.clearTimeout(this.notificationTimer);
    this.notificationTimer = window.setTimeout(() => {
      this.notificationEl?.classList.remove('show');
    }, 2500);
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  dispose(): void {
    this.panelEl?.remove();
    this.hamburgerBtn?.remove();
    const style = document.getElementById('metro-ui-styles');
    if (style) style.remove();
  }
}
