import { ClimateMode, MODE_CONFIGS } from './sensorDataSimulator';

interface ParticleInfo {
  id: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  temperature: number;
  humidity: number;
  age: number;
  lifespan: number;
}

interface GUICallbacks {
  onModeChange: (mode: ClimateMode) => void;
}

export class GUIController {
  private container: HTMLElement;
  private callbacks: GUICallbacks;
  private panel: HTMLElement | null = null;
  private mobileToggle: HTMLElement | null = null;
  private particleInfoPanel: HTMLElement | null = null;
  private fpsDisplay: HTMLElement | null = null;
  private countDisplay: HTMLElement | null = null;
  private modeButtons: Map<ClimateMode, HTMLElement> = new Map();
  private currentMode: ClimateMode = ClimateMode.SUMMER;
  private frameTimes: number[] = [];
  private lastFrameTime: number = performance.now();
  private readonly BREAKPOINT = 768;
  private isMobile: boolean = false;
  private isPanelExpanded: boolean = false;

  constructor(container: HTMLElement, callbacks: GUICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isMobile = window.innerWidth <= this.BREAKPOINT;
    this.create();
    this.setupEventListeners();
  }

  private create(): void {
    this.createStyleSheet();
    this.createControlPanel();
    this.createMobileToggle();
    this.createParticleInfoPanel();
  }

  private createStyleSheet(): void {
    const style = document.createElement('style');
    style.textContent = `
      .climate-control-panel {
        position: fixed;
        top: 20px;
        left: 20px;
        width: 280px;
        padding: 20px;
        background: rgba(13, 20, 40, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 12px;
        border: 1px solid rgba(100, 150, 255, 0.2);
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        z-index: 1000;
        font-family: 'JetBrains Mono', monospace;
        color: #e0e8ff;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }

      .climate-control-panel.collapsed {
        transform: translateX(-320px);
        opacity: 0;
        pointer-events: none;
      }

      .panel-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 18px;
        font-weight: 700;
        background: linear-gradient(90deg, #4a9eff 0%, #00d4aa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 20px;
        letter-spacing: 1px;
        text-align: center;
      }

      .mode-section {
        margin-bottom: 20px;
      }

      .section-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #7a8bb8;
        margin-bottom: 10px;
      }

      .mode-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .mode-btn {
        flex: 1;
        min-width: 70px;
        padding: 10px 8px;
        background: rgba(30, 50, 80, 0.6);
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 8px;
        color: #a0b4e0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .mode-btn:hover {
        background: rgba(50, 80, 130, 0.8);
        border-color: rgba(100, 150, 255, 0.6);
        color: #ffffff;
        transform: translateY(-1px);
      }

      .mode-btn.active {
        background: linear-gradient(135deg, rgba(74, 158, 255, 0.3) 0%, rgba(0, 212, 170, 0.3) 100%);
        border-color: #4a9eff;
        color: #ffffff;
        box-shadow: 0 0 20px rgba(74, 158, 255, 0.4);
      }

      .mode-btn.pulse {
        animation: pulse 0.4s ease;
      }

      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }

      .stats-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid rgba(100, 150, 255, 0.15);
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .stat-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #7a8bb8;
      }

      .stat-value {
        font-size: 20px;
        font-weight: 500;
        color: #4a9eff;
        font-variant-numeric: tabular-nums;
      }

      .stat-value.fps-good { color: #00d4aa; }
      .stat-value.fps-warning { color: #ffd700; }
      .stat-value.fps-bad { color: #ff6b6b; }

      .mobile-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4a9eff 0%, #00d4aa 100%);
        border: none;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(74, 158, 255, 0.5);
        z-index: 1001;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .mobile-toggle:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(74, 158, 255, 0.6);
      }

      .mobile-toggle.expanded {
        transform: rotate(45deg);
      }

      .mobile-toggle svg {
        width: 24px;
        height: 24px;
        fill: white;
      }

      .particle-info-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        width: 320px;
        padding: 24px;
        background: rgba(13, 20, 40, 0.95);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-radius: 16px;
        border: 1px solid rgba(100, 150, 255, 0.3);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        z-index: 2000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: 'JetBrains Mono', monospace;
      }

      .particle-info-panel.visible {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -50%) scale(1);
      }

      .info-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(100, 150, 255, 0.2);
      }

      .info-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 16px;
        color: #4a9eff;
        font-weight: 700;
      }

      .close-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(255, 100, 100, 0.2);
        border: none;
        color: #ff6b6b;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .close-btn:hover {
        background: rgba(255, 100, 100, 0.4);
        transform: rotate(90deg);
      }

      .info-grid {
        display: grid;
        gap: 12px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(30, 50, 80, 0.4);
        border-radius: 6px;
      }

      .info-label {
        font-size: 12px;
        color: #7a8bb8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .info-value {
        font-size: 14px;
        color: #e0e8ff;
        font-variant-numeric: tabular-nums;
      }

      .info-value.temp { color: #ff8c00; }
      .info-value.humidity { color: #00ced1; }
      .info-value.pos { color: #9370db; }
      .info-value.vel { color: #32cd32; }

      .temp-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
        vertical-align: middle;
      }

      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1500;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .overlay.visible {
        opacity: 1;
        visibility: visible;
      }

      @media (max-width: 768px) {
        .climate-control-panel {
          position: fixed;
          top: auto;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 60vh;
          border-radius: 20px 20px 0 0;
          transform: translateY(100%);
          padding: 24px;
        }

        .climate-control-panel.expanded {
          transform: translateY(0);
        }

        .mobile-toggle {
          display: flex;
        }

        .particle-info-panel {
          width: 90%;
          max-width: 320px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createControlPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'climate-control-panel';
    if (this.isMobile) {
      this.panel.classList.add('collapsed');
    }

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = 'CLIMATE SYSTEM';
    this.panel.appendChild(title);

    const modeSection = document.createElement('div');
    modeSection.className = 'mode-section';
    
    const modeLabel = document.createElement('div');
    modeLabel.className = 'section-label';
    modeLabel.textContent = '气候模式';
    modeSection.appendChild(modeLabel);

    const modeButtons = document.createElement('div');
    modeButtons.className = 'mode-buttons';

    Object.values(ClimateMode).forEach(mode => {
      const config = MODE_CONFIGS[mode];
      const btn = document.createElement('button');
      btn.className = 'mode-btn';
      btn.dataset.mode = mode;
      btn.textContent = config.label;
      if (mode === this.currentMode) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => this.handleModeClick(mode));
      modeButtons.appendChild(btn);
      this.modeButtons.set(mode, btn);
    });

    modeSection.appendChild(modeButtons);
    this.panel.appendChild(modeSection);

    const statsSection = document.createElement('div');
    statsSection.className = 'stats-section';

    const fpsItem = document.createElement('div');
    fpsItem.className = 'stat-item';
    const fpsLabel = document.createElement('div');
    fpsLabel.className = 'stat-label';
    fpsLabel.textContent = 'FPS';
    this.fpsDisplay = document.createElement('div');
    this.fpsDisplay.className = 'stat-value fps-good';
    this.fpsDisplay.textContent = '60';
    fpsItem.appendChild(fpsLabel);
    fpsItem.appendChild(this.fpsDisplay);

    const countItem = document.createElement('div');
    countItem.className = 'stat-item';
    const countLabel = document.createElement('div');
    countLabel.className = 'stat-label';
    countLabel.textContent = '粒子数';
    this.countDisplay = document.createElement('div');
    this.countDisplay.className = 'stat-value';
    this.countDisplay.textContent = '0';
    countItem.appendChild(countLabel);
    countItem.appendChild(this.countDisplay);

    statsSection.appendChild(fpsItem);
    statsSection.appendChild(countItem);
    this.panel.appendChild(statsSection);

    this.container.appendChild(this.panel);
  }

  private createMobileToggle(): void {
    this.mobileToggle = document.createElement('button');
    this.mobileToggle.className = 'mobile-toggle';
    this.mobileToggle.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
      </svg>
    `;
    this.mobileToggle.addEventListener('click', () => this.toggleMobilePanel());
    if (this.isMobile) {
      this.container.appendChild(this.mobileToggle);
    }
  }

  private createParticleInfoPanel(): void {
    this.particleInfoPanel = document.createElement('div');
    this.particleInfoPanel.className = 'particle-info-panel';

    const header = document.createElement('div');
    header.className = 'info-header';
    const infoTitle = document.createElement('div');
    infoTitle.className = 'info-title';
    infoTitle.textContent = '粒子属性';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.hideParticleInfo());
    header.appendChild(infoTitle);
    header.appendChild(closeBtn);

    const infoGrid = document.createElement('div');
    infoGrid.className = 'info-grid';
    infoGrid.id = 'particle-info-grid';

    this.particleInfoPanel.appendChild(header);
    this.particleInfoPanel.appendChild(infoGrid);

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'particle-overlay';
    overlay.addEventListener('click', () => this.hideParticleInfo());

    this.container.appendChild(overlay);
    this.container.appendChild(this.particleInfoPanel);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleModeClick(mode: ClimateMode): void {
    if (mode === this.currentMode) return;

    const btn = this.modeButtons.get(mode);
    if (btn) {
      btn.classList.remove('pulse');
      void btn.offsetWidth;
      btn.classList.add('pulse');
    }

    this.modeButtons.forEach((b, m) => {
      b.classList.toggle('active', m === mode);
    });

    this.currentMode = mode;
    this.callbacks.onModeChange(mode);
  }

  private toggleMobilePanel(): void {
    if (!this.panel || !this.mobileToggle) return;
    
    this.isPanelExpanded = !this.isPanelExpanded;
    this.panel.classList.toggle('expanded', this.isPanelExpanded);
    this.panel.classList.toggle('collapsed', !this.isPanelExpanded);
    this.mobileToggle.classList.toggle('expanded', this.isPanelExpanded);
  }

  private handleResize(): void {
    const newIsMobile = window.innerWidth <= this.BREAKPOINT;
    if (newIsMobile !== this.isMobile) {
      this.isMobile = newIsMobile;
      
      if (this.panel) {
        if (this.isMobile) {
          this.panel.classList.add('collapsed');
          this.panel.classList.remove('expanded');
          this.isPanelExpanded = false;
          if (this.mobileToggle) {
            this.container.appendChild(this.mobileToggle);
            this.mobileToggle.classList.remove('expanded');
          }
        } else {
          this.panel.classList.remove('collapsed', 'expanded');
          this.isPanelExpanded = false;
          if (this.mobileToggle && this.mobileToggle.parentElement) {
            this.mobileToggle.parentElement.removeChild(this.mobileToggle);
          }
        }
      }
    }
  }

  public updateFPS(): void {
    if (!this.fpsDisplay) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameTimes.push(delta);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = Math.round(1000 / avgDelta);

    this.fpsDisplay.textContent = fps.toString();
    this.fpsDisplay.classList.remove('fps-good', 'fps-warning', 'fps-bad');
    
    if (fps >= 55) {
      this.fpsDisplay.classList.add('fps-good');
    } else if (fps >= 30) {
      this.fpsDisplay.classList.add('fps-warning');
    } else {
      this.fpsDisplay.classList.add('fps-bad');
    }
  }

  public updateParticleCount(count: number): void {
    if (this.countDisplay) {
      this.countDisplay.textContent = count.toString();
    }
  }

  public showParticleInfo(info: ParticleInfo): void {
    if (!this.particleInfoPanel) return;

    const grid = this.particleInfoPanel.querySelector('#particle-info-grid');
    if (!grid) return;

    const tempColor = this.getTemperatureColor(info.temperature);

    grid.innerHTML = `
      <div class="info-row">
        <span class="info-label">ID</span