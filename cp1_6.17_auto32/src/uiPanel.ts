import type { SystemType } from './weatherSystem';
import { SYSTEM_INFO } from './weatherSystem';

export interface UIParams {
  systemType: SystemType;
  tempDiff: number;
  humidity: number;
  windSpeed: number;
  isPaused: boolean;
}

type Listener = (params: UIParams) => void;

const SYSTEM_TYPES: { type: SystemType; label: string }[] = [
  { type: 'coldFront', label: '冷锋' },
  { type: 'warmFront', label: '暖锋' },
  { type: 'stationaryFront', label: '静止锋' },
  { type: 'extratropicalCyclone', label: '温带气旋' },
  { type: 'anticyclone', label: '反气旋' }
];

export class UIPanel {
  private container: HTMLElement;
  private eventTarget: EventTarget;
  private params: UIParams;
  private listeners: Set<Listener> = new Set();
  private infoPanel: HTMLElement | null = null;
  private legendPanel: HTMLElement | null = null;
  private slopeValueEl: HTMLElement | null = null;
  private statusDotEl: HTMLElement | null = null;
  private statusTextEl: HTMLElement | null = null;
  private isMobile: boolean = false;
  private drawerToggleBtn: HTMLElement | null = null;
  private isDrawerOpen: boolean = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.eventTarget = new EventTarget();
    this.params = {
      systemType: 'coldFront',
      tempDiff: 0,
      humidity: 60,
      windSpeed: 5,
      isPaused: false
    };
    this.checkViewport();
    this.createStyles();
    this.createControlPanel();
    this.createInfoPanel();
    this.createLegendPanel();
    this.bindWindowEvents();
  }

  public addEventListener(listener: Listener): void {
    this.listeners.add(listener);
  }

  public removeEventListener(listener: Listener): void {
    this.listeners.delete(listener);
  }

  private emit(): void {
    const event = new CustomEvent('paramsChange', { detail: { ...this.params } });
    this.eventTarget.dispatchEvent(event);
    this.listeners.forEach(fn => fn({ ...this.params }));
  }

  private checkViewport(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private createStyles(): void {
    const styleId = 'weather-ui-styles-v2';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .control-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 280px;
        height: 100vh;
        padding: 24px 20px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-left: 1px solid rgba(255, 255, 255, 0.15);
        z-index: 100;
        overflow-y: auto;
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        color: #fff;
        font-size: 14px;
      }
      .control-panel.collapsed {
        transform: translateX(100%);
      }
      .panel-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 20px;
        background: linear-gradient(90deg, #4FC3F7, #FFFFFF);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: 0.5px;
      }
      .section-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 18px 0 10px;
      }
      .system-select {
        width: 100%;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        outline: none;
        transition: all 0.2s;
      }
      .system-select:hover, .system-select:focus {
        border-color: #4FC3F7;
        background: rgba(79, 195, 247, 0.12);
      }
      .system-select option {
        background: #1A237E;
        color: #fff;
      }
      .slider-group {
        margin-bottom: 14px;
      }
      .slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        flex-wrap: wrap;
        gap: 4px;
      }
      .slider-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.85);
      }
      .slider-value {
        font-size: 13px;
        font-weight: 600;
        color: #4FC3F7;
        font-variant-numeric: tabular-nums;
        min-width: 50px;
        text-align: right;
      }
      .slope-tag {
        font-size: 11px;
        color: #BBDEFB;
        background: rgba(79, 195, 247, 0.15);
        border: 1px solid rgba(79, 195, 247, 0.35);
        padding: 2px 8px;
        border-radius: 10px;
        font-variant-numeric: tabular-nums;
        margin-left: auto;
      }
      .slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.15);
        outline: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .slider:hover {
        background: rgba(255, 255, 255, 0.22);
      }
      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #4FC3F7;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(79, 195, 247, 0.5);
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 16px rgba(79, 195, 247, 0.7);
      }
      .slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #4FC3F7;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px rgba(79, 195, 247, 0.5);
      }
      .slider-container {
        position: relative;
      }
      .btn-row {
        display: flex;
        gap: 10px;
        margin-top: 22px;
      }
      .btn {
        flex: 1;
        padding: 12px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
        font-family: inherit;
      }
      .btn-primary {
        background: linear-gradient(135deg, #4FC3F7, #29B6F6);
        color: #0B0E2D;
      }
      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(79, 195, 247, 0.4);
      }
      .btn-secondary {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.35);
      }
      .btn-submit {
        width: 100%;
        margin-top: 16px;
        padding: 14px 16px;
        background: linear-gradient(135deg, #7C4DFF, #536DFE);
        color: #fff;
        font-weight: 600;
        letter-spacing: 1px;
      }
      .btn-submit:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(124, 77, 255, 0.45);
      }
      .info-panel {
        position: fixed;
        left: 20px;
        bottom: 20px;
        padding: 14px 18px;
        background: rgba(11, 14, 45, 0.7);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        color: #fff;
        z-index: 50;
        min-width: 220px;
      }
      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        font-size: 13px;
      }
      .info-label {
        color: rgba(255, 255, 255, 0.6);
      }
      .info-value {
        color: #4FC3F7;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .info-system {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      .status-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        transition: all 0.3s;
      }
      .status-dot.running {
        background: #4CAF50;
        box-shadow: 0 0 8px rgba(76, 175, 80, 0.7);
        animation: pulse-green 2s ease-in-out infinite;
      }
      .status-dot.paused {
        background: #F44336;
        box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
      }
      .status-text.running { color: #81C784; }
      .status-text.paused { color: #E57373; }
      @keyframes pulse-green {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(0.9); }
      }
      .legend-panel {
        position: fixed;
        right: 310px;
        bottom: 20px;
        padding: 12px 16px;
        background: rgba(11, 14, 45, 0.65);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        color: #fff;
        z-index: 50;
        min-width: 160px;
      }
      .legend-title {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 8px;
      }
      .legend-gradient {
        height: 12px;
        border-radius: 6px;
        background: linear-gradient(90deg, #4FC3F7 0%, #81D4FA 35%, #BBDEFB 65%, #FFFFFF 100%);
        margin-bottom: 8px;
        box-shadow: 0 0 12px rgba(79, 195, 247, 0.2);
      }
      .legend-scale {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        font-variant-numeric: tabular-nums;
      }
      .drawer-toggle {
        display: none;
        position: fixed;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 101;
        background: rgba(79, 195, 247, 0.9);
        color: #0B0E2D;
        border: none;
        padding: 16px 6px;
        border-radius: 8px 0 0 8px;
        cursor: pointer;
        font-weight: 600;
        backdrop-filter: blur(4px);
      }
      .fps-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 8px;
        text-align: center;
      }
      @media (max-width: 768px) {
        .control-panel {
          top: auto;
          bottom: 0;
          right: 0;
          left: 0;
          width: 100%;
          height: auto;
          max-height: 70vh;
          border-left: none;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px 16px 0 0;
          padding-bottom: 32px;
        }
        .control-panel.collapsed {
          transform: translateY(calc(100% - 40px));
        }
        .drawer-toggle {
          display: block;
          position: fixed;
          top: auto;
          bottom: calc(70vh - 40px);
          right: 50%;
          transform: translateX(50%);
          width: 40px;
          height: 6px;
          padding: 0;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.4);
        }
        .control-panel.collapsed ~ .drawer-toggle {
          bottom: 4px;
        }
        .info-panel {
          left: 12px;
          bottom: auto;
          top: 12px;
          padding: 10px 14px;
          min-width: 180px;
        }
        .legend-panel {
          right: 12px;
          bottom: auto;
          top: 12px;
          left: auto;
          min-width: 140px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createControlPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'control-panel';
    if (this.isMobile && !this.isDrawerOpen) {
      panel.classList.add('collapsed');
    }
    panel.innerHTML = `
      <div class="panel-title">天气系统控制</div>
      
      <div class="section-label">选择天气系统</div>
      <select class="system-select" id="system-select">
        ${SYSTEM_TYPES.map(s => 
          `<option value="${s.type}" ${s.type === this.params.systemType ? 'selected' : ''}>${s.label}</option>`
        ).join('')}
      </select>

      <div class="section-label">环境参数</div>
      
      <div class="slider-group">
        <div class="slider-header">
          <span class="slider-label">温度差</span>
          <span class="slider-value" id="temp-diff-value">${this.params.tempDiff > 0 ? '+' : ''}${this.params.tempDiff}°C</span>
          <span class="slope-tag" id="slope-tag">坡度 ${this.calcSlope(0)}°</span>
        </div>
        <div class="slider-container">
          <input type="range" class="slider" id="temp-diff-slider"
            min="-10" max="10" step="1" value="${this.params.tempDiff}">
        </div>
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span class="slider-label">湿度</span>
          <span class="slider-value" id="humidity-value">${this.params.humidity}%</span>
        </div>
        <div class="slider-container">
          <input type="range" class="slider" id="humidity-slider"
            min="30" max="90" step="1" value="${this.params.humidity}">
        </div>
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span class="slider-label">风速</span>
          <span class="slider-value" id="wind-speed-value">${this.params.windSpeed} 级</span>
        </div>
        <div class="slider-container">
          <input type="range" class="slider" id="wind-speed-slider"
            min="1" max="10" step="1" value="${this.params.windSpeed}">
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" id="pause-btn">${this.params.isPaused ? '▶ 继续' : '❚❚ 暂停'}</button>
        <button class="btn btn-secondary" id="reset-btn">重置</button>
      </div>

      <button class="btn btn-submit" id="submit-btn">应用参数</button>
      <div class="fps-label">拖动旋转视角 · 滚轮缩放</div>
    `;
    this.container.appendChild(panel);
    const slopeEl = panel.querySelector('#slope-tag');
    this.slopeValueEl = slopeEl as HTMLElement;
    this.bindPanelEvents(panel);
  }

  private calcSlope(tempDiff: number): number {
    const normalized = (tempDiff + 10) / 20;
    return Math.round(15 + normalized * 30);
  }

  private bindPanelEvents(panel: HTMLElement): void {
    const systemSelect = panel.querySelector('#system-select') as HTMLSelectElement;
    systemSelect.addEventListener('change', (e) => {
      this.params.systemType = (e.target as HTMLSelectElement).value as SystemType;
      this.emit();
    });

    const tempSlider = panel.querySelector('#temp-diff-slider') as HTMLInputElement;
    const tempValue = panel.querySelector('#temp-diff-value') as HTMLElement;
    this.bindSlider(tempSlider, tempValue, (val) => {
      this.params.tempDiff = val;
      if (this.slopeValueEl) {
        this.slopeValueEl.textContent = `坡度 ${this.calcSlope(val)}°`;
      }
      return `${val > 0 ? '+' : ''}${val}°C`;
    });

    const humiditySlider = panel.querySelector('#humidity-slider') as HTMLInputElement;
    const humidityValue = panel.querySelector('#humidity-value') as HTMLElement;
    this.bindSlider(humiditySlider, humidityValue, (val) => {
      this.params.humidity = val;
      return `${val}%`;
    });

    const windSlider = panel.querySelector('#wind-speed-slider') as HTMLInputElement;
    const windValue = panel.querySelector('#wind-speed-value') as HTMLElement;
    this.bindSlider(windSlider, windValue, (val) => {
      this.params.windSpeed = val;
      return `${val} 级`;
    });

    const pauseBtn = panel.querySelector('#pause-btn') as HTMLButtonElement;
    pauseBtn.addEventListener('click', () => {
      this.params.isPaused = !this.params.isPaused;
      pauseBtn.textContent = this.params.isPaused ? '▶ 继续' : '❚❚ 暂停';
      this.updateStatusDisplay();
      this.emit();
    });

    const resetBtn = panel.querySelector('#reset-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', (e) => {
      this.createRipple(resetBtn, e as MouseEvent);
      this.params.tempDiff = 0;
      this.params.humidity = 60;
      this.params.windSpeed = 5;
      tempSlider.value = '0';
      tempValue.textContent = '0°C';
      humiditySlider.value = '60';
      humidityValue.textContent = '60%';
      windSlider.value = '5';
      windValue.textContent = '5 级';
      if (this.slopeValueEl) {
        this.slopeValueEl.textContent = `坡度 ${this.calcSlope(0)}°`;
      }
      this.emit();
    });

    const submitBtn = panel.querySelector('#submit-btn') as HTMLButtonElement;
    submitBtn.addEventListener('click', (e) => {
      this.createRipple(submitBtn, e as MouseEvent);
      this.emit();
    });
  }

  private bindSlider(slider: HTMLInputElement, valueEl: HTMLElement, formatter: (v: number) => string): void {
    let isDragging = false;
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      valueEl.textContent = formatter(val);
      if (!isDragging) {
        isDragging = true;
      }
      slider.classList.remove('slider-shake');
      void slider.offsetWidth;
      slider.classList.add('slider-shake');
      this.emit();
    });
    slider.addEventListener('change', () => {
      isDragging = false;
      slider.classList.remove('slider-shake');
    });
  }

  private createRipple(button: HTMLElement, event: MouseEvent): void {
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  }

  private createInfoPanel(): void {
    const info = document.createElement('div');
    info.className = 'info-panel';
    info.innerHTML = `
      <div class="info-system" id="info-system-name">${SYSTEM_INFO[this.params.systemType].nameCN}</div>
      <div class="info-item">
        <span class="info-label">粒子总数</span>
        <span class="info-value" id="info-particle-count">${SYSTEM_INFO[this.params.systemType].particleCount.toLocaleString()}</span>
      </div>
      <div class="info-item">
        <span class="info-label">模拟时间</span>
        <span class="info-value" id="info-time">00:00</span>
      </div>
      <div class="info-item">
        <span class="info-label">当前状态</span>
        <span class="status-indicator">
          <span class="status-dot running" id="status-dot"></span>
          <span class="status-text running" id="status-text">运行中</span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-label">FPS</span>
        <span class="info-value" id="info-fps">60</span>
      </div>
    `;
    this.container.appendChild(info);
    this.infoPanel = info;
    this.statusDotEl = info.querySelector('#status-dot') as HTMLElement;
    this.statusTextEl = info.querySelector('#status-text') as HTMLElement;

    if (this.isMobile) {
      const toggle = document.createElement('button');
      toggle.className = 'drawer-toggle';
      this.container.appendChild(toggle);
      this.drawerToggleBtn = toggle;
      toggle.addEventListener('click', () => this.toggleDrawer());
    }
  }

  private createLegendPanel(): void {
    const legend = document.createElement('div');
    legend.className = 'legend-panel';
    legend.innerHTML = `
      <div class="legend-title">海拔颜色</div>
      <div class="legend-gradient"></div>
      <div class="legend-scale">
        <span>0m</span>
        <span>4000m</span>
        <span>8000m</span>
      </div>
    `;
    this.container.appendChild(legend);
    this.legendPanel = legend;
  }

  private updateStatusDisplay(): void {
    if (!this.statusDotEl || !this.statusTextEl) return;
    if (this.params.isPaused) {
      this.statusDotEl.classList.remove('running');
      this.statusDotEl.classList.add('paused');
      this.statusTextEl.classList.remove('running');
      this.statusTextEl.classList.add('paused');
      this.statusTextEl.textContent = '已暂停';
    } else {
      this.statusDotEl.classList.remove('paused');
      this.statusDotEl.classList.add('running');
      this.statusTextEl.classList.remove('paused');
      this.statusTextEl.classList.add('running');
      this.statusTextEl.textContent = '运行中';
    }
  }

  private toggleDrawer(): void {
    const panel = this.container.querySelector('.control-panel');
    if (panel) {
      this.isDrawerOpen = !this.isDrawerOpen;
      panel.classList.toggle('collapsed', !this.isDrawerOpen);
    }
  }

  private bindWindowEvents(): void {
    let resizeTimeout: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        const wasMobile = this.isMobile;
        this.checkViewport();
        if (wasMobile !== this.isMobile) {
          const existingPanel = this.container.querySelector('.control-panel');
          const existingInfo = this.infoPanel;
          const existingLegend = this.legendPanel;
          const existingToggle = this.drawerToggleBtn;
          if (existingPanel) existingPanel.remove();
          if (existingInfo) existingInfo.remove();
          if (existingLegend) existingLegend.remove();
          if (existingToggle) existingToggle.remove();
          this.isDrawerOpen = true;
          this.createControlPanel();
          this.createInfoPanel();
          this.createLegendPanel();
        }
      }, 200);
    });
  }

  public updateInfo(systemType: SystemType, particleCount: number, simTime: number, fps: number): void {
    if (!this.infoPanel) return;
    const sysName = this.infoPanel.querySelector('#info-system-name');
    const pCount = this.infoPanel.querySelector('#info-particle-count');
    const timeEl = this.infoPanel.querySelector('#info-time');
    const fpsEl = this.infoPanel.querySelector('#info-fps');
    if (sysName) sysName.textContent = SYSTEM_INFO[systemType].nameCN;
    if (pCount) pCount.textContent = particleCount.toLocaleString();
    if (timeEl) {
      const totalSeconds = Math.min(simTime, SYSTEM_INFO[systemType].duration);
      const mins = Math.floor(totalSeconds / 60);
      const secs = Math.floor(totalSeconds % 60);
      timeEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    if (fpsEl) fpsEl.textContent = fps.toFixed(0);
  }

  public updateSlope(slopeDeg: number): void {
    if (this.slopeValueEl) {
      const rounded = Math.round(slopeDeg);
      this.slopeValueEl.textContent = `坡度 ${rounded}°`;
    }
  }

  public setPaused(paused: boolean): void {
    if (this.params.isPaused !== paused) {
      this.params.isPaused = paused;
      const pauseBtn = document.getElementById('pause-btn');
      if (pauseBtn) {
        pauseBtn.textContent = paused ? '▶ 继续' : '❚❚ 暂停';
      }
      this.updateStatusDisplay();
    }
  }

  public getParams(): UIParams {
    return { ...this.params };
  }

  public dispose(): void {
    const panel = this.container.querySelector('.control-panel');
    if (panel) panel.remove();
    if (this.infoPanel) this.infoPanel.remove();
    if (this.legendPanel) this.legendPanel.remove();
    if (this.drawerToggleBtn) this.drawerToggleBtn.remove();
  }
}
